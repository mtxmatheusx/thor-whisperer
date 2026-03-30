CREATE TABLE IF NOT EXISTS public.discovery_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  platforms TEXT[] NOT NULL DEFAULT '{}',
  search_params JSONB NOT NULL DEFAULT '{}',
  events_found INTEGER DEFAULT 0,
  events_qualified INTEGER DEFAULT 0,
  error_log TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  discovery_run_id UUID REFERENCES public.discovery_runs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  platform TEXT NOT NULL,
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
  pipeline_status TEXT NOT NULL DEFAULT 'discovered',
  qualification_score INTEGER DEFAULT 0,
  qualification_notes TEXT,
  discard_reason TEXT,
  converted_lead_id UUID,
  fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT,
  role TEXT,
  email TEXT,
  phone TEXT,
  linkedin TEXT,
  instagram TEXT,
  website TEXT,
  source TEXT,
  confidence TEXT DEFAULT 'low',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.event_outreach_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  event_contact_id UUID REFERENCES public.event_contacts(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  channel TEXT NOT NULL,
  outreach_type TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  template_used TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  external_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.discovery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_outreach_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their discovery_runs" ON public.discovery_runs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own their events" ON public.events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own their event_contacts" ON public.event_contacts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users own their event_outreach_log" ON public.event_outreach_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);