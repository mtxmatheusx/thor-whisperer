-- ============================================================
-- MIGRATION: Event Prospecting Module — Phase 1
-- ============================================================

-- Tracks each automated discovery execution
CREATE TABLE public.discovery_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed')),
  platforms TEXT[] NOT NULL DEFAULT '{}',
  search_params JSONB NOT NULL DEFAULT '{}',
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

  name TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('sympla','eventbrite','even3','google','manual')),
  platform_id TEXT,
  platform_url TEXT,

  event_date TIMESTAMPTZ,
  event_end_date TIMESTAMPTZ,
  location_city TEXT,
  location_state TEXT,
  location_venue TEXT,
  is_online BOOLEAN DEFAULT false,
  estimated_audience INTEGER,
  ticket_price_range TEXT,

  category TEXT,
  themes TEXT[] DEFAULT '{}',
  audience_type TEXT,

  pipeline_status TEXT NOT NULL DEFAULT 'discovered'
    CHECK (pipeline_status IN (
      'discovered','qualified','contact_found','contacted',
      'responded','negotiating','booked','completed','discarded'
    )),
  qualification_score INTEGER DEFAULT 0 CHECK (qualification_score >= 0 AND qualification_score <= 100),
  qualification_notes TEXT,
  discard_reason TEXT,

  converted_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  fingerprint TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Organizer / contact info
CREATE TABLE public.event_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT,
  role TEXT,
  email TEXT,
  phone TEXT,
  linkedin TEXT,
  instagram TEXT,
  website TEXT,
  source TEXT,
  confidence TEXT DEFAULT 'low'
    CHECK (confidence IN ('high','medium','low')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Outreach tracking
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
  external_message_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Search presets
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
  auto_qualify_threshold INTEGER DEFAULT 60,
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

-- Updated_at trigger
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend leads.source to include 'event'
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_source_check
  CHECK (source IN ('linkedin','instagram','referral','import','event'));
