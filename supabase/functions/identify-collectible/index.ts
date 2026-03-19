const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'imageBase64 is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a collectible identification expert. Analyze the image and identify the exact collectible item. You MUST respond using the provided tool.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Data}` },
              },
              {
                type: 'text',
                text: 'Identify this collectible item. Provide the exact name, category, year, set/edition, rarity, condition estimate, and any unique identifiers (set number, catalog ID, etc). Be as specific as possible about the exact variant/edition.',
              },
            ],
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'identify_collectible',
              description: 'Return structured identification data for a collectible item.',
              parameters: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Full exact name of the item, e.g. "Charizard Base Set 4/102"' },
                  category: { type: 'string', enum: ['Cartas', 'Cómics', 'Monedas', 'Juguetes', 'Sellos', 'Vinilos', 'Otro'] },
                  year: { type: 'number', description: 'Year of release/mint' },
                  set_or_edition: { type: 'string', description: 'Set name or edition, e.g. "Base Set 1st Edition"' },
                  catalog_id: { type: 'string', description: 'Catalog/set number, e.g. "4/102" for Pokémon or issue number for comics' },
                  rarity: { type: 'string', enum: ['Común', 'Poco Común', 'Raro', 'Muy Raro', 'Ultra Raro'] },
                  condition_estimate: { type: 'string', description: 'Estimated condition, e.g. "NM 8.5" or "VF 7.0"' },
                  special_features: { type: 'array', items: { type: 'string' }, description: 'Notable features like "Holographic", "1st Edition", "Shadowless"' },
                  description: { type: 'string', description: 'Brief description of the item and its significance' },
                  estimated_value_usd: { type: 'number', description: 'Estimated market value in USD' },
                  confidence: { type: 'number', description: 'Confidence of identification from 0 to 1' },
                  search_query: { type: 'string', description: 'Best query to search for the official image of this exact item' },
                },
                required: ['name', 'category', 'year', 'set_or_edition', 'catalog_id', 'rarity', 'condition_estimate', 'special_features', 'description', 'estimated_value_usd', 'confidence', 'search_query'],
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
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await response.text();
      console.error('AI gateway error:', status, text);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('No structured response from AI');
    }

    const identification = JSON.parse(toolCall.function.arguments);
    console.log('Identified:', identification.name, 'confidence:', identification.confidence);

    // Now fetch the official image based on category
    let officialImage = null;

    if (identification.category === 'Cartas') {
      officialImage = await fetchPokemonTCGImage(identification);
    } else if (identification.category === 'Cómics') {
      officialImage = await fetchComicImage(identification);
    } else if (identification.category === 'Monedas') {
      officialImage = await fetchCoinImage(identification);
    }

    return new Response(JSON.stringify({
      success: true,
      identification,
      officialImage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Identification error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function fetchPokemonTCGImage(id: { name: string; catalog_id: string; search_query: string }) {
  try {
    // pokemontcg.io is free, no API key needed for basic use
    // Try by set number first (most precise)
    const catalogId = id.catalog_id?.replace(/\s/g, '');
    let url = `https://api.pokemontcg.io/v2/cards?q=number:${encodeURIComponent(catalogId)}&pageSize=5`;
    
    let res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.data?.length > 0) {
        // Try to find the best match by name
        const nameWords = id.name.toLowerCase().split(/\s+/);
        const match = data.data.find((card: any) =>
          nameWords.some((w: string) => card.name.toLowerCase().includes(w))
        ) || data.data[0];

        return {
          imageUrl: match.images?.large || match.images?.small,
          source: 'Pokémon TCG API',
          attribution: 'Pokémon and its trademarks are ©1995-2026 Nintendo, Creatures, and GAME FREAK. Card images from pokemontcg.io.',
          sourceUrl: `https://pokemontcg.io/card/${match.id}`,
          cardId: match.id,
          setName: match.set?.name,
        };
      }
    }

    // Fallback: search by name
    const nameQuery = id.search_query || id.name;
    url = `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(nameQuery.split(' ')[0])}"&pageSize=10&orderBy=-set.releaseDate`;
    res = await fetch(url, { headers: { 'Accept': 'application/json' } });

    if (res.ok) {
      const data = await res.json();
      if (data.data?.length > 0) {
        const card = data.data[0];
        return {
          imageUrl: card.images?.large || card.images?.small,
          source: 'Pokémon TCG API',
          attribution: 'Pokémon and its trademarks are ©1995-2026 Nintendo, Creatures, and GAME FREAK. Card images from pokemontcg.io.',
          sourceUrl: `https://pokemontcg.io/card/${card.id}`,
          cardId: card.id,
          setName: card.set?.name,
        };
      }
    }

    return null;
  } catch (e) {
    console.error('Pokemon TCG API error:', e);
    return null;
  }
}

async function fetchComicImage(id: { name: string; catalog_id: string }) {
  const apiKey = Deno.env.get('COMIC_VINE_API_KEY');
  if (!apiKey) return null;

  try {
    const query = encodeURIComponent(id.name);
    const res = await fetch(
      `https://comicvine.gamespot.com/api/search/?api_key=${apiKey}&format=json&query=${query}&resources=issue&limit=1&field_list=id,name,image,site_detail_url`,
      { headers: { 'User-Agent': 'ColecScan/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results?.[0]) {
      const issue = data.results[0];
      return {
        imageUrl: issue.image?.medium_url || issue.image?.small_url,
        source: 'Comic Vine',
        attribution: 'Data provided by Comic Vine (comicvine.gamespot.com)',
        sourceUrl: issue.site_detail_url || 'https://comicvine.gamespot.com',
      };
    }
    return null;
  } catch (e) {
    console.error('Comic Vine error:', e);
    return null;
  }
}

async function fetchCoinImage(id: { name: string }) {
  const apiKey = Deno.env.get('NUMISTA_API_KEY');
  if (!apiKey) return null;

  try {
    const query = encodeURIComponent(id.name);
    const res = await fetch(
      `https://api.numista.com/api/v3/coins?q=${query}&count=1`,
      { headers: { 'Numista-API-Key': apiKey, 'Accept': 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
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
  } catch (e) {
    console.error('Numista error:', e);
    return null;
  }
}
