/**
 * Modular Collectible Identification Edge Function
 * 
 * Architecture:
 * 1. AI identifies the item (category, IDs, metadata)
 * 2. Category normalization maps flexible inputs to canonical categories
 * 3. Provider registry routes to the correct API based on normalized category
 * 4. Fallback image system ensures a valid image is always returned
 * 
 * ─── API Licensing & Compliance ────────────────────────────────────────────
 * All providers have been vetted for commercial use:
 * 
 * 1. Pokémon TCG API (pokemontcg.io) — Free, open-source, commercial OK
 * 2. Scryfall (scryfall.com) — Free, commercial OK with attribution
 * 3. YGOPRODeck (ygoprodeck.com) — Free public API, attribution required
 * 4. Comic Vine — API key required, commercial OK with attribution
 * 5. Numista — API key required, commercial OK with attribution
 * 6. Discogs — Token required, commercial OK with attribution
 * 
 * COMPLIANCE RULES:
 * - Images are HOTLINKED only — never stored/cached locally
 * - Attribution text is always included and must be shown in UI
 * - No web scraping or unofficial APIs
 * - Only external IDs & URLs are persisted in the database
 * ───────────────────────────────────────────────────────────────────────────
 */

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

// Free plan scan quota, enforced server-side via the consume_scan_credit RPC.
const FREE_SCAN_LIMIT = 10;

// Comma-separated list of allowed origins (set as an Edge Function secret).
// When unset the function stays open to any origin: verify_jwt + the per-user
// credit check are the real barriers; CORS here is defense in depth.
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

function buildCorsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = ALLOWED_ORIGINS.length === 0
    ? '*'
    : (origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    ...(ALLOWED_ORIGINS.length > 0 ? { Vary: 'Origin' } : {}),
  };
}

let adminClient: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );
  }
  return adminClient;
}

async function getRequestUser(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await getAdminClient().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

async function refundScanCredit(userId: string) {
  const { error } = await getAdminClient().rpc('refund_scan_credit', { p_user_id: userId });
  if (error) logError('main', 'refund_scan_credit failed', error);
}

// API keys travel as query params for some providers (e.g. Comic Vine); keep
// them out of the logs.
function redactSecrets(text: string): string {
  return text.replace(/((?:api_key|apikey|token|key)=)[^&\s"]+/gi, '$1***');
}

// ─── Diagnostic Logger ──────────────────────────────────────────────────────

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

function logApiCall(provider: string, url: string, status: number, resultCount: number, hasData: boolean, dataPreview?: string) {
  const statusEmoji = status >= 200 && status < 300 ? '✅' : '⚠️';
  log(provider, `${statusEmoji} status=${status} | results=${resultCount} | url=${redactSecrets(url).substring(0, 120)}... | hasData=${hasData}${dataPreview ? ` | preview=${dataPreview.substring(0, 200)}` : ''}`);
}

function getResultCount(data: any): number {
  if (!data) return 0;
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data.data)) return data.data.length;
  if (Array.isArray(data.results)) return data.results.length;
  if (Array.isArray(data.coins)) return data.coins.length;
  if (Array.isArray(data.items)) return data.items.length;
  if (typeof data === 'object') return Object.keys(data).length;
  return 1;
}

function previewResponse(data: any): string {
  if (data == null) return '';
  return (typeof data === 'string' ? data : JSON.stringify(data)).substring(0, 300);
}

function logProviderQuery(provider: string, identification: Partial<Identification>, query: string, url: string) {
  log(
    provider,
    `Provider="${provider}" | category="${identification.category || 'N/A'}" | subcategory="${identification.subcategory || 'N/A'}" | query="${query}" | url="${redactSecrets(url)}"`
  );
}

// ─── API Key Checker ────────────────────────────────────────────────────────

interface ApiKeyStatus {
  name: string;
  envVar: string;
  configured: boolean;
  required: boolean; // false = free API
}

function checkApiKeys(): ApiKeyStatus[] {
  const keys: ApiKeyStatus[] = [
    { name: 'Google Gemini', envVar: 'GEMINI_API_KEY', configured: !!Deno.env.get('GEMINI_API_KEY'), required: true },
    { name: 'Comic Vine', envVar: 'COMIC_VINE_API_KEY', configured: !!Deno.env.get('COMIC_VINE_API_KEY'), required: true },
    { name: 'Numista', envVar: 'NUMISTA_API_KEY', configured: !!Deno.env.get('NUMISTA_API_KEY'), required: true },
    { name: 'Discogs', envVar: 'DISCOGS_TOKEN', configured: !!Deno.env.get('DISCOGS_TOKEN'), required: true },
    { name: 'Pokémon TCG', envVar: '(none - free)', configured: true, required: false },
    { name: 'Scryfall', envVar: '(none - free)', configured: true, required: false },
    { name: 'YGOPRODeck', envVar: '(none - free)', configured: true, required: false },
  ];

  for (const key of keys) {
    if (!key.configured && key.required) {
      console.error(`API key missing: ${key.name}`);
      logError('keys', `Missing env var ${key.envVar} for ${key.name}`);
    } else {
      log('keys', `✅ ${key.name}: configured`);
    }
  }

  return keys;
}

// ─── Unified Types ──────────────────────────────────────────────────────────

interface NormalizedItem {
  imageUrl: string;
  source: string;
  attribution: string;
  sourceUrl: string;
  externalId: string;
  setName: string;
  number: string;
  name: string;
  marketData?: MarketData;
}

interface MarketData {
  averagePrice?: number;
  lowPrice?: number;
  highPrice?: number;
  lastUpdated?: string;
  trending?: 'up' | 'down' | 'stable';
  source?: string;
}

interface ProviderResult {
  exactMatch: NormalizedItem | null;
  candidates: NormalizedItem[];
}

interface Identification {
  name: string;
  category: string;
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
  subcategory: string;
}

interface CoinRefinement {
  country?: string;
  year?: string;
  face?: string;
  denomination?: string;
  originalName?: string;
}

interface FetchResult {
  ok: boolean;
  status: number;
  data: any;
  error?: string;
  responsePreview: string;
  resultCount: number;
}

// ─── Robust Fetch ───────────────────────────────────────────────────────────

async function robustFetch(provider: string, url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    log(provider, `→ FETCH ${redactSecrets(url).substring(0, 150)}`);
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    
    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { data = text; }
    const responsePreview = previewResponse(data);
    const resultCount = getResultCount(data);
    
    logApiCall(provider, url, res.status, resultCount, !!data, responsePreview);
    
    if (!res.ok) {
      const error = `HTTP ${res.status}`;
      logError(provider, `${error} from ${redactSecrets(url).substring(0, 80)}`, responsePreview);
      return { ok: false, status: res.status, data, error, responsePreview, resultCount };
    }
    
    return { ok: true, status: res.status, data, responsePreview, resultCount };
  } catch (e: any) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') {
      const error = `Timeout after ${timeoutMs}ms`;
      logError(provider, `TIMEOUT (${timeoutMs}ms) for ${redactSecrets(url).substring(0, 80)}`);
      return { ok: false, status: 0, data: null, error, responsePreview: '', resultCount: 0 };
    }
    const error = e instanceof Error ? e.message : 'Network error';
    logError(provider, `NETWORK ERROR for ${redactSecrets(url).substring(0, 80)}`, e);
    return { ok: false, status: 0, data: null, error, responsePreview: '', resultCount: 0 };
  }
}

// ─── Category Normalization ─────────────────────────────────────────────────

const CANONICAL_CATEGORIES: Record<string, string[]> = {
  'Cartas': ['carta', 'cartas', 'card', 'cards', 'trading card', 'trading cards', 'tcg'],
  'Cómics': ['comic', 'cómic', 'comics', 'cómics', 'manga', 'graphic novel'],
  'Monedas': ['moneda', 'monedas', 'coin', 'coins', 'numismatic', 'numismática'],
  'Juguetes': ['juguete', 'juguetes', 'toy', 'toys', 'funko', 'funko pop', 'hot wheels'],
  'Figuras': ['figura', 'figuras', 'figure', 'figures', 'action figure', 'statue', 'estatua'],
  'Sellos': ['sello', 'sellos', 'stamp', 'stamps', 'estampilla', 'estampillas'],
  'Vinilos': ['vinilo', 'vinilos', 'vinyl', 'vinyls', 'disco', 'record', 'lp'],
};

function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeCategory(raw: string): string {
  const cleaned = removeAccents(raw.trim().toLowerCase());
  for (const [canonical, aliases] of Object.entries(CANONICAL_CATEGORIES)) {
    for (const alias of aliases) {
      if (cleaned === alias || cleaned.includes(alias)) {
        log('normalize', `"${raw}" → "${canonical}" (matched alias: "${alias}")`);
        return canonical;
      }
    }
  }
  if (Object.keys(CANONICAL_CATEGORIES).includes(raw)) return raw;
  log('normalize', `⚠️ Unknown category "${raw}" → defaulting to "Otro"`);
  return 'Otro';
}

// ─── Subcategory Matching (flexible) ────────────────────────────────────────

function matchesSubcategory(subcategory: string, ...patterns: string[]): boolean {
  if (!subcategory) return false;
  const cleaned = removeAccents(subcategory.trim().toLowerCase()).replace(/[\s\-_]+/g, '');
  const matched = patterns.some(p => {
    const cleanPattern = removeAccents(p.toLowerCase()).replace(/[\s\-_]+/g, '');
    return cleaned.includes(cleanPattern);
  });
  return matched;
}

// ─── Provider Interface ─────────────────────────────────────────────────────

interface CollectibleProvider {
  name: string;
  categories: string[];
  requiresApiKey?: string; // env var name, if required
  fetchItem(id: Identification, refinement?: CoinRefinement): Promise<ProviderResult>;
}

// ─── Provider: Pokémon TCG ──────────────────────────────────────────────────

const POKEMON_ATTRIBUTION = 'Pokémon and its trademarks are ©1995-2026 Nintendo, Creatures, and GAME FREAK. Card images from pokemontcg.io.';

function pokemonCardToNormalized(card: any): NormalizedItem {
  return {
    imageUrl: card.images?.large || card.images?.small || '',
    source: 'Pokémon TCG API',
    attribution: POKEMON_ATTRIBUTION,
    sourceUrl: `https://pokemontcg.io/card/${card.id}`,
    externalId: card.id,
    setName: card.set?.name || '',
    number: card.number || '',
    name: card.name || '',
    marketData: card.tcgplayer?.prices ? extractPokemonMarketData(card) : undefined,
  };
}

function extractPokemonMarketData(card: any): MarketData | undefined {
  const prices = card.tcgplayer?.prices;
  if (!prices) return undefined;
  const priceType = Object.values(prices)[0] as any;
  if (!priceType) return undefined;
  return {
    averagePrice: priceType.mid || priceType.market,
    lowPrice: priceType.low,
    highPrice: priceType.high,
    lastUpdated: card.tcgplayer?.updatedAt,
    source: 'TCGPlayer via pokemontcg.io',
  };
}

const pokemonTCGProvider: CollectibleProvider = {
  name: 'pokemon-tcg',
  categories: ['Cartas'],
  async fetchItem(id: Identification): Promise<ProviderResult> {
    log('pokemon-tcg', `Starting | category="${id.category}" | subcategory="${id.subcategory}" | name="${id.name}" | tcg_set_id="${id.tcg_set_id}" | card_number="${id.card_number}"`);
    
    if (!matchesSubcategory(id.subcategory, 'pokémon', 'pokemon') && id.subcategory) {
      log('pokemon-tcg', `Skipping — subcategory "${id.subcategory}" doesn't match Pokémon`);
      return { exactMatch: null, candidates: [] };
    }

    let exactMatch: NormalizedItem | null = null;
    let candidates: NormalizedItem[] = [];

    try {
      // Strategy 1: Exact set+number
      if (id.tcg_set_id && id.card_number) {
        const q = `set.id:${id.tcg_set_id} number:${id.card_number}`;
        const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=1`;
        logProviderQuery('pokemon-tcg', id, q, url);
        const { ok, data } = await robustFetch('pokemon-tcg', url);
        if (ok && data?.data?.length > 0) {
          exactMatch = pokemonCardToNormalized(data.data[0]);
          log('pokemon-tcg', `✅ Exact match by set+number: ${exactMatch.externalId}`);
          return { exactMatch, candidates: [] };
        }
        log('pokemon-tcg', `No exact match for set+number query`);
      }

      // Strategy 2: Set + name
      if (id.tcg_set_id) {
        const pokemonName = id.name.split(/[\s\-–]/)[0];
        const q = `set.id:${id.tcg_set_id} name:"${pokemonName}"`;
        const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=5`;
        logProviderQuery('pokemon-tcg', id, q, url);
        const { ok, data } = await robustFetch('pokemon-tcg', url);
        if (ok && data?.data?.length > 0) {
          if (data.data.length === 1) {
            exactMatch = pokemonCardToNormalized(data.data[0]);
            log('pokemon-tcg', `✅ Single match by set+name: ${exactMatch.externalId}`);
            return { exactMatch, candidates: [] };
          }
          candidates = data.data.map(pokemonCardToNormalized);
          const byNumber = data.data.find((c: any) => c.number === id.card_number);
          if (byNumber) {
            exactMatch = pokemonCardToNormalized(byNumber);
            log('pokemon-tcg', `✅ Match by number within set+name results: ${exactMatch.externalId}`);
            return { exactMatch, candidates: [] };
          }
          log('pokemon-tcg', `Found ${candidates.length} candidates by set+name`);
        }
      }

      // Strategy 3: Broad name search
      if (!exactMatch && candidates.length === 0) {
        const pokemonName = id.name.split(/[\s\-–]/)[0];
        const q = `name:"${pokemonName}"`;
        const url = `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=10&orderBy=-set.releaseDate`;
        logProviderQuery('pokemon-tcg', id, q, url);
        const { ok, data } = await robustFetch('pokemon-tcg', url);
        if (ok && data?.data?.length > 0) {
          candidates = data.data.map(pokemonCardToNormalized);
          log('pokemon-tcg', `Found ${candidates.length} candidates by broad name search`);
          const catalogNum = id.catalog_id?.split('/')?.[0]?.trim();
          if (catalogNum) {
            const byNum = data.data.find((c: any) => c.number === catalogNum);
            if (byNum) {
              exactMatch = pokemonCardToNormalized(byNum);
              log('pokemon-tcg', `✅ Match by catalog number: ${exactMatch.externalId}`);
              return { exactMatch, candidates };
            }
          }
        } else {
          log('pokemon-tcg', `No results from broad name search for "${pokemonName}"`);
        }
      }
    } catch (e) {
      logError('pokemon-tcg', 'Unhandled error', e);
    }

    log('pokemon-tcg', `Final: exactMatch=${!!exactMatch}, candidates=${candidates.length}`);
    return { exactMatch, candidates };
  }
};

// ─── Provider: Yu-Gi-Oh! ────────────────────────────────────────────────────

const YUGIOH_ATTRIBUTION = 'Yu-Gi-Oh! is © Konami. Card data from YGOPRODeck (ygoprodeck.com).';

const yugiohProvider: CollectibleProvider = {
  name: 'yugioh',
  categories: ['Cartas'],
  async fetchItem(id: Identification): Promise<ProviderResult> {
    log('yugioh', `Starting | category="${id.category}" | subcategory="${id.subcategory}" | name="${id.name}"`);
    
    if (!matchesSubcategory(id.subcategory, 'yu-gi-oh', 'yugioh', 'yu gi oh')) {
      log('yugioh', `Skipping — subcategory "${id.subcategory}" doesn't match Yu-Gi-Oh!`);
      return { exactMatch: null, candidates: [] };
    }

    try {
      const cardName = id.name.split(/[\-–·]/)[0].trim();
      const url = `https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(cardName)}&num=5&offset=0`;
      logProviderQuery('yugioh', id, cardName, url);
      const { ok, data } = await robustFetch('yugioh', url);
      if (!ok || !data?.data?.length) {
        log('yugioh', `No results for "${cardName}"`);
        return { exactMatch: null, candidates: [] };
      }

      const cards = data.data;
      log('yugioh', `Found ${cards.length} results`);

      const normalized = cards.map((card: any): NormalizedItem => ({
        imageUrl: card.card_images?.[0]?.image_url || '',
        source: 'YGOPRODeck',
        attribution: YUGIOH_ATTRIBUTION,
        sourceUrl: `https://ygoprodeck.com/card/${card.name?.replace(/\s+/g, '-').toLowerCase()}`,
        externalId: String(card.id),
        setName: card.card_sets?.[0]?.set_name || '',
        number: card.card_sets?.[0]?.set_code || '',
        name: card.name || '',
        marketData: card.card_prices?.[0] ? {
          averagePrice: parseFloat(card.card_prices[0].tcgplayer_price) || undefined,
          lowPrice: parseFloat(card.card_prices[0].coolstuffinc_price) || undefined,
          source: 'TCGPlayer via YGOPRODeck',
        } : undefined,
      }));

      return {
        exactMatch: normalized.length === 1 ? normalized[0] : null,
        candidates: normalized.length > 1 ? normalized : [],
      };
    } catch (e) {
      logError('yugioh', 'Unhandled error', e);
      return { exactMatch: null, candidates: [] };
    }
  }
};

// ─── Provider: Magic: The Gathering ─────────────────────────────────────────

const MTG_ATTRIBUTION = 'Magic: The Gathering is © Wizards of the Coast. Card data from Scryfall.';

const mtgProvider: CollectibleProvider = {
  name: 'mtg-scryfall',
  categories: ['Cartas'],
  async fetchItem(id: Identification): Promise<ProviderResult> {
    log('mtg-scryfall', `Starting | category="${id.category}" | subcategory="${id.subcategory}" | name="${id.name}"`);
    
    if (!matchesSubcategory(id.subcategory, 'magic', 'mtg', 'the gathering')) {
      log('mtg-scryfall', `Skipping — subcategory "${id.subcategory}" doesn't match MTG`);
      return { exactMatch: null, candidates: [] };
    }

    try {
      const cardName = id.name.split(/[\-–·]/)[0].trim();
      const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(cardName)}&unique=prints&order=released&dir=desc`;
      logProviderQuery('mtg-scryfall', id, cardName, url);
      const { ok, data } = await robustFetch('mtg-scryfall', url);
      if (!ok || !data?.data?.length) {
        log('mtg-scryfall', `No results for "${cardName}"`);
        return { exactMatch: null, candidates: [] };
      }

      const cards = (data.data || []).slice(0, 8);
      log('mtg-scryfall', `Found ${cards.length} results`);

      const normalized = cards.map((card: any): NormalizedItem => ({
        imageUrl: card.image_uris?.large || card.image_uris?.normal || (card.card_faces?.[0]?.image_uris?.large) || '',
        source: 'Scryfall',
        attribution: MTG_ATTRIBUTION,
        sourceUrl: card.scryfall_uri || '',
        externalId: card.id,
        setName: card.set_name || '',
        number: card.collector_number || '',
        name: card.name || '',
        marketData: card.prices ? {
          averagePrice: parseFloat(card.prices.usd) || undefined,
          lowPrice: undefined,
          highPrice: parseFloat(card.prices.usd_foil) || undefined,
          source: 'Scryfall',
        } : undefined,
      }));

      if (id.set_or_edition) {
        const setMatch = normalized.find((c: NormalizedItem) =>
          c.setName.toLowerCase().includes(id.set_or_edition.toLowerCase())
        );
        if (setMatch) {
          log('mtg-scryfall', `✅ Set match: ${setMatch.externalId}`);
          return { exactMatch: setMatch, candidates: normalized };
        }
      }

      return {
        exactMatch: normalized.length === 1 ? normalized[0] : null,
        candidates: normalized,
      };
    } catch (e) {
      logError('mtg-scryfall', 'Unhandled error', e);
      return { exactMatch: null, candidates: [] };
    }
  }
};

// ─── Provider: Comics (Comic Vine) ──────────────────────────────────────────

const comicVineProvider: CollectibleProvider = {
  name: 'comic-vine',
  categories: ['Cómics'],
  requiresApiKey: 'COMIC_VINE_API_KEY',
  async fetchItem(id: Identification): Promise<ProviderResult> {
    const apiKey = Deno.env.get('COMIC_VINE_API_KEY');
    if (!apiKey) {
      console.error('API key missing: Comic Vine');
      logError('comic-vine', 'API key missing: Comic Vine (COMIC_VINE_API_KEY)');
      return { exactMatch: null, candidates: [] };
    }

    try {
      const query = id.name;
      const url = `https://comicvine.gamespot.com/api/search/?api_key=${apiKey}&format=json&query=${encodeURIComponent(id.name)}&resources=issue&limit=5&field_list=id,name,image,site_detail_url,issue_number,volume,cover_date`;
      logProviderQuery('comic-vine', id, query, url);
      const { ok, data } = await robustFetch('comic-vine', url, { headers: { 'User-Agent': 'ColecScan/1.0' } });
      if (!ok || !data?.results?.length) {
        log('comic-vine', `No results for "${id.name}"`);
        return { exactMatch: null, candidates: [] };
      }

      const issues = data.results;
      log('comic-vine', `Found ${issues.length} results`);

      const normalized = issues.map((issue: any): NormalizedItem => ({
        imageUrl: issue.image?.medium_url || issue.image?.small_url || '',
        source: 'Comic Vine',
        attribution: 'Data provided by Comic Vine (comicvine.gamespot.com). Images are © their respective publishers.',
        sourceUrl: issue.site_detail_url || '',
        externalId: String(issue.id),
        setName: issue.volume?.name || '',
        number: issue.issue_number || '',
        name: issue.name || issue.volume?.name || '',
      }));

      return {
        exactMatch: normalized.length === 1 ? normalized[0] : null,
        candidates: normalized.length > 1 ? normalized : [],
      };
    } catch (e) {
      logError('comic-vine', 'Unhandled error', e);
      return { exactMatch: null, candidates: [] };
    }
  }
};

// ─── Provider: Coins (Numista) ──────────────────────────────────────────────

const COUNTRY_TO_ISSUER: Record<string, string> = {
  'España': 'Spain', 'Alemania': 'Germany', 'Francia': 'France', 'Italia': 'Italy',
  'Portugal': 'Portugal', 'Grecia': 'Greece', 'Austria': 'Austria', 'Bélgica': 'Belgium',
  'Países Bajos': 'Netherlands', 'Finlandia': 'Finland', 'Irlanda': 'Ireland',
  'Luxemburgo': 'Luxembourg', 'Eslovenia': 'Slovenia', 'Chipre': 'Cyprus',
  'Malta': 'Malta', 'Eslovaquia': 'Slovakia', 'Estonia': 'Estonia',
  'Letonia': 'Latvia', 'Lituania': 'Lithuania', 'Mónaco': 'Monaco',
  'San Marino': 'San Marino', 'Vaticano': 'Vatican City',
  'Estados Unidos': 'United States', 'Reino Unido': 'United Kingdom',
  'Canadá': 'Canada', 'Australia': 'Australia', 'México': 'Mexico',
  'Japón': 'Japan', 'China': 'China', 'Suiza': 'Switzerland',
  'Brasil': 'Brazil', 'Argentina': 'Argentina', 'Colombia': 'Colombia',
  'India': 'India', 'Sudáfrica': 'South Africa', 'Rusia': 'Russia', 'Turquía': 'Turkey',
};

function buildCoinQuery(id: Identification, refinement?: CoinRefinement): string {
  const parts: string[] = [];
  if (refinement?.denomination) {
    parts.push(refinement.denomination);
  } else if (id.name) {
    parts.push(id.name);
  }
  if (refinement?.country) {
    const eng = COUNTRY_TO_ISSUER[refinement.country] || refinement.country;
    parts.push(eng);
  }
  if (refinement?.year) {
    parts.push(refinement.year);
  } else if (id.year) {
    parts.push(String(id.year));
  }
  return parts.join(' ');
}

const numistaProvider: CollectibleProvider = {
  name: 'numista',
  categories: ['Monedas'],
  requiresApiKey: 'NUMISTA_API_KEY',
  async fetchItem(id: Identification, refinement?: CoinRefinement): Promise<ProviderResult> {
    const apiKey = Deno.env.get('NUMISTA_API_KEY');
    if (!apiKey) {
      console.error('API key missing: Numista');
      logError('numista', 'API key missing: Numista (NUMISTA_API_KEY)');
      return { exactMatch: null, candidates: [] };
    }

    try {
      const query = buildCoinQuery(id, refinement);

      const url = `https://api.numista.com/api/v3/coins?q=${encodeURIComponent(query)}&count=10`;
      logProviderQuery('numista', id, query, url);
      const { ok, data } = await robustFetch('numista', url, {
        headers: { 'Numista-API-Key': apiKey, 'Accept': 'application/json' },
      });

      if (!ok || !data?.coins?.length) {
        log('numista', `No results for "${query}"`);
        return { exactMatch: null, candidates: [] };
      }

      const coins = data.coins;
      log('numista', `Found ${coins.length} results`);
      const faceField = refinement?.face === 'reverse' ? 'reverse' : 'obverse';

      const normalized = coins.map((coin: any): NormalizedItem => ({
        imageUrl: coin[faceField]?.picture || coin.obverse?.picture || coin.reverse?.picture || '',
        source: 'Numista',
        attribution: 'Data provided by Numista (en.numista.com). Images are © their respective owners.',
        sourceUrl: `https://en.numista.com/catalogue/pieces${coin.id}.html`,
        externalId: String(coin.id),
        setName: coin.issuer?.name || '',
        number: coin.min_year && coin.max_year ? `${coin.min_year}-${coin.max_year}` : '',
        name: coin.title || '',
      }));

      if (refinement?.year && normalized.length > 0) {
        const yearNum = parseInt(refinement.year);
        const yearMatch = coins.findIndex((c: any) => {
          const minY = c.min_year || 0;
          const maxY = c.max_year || 9999;
          return yearNum >= minY && yearNum <= maxY;
        });
        if (yearMatch >= 0 && normalized.length > 1) {
          return { exactMatch: normalized[yearMatch], candidates: normalized };
        }
      }

      if (refinement && normalized.length === 1) {
        return { exactMatch: normalized[0], candidates: [] };
      }

      return { exactMatch: null, candidates: normalized };
    } catch (e) {
      logError('numista', 'Unhandled error', e);
      return { exactMatch: null, candidates: [] };
    }
  }
};

// ─── Provider: Toys/Figures ─────────────────────────────────────────────────

const toysProvider: CollectibleProvider = {
  name: 'toys-figures',
  categories: ['Juguetes', 'Figuras'],
  async fetchItem(id: Identification): Promise<ProviderResult> {
    log('toys-figures', `metadata-only mode | category="${id.category}" | subcategory="${id.subcategory}" | name="${id.name}" — no external API available for this category`);
    return { exactMatch: null, candidates: [] };
  }
};

// ─── Provider: Stamps ───────────────────────────────────────────────────────

const stampsProvider: CollectibleProvider = {
  name: 'stamps',
  categories: ['Sellos'],
  async fetchItem(id: Identification): Promise<ProviderResult> {
    log('stamps', `metadata-only mode | category="${id.category}" | subcategory="${id.subcategory}" | name="${id.name}" — no external API available for this category`);
    return { exactMatch: null, candidates: [] };
  }
};

// ─── Provider: Vinyl Records (Discogs) ──────────────────────────────────────

const vinylProvider: CollectibleProvider = {
  name: 'discogs',
  categories: ['Vinilos'],
  requiresApiKey: 'DISCOGS_TOKEN',
  async fetchItem(id: Identification): Promise<ProviderResult> {
    const token = Deno.env.get('DISCOGS_TOKEN');
    if (!token) {
      console.error('API key missing: Discogs');
      logError('discogs', 'API key missing: Discogs (DISCOGS_TOKEN)');
      return { exactMatch: null, candidates: [] };
    }

    try {
      const query = id.name;
      const url = `https://api.discogs.com/database/search?q=${encodeURIComponent(id.name)}&type=release&per_page=5`;
      logProviderQuery('discogs', id, query, url);
      const { ok, data } = await robustFetch('discogs', url, {
        headers: { 'Authorization': `Discogs token=${token}`, 'User-Agent': 'ColecScan/1.0' },
      });
      if (!ok || !data?.results?.length) {
        log('discogs', `No results for "${id.name}"`);
        return { exactMatch: null, candidates: [] };
      }

      const releases = data.results;
      log('discogs', `Found ${releases.length} results`);

      const normalized = releases.map((r: any): NormalizedItem => ({
        imageUrl: r.cover_image || r.thumb || '',
        source: 'Discogs',
        attribution: 'Data provided by Discogs (discogs.com). Images are © their respective owners.',
        sourceUrl: `https://www.discogs.com${r.uri || ''}`,
        externalId: String(r.id),
        setName: r.label?.[0] || '',
        number: r.catno || '',
        name: r.title || '',
      }));

      return {
        exactMatch: normalized.length === 1 ? normalized[0] : null,
        candidates: normalized.length > 1 ? normalized : [],
      };
    } catch (e) {
      logError('discogs', 'Unhandled error', e);
      return { exactMatch: null, candidates: [] };
    }
  }
};

// ─── Provider Registry ──────────────────────────────────────────────────────

const ALL_PROVIDERS: CollectibleProvider[] = [
  pokemonTCGProvider,
  yugiohProvider,
  mtgProvider,
  comicVineProvider,
  numistaProvider,
  toysProvider,
  stampsProvider,
  vinylProvider,
];

function getProvidersForCategory(category: string): CollectibleProvider[] {
  const normalized = normalizeCategory(category);
  return ALL_PROVIDERS.filter(p => p.categories.includes(normalized));
}

// ─── AI Identification ──────────────────────────────────────────────────────

async function identifyWithAI(base64Data: string, apiKey: string): Promise<Identification> {
  log('ai', 'Starting AI identification...');
  
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemini-flash-latest',
      messages: [
        {
          role: 'system',
          content: `You are a world-class collectible identification expert specializing in exact variant identification.

CRITICAL RULES:
- Identify the EXACT specific version/edition/print, not just the character or title.
- For trading cards: determine the TCG system (Pokémon, Yu-Gi-Oh!, Magic: The Gathering, etc.) and put it in subcategory.
- For Pokémon cards: identify the EXACT set, card number (e.g. "4/102"), variant (1st Edition, Unlimited, Shadowless, Reverse Holo, etc.), and provide the pokemontcg.io set ID in tcg_set_id.
  Common set ID mappings: "Base Set" → "base1", "Jungle" → "jungle", "Fossil" → "fossil", "Team Rocket" → "team-rocket", "Neo Genesis" → "neo-genesis", etc.
- For Yu-Gi-Oh! cards: identify the set code, rarity, edition (1st or Unlimited).
- For Magic cards: identify the set, collector number, foil status.
- For comics: identify the exact issue number, volume, variant cover, and publisher.
- For coins: identify the exact mint mark, year, denomination, and country.
- For toys/figures: identify manufacturer, line/series, year, variant, and scale.
- Read ALL visible text, numbers, symbols, and logos on the item.
- If you cannot determine the exact version with high confidence, set confidence below 0.7.

IMPORTANT: For the "category" field, you MUST use one of these exact values:
"Cartas", "Cómics", "Monedas", "Juguetes", "Figuras", "Sellos", "Vinilos", "Otro"`,
        },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
            { type: 'text', text: 'Identify this collectible with maximum precision. Determine the exact type, set, number, edition, and variant.' },
          ],
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'identify_collectible',
            description: 'Return exact identification data for a collectible item.',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Full name including set, e.g. "Charizard - Base Set 4/102 1st Edition"' },
                category: { type: 'string', enum: ['Cartas', 'Cómics', 'Monedas', 'Juguetes', 'Figuras', 'Sellos', 'Vinilos', 'Otro'] },
                subcategory: { type: 'string', description: 'Specific type within category. For cards: "Pokémon TCG", "Yu-Gi-Oh!", "Magic: The Gathering", etc. For toys: "Hot Wheels", "LEGO", "Funko Pop", etc.' },
                year: { type: 'number' },
                set_or_edition: { type: 'string', description: 'Exact set/edition name' },
                catalog_id: { type: 'string', description: 'Card/catalog number within the set, e.g. "4/102"' },
                tcg_set_id: { type: 'string', description: 'For Pokémon cards: pokemontcg.io set ID. For other TCGs leave empty.' },
                card_number: { type: 'string', description: 'Just the card number, e.g. "4" from "4/102"' },
                variant: { type: 'string', description: 'Specific variant: "1st Edition", "Unlimited", "Shadowless", "Reverse Holo", "Full Art", "Foil", etc.' },
                rarity: { type: 'string', enum: ['Común', 'Poco Común', 'Raro', 'Muy Raro', 'Ultra Raro'] },
                condition_estimate: { type: 'string' },
                special_features: { type: 'array', items: { type: 'string' } },
                description: { type: 'string' },
                estimated_value_usd: { type: 'number' },
                confidence: { type: 'number', description: '0-1. Set below 0.7 if unsure about exact version.' },
              },
              required: ['name', 'category', 'subcategory', 'year', 'set_or_edition', 'catalog_id', 'tcg_set_id', 'card_number', 'variant', 'rarity', 'condition_estimate', 'special_features', 'description', 'estimated_value_usd', 'confidence'],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: 'function', function: { name: 'identify_collectible' } },
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const text = await response.text();
    logError('ai', `AI gateway responded with HTTP ${status}`, text);
    if (status === 429) throw new Error('RATE_LIMIT');
    if (status === 402) throw new Error('CREDITS_EXHAUSTED');
    throw new Error(`AI gateway error: ${status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    logError('ai', 'No structured response from AI', JSON.stringify(data).substring(0, 500));
    throw new Error('No structured response from AI');
  }

  const parsed = JSON.parse(toolCall.function.arguments);
  parsed.category = normalizeCategory(parsed.category);
  
  log('ai', `✅ AI identification complete`, {
    name: parsed.name,
    category: parsed.category,
    subcategory: parsed.subcategory,
    confidence: parsed.confidence,
    tcg_set_id: parsed.tcg_set_id,
    card_number: parsed.card_number,
  });
  
  return parsed;
}

// ─── Middleware: Route to Providers ─────────────────────────────────────────

async function fetchOfficialData(identification: Identification, refinement?: CoinRefinement): Promise<ProviderResult> {
  const normalizedCategory = normalizeCategory(identification.category);
  const providers = ALL_PROVIDERS.filter(p => p.categories.includes(normalizedCategory));

  log('middleware', `═══════════════════════════════════════════════`);
  log('middleware', `Category: "${identification.category}" → normalized: "${normalizedCategory}"`);
  log('middleware', `Subcategory: "${identification.subcategory}"`);
  log('middleware', `Available providers: ${providers.length > 0 ? providers.map(p => p.name).join(', ') : 'NONE ⚠️'}`);

  if (providers.length === 0) {
    logError('middleware', `No providers registered for category "${normalizedCategory}". Available categories: ${[...new Set(ALL_PROVIDERS.flatMap(p => p.categories))].join(', ')}`);
    return { exactMatch: null, candidates: [] };
  }

  // Check which providers have their API keys
  for (const p of providers) {
    if (p.requiresApiKey) {
      const hasKey = !!Deno.env.get(p.requiresApiKey);
      if (!hasKey) {
        logError('middleware', `Provider "${p.name}" requires ${p.requiresApiKey} but it's NOT configured`);
      }
    }
  }

  let allCandidates: NormalizedItem[] = [];

  for (const provider of providers) {
    log('middleware', `──── Trying provider: ${provider.name} ────`);
    try {
      const result = await provider.fetchItem(identification, refinement);

      if (result.exactMatch) {
        if (result.exactMatch.imageUrl) {
          log('middleware', `✅ Exact match from ${provider.name}: "${result.exactMatch.name}" (id: ${result.exactMatch.externalId})`);
          return result;
        } else {
          log('middleware', `⚠️ Exact match from ${provider.name} has EMPTY imageUrl, treating as candidate`);
          allCandidates.push(result.exactMatch);
        }
      } else {
        log('middleware', `No exact match from ${provider.name}`);
      }

      const validCandidates = result.candidates.filter(c => c.imageUrl);
      const invalidCount = result.candidates.length - validCandidates.length;
      if (invalidCount > 0) {
        log('middleware', `⚠️ Filtered out ${invalidCount} candidates with empty imageUrl`);
      }
      if (validCandidates.length > 0) {
        log('middleware', `${validCandidates.length} valid candidates from ${provider.name}`);
      }
      allCandidates = [...allCandidates, ...validCandidates];
    } catch (e) {
      logError('middleware', `Error from provider ${provider.name}`, e);
    }
  }

  log('middleware', `═══ Final: exactMatch=null, candidates=${allCandidates.length} ═══`);
  return { exactMatch: null, candidates: allCandidates };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildFallbackImageUrl(category: string, name: string): string {
  const title = escapeXml(category || 'Coleccionable');
  const subtitle = escapeXml((name || 'Sin imagen oficial').substring(0, 44));
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
      <text x="50%" y="88%" text-anchor="middle" fill="#f59e0b" font-family="Arial, sans-serif" font-size="16">Fallback del sistema de diagnóstico</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createFallbackItem(identification: Identification): NormalizedItem {
  const normalizedCategory = normalizeCategory(identification.category);
  return {
    imageUrl: buildFallbackImageUrl(normalizedCategory, identification.name),
    source: 'Fallback',
    attribution: `Fallback generado para ${normalizedCategory} cuando ningún provider devolvió imagen válida.`,
    sourceUrl: '',
    externalId: `fallback:${removeAccents(identification.name || normalizedCategory).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    setName: identification.set_or_edition || normalizedCategory,
    number: identification.catalog_id || identification.card_number || '',
    name: identification.name || normalizedCategory,
  };
}

// ─── Response Builder ───────────────────────────────────────────────────────

function buildResponse(
  identification: Identification,
  exactMatch: NormalizedItem | null,
  candidates: NormalizedItem[],
) {
  const validCandidates = candidates.filter((candidate) => !!candidate.imageUrl);
  const primaryItem = (exactMatch && exactMatch.imageUrl ? exactMatch : validCandidates[0]) || createFallbackItem(identification);
  const needsConfirmation = (!exactMatch && validCandidates.length > 1) || (identification.confidence < 0.7 && validCandidates.length > 1);

  const officialImage = {
    imageUrl: primaryItem.imageUrl,
    source: primaryItem.source,
    attribution: primaryItem.attribution,
    sourceUrl: primaryItem.sourceUrl,
    cardId: primaryItem.externalId,
    setName: primaryItem.setName,
    number: primaryItem.number,
    name: primaryItem.name,
  };

  const candidatesLegacy = (needsConfirmation ? validCandidates : []).map(c => ({
    imageUrl: c.imageUrl,
    source: c.source,
    attribution: c.attribution,
    sourceUrl: c.sourceUrl,
    cardId: c.externalId,
    setName: c.setName,
    number: c.number,
    name: c.name,
  }));

  const response = {
    success: true,
    identification,
    officialImage,
    candidates: candidatesLegacy,
    needsConfirmation,
    provider: primaryItem.source || null,
    marketData: primaryItem.marketData || null,
    fallbackUsed: primaryItem.source === 'Fallback',
  };

  log('response', `Built response: officialImage=${!!officialImage}, candidates=${candidatesLegacy.length}, needsConfirmation=${needsConfirmation}, provider=${response.provider}, fallbackUsed=${response.fallbackUsed}`);
  return response;
}

// ─── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Credit accounting: refunded on any failure after consumption
  let creditUserId: string | null = null;
  let creditConsumed = false;

  try {
    log('main', '═══════════════════════════════════════════════');
    log('main', 'New request received');

    // verify_jwt only checks the token signature (the public anon key also
    // passes), so we additionally require a real authenticated user.
    const user = await getRequestUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'AUTH_REQUIRED' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    creditUserId = user.id;

    // Check all API keys on every request
    const keyStatus = checkApiKeys();
    const missingKeys = keyStatus.filter(k => !k.configured && k.required);
    if (missingKeys.length > 0) {
      log('main', `⚠️ ${missingKeys.length} API key(s) missing: ${missingKeys.map(k => k.envVar).join(', ')}. Some providers will be unavailable.`);
    }
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');

    const body = await req.json();
    const { imageBase64, coinRefinement, identification: existingId } = body;

    // ─── Mode 2: Coin refinement (no image needed) ─────────────────────
    if (coinRefinement && existingId) {
      log('main', `Mode: Coin refinement | country=${coinRefinement.country}, year=${coinRefinement.year}, denomination=${coinRefinement.denomination}`);

      const refined: Identification = { ...existingId };
      refined.category = normalizeCategory(refined.category);
      if (coinRefinement.year) refined.year = parseInt(coinRefinement.year);
      if (coinRefinement.denomination) refined.name = `${coinRefinement.denomination} ${coinRefinement.country || ''}`.trim();

      const { exactMatch, candidates } = await fetchOfficialData(refined, coinRefinement);
      const response = buildResponse(refined, exactMatch, candidates);

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Mode 1: Image identification ──────────────────────────────────
    if (!imageBase64) {
      logError('main', 'No imageBase64 provided');
      return new Response(JSON.stringify({ error: 'imageBase64 is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    log('main', `Mode: Image identification | imageBase64 length: ${imageBase64.length}`);
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    // Atomic server-side quota check + increment (see security_hardening migration)
    const { data: credit, error: creditError } = await getAdminClient()
      .rpc('consume_scan_credit', { p_user_id: user.id, p_free_limit: FREE_SCAN_LIMIT });
    if (creditError) throw new Error(`consume_scan_credit failed: ${creditError.message}`);
    if (!credit?.allowed) {
      log('main', `Scan denied for user ${user.id}: ${credit?.reason}`);
      return new Response(JSON.stringify({ error: credit?.reason ?? 'SCAN_LIMIT_REACHED', scansRemaining: 0 }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    creditConsumed = true;
    const scansRemaining: number | null = credit.scans_remaining ?? null;

    let identification: Identification;
    try {
      identification = await identifyWithAI(base64Data, GEMINI_API_KEY);
    } catch (e: any) {
      await refundScanCredit(user.id);
      creditConsumed = false;
      if (e.message === 'RATE_LIMIT') {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (e.message === 'CREDITS_EXHAUSTED') {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw e;
    }

    log('main', `AI Result → Name: "${identification.name}" | Category: "${identification.category}" | Subcategory: "${identification.subcategory}" | Confidence: ${identification.confidence}`);

    const { exactMatch, candidates } = await fetchOfficialData(identification);
    const response = buildResponse(identification, exactMatch, candidates);

    log('main', `✅ Request complete. Provider: ${response.provider || 'none'}, hasImage: ${!!response.officialImage}`);
    return new Response(JSON.stringify({ ...response, scansRemaining }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logError('main', 'Unhandled error', error);
    if (creditConsumed && creditUserId) await refundScanCredit(creditUserId);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
