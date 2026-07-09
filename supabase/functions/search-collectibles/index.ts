const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, filters, mode, historyContext } = await req.json();

    if (!query && mode !== "full" && mode !== "recommendations") {
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build filter context
    const filterContext: string[] = [];
    if (filters?.category) filterContext.push(`Categoría: ${filters.category}`);
    if (filters?.priceMin || filters?.priceMax) filterContext.push(`Precio: $${filters.priceMin || 0} - $${filters.priceMax || '∞'}`);
    if (filters?.yearMin || filters?.yearMax) filterContext.push(`Año: ${filters.yearMin || '1800'} - ${filters.yearMax || '2025'}`);
    if (filters?.rarity) filterContext.push(`Rareza: ${filters.rarity}`);
    if (filters?.condition) filterContext.push(`Estado/gradeo: ${filters.condition}`);
    if (filters?.trend) filterContext.push(`Tendencia: ${filters.trend}`);
    const filterStr = filterContext.length > 0 ? `\nFiltros activos:\n${filterContext.join('\n')}` : '';

    // ═══════════════════════════════════════════════════
    // MODE: RECOMMENDATIONS
    // ═══════════════════════════════════════════════════
    if (mode === "recommendations") {
      const ctx = historyContext || {};
      const recentSearches: string[] = ctx.recentSearches || [];
      const recentViewed: { name: string; category: string; rarity?: string }[] = ctx.recentViewed || [];
      const frequentCategories: string[] = ctx.frequentCategories || [];

      const hasHistory = recentSearches.length > 0 || recentViewed.length > 0;

      const historyBlock = hasHistory
        ? `
Historial del usuario:
- Búsquedas recientes: ${recentSearches.slice(0, 8).join(", ") || "ninguna"}
- Artículos vistos: ${recentViewed.slice(0, 8).map(v => `${v.name} (${v.category})`).join(", ") || "ninguno"}
- Categorías favoritas: ${frequentCategories.join(", ") || "ninguna"}`
        : "";

      const prompt = hasHistory
        ? `Basándote en el historial del usuario, genera 8 recomendaciones personalizadas de coleccionables.
${historyBlock}

Combina artículos similares a los que ha buscado/visto con artículos populares del mercado actual.
Prioriza: artículos relacionados con sus búsquedas > artículos trending en sus categorías favoritas > artículos populares generales.`
        : `Genera 8 recomendaciones de coleccionables populares y trending del mercado actual 2024-2025.
Incluye una mezcla de cartas, cómics, monedas y juguetes con precios realistas.`;

      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `Eres un experto en coleccionables que recomienda artículos basándose en el historial del usuario.
Responde SOLO con JSON válido, sin markdown.
Formato:
{
  "recommendations": [
    {
      "id": "rec-unique-id",
      "name": "Nombre completo",
      "category": "Cómics|Cartas|Monedas|Juguetes|Sellos|Vinilos",
      "currentPrice": 15000,
      "rarity": "Común|Poco Común|Raro|Muy Raro|Ultra Raro",
      "year": 1999,
      "series": "Serie/colección",
      "change": 12.5,
      "reason": "Motivo breve de la recomendación (ej: 'Similar a tus búsquedas de Pokémon')",
      "trending": true
    }
  ],
  "contextLabel": "Basado en tus búsquedas" 
}
Precios en USD realistas. Artículos reales y reconocidos. 
"contextLabel" debe reflejar si las recomendaciones son personalizadas o generales.`
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Créditos agotados" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ recommendations: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content || "{}";
      try {
        const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const parsed = JSON.parse(cleaned);
        return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch {
        return new Response(JSON.stringify({ recommendations: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ═══════════════════════════════════════════════════
    // MODE: AUTOCOMPLETE
    // ═══════════════════════════════════════════════════
    if (mode === "autocomplete") {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `Eres un buscador experto de coleccionables. Devuelve sugerencias de autocompletado en JSON.
Responde SOLO con JSON válido, sin markdown ni texto adicional.
Formato:
{"suggestions": [{"name": "Nombre completo", "category": "Cómics", "series": "Serie/colección", "price": 15000, "year": 1999, "rarity": "Ultra Raro", "id": "unique-id"}]}
Máximo 8 sugerencias. Categorías: Cómics, Cartas, Monedas, Juguetes, Sellos, Vinilos.
Reglas:
- Sé tolerante a errores tipográficos (ej: "charizrd" → "Charizard")
- Ordena por: coincidencia exacta primero, luego popularidad/demanda
- Incluye artículos reales y reconocidos del mercado de coleccionables
- Precios en USD realistas
- rarity: Común, Poco Común, Raro, Muy Raro, Ultra Raro`,
            },
            {
              role: "user",
              content: `Autocompletado para: "${query}"${filterStr}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Créditos agotados" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const aiData = await response.json();
      const content = aiData.choices?.[0]?.message?.content || "{}";
      try {
        const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const parsed = JSON.parse(cleaned);
        return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch {
        return new Response(JSON.stringify({ suggestions: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ═══════════════════════════════════════════════════
    // MODE: FULL SEARCH
    // ═══════════════════════════════════════════════════
    const sortBy = filters?.sortBy || "relevance";
    const sortLabel: Record<string, string> = {
      relevance: "relevancia",
      price_desc: "precio mayor a menor",
      price_asc: "precio menor a mayor",
      popularity: "popularidad/demanda",
      trend: "tendencia de precio (mayor subida primero)",
      year_desc: "año más reciente primero",
      year_asc: "año más antiguo primero",
    };

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Eres un experto tasador de coleccionables con conocimiento actualizado del mercado 2024-2025.
Responde SOLO con JSON válido, sin markdown ni texto adicional.
Usa precios realistas basados en ventas reales (eBay, Heritage Auctions, etc).`,
          },
          {
            role: "user",
            content: `Busca coleccionables que coincidan con: "${query}"
${filterStr}
Ordenar por: ${sortLabel[sortBy] || "relevancia"}

Devuelve hasta 20 resultados en este formato JSON:
{
  "results": [
    {
      "id": "unique-id",
      "name": "Nombre completo",
      "category": "Cómics|Cartas|Monedas|Juguetes|Sellos|Vinilos",
      "currentPrice": 15000,
      "previousPrice": 13500,
      "change": 11.1,
      "rarity": "Común|Poco Común|Raro|Muy Raro|Ultra Raro",
      "condition": "PSA 9",
      "year": 1999,
      "description": "Descripción breve",
      "demand": "Baja|Media|Alta|Muy Alta",
      "series": "Nombre de la serie/colección",
      "historicalPrices": [
        {"date": "2024-01", "price": 12000},
        {"date": "2024-04", "price": 13000},
        {"date": "2024-07", "price": 13500},
        {"date": "2024-10", "price": 14200},
        {"date": "2025-01", "price": 15000}
      ]
    }
  ],
  "totalEstimated": 150,
  "searchContext": "Breve descripción de los resultados encontrados"
}

Reglas:
- Los artículos deben ser reales y reconocidos
- change puede ser positivo o negativo
- Precios en USD
- Respeta todos los filtros activos
- Ordena según se indica`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) return new Response(JSON.stringify({ error: "Demasiadas solicitudes" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Créditos agotados" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Error en la búsqueda" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ results: [], totalEstimated: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    try {
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch {
      console.error("Failed to parse:", content);
      return new Response(JSON.stringify({ results: [], totalEstimated: 0, error: "Error al procesar resultados" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    console.error("search-collectibles error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
