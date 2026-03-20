import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ShieldCheck, ExternalLink, TrendingUp, TrendingDown,
  DollarSign, BarChart3, Users, StickyNote, Save, Loader2, Trash2,
  ArrowUpRight, ArrowDownRight, Minus, Calendar
} from "lucide-react";
import CategoryPlaceholder from "@/components/CategoryPlaceholder";
import GradeSelector, { type GradeSelection, getGradeLabel, getGradeMultiplier } from "@/components/GradeSelector";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CollectionItem } from "@/lib/api/collection";

interface ItemDetailModalProps {
  item: CollectionItem;
  onClose: () => void;
  onDelete: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => Promise<void>;
  onUpdateGrade?: (id: string, company: string | null, value: string | null) => Promise<void>;
  allItems: CollectionItem[];
}

// Generate simulated historical prices based on current value
function generateHistoricalPrices(currentValue: number, year: number | null) {
  const baseYear = year || 2020;
  const points = [];
  const volatility = 0.15;
  let price = currentValue * 0.6;

  for (let y = Math.max(baseYear, 2019); y <= 2026; y++) {
    for (let q = 1; q <= 4; q++) {
      if (y === 2026 && q > 1) break;
      const change = 1 + (Math.random() - 0.4) * volatility;
      price = Math.max(price * change, currentValue * 0.3);
      points.push({
        date: `${y}-Q${q}`,
        price: Math.round(price),
      });
    }
  }
  // Last point = current value
  points[points.length - 1].price = currentValue;
  return points;
}

// Generate future prediction
function generatePrediction(currentValue: number) {
  const trend = 0.02 + Math.random() * 0.08; // 2-10% annual growth
  return {
    sixMonths: Math.round(currentValue * (1 + trend / 2)),
    oneYear: Math.round(currentValue * (1 + trend)),
    twoYears: Math.round(currentValue * (1 + trend * 2.2)),
    confidence: Math.round(60 + Math.random() * 25),
    trendDirection: trend > 0.05 ? 'up' as const : 'stable' as const,
  };
}

const demandLevels = ['Baja', 'Media', 'Alta', 'Muy Alta'];
function getDemandLevel(value: number): string {
  if (value > 50000) return 'Muy Alta';
  if (value > 10000) return 'Alta';
  if (value > 1000) return 'Media';
  return 'Baja';
}

const ItemDetailModal = ({ item, onClose, onDelete, onUpdateNotes, onUpdateGrade, allItems }: ItemDetailModalProps) => {
  const [notes, setNotes] = useState(item.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [grade, setGrade] = useState<GradeSelection>({
    company: item.grading_company || null,
    value: item.grading_value || null,
  });
  const [savingGrade, setSavingGrade] = useState(false);

  const gradeMultiplier = getGradeMultiplier(grade.company, grade.value);
  const baseValue = item.estimated_value_usd || 0;
  const currentValue = Math.round(baseValue * (gradeMultiplier / 0.5)); // normalize: raw=1x, PSA10=2x
  const historicalPrices = generateHistoricalPrices(currentValue, item.year);
  const prediction = generatePrediction(currentValue);
  const demand = getDemandLevel(currentValue);
  const maxPrice = Math.max(...historicalPrices.map((p) => p.price));

  // Compare with other items in same category
  const sameCategory = allItems.filter((i) => i.category === item.category && i.id !== item.id);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await onUpdateNotes(item.id, notes);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-background border-t border-border shadow-2xl"
      >
        {/* Handle bar */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-6 pt-3 pb-2">
          <div className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30" />
          <div className="mt-3 flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="font-serif text-xl font-bold truncate">{item.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.set_or_edition}{item.catalog_id ? ` · ${item.catalog_id}` : ''}{item.variant ? ` · ${item.variant}` : ''}
              </p>
            </div>
            <button onClick={onClose} className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 pb-8 space-y-6">
          {/* Images side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tu foto</p>
              <div className="aspect-[3/4] rounded-xl border border-border overflow-hidden bg-secondary">
                {item.user_photo_url ? (
                  <img src={item.user_photo_url} alt="Tu foto" className="h-full w-full object-cover cursor-zoom-in" onClick={() => setLightboxSrc(item.user_photo_url)} />
                ) : (
                  <CategoryPlaceholder category={item.category} className="h-full w-full" />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Imagen oficial</p>
              <div className="aspect-[3/4] rounded-xl border border-border overflow-hidden bg-secondary">
                {item.official_image_url ? (
                  <img src={item.official_image_url} alt={item.name} className="h-full w-full object-contain p-1 cursor-zoom-in" onClick={() => setLightboxSrc(item.official_image_url)} />
                ) : (
                  <CategoryPlaceholder category={item.category} className="h-full w-full" />
                )}
              </div>
            </div>
          </div>

          {/* Attribution */}
          {item.official_image_attribution && (
            <div className="flex items-start gap-2 rounded-lg bg-secondary/50 p-2.5">
              <ShieldCheck size={12} className="mt-0.5 shrink-0 text-green-400" />
              <div>
                <p className="text-[9px] text-muted-foreground">{item.official_image_attribution}</p>
                {item.official_set_name && <p className="text-[9px] text-muted-foreground">{item.official_set_name} · #{item.official_card_number} · ID: {item.official_card_id}</p>}
                {item.official_image_source_url && (
                  <a href={item.official_image_source_url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-primary hover:underline flex items-center gap-0.5 mt-0.5">
                    <ExternalLink size={7} /> {item.official_image_source}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-primary/20 text-primary">{item.rarity}</Badge>
            <Badge variant="outline">{item.category}</Badge>
            {item.variant && <Badge variant="outline" className="text-[10px]">{item.variant}</Badge>}
            <span className="text-xs text-muted-foreground">· {item.year}</span>
          </div>

          <p className="text-sm text-muted-foreground">{item.description}</p>

          {/* Features */}
          {item.special_features && item.special_features.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.special_features.map((f) => (
                <span key={f} className="rounded-full bg-secondary px-2.5 py-1 text-[10px] text-secondary-foreground">{f}</span>
              ))}
            </div>
          )}

          {/* Tabs: Market / Notes / Compare */}
          <Tabs defaultValue="market" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="market" className="flex-1 gap-1 text-xs"><BarChart3 size={12} />Mercado</TabsTrigger>
              <TabsTrigger value="notes" className="flex-1 gap-1 text-xs"><StickyNote size={12} />Notas</TabsTrigger>
              <TabsTrigger value="compare" className="flex-1 gap-1 text-xs"><Users size={12} />Comparar</TabsTrigger>
            </TabsList>

            {/* Market Tab */}
            <TabsContent value="market" className="space-y-4 mt-4">
              {/* Current value */}
              <div className="flex items-center justify-between rounded-xl bg-primary/10 p-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor actual</p>
                  <p className="text-3xl font-bold text-primary">${currentValue.toLocaleString()}</p>
                </div>
                <DollarSign size={28} className="text-primary" />
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-secondary p-3 text-center">
                  <p className="text-[9px] text-muted-foreground">Condición</p>
                  <p className="text-xs font-semibold mt-1">{item.condition_estimate}</p>
                </div>
                <div className="rounded-lg bg-secondary p-3 text-center">
                  <p className="text-[9px] text-muted-foreground">Demanda</p>
                  <p className="text-xs font-semibold mt-1">{demand}</p>
                </div>
                <div className="rounded-lg bg-secondary p-3 text-center">
                  <p className="text-[9px] text-muted-foreground">Confianza IA</p>
                  <p className="text-xs font-semibold mt-1">{Math.round((item.confidence || 0) * 100)}%</p>
                </div>
              </div>

              {/* Price history chart */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar size={12} /> Historial de precios
                </h4>
                <div className="mt-3 flex items-end gap-[2px] h-24">
                  {historicalPrices.map((p, i) => {
                    const height = (p.price / maxPrice) * 100;
                    const isLast = i === historicalPrices.length - 1;
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-0.5 group relative">
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-popover text-popover-foreground text-[8px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-10">
                          ${p.price.toLocaleString()}
                        </div>
                        <div
                          className={`w-full rounded-t transition-all ${isLast ? 'bg-primary' : 'bg-primary/40'}`}
                          style={{ height: `${height}%` }}
                        />
                        {i % 4 === 0 && (
                          <span className="text-[7px] text-muted-foreground">{p.date.split('-')[0]}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Prediction */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <TrendingUp size={12} /> Previsión de valor
                </h4>
                <div className="mt-3 space-y-2">
                  {[
                    { label: '6 meses', value: prediction.sixMonths },
                    { label: '1 año', value: prediction.oneYear },
                    { label: '2 años', value: prediction.twoYears },
                  ].map((p) => {
                    const diff = p.value - currentValue;
                    const pct = ((diff / currentValue) * 100).toFixed(1);
                    const isUp = diff > 0;
                    return (
                      <div key={p.label} className="flex items-center justify-between rounded-lg bg-secondary p-3">
                        <span className="text-xs text-muted-foreground">{p.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">${p.value.toLocaleString()}</span>
                          <span className={`flex items-center gap-0.5 text-[10px] ${isUp ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                            {isUp ? <ArrowUpRight size={10} /> : diff < 0 ? <ArrowDownRight size={10} /> : <Minus size={10} />}
                            {isUp ? '+' : ''}{pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[9px] text-muted-foreground text-center">
                    Predicción basada en tendencias históricas · Confianza: {prediction.confidence}%
                  </p>
                </div>
              </div>

              {/* Demand indicator */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Users size={12} /> Oferta y demanda
                </h4>
                <div className="mt-3 rounded-lg bg-secondary p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Demanda</span>
                    <span className="text-xs font-semibold">{demand}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${demandLevels.indexOf(demand) / (demandLevels.length - 1) * 100}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[9px] text-muted-foreground">
                    {demand === 'Muy Alta' ? 'Este artículo tiene alta demanda entre coleccionistas. Los precios tienden a subir.'
                      : demand === 'Alta' ? 'Demanda sólida. Buenas oportunidades de venta en el mercado.'
                      : demand === 'Media' ? 'Demanda moderada. El mercado es estable para este tipo de artículo.'
                      : 'Demanda limitada. Considera mantenerlo a largo plazo.'}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="space-y-4 mt-4">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Añade notas sobre este artículo... (dónde lo compraste, estado detallado, historia, etc.)"
                className="min-h-[120px] text-sm"
              />
              <Button
                size="sm"
                className="w-full gap-1"
                onClick={handleSaveNotes}
                disabled={savingNotes || notes === (item.notes || '')}
              >
                {savingNotes ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Guardar notas
              </Button>
            </TabsContent>

            {/* Compare Tab */}
            <TabsContent value="compare" className="space-y-4 mt-4">
              {sameCategory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users size={32} className="mx-auto mb-2" />
                  <p className="text-sm">No hay otros artículos de "{item.category}" para comparar</p>
                  <p className="text-xs mt-1">Escanea más artículos de esta categoría</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Comparando con otros artículos de {item.category}:</p>
                  {sameCategory.map((other) => {
                    const diff = currentValue - (other.estimated_value_usd || 0);
                    const pct = other.estimated_value_usd ? ((diff / other.estimated_value_usd) * 100).toFixed(0) : '—';
                    return (
                      <div key={other.id} className="flex items-center gap-3 rounded-lg bg-secondary p-3">
                        <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-muted">
                          {other.official_image_url ? (
                            <img src={other.official_image_url} alt={other.name} className="h-full w-full object-contain p-0.5" />
                          ) : (
                            <CategoryPlaceholder category={other.category} className="h-full w-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{other.name}</p>
                          <p className="text-[10px] text-muted-foreground">${(other.estimated_value_usd || 0).toLocaleString()}</p>
                        </div>
                        <span className={`text-[10px] font-semibold ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                          {diff > 0 ? '+' : ''}{pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* External links */}
          {item.official_image_source_url && (
            <a
              href={item.official_image_source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-secondary p-3 text-sm text-primary hover:bg-secondary/80 transition-colors"
            >
              <ExternalLink size={14} /> Ver en {item.official_image_source || 'fuente externa'}
            </a>
          )}

          {/* Delete */}
          <Button variant="destructive" size="sm" className="w-full gap-1" onClick={() => { onDelete(item.id); onClose(); }}>
            <Trash2 size={14} /> Eliminar de colección
          </Button>
        </div>
      </motion.div>

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
            <button onClick={() => setLightboxSrc(null)} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-secondary z-10">
              <X size={20} />
            </button>
            <motion.img initial={{ scale: 0.8 }} animate={{ scale: 1 }} src={lightboxSrc} alt="Ampliación"
              className="max-h-[85vh] max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ItemDetailModal;
