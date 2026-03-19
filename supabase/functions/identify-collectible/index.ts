const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CardCandidate {
  imageUrl: string;
  source: string;
  attribution: string;
  sourceUrl: string;
  cardId: string;
  setName: string;
  number: string;
  name: string;
}

const POKEMON_ATTRIBUTION = 'Pokémon and its trademarks are ©1995-2026 Nintendo, Creatures, and GAME FREAK. Card images from pokemontcg.io.';

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
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    // Step 1: AI identification with emphasis on exact IDs
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
            content: `You are a world-class collectible identification expert specializing in exact variant identification.

CRITICAL RULES:
- You must identify the EXACT specific version/edition/print of the item, not just the character or title.
- For Pokémon cards: identify the EXACT set (e.g. "Base Set", "Jungle", "Fossil", "Team Rocket", "Gym Heroes", "Neo Genesis", "Expedition", "EX Ruby & Sapphire", "Diamond & Pearl", "Black & White", "XY", "Sun & Moon", "Sword & Shield", "Scarlet & Violet"), the exact card number (e.g. "4/102"), and variant (1st Edition, Unlimited, Shadowless, Reverse Holo, etc.)
- For Pokémon cards, provide the pokemontcg.io set ID in the tcg_set_id field. Common mappings: "Base Set" → "base1", "Jungle" → "jungle", "Fossil" → "fossil", "Base Set 2" → "base2", "Team Rocket" → "team-rocket", "Gym Heroes" → "gym1", "Gym Challenge" → "gym2", "Neo Genesis" → "neo-genesis", "Neo Discovery" → "neo-discovery", "Legendary Collection" → "legendary-collection", "Expedition" → "expedition", "Aquapolis" → "aquapolis", "Skyridge" → "skyridge", etc. For modern sets use kebab-case of the set name.
- For comics: identify the exact issue number, volume, variant cover, and publisher.
- For coins: identify the exact mint mark, year, denomination, and country.
- Read ALL visible text, numbers, symbols, and set logos on the item.
- Look at the card border style, holo pattern, edition stamp, set symbol to determine the exact print.
- If you cannot determine the exact version with high confidence, set confidence below 0.7 and provide your best guesses.`,
          },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } },
              { type: 'text', text: 'Identify this collectible with maximum precision. Read every visible number, symbol, and text. Determine the EXACT set, card number, edition, and variant.' },
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
                  category: { type: 'string', enum: ['Cartas', 'Cómics', 'Monedas', 'Juguetes', 'Sellos', 'Vinilos', 'Otro'] },
                  year: { type: 'number' },
                  set_or_edition: { type: 'string', description: 'Exact set/edition name, e.g. "Base Set 1st Edition Shadowless"' },
                  catalog_id: { type: 'string', description: 'Card/catalog number within the set, e.g. "4/102"' },
                  tcg_set_id: { type: 'string', description: 'For Pokémon cards: the pokemontcg.io set ID, e.g. "base1", "jungle", "neo-genesis", "swsh1". For other categories leave empty.' },
                  card_number: { type: 'string', description: 'Just the card number without total, e.g. "4" from "4/102"' },
                  variant: { type: 'string', description: 'Specific variant: "1st Edition", "Unlimited", "Shadowless", "Reverse Holo", "Full Art", etc.' },
                  rarity: { type: 'string', enum: ['Común', 'Poco Común', 'Raro', 'Muy Raro', 'Ultra Raro'] },
                  condition_estimate: { type: 'string' },
                  special_features: { type: 'array', items: { type: 'string' } },
                  description: { type: 'string' },
                  estimated_value_usd: { type: 'number' },
                  confidence: { type: 'number', description: '0-1. Set below 0.7 if unsure about exact version.' },
                },
                required: ['name', 'category', 'year', 'set_or_edition', 'catalog_id', 'tcg_set_id', 'card_number', 'variant', 'rarity', 'condition_estimate', 'special_features', 'description', 'estimated_value_usd', 'confidence'],
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
    if (!toolCall?.function?.arguments) throw new Error('No structured response from AI');

    const identification = JSON.parse(toolCall.function.arguments);
    console.log('Identified:', identification.name, 'set:', identification.tcg_set_id, 'number:', identification.card_number, 'confidence:', identification.confidence);

    // Step 2: Fetch official image using exact ID
    let officialImage: CardCandidate | null = null;
    let candidates: CardCandidate[] = [];

    if (identification.category === 'Cartas') {
      const result = await fetchExactPokemonCard(identification);
      officialImage = result.exactMatch;
      candidates = result.candidates;
    } else if (identification.category === 'Cómics') {
      officialImage = await fetchComicImage(identification);
    } else if (identification.category === 'Monedas') {
      officialImage = await fetchCoinImage(identification);
    }

    // If low confidence or no exact match but we have candidates, let client pick
    const needsConfirmation = !officialImage && candidates.length > 0 || (identification.confidence < 0.7 && candidates.length > 1);

    return new Response(JSON.stringify({
      success: true,
      identification,
      officialImage,
      candidates: needsConfirmation ? candidates : [],
      needsConfirmation,
    }), {
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

function cardToCandidate(card: any): CardCandidate {
  return {
    imageUrl: card.images?.large || card.images?.small || '',
    source: 'Pokémon TCG API',
    attribution: POKEMON_ATTRIBUTION,
    sourceUrl: `https://pokemontcg.io/card/${card.id}`,
    cardId: card.id,
    setName: card.set?.name || '',
    number: card.number || '',
    name: card.name || '',
  };
}

async function fetchExactPokemonCard(id: { tcg_set_id: string; card_number: string; name: string; catalog_id: string }) {
  let exactMatch: CardCandidate | null = null;
  let candidates: CardCandidate[] = [];

  try {
    // Strategy 1: Exact set ID + card number (most precise)
    if (id.tcg_set_id && id.card_number) {
      const q = `set.id:${id.tcg_set_id} number:${id.card_number}`;
      console.log('TCG API exact query:', q);
      const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.data?.length > 0) {
          exactMatch = cardToCandidate(data.data[0]);
          console.log('Exact match found:', exactMatch.cardId);
          return { exactMatch, candidates: [] };
        }
      }
    }

    // Strategy 2: Search by set ID + name (handles wrong card number)
    if (id.tcg_set_id) {
      const pokemonName = id.name.split(/[\s\-–]/)[0];
      const q = `set.id:${id.tcg_set_id} name:"${pokemonName}"`;
      console.log('TCG API set+name query:', q);
      const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=5`);
      if (res.ok) {
        const data = await res.json();
        if (data.data?.length === 1) {
          exactMatch = cardToCandidate(data.data[0]);
          return { exactMatch, candidates: [] };
        }
        if (data.data?.length > 1) {
          candidates = data.data.map(cardToCandidate);
          // Try to narrow by number
          const byNumber = data.data.find((c: any) => c.number === id.card_number);
          if (byNumber) {
            exactMatch = cardToCandidate(byNumber);
            return { exactMatch, candidates: [] };
          }
        }
      }
    }

    // Strategy 3: Search by name across all sets (broadest, returns candidates)
    if (!exactMatch && candidates.length === 0) {
      const pokemonName = id.name.split(/[\s\-–]/)[0];
      const q = `name:"${pokemonName}"`;
      console.log('TCG API name-only query:', q);
      const res = await fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=10&orderBy=-set.releaseDate`);
      if (res.ok) {
        const data = await res.json();
        candidates = (data.data || []).map(cardToCandidate);
        // Try matching by catalog_id
        const catalogNum = id.catalog_id?.split('/')?.[0]?.trim();
        if (catalogNum) {
          const byNum = data.data?.find((c: any) => c.number === catalogNum);
          if (byNum) {
            exactMatch = cardToCandidate(byNum);
            return { exactMatch, candidates };
          }
        }
      }
    }
  } catch (e) {
    console.error('Pokemon TCG API error:', e);
  }

  return { exactMatch, candidates };
}

async function fetchComicImage(id: { name: string; catalog_id: string }): Promise<CardCandidate | null> {
  const apiKey = Deno.env.get('COMIC_VINE_API_KEY');
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://comicvine.gamespot.com/api/search/?api_key=${apiKey}&format=json&query=${encodeURIComponent(id.name)}&resources=issue&limit=1&field_list=id,name,image,site_detail_url`,
      { headers: { 'User-Agent': 'ColecScan/1.0' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const issue = data.results?.[0];
    if (!issue) return null;
    return {
      imageUrl: issue.image?.medium_url || issue.image?.small_url || '',
      source: 'Comic Vine', attribution: 'Data provided by Comic Vine (comicvine.gamespot.com)',
      sourceUrl: issue.site_detail_url || '', cardId: String(issue.id), setName: '', number: '', name: issue.name || '',
    };
  } catch { return null; }
}

async function fetchCoinImage(id: { name: string }): Promise<CardCandidate | null> {
  const apiKey = Deno.env.get('NUMISTA_API_KEY');
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://api.numista.com/api/v3/coins?q=${encodeURIComponent(id.name)}&count=1`,
      { headers: { 'Numista-API-Key': apiKey, 'Accept': 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const coin = data.coins?.[0];
    if (!coin) return null;
    return {
      imageUrl: coin.obverse?.picture || '', source: 'Numista',
      attribution: 'Data provided by Numista (en.numista.com)',
      sourceUrl: `https://en.numista.com/catalogue/pieces${coin.id}.html`,
      cardId: String(coin.id), setName: '', number: '', name: coin.title || '',
    };
  } catch { return null; }
}
