import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, Plus, X, CheckCircle2,
  AlertTriangle, Loader2, ExternalLink, ShieldCheck, Lock, Zap,
  ChevronDown, ChevronUp, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import CategoryPlaceholder from "@/components/CategoryPlaceholder";
import GradeSelector, { type GradeSelection } from "@/components/GradeSelector";
import CoinDetailsForm, { type CoinRefinement } from "@/components/CoinDetailsForm";
import { addToCollection } from "@/lib/api/collection";
import { refineCoinIdentification } from "@/lib/api/identifyCollectible";
import type { IdentifyResponse, OfficialImage, MarketData } from "@/lib/api/identifyCollectible";

/* ── helpers ─────────────────────────────────────────── */

import { getRarityColor } from "@/lib/rarityColors";

const TrendIcon = ({ trend }: { trend?: string }) => {
  if (trend === "up") return <TrendingUp size={14} className="text-green-400" />;
  if (trend === "down") return <TrendingDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-muted-foreground" />;
};

const trendLabel: Record<string, string> = {
  up: "Subiendo",
  down: "Bajando",
  stable: "Estable",
};

/* ── fake price history for premium preview ──────────── */
const fakePriceHistory = (base: number) =>
  Array.from({ length: 12 }, (_, i) => ({
    month: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][i],
    price: Math.round(base * (0.8 + Math.random() * 0.4)),
  }));

/* ── premium blur overlay ────────────────────────────── */
const PremiumLock = ({ label }: { label: string }) => (
  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-card/70 backdrop-blur-sm">
    <Lock size={20} className="text-primary" />
    <p className="text-xs font-semibold text-primary">Disponible en Premium</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);

/* ── mini bar chart ──────────────────────────────────── */
const MiniChart = ({ data }: { data: { month: string; price: number }[] }) => {
  const max = Math.max(...data.map((d) => d.price));
  return (
    <div className="flex items-end gap-1 h-20">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-0.5">
          <div
            className="w-full rounded-t bg-primary/60 min-h-[2px] transition-all"
            style={{ height: `${(d.price / max) * 100}%` }}
          />
          <span className="text-[7px] text-muted-foreground">{d.month}</span>
        </div>
      ))}
    </div>
  );
};

/* ── collection value estimator (premium) ────────────── */
const CollectionValueAdd = ({ value }: { value: number }) => (
  <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
    <TrendingUp size={16} className="text-primary shrink-0" />
    <div>
      <p className="text-[10px] text-muted-foreground">Valor estimado de tu colección tras añadir</p>
      <p className="text-sm font-bold text-primary">+${value.toLocaleString()} USD</p>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════ */

interface ScanResultModalProps {
  open: boolean;
  onClose: () => void;
  result: IdentifyResponse;
  userPhoto: string | null;
  onResultUpdate?: (r: IdentifyResponse) => void;
}

const ScanResultModal = ({ open, onClose, result, userPhoto, onResultUpdate }: ScanResultModalProps) => {
  const navigate = useNavigate();
  const { isPremium, user } = useAuth();

  const [selectedImage, setSelectedImage] = useState<OfficialImage | null>(result.officialImage || null);
  const [showCandidates, setShowCandidates] = useState(result.needsConfirmation && result.candidates.length > 0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [grade, setGrade] = useState<GradeSelection>({ company: null, value: null });
  const [refiningCoin, setRefiningCoin] = useState(false);
  const [showGrade, setShowGrade] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const id = result.identification;
  const img = selectedImage;
  const confidencePct = Math.round((id.confidence || 0) * 100);
  const isLowConfidence = id.confidence < 0.7;
  const isCoin = id.category === "Monedas";
  const market = result.marketData;
  const priceHistory = fakePriceHistory(id.estimated_value_usd);

  /* handlers */
  const handleSelectCandidate = (c: OfficialImage) => {
    setSelectedImage(c);
    setShowCandidates(false);
  };

  const handleCoinRefine = async (refinement: CoinRefinement) => {
    setRefiningCoin(true);
    try {
      const refined = await refineCoinIdentification(refinement, id);
      onResultUpdate?.(refined);
      setSelectedImage(refined.officialImage || null);
      if (refined.needsConfirmation && refined.candidates.length > 0) setShowCandidates(true);
      toast.success("Resultados actualizados");
    } catch (err: any) {
      toast.error("Error al refinar: " + err.message);
    } finally {
      setRefiningCoin(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await addToCollection(id, selectedImage, userPhoto, grade.company, grade.value);
      setSaved(true);
      toast.success("Artículo añadido a tu colección");
    } catch (err: any) {
      toast.error("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    onClose();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl border-t border-border p-0 overflow-hidden">
          {/* drag indicator */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="overflow-y-auto h-[calc(92vh-3rem)] px-5 pb-32 space-y-5">
            {/* ── confidence badge ─── */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isLowConfidence ? (
                  <Badge variant="outline" className="gap-1 text-yellow-400 border-yellow-400/30">
                    <AlertTriangle size={10} /> {confidencePct}%
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-green-400 border-green-400/30">
                    <CheckCircle2 size={10} /> {confidencePct}%
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">{id.category}</span>
              </div>
            </div>

            {/* ── image comparison ─── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tu foto</p>
                <div
                  className="aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-secondary cursor-zoom-in"
                  onClick={() => userPhoto && setLightboxSrc(userPhoto)}
                >
                  {userPhoto ? (
                    <img src={userPhoto} alt="Tu foto" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <CategoryPlaceholder category={id.category} className="h-12 w-12 opacity-30" />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Oficial</p>
                  {result.candidates.length > 1 && !showCandidates && (
                    <button onClick={() => setShowCandidates(true)} className="text-[9px] text-primary hover:underline">
                      Cambiar
                    </button>
                  )}
                </div>
                <div
                  className="aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-secondary cursor-zoom-in"
                  onClick={() => img?.imageUrl && setLightboxSrc(img.imageUrl)}
                >
                  {img?.imageUrl ? (
                    <img src={img.imageUrl} alt={id.name} className="h-full w-full object-contain p-1" />
                  ) : (
                    <CategoryPlaceholder category={id.category} className="h-full w-full" />
                  )}
                </div>
              </div>
            </div>

            {/* ── candidate picker ─── */}
            <AnimatePresence>
              {showCandidates && result.candidates.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-2">
                    <p className="text-xs font-semibold flex items-center gap-1">
                      <AlertTriangle size={12} className="text-yellow-400" /> Selecciona la versión correcta
                    </p>
                    <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
                      {result.candidates.map((c) => (
                        <button
                          key={c.cardId}
                          onClick={() => handleSelectCandidate(c)}
                          className={`rounded-lg border-2 p-0.5 transition-all ${
                            selectedImage?.cardId === c.cardId
                              ? "border-primary ring-1 ring-primary/30"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <img src={c.imageUrl} alt={c.name} className="w-full aspect-[3/4] rounded object-contain bg-secondary" />
                          <p className="text-[7px] text-muted-foreground mt-0.5 truncate">{c.setName}</p>
                        </button>
                      ))}
                    </div>
                    <Button size="sm" className="w-full h-7 text-xs" onClick={() => setShowCandidates(false)}>
                      <CheckCircle2 size={12} className="mr-1" /> Confirmar
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── coin refinement ─── */}
            {isCoin && (
              <CoinDetailsForm
                initialName={id.name}
                initialYear={id.year}
                onRefine={handleCoinRefine}
                onManualSearch={async () => {}}
                loading={refiningCoin}
              />
            )}

            {/* ── item info card ─── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={rarityColor[id.rarity] || "bg-muted text-muted-foreground"}>{id.rarity}</Badge>
                {id.variant && <Badge variant="outline" className="text-[10px]">{id.variant}</Badge>}
              </div>

              <h2 className="font-serif text-xl font-bold leading-tight">{id.name}</h2>
              <p className="text-xs text-muted-foreground">{id.set_or_edition} · {id.year} · {id.catalog_id}</p>

              {/* price */}
              <div className="flex items-center justify-between rounded-2xl bg-primary/10 p-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Precio estimado</p>
                  <p className="text-2xl font-bold text-primary">${id.estimated_value_usd.toLocaleString()}</p>
                </div>
                <TrendingUp size={24} className="text-primary" />
              </div>

              {/* basic stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-secondary p-2.5 text-center">
                  <p className="text-[9px] text-muted-foreground">Condición</p>
                  <p className="text-xs font-semibold mt-0.5">{id.condition_estimate}</p>
                </div>
                <div className="rounded-xl bg-secondary p-2.5 text-center">
                  <p className="text-[9px] text-muted-foreground">Año</p>
                  <p className="text-xs font-semibold mt-0.5">{id.year}</p>
                </div>
                <div className="rounded-xl bg-secondary p-2.5 text-center">
                  <p className="text-[9px] text-muted-foreground">Confianza</p>
                  <p className="text-xs font-semibold mt-0.5">{confidencePct}%</p>
                </div>
              </div>

              {id.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{id.description}</p>
              )}
            </div>

            {/* ═══════════════════════════════════════════
                PREMIUM SECTION
               ═══════════════════════════════════════════ */}

            {/* Price History Chart */}
            <div className="relative">
              {!isPremium && <PremiumLock label="Historial de precios" />}
              <div className={`rounded-2xl border border-border p-4 space-y-2 ${!isPremium ? "blur-sm pointer-events-none select-none" : ""}`}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">📈 Historial de precios</h4>
                <MiniChart data={priceHistory} />
              </div>
            </div>

            {/* Market Data */}
            <div className="relative">
              {!isPremium && <PremiumLock label="Datos de mercado completos" />}
              <div className={`rounded-2xl border border-border p-4 space-y-3 ${!isPremium ? "blur-sm pointer-events-none select-none" : ""}`}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">📊 Mercado</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">Mínimo</p>
                    <p className="text-sm font-bold text-green-400">${market?.lowPrice?.toLocaleString() ?? Math.round(id.estimated_value_usd * 0.7).toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">Promedio</p>
                    <p className="text-sm font-bold">${market?.averagePrice?.toLocaleString() ?? id.estimated_value_usd.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">Máximo</p>
                    <p className="text-sm font-bold text-red-400">${market?.highPrice?.toLocaleString() ?? Math.round(id.estimated_value_usd * 1.4).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  <TrendIcon trend={market?.trending} />
                  <span className="text-xs">{trendLabel[market?.trending ?? "stable"] ?? "Estable"}</span>
                </div>
              </div>
            </div>

            {/* Price Prediction */}
            <div className="relative">
              {!isPremium && <PremiumLock label="Predicción de precio" />}
              <div className={`rounded-2xl border border-border p-4 space-y-2 ${!isPremium ? "blur-sm pointer-events-none select-none" : ""}`}>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">🔮 Predicción</h4>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[9px] text-muted-foreground">En 6 meses</p>
                    <p className="text-lg font-bold text-primary">${Math.round(id.estimated_value_usd * 1.12).toLocaleString()}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] text-muted-foreground">En 1 año</p>
                    <p className="text-lg font-bold text-primary">${Math.round(id.estimated_value_usd * 1.25).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Unlock Premium CTA (only for free users) */}
            {!isPremium && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 p-4 text-center space-y-2"
              >
                <p className="text-sm font-semibold">Desbloquea todo el potencial</p>
                <p className="text-xs text-muted-foreground">Historial, tendencias, predicciones y más</p>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => navigate(user ? "/pricing" : "/auth")}
                >
                  <Zap size={14} /> Desbloquear Premium
                </Button>
              </motion.div>
            )}

            {/* Collection value add (premium only) */}
            {isPremium && <CollectionValueAdd value={id.estimated_value_usd} />}

            {/* Grade selector (collapsible) */}
            <div>
              <button
                onClick={() => setShowGrade(!showGrade)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil size={12} />
                Grado / Condición
                {showGrade ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              <AnimatePresence>
                {showGrade && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden pt-2"
                  >
                    <GradeSelector value={grade} onChange={setGrade} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Attribution */}
            {img && (
              <div className="flex items-start gap-2 rounded-xl bg-secondary/40 p-2.5">
                <ShieldCheck size={12} className="mt-0.5 shrink-0 text-green-400" />
                <div>
                  <p className="text-[9px] text-muted-foreground">{img.attribution}</p>
                  {img.setName && (
                    <p className="text-[9px] text-muted-foreground">{img.setName} · #{img.number}</p>
                  )}
                  <a href={img.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline flex items-center gap-0.5 mt-0.5">
                    <ExternalLink size={7} /> {img.source}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* ── sticky action bar ─── */}
          <div className="absolute bottom-0 inset-x-0 bg-background/95 backdrop-blur-md border-t border-border px-5 py-4 pb-6 flex gap-2">
            <Button
              className="flex-1 gap-1.5 h-11"
              disabled={saving || saved}
              onClick={handleSave}
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : saved ? (
                <CheckCircle2 size={16} />
              ) : (
                <Plus size={16} />
              )}
              {saved ? "Añadido ✓" : "Añadir a colección"}
            </Button>
            <Button variant="outline" className="h-11 px-5" onClick={handleDiscard}>
              <X size={16} />
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 backdrop-blur-md p-4"
            onClick={() => setLightboxSrc(null)}
          >
            <button
              onClick={() => setLightboxSrc(null)}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-secondary"
            >
              <X size={20} />
            </button>
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              src={lightboxSrc}
              alt="Zoom"
              className="max-h-[85vh] max-w-full rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ScanResultModal;
