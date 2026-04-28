import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Sun, Moon, Crown, User, Globe, DollarSign, Bell,
  Shield, FileText, HelpCircle, Info, LogOut, LogIn, Trash2, Sparkles, Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth, FREE_SCAN_LIMIT } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const STORAGE_PREFS = "colecscan-prefs";

interface Prefs {
  language: "es" | "en";
  currency: "USD" | "EUR";
  notifications: boolean;
}

const defaultPrefs: Prefs = { language: "es", currency: "USD", notifications: true };

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, profile, isPremium, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const [prefs, setPrefs] = useState<Prefs>(() => {
    if (typeof window === "undefined") return defaultPrefs;
    try {
      return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(STORAGE_PREFS) || "{}") };
    } catch {
      return defaultPrefs;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFS, JSON.stringify(prefs));
  }, [prefs]);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Sesión cerrada");
    navigate("/");
  };

  const scansUsed = profile?.scans_used_this_month || 0;
  const scansPct = isPremium ? 100 : Math.min(100, (scansUsed / FREE_SCAN_LIMIT) * 100);

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="font-serif text-2xl font-bold">Ajustes</h1>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* CUENTA Y SESIÓN */}
        <Section title="Cuenta y sesión" icon={User}>
          {user ? (
            <>
              <Row label="Email" value={user.email || "—"} />
              <Row label="Plan" value={
                <span className="flex items-center gap-1.5">
                  {isPremium ? <Crown size={14} className="text-primary" /> : null}
                  {isPremium ? "Premium" : "Gratis"}
                </span>
              } />
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut size={16} />
                Cerrar sesión
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-destructive transition-colors hover:bg-destructive/10">
                    <Trash2 size={16} />
                    Eliminar cuenta
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar tu cuenta?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción es permanente. Se eliminarán tu colección y datos asociados.
                      Para completar la eliminación, contacta con soporte.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => toast.info("Solicitud enviada. Te contactaremos por email.")}
                    >
                      Solicitar eliminación
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <button
              onClick={() => navigate("/auth")}
              className="flex w-full items-center gap-3 rounded-xl bg-primary/10 px-3 py-3 text-left text-sm text-primary transition-colors hover:bg-primary/15"
            >
              <LogIn size={16} />
              Iniciar sesión
            </button>
          )}
        </Section>

        {/* PLAN Y USO */}
        <Section title="Plan y uso" icon={Crown}>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Plan actual</p>
                <p className="font-semibold flex items-center gap-1.5">
                  {isPremium ? <Crown size={16} className="text-primary" /> : <Zap size={16} />}
                  {isPremium ? "Premium" : "Gratis"}
                </p>
              </div>
              <Button size="sm" variant={isPremium ? "outline" : "default"} onClick={() => navigate("/pricing")}>
                {isPremium ? "Gestionar" : "Mejorar"}
              </Button>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Escaneos este mes</span>
                <span>
                  {isPremium ? "Ilimitado" : `${scansUsed} / ${FREE_SCAN_LIMIT}`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${scansPct}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full gradient-gold"
                />
              </div>
            </div>
          </div>

          {!isPremium && (
            <button
              onClick={() => navigate("/pricing")}
              className="flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-3 text-left text-sm text-primary transition-colors hover:bg-primary/10"
            >
              <Sparkles size={16} />
              <span className="flex-1">Hazte Premium — escaneos ilimitados</span>
            </button>
          )}
        </Section>

        {/* PREFERENCIAS */}
        <Section title="Preferencias" icon={Globe}>
          {/* Tema */}
          <div className="space-y-2">
            <p className="px-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tema</p>
            <div className="grid grid-cols-2 gap-2">
              <ThemeOption
                active={theme === "light"}
                onClick={() => setTheme("light")}
                icon={Sun}
                label="Claro"
              />
              <ThemeOption
                active={theme === "dark"}
                onClick={() => setTheme("dark")}
                icon={Moon}
                label="Oscuro"
              />
            </div>
          </div>

          {/* Idioma */}
          <RowControl label="Idioma" icon={Globe}>
            <Select value={prefs.language} onValueChange={(v: "es" | "en") => setPrefs({ ...prefs, language: v })}>
              <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </RowControl>

          {/* Moneda */}
          <RowControl label="Moneda" icon={DollarSign}>
            <Select value={prefs.currency} onValueChange={(v: "USD" | "EUR") => setPrefs({ ...prefs, currency: v })}>
              <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
              </SelectContent>
            </Select>
          </RowControl>

          {/* Notificaciones */}
          <RowControl label="Notificaciones" icon={Bell}>
            <Switch
              checked={prefs.notifications}
              onCheckedChange={(v) => setPrefs({ ...prefs, notifications: v })}
            />
          </RowControl>
        </Section>

        {/* PRIVACIDAD Y SOPORTE */}
        <Section title="Privacidad y soporte" icon={Shield}>
          <LinkRow icon={Shield} label="Política de privacidad" onClick={() => toast.info("Próximamente")} />
          <LinkRow icon={FileText} label="Términos de servicio" onClick={() => toast.info("Próximamente")} />
          <LinkRow icon={HelpCircle} label="Centro de ayuda" onClick={() => toast.info("Próximamente")} />
          <LinkRow icon={Info} label="Versión" right="1.0.0" />
        </Section>
      </div>
    </div>
  );
};

/* ── helpers ─────────────────────────────────────────── */

const Section = ({
  title, icon: Icon, children,
}: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <section>
    <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon size={12} />
      {title}
    </h2>
    <div className="glass rounded-2xl p-2 space-y-1">{children}</div>
  </section>
);

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-center justify-between rounded-xl px-3 py-3">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium">{value}</span>
  </div>
);

const RowControl = ({
  label, icon: Icon, children,
}: { label: string; icon: React.ElementType; children: React.ReactNode }) => (
  <div className="flex items-center justify-between rounded-xl px-3 py-2.5">
    <div className="flex items-center gap-3">
      <Icon size={16} className="text-muted-foreground" />
      <span className="text-sm">{label}</span>
    </div>
    {children}
  </div>
);

const LinkRow = ({
  icon: Icon, label, right, onClick,
}: { icon: React.ElementType; label: string; right?: string; onClick?: () => void }) => (
  <button
    onClick={onClick}
    disabled={!onClick}
    className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors hover:bg-secondary/50 disabled:cursor-default disabled:hover:bg-transparent"
  >
    <div className="flex items-center gap-3">
      <Icon size={16} className="text-muted-foreground" />
      <span className="text-sm">{label}</span>
    </div>
    {right && <span className="text-xs text-muted-foreground">{right}</span>}
  </button>
);

const ThemeOption = ({
  active, onClick, icon: Icon, label,
}: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all ${
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-border/50 bg-card/50 text-foreground hover:border-border"
    }`}
  >
    <Icon size={22} />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

export default SettingsPage;
