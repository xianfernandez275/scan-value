import { supabase } from "@/integrations/supabase/client";
import type { MarketItem } from "@/lib/marketData";

export interface SearchFilters {
  category?: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  rarity?: string;
  condition?: string;
  trend?: "subiendo" | "bajando" | "estable";
  sortBy?: "relevance" | "price_desc" | "price_asc" | "popularity" | "trend" | "year_desc" | "year_asc";
}

export interface SearchResult extends MarketItem {
  series?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  totalEstimated: number;
  searchContext?: string;
}

export interface AutocompleteSuggestion {
  name: string;
  category: string;
  id: string;
}

export async function searchCollectibles(
  query: string,
  filters?: SearchFilters
): Promise<SearchResponse> {
  const { data, error } = await supabase.functions.invoke("search-collectibles", {
    body: { query, filters, mode: "full" },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  const results: SearchResult[] = (data.results || []).map((item: any, i: number) => ({
    id: item.id || `sr-${i}`,
    name: item.name || "Desconocido",
    category: item.category || "Otros",
    imageUrl: item.imageUrl || "",
    currentPrice: Number(item.currentPrice) || 0,
    previousPrice: Number(item.previousPrice) || 0,
    change: Number(item.change) || 0,
    rarity: item.rarity || "Común",
    condition: item.condition || "N/A",
    year: Number(item.year) || 2024,
    description: item.description || "",
    demand: item.demand || "Media",
    series: item.series || "",
    historicalPrices: Array.isArray(item.historicalPrices)
      ? item.historicalPrices.map((hp: any) => ({ date: hp.date || "", price: Number(hp.price) || 0 }))
      : [],
  }));

  return {
    results,
    totalEstimated: data.totalEstimated || results.length,
    searchContext: data.searchContext || "",
  };
}

export async function getAutocompleteSuggestions(
  query: string
): Promise<AutocompleteSuggestion[]> {
  if (!query || query.length < 2) return [];

  const { data, error } = await supabase.functions.invoke("search-collectibles", {
    body: { query, mode: "autocomplete" },
  });

  if (error || data?.error) return [];
  return data?.suggestions || [];
}
