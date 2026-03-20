import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, TrendingUp, ExternalLink, ShieldCheck, X, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import CategoryPlaceholder from "@/components/CategoryPlaceholder";
import GradeSelector, { type GradeSelection, getGradeLabel } from "@/components/GradeSelector";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { IdentifyResponse, OfficialImage } from "@/lib/api/identifyCollectible";
import { addToCollection } from "@/lib/api/collection";

const ImageLightbox = ({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4"
    onClick={onClose}
  >
    <button onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
      <X size={20} />
    </button>
    <motion.img
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      src={src}
      alt={alt}
      className="max-h-[85vh] max-w-full rounded-xl object-contain"
      onClick={(e) => e.stopPropagation()}
    />
  </motion.div>
);

const rarityColors: Record<string, string> = {
  "Común": "bg-muted text-muted-foreground",
  "Poco Común": "bg-secondary text-secondary-foreground",
  "Raro": "bg-blue-500/20 text-blue-400",
  "Muy Raro": "bg-purple-500/20 text-purple-400",
  "Ultra Raro": "bg-primary/20 text-primary",
};

const ResultsPage = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<IdentifyResponse | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<OfficialImage | null>(null);
  const [showCandidates, setShowCandidates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [grade, setGrade] = useState<GradeSelection>({ company: null, value: null });

  useEffect(() => {
    const stored = sessionStorage.getItem('scanResult');
    const photo = sessionStorage.getItem('userPhoto');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as IdentifyResponse;
        setResult(parsed);
        setSelectedImage(parsed.officialImage || null);
        if (parsed.needsConfirmation && parsed.candidates.length > 0) {
          setShowCandidates(true);
        }
      } catch { /* ignore */ }
    }
    if (photo) setUserPhoto(photo);
    if (!stored) navigate('/scan');
  }, [navigate]);

  if (!result?.identification) return null;

  const id = result.identification;
  const img = selectedImage;
  const confidencePct = Math.round((id.confidence || 0) * 100);
  const isLowConfidence = id.confidence < 0.7;

  const handleSelectCandidate = (candidate: OfficialImage) => {
    setSelectedImage(candidate);
    setShowCandidates(false);
  };

  return (
    <div className="min-h-screen px-6 pb-24 pt-12">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/scan')} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-secondary/80">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-serif text-2xl font-bold">Resultado</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            {isLowConfidence ? (
              <><AlertTriangle size={12} className="text-yellow-400" /> Confianza baja: {confidencePct}%</>
            ) : (
              <><CheckCircle2 size={12} className="text-green-400" /> Confianza: {confidencePct}%</>
            )}
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {/* Candidate selection banner */}
        {showCandidates && result.candidates.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 space-y-3"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-yellow-400" />
              <div>
                <p className="text-sm font-semibold">¿Es esta la versión correcta?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No estamos seguros de la edición exacta. Selecciona la carta que coincida con la tuya:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {result.candidates.map((candidate) => (
                <button
                  key={candidate.cardId}
                  onClick={() => handleSelectCandidate(candidate)}
                  className={`rounded-lg border-2 p-1 transition-all ${
                    selectedImage?.cardId === candidate.cardId
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <img
                    src={candidate.imageUrl}
                    alt={`${candidate.name} ${candidate.setName}`}
                    className="w-full aspect-[3/4] rounded object-contain bg-secondary"
                  />
                  <p className="text-[9px] text-muted-foreground mt-1 truncate">{candidate.setName}</p>
                  <p className="text-[9px] text-muted-foreground">#{candidate.number}</p>
                </button>
              ))}
            </div>

            {selectedImage && (
              <Button size="sm" className="w-full" onClick={() => setShowCandidates(false)}>
                <CheckCircle2 size={14} className="mr-1" /> Confirmar selección
              </Button>
            )}
          </motion.div>
        )}

        {/* Image comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tu foto</p>
            <div className="aspect-[3/4] overflow-hidden rounded-xl border border-border">
              {userPhoto ? (
                <img src={userPhoto} alt="Tu foto" className="h-full w-full object-cover cursor-zoom-in" onClick={() => setLightboxSrc(userPhoto)} />
              ) : (
                <CategoryPlaceholder category={id.category} className="h-full w-full" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Imagen oficial</p>
              {result.candidates.length > 1 && !showCandidates && (
                <button onClick={() => setShowCandidates(true)} className="text-[10px] text-primary hover:underline">
                  Cambiar versión
                </button>
              )}
            </div>
            <div className="aspect-[3/4] overflow-hidden rounded-xl border border-border bg-secondary">
              {img?.imageUrl ? (
                <img src={img.imageUrl} alt={id.name} className="h-full w-full object-contain p-1 cursor-zoom-in" onClick={() => setLightboxSrc(img.imageUrl)} />
              ) : (
                <CategoryPlaceholder category={id.category} className="h-full w-full" />
              )}
            </div>
          </div>
        </motion.div>

        {/* Attribution */}
        {img && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="flex items-start gap-2 rounded-lg bg-secondary/50 p-3"
          >
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-green-400" />
            <div>
              <p className="text-[10px] text-muted-foreground">{img.attribution}</p>
              {img.setName && <p className="text-[10px] text-muted-foreground mt-0.5">{img.setName} · #{img.number} · ID: {img.cardId}</p>}
              <a href={img.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-0.5">
                <ExternalLink size={8} /> {img.source}
              </a>
            </div>
          </motion.div>
        )}

        {/* Details card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={rarityColors[id.rarity] || 'bg-muted text-muted-foreground'}>{id.rarity}</Badge>
            <span className="text-xs text-muted-foreground">{id.category}</span>
            <span className="text-xs text-muted-foreground">· {id.year}</span>
            {id.variant && <Badge variant="outline" className="text-[10px]">{id.variant}</Badge>}
          </div>

          <h2 className="font-serif text-2xl font-bold">{id.name}</h2>
          <p className="text-sm text-muted-foreground">{id.set_or_edition} · {id.catalog_id}</p>
          <p className="text-sm text-muted-foreground">{id.description}</p>

          <div className="flex items-center justify-between rounded-xl bg-primary/10 p-4">
            <div>
              <p className="text-xs text-muted-foreground">Valor estimado</p>
              <p className="text-3xl font-bold text-primary">${id.estimated_value_usd.toLocaleString()}</p>
            </div>
            <TrendingUp size={28} className="text-primary" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-secondary p-3 text-center">
              <p className="text-xs text-muted-foreground">Condición</p>
              <p className="mt-1 text-sm font-semibold">{id.condition_estimate}</p>
            </div>
            <div className="rounded-lg bg-secondary p-3 text-center">
              <p className="text-xs text-muted-foreground">Año</p>
              <p className="mt-1 text-sm font-semibold">{id.year}</p>
            </div>
            <div className="rounded-lg bg-secondary p-3 text-center">
              <p className="text-xs text-muted-foreground">Confianza</p>
              <p className="mt-1 text-sm font-semibold">{confidencePct}%</p>
            </div>
          </div>

          {id.special_features.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Características</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {id.special_features.map((f) => (
                  <span key={f} className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{f}</span>
                ))}
              </div>
            </div>
          )}

          {/* Grade selector */}
          <GradeSelector value={grade} onChange={setGrade} />

          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              className="flex-1 gap-1"
              disabled={saving || saved}
              onClick={async () => {
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
              }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : <Plus size={14} />}
              {saved ? "Añadido" : "Añadir a colección"}
            </Button>
            <Button size="sm" variant="outline" className="gap-1">
              <ExternalLink size={14} /> Mercado
            </Button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {lightboxSrc && (
          <ImageLightbox src={lightboxSrc} alt={id.name} onClose={() => setLightboxSrc(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResultsPage;
