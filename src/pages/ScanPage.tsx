import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, X, Loader2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { identifyCollectible, type IdentifyResponse } from "@/lib/api/identifyCollectible";
import { useAuth } from "@/contexts/AuthContext";
import UsageBanner from "@/components/UsageBanner";
import ScanResultModal from "@/components/ScanResultModal";

const ScanPage = () => {
  const [image, setImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<IdentifyResponse | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { user, scansRemaining, isPremium, incrementScanCount } = useAuth();

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) handleFile(file);
    },
    [handleFile]
  );

  const startScan = async () => {
    if (!image) return;
    if (!user) {
      toast.error("Inicia sesión para escanear artículos");
      navigate("/auth");
      return;
    }
    if (!isPremium && scansRemaining <= 0) {
      toast.error("Has alcanzado el límite de escaneos. Mejora a Premium para escaneos ilimitados.");
      navigate("/pricing");
      return;
    }
    setScanning(true);

    try {
      const result = await identifyCollectible(image);

      if (result.success && result.identification) {
        await incrementScanCount();
        setScanResult(result);
        setShowResultModal(true);
      } else {
        toast.error("No se pudo identificar el artículo. Intenta con otra foto.");
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      const msg = err?.message || String(err);
      if (msg.includes('Rate limit') || msg.includes('RATE_LIMIT')) {
        toast.error("Demasiadas solicitudes. Espera un momento e intenta de nuevo.");
      } else if (msg.includes('credits') || msg.includes('CREDITS')) {
        toast.error("Créditos de IA agotados.");
      } else if (msg.includes('FunctionsFetchError') || msg.includes('Failed to fetch')) {
        toast.error("Error de conexión. La imagen puede ser demasiado grande. Intenta con una foto más pequeña.");
      } else {
        toast.error("Error al analizar la imagen: " + msg);
      }
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen px-6 pb-24 pt-12">
      <UsageBanner type="scan" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-serif text-3xl font-bold">
          Escanear <span className="text-primary">Artículo</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Toma una foto o sube una imagen de tu coleccionable
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-8"
      >
        <AnimatePresence mode="wait">
          {!image ? (
            <motion.div
              key="upload"
              exit={{ opacity: 0, scale: 0.95 }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="glass flex h-80 cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-border transition-colors hover:border-primary/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Camera size={28} className="text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium">Toca para tomar foto o subir imagen</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Arrastra y suelta o haz clic
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" className="gap-2" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  <Upload size={16} /> Subir
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-2xl"
            >
              <img src={image} alt="Preview" className="h-80 w-full object-cover rounded-2xl" />
              
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/60 backdrop-blur-sm">
                  <div className="absolute inset-x-0 top-0 h-1 animate-scan-line gradient-gold rounded-full" />
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={40} className="animate-spin text-primary" />
                    <p className="font-medium text-primary">Identificando con IA...</p>
                    <p className="text-sm text-muted-foreground">Analizando imagen y buscando coincidencias</p>
                  </div>
                </div>
              )}

              {!scanning && (
                <button
                  onClick={() => setImage(null)}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-destructive"
                >
                  <X size={16} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {image && !scanning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <Button size="lg" className="w-full gap-2 text-base font-semibold" onClick={startScan}>
              <Search size={20} />
              Identificar Artículo
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-10"
      >
        <h3 className="font-sans text-sm font-semibold text-muted-foreground uppercase tracking-wider">Consejos para mejores resultados</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">📸 Buena iluminación y fondo limpio</li>
          <li className="flex gap-2">🔍 Enfoca en detalles y marcas identificativas</li>
          <li className="flex gap-2">📐 Captura la portada/cara frontal completa</li>
        </ul>
      </motion.div>
    </div>
  );
};

export default ScanPage;
