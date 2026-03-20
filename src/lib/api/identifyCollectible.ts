import { supabase } from '@/integrations/supabase/client';

export interface IdentificationResult {
  name: string;
  category: string;
  subcategory: string;
  year: number;
  set_or_edition: string;
  catalog_id: string;
  tcg_set_id: string;
  card_number: string;
  variant: string;
  rarity: string;
  condition_estimate: string;
  special_features: string[];
  description: string;
  estimated_value_usd: number;
  confidence: number;
}

export interface MarketData {
  averagePrice?: number;
  lowPrice?: number;
  highPrice?: number;
  lastUpdated?: string;
  trending?: 'up' | 'down' | 'stable';
  source?: string;
}

export interface OfficialImage {
  imageUrl: string;
  source: string;
  attribution: string;
  sourceUrl: string;
  cardId: string;
  setName: string;
  number: string;
  name: string;
}

export interface IdentifyResponse {
  success: boolean;
  identification: IdentificationResult;
  officialImage: OfficialImage | null;
  candidates: OfficialImage[];
  needsConfirmation: boolean;
  provider?: string;
  marketData?: MarketData;
  error?: string;
}

export async function identifyCollectible(imageBase64: string): Promise<IdentifyResponse> {
  const { data, error } = await supabase.functions.invoke('identify-collectible', {
    body: { imageBase64 },
  });

  if (error) throw new Error(error.message || 'Failed to identify collectible');
  if (data?.error) throw new Error(data.error);

  return data as IdentifyResponse;
}

export interface CoinRefinementParams {
  country?: string;
  year?: string;
  face?: string;
  denomination?: string;
  originalName?: string;
}

export async function refineCoinIdentification(
  params: CoinRefinementParams,
  originalIdentification: IdentificationResult,
): Promise<IdentifyResponse> {
  const { data, error } = await supabase.functions.invoke('identify-collectible', {
    body: {
      coinRefinement: params,
      identification: originalIdentification,
    },
  });

  if (error) throw new Error(error.message || 'Failed to refine coin identification');
  if (data?.error) throw new Error(data.error);

  return data as IdentifyResponse;
}
