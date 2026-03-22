import { motion } from "framer-motion";
import { Check, X, Crown, Zap, TrendingUp, Bell, BarChart3, Infinity, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const plans = [
  {
    name: "Gratuito",
    price: "$0",
    period: "para siempre",
    features: [
      { text: "10 escaneos/mes", included: true },
      { text: "25 artículos en colección", included: true },
      { text: "Identificación con IA", included: true },
      { text: "Precio actual de mercado", included: true },
      { text: "Historial de precios", included: false },
      { text: "Predicciones de mercado", included: false },
      { text: "Alertas personalizadas", included: false },
      { text: "Rankings completos", included: false },
      { text: "Colección ilimitada", included: false },
      { text: "Estadísticas avanzadas", included: false },
    ],
  },
  {
    name: "Premium",
    price: "$9.99",
    period: "/mes",
    badge: "Popular",
    features: [
      { text: "Escaneos ilimitados", included: true },
      { text: "Colección ilimitada", included: true },
      { text: "Identificación con IA", included: true },
      { text: "Precio actual de mercado", included: true },
      { text: "Historial de precios", included: true },
      { text: "Predicciones de mercado", included: true },
      { text: "Alertas personalizadas", included: true },
      { text: "Rankings completos", included: true },
      { text: "Estadísticas de colección", included: true },
      { text: "Soporte prioritario", included: true },
    ],
  },
];

const premiumHighlights = [
  { icon: TrendingUp, title: "Historial de Precios", desc: "Accede a gráficos históricos detallados de cada artículo" },
  { icon: BarChart3, title: "Predicciones IA", desc: "Predicciones de tendencias de mercado basadas en datos" },
  { icon: Bell, title: "Alertas", desc: "Notificaciones cuando el precio de un artículo cambia" },
  { icon: Infinity, title: "Sin Límites", desc: "Escaneos y colección ilimitados" },
];

const PricingPage = () => {
  const { user, isPremium } = useAuth();
  const navigate = useNavigate();

  const handleUpgrade = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    toast.info("Próximamente: el sistema de pagos se activará pronto.");
  };

  return (
    <div className="min-h-screen px-6 pb-24 pt-12">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground mb-4">
          <ArrowLeft size={18} /> Volver
        </button>
        <h1 className="font-serif text-3xl font-bold">
          Planes y <span className="text-primary">Precios</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Elige el plan que mejor se adapte a tus necesidades</p>
      </motion.div>

      {/* Trial banner */}
      {!isPremium && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 gradient-gold rounded-xl p-4 text-center"
        >
          <p className="font-semibold text-primary-foreground">🎉 Prueba Premium 7 días gratis</p>
          <p className="text-sm text-primary-foreground/80 mt-1">Sin compromiso, cancela cuando quieras</p>
        </motion.div>
      )}

      {/* Plan cards */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {plans.map((plan, idx) => {
          const isPremiumPlan = idx === 1;
          const isCurrentPlan = isPremiumPlan ? isPremium : !isPremium;
          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.15 }}
              className={`rounded-2xl p-6 ${isPremiumPlan ? "border-2 border-primary shadow-gold bg-card" : "glass"}`}
            >
              <div className="flex items-center gap-2">
                {isPremiumPlan && <Crown size={20} className="text-primary" />}
                <h3 className="font-serif text-xl font-bold">{plan.name}</h3>
                {plan.badge && <Badge className="gradient-gold text-primary-foreground text-[10px]">{plan.badge}</Badge>}
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mt-5 space-y-2.5">
                {plan.features.map((feat) => (
                  <li key={feat.text} className="flex items-center gap-2 text-sm">
                    {feat.included ? (
                      <Check size={16} className="text-primary shrink-0" />
                    ) : (
                      <X size={16} className="text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={feat.included ? "" : "text-muted-foreground/50"}>{feat.text}</span>
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                className={`w-full mt-6 font-semibold ${isPremiumPlan ? "gap-2" : ""}`}
                variant={isPremiumPlan ? "default" : "outline"}
                disabled={isCurrentPlan}
                onClick={isPremiumPlan ? handleUpgrade : undefined}
              >
                {isCurrentPlan ? "Plan Actual" : isPremiumPlan ? (
                  <>
                    <Zap size={16} /> Comenzar Prueba Gratis
                  </>
                ) : "Plan Actual"}
              </Button>
            </motion.div>
          );
        })}
      </div>

      {/* Premium highlights */}
      <section className="mt-12">
        <h2 className="font-serif text-2xl font-semibold">
          ¿Por qué <span className="text-primary">Premium</span>?
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {premiumHighlights.map((h, i) => {
            const Icon = h.icon;
            return (
              <motion.div
                key={h.title}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="glass rounded-xl p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <h3 className="font-semibold">{h.title}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{h.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Affiliate section */}
      <section className="mt-12 glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={20} className="text-primary" />
          <h3 className="font-serif text-lg font-semibold">Compra con Confianza</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Encuentra los mejores precios en marketplaces verificados como eBay. 
          Te conectamos directamente con vendedores de confianza para que puedas comprar o vender tus coleccionables.
        </p>
      </section>
    </div>
  );
};

export default PricingPage;
