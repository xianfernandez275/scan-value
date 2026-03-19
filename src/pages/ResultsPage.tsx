import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, TrendingUp, Star, ExternalLink, ShieldCheck, ImageOff, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { IdentifyResponse } from "@/lib/api/identifyCollectible";

const ImageLightbox = ({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) => (
  <AnimatePresence>
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
  </AnimatePresence>
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

  useEffect(() => {
    const stored = sessionStorage.getItem('scanResult');
    const photo = sessionStorage.getItem('userPhoto');
    if (stored) {
      try { setResult(JSON.parse(stored)); } catch { /* ignore */ }
    }
    if (photo) setUserPhoto(photo);

    if (!stored) navigate('/scan');
  }, [navigate]);

  if (!result?.identification) return null;

  const id = result.identification;
  const img = result.officialImage;
  const confidencePct = Math.round((id.confidence || 0) * 100);

  return (
    <div className="min-h-screen px-6 pb-24 pt-12">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/scan')} className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-secondary/80">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-serif text-2xl font-bold">Resultado</h1>
          <p className="text-sm text-muted-foreground">Confianza: {confidencePct}%</p>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {/* Image comparison: user photo vs official */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          {/* User photo */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tu foto</p>
            <div className="aspect-[3/4] overflow-hidden rounded-xl border border-border">
              {userPhoto ? (
                <img src={userPhoto} alt="Tu foto" className="h-full w-full object-cover cursor-zoom-in" onClick={() => setLightboxSrc(userPhoto)} />
              ) : (
                <div className="flex h-full items-center justify-center bg-secondary">
                  <ImageOff className="text-muted-foreground" />
                </div>
              )}
            </div>
          </div>

          {/* Official image */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Imagen oficial</p>
            <div className="aspect-[3/4] overflow-hidden rounded-xl border border-border bg-secondary">
              {img?.imageUrl ? (
                <img src={img.imageUrl} alt={id.name} className="h-full w-full object-contain p-1 cursor-zoom-in" onClick={() => setLightboxSrc(img.imageUrl)} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground p-4 text-center">
                  <ImageOff size={32} />
                  <p className="text-xs">Imagen oficial no disponible</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Attribution */}
        {img && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-start gap-2 rounded-lg bg-secondary/50 p-3"
          >
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-green-400" />
            <div>
              <p className="text-[10px] text-muted-foreground">{img.attribution}</p>
              <a href={img.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1 mt-0.5">
                <ExternalLink size={8} /> {img.source}
              </a>
            </div>
          </motion.div>
        )}

        {/* Identification details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={rarityColors[id.rarity] || 'bg-muted text-muted-foreground'}>{id.rarity}</Badge>
            <span className="text-xs text-muted-foreground">{id.category}</span>
            <span className="text-xs text-muted-foreground">· {id.year}</span>
          </div>

          <h2 className="font-serif text-2xl font-bold">{id.name}</h2>
          <p className="text-sm text-muted-foreground">{id.set_or_edition} · {id.catalog_id}</p>
          <p className="text-sm text-muted-foreground">{id.description}</p>

          {/* Value */}
          <div className="flex items-center justify-between rounded-xl bg-primary/10 p-4">
            <div>
              <p className="text-xs text-muted-foreground">Valor estimado</p>
              <p className="text-3xl font-bold text-primary">${id.estimated_value_usd.toLocaleString()}</p>
            </div>
            <TrendingUp size={28} className="text-primary" />
          </div>

          {/* Stats grid */}
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

          {/* Special features */}
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

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button size="sm" className="flex-1 gap-1">
              <Plus size={14} /> Añadir a colección
            </Button>
            <Button size="sm" variant="outline" className="gap-1">
              <ExternalLink size={14} /> Mercado
            </Button>
          </div>
        </motion.div>
      </div>

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} alt={id.name} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
};

export default ResultsPage;
