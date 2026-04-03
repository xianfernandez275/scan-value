/**
 * Collectible Image Search — Precise image lookup using unique identifiers
 * 
 * PRIORITY ORDER:
 * 1. Exact lookup by set.id + card.number (TCG cards)
 * 2. Lookup by externalId / catalog_id
 * 3. Fallback to name-based search (last resort)
 * 
 * APIs:
 * - Pokémon TCG API (pokemontcg.io): Free, commercial OK — uses set.id + number for EXACT card images
 * - Scryfall (scryfall.com): Free, commercial OK — MTG precise lookups
 * - YGOPRODeck: Free, attribution required — Yu-Gi-Oh! lookups
 * - Comic Vine: API key required, commercial OK
 * - Numista: API key required, commercial OK
 * - Discogs: Token required, commercial OK
 * - PokéAPI: Free — generic Pokémon artwork (last resort for cards)
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
  tcg_set_id?: string;
  card_number?: string;
  catalog_id?: string;
  official_card_id?: string;
  official_set_name?: string;
  official_card_number?: string;
}

interface ImageResult {
  imageUrl: string;
  source: string;
  attribution: string;
  sourceUrl: string;
  cardId?: string;
  setName?: string;
  number?: string;
  isFallback?: boolean;
  reason?: string;
  matchConfidence?: 'high' | 'medium' | 'low';
}

async function robustFetch(provider: string, url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<{ ok: boolean; status: number; data: any }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    log(provider, `→ FETCH ${url.substring(0, 150)}`);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!res.ok) {
      logError(provider, `HTTP ${res.status}`, typeof data === 'string' ? data.substring(0, 200) : '');
      return { ok: false, status: res.status, data };
    }
    log(provider, `✅ status=${res.status}`);
    return { ok: true, status: res.status, data };
  } catch (e: any) {
    clearTimeout(timeout);
    logError(provider, e.name === 'AbortError' ? `TIMEOUT (${timeoutMs}ms)` : 'NETWORK ERROR', e);
    return { ok: false, status: 0, data: null };
  }
}

// ─── Category Normalization ─────────────────────────────────────────────────

function normalizeCategory(raw: string): string {
  const cleaned = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const map: Record<string, string[]> = {
    'Cartas': ['carta', 'cartas', 'card', 'cards', 'trading card', 'tcg'],
    'Cómics': ['comic', 'comics', 'comica', 'comicas', 'manga', 'graphic novel'],
    'Monedas': ['moneda', 'monedas', 'coin', 'coins'],
    'Juguetes': ['juguete', 'juguetes', 'toy', 'toys', 'funko', 'hot wheels'],
    'Figuras': ['figura', 'figuras', 'figure', 'figures', 'action figure', 'statue', 'estatua'],
    'Sellos': ['sello', 'sellos', 'stamp', 'stamps', 'estampilla'],
    'Vinilos': ['vinilo', 'vinilos', 'vinyl', 'record', 'lp', 'disco'],
  };
  for (const [canonical, aliases] of Object.entries(map)) {
    for (const alias of aliases) {
      if (cleaned === alias || cleaned.includes(alias)) return canonical;
    }
  }
  return raw || 'Otro';
}

function matchesSubcategory(subcategory: string | undefined, ...patterns: string[]): boolean {
  if (!subcategory) return false;
  const cleaned = subcategory.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/[\s\-_]+/g, '');
  return patterns.some(p => cleaned.includes(p.toLowerCase().replace(/[\s\-_]+/g, '')));
}

// ─── Pokémon TCG API (PRECISE) ──────────────────────────────────────────────

const POKEMON_ATTRIBUTION = 'Pokémon and its trademarks are ©1995-2026 Nintendo, Creatures, and GAME FREAK. Card images from pokemontcg.io.';

async function searchPokemonTCGExact(req: SearchRequest): Promise<ImageResult | null> {
  // Strategy 1: Exact by official_card_id (e.g. "base1-4")
  if (req.official_card_id) {
    const url = `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(req.official_card_id)}`;
    log('pokemon-tcg', `Exact lookup by cardId: ${req.official_card_id}`);
    const { ok, data } = await robustFetch('pokemon-tcg', url);
    if (ok && data?.data) {
      const card = data.data;
      log('pokemon-tcg', `✅ Exact match by cardId: ${card.id}`);
      return {
        imageUrl: card.images?.large || card.images?.small || '',
        source: 'Pokémon TCG API',
        attribution: POKEMON_ATTRIBUTION,
        sourceUrl: `https://pokemontcg.io/card/${card.id}`,
        cardId: card.id,
        setName: card.set?.name || '',
        number: card.number || '',
        matchConfidence: 'high' as const,
      };
    }
  }

  // Strategy 2: set.id + card number
  if (req.tcg_set_id && (req.card_number || req.official_card_number)) {
    const num = req.card_number || req.official_card_number;
    const q = `set.id:${req.tcg_set_id} number:${num}`;
    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=1`;
    log('pokemon-tcg', `Lookup by set+number: ${q}`);
    const { ok, data } = await robustFetch('pokemon-tcg', url);
    if (ok && data?.data?.length > 0) {
      const card = data.data[0];
      log('pokemon-tcg', `✅ Exact match by set+number: ${card.id}`);
      return {
        imageUrl: card.images?.large || card.images?.small || '',
        source: 'Pokémon TCG API',
        attribution: POKEMON_ATTRIBUTION,
        sourceUrl: `https://pokemontcg.io/card/${card.id}`,
        cardId: card.id,
        setName: card.set?.name || '',
        number: card.number || '',
        matchConfidence: 'high' as const,
      };
    }
  }

  // Strategy 3: Name search within a specific set
  if (req.tcg_set_id) {
    const pokemonName = req.name.split(/[\s\-–]/)[0];
    const q = `set.id:${req.tcg_set_id} name:"${pokemonName}"`;
    const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=5`;
    log('pokemon-tcg', `Lookup by set+name: ${q}`);
    const { ok, data } = await robustFetch('pokemon-tcg', url);
    if (ok && data?.data?.length > 0) {
      // If we have a card_number, try to match it
      const num = req.card_number || req.official_card_number || req.catalog_id?.split('/')?.[0]?.trim();
      if (num) {
        const exact = data.data.find((c: any) => c.number === num);
        if (exact) {
          log('pokemon-tcg', `✅ Match by number within set+name: ${exact.id}`);
          return {
            imageUrl: exact.images?.large || exact.images?.small || '',
            source: 'Pokémon TCG API',
            attribution: POKEMON_ATTRIBUTION,
            sourceUrl: `https://pokemontcg.io/card/${exact.id}`,
            cardId: exact.id,
            setName: exact.set?.name || '',
            number: exact.number || '',
            matchConfidence: 'high' as const,
          };
        }
      }
      // Return first match if only one
      if (data.data.length === 1) {
        const card = data.data[0];
        return {
          imageUrl: card.images?.large || card.images?.small || '',
          source: 'Pokémon TCG API',
          attribution: POKEMON_ATTRIBUTION,
          sourceUrl: `https://pokemontcg.io/card/${card.id}`,
          cardId: card.id,
          setName: card.set?.name || '',
          number: card.number || '',
          matchConfidence: 'medium' as const,
        };
      }
      log('pokemon-tcg', `Multiple results (${data.data.length}) — returning first`);
      const card = data.data[0];
      return {
        imageUrl: card.images?.large || card.images?.small || '',
        source: 'Pokémon TCG API',
        attribution: POKEMON_ATTRIBUTION,
        sourceUrl: `https://pokemontcg.io/card/${card.id}`,
        cardId: card.id,
        setName: card.set?.name || '',
        number: card.number || '',
        matchConfidence: 'medium' as const,
      };
    }
  }

  // Strategy 4: Broad name search (last resort for Pokémon cards)
  const pokemonName = req.name.split(/[\s\-–]/)[0];
  const q = `name:"${pokemonName}"`;
  const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=1&orderBy=-set.releaseDate`;
  log('pokemon-tcg', `Broad name search: ${q}`);
  const { ok, data } = await robustFetch('pokemon-tcg', url);
  if (ok && data?.data?.length > 0) {
    const card = data.data[0];
    log('pokemon-tcg', `Found by name (not exact edition): ${card.id}`);
    return {
      imageUrl: card.images?.large || card.images?.small || '',
      source: 'Pokémon TCG API',
      attribution: POKEMON_ATTRIBUTION,
      sourceUrl: `https://pokemontcg.io/card/${card.id}`,
      cardId: card.id,
      setName: card.set?.name || '',
      number: card.number || '',
      matchConfidence: 'low' as const,
    };
  }

  return null;
}

// ─── Scryfall (MTG precise) ─────────────────────────────────────────────────

async function searchMTGExact(req: SearchRequest): Promise<ImageResult | null> {
  const cardName = req.name.split(/[\-–·]/)[0].trim();
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(cardName)}&unique=prints&order=released&dir=desc`;
  log('mtg-scryfall', `Search: ${cardName}`);
  const { ok, data } = await robustFetch('mtg-scryfall', url);
  if (!ok || !data?.data?.length) return null;

  const card = data.data[0];
  return {
    imageUrl: card.image_uris?.large || card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.large || '',
    source: 'Scryfall',
    attribution: 'Magic: The Gathering is © Wizards of the Coast. Card data from Scryfall.',
    sourceUrl: card.scryfall_uri || '',
    cardId: card.id,
    setName: card.set_name || '',
    number: card.collector_number || '',
    matchConfidence: 'medium' as const,
  };
}

// ─── YGOPRODeck (Yu-Gi-Oh! precise) ────────────────────────────────────────

async function searchYuGiOhExact(req: SearchRequest): Promise<ImageResult | null> {
  const cardName = req.name.split(/[\-–·]/)[0].trim();
  const url = `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(cardName)}&num=1&offset=0`;
  log('yugioh', `Search: ${cardName}`);
  const { ok, data } = await robustFetch('yugioh', url);
  if (!ok || !data?.data?.length) return null;

  const card = data.data[0];
  return {
    imageUrl: card.card_images?.[0]?.image_url || '',
    source: 'YGOPRODeck',
    attribution: 'Yu-Gi-Oh! is © Konami. Card data from YGOPRODeck (ygoprodeck.com).',
    sourceUrl: `https://ygoprodeck.com/card/${card.name?.replace(/\s+/g, '-').toLowerCase()}`,
    cardId: String(card.id),
    setName: card.card_sets?.[0]?.set_name || '',
    number: card.card_sets?.[0]?.set_code || '',
    matchConfidence: 'medium' as const,
  };
}

// ─── Comic Vine ─────────────────────────────────────────────────────────────

async function searchComicVine(name: string): Promise<ImageResult | null> {
  const apiKey = Deno.env.get('COMIC_VINE_API_KEY');
  if (!apiKey) { logError('comic-vine', 'API key missing'); return null; }

  const url = `https://comicvine.gamespot.com/api/search/?api_key=${apiKey}&format=json&query=${encodeURIComponent(name)}&resources=issue&limit=1&field_list=id,name,image,site_detail_url`;
  const { ok, data } = await robustFetch('comic-vine', url, { headers: { 'User-Agent': 'ColecScan/1.0' } });
  if (!ok || !data?.results?.[0]) return null;

  const issue = data.results[0];
  return {
    imageUrl: issue.image?.medium_url || issue.image?.small_url || '',
    source: 'Comic Vine',
    attribution: 'Data provided by Comic Vine (comicvine.gamespot.com)',
    sourceUrl: issue.site_detail_url || 'https://comicvine.gamespot.com',
    matchConfidence: 'medium' as const,
  };
}

// ─── Numista ────────────────────────────────────────────────────────────────

async function searchNumista(name: string): Promise<ImageResult | null> {
  const apiKey = Deno.env.get('NUMISTA_API_KEY');
  if (!apiKey) { logError('numista', 'API key missing'); return null; }

  const url = `https://api.numista.com/api/v3/coins?q=${encodeURIComponent(name)}&count=1`;
  const { ok, data } = await robustFetch('numista', url, {
    headers: { 'Numista-API-Key': apiKey, 'Accept': 'application/json' },
  });
  if (!ok || !data?.coins?.[0]) return null;

  const coin = data.coins[0];
  return {
    imageUrl: coin.obverse?.picture || '',
    source: 'Numista',
    attribution: 'Data provided by Numista (en.numista.com)',
    sourceUrl: `https://en.numista.com/catalogue/pieces${coin.id}.html`,
    matchConfidence: 'medium' as const,
  };
}

// ─── Discogs ────────────────────────────────────────────────────────────────

async function searchDiscogs(name: string): Promise<ImageResult | null> {
  const token = Deno.env.get('DISCOGS_TOKEN');
  if (!token) { logError('discogs', 'API key missing'); return null; }

  const url = `https://api.discogs.com/database/search?q=${encodeURIComponent(name)}&type=release&per_page=1`;
  const { ok, data } = await robustFetch('discogs', url, {
    headers: { 'Authorization': `Discogs token=${token}`, 'User-Agent': 'ColecScan/1.0' },
  });
  if (!ok || !data?.results?.[0]) return null;

  const release = data.results[0];
  return {
    imageUrl: release.cover_image || release.thumb || '',
    source: 'Discogs',
    attribution: 'Data provided by Discogs (discogs.com)',
    sourceUrl: `https://www.discogs.com${release.uri || ''}`,
    matchConfidence: 'medium' as const,
  };
}

// ─── Fallback SVG ───────────────────────────────────────────────────────────

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function createFallbackResult(name: string, category: string, reason: string): ImageResult {
  const title = escapeXml(category || 'Coleccionable');
  const subtitle = escapeXml((name || 'Sin imagen').substring(0, 42));
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

// ─── Main Router ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SearchRequest = await req.json();
    const { name, category, subcategory } = body;
    const cat = normalizeCategory(category || '');

    log('main', `═══ Image search: "${name}" | category: "${category}" → "${cat}" | subcategory: "${subcategory || 'N/A'}" | tcg_set_id: "${body.tcg_set_id || ''}" | card_number: "${body.card_number || ''}" | official_card_id: "${body.official_card_id || ''}" ═══`);

    if (!name) {
      return new Response(JSON.stringify({ success: false, error: 'Name is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result: ImageResult | null = null;

    // ── Cards: use precise TCG APIs ──
    if (cat === 'Cartas') {
      const hasIdentifiers = body.tcg_set_id || body.card_number || body.official_card_id;

      if (matchesSubcategory(subcategory, 'pokemon', 'pokémon') || (!subcategory && hasIdentifiers)) {
        // Try Pokémon TCG API with identifiers first
        result = await searchPokemonTCGExact(body);
      }

      if (!result && matchesSubcategory(subcategory, 'magic', 'mtg', 'the gathering')) {
        result = await searchMTGExact(body);
      }

      if (!result && matchesSubcategory(subcategory, 'yu-gi-oh', 'yugioh', 'yu gi oh')) {
        result = await searchYuGiOhExact(body);
      }

      // If no subcategory and no result yet, try all card providers
      if (!result && !subcategory) {
        log('main', 'No subcategory — trying all card providers');
        result = await searchPokemonTCGExact(body);
        if (!result) result = await searchMTGExact(body);
        if (!result) result = await searchYuGiOhExact(body);
      }
    }

    // ── Comics ──
    if (!result && cat === 'Cómics') {
      result = await searchComicVine(name);
    }

    // ── Coins ──
    if (!result && cat === 'Monedas') {
      result = await searchNumista(name);
    }

    // ── Vinyl ──
    if (!result && cat === 'Vinilos') {
      result = await searchDiscogs(name);
    }

    // ── Fallback ──
    if (!result) {
      result = createFallbackResult(name, cat, `No provider returned data for "${cat}"`);
    }

    log('main', `✅ Final: source="${result.source}" | imageUrl="${result.imageUrl.substring(0, 80)}..."`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    logError('main', 'Unhandled error', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
