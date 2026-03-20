import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, Crown, Flame, ChevronDown, Filter, X, RefreshCw, Loader2, Wifi, WifiOff } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { categories } from "@/lib/mockData";
import {
  MarketItem,
  marketDataByCategory,
  getTopValuable,
  getRising,
  getFalling,
  formatPrice,
} from "@/lib/marketData";
import { fetchMarketPrices } from "@/lib/api/marketPrices";
import CategoryPlaceholder from "@/components/CategoryPlaceholder";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer } from "recharts";

const rarityColors: Record<string, string> = {
  "Común": "bg-muted text-muted-foreground",
  "Poco Común": "bg-secondary text-secondary-foreground",
  "Raro": "bg-blue-500/20 text-blue-400",
  "Muy Raro": "bg-purple-500/20 text-purple-400",
  "Ultra Raro": "bg-primary/20 text-primary",
};

function MiniChart({ data, positive }: { data: { date: string; price: number }[]; positive: boolean }) {
  const config = { price: { label: "Precio", color: positive ? "hsl(142 70% 45%)" : "hsl(0 72% 51%)" } };
  return (
    <ChartContainer config={config} className="h-12 w-24">
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={`grad-${positive ? "up" : "down"}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={positive ? "hsl(142 70% 45%)" : "hsl(0 72% 51%)"} stopOpacity={0.4} />
            <stop offset="100%" stopColor={positive ? "hsl(142 70% 45%)" : "hsl(0 72% 51%)"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="price"
          stroke={positive ? "hsl(142 70% 45%)" : "hsl(0 72% 51%)"}
          fill={`url(#grad-${positive ? "up" : "down"})`}
          strokeWidth={1.5}
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function ItemDetailSheet({ item, children }: { item: MarketItem; children: React.ReactNode }) {
  const config = { price: { label: "Precio", color: "hsl(var(--primary))" } };
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl border-border bg-background">
        <SheetHeader>
          <SheetTitle className="text-left font-serif text-xl">{item.name}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-6 overflow-y-auto pb-8">
          {/* Image */}
          <div className="mx-auto h-48 w-48 overflow-hidden rounded-2xl">
            <CategoryPlaceholder category={item.category} />
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Precio Actual</p>
              <p className="text-lg font-bold text-primary">{formatPrice(item.currentPrice)}</p>
            </div>
            <div className="glass rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Variación 30d</p>
              <p className={`text-lg font-bold ${item.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                {item.change >= 0 ? "+" : ""}{item.change}%
              </p>
            </div>
            <div className="glass rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Rareza</p>
              <Badge className={rarityColors[item.rarity]}>{item.rarity}</Badge>
            </div>
            <div className="glass rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Estado</p>
              <p className="font-semibold">{item.condition}</p>
            </div>
            <div className="glass rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Año</p>
              <p className="font-semibold">{item.year}</p>
            </div>
            <div className="glass rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Demanda</p>
              <p className="font-semibold">{item.demand}</p>
            </div>
          </div>

          {/* Description */}
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>

          {/* Chart */}
          <div className="glass rounded-xl p-4">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Histórico de Precios</h3>
            <ChartContainer config={config} className="h-48 w-full">
              <AreaChart data={item.historicalPrices} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                <defs>
                  <linearGradient id="gradDetail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => formatPrice(v)} width={50} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" fill="url(#gradDetail)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ChartContainer>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RankingCard({ item, rank }: { item: MarketItem; rank: number }) {
  const isUp = item.change >= 0;
  return (
    <ItemDetailSheet item={item}>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: rank * 0.06 }}
        className="glass flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-all hover:border-primary/40 hover:shadow-gold active:scale-[0.98]"
      >
        {/* Rank */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary font-bold text-sm text-muted-foreground">
          #{rank + 1}
        </div>

        {/* Image placeholder */}
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
          <CategoryPlaceholder category={item.category} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold">{item.name}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary">{formatPrice(item.currentPrice)}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${rarityColors[item.rarity]}`}>
              {item.rarity}
            </Badge>
          </div>
        </div>

        {/* Trend */}
        <div className="flex flex-col items-end gap-1">
          <div className={`flex items-center gap-1 text-sm font-bold ${isUp ? "text-green-400" : "text-red-400"}`}>
            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {isUp ? "+" : ""}{item.change}%
          </div>
          <MiniChart data={item.historicalPrices} positive={isUp} />
        </div>
      </motion.div>
    </ItemDetailSheet>
  );
}

const priceRanges = [
  { label: "Todos", min: 0, max: Infinity },
  { label: "< $1K", min: 0, max: 1000 },
  { label: "$1K - $10K", min: 1000, max: 10000 },
  { label: "$10K - $100K", min: 10000, max: 100000 },
  { label: "$100K+", min: 100000, max: Infinity },
];

export default function CategoryMarketPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const category = categories.find((c) => c.id === categoryId);
  const [priceRange, setPriceRange] = useState(0);
  const [conditionFilter, setConditionFilter] = useState<string>("all");

  // Fetch live data with fallback to mock
  const { data: liveData, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["market-prices", categoryId],
    queryFn: () => fetchMarketPrices(categoryId || "", category?.label || ""),
    enabled: !!categoryId && !!category,
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: 1,
  });

  const isLive = !!liveData && !isError;
  const allItems: MarketItem[] = isLive
    ? liveData.items
    : marketDataByCategory[categoryId || ""] || [];

  const conditions = useMemo(() => {
    const set = new Set(allItems.map((i) => i.condition));
    return Array.from(set);
  }, [allItems]);

  const filterItems = (items: MarketItem[]) => {
    return items.filter((item) => {
      const range = priceRanges[priceRange];
      if (item.currentPrice < range.min || item.currentPrice > range.max) return false;
      if (conditionFilter !== "all" && item.condition !== conditionFilter) return false;
      return true;
    });
  };

  const sorted = [...allItems];
  const topValuable = filterItems(sorted.sort((a, b) => b.currentPrice - a.currentPrice));
  const rising = filterItems([...allItems].filter(i => i.change > 0).sort((a, b) => b.change - a.change));
  const falling = filterItems([...allItems].filter(i => i.change < 0).sort((a, b) => a.change - b.change));

  if (!category) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Categoría no encontrada</p>
      </div>
    );
  }

  const hasFilters = priceRange !== 0 || conditionFilter !== "all";

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <div className="flex flex-1 items-center gap-2">
            <span className="text-2xl">{category.icon}</span>
            <div>
              <h1 className="font-serif text-lg font-bold">{category.label}</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Análisis de mercado</p>
                {isLive ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-green-400">
                    <Wifi size={10} /> En vivo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                    <WifiOff size={10} /> Datos estimados
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="shrink-0"
          >
            {isFetching ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
          </Button>
        </div>

        {/* Filters */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          <Select value={String(priceRange)} onValueChange={(v) => setPriceRange(Number(v))}>
            <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs">
              <SelectValue placeholder="Precio" />
            </SelectTrigger>
            <SelectContent>
              {priceRanges.map((r, i) => (
                <SelectItem key={i} value={String(i)}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={conditionFilter} onValueChange={setConditionFilter}>
            <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {conditions.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs text-muted-foreground"
              onClick={() => { setPriceRange(0); setConditionFilter("all"); }}
            >
              <X size={14} /> Limpiar
            </Button>
          )}
        </div>
      </div>

      {isLoading && !liveData ? (
        <div className="space-y-4 px-4 pt-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass flex items-center gap-3 rounded-xl p-3 animate-pulse">
              <div className="h-8 w-8 rounded-lg bg-muted" />
              <div className="h-12 w-12 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </div>
              <div className="h-12 w-24 rounded bg-muted" />
            </div>
          ))}
          <p className="text-center text-sm text-muted-foreground pt-4">
            <Loader2 size={16} className="inline animate-spin mr-2" />
            Consultando precios de mercado con IA...
          </p>
        </div>
      ) : (
      <div className="space-y-8 px-4 pt-6">
        {/* Top Valuable */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <Crown size={16} className="text-primary" />
            </div>
            <div>
              <h2 className="font-sans text-sm font-bold uppercase tracking-wider">Top Más Valiosos</h2>
              <p className="text-xs text-muted-foreground">Los artículos con mayor valor actual</p>
            </div>
          </div>
          <div className="space-y-2">
            {topValuable.length > 0 ? (
              topValuable.map((item, i) => <RankingCard key={item.id} item={item} rank={i} />)
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados para estos filtros</p>
            )}
          </div>
        </section>

        {/* Rising */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/15">
              <TrendingUp size={16} className="text-green-400" />
            </div>
            <div>
              <h2 className="font-sans text-sm font-bold uppercase tracking-wider">Revalorizándose</h2>
              <p className="text-xs text-muted-foreground">Mayor subida en los últimos 30 días</p>
            </div>
          </div>
          <div className="space-y-2">
            {rising.length > 0 ? (
              rising.map((item, i) => <RankingCard key={item.id} item={item} rank={i} />)
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Sin artículos subiendo de precio</p>
            )}
          </div>
        </section>

        {/* Falling */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/15">
              <TrendingDown size={16} className="text-red-400" />
            </div>
            <div>
              <h2 className="font-sans text-sm font-bold uppercase tracking-wider">Bajando de Precio</h2>
              <p className="text-xs text-muted-foreground">Mayor caída en los últimos 30 días</p>
            </div>
          </div>
          <div className="space-y-2">
            {falling.length > 0 ? (
              falling.map((item, i) => <RankingCard key={item.id} item={item} rank={i} />)
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Sin artículos bajando de precio</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
