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
  scansRemaining?: number | null;
  error?: string;
}

// On non-2xx responses supabase-js hides the body behind error.context, so we
// read it to surface server error codes like SCAN_LIMIT_REACHED.
async function invokeIdentify(body: Record<string, unknown>): Promise<IdentifyResponse> {
  const { data, error } = await supabase.functions.invoke('identify-collectible', { body });

  if (error) {
    let message = error.message || 'Failed to identify collectible';
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const errBody = await ctx.json();
        if (errBody?.error) message = errBody.error;
      } catch {
        // keep the generic message
      }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);

  return data as IdentifyResponse;
}

export async function identifyCollectible(imageBase64: string): Promise<IdentifyResponse> {
  return invokeIdentify({ imageBase64 });
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
  return invokeIdentify({
    coinRefinement: params,
    identification: originalIdentification,
  });
}
