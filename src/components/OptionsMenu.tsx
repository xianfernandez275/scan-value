import { Menu, User, BookOpen, TrendingUp, Crown, Search, Camera, LogOut, LogIn, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

export default function OptionsMenu() {
  const navigate = useNavigate();
  const { user, profile, isPremium, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Sesión cerrada");
    navigate("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="glass h-10 w-10 rounded-full border-border/60 backdrop-blur-xl"
          aria-label="Abrir menú"
        >
          <Menu size={18} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60 glass">
        {user ? (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                <User size={16} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium truncate">{user.email}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  {isPremium ? (
                    <><Crown size={10} className="text-primary" /> Plan Premium</>
                  ) : (
                    <>Plan Gratis</>
                  )}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        ) : (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              No has iniciado sesión
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={() => navigate("/scan")} className="cursor-pointer gap-2">
          <Camera size={16} className="text-muted-foreground" />
          <span>Escanear</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/search")} className="cursor-pointer gap-2">
          <Search size={16} className="text-muted-foreground" />
          <span>Buscar</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/collection")} className="cursor-pointer gap-2">
          <BookOpen size={16} className="text-muted-foreground" />
          <span>Mi colección</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/market")} className="cursor-pointer gap-2">
          <TrendingUp size={16} className="text-muted-foreground" />
          <span>Mercado</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {!isPremium && (
          <DropdownMenuItem
            onClick={() => navigate("/pricing")}
            className="cursor-pointer gap-2 text-primary focus:text-primary"
          >
            <Sparkles size={16} />
            <span>Hazte Premium</span>
          </DropdownMenuItem>
        )}
        {isPremium && (
          <DropdownMenuItem onClick={() => navigate("/pricing")} className="cursor-pointer gap-2">
            <Crown size={16} className="text-primary" />
            <span>Mi plan Premium</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {user ? (
          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
          >
            <LogOut size={16} />
            <span>Cerrar sesión</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => navigate("/auth")} className="cursor-pointer gap-2">
            <LogIn size={16} />
            <span>Iniciar sesión</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
