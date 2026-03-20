import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, SlidersHorizontal, TrendingUp, TrendingDown, Minus,
  ArrowUpDown, Loader2, Crown, ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import CategoryPlaceholder from "@/components/CategoryPlaceholder";
import SearchRecommendations from "@/components/SearchRecommendations";
import { categories } from "@/lib/mockData";
import { formatPrice, type MarketItem } from "@/lib/marketData";
import {
  searchCollectibles,
  getAutocompleteSuggestions,
  type SearchFilters,
  type SearchResult,
  type AutocompleteSuggestion,
} from "@/lib/api/searchCollectibles";
import { addSearchEntry, addViewedItem } from "@/lib/searchHistory";

const rarityOptions = ["Común", "Poco Común", "Raro", "Muy Raro", "Ultra Raro"];
const trendOptions = [
  { value: "subiendo", label: "Subiendo", icon: TrendingUp },
  { value: "bajando", label: "Bajando", icon: TrendingDown },
  { value: "estable", label: "Estable", icon: Minus },
];
const sortOptions = [
  { value: "relevance", label: "Relevancia" },
  { value: "price_desc", label: "Precio ↓" },
  { value: "price_asc", label: "Precio ↑" },
  { value: "popularity", label: "Popularidad" },
  { value: "trend", label: "Tendencia" },
  { value: "year_desc", label: "Año ↓" },
  { value: "year_asc", label: "Año ↑" },
];

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
    <ChartContainer config={config} className="h-10 w-20">
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={`sg-${positive ? "up" : "dn"}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={positive ? "hsl(142 70% 45%)" : "hsl(0 72% 51%)"} stopOpacity={0.4} />
            <stop offset="100%" stopColor={positive ? "hsl(142 70% 45%)" : "hsl(0 72% 51%)"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="price" stroke={positive ? "hsl(142 70% 45%)" : "hsl(0 72% 51%)"} fill={`url(#sg-${positive ? "up" : "dn"})`} strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ChartContainer>
  );
}

function ItemDetailSheet({ item, children }: { item: SearchResult; children: React.ReactNode }) {
  const config = { price: { label: "Precio", color: "hsl(var(--primary))" } };
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl border-border bg-background">
        <SheetHeader>
          <SheetTitle className="text-left font-serif text-xl">{item.name}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-6 overflow-y-auto pb-8">
          <div className="mx-auto h-48 w-48 overflow-hidden rounded-2xl">
            <CategoryPlaceholder category={item.category} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Precio Actual</p>
              <p className="text-lg font-bold text-primary">{formatPrice(item.currentPrice)}</p>
            </div>
            <div className="glass rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Variación</p>
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
          {item.series && (
            <div className="glass rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Serie / Colección</p>
              <p className="font-semibold">{item.series}</p>
            </div>
          )}
          <div className="glass rounded-xl p-4">
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
          {item.historicalPrices.length > 0 && (
            <div className="glass rounded-xl p-4">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Histórico de Precios</h3>
              <ChartContainer config={config} className="h-48 w-full">
                <AreaChart data={item.historicalPrices} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                  <defs>
                    <linearGradient id="gradSearchDetail" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => formatPrice(v)} width={50} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="price" stroke="hsl(var(--primary))" fill="url(#gradSearchDetail)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ChartContainer>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ResultCard({ item, index }: { item: SearchResult; index: number }) {
  const isUp = item.change >= 0;
  return (
    <ItemDetailSheet item={item}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        className="glass flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-all hover:border-primary/40 hover:shadow-gold active:scale-[0.98]"
      >
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
          <CategoryPlaceholder category={item.category} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold">{item.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-bold text-primary">{formatPrice(item.currentPrice)}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${rarityColors[item.rarity]}`}>
              {item.rarity}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{item.year}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className={`flex items-center gap-1 text-xs font-bold ${isUp ? "text-green-400" : "text-red-400"}`}>
            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isUp ? "+" : ""}{item.change}%
          </div>
          {item.historicalPrices.length > 0 && (
            <MiniChart data={item.historicalPrices} positive={isUp} />
          )}
        </div>
      </motion.div>
    </ItemDetailSheet>
  );
}
/** Highlight matching text portions */
function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="text-primary font-bold">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [recRefreshKey, setRecRefreshKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounce input for autocomplete (250ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Autocomplete
  const { data: suggestions, isFetching: isSuggesting } = useQuery({
    queryKey: ["autocomplete", debouncedQuery],
    queryFn: () => getAutocompleteSuggestions(debouncedQuery),
    enabled: debouncedQuery.length >= 1 && showSuggestions,
    staleTime: 30_000,
  });

  // Full search
  const { data: searchData, isLoading, isFetching } = useQuery({
    queryKey: ["search-collectibles", searchQuery, filters],
    queryFn: () => searchCollectibles(searchQuery, filters),
    enabled: searchQuery.length >= 2,
    staleTime: 60_000,
    retry: 1,
  });

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    setShowSuggestions(true);
    setSelectedIdx(-1);
  };

  const executeSearch = useCallback((q?: string) => {
    const searchVal = q || query;
    if (searchVal.length < 1) return;
    setSearchQuery(searchVal);
    setShowSuggestions(false);
    setSelectedIdx(-1);
    // Track search history
    addSearchEntry(searchVal, filters.category);
    setRecRefreshKey((k) => k + 1);
  }, [query, filters.category]);

  const selectSuggestion = (s: AutocompleteSuggestion) => {
    setQuery(s.name);
    setSearchQuery(s.name);
    setShowSuggestions(false);
    setSelectedIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = suggestions || [];
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      if (selectedIdx >= 0 && items[selectedIdx]) {
        selectSuggestion(items[selectedIdx]);
      } else {
        executeSearch();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const clearFilters = () => {
    setFilters({});
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category) count++;
    if (filters.priceMin || filters.priceMax) count++;
    if (filters.yearMin || filters.yearMax) count++;
    if (filters.rarity) count++;
    if (filters.condition) count++;
    if (filters.trend) count++;
    if (filters.sortBy && filters.sortBy !== "relevance") count++;
    return count;
  }, [filters]);

  const categoryEmoji: Record<string, string> = {
    "Cómics": "📚", "Cartas": "🃏", "Monedas": "🪙",
    "Juguetes": "🧸", "Sellos": "📮", "Vinilos": "🎵",
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Search Header */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-xl px-4 pt-10 pb-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => query.length >= 1 && setShowSuggestions(true)}
              placeholder="Buscar artículos, series, IDs..."
              className="pl-10 pr-10 h-11 rounded-xl bg-secondary border-none text-base"
              autoFocus
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setSearchQuery(""); setDebouncedQuery(""); setShowSuggestions(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="relative h-11 w-11 shrink-0 rounded-xl"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Autocomplete Dropdown */}
        <AnimatePresence>
          {showSuggestions && query.length >= 1 && (
            <motion.div
              ref={suggestionsRef}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute left-4 right-4 z-30 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
            >
              {isSuggesting && (!suggestions || suggestions.length === 0) && (
                <div className="flex items-center gap-3 px-4 py-3 text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-sm">Buscando sugerencias...</span>
                </div>
              )}
              {suggestions && suggestions.length > 0 && (
                <>
                  {suggestions.map((s, i) => (
                    <button
                      key={s.id || i}
                      onClick={() => selectSuggestion(s)}
                      onMouseEnter={() => setSelectedIdx(i)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        selectedIdx === i ? "bg-secondary" : "hover:bg-secondary/50"
                      }`}
                    >
                      {/* Category thumbnail */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-lg">
                        {categoryEmoji[s.category] || "📦"}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">
                          {highlightMatch(s.name, query)}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{s.category}</span>
                          {s.series && <span className="text-[10px] text-muted-foreground">· {s.series}</span>}
                          {s.year && <span className="text-[10px] text-muted-foreground">· {s.year}</span>}
                        </div>
                      </div>
                      {/* Price & rarity */}
                      <div className="flex flex-col items-end shrink-0">
                        {s.price && <span className="text-xs font-bold text-primary">{formatPrice(s.price)}</span>}
                        {s.rarity && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${rarityColors[s.rarity] || "text-muted-foreground"}`}>
                            {s.rarity}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                  {/* Search all hint */}
                  <button
                    onClick={() => executeSearch()}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left border-t border-border transition-colors ${
                      selectedIdx === suggestions.length ? "bg-secondary" : "hover:bg-secondary/50"
                    }`}
                  >
                    <Search size={14} className="text-primary" />
                    <span className="text-sm">
                      Buscar todos los resultados de "<span className="font-semibold">{query}</span>"
                    </span>
                  </button>
                </>
              )}
              {!isSuggesting && suggestions && suggestions.length === 0 && query.length >= 1 && (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  No se encontraron sugerencias. Pulsa Enter para buscar.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters Panel */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-4 pb-2">
                {/* Category */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Categoría</label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge
                      variant={!filters.category ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setFilters(f => ({ ...f, category: undefined }))}
                    >
                      Todas
                    </Badge>
                    {categories.map((c) => (
                      <Badge
                        key={c.id}
                        variant={filters.category === c.label ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setFilters(f => ({ ...f, category: f.category === c.label ? undefined : c.label }))}
                      >
                        {c.icon} {c.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Rarity */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Rareza</label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {rarityOptions.map((r) => (
                      <Badge
                        key={r}
                        variant={filters.rarity === r ? "default" : "outline"}
                        className={`cursor-pointer ${filters.rarity === r ? rarityColors[r] : ""}`}
                        onClick={() => setFilters(f => ({ ...f, rarity: f.rarity === r ? undefined : r }))}
                      >
                        {r}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Trend */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Tendencia</label>
                  <div className="mt-1.5 flex gap-2">
                    {trendOptions.map((t) => {
                      const Icon = t.icon;
                      return (
                        <Badge
                          key={t.value}
                          variant={filters.trend === t.value ? "default" : "outline"}
                          className="cursor-pointer gap-1"
                          onClick={() => setFilters(f => ({ ...f, trend: f.trend === t.value ? undefined : t.value as any }))}
                        >
                          <Icon size={12} /> {t.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Ordenar por</label>
                  <Select
                    value={filters.sortBy || "relevance"}
                    onValueChange={(v) => setFilters(f => ({ ...f, sortBy: v as any }))}
                  >
                    <SelectTrigger className="mt-1.5 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Precio mín ($)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={filters.priceMin || ""}
                      onChange={(e) => setFilters(f => ({ ...f, priceMin: e.target.value ? Number(e.target.value) : undefined }))}
                      className="mt-1.5 h-9"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Precio máx ($)</label>
                    <Input
                      type="number"
                      placeholder="∞"
                      value={filters.priceMax || ""}
                      onChange={(e) => setFilters(f => ({ ...f, priceMax: e.target.value ? Number(e.target.value) : undefined }))}
                      className="mt-1.5 h-9"
                    />
                  </div>
                </div>

                {/* Year range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Año desde</label>
                    <Input
                      type="number"
                      placeholder="1800"
                      value={filters.yearMin || ""}
                      onChange={(e) => setFilters(f => ({ ...f, yearMin: e.target.value ? Number(e.target.value) : undefined }))}
                      className="mt-1.5 h-9"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Año hasta</label>
                    <Input
                      type="number"
                      placeholder="2025"
                      value={filters.yearMax || ""}
                      onChange={(e) => setFilters(f => ({ ...f, yearMax: e.target.value ? Number(e.target.value) : undefined }))}
                      className="mt-1.5 h-9"
                    />
                  </div>
                </div>

                {/* Condition */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Estado / Gradeo</label>
                  <Input
                    placeholder="ej: PSA 9, CGC 8.5, Mint..."
                    value={filters.condition || ""}
                    onChange={(e) => setFilters(f => ({ ...f, condition: e.target.value || undefined }))}
                    className="mt-1.5 h-9"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={clearFilters}
                  >
                    <X size={14} className="mr-1" /> Limpiar filtros
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => { setFiltersOpen(false); executeSearch(); }}
                  >
                    <Search size={14} className="mr-1" /> Buscar
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results */}
      <div className="px-4 pt-4">
        {!searchQuery && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Sparkles size={48} className="text-primary/30 mb-4" />
            <h2 className="font-serif text-xl font-semibold">Buscar Coleccionables</h2>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Busca por nombre, serie, año o ID. Usa los filtros para refinar los resultados.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["Charizard 1st Edition", "Action Comics #1", "Morgan Dollar 1893", "Black Lotus Alpha"].map((ex) => (
                <Badge
                  key={ex}
                  variant="outline"
                  className="cursor-pointer hover:bg-secondary"
                  onClick={() => { setQuery(ex); executeSearch(ex); }}
                >
                  {ex}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {(isLoading || isFetching) && searchQuery && (
          <div className="space-y-3 pt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="glass flex items-center gap-3 rounded-xl p-3 animate-pulse">
                <div className="h-12 w-12 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
                <div className="h-10 w-20 rounded bg-muted" />
              </div>
            ))}
            <p className="text-center text-sm text-muted-foreground pt-2">
              <Loader2 size={16} className="inline animate-spin mr-2" />
              Buscando coleccionables con IA...
            </p>
          </div>
        )}

        {searchData && !isLoading && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{searchData.results.length}</span> resultados
                {searchData.totalEstimated > searchData.results.length && (
                  <span> de ~{searchData.totalEstimated} estimados</span>
                )}
              </p>
              {isFetching && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
            </div>

            {searchData.searchContext && (
              <p className="mb-4 text-xs text-muted-foreground italic glass rounded-lg px-3 py-2">{searchData.searchContext}</p>
            )}

            <div className="space-y-2">
              {searchData.results.map((item, i) => (
                <ResultCard key={item.id} item={item} index={i} />
              ))}
            </div>

            {searchData.results.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-muted-foreground">No se encontraron resultados</p>
                <p className="mt-1 text-xs text-muted-foreground">Intenta con otros términos o ajusta los filtros</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
