import { supabase } from "@/integrations/supabase/client";
import type { MarketItem } from "@/lib/marketData";

export interface MarketPricesResponse {
  items: MarketItem[];
  marketSummary: {
    totalVolume24h: string;
    totalListings: number;
    indexChange: string;
    topSubcategory: string;
  };
}

export async function fetchMarketPrices(
  category: string,
  categoryLabel: string
): Promise<MarketPricesResponse> {
  const { data, error } = await supabase.functions.invoke("market-prices", {
    body: { category, categoryLabel },
  });

  if (error) {
    throw new Error(error.message || "Error al obtener precios de mercado");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  // Normalize items to ensure they match MarketItem type
  const items: MarketItem[] = (data.items || []).map((item: any, i: number) => ({
    id: item.id || `ai-${i}`,
    name: item.name || "Desconocido",
    category: item.category || categoryLabel,
    imageUrl: item.imageUrl || "",
    currentPrice: Number(item.currentPrice) || 0,
    previousPrice: Number(item.previousPrice) || 0,
    change: Number(item.change) || 0,
    rarity: item.rarity || "Común",
    condition: item.condition || "N/A",
    year: Number(item.year) || 2024,
    description: item.description || "",
    demand: item.demand || "Media",
    historicalPrices: Array.isArray(item.historicalPrices)
      ? item.historicalPrices.map((hp: any) => ({
          date: hp.date || "",
          price: Number(hp.price) || 0,
        }))
      : [],
  }));

  return {
    items,
    marketSummary: data.marketSummary || {
      totalVolume24h: "$0",
      totalListings: 0,
      indexChange: "0%",
      topSubcategory: "N/A",
    },
  };
}
