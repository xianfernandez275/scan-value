import { supabase } from '@/integrations/supabase/client';

export interface IdentificationResult {
  name: string;
  category: string;
  year: number;
  set_or_edition: string;
  catalog_id: string;
  rarity: string;
  condition_estimate: string;
  special_features: string[];
  description: string;
  estimated_value_usd: number;
  confidence: number;
  search_query: string;
}

export interface OfficialImage {
  imageUrl: string;
  source: string;
  attribution: string;
  sourceUrl: string;
  cardId?: string;
  setName?: string;
}

export interface IdentifyResponse {
  success: boolean;
  identification: IdentificationResult;
  officialImage: OfficialImage | null;
  error?: string;
}

export async function identifyCollectible(imageBase64: string): Promise<IdentifyResponse> {
  const { data, error } = await supabase.functions.invoke('identify-collectible', {
    body: { imageBase64 },
  });

  if (error) {
    throw new Error(error.message || 'Failed to identify collectible');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as IdentifyResponse;
}
