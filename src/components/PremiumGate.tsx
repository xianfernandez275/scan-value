import { motion } from "framer-motion";
import { Lock, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface PremiumGateProps {
  feature: string;
  children: React.ReactNode;
  blur?: boolean;
}

const PremiumGate = ({ feature, children, blur = true }: PremiumGateProps) => {
  const { isPremium, user } = useAuth();
  const navigate = useNavigate();

  if (isPremium) return <>{children}</>;

  return (
    <div className="relative">
      {blur && (
        <div className="pointer-events-none select-none blur-sm opacity-50">
          {children}
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`${blur ? "absolute inset-0" : ""} flex flex-col items-center justify-center gap-3 rounded-xl bg-card/80 backdrop-blur-sm p-6 text-center`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Lock size={24} className="text-primary" />
        </div>
        <h3 className="font-serif text-lg font-semibold">{feature}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Desbloquea esta función con el plan Premium
        </p>
        <Button
          onClick={() => navigate(user ? "/pricing" : "/auth")}
          className="gap-2 mt-1"
        >
          <Zap size={16} />
          {user ? "Ver Planes" : "Crear Cuenta"}
        </Button>
      </motion.div>
    </div>
  );
};

export default PremiumGate;
