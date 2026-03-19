import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Flame, BarChart3 } from "lucide-react";
import { mockResults } from "@/lib/mockData";

const trendingItems = [
  { name: "Pokémon 1st Ed. Base Set Booster Box", category: "Cartas", change: "+18.3%", hot: true },
  { name: "Action Comics #1 (CGC 2.0)", category: "Cómics", change: "+5.7%", hot: true },
  { name: "1955 Double Die Lincoln Penny", category: "Monedas", change: "+3.2%", hot: false },
  { name: "Vintage Star Wars Boba Fett (1979)", category: "Juguetes", change: "-2.1%", hot: false },
  { name: "Black Lotus (Alpha)", category: "Cartas", change: "+8.9%", hot: true },
];

const MarketPage = () => {
  return (
    <div className="min-h-screen px-6 pb-24 pt-12">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-serif text-3xl font-bold">
          <span className="text-primary">Mercado</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Tendencias y datos del mercado de coleccionables</p>
      </motion.div>

      {/* Market Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-8 glass rounded-2xl p-5"
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-primary" />
          <h2 className="font-sans font-semibold">Resumen del Mercado</h2>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Volumen 24h</p>
            <p className="text-xl font-bold">$2.4M</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Artículos listados</p>
            <p className="text-xl font-bold">14,823</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Índice General</p>
            <p className="text-xl font-bold text-green-400">+4.2%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Categoría Top</p>
            <p className="text-xl font-bold">Cartas</p>
          </div>
        </div>
      </motion.div>

      {/* Trending */}
      <div className="mt-8">
        <h2 className="flex items-center gap-2 font-sans text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Flame size={16} className="text-primary" /> Tendencias
        </h2>
        <div className="mt-4 space-y-3">
          {trendingItems.map((item, i) => {
            const isUp = item.change.startsWith("+");
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.08 }}
                className="glass flex items-center gap-4 rounded-xl p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-lg">
                  {item.hot ? "🔥" : "📊"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </div>
                <div className={`flex items-center gap-1 font-semibold ${isUp ? "text-green-400" : "text-red-400"}`}>
                  {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {item.change}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MarketPage;
