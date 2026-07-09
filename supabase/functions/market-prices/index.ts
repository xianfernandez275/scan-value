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
    const { category, categoryLabel } = await req.json();

    if (!category || !categoryLabel) {
      return new Response(
        JSON.stringify({ error: "category and categoryLabel are required" }),
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

    const categoryExamples: Record<string, string> = {
      comics: "cómics (ej: Action Comics #1, Amazing Fantasy #15, Detective Comics #27)",
      cards: "cartas coleccionables (ej: Pokémon TCG, Magic: The Gathering, Yu-Gi-Oh!)",
      coins: "monedas numismáticas (ej: Morgan Dollar, Double Eagle, euros conmemorativos)",
      toys: "juguetes vintage (ej: Star Wars, Hot Wheels, LEGO, Transformers)",
      stamps: "sellos postales (ej: Penny Black, Inverted Jenny, British Guiana)",
      vinyl: "vinilos y discos (ej: Beatles, Pink Floyd, ediciones raras)",
    };

    const examples = categoryExamples[category] || categoryLabel;

    const systemPrompt = `Eres un experto tasador de coleccionables con conocimiento actualizado del mercado en 2024-2025. 
Responde SIEMPRE en formato JSON válido, sin markdown ni texto adicional.
Usa precios realistas basados en ventas reales recientes en plataformas como eBay, Heritage Auctions, etc.
Los porcentajes de cambio deben reflejar tendencias reales del mercado de los últimos 6 meses.`;

    const userPrompt = `Dame datos de mercado actualizados para la categoría: ${categoryLabel} (${examples}).

Necesito exactamente este formato JSON con 20 artículos reales de esta categoría:
{
  "items": [
    {
      "id": "unique-id",
      "name": "Nombre completo del artículo",
      "category": "${categoryLabel}",
      "currentPrice": 15000,
      "previousPrice": 13500,
      "change": 11.1,
      "rarity": "Ultra Raro",
      "condition": "PSA 9",
      "year": 1999,
      "description": "Descripción breve del artículo y por qué es valioso",
      "demand": "Muy Alta",
      "historicalPrices": [
        {"date": "2024-01", "price": 12000},
        {"date": "2024-03", "price": 13000},
        {"date": "2024-06", "price": 13500},
        {"date": "2024-09", "price": 14200},
        {"date": "2025-01", "price": 15000}
      ]
    }
  ],
  "marketSummary": {
    "totalVolume24h": "$2.4M",
    "totalListings": 14823,
    "indexChange": "+4.2%",
    "topSubcategory": "Primera edición"
  }
}

Reglas:
- rarity: "Común", "Poco Común", "Raro", "Muy Raro", o "Ultra Raro"
- demand: "Baja", "Media", "Alta", o "Muy Alta"
- change puede ser positivo o negativo (refleja tendencia real)
- Incluye al menos 10 artículos subiendo y 5 bajando de precio
- historicalPrices debe tener 5 puntos de datos
- Precios en USD
- Los artículos deben ser reales y reconocidos en el mercado de coleccionables`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Intenta de nuevo en unos segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados. Añade fondos en Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Error al obtener datos de mercado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No se recibió respuesta del modelo" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON from response (strip markdown fences if present)
    let parsed;
    try {
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Error al procesar datos de mercado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("market-prices error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
