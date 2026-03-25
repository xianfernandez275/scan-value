/**
 * Collectible Image Search — Fallback image lookup
 * 
 * APIs used (all commercial-OK):
 * - PokéAPI: Free, MIT license (pokeapi.co)
 * - Comic Vine: API key required, commercial OK
 * - Numista: API key required, commercial OK
 * Images are hotlinked only, never cached. Attribution always included.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function log(provider: string, message: string, data?: any) {
  const ts = new Date().toISOString();
  const extra = data !== undefined ? ` | ${JSON.stringify(data)}` : '';
  console.log(`[${ts}][${provider}] ${message}${extra}`);
}

function logError(provider: string, message: string, error?: any) {
  const ts = new Date().toISOString();
  const errMsg = error instanceof Error ? error.message : String(error ?? '');
  console.error(`[${ts}][${provider}] ❌ ${message} ${errMsg}`);
}

interface SearchRequest {
  name: string;
  category: string;
  subcategory?: string;
}

interface ImageResult {
  imageUrl: string;
  source: string;
  attribution: string;
  sourceUrl: string;
  isFallback?: boolean;
  reason?: string;
}

function getResultCount(data: any): number {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data.data)) return data.data.length;
  if (Array.isArray(data.results)) return data.results.length;
  if (Array.isArray(data.coins)) return data.coins.length;
  if (typeof data === 'object') return Object.keys(data).length;
  return 1;
}

function previewResponse(data: any): string {
  if (data == null) return '';
  return (typeof data === 'string' ? data : JSON.stringify(data)).substring(0, 300);
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
  const title = escapeXml(category || 'Coleccionable');
  const subtitle = escapeXml((name || 'Sin imagen').substring(0, 42));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 640" role="img" aria-label="Fallback ${title}">
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
      <text x="50%" y="88%" text-anchor="middle" fill="#f59e0b" font-family="Arial, sans-serif" font-size="16">Fallback del sistema</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createFallbackResult(name: string, category: string, reason: string): ImageResult {
  log('fallback', `Using fallback image | category="${category}" | reason="${reason}" | name="${name}"`);
  return {
    imageUrl: buildFallbackImageUrl(name, category),
    source: 'Fallback',
    attribution: `Fallback generado para ${category} cuando no hubo respuesta válida de los providers.`,
    sourceUrl: '',
    isFallback: true,
    reason,
  };
}

function logProviderStart(provider: string, category: string, subcategory: string | undefined, query: string, url: string) {
  log(provider, `Provider="${provider}" | category="${category}" | subcategory="${subcategory || 'N/A'}" | query="${query}" | url="${url}"`);
}

function checkApiKeys() {
  const keyChecks = [
    { provider: 'Comic Vine', envVar: 'COMIC_VINE_API_KEY' },
    { provider: 'Numista', envVar: 'NUMISTA_API_KEY' },
    { provider: 'Discogs', envVar: 'DISCOGS_TOKEN' },
  ];

  for (const key of keyChecks) {
    if (!Deno.env.get(key.envVar)) {
      console.error(`API key missing: ${key.provider}`);
      logError('keys', `Missing env var ${key.envVar} for ${key.provider}`);
    }
  }
}

async function robustFetch(provider: string, url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<{ ok: boolean; status: number; data: any; error?: string; resultCount: number; responsePreview: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    log(provider, `→ FETCH ${url.substring(0, 150)}`);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { data = text; }
    const responsePreview = previewResponse(data);
    const resultCount = getResultCount(data);
    
    const statusEmoji = res.ok ? '✅' : '⚠️';
    log(provider, `${statusEmoji} status=${res.status} | results=${resultCount} | hasData=${!!data}`);
    
    if (!res.ok) {
      const error = `HTTP ${res.status}`;
      logError(provider, error, responsePreview);
      return { ok: false, status: res.status, data, error, resultCount, responsePreview };
    }
    return { ok: res.ok, status: res.status, data, resultCount, responsePreview };
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') {
      logError(provider, `TIMEOUT (${timeoutMs}ms) for ${url.substring(0, 80)}`);
      return { ok: false, status: 0, data: null, error: `Timeout after ${timeoutMs}ms`, resultCount: 0, responsePreview: '' };
    } else {
      logError(provider, `NETWORK ERROR`, e);
      return { ok: false, status: 0, data: null, error: e?.message || 'Network error', resultCount: 0, responsePreview: '' };
    }
  }
}

// ─── Category Normalization ─────────────────────────────────────────────────

function normalizeCategory(raw: string): string {
  const cleaned = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const map: Record<string, string[]> = {
    'cartas': ['carta', 'cartas', 'card', 'cards', 'trading card', 'tcg'],
    'comics': ['comic', 'comics', 'manga', 'graphic novel'],
    'monedas': ['moneda', 'monedas', 'coin', 'coins'],
    'juguetes': ['juguete', 'juguetes', 'toy', 'toys', 'funko', 'hot wheels'],
    'vinilos': ['vinilo', 'vinilos', 'vinyl', 'record', 'lp', 'disco'],
  };
  for (const [canonical, aliases] of Object.entries(map)) {
    for (const alias of aliases) {
      if (cleaned === alias || cleaned.includes(alias)) return canonical;
    }
  }
  log('normalize', `Unknown category "${raw}" → no specific handler`);
  return cleaned;
}

function extractPokemonName(name: string): string | null {
  const lower = name.toLowerCase();
  const knownPokemon = [
    'charizard', 'pikachu', 'mewtwo', 'blastoise', 'venusaur', 'gengar',
    'dragonite', 'gyarados', 'lugia', 'ho-oh', 'rayquaza', 'mew',
    'eevee', 'snorlax', 'machamp', 'alakazam', 'zapdos', 'moltres',
    'articuno', 'raichu', 'arcanine', 'ninetales', 'jigglypuff',
    'magikarp', 'lapras', 'ditto', 'vaporeon', 'jolteon', 'flareon',
    'umbreon', 'espeon', 'tyranitar', 'gardevoir', 'salamence',
    'metagross', 'dialga', 'palkia', 'giratina', 'arceus',
    'reshiram', 'zekrom', 'kyurem', 'xerneas', 'yveltal',
    'zacian', 'zamazenta', 'eternatus',
  ];
  for (const pokemon of knownPokemon) {
    if (lower.includes(pokemon)) return pokemon;
  }
  const firstWord = name.replace(/[^a-zA-Z]/g, ' ').trim().split(/\s+/)[0]?.toLowerCase();
  return firstWord || null;
}

async function searchPokemonImage(name: string): Promise<ImageResult | null> {
  const pokemonName = extractPokemonName(name);
  if (!pokemonName) {
    log('pokeapi', `Could not extract pokemon name from "${name}"`);
    return null;
  }

  const url = `https://pokeapi.co/api/v2/pokemon/${pokemonName}`;
  logProviderStart('pokeapi', 'Cartas', 'Pokémon', pokemonName, url);
  const { ok, data } = await robustFetch('pokeapi', url);
  if (!ok || !data) {
    log('pokeapi', `No result for "${pokemonName}"`);
    return null;
  }

  const artwork = data.sprites?.other?.['official-artwork']?.front_default;
  const fallback = data.sprites?.front_default;
  const imageUrl = artwork || fallback;

  if (!imageUrl) {
    log('pokeapi', `Result found but no image URL for "${pokemonName}"`);
    return null;
  }

  log('pokeapi', `✅ Found image for "${pokemonName}"`);
  return {
    imageUrl,
    source: 'PokéAPI',
    attribution: 'Pokémon images © Nintendo/Creatures Inc./GAME FREAK inc. Data from PokéAPI (pokeapi.co)',
    sourceUrl: `https://pokeapi.co/api/v2/pokemon/${pokemonName}`,
  };
}

async function searchComicVine(name: string, category: string, subcategory?: string): Promise<ImageResult | null> {
  const apiKey = Deno.env.get('COMIC_VINE_API_KEY');
  if (!apiKey) {
    console.error('API key missing: Comic Vine');
    logError('comic-vine', 'API key missing: Comic Vine (COMIC_VINE_API_KEY)');
    return null;
  }

  const query = name.trim();
  const url = `https://comicvine.gamespot.com/api/search/?api_key=${apiKey}&format=json&query=${encodeURIComponent(name)}&resources=issue&limit=1&field_list=id,name,image,site_detail_url`;
  logProviderStart('comic-vine', category, subcategory, query, url);
  const { ok, data } = await robustFetch('comic-vine', url, { headers: { 'User-Agent': 'ColecScan/1.0' } });
  if (!ok || !data?.results?.[0]) {
    log('comic-vine', `No results for "${name}"`);
    return null;
  }

  const issue = data.results[0];
  log('comic-vine', `✅ Found: ${issue.name || 'unnamed'}`);
  return {
    imageUrl: issue.image?.medium_url || issue.image?.small_url || '',
    source: 'Comic Vine',
    attribution: 'Data provided by Comic Vine (comicvine.gamespot.com)',
    sourceUrl: issue.site_detail_url || 'https://comicvine.gamespot.com',
  };
}

async function searchNumista(name: string, category: string, subcategory?: string): Promise<ImageResult | null> {
  const apiKey = Deno.env.get('NUMISTA_API_KEY');
  if (!apiKey) {
    console.error('API key missing: Numista');
    logError('numista', 'API key missing: Numista (NUMISTA_API_KEY)');
    return null;
  }

  const query = name.trim();
  const url = `https://api.numista.com/api/v3/coins?q=${encodeURIComponent(name)}&count=1`;
  logProviderStart('numista', category, subcategory, query, url);
  const { ok, data } = await robustFetch('numista', url, {
    headers: { 'Numista-API-Key': apiKey, 'Accept': 'application/json' },
  });
  if (!ok || !data?.coins?.[0]) {
    log('numista', `No results for "${name}"`);
    return null;
  }

  const coin = data.coins[0];
  log('numista', `✅ Found: ${coin.title || 'unnamed'}`);
  return {
    imageUrl: coin.obverse?.picture || '',
    source: 'Numista',
    attribution: 'Data provided by Numista (en.numista.com)',
    sourceUrl: `https://en.numista.com/catalogue/pieces${coin.id}.html`,
  };
}

async function searchDiscogs(name: string, category: string, subcategory?: string): Promise<ImageResult | null> {
  const token = Deno.env.get('DISCOGS_TOKEN');
  if (!token) {
    console.error('API key missing: Discogs');
    logError('discogs', 'API key missing: Discogs (DISCOGS_TOKEN)');
    return null;
  }

  const query = name.trim();
  const url = `https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&type=release&per_page=1`;
  logProviderStart('discogs', category, subcategory, query, url);
  const { ok, data } = await robustFetch('discogs', url, {
    headers: {
      'Authorization': `Discogs token=${token}`,
      'User-Agent': 'ColecScan/1.0',
    },
  });

  if (!ok || !data?.results?.[0]) {
    log('discogs', `No results for "${name}"`);
    return null;
  }

  const release = data.results[0];
  log('discogs', `✅ Found: ${release.title || 'unnamed'}`);
  return {
    imageUrl: release.cover_image || release.thumb || '',
    source: 'Discogs',
    attribution: 'Data provided by Discogs (discogs.com)',
    sourceUrl: `https://www.discogs.com${release.uri || ''}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, category, subcategory }: SearchRequest = await req.json();
    log('main', `═══ Image search: "${name}" | category: "${category}" | subcategory: "${subcategory || 'N/A'}" ═══`);
    checkApiKeys();

    if (!name) {
      logError('main', 'Name is required but was empty');
      return new Response(
        JSON.stringify({ success: false, error: 'Name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result: ImageResult | null = null;
    const cat = normalizeCategory(category || '');
    log('main', `Normalized category: "${cat}"`);

    if (cat.includes('carta') || cat.includes('card')) {
      log('main', `Routing to: PokéAPI (cards)`);
      result = await searchPokemonImage(name);
    } else if (cat.includes('comic')) {
      log('main', `Routing to: Comic Vine (comics)`);
      result = await searchComicVine(name, category, subcategory);
    } else if (cat.includes('moneda') || cat.includes('coin')) {
      log('main', `Routing to: Numista (coins)`);
      result = await searchNumista(name, category, subcategory);
    } else if (cat.includes('vinilo') || cat.includes('vinyl') || cat.includes('record') || cat.includes('disco')) {
      log('main', `Routing to: Discogs (vinyl)`);
      result = await searchDiscogs(name, category, subcategory);
    } else {
      log('main', `No specific handler for category "${cat}" — trying generic fallback chain`);
    }

    // Fallback chain
    if (!result && (cat.includes('carta') || cat.includes('card') || cat === 'otro')) {
      log('main', `Primary provider returned null. Trying fallback provider: PokéAPI`);
      result = await searchPokemonImage(name);
    }

    if (!result) {
      result = createFallbackResult(name, category || 'Coleccionable', `No provider returned data for ${category || 'Coleccionable'}`);
    }

    if (result) {
      log('main', `✅ Final result: source="${result.source}", imageUrl="${result.imageUrl.substring(0, 80)}..."`);
    } else {
      log('main', `⚠️ No image found for "${name}" in any provider`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result, diagnostics: { category, subcategory: subcategory || null, normalizedCategory: cat, fallbackUsed: !!result?.isFallback } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logError('main', 'Unhandled error', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
