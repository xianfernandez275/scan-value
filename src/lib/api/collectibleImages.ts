import { supabase } from '@/integrations/supabase/client';

export interface ImageResult {
  imageUrl: string;
  source: string;
  attribution: string;
  sourceUrl: string;
  isFallback?: boolean;
  reason?: string;
}

function removeAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeCategory(category: string): string {
  const cleaned = removeAccents(category.trim().toLowerCase());
  if (['carta', 'cartas', 'card', 'cards', 'trading card', 'trading cards', 'tcg'].some((item) => cleaned.includes(item))) return 'Cartas';
  if (['comic', 'comics', 'comic book'].some((item) => cleaned.includes(item))) return 'Cómics';
  if (['moneda', 'monedas', 'coin', 'coins'].some((item) => cleaned.includes(item))) return 'Monedas';
  if (['vinilo', 'vinilos', 'vinyl', 'record', 'disco'].some((item) => cleaned.includes(item))) return 'Vinilos';
  return category || 'Coleccionable';
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildFallbackImageUrl(name: string, category: string): string {
  const title = escapeXml(normalizeCategory(category));
  const subtitle = escapeXml((name || 'Sin imagen').substring(0, 40));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 640">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#111827" />
          <stop offset="100%" stop-color="#1f2937" />
        </linearGradient>
      </defs>
      <rect width="480" height="640" rx="32" fill="url(#bg)" />
      <rect x="24" y="24" width="432" height="592" rx="24" fill="none" stroke="#f59e0b" stroke-opacity="0.4" stroke-width="3" />
      <text x="50%" y="46%" text-anchor="middle" fill="#f9fafb" font-family="Georgia, serif" font-size="34" font-weight="700">${title}</text>
      <text x="50%" y="54%" text-anchor="middle" fill="#d1d5db" font-family="Arial, sans-serif" font-size="20">${subtitle}</text>
      <text x="50%" y="88%" text-anchor="middle" fill="#f59e0b" font-family="Arial, sans-serif" font-size="16">Fallback del cliente</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createFallbackImageResult(name: string, category: string, reason: string): ImageResult {
  return {
    imageUrl: buildFallbackImageUrl(name, category),
    source: 'Fallback',
    attribution: `Fallback generado para ${normalizeCategory(category)} cuando no hubo imagen oficial disponible.`,
    sourceUrl: '',
    isFallback: true,
    reason,
  };
}

export async function fetchCollectibleImage(
  name: string,
  category: string
): Promise<ImageResult> {
  try {
    const { data, error } = await supabase.functions.invoke('search-collectible-image', {
      body: { name, category },
    });

    if (error) {
      console.error('Error fetching collectible image:', error);
      return createFallbackImageResult(name, category, error.message || 'Function invoke error');
    }

    if (data?.success && data?.data) {
      return data.data as ImageResult;
    }

    console.error('Image search returned no data:', data);
    return createFallbackImageResult(name, category, 'No data returned by image search');
  } catch (err) {
    console.error('Failed to fetch collectible image:', err);
    return createFallbackImageResult(name, category, err instanceof Error ? err.message : 'Unexpected image search error');
  }
}
