import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";

interface CameraCaptureProps {
  open: boolean;
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

// In-app camera using getUserMedia. The live stream stays inside the page, so
// (unlike <input capture>) the browser tab is never backgrounded/reloaded when
// taking a photo — which is what caused the "reload to home" loop on tablets.
// The layout mirrors a native phone camera app: fullscreen preview with a
// bottom control bar (cancel · shutter · flip).
const CameraCapture = ({ open, onCapture, onClose }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const start = async () => {
      setStatus("loading");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, facingMode]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const maxDim = 1280;
    const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas.toDataURL("image/jpeg", 0.82));
  };

  // Fallback for devices/browsers without a usable camera (e.g. some desktops).
  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => onCapture(reader.result as string);
    reader.readAsDataURL(file);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-row bg-black">
      {/* Live preview fills all available space */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`h-full w-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
        />

        {/* Top hint bar, overlaid like a native camera */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-center bg-gradient-to-b from-black/50 to-transparent px-4 pb-8 pt-[max(env(safe-area-inset-top),1rem)]">
          <span className="text-sm font-medium text-white/90">Enfoca tu coleccionable</span>
        </div>

        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
            <Loader2 size={36} className="animate-spin" />
            <p className="text-sm">Activando la cámara…</p>
          </div>
        )}

        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 px-8 text-center text-white">
            <p className="text-sm">
              No pudimos acceder a la cámara. Revisa los permisos del navegador o usa una foto.
            </p>
            <label className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Elegir foto
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFilePicked} />
            </label>
          </div>
        )}
      </div>

      {/* Right control column: flip (top) · shutter (center) · cancel (bottom) */}
      <div className="flex w-28 flex-col items-center justify-between bg-black py-8 pr-[max(env(safe-area-inset-right),0.5rem)]">
        <button
          onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
          aria-label="Girar cámara"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white"
        >
          <RefreshCw size={20} />
        </button>

        {status === "ready" ? (
          <button
            onClick={takePhoto}
            aria-label="Tomar foto"
            className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-4 border-white/90 transition-transform active:scale-90"
          >
            <span className="h-[58px] w-[58px] rounded-full bg-white" />
          </button>
        ) : (
          <span className="h-[74px] w-[74px]" />
        )}

        <button
          onClick={onClose}
          aria-label="Cerrar cámara"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
};

export default CameraCapture;
