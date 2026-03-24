/**
 * API Health Check — Tests all collectible data providers
 * Returns a diagnostic report of API connectivity and key status.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ProviderTest {
  name: string;
  apiKeyRequired: boolean;
  apiKeyConfigured: boolean;
  envVar: string;
  testUrl: string;
  status: 'ok' | 'error' | 'skipped' | 'timeout';
  statusCode: number;
  responseTime: number;
  hasData: boolean;
  error?: string;
  sampleData?: string;
}

async function testProvider(
  name: string,
  url: string,
  options: RequestInit = {},
  envVar: string,
  requiresKey: boolean,
): Promise<ProviderTest> {
  const apiKeyConfigured = !requiresKey || !!Deno.env.get(envVar);
  const result: ProviderTest = {
    name,
    apiKeyRequired: requiresKey,
    apiKeyConfigured,
    envVar,
    testUrl: url.substring(0, 120),
    status: 'skipped',
    statusCode: 0,
    responseTime: 0,
    hasData: false,
  };

  if (requiresKey && !apiKeyConfigured) {
    result.error = `🔑 API key missing: ${envVar}`;
    console.error(`[health] ${name}: ${result.error}`);
    return result;
  }

  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    result.responseTime = Date.now() - start;
    result.statusCode = res.status;

    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { data = text; }

    if (res.ok) {
      result.status = 'ok';
      result.hasData = !!data && (typeof data !== 'object' || Object.keys(data).length > 0);
      result.sampleData = JSON.stringify(data).substring(0, 200);
    } else {
      result.status = 'error';
      result.error = `HTTP ${res.status}: ${typeof data === 'string' ? data.substring(0, 150) : JSON.stringify(data).substring(0, 150)}`;
    }
  } catch (e: any) {
    clearTimeout(timeout);
    result.responseTime = Date.now() - start;
    if (e.name === 'AbortError') {
      result.status = 'timeout';
      result.error = `Timeout after 8000ms`;
    } else {
      result.status = 'error';
      result.error = e.message;
    }
  }

  const emoji = result.status === 'ok' ? '✅' : result.status === 'skipped' ? '⏭️' : '❌';
  console.log(`[health] ${emoji} ${name}: ${result.status} (${result.responseTime}ms) ${result.error || ''}`);
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[health] ═══ Starting API Health Check ═══');

  const tests: ProviderTest[] = await Promise.all([
    // Free APIs (no key needed)
    testProvider(
      'Pokémon TCG API',
      'https://api.pokemontcg.io/v2/cards?q=name:charizard&pageSize=1',
      {},
      '(none)',
      false,
    ),
    testProvider(
      'YGOPRODeck',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=dark%20magician&num=1&offset=0',
      {},
      '(none)',
      false,
    ),
    testProvider(
      'Scryfall (MTG)',
      'https://api.scryfall.com/cards/search?q=lightning+bolt&unique=prints&order=released&dir=desc',
      {},
      '(none)',
      false,
    ),
    testProvider(
      'PokéAPI',
      'https://pokeapi.co/api/v2/pokemon/pikachu',
      {},
      '(none)',
      false,
    ),
    // APIs requiring keys
    testProvider(
      'Comic Vine',
      Deno.env.get('COMIC_VINE_API_KEY')
        ? `https://comicvine.gamespot.com/api/search/?api_key=${Deno.env.get('COMIC_VINE_API_KEY')}&format=json&query=batman&resources=issue&limit=1&field_list=id,name`
        : 'https://comicvine.gamespot.com/api/search/',
      { headers: { 'User-Agent': 'ColecScan/1.0' } },
      'COMIC_VINE_API_KEY',
      true,
    ),
    testProvider(
      'Numista',
      `https://api.numista.com/api/v3/coins?q=euro&count=1`,
      Deno.env.get('NUMISTA_API_KEY')
        ? { headers: { 'Numista-API-Key': Deno.env.get('NUMISTA_API_KEY')!, 'Accept': 'application/json' } }
        : {},
      'NUMISTA_API_KEY',
      true,
    ),
    testProvider(
      'Discogs',
      `https://api.discogs.com/database/search?q=beatles&type=release&per_page=1`,
      Deno.env.get('DISCOGS_TOKEN')
        ? { headers: { 'Authorization': `Discogs token=${Deno.env.get('DISCOGS_TOKEN')}`, 'User-Agent': 'ColecScan/1.0' } }
        : { headers: { 'User-Agent': 'ColecScan/1.0' } },
      'DISCOGS_TOKEN',
      true,
    ),
    // AI Gateway
    testProvider(
      'Lovable AI Gateway',
      'https://ai.gateway.lovable.dev/v1/models',
      { headers: { 'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY') || ''}` } },
      'LOVABLE_API_KEY',
      true,
    ),
  ]);

  const summary = {
    timestamp: new Date().toISOString(),
    total: tests.length,
    ok: tests.filter(t => t.status === 'ok').length,
    errors: tests.filter(t => t.status === 'error').length,
    skipped: tests.filter(t => t.status === 'skipped').length,
    timeouts: tests.filter(t => t.status === 'timeout').length,
    missingKeys: tests.filter(t => !t.apiKeyConfigured).map(t => t.envVar),
  };

  console.log(`[health] ═══ Summary: ${summary.ok}/${summary.total} OK | ${summary.errors} errors | ${summary.skipped} skipped | Missing keys: ${summary.missingKeys.join(', ') || 'none'} ═══`);

  return new Response(
    JSON.stringify({ summary, providers: tests }, null, 2),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
