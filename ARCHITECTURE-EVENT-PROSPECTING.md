# Architecture: Event Prospecting Module for Thor Whisperer

**Status**: Proposed
**Date**: 2026-03-27
**Author**: Software Architect Agent

---

## 1. Executive Summary

The Event Prospecting module automates the discovery of speaking opportunities for Paula Pimenta across Brazilian event platforms. It crawls Sympla, Eventbrite, Even3, and Google to find corporate events, qualifies them by theme relevance, extracts organizer contacts, and manages an outreach pipeline from discovery through booking.

The core architectural decision is to treat **events as a separate bounded context** that produces leads into the existing CRM, rather than extending the leads table directly. Events have their own lifecycle (discovered, qualified, contacted) that is distinct from person-based lead management.

---

## 2. Domain Model

### Bounded Contexts

```
+---------------------------+       converts to       +------------------+
|   EVENT PROSPECTING       | --------------------->  |   LEADS CRM      |
|                           |                         |                  |
|  Event (aggregate root)   |   Event organizer       |  Lead            |
|    - EventSource          |   becomes a Lead with   |  Interaction     |
|    - EventContact         |   source = 'event'      |  Campaign        |
|    - EventOutreach        |                         |                  |
|  DiscoveryRun             |                         |                  |
|  QualificationRule        |                         |                  |
+---------------------------+                         +------------------+
```

### Domain Events (logical flow)

1. `DiscoveryRunCompleted` -- new raw events found
2. `EventQualified` -- event passes theme/size/date filters
3. `ContactExtracted` -- organizer email/phone found
4. `OutreachSent` -- email with landing page sent
5. `OutreachReplied` -- organizer responded
6. `EventConvertedToLead` -- event organizer promoted into Leads CRM

---

## 3. Database Schema

### ADR-001: Separate events table vs extending leads

**Context**: Events are not people. A single event can have multiple contacts. Events have metadata (date, venue, platform URL) that does not fit the leads table. Mixing them would pollute the existing Kanban workflow.

**Decision**: Create dedicated `events`, `event_contacts`, `event_outreach_log`, and `discovery_runs` tables. When an event organizer is ready for the sales pipeline, a lead record is created with `source = 'event'` and a foreign key back to the event.

**Consequences**: Slightly more tables, but clean separation. The existing leads Kanban and campaigns continue working unchanged. Events get their own pipeline UI.

### New Tables

```sql
-- ============================================================
-- MIGRATION: Event Prospecting Module
-- ============================================================

-- Tracks each automated discovery execution
CREATE TABLE public.discovery_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  platforms TEXT[] NOT NULL DEFAULT '{}',        -- ['sympla','eventbrite','even3','google']
  search_params JSONB NOT NULL DEFAULT '{}',     -- themes, date range, location filters
  events_found INTEGER DEFAULT 0,
  events_qualified INTEGER DEFAULT 0,
  error_log TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Core event record
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discovery_run_id UUID REFERENCES public.discovery_runs(id) ON DELETE SET NULL,

  -- Identity
  name TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('sympla','eventbrite','even3','google','manual')),
  platform_id TEXT,                              -- external ID on the platform
  platform_url TEXT,                             -- direct link to event page

  -- Event details
  event_date TIMESTAMPTZ,
  event_end_date TIMESTAMPTZ,
  location_city TEXT,
  location_state TEXT,
  location_venue TEXT,
  is_online BOOLEAN DEFAULT false,
  estimated_audience INTEGER,
  ticket_price_range TEXT,                       -- 'free', 'low', 'medium', 'high'

  -- Classification
  category TEXT,                                 -- 'conference','workshop','summit','forum','seminar'
  themes TEXT[] DEFAULT '{}',                    -- ['lideranca','gestao','rh','cultura']
  audience_type TEXT,                            -- 'corporate','academic','public','mixed'

  -- Qualification
  pipeline_status TEXT NOT NULL DEFAULT 'discovered'
    CHECK (pipeline_status IN (
      'discovered','qualified','contact_found','contacted',
      'responded','negotiating','booked','completed','discarded'
    )),
  qualification_score INTEGER DEFAULT 0 CHECK (qualification_score >= 0 AND qualification_score <= 100),
  qualification_notes TEXT,
  discard_reason TEXT,

  -- Link to CRM
  converted_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,

  -- Dedup
  fingerprint TEXT,                              -- hash of (platform + platform_id) for dedup

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organizer / contact info extracted per event
CREATE TABLE public.event_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT,
  role TEXT,                                     -- 'organizer','speaker_coordinator','admin'
  email TEXT,
  phone TEXT,
  linkedin TEXT,
  instagram TEXT,
  website TEXT,
  source TEXT,                                   -- 'platform_page','google','hunter','manual'
  confidence TEXT DEFAULT 'low'
    CHECK (confidence IN ('high','medium','low')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Outreach tracking per event
CREATE TABLE public.event_outreach_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  event_contact_id UUID REFERENCES public.event_contacts(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  channel TEXT NOT NULL CHECK (channel IN ('email','linkedin','instagram','whatsapp','phone')),
  outreach_type TEXT NOT NULL CHECK (outreach_type IN ('initial','follow_up_1','follow_up_2','follow_up_3')),
  subject TEXT,
  body TEXT,
  template_used TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','delivered','opened','clicked','replied','bounced','failed')),

  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  external_message_id TEXT,                      -- Resend message ID for tracking

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Qualification rules / search presets
CREATE TABLE public.event_search_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  themes TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  locations TEXT[] DEFAULT '{}',
  min_audience INTEGER,
  date_range_start DATE,
  date_range_end DATE,
  auto_qualify_threshold INTEGER DEFAULT 60,     -- auto-qualify events scoring above this
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_events_user_id ON public.events(user_id);
CREATE INDEX idx_events_pipeline_status ON public.events(pipeline_status);
CREATE INDEX idx_events_platform ON public.events(platform);
CREATE INDEX idx_events_event_date ON public.events(event_date);
CREATE INDEX idx_events_fingerprint ON public.events(fingerprint);
CREATE UNIQUE INDEX idx_events_unique_fingerprint ON public.events(user_id, fingerprint)
  WHERE fingerprint IS NOT NULL;
CREATE INDEX idx_event_contacts_event_id ON public.event_contacts(event_id);
CREATE INDEX idx_event_outreach_event_id ON public.event_outreach_log(event_id);
CREATE INDEX idx_discovery_runs_user_id ON public.discovery_runs(user_id);

-- RLS
ALTER TABLE public.discovery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_outreach_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_search_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their discovery_runs" ON public.discovery_runs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own their events" ON public.events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own their event_contacts" ON public.event_contacts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own their event_outreach_log" ON public.event_outreach_log
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own their event_search_presets" ON public.event_search_presets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Updated_at triggers (reuse existing function)
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend leads.source to include 'event'
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_source_check
  CHECK (source IN ('linkedin','instagram','referral','import','event'));
```

### Schema Relationship Diagram

```
discovery_runs 1---* events 1---* event_contacts
                       |
                       +---* event_outreach_log
                       |
                       +---? leads (converted_lead_id)

event_search_presets (standalone, user config)
```

---

## 4. Event Discovery Strategy

### ADR-002: APIs vs Scraping vs AI Search

**Context**: Sympla, Eventbrite, and Even3 have varying API availability. Sympla has a public API with limited endpoints. Eventbrite has a well-documented API. Even3 has no public API. Google is best accessed via Custom Search API or SerpAPI.

**Decision**: Use a tiered approach.

| Platform | Method | Rationale |
|----------|--------|-----------|
| Eventbrite | Official API | Well-documented, reliable, supports Brazilian events |
| Sympla | Public API + page scraping fallback | API exists but is limited; scrape event pages for details |
| Even3 | Web scraping via headless browser | No API available; academic/corporate events in Brazil |
| Google | SerpAPI or Google Custom Search JSON API | Catch events not listed on platforms; search site:sympla.com.br + keywords |

**Consequences**: Scraping is fragile and can break when sites change. Mitigation: each scraper is isolated in its own Edge Function, so one breaking does not affect others. The system degrades gracefully -- if Sympla scraping fails, Eventbrite API results still flow in.

### Discovery Edge Functions

**`discover-events`** (orchestrator)

```
Input:  { platforms: string[], themes: string[], location?: string, dateRange?: {...} }
Output: { run_id, events_found, events_qualified }

Flow:
1. Create discovery_run record (status: running)
2. Fan out to platform-specific fetchers (parallel)
3. Each fetcher returns raw event data
4. Normalize all results into common schema
5. Dedup by fingerprint (platform + platform_id hash)
6. Run qualification scoring
7. Insert events into DB
8. Update discovery_run (status: completed)
```

**`fetch-eventbrite`** -- calls Eventbrite API

```
- Endpoint: GET /v3/events/search/
- Params: q=lideranca+gestao, location.address=Brasil, categories=101,102
- Auth: Bearer token (stored in Supabase secrets)
- Rate limit: 2000 calls/hour (generous)
```

**`fetch-sympla`** -- calls Sympla API + scraper

```
- API: GET /public/v4/events?keyword=...&state=...
- Fallback scraper: fetch HTML of sympla.com.br/eventos?s=keyword
- Parse event cards from DOM
- Rate limit: be conservative, 1 req/second
```

**`fetch-even3`** -- web scraper

```
- Target: even3.com.br/buscareventos/?term=keyword
- Use Deno's fetch + HTML parsing (no headless browser needed for Even3)
- Parse event cards, extract name/date/location/URL
- Rate limit: 1 req/2 seconds
```

**`search-google-events`** -- Google Custom Search

```
- Query: "site:sympla.com.br OR site:eventbrite.com.br palestra lideranca gestao 2026"
- Also: general queries like "evento corporativo lideranca sao paulo 2026"
- Returns URLs that feed back into platform-specific scrapers
- Rate limit: 100 queries/day (free tier) or 10k/day ($5)
```

### Qualification Scoring Algorithm

Each event gets a 0-100 score based on weighted criteria:

| Criterion | Weight | Scoring Logic |
|-----------|--------|---------------|
| Theme match | 30% | How many of the target themes (lideranca, gestao, RH, cultura) appear in title/description |
| Audience type | 20% | Corporate/executive = high, academic = medium, public = low |
| Event size | 15% | 200+ = high, 50-200 = medium, <50 = low |
| Date proximity | 15% | 30-120 days out = ideal, >120 = ok, <30 = too soon, past = discard |
| Location match | 10% | Sao Paulo/Rio = high, other capitals = medium, remote cities = low |
| Ticket price | 10% | Paid events = higher budget signal |

Events scoring >= 60 are auto-qualified. Below 60 go to "discovered" for manual review. This threshold is configurable per search preset.

---

## 5. Contact Extraction Strategy

### ADR-003: How to find organizer emails

**Context**: Event platforms show organizer names but often hide direct emails. We need a reliable, legal way to find contact information.

**Decision**: Multi-source extraction with confidence scoring.

| Source | Method | Confidence |
|--------|--------|------------|
| Event platform page | Scrape "organizer" section from event URL | Medium (often shows company name only) |
| Hunter.io API | Domain-based email finder; get organizer company domain, find emails | High for corporate domains |
| Google search | "event name" + "organizador" + "email" OR "contato" | Low-Medium |
| LinkedIn (manual) | Show organizer name, let user find on LinkedIn | Manual/High |
| Thor AI inference | Given organizer company + name, AI generates likely email patterns | Low (verification needed) |

**Flow**:
1. Scrape organizer info from event platform page (name, company)
2. If company website found, call Hunter.io to find email addresses
3. Store all contacts with confidence level
4. Only auto-outreach to "high" confidence contacts
5. "medium" and "low" contacts flagged for manual verification

**Consequences**: Hunter.io costs money ($49/mo for 500 searches). Alternative: start with platform scraping + Thor AI inference, add Hunter.io when volume justifies cost.

### Edge Function: `extract-event-contacts`

```
Input:  { event_id, platform_url }
Output: { contacts: EventContact[] }

Flow:
1. Fetch event page HTML
2. Parse organizer section (varies by platform)
3. If company domain found, optionally call Hunter.io
4. Use Thor AI to infer email patterns (firstname@company.com)
5. Store contacts with confidence ratings
6. Return results
```

---

## 6. Email Automation

### ADR-004: Email service selection

**Context**: The existing `send-proposal-email` Edge Function generates HTML but does not actually send emails (it notes "Configure um dominio de e-mail para envio automatico"). We need a real sending service.

**Decision**: Use **Resend** (resend.com).

| Option | Pros | Cons |
|--------|------|------|
| Resend | Simple API, good deliverability, free tier (100 emails/day), webhook tracking, React email templates | Newer service |
| SendGrid | Battle-tested, generous free tier (100/day) | Complex API, heavy SDK |
| Amazon SES | Cheapest at scale | Complex setup, requires AWS account |

Resend wins because: (a) simplest API for Edge Functions (single HTTP call), (b) built-in open/click tracking via webhooks, (c) 100 free emails/day is enough for initial use, (d) supports custom domains for deliverability.

**Consequences**: Need to verify a sending domain (e.g., paulapimenta.com.br or thorwhisperer.app). Without domain verification, emails go to spam.

### Email Flow

```
1. Event qualified + contact found (high confidence)
2. System generates personalized email via Thor AI:
   - Subject: personalized based on event theme
   - Body: value proposition + link to paula-pimenta-palestrante.vercel.app
   - Tone: professional, not salesy
3. Email queued in event_outreach_log (status: pending)
4. Edge Function sends via Resend API
5. Resend webhook updates status (delivered, opened, clicked)
6. If no reply in 3 days: follow_up_1
7. If no reply in 7 days: follow_up_2
8. If no reply in 14 days: follow_up_3 (final)
9. If reply detected: update status, notify user, create lead
```

### Edge Function: `send-event-outreach`

```
Input:  { event_id, contact_id, outreach_type, custom_message? }
Output: { message_id, status }

Flow:
1. Load event + contact data
2. If no custom_message, call Thor AI to generate personalized email
3. Send via Resend API
4. Store Resend message_id in event_outreach_log
5. Return confirmation
```

### Edge Function: `outreach-webhook` (receives Resend events)

```
Input:  Resend webhook payload (delivered, opened, clicked, bounced)
Output: 200 OK

Flow:
1. Find outreach_log record by external_message_id
2. Update status (opened_at, etc.)
3. If event type = 'replied' or 'clicked', update event pipeline_status
```

### Edge Function: `process-follow-ups` (scheduled, runs daily)

```
Flow:
1. Query event_outreach_log for sent emails with no reply
2. For each, check if follow-up is due based on timing rules
3. Generate and send follow-up emails
4. Cap at 3 follow-ups per event
```

---

## 7. Frontend Architecture

### New Route: `/events`

Added to `App.tsx` and sidebar navigation.

### Page Structure

```
EventsPage.tsx
  |
  +-- EventsDashboard (summary stats: discovered, qualified, contacted, booked)
  |
  +-- EventsToolbar
  |     +-- Search/filter controls
  |     +-- "Run Discovery" button (triggers discover-events)
  |     +-- View toggle: Pipeline | Table | Calendar
  |
  +-- EventsPipeline (default view)
  |     +-- Kanban columns: discovered | qualified | contacted | responded | negotiating | booked
  |     +-- EventCard (draggable between columns)
  |           +-- Event name, date, location, score badge
  |           +-- Quick actions: qualify, discard, view contacts, send outreach
  |
  +-- EventsTable (alternative view)
  |     +-- Sortable/filterable table of all events
  |
  +-- EventsCalendar (alternative view)
  |     +-- Calendar showing event dates with status colors
  |
  +-- EventDetailSheet (side panel, opens on event click)
        +-- Event info (name, date, venue, platform link)
        +-- Qualification score breakdown
        +-- Contacts list with confidence badges
        +-- Outreach history timeline
        +-- Actions: Send outreach, Convert to Lead, Discard
        +-- Notes editor
```

### New Components

```
src/components/events/
  EventsDashboard.tsx        -- KPI cards (discovered, qualified, conversion rate, booked)
  EventsPipeline.tsx         -- Kanban board (reuse KanbanBoard.tsx pattern)
  EventsTable.tsx            -- Data table with filters
  EventsCalendar.tsx         -- Monthly calendar view
  EventCard.tsx              -- Card for pipeline/table
  EventDetailSheet.tsx       -- Side panel with full event details
  EventContactsList.tsx      -- Contacts section in detail panel
  EventOutreachTimeline.tsx  -- Outreach history in detail panel
  DiscoveryRunDialog.tsx     -- Modal to configure and launch a discovery run
  EventSearchPresets.tsx     -- Manage saved search configurations
  QualificationBadge.tsx     -- Score display component (color-coded)
```

### New Hooks

```
src/hooks/
  useEvents.ts               -- CRUD for events table (TanStack Query)
  useEventContacts.ts        -- CRUD for event_contacts
  useEventOutreach.ts        -- Outreach operations
  useDiscoveryRuns.ts        -- Launch and monitor discovery runs
  useEventSearchPresets.ts   -- Manage search presets
```

### New Types

```typescript
// Added to src/types/index.ts or src/types/events.ts

export type EventPlatform = 'sympla' | 'eventbrite' | 'even3' | 'google' | 'manual';

export type EventPipelineStatus =
  | 'discovered' | 'qualified' | 'contact_found' | 'contacted'
  | 'responded' | 'negotiating' | 'booked' | 'completed' | 'discarded';

export type EventCategory = 'conference' | 'workshop' | 'summit' | 'forum' | 'seminar';

export type ContactConfidence = 'high' | 'medium' | 'low';

export type OutreachChannel = 'email' | 'linkedin' | 'instagram' | 'whatsapp' | 'phone';

export type OutreachType = 'initial' | 'follow_up_1' | 'follow_up_2' | 'follow_up_3';

export type OutreachStatus =
  | 'pending' | 'sent' | 'delivered' | 'opened'
  | 'clicked' | 'replied' | 'bounced' | 'failed';

export interface ProspectingEvent {
  id: string;
  user_id: string;
  discovery_run_id?: string;
  name: string;
  description?: string;
  platform: EventPlatform;
  platform_id?: string;
  platform_url?: string;
  event_date?: string;
  event_end_date?: string;
  location_city?: string;
  location_state?: string;
  location_venue?: string;
  is_online: boolean;
  estimated_audience?: number;
  ticket_price_range?: string;
  category?: EventCategory;
  themes: string[];
  audience_type?: string;
  pipeline_status: EventPipelineStatus;
  qualification_score: number;
  qualification_notes?: string;
  discard_reason?: string;
  converted_lead_id?: string;
  fingerprint?: string;
  created_at: string;
  updated_at: string;
}

export interface EventContact {
  id: string;
  event_id: string;
  user_id: string;
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  instagram?: string;
  website?: string;
  source?: string;
  confidence: ContactConfidence;
  created_at: string;
}

export interface EventOutreachEntry {
  id: string;
  event_id: string;
  event_contact_id?: string;
  user_id: string;
  channel: OutreachChannel;
  outreach_type: OutreachType;
  subject?: string;
  body?: string;
  template_used?: string;
  status: OutreachStatus;
  sent_at?: string;
  opened_at?: string;
  replied_at?: string;
  external_message_id?: string;
  created_at: string;
}

export interface DiscoveryRun {
  id: string;
  user_id: string;
  status: 'running' | 'completed' | 'failed';
  platforms: string[];
  search_params: Record<string, unknown>;
  events_found: number;
  events_qualified: number;
  error_log?: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
}

export interface EventSearchPreset {
  id: string;
  user_id: string;
  name: string;
  themes: string[];
  categories: string[];
  locations: string[];
  min_audience?: number;
  date_range_start?: string;
  date_range_end?: string;
  auto_qualify_threshold: number;
  is_active: boolean;
  created_at: string;
}

// Pipeline status labels and colors (follows existing pattern)
export const EVENT_PIPELINE_STATUS_LABELS: Record<EventPipelineStatus, string> = {
  discovered: 'Descoberto',
  qualified: 'Qualificado',
  contact_found: 'Contato Encontrado',
  contacted: 'Contatado',
  responded: 'Respondeu',
  negotiating: 'Negociando',
  booked: 'Fechado',
  completed: 'Realizado',
  discarded: 'Descartado',
};

export const EVENT_PIPELINE_STATUS_COLORS: Record<EventPipelineStatus, string> = {
  discovered: 'bg-slate-100 text-slate-800',
  qualified: 'bg-blue-100 text-blue-800',
  contact_found: 'bg-cyan-100 text-cyan-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  responded: 'bg-green-100 text-green-800',
  negotiating: 'bg-purple-100 text-purple-800',
  booked: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-indigo-100 text-indigo-800',
  discarded: 'bg-red-100 text-red-800',
};
```

---

## 8. Integration with Existing System

### Event to Lead Conversion

When an event organizer replies positively or the user manually triggers "Convert to Lead":

```
1. Create a new Lead record:
   - name: event_contact.name OR event.name + " - Organizador"
   - company: extracted from event organizer info
   - position: event_contact.role
   - email: event_contact.email
   - source: 'event' (new source type)
   - status: 'responded' or 'qualified' (depending on context)
   - tags: event.themes
   - notes: "Evento: {event.name} | Data: {event.event_date} | {event.platform_url}"
   - thor_analysis.speakingOpportunities: populated from event data

2. Update event.converted_lead_id = new lead ID
3. Update event.pipeline_status = 'negotiating' or 'booked'
4. Create an Interaction record (type: 'note_added', content: conversion context)
```

### Campaign Integration

Events that convert to leads can be added to existing Campaigns. The existing campaign system works unchanged because it targets lead IDs.

### Dashboard Integration

The existing Analytics page gains new cards:
- Events Discovered (this month)
- Events in Pipeline
- Conversion Rate (events to bookings)
- Upcoming Booked Events

---

## 9. Complete Edge Functions Inventory

| Function | Trigger | Purpose |
|----------|---------|---------|
| `discover-events` | Manual (user clicks "Run Discovery") | Orchestrates discovery across platforms |
| `fetch-eventbrite` | Called by discover-events | Eventbrite API search |
| `fetch-sympla` | Called by discover-events | Sympla API + scraper |
| `fetch-even3` | Called by discover-events | Even3 web scraper |
| `search-google-events` | Called by discover-events | Google Custom Search for events |
| `qualify-events` | Called by discover-events after fetch | Scores and qualifies events |
| `extract-event-contacts` | Manual or auto after qualification | Scrapes/finds organizer contacts |
| `send-event-outreach` | Manual or auto for high-confidence contacts | Sends email via Resend |
| `outreach-webhook` | Resend webhook callback | Updates delivery/open/click status |
| `process-follow-ups` | Scheduled (daily via pg_cron or Supabase cron) | Sends follow-up emails |
| `convert-event-to-lead` | Manual (user action) | Creates lead from qualified event |

### Simplification Option

For Phase 1, `discover-events` can be a single monolithic Edge Function that handles all platforms internally, rather than fanning out to separate functions. This reduces deployment complexity at the cost of a longer execution time per call. Split into separate functions in Phase 2 when you need independent error handling per platform.

---

## 10. Full Pipeline Workflow

```
                                    AUTOMATED                          MANUAL / SEMI-AUTO
                                    --------                           ------------------

User clicks "Run Discovery"
        |
        v
+-------------------+
| discover-events   |----> Eventbrite API
|                   |----> Sympla API/scrape
|  (Edge Function)  |----> Even3 scrape
|                   |----> Google search
+-------------------+
        |
        v
  Raw events normalized
  Deduped by fingerprint
        |
        v
+-------------------+
| qualify-events    |   Score 0-100 based on
|                   |   theme, audience, size,
|  (scoring logic)  |   date, location
+-------------------+
        |
        +--> Score >= 60: auto-qualified ---------> Pipeline: "qualified"
        +--> Score < 60: needs review ------------> Pipeline: "discovered"
                                                         |
                                                    User reviews,
                                                    qualifies or discards
        |
        v
+------------------------+
| extract-event-contacts |   Scrape event page
|                        |   Hunter.io lookup
|  (Edge Function)       |   Thor AI inference
+------------------------+
        |
        v
  Contacts stored with
  confidence levels
        |
        +--> High confidence ----> Auto-outreach eligible
        +--> Medium/Low ---------> User verifies manually
                                         |
                                    User confirms contact
        |
        v
+----------------------+
| send-event-outreach  |   Generates personalized email
|                      |   via Thor AI, sends via Resend
|  (Edge Function)     |   Includes landing page link
+----------------------+
        |
        v
  Pipeline: "contacted"
        |
  Resend webhook fires
  (delivered/opened/clicked)
        |
        +--> No reply in 3d ----> follow_up_1
        +--> No reply in 7d ----> follow_up_2
        +--> No reply in 14d ---> follow_up_3 (final)
        |
        +--> Reply received -----> Pipeline: "responded"
                                         |
                                    User reviews reply
                                         |
                                    Converts to Lead
                                    (source: 'event')
                                         |
                                    Enters Leads CRM
                                    Kanban pipeline
                                         |
                                    Proposal via existing
                                    Proposals page
                                         |
                                    Pipeline: "booked"
```

---

## 11. Phase Breakdown

### Phase 1: Foundation + Manual Discovery (1-2 weeks)

**Goal**: Get the database, basic UI, and manual event entry working. Immediate value: organize speaking opportunities in one place.

**Build**:
- Database migration (all tables)
- TypeScript types
- `useEvents` hook (CRUD)
- EventsPage with Pipeline view (Kanban)
- EventDetailSheet (side panel)
- Manual event creation form
- Sidebar navigation update
- Event-to-Lead conversion function

**Why first**: This is usable immediately. Paula's team can start tracking events they find manually while the automation is built. Zero external dependencies.

### Phase 2: Automated Discovery (1-2 weeks)

**Goal**: Automated event finding from Eventbrite and Sympla.

**Build**:
- `discover-events` Edge Function (monolithic, handles Eventbrite + Sympla)
- Eventbrite API integration (requires API key signup)
- Sympla API/scraper
- Qualification scoring logic
- DiscoveryRunDialog component
- Discovery run history view
- Search presets management

**Why second**: This is the core value proposition. Eventbrite has the best API, so start there. Sympla is the most important Brazilian platform.

### Phase 3: Contact Extraction + Email Outreach (1-2 weeks)

**Goal**: Find organizer emails and send automated outreach.

**Build**:
- `extract-event-contacts` Edge Function
- EventContactsList component
- `send-event-outreach` Edge Function
- Resend integration (requires domain setup)
- Email template generation via Thor AI
- `outreach-webhook` Edge Function
- EventOutreachTimeline component

**Why third**: Depends on having events to contact. Domain verification for Resend takes 24-48h, so start the setup at the beginning of this phase.

### Phase 4: Follow-ups + Even3 + Google (1 week)

**Goal**: Complete automation with follow-up sequences and additional event sources.

**Build**:
- `process-follow-ups` scheduled function
- Even3 scraper
- Google Custom Search integration
- Follow-up timing configuration UI
- Analytics dashboard integration (events metrics)

### Phase 5: Intelligence + Optimization (ongoing)

**Goal**: Make the system smarter over time.

**Build**:
- Calendar view for events
- Event recommendation engine (learn from bookings which events convert best)
- Bulk operations (qualify/discard/contact multiple events)
- Export events to CSV
- Slack/WhatsApp notifications for replies
- A/B testing for email subject lines

---

## 12. Technical Risks and Mitigations

### Risk 1: Web Scraping Fragility

**Probability**: High
**Impact**: Medium (discovery stops for that platform)
**Mitigation**:
- Each platform scraper is isolated; one failing does not affect others
- Store raw HTML snapshots for debugging when parsing fails
- Monitor scraper health; alert when failure rate > 30%
- Always have manual event entry as fallback
- Consider using a proxy service (ScraperAPI, $49/mo) if IP blocking occurs

### Risk 2: Email Deliverability

**Probability**: Medium
**Impact**: High (outreach goes to spam)
**Mitigation**:
- Verify a proper sending domain (not gmail.com)
- Set up SPF, DKIM, DMARC records
- Start with low volume (5-10 emails/day) to build sender reputation
- Use Resend's deliverability monitoring
- Personalize every email (no bulk template blasts)
- Include unsubscribe link (CAN-SPAM/LGPD compliance)

### Risk 3: Rate Limits on Event Platforms

**Probability**: Medium
**Impact**: Low (discovery runs take longer)
**Mitigation**:
- Respect robots.txt and platform ToS
- Implement exponential backoff in all fetchers
- Cache results; do not re-fetch events already in DB (fingerprint dedup)
- Run discovery at off-peak hours (schedule for early morning)
- Eventbrite allows 2000 calls/hour, which is generous

### Risk 4: Contact Data Accuracy

**Probability**: High
**Impact**: Medium (wasted outreach, bounced emails)
**Mitigation**:
- Confidence scoring on all contacts
- Only auto-outreach to "high" confidence
- Use email verification API (ZeroBounce, $16/mo for 2000 verifications) before sending
- Track bounce rates; auto-disable contacts that bounce
- Manual verification queue for medium/low confidence

### Risk 5: Supabase Edge Function Timeout

**Probability**: Medium
**Impact**: Medium (discovery runs fail mid-way)
**Mitigation**:
- Supabase Edge Functions have a 60s timeout (or 150s on Pro plan)
- Discovery across 4 platforms can exceed this
- Solution: process platforms sequentially within one invocation, or split into separate calls orchestrated from the frontend
- Store partial results as you go; if function times out, events already inserted are not lost

### Risk 6: LGPD Compliance

**Probability**: Low (regulatory risk)
**Impact**: High
**Mitigation**:
- Only collect publicly available information from event pages
- Include opt-out mechanism in all outreach emails
- Store a legal basis field (legitimate interest for B2B outreach)
- Allow contacts to request data deletion
- Do not scrape personal social media; only professional/business contacts

---

## 13. External Service Costs (Monthly Estimate)

| Service | Purpose | Cost | Notes |
|---------|---------|------|-------|
| Resend | Email sending | Free (100/day) or $20/mo (50k) | Start free |
| Eventbrite API | Event discovery | Free | OAuth app required |
| Google Custom Search | Event discovery | Free (100/day) or $5/1000 queries | Start free |
| Hunter.io | Email finding | $0 (25 free/mo) or $49/mo (500) | Defer to Phase 3+ |
| ZeroBounce | Email verification | $16/mo (2000) | Defer to Phase 3+ |
| ScraperAPI | Proxy for scraping | $49/mo | Only if IP blocked |

**Phase 1 cost**: $0 (no external services needed)
**Phase 2 cost**: $0-5 (Eventbrite free, Google free tier)
**Phase 3 cost**: $0-69 (Resend free tier, Hunter optional)
**Steady state**: ~$20-70/month depending on volume

---

## 14. Key Architectural Decisions Summary

| # | Decision | Rationale |
|---|----------|-----------|
| ADR-001 | Separate events tables, not extending leads | Events have distinct lifecycle; keeps CRM clean |
| ADR-002 | Tiered discovery (API > scraper > search) | Maximize reliability; degrade gracefully |
| ADR-003 | Multi-source contact extraction with confidence | No single source is reliable; confidence scoring prevents bad outreach |
| ADR-004 | Resend for email | Simplest API, free tier sufficient, webhook tracking built-in |
| ADR-005 | Monolithic discover-events in Phase 2, split later | Reduce initial complexity; split when error isolation is needed |
| ADR-006 | Phase 1 is manual-first | Immediate value with zero external dependencies; validates the pipeline UX before automating |
| ADR-007 | Events convert to leads (not replace them) | Leverages existing Kanban, campaigns, proposals -- no duplication |

---

## 15. Files to Create/Modify

### New Files

```
supabase/migrations/YYYYMMDD_event_prospecting.sql     -- Schema migration
supabase/functions/discover-events/index.ts             -- Discovery orchestrator
supabase/functions/extract-event-contacts/index.ts      -- Contact extraction
supabase/functions/send-event-outreach/index.ts         -- Email sending
supabase/functions/outreach-webhook/index.ts            -- Resend webhooks
supabase/functions/process-follow-ups/index.ts          -- Scheduled follow-ups
supabase/functions/convert-event-to-lead/index.ts       -- Event-to-Lead conversion

src/types/events.ts                                     -- TypeScript types
src/pages/EventsPage.tsx                                -- Main events page
src/hooks/useEvents.ts                                  -- Events CRUD hook
src/hooks/useEventContacts.ts                           -- Contacts hook
src/hooks/useEventOutreach.ts                           -- Outreach hook
src/hooks/useDiscoveryRuns.ts                           -- Discovery runs hook
src/hooks/useEventSearchPresets.ts                      -- Search presets hook

src/components/events/EventsDashboard.tsx
src/components/events/EventsPipeline.tsx
src/components/events/EventsTable.tsx
src/components/events/EventsCalendar.tsx
src/components/events/EventCard.tsx
src/components/events/EventDetailSheet.tsx
src/components/events/EventContactsList.tsx
src/components/events/EventOutreachTimeline.tsx
src/components/events/DiscoveryRunDialog.tsx
src/components/events/EventSearchPresets.tsx
src/components/events/QualificationBadge.tsx
```

### Modified Files

```
src/App.tsx                          -- Add /events route
src/components/AppSidebar.tsx        -- Add "Eventos" nav item (Calendar icon)
src/types/index.ts                   -- Add 'event' to LeadSource union
src/integrations/supabase/types.ts   -- Add new table types (auto-generated)
src/pages/AnalyticsPage.tsx          -- Add events metrics section
```
