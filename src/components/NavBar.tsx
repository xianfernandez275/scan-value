import { Link, useLocation } from "react-router-dom";
import { Camera, Home, BookOpen, TrendingUp, Search, User, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const NavBar = () => {
  const location = useLocation();
  const { user, isPremium } = useAuth();

  const navItems = [
    { path: "/", label: "Inicio", icon: Home },
    { path: "/scan", label: "Escanear", icon: Camera },
    { path: "/search", label: "Buscar", icon: Search },
    { path: "/collection", label: "Colección", icon: BookOpen },
    { path: user ? "/pricing" : "/auth", label: user ? (isPremium ? "Premium" : "Upgrade") : "Cuenta", icon: user ? (isPremium ? Crown : User) : User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around px-4 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path + item.label}
              to={item.path}
              className="relative flex flex-col items-center gap-1 px-3 py-2 transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-1 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full gradient-gold"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                size={22}
                className={isActive ? "text-primary" : "text-muted-foreground"}
              />
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default NavBar;
