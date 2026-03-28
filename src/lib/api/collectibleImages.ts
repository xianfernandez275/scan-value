import { supabase } from '@/integrations/supabase/client';

export interface ImageResult {
  imageUrl: string;
  source: string;
  attribution: string;
  sourceUrl: string;
  cardId?: string;
  setName?: string;
  number?: string;
  isFallback?: boolean;
  reason?: string;
}

export interface ImageSearchParams {
  name: string;
  category: string;
  subcategory?: string;
  tcg_set_id?: string;
  card_number?: string;
  catalog_id?: string;
  official_card_id?: string;
  official_set_name?: string;
  official_card_number?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createFallbackImageResult(name: string, category: string, reason: string): ImageResult {
  const title = escapeXml(category || 'Coleccionable');
  const subtitle = escapeXml((name || 'Sin imagen').substring(0, 40));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 640"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#111827"/><stop offset="100%" stop-color="#1f2937"/></linearGradient></defs><rect width="480" height="640" rx="32" fill="url(#bg)"/><rect x="24" y="24" width="432" height="592" rx="24" fill="none" stroke="#f59e0b" stroke-opacity="0.4" stroke-width="3"/><text x="50%" y="46%" text-anchor="middle" fill="#f9fafb" font-family="Georgia,serif" font-size="34" font-weight="700">${title}</text><text x="50%" y="54%" text-anchor="middle" fill="#d1d5db" font-family="Arial,sans-serif" font-size="20">${subtitle}</text></svg>`;
  return {
    imageUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    source: 'Fallback',
    attribution: `Fallback generado — ${reason}`,
    sourceUrl: '',
    isFallback: true,
    reason,
  };
}

/**
 * Fetch image using precise identifiers. If collectionItemId is provided and a real
 * image is found, persist it to the DB so future loads skip the API call.
 */
export async function fetchCollectibleImage(
  params: ImageSearchParams,
  collectionItemId?: string,
): Promise<ImageResult> {
  try {
    const { data, error } = await supabase.functions.invoke('search-collectible-image', {
      body: params,
    });

    if (error) {
      console.error('Error fetching collectible image:', error);
      return createFallbackImageResult(params.name, params.category, error.message || 'Function invoke error');
    }

    if (data?.success && data?.data) {
      const result = data.data as ImageResult;

      // Persist to DB if we got a real image and have an item ID
      if (collectionItemId && result.imageUrl && !result.isFallback) {
        supabase
          .from('collection_items')
          .update({
            official_image_url: result.imageUrl,
            official_image_source: result.source,
            official_image_attribution: result.attribution,
            official_image_source_url: result.sourceUrl,
            official_card_id: result.cardId || undefined,
            official_set_name: result.setName || undefined,
            official_card_number: result.number || undefined,
          })
          .eq('id', collectionItemId)
          .then(({ error: updateErr }) => {
            if (updateErr) console.error('Failed to persist image:', updateErr);
            else console.log(`✅ Image persisted for item ${collectionItemId}`);
          });
      }

      return result;
    }

    return createFallbackImageResult(params.name, params.category, 'No data returned by image search');
  } catch (err) {
    console.error('Failed to fetch collectible image:', err);
    return createFallbackImageResult(params.name, params.category, err instanceof Error ? err.message : 'Unexpected error');
  }
}
