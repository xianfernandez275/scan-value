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

async function searchPokemonTCG(name: string): Promise<ImageResult | null> {
  try {
    const query = encodeURIComponent(name.replace(/[^a-zA-Z0-9\s]/g, ''));
    const response = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=name:"${query}"&pageSize=1&select=id,name,images`,
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      console.error('Pokemon TCG API error:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.data && data.data.length > 0) {
      const card = data.data[0];
      return {
        imageUrl: card.images?.large || card.images?.small || '',
        source: 'Pokémon TCG API',
        attribution: 'Images provided by pokemontcg.io. Pokémon and its trademarks are © Nintendo/Creatures Inc./GAME FREAK inc.',
        sourceUrl: `https://pokemontcg.io/card/${card.id}`,
      };
    }
    return null;
  } catch (error) {
    console.error('Pokemon TCG search error:', error);
    return null;
  }
}

async function searchComicVine(name: string): Promise<ImageResult | null> {
  const apiKey = Deno.env.get('COMIC_VINE_API_KEY');
  if (!apiKey) {
    console.log('COMIC_VINE_API_KEY not configured, skipping Comic Vine search');
    return null;
  }

  try {
    const query = encodeURIComponent(name);
    const response = await fetch(
      `https://comicvine.gamespot.com/api/search/?api_key=${apiKey}&format=json&query=${query}&resources=issue&limit=1&field_list=id,name,image,site_detail_url`,
      {
        headers: { 'User-Agent': 'ColecScan/1.0' },
      }
    );

    if (!response.ok) {
      console.error('Comic Vine API error:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
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
  // Numista requires API key - return null if not configured
  const apiKey = Deno.env.get('NUMISTA_API_KEY');
  if (!apiKey) {
    console.log('NUMISTA_API_KEY not configured, skipping Numista search');
    return null;
  }

  try {
    const query = encodeURIComponent(name);
    const response = await fetch(
      `https://api.numista.com/api/v3/coins?q=${query}&count=1`,
      {
        headers: {
          'Numista-API-Key': apiKey,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Numista API error:', response.status);
      return null;
    }

    const data = await response.json();
    if (data.coins && data.coins.length > 0) {
      const coin = data.coins[0];
      const obverseUrl = coin.obverse?.picture || '';
      return {
        imageUrl: obverseUrl,
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

    // Route to appropriate API based on category
    const cat = (category || '').toLowerCase();

    if (cat.includes('carta') || cat.includes('card')) {
      result = await searchPokemonTCG(name);
    } else if (cat.includes('cómic') || cat.includes('comic')) {
      result = await searchComicVine(name);
    } else if (cat.includes('moneda') || cat.includes('coin')) {
      result = await searchNumista(name);
    }

    // Fallback: try all APIs
    if (!result) {
      result = await searchPokemonTCG(name);
    }
    if (!result) {
      result = await searchComicVine(name);
    }
    if (!result) {
      result = await searchNumista(name);
    }

    if (result) {
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: null, message: 'No licensed image found' }),
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
