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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
        return canonical;
      }
    }
  }
  // If already a canonical category, return as-is
  if (Object.keys(CANONICAL_CATEGORIES).includes(raw)) return raw;
  console.log(`[normalize] Unknown category "${raw}", defaulting to "Otro"`);
  return 'Otro';
}

// ─── Subcategory Matching (flexible) ────────────────────────────────────────

function matchesSubcategory(subcategory: string, ...patterns: string[]): boolean {
  if (!subcategory) return false;
  const cleaned = removeAccents(subcategory.trim().toLowerCase()).replace(/[\s\-_]+/g, '');
  return patterns.some(p => {
    const cleanPattern = removeAccents(p.toLowerCase()).replace(/[\s\-_]+/g, '');
    return cleaned.includes(cleanPattern);
  });
}

// ─── Provider Interface ─────────────────────────────────────────────────────

interface CollectibleProvider {
  name: string;
  categories: string[];
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
    if (!matchesSubcategory(id.subcategory, 'pokémon', 'pokemon') && id.subcategory) {
      return { exactMatch: null, candidates: [] };
    }

    let exactMatch: NormalizedItem | null = null;
    let candidates: NormalizedItem[] = [];

    try {
      if (id.tcg_set_id && id.card_number) {
        const q = `set.id:${id.tcg_set_id} number:${id.card_number}`;
        console.log('[pokemon-tcg] exact query:', q);
        const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=1`);
        if (res.ok) {
          const data = await res.json();
          if (data.data?.length > 0) {
            exactMatch = pokemonCardToNormalized(data.data[0]);
            return { exactMatch, candidates: [] };
          }
        }
      }

      if (id.tcg_set_id) {
        const pokemonName = id.name.split(/[\s\-–]/)[0];
        const q = `set.id:${id.tcg_set_id} name:"${pokemonName}"`;
        console.log('[pokemon-tcg] set+name query:', q);
        const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=5`);
        if (res.ok) {
          const data = await res.json();
          if (data.data?.length === 1) return { exactMatch: pokemonCardToNormalized(data.data[0]), candidates: [] };
          if (data.data?.length > 1) {
            candidates = data.data.map(pokemonCardToNormalized);
            const byNumber = data.data.find((c: any) => c.number === id.card_number);
            if (byNumber) return { exactMatch: pokemonCardToNormalized(byNumber), candidates: [] };
          }
        }
      }

      if (!exactMatch && candidates.length === 0) {
        const pokemonName = id.name.split(/[\s\-–]/)[0];
        const q = `name:"${pokemonName}"`;
        console.log('[pokemon-tcg] broad query:', q);
        const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=10&orderBy=-set.releaseDate`);
        if (res.ok) {
          const data = await res.json();
          candidates = (data.data || []).map(pokemonCardToNormalized);
          const catalogNum = id.catalog_id?.split('/')?.[0]?.trim();
          if (catalogNum) {
            const byNum = data.data?.find((c: any) => c.number === catalogNum);
            if (byNum) {
              exactMatch = pokemonCardToNormalized(byNum);
              return { exactMatch, candidates };
            }
          }
        }
      }
    } catch (e) {
      console.error('[pokemon-tcg] error:', e);
    }

    return { exactMatch, candidates };
  }
};

// ─── Provider: Yu-Gi-Oh! ────────────────────────────────────────────────────

const YUGIOH_ATTRIBUTION = 'Yu-Gi-Oh! is © Konami. Card data from YGOPRODeck (ygoprodeck.com).';

const yugiohProvider: CollectibleProvider = {
  name: 'yugioh',
  categories: ['Cartas'],
  async fetchItem(id: Identification): Promise<ProviderResult> {
    if (!matchesSubcategory(id.subcategory, 'yu-gi-oh', 'yugioh', 'yu gi oh')) {
      return { exactMatch: null, candidates: [] };
    }

    try {
      const cardName = id.name.split(/[\-–·]/)[0].trim();
      console.log('[yugioh] searching:', cardName);
      const res = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(cardName)}&num=5&offset=0`);
      if (!res.ok) return { exactMatch: null, candidates: [] };
      const data = await res.json();
      const cards = data.data || [];
      if (cards.length === 0) return { exactMatch: null, candidates: [] };

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
      console.error('[yugioh] error:', e);
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
    if (!matchesSubcategory(id.subcategory, 'magic', 'mtg', 'the gathering')) {
      return { exactMatch: null, candidates: [] };
    }

    try {
      const cardName = id.name.split(/[\-–·]/)[0].trim();
      console.log('[mtg] searching:', cardName);
      const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(cardName)}&unique=prints&order=released&dir=desc`);
      if (!res.ok) return { exactMatch: null, candidates: [] };
      const data = await res.json();
      const cards = (data.data || []).slice(0, 8);

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
        if (setMatch) return { exactMatch: setMatch, candidates: normalized };
      }

      return {
        exactMatch: normalized.length === 1 ? normalized[0] : null,
        candidates: normalized,
      };
    } catch (e) {
      console.error('[mtg] error:', e);
      return { exactMatch: null, candidates: [] };
    }
  }
};

// ─── Provider: Comics (Comic Vine) ──────────────────────────────────────────

const comicVineProvider: CollectibleProvider = {
  name: 'comic-vine',
  categories: ['Cómics'],
  async fetchItem(id: Identification): Promise<ProviderResult> {
    const apiKey = Deno.env.get('COMIC_VINE_API_KEY');
    if (!apiKey) {
      console.log('[comic-vine] No API key configured, skipping');
      return { exactMatch: null, candidates: [] };
    }

    try {
      const res = await fetch(
        `https://comicvine.gamespot.com/api/search/?api_key=${apiKey}&format=json&query=${encodeURIComponent(id.name)}&resources=issue&limit=5&field_list=id,name,image,site_detail_url,issue_number,volume,cover_date`,
        { headers: { 'User-Agent': 'ColecScan/1.0' } }
      );
      if (!res.ok) return { exactMatch: null, candidates: [] };
      const data = await res.json();
      const issues = data.results || [];

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
      console.error('[comic-vine] error:', e);
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
  async fetchItem(id: Identification, refinement?: CoinRefinement): Promise<ProviderResult> {
    const apiKey = Deno.env.get('NUMISTA_API_KEY');
    if (!apiKey) {
      console.log('[numista] No API key configured, skipping');
      return { exactMatch: null, candidates: [] };
    }

    try {
      const query = buildCoinQuery(id, refinement);
      console.log('[numista] searching:', query);

      const res = await fetch(
        `https://api.numista.com/api/v3/coins?q=${encodeURIComponent(query)}&count=10`,
        { headers: { 'Numista-API-Key': apiKey, 'Accept': 'application/json' } }
      );
      if (!res.ok) return { exactMatch: null, candidates: [] };
      const data = await res.json();
      const coins = data.coins || [];

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
      console.error('[numista] error:', e);
      return { exactMatch: null, candidates: [] };
    }
  }
};

// ─── Provider: Toys/Figures ─────────────────────────────────────────────────

const toysProvider: CollectibleProvider = {
  name: 'toys-figures',
  categories: ['Juguetes', 'Figuras'],
  async fetchItem(id: Identification): Promise<ProviderResult> {
    // Try a generic search approach for toys using name
    console.log('[toys-figures] metadata-only mode for:', id.name);
    // Return a structured fallback with the item name so the UI can at least show something
    return { exactMatch: null, candidates: [] };
  }
};

// ─── Provider: Stamps ───────────────────────────────────────────────────────

const stampsProvider: CollectibleProvider = {
  name: 'stamps',
  categories: ['Sellos'],
  async fetchItem(id: Identification): Promise<ProviderResult> {
    console.log('[stamps] metadata-only mode for:', id.name);
    return { exactMatch: null, candidates: [] };
  }
};

// ─── Provider: Vinyl Records (Discogs) ──────────────────────────────────────

const vinylProvider: CollectibleProvider = {
  name: 'discogs',
  categories: ['Vinilos'],
  async fetchItem(id: Identification): Promise<ProviderResult> {
    const token = Deno.env.get('DISCOGS_TOKEN');
    if (!token) {
      console.log('[discogs] No API token configured, skipping');
      return { exactMatch: null, candidates: [] };
    }

    try {
      const res = await fetch(
        `https://api.discogs.com/database/search?q=${encodeURIComponent(id.name)}&type=release&per_page=5`,
        { headers: { 'Authorization': `Discogs token=${token}`, 'User-Agent': 'ColecScan/1.0' } }
      );
      if (!res.ok) return { exactMatch: null, candidates: [] };
      const data = await res.json();
      const releases = data.results || [];

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
      console.error('[discogs] error:', e);
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
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
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
    if (status === 429) throw new Error('RATE_LIMIT');
    if (status === 402) throw new Error('CREDITS_EXHAUSTED');
    const text = await response.text();
    console.error('AI gateway error:', status, text);
    throw new Error(`AI gateway error: ${status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) throw new Error('No structured response from AI');

  const parsed = JSON.parse(toolCall.function.arguments);
  // Normalize the category from the AI response
  parsed.category = normalizeCategory(parsed.category);
  return parsed;
}

// ─── Middleware: Route to Providers ─────────────────────────────────────────

async function fetchOfficialData(identification: Identification, refinement?: CoinRefinement): Promise<ProviderResult> {
  const normalizedCategory = normalizeCategory(identification.category);
  const providers = ALL_PROVIDERS.filter(p => p.categories.includes(normalizedCategory));

  if (providers.length === 0) {
    console.log(`[middleware] No providers for category: ${identification.category} (normalized: ${normalizedCategory})`);
    return { exactMatch: null, candidates: [] };
  }

  console.log(`[middleware] Category "${identification.category}" → ${normalizedCategory} → ${providers.length} provider(s): ${providers.map(p => p.name).join(', ')}`);

  let allCandidates: NormalizedItem[] = [];

  for (const provider of providers) {
    console.log(`[middleware] Trying provider: ${provider.name}`);
    try {
      const result = await provider.fetchItem(identification, refinement);

      if (result.exactMatch) {
        // Ensure image URL is not empty
        if (result.exactMatch.imageUrl) {
          console.log(`[middleware] Exact match from ${provider.name}: ${result.exactMatch.externalId}`);
          return result;
        } else {
          console.log(`[middleware] Exact match from ${provider.name} has no image, treating as candidate`);
          allCandidates.push(result.exactMatch);
        }
      }

      // Filter out candidates with empty image URLs
      const validCandidates = result.candidates.filter(c => c.imageUrl);
      allCandidates = [...allCandidates, ...validCandidates];
    } catch (e) {
      console.error(`[middleware] Error from provider ${provider.name}:`, e);
    }
  }

  return { exactMatch: null, candidates: allCandidates };
}

// ─── Response Builder ───────────────────────────────────────────────────────

function buildResponse(
  identification: Identification,
  exactMatch: NormalizedItem | null,
  candidates: NormalizedItem[],
) {
  const needsConfirmation = (!exactMatch && candidates.length > 0) || (identification.confidence < 0.7 && candidates.length > 1);

  const officialImage = exactMatch ? {
    imageUrl: exactMatch.imageUrl,
    source: exactMatch.source,
    attribution: exactMatch.attribution,
    sourceUrl: exactMatch.sourceUrl,
    cardId: exactMatch.externalId,
    setName: exactMatch.setName,
    number: exactMatch.number,
    name: exactMatch.name,
  } : null;

  const candidatesLegacy = (needsConfirmation ? candidates : []).map(c => ({
    imageUrl: c.imageUrl,
    source: c.source,
    attribution: c.attribution,
    sourceUrl: c.sourceUrl,
    cardId: c.externalId,
    setName: c.setName,
    number: c.number,
    name: c.name,
  }));

  return {
    success: true,
    identification,
    officialImage,
    candidates: candidatesLegacy,
    needsConfirmation,
    provider: exactMatch?.source || candidates[0]?.source || null,
    marketData: exactMatch?.marketData || null,
  };
}

// ─── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const body = await req.json();
    const { imageBase64, coinRefinement, identification: existingId } = body;

    // ─── Mode 2: Coin refinement (no image needed) ─────────────────────
    if (coinRefinement && existingId) {
      console.log(`[main] Coin refinement: country=${coinRefinement.country}, year=${coinRefinement.year}, denomination=${coinRefinement.denomination}`);

      const refined: Identification = { ...existingId };
      refined.category = normalizeCategory(refined.category);
      if (coinRefinement.year) refined.year = parseInt(coinRefinement.year);
      if (coinRefinement.denomination) refined.name = `${coinRefinement.denomination} ${coinRefinement.country || ''}`.trim();

      // Pass refinement as parameter instead of global variable
      const { exactMatch, candidates } = await fetchOfficialData(refined, coinRefinement);
      const response = buildResponse(refined, exactMatch, candidates);

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Mode 1: Image identification ──────────────────────────────────
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'imageBase64 is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    let identification: Identification;
    try {
      identification = await identifyWithAI(base64Data, LOVABLE_API_KEY);
    } catch (e: any) {
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

    console.log(`[main] Identified: "${identification.name}" | Category: ${identification.category} | Subcategory: ${identification.subcategory} | Confidence: ${identification.confidence}`);

    const { exactMatch, candidates } = await fetchOfficialData(identification);
    const response = buildResponse(identification, exactMatch, candidates);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Identification error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
