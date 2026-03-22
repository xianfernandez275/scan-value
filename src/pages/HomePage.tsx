import { motion } from "framer-motion";
import { Camera, Search, Sparkles, TrendingUp, Shield, Zap, Crown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-collectibles.jpg";
import { categories } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  { icon: Camera, title: "Escaneo IA", desc: "Fotografía tu artículo y la IA lo identifica al instante" },
  { icon: Search, title: "Identificación", desc: "Nombre, año, versión y características especiales" },
  { icon: TrendingUp, title: "Datos de Mercado", desc: "Valor actual, precios históricos y tendencias" },
  { icon: Shield, title: "Colección Segura", desc: "Guarda y gestiona tu colección personal" },
  { icon: Sparkles, title: "Rareza", desc: "Evalúa la rareza y demanda de cada pieza" },
  { icon: Zap, title: "Multi-Categoría", desc: "Cómics, monedas, cartas, juguetes y más" },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { user, isPremium } = useAuth();
  return (
    <div className="min-h-screen pb-24">
      {/* Hero */}
      <section className="relative h-[70vh] min-h-[500px] overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Coleccionables premium" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        </div>
        <div className="relative z-10 flex h-full flex-col items-center justify-end px-6 pb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-serif text-5xl font-bold tracking-tight md:text-7xl">
              Colec<span className="text-primary">Scan</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted-foreground">
              Escanea, identifica y valora tus coleccionables con inteligencia artificial
            </p>
            <Link to="/scan">
              <Button size="lg" className="mt-8 gap-2 px-8 text-base font-semibold animate-pulse-gold">
                <Camera size={20} />
                Escanear Artículo
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="px-6 py-12">
        <h2 className="font-serif text-2xl font-semibold">Categorías</h2>
        <div className="mt-6 grid grid-cols-3 gap-3 md:grid-cols-6">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => navigate(`/market/${cat.id}`)}
              className="glass flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-all hover:border-primary/50 hover:shadow-gold cursor-pointer"
            >
              <span className="text-3xl">{cat.icon}</span>
              <span className="text-sm font-medium">{cat.label}</span>
              <span className="text-xs text-muted-foreground">{cat.count.toLocaleString()}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-12">
        <h2 className="font-serif text-2xl font-semibold">¿Cómo funciona?</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="glass rounded-xl p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <h3 className="font-sans text-base font-semibold">{feat.title}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{feat.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Premium CTA */}
      {!isPremium && (
        <section className="px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-2xl border-2 border-primary/30 bg-card p-6 text-center shadow-gold"
          >
            <Crown size={32} className="mx-auto text-primary" />
            <h3 className="mt-3 font-serif text-xl font-bold">
              Desbloquea <span className="text-primary">Premium</span>
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Escaneos ilimitados, historial de precios, predicciones IA y más
            </p>
            <Button
              size="lg"
              className="mt-4 gap-2 font-semibold"
              onClick={() => navigate(user ? "/pricing" : "/auth")}
            >
              <Zap size={16} />
              {user ? "Ver Planes" : "Empieza Gratis"}
            </Button>
          </motion.div>
        </section>
      )}
    </div>
  );
};

export default HomePage;
