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
}

interface ImageResult {
  imageUrl: string;
  source: string;
  attribution: string;
  sourceUrl: string;
}

async function fetchWithTimeout(provider: string, url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<{ ok: boolean; status: number; data: any }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    log(provider, `→ FETCH ${url.substring(0, 150)}`);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { data = text; }
    
    const statusEmoji = res.ok ? '✅' : '⚠️';
    log(provider, `${statusEmoji} ${res.status} | hasData=${!!data}`);
    
    if (!res.ok) {
      logError(provider, `HTTP ${res.status}`, typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200));
    }
    return { ok: res.ok, status: res.status, data };
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') {
      logError(provider, `TIMEOUT (${timeoutMs}ms) for ${url.substring(0, 80)}`);
    } else {
      logError(provider, `NETWORK ERROR`, e);
    }
    return { ok: false, status: 0, data: null };
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
  const { ok, data } = await fetchWithTimeout('pokeapi', url);
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

async function searchComicVine(name: string): Promise<ImageResult | null> {
  const apiKey = Deno.env.get('COMIC_VINE_API_KEY');
  if (!apiKey) {
    logError('comic-vine', '🔑 API key missing: COMIC_VINE_API_KEY — skipping comic image search');
    return null;
  }

  const url = `https://comicvine.gamespot.com/api/search/?api_key=${apiKey}&format=json&query=${encodeURIComponent(name)}&resources=issue&limit=1&field_list=id,name,image,site_detail_url`;
  const { ok, data } = await fetchWithTimeout('comic-vine', url, { headers: { 'User-Agent': 'ColecScan/1.0' } });
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

async function searchNumista(name: string): Promise<ImageResult | null> {
  const apiKey = Deno.env.get('NUMISTA_API_KEY');
  if (!apiKey) {
    logError('numista', '🔑 API key missing: NUMISTA_API_KEY — skipping coin image search');
    return null;
  }

  const url = `https://api.numista.com/api/v3/coins?q=${encodeURIComponent(name)}&count=1`;
  const { ok, data } = await fetchWithTimeout('numista', url, {
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, category }: SearchRequest = await req.json();
    log('main', `═══ Image search: "${name}" | category: "${category}" ═══`);

    if (!name) {
      logError('main', 'Name is required but was empty');
      return new Response(
        JSON.stringify({ success: false, error: 'Name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check API keys
    const keys = [
      { name: 'Comic Vine', env: 'COMIC_VINE_API_KEY', configured: !!Deno.env.get('COMIC_VINE_API_KEY') },
      { name: 'Numista', env: 'NUMISTA_API_KEY', configured: !!Deno.env.get('NUMISTA_API_KEY') },
    ];
    for (const k of keys) {
      if (!k.configured) logError('keys', `🔑 API key missing: ${k.name} (${k.env})`);
    }

    let result: ImageResult | null = null;
    const cat = normalizeCategory(category || '');
    log('main', `Normalized category: "${cat}"`);

    if (cat.includes('carta') || cat.includes('card')) {
      log('main', `Routing to: PokéAPI (cards)`);
      result = await searchPokemonImage(name);
    } else if (cat.includes('comic')) {
      log('main', `Routing to: Comic Vine (comics)`);
      result = await searchComicVine(name);
    } else if (cat.includes('moneda') || cat.includes('coin')) {
      log('main', `Routing to: Numista (coins)`);
      result = await searchNumista(name);
    } else {
      log('main', `No specific handler for category "${cat}" — trying PokéAPI as fallback`);
    }

    // Fallback chain
    if (!result) {
      log('main', `Primary provider returned null. Trying fallback: PokéAPI`);
      result = await searchPokemonImage(name);
    }

    if (result) {
      log('main', `✅ Final result: source="${result.source}", imageUrl="${result.imageUrl.substring(0, 80)}..."`);
    } else {
      log('main', `⚠️ No image found for "${name}" in any provider`);
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
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
