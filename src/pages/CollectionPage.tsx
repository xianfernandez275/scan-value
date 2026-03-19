import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, TrendingUp, DollarSign, Package } from "lucide-react";
import { mockResults, type CollectibleItem } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import CollectibleImage from "@/components/CollectibleImage";

const CollectionPage = () => {
  const [collection] = useState<CollectibleItem[]>(mockResults.slice(0, 2));
  const totalValue = collection.reduce((sum, item) => sum + item.currentValue, 0);

  return (
    <div className="min-h-screen px-6 pb-24 pt-12">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-serif text-3xl font-bold">
          Mi <span className="text-primary">Colección</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Gestiona y valora tus artículos</p>
      </motion.div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-3 gap-3">
        {[
          { icon: Package, label: "Artículos", value: collection.length.toString() },
          { icon: DollarSign, label: "Valor Total", value: `$${(totalValue / 1000).toFixed(0)}K` },
          { icon: TrendingUp, label: "Tendencia", value: "+12.4%" },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-4 text-center"
            >
              <Icon size={20} className="mx-auto text-primary" />
              <p className="mt-2 text-lg font-bold">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Collection List */}
      <div className="mt-8">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Artículos ({collection.length})
        </h2>
        <div className="mt-4 space-y-3">
          <AnimatePresence>
            {collection.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="glass flex items-center gap-4 rounded-xl p-4"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-secondary text-2xl">
                  {item.category === "Cómics" ? "📚" : item.category === "Cartas" ? "🃏" : "🪙"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.year} · {item.condition}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">${item.currentValue.toLocaleString()}</p>
                  <Badge variant="outline" className="text-[10px]">{item.rarity}</Badge>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {collection.length === 0 && (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <BookOpen size={48} className="text-muted-foreground" />
            <p className="text-muted-foreground">Tu colección está vacía</p>
            <p className="text-sm text-muted-foreground">Escanea un artículo para empezar</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionPage;
