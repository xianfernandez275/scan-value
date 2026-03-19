// v2 - Using PokéAPI for reliable Pokémon images
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// Extract a Pokémon name from a collectible card name
function extractPokemonName(name: string): string | null {
  const lower = name.toLowerCase();
  // Common Pokémon names that appear in card names
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

  // Fallback: first word
  const firstWord = name.replace(/[^a-zA-Z]/g, ' ').trim().split(/\s+/)[0]?.toLowerCase();
  return firstWord || null;
}

async function searchPokemonImage(name: string): Promise<ImageResult | null> {
  const pokemonName = extractPokemonName(name);
  if (!pokemonName) return null;

  try {
    const response = await fetchWithTimeout(
      `https://pokeapi.co/api/v2/pokemon/${pokemonName}`
    );

    if (!response.ok) {
      console.log(`PokéAPI: no result for "${pokemonName}"`);
      return null;
    }

    const data = await response.json();
    const artwork = data.sprites?.other?.['official-artwork']?.front_default;
    const fallback = data.sprites?.front_default;
    const imageUrl = artwork || fallback;

    if (!imageUrl) return null;

    return {
      imageUrl,
      source: 'PokéAPI',
      attribution: 'Pokémon images © Nintendo/Creatures Inc./GAME FREAK inc. Data from PokéAPI (pokeapi.co)',
      sourceUrl: `https://pokeapi.co/api/v2/pokemon/${pokemonName}`,
    };
  } catch (error) {
    console.error('PokéAPI search error:', error);
    return null;
  }
}

async function searchComicVine(name: string): Promise<ImageResult | null> {
  const apiKey = Deno.env.get('COMIC_VINE_API_KEY');
  if (!apiKey) {
    console.log('COMIC_VINE_API_KEY not configured');
    return null;
  }

  try {
    const query = encodeURIComponent(name);
    const response = await fetchWithTimeout(
      `https://comicvine.gamespot.com/api/search/?api_key=${apiKey}&format=json&query=${query}&resources=issue&limit=1&field_list=id,name,image,site_detail_url`,
      { headers: { 'User-Agent': 'ColecScan/1.0' } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.results?.[0]) {
      const issue = data.results[0];
      return {
        imageUrl: issue.image?.medium_url || issue.image?.small_url || '',
        source: 'Comic Vine',
        attribution: 'Data provided by Comic Vine (comicvine.gamespot.com)',
        sourceUrl: issue.site_detail_url || 'https://comicvine.gamespot.com',
      };
    }
    return null;
  } catch (error) {
    console.error('Comic Vine search error:', error);
    return null;
  }
}

async function searchNumista(name: string): Promise<ImageResult | null> {
  const apiKey = Deno.env.get('NUMISTA_API_KEY');
  if (!apiKey) {
    console.log('NUMISTA_API_KEY not configured');
    return null;
  }

  try {
    const query = encodeURIComponent(name);
    const response = await fetchWithTimeout(
      `https://api.numista.com/api/v3/coins?q=${query}&count=1`,
      { headers: { 'Numista-API-Key': apiKey, 'Accept': 'application/json' } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.coins?.[0]) {
      const coin = data.coins[0];
      return {
        imageUrl: coin.obverse?.picture || '',
        source: 'Numista',
        attribution: 'Data provided by Numista (en.numista.com)',
        sourceUrl: `https://en.numista.com/catalogue/pieces${coin.id}.html`,
      };
    }
    return null;
  } catch (error) {
    console.error('Numista search error:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, category }: SearchRequest = await req.json();

    if (!name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching image for: "${name}" in category: "${category}"`);

    let result: ImageResult | null = null;
    const cat = (category || '').toLowerCase();

    if (cat.includes('carta') || cat.includes('card')) {
      result = await searchPokemonImage(name);
    } else if (cat.includes('cómic') || cat.includes('comic')) {
      result = await searchComicVine(name);
    } else if (cat.includes('moneda') || cat.includes('coin')) {
      result = await searchNumista(name);
    }

    // Fallback for unknown categories
    if (!result) {
      result = await searchPokemonImage(name);
    }

    console.log(`Result for "${name}": ${result ? 'found' : 'not found'}`);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error searching collectible image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
