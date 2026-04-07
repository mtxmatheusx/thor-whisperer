
CREATE TABLE public.business_prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  owner_name TEXT,
  segment TEXT NOT NULL DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  email TEXT,
  phone TEXT,
  instagram TEXT,
  linkedin TEXT,
  website TEXT,
  google_maps_url TEXT,
  rating NUMERIC(2,1),
  review_count INTEGER,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'responded', 'meeting', 'client', 'lost')),
  notes TEXT DEFAULT '',
  source TEXT DEFAULT 'firecrawl',
  confidence TEXT DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their business_prospects" ON public.business_prospects
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_business_prospects_updated_at
  BEFORE UPDATE ON public.business_prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
