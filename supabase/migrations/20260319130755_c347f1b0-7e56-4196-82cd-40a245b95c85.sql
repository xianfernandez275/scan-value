
CREATE TABLE public.collection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Item identification
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  year INTEGER,
  set_or_edition TEXT,
  catalog_id TEXT,
  tcg_set_id TEXT,
  card_number TEXT,
  variant TEXT,
  
  -- Details
  rarity TEXT,
  condition_estimate TEXT,
  special_features TEXT[] DEFAULT '{}',
  description TEXT,
  estimated_value_usd NUMERIC,
  confidence NUMERIC,
  
  -- Images
  user_photo_url TEXT,
  official_image_url TEXT,
  official_image_source TEXT,
  official_image_attribution TEXT,
  official_image_source_url TEXT,
  official_card_id TEXT,
  official_set_name TEXT,
  official_card_number TEXT
);

-- Enable RLS (public for now since no auth yet)
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (will add user-based policies with auth)
CREATE POLICY "Allow all access to collection_items" ON public.collection_items
  FOR ALL USING (true) WITH CHECK (true);
