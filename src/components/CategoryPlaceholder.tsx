/**
 * Source-aware placeholders for collectibles.
 * Shows API source logo/icon when known, otherwise a category icon.
 * Consistent sizing, glassmorphism style, and click-to-info support.
 */

import { forwardRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CategoryPlaceholderProps {
  category: string;
  className?: string;
  source?: string;
  sourceUrl?: string;
  itemName?: string;
}

/* ── SVG icons per API source ─────────────────────────────────── */

const sourceIcons: Record<string, { label: string; url: string; icon: JSX.Element }> = {
  pokeapi: {
    label: "PokéAPI",
    url: "https://pokeapi.co",
    icon: (
      <g>
        <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <line x1="20" y1="50" x2="80" y2="50" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="8" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />
        <circle cx="50" cy="50" r="4" fill="currentColor" opacity="0.6" />
      </g>
    ),
  },
  "pokémon tcg": {
    label: "Pokémon TCG API",
    url: "https://pokemontcg.io",
    icon: (
      <g>
        <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <line x1="20" y1="50" x2="80" y2="50" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="8" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />
        <circle cx="50" cy="50" r="4" fill="currentColor" opacity="0.6" />
      </g>
    ),
  },
  "comic vine": {
    label: "Comic Vine",
    url: "https://comicvine.gamespot.com",
    icon: (
      <g>
        <rect x="25" y="22" width="50" height="40" rx="6" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2.5" />
        <polygon points="35,62 40,72 48,62" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <text x="50" y="48" textAnchor="middle" fontSize="16" fill="currentColor" opacity="0.7" fontWeight="bold" fontFamily="sans-serif">CV</text>
      </g>
    ),
  },
  numista: {
    label: "Numista",
    url: "https://en.numista.com",
    icon: (
      <g>
        <circle cx="50" cy="50" r="28" fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
        <text x="50" y="57" textAnchor="middle" fontSize="22" fill="currentColor" opacity="0.6" fontFamily="serif" fontWeight="bold">N</text>
      </g>
    ),
  },
  scryfall: {
    label: "Scryfall",
    url: "https://scryfall.com",
    icon: (
      <g>
        <rect x="30" y="20" width="40" height="60" rx="4" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="50" cy="44" r="10" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M46 44 l4 4 l6-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        <text x="50" y="70" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.5" fontFamily="sans-serif" fontWeight="bold">SF</text>
      </g>
    ),
  },
};

/* ── SVG icons per category (fallback when no source) ─────────── */

const categoryIcons: Record<string, { gradient: [string, string]; icon: JSX.Element }> = {
  Cartas: {
    gradient: ["hsl(38, 90%, 55%)", "hsl(45, 100%, 65%)"],
    icon: (
      <g>
        <rect x="28" y="18" width="44" height="64" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.5" transform="rotate(-8 50 50)" />
        <rect x="30" y="20" width="44" height="64" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.75" transform="rotate(4 50 50)" />
        <rect x="32" y="22" width="44" height="64" rx="4" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="54" cy="48" r="12" fill="currentColor" opacity="0.25" />
        <path d="M50 42 l8 6 l-8 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },
  Cómics: {
    gradient: ["hsl(350, 80%, 55%)", "hsl(20, 90%, 60%)"],
    icon: (
      <g>
        <rect x="25" y="20" width="50" height="60" rx="3" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2.5" />
        <path d="M35 35 h30 M35 45 h30 M35 55 h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <circle cx="62" cy="30" r="10" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
        <path d="M59 30 l3 3 l5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },
  Monedas: {
    gradient: ["hsl(45, 80%, 50%)", "hsl(38, 90%, 65%)"],
    icon: (
      <g>
        <circle cx="50" cy="50" r="28" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <text x="50" y="56" textAnchor="middle" fontSize="20" fill="currentColor" opacity="0.6" fontFamily="serif" fontWeight="bold">$</text>
      </g>
    ),
  },
  Juguetes: {
    gradient: ["hsl(260, 70%, 60%)", "hsl(290, 80%, 65%)"],
    icon: (
      <g>
        <rect x="35" y="30" width="30" height="30" rx="6" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="43" cy="43" r="3" fill="currentColor" opacity="0.5" />
        <circle cx="57" cy="43" r="3" fill="currentColor" opacity="0.5" />
        <path d="M43 52 q7 5 14 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <path d="M38 30 l-3-8 M62 30 l3-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      </g>
    ),
  },
  Figuras: {
    gradient: ["hsl(200, 70%, 55%)", "hsl(220, 80%, 60%)"],
    icon: (
      <g>
        <circle cx="50" cy="30" r="10" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2.5" />
        <path d="M50 40 v20 M40 50 h20 M42 75 l8-15 l8 15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      </g>
    ),
  },
  Sellos: {
    gradient: ["hsl(150, 60%, 45%)", "hsl(170, 70%, 55%)"],
    icon: (
      <g>
        <rect x="25" y="25" width="50" height="50" rx="2" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 3" />
        <rect x="32" y="32" width="36" height="36" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <circle cx="50" cy="50" r="10" fill="currentColor" opacity="0.2" />
      </g>
    ),
  },
  Vinilos: {
    gradient: ["hsl(0, 0%, 30%)", "hsl(0, 0%, 50%)"],
    icon: (
      <g>
        <circle cx="50" cy="50" r="28" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="18" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <circle cx="50" cy="50" r="5" fill="currentColor" opacity="0.3" />
      </g>
    ),
  },
};

const defaultCategory = {
  gradient: ["hsl(220, 15%, 30%)", "hsl(220, 20%, 45%)"] as [string, string],
  icon: (
    <g>
      <rect x="30" y="28" width="40" height="44" rx="4" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="50" cy="45" r="8" fill="currentColor" opacity="0.2" />
      <path d="M38 58 l8-6 l4 3 l10-8 l10 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </g>
  ),
};

/* ── Resolve source key from various formats ──────────────────── */
function resolveSourceKey(source?: string): string | null {
  if (!source) return null;
  const lower = source.toLowerCase();
  for (const key of Object.keys(sourceIcons)) {
    if (lower.includes(key)) return key;
  }
  return null;
}

/* ── Component ────────────────────────────────────────────────── */

const CategoryPlaceholder = forwardRef<HTMLDivElement, CategoryPlaceholderProps>(
  ({ category, className = "", source, sourceUrl, itemName }, ref) => {
    const [showInfo, setShowInfo] = useState(false);
    const sourceKey = resolveSourceKey(source);
    const sourceData = sourceKey ? sourceIcons[sourceKey] : null;
    const catData = categoryIcons[category] || defaultCategory;

    const gradient = catData.gradient;
    const svgIcon = sourceData ? sourceData.icon : catData.icon;
    const label = sourceData?.label || category || "Coleccionable";

    const inner = (
      <div
        ref={ref}
        className={`relative flex flex-col items-center justify-center overflow-hidden rounded-lg cursor-pointer
          border border-border/40 shadow-md transition-transform hover:scale-[1.02] ${className}`}
        style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
        onClick={() => setShowInfo(true)}
      >
        <svg viewBox="0 0 100 100" className="w-3/5 h-3/5 text-white/80 drop-shadow-sm">
          {svgIcon}
        </svg>

        {sourceData && (
          <span className="absolute bottom-1 text-[8px] font-medium text-white/60 tracking-wide uppercase">
            {sourceData.label}
          </span>
        )}
      </div>
    );

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{inner}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[220px] space-y-1">
            {itemName && <p className="font-semibold text-xs">{itemName}</p>}
            <p className="text-xs text-muted-foreground">
              Fuente: {label}
            </p>
            {(sourceUrl || sourceData?.url) && (
              <a
                href={sourceUrl || sourceData?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary flex items-center gap-1 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={10} /> Ver fuente
              </a>
            )}
            {!sourceData && (
              <p className="text-[10px] text-muted-foreground italic">
                Imagen oficial no disponible
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

CategoryPlaceholder.displayName = "CategoryPlaceholder";

export default CategoryPlaceholder;
