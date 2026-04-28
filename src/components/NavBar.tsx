import { Link, useLocation, useNavigate } from "react-router-dom";
import { Camera, Home, BookOpen, Search, MoreHorizontal, User, Crown, TrendingUp, LogOut, LogIn, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

const NavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isPremium, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Inicio", icon: Home },
    { path: "/scan", label: "Escanear", icon: Camera },
    { path: "/search", label: "Buscar", icon: Search },
    { path: "/collection", label: "Colección", icon: BookOpen },
  ];

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    toast.success("Sesión cerrada");
    navigate("/");
  };

  const moreActive = !navItems.some((i) => i.path === location.pathname);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around px-4 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
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
              <Icon size={22} className={isActive ? "text-primary" : "text-muted-foreground"} />
              <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Options sheet trigger */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="relative flex flex-col items-center gap-1 px-3 py-2 transition-colors"
              aria-label="Más opciones"
            >
              {moreActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-1 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full gradient-gold"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <MoreHorizontal size={22} className={moreActive ? "text-primary" : "text-muted-foreground"} />
              <span className={`text-[10px] font-medium ${moreActive ? "text-primary" : "text-muted-foreground"}`}>
                Más
              </span>
            </button>
          </SheetTrigger>

          <SheetContent
            side="bottom"
            className="glass rounded-t-3xl border-t border-border/60 px-4 pb-8 pt-4 max-h-[85vh]"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />
            <SheetHeader className="text-left">
              <SheetTitle className="font-serif text-xl">Opciones</SheetTitle>
            </SheetHeader>

            {/* Account block */}
            <div className="mt-4 rounded-2xl bg-secondary/50 p-3">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <User size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user.email}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      {isPremium ? (
                        <><Crown size={11} className="text-primary" /> Plan Premium</>
                      ) : (
                        <>Plan Gratis</>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => go("/auth")}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <LogIn size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Iniciar sesión</p>
                    <p className="text-[11px] text-muted-foreground">Accede a tu cuenta</p>
                  </div>
                </button>
              )}
            </div>

            {/* Quick actions grid */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <SheetAction icon={Camera} label="Escanear" onClick={() => go("/scan")} />
              <SheetAction icon={Search} label="Buscar" onClick={() => go("/search")} />
              <SheetAction icon={BookOpen} label="Colección" onClick={() => go("/collection")} />
              <SheetAction icon={TrendingUp} label="Mercado" onClick={() => go("/market")} />
              <SheetAction
                icon={isPremium ? Crown : Sparkles}
                label={isPremium ? "Mi plan" : "Premium"}
                onClick={() => go("/pricing")}
                highlight={!isPremium}
              />
              <SheetAction icon={Home} label="Inicio" onClick={() => go("/")} />
            </div>

            {/* Sign out */}
            {user && (
              <button
                onClick={handleSignOut}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

interface SheetActionProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  onClick: () => void;
  highlight?: boolean;
}

const SheetAction = ({ icon: Icon, label, onClick, highlight }: SheetActionProps) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 transition-all active:scale-95 ${
      highlight
        ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
        : "border-border/50 bg-card/50 hover:bg-card"
    }`}
  >
    <Icon size={20} className={highlight ? "text-primary" : "text-foreground"} />
    <span className="text-[11px] font-medium">{label}</span>
  </button>
);

export default NavBar;
