import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, TrendingUp, Clock, RefreshCw, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import CategoryPlaceholder from "@/components/CategoryPlaceholder";
import { supabase } from "@/integrations/supabase/client";
import {
  buildRecommendationContext,
  getRecentSearches,
  getRecentlyViewed,
  type ViewedItem,
} from "@/lib/searchHistory";
import { formatPrice } from "@/lib/marketData";

interface Recommendation {
  id: string;
  name: string;
  category: string;
  currentPrice: number;
  rarity: string;
  year: number;
  series?: string;
  change?: number;
  reason?: string;
  trending?: boolean;
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
  contextLabel?: string;
}

const rarityColors: Record<string, string> = {
  "Común": "bg-muted text-muted-foreground",
  "Poco Común": "bg-secondary text-secondary-foreground",
  "Raro": "bg-blue-500/20 text-blue-400",
  "Muy Raro": "bg-purple-500/20 text-purple-400",
  "Ultra Raro": "bg-primary/20 text-primary",
};

const categoryEmoji: Record<string, string> = {
  "Cómics": "📚",
  "Cartas": "🃏",
  "Monedas": "🪙",
  "Juguetes": "🧸",
  "Sellos": "📮",
  "Vinilos": "🎵",
};

async function fetchRecommendations(): Promise<RecommendationsResponse> {
  const ctx = buildRecommendationContext();
  const { data, error } = await supabase.functions.invoke("search-collectibles", {
    body: { mode: "recommendations", historyContext: ctx },
  });
  if (error) throw error;
  return {
    recommendations: (data?.recommendations || []).map((r: any, i: number) => ({
      id: r.id || `rec-${i}`,
      name: r.name || "Desconocido",
      category: r.category || "Otros",
      currentPrice: Number(r.currentPrice) || 0,
      rarity: r.rarity || "Común",
      year: Number(r.year) || 2024,
      series: r.series || "",
      change: Number(r.change) || 0,
      reason: r.reason || "",
      trending: !!r.trending,
    })),
    contextLabel: data?.contextLabel || "Recomendado para ti",
  };
}

interface SearchRecommendationsProps {
  onSelectItem: (item: Recommendation) => void;
  onSearchQuery: (query: string) => void;
  refreshKey?: number; // increment to force refresh
}

export default function SearchRecommendations({
  onSelectItem,
  onSearchQuery,
  refreshKey = 0,
}: SearchRecommendationsProps) {
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["recommendations", refreshKey],
    queryFn: fetchRecommendations,
    staleTime: 5 * 60_000, // 5 min
    retry: 1,
  });

  const recentSearches = getRecentSearches(5);
  const recentViewed = getRecentlyViewed(5);
  const hasHistory = recentSearches.length > 0 || recentViewed.length > 0;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["recommendations"] });
  };

  return (
    <div className="space-y-5">
      {/* Recent searches */}
      {recentSearches.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Búsquedas recientes</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recentSearches.map((s, i) => (
              <Badge
                key={`${s.query}-${i}`}
                variant="outline"
                className="cursor-pointer hover:bg-secondary transition-colors"
                onClick={() => onSearchQuery(s.query)}
              >
                {s.query}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Recently viewed */}
      {recentViewed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Clock size={14} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Vistos recientemente</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {recentViewed.map((item, i) => (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() =>
                  onSelectItem({
                    ...item,
                    currentPrice: item.price || 0,
                    rarity: item.rarity || "Común",
                    year: item.year || 2024,
                  })
                }
                className="glass flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 transition-all hover:border-primary/40 active:scale-95"
              >
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg">
                  <CategoryPlaceholder category={item.category} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-medium truncate max-w-[120px]">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.category}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-primary" />
            <span className="text-xs font-medium text-muted-foreground">
              {data?.contextLabel || (hasHistory ? "Basado en tus búsquedas" : "Recomendado para ti")}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Generando recomendaciones...</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {data && data.recommendations.length > 0 && (
            <motion.div
              key="recs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 gap-2"
            >
              {data.recommendations.slice(0, 8).map((rec, i) => (
                <motion.button
                  key={rec.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => onSelectItem(rec)}
                  className="glass flex flex-col items-start rounded-xl p-3 text-left transition-all hover:border-primary/40 hover:shadow-gold active:scale-[0.97]"
                >
                  <div className="flex w-full items-start gap-2">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                      <CategoryPlaceholder category={rec.category} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{rec.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {categoryEmoji[rec.category] || "📦"} {rec.category}
                        </span>
                        {rec.trending && (
                          <TrendingUp size={10} className="text-green-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex w-full items-center justify-between">
                    <span className="text-xs font-bold text-primary">
                      {formatPrice(rec.currentPrice)}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded ${
                        rarityColors[rec.rarity] || "text-muted-foreground"
                      }`}
                    >
                      {rec.rarity}
                    </span>
                  </div>
                  {rec.reason && (
                    <p className="mt-1 text-[9px] text-muted-foreground/70 truncate w-full">
                      {rec.reason}
                    </p>
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
