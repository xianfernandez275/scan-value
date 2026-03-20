import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, filters, mode } = await req.json();

    // mode: "autocomplete" (fast, short suggestions) or "full" (detailed results)
    if (!query && mode !== "full") {
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build filter context
    const filterContext = [];
    if (filters?.category) filterContext.push(`Categoría: ${filters.category}`);
    if (filters?.priceMin || filters?.priceMax) filterContext.push(`Precio: $${filters.priceMin || 0} - $${filters.priceMax || '∞'}`);
    if (filters?.yearMin || filters?.yearMax) filterContext.push(`Año: ${filters.yearMin || '1800'} - ${filters.yearMax || '2025'}`);
    if (filters?.rarity) filterContext.push(`Rareza: ${filters.rarity}`);
    if (filters?.condition) filterContext.push(`Estado/gradeo: ${filters.condition}`);
    if (filters?.trend) filterContext.push(`Tendencia: ${filters.trend}`);
    const filterStr = filterContext.length > 0 ? `\nFiltros activos:\n${filterContext.join('\n')}` : '';

    if (mode === "autocomplete") {
      // Fast autocomplete — use lighter model, fewer results
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `Eres un experto en coleccionables. Devuelve sugerencias de autocompletado en JSON.
Responde SOLO con JSON válido, sin markdown.
Formato: {"suggestions": [{"name": "...", "category": "...", "id": "..."}]}
Máximo 6 sugerencias. Las categorías son: Cómics, Cartas, Monedas, Juguetes, Sellos, Vinilos.`,
            },
            {
              role: "user",
              content: `Sugerencias de autocompletado para: "${query}"${filterStr}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        const text = await response.text();
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Créditos agotados" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        console.error("AI error:", status, text);
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

    // Full search
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
