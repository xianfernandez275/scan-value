import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ImageWatermarkProps {
  matchConfidence: 'high' | 'medium' | 'low';
  onConfirm?: () => void;
  confirmed?: boolean;
}

const ImageWatermark = ({ matchConfidence, onConfirm, confirmed }: ImageWatermarkProps) => {
  if (matchConfidence === 'high' || confirmed) return null;

  return (
    <>
      {/* Diagonal watermark text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-lg">
        <span
          className="text-foreground/10 font-bold text-2xl tracking-[0.3em] uppercase select-none whitespace-nowrap"
          style={{ transform: 'rotate(-35deg)' }}
        >
          Imagen orientativa
        </span>
      </div>

      {/* Bottom badge + confirm */}
      <div className="absolute inset-x-0 bottom-0 rounded-b-lg bg-background/85 backdrop-blur-sm px-2 py-1.5 flex items-center justify-between gap-1">
        <Badge
          variant="outline"
          className={`text-[9px] gap-1 shrink-0 ${
            matchConfidence === 'low'
              ? 'border-destructive/50 text-destructive'
              : 'border-yellow-500/50 text-yellow-500'
          }`}
        >
          <AlertTriangle size={10} />
          {matchConfidence === 'low' ? 'Sin confirmar' : 'Aproximada'}
        </Badge>
        {onConfirm && (
          <button
            onClick={(e) => { e.stopPropagation(); onConfirm(); }}
            className="text-[9px] text-primary hover:underline flex items-center gap-0.5"
          >
            <CheckCircle2 size={10} /> Confirmar
          </button>
        )}
      </div>
    </>
  );
};

export default ImageWatermark;
