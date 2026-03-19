import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Star, ExternalLink } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { mockResults, type CollectibleItem } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const rarityColors: Record<string, string> = {
  "Común": "bg-muted text-muted-foreground",
  "Poco Común": "bg-secondary text-secondary-foreground",
  "Raro": "bg-blue-500/20 text-blue-400",
  "Muy Raro": "bg-purple-500/20 text-purple-400",
  "Ultra Raro": "bg-primary/20 text-primary",
};

const ResultCard = ({ item, index }: { item: CollectibleItem; index: number }) => {
  const [expanded, setExpanded] = useState(index === 0);
  const lastPrice = item.historicalPrices[item.historicalPrices.length - 2]?.price || item.currentValue;
  const trend = item.currentValue >= lastPrice ? "up" : "down";
  const pct = Math.abs(((item.currentValue - lastPrice) / lastPrice) * 100).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15 }}
      className="glass rounded-2xl overflow-hidden"
    >
      <div className="p-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={rarityColors[item.rarity]}>{item.rarity}</Badge>
              <span className="text-xs text-muted-foreground">{item.category}</span>
            </div>
            <h3 className="mt-2 font-serif text-xl font-semibold">{item.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.year} · {item.version}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">
              ${item.currentValue.toLocaleString()}
            </p>
            <div className={`flex items-center gap-1 text-sm ${trend === "up" ? "text-green-400" : "text-red-400"}`}>
              {trend === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {pct}%
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="border-t border-border px-5 pb-5 pt-4"
        >
          <p className="text-sm text-muted-foreground">{item.description}</p>

          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Características</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.specialFeatures.map((f) => (
                <span key={f} className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{f}</span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-secondary p-3 text-center">
              <p className="text-xs text-muted-foreground">Condición</p>
              <p className="mt-1 text-sm font-semibold">{item.condition}</p>
            </div>
            <div className="rounded-lg bg-secondary p-3 text-center">
              <p className="text-xs text-muted-foreground">Demanda</p>
              <p className="mt-1 text-sm font-semibold">{item.demand}</p>
            </div>
            <div className="rounded-lg bg-secondary p-3 text-center">
              <p className="text-xs text-muted-foreground">Año</p>
              <p className="mt-1 text-sm font-semibold">{item.year}</p>
            </div>
          </div>

          {/* Mini price chart */}
          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Historial de precios</h4>
            <div className="mt-3 flex items-end gap-1 h-16">
              {item.historicalPrices.map((p, i) => {
                const max = Math.max(...item.historicalPrices.map((x) => x.price));
                const height = (p.price / max) * 100;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t gradient-gold transition-all"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{p.date.slice(2, 7)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button size="sm" className="flex-1 gap-1">
              <Plus size={14} /> Añadir a colección
            </Button>
            <Button size="sm" variant="outline" className="gap-1">
              <ExternalLink size={14} /> Mercado
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

const ResultsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen px-6 pb-24 pt-12">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-secondary/80">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-serif text-2xl font-bold">Resultados</h1>
          <p className="text-sm text-muted-foreground">{mockResults.length} coincidencias encontradas</p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {mockResults.map((item, i) => (
          <ResultCard key={item.id} item={item} index={i} />
        ))}
      </div>
    </div>
  );
};

export default ResultsPage;
