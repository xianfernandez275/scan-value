import { supabase } from '@/integrations/supabase/client';

export interface ImageResult {
  imageUrl: string;
  source: string;
  attribution: string;
  sourceUrl: string;
}

export async function fetchCollectibleImage(
  name: string,
  category: string
): Promise<ImageResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('search-collectible-image', {
      body: { name, category },
    });

    if (error) {
      console.error('Error fetching collectible image:', error);
      return null;
    }

    if (data?.success && data?.data) {
      return data.data as ImageResult;
    }

    return null;
  } catch (err) {
    console.error('Failed to fetch collectible image:', err);
    return null;
  }
}
