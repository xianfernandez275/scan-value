/**
 * Attractive SVG-based placeholders for each collectible category.
 * Used as the final fallback when no real image is available.
 * Never shows text like "imagen no disponible".
 */

interface CategoryPlaceholderProps {
  category: string;
  className?: string;
}

const illustrations: Record<string, { gradient: [string, string]; icon: JSX.Element }> = {
  Cartas: {
    gradient: ['hsl(38, 90%, 55%)', 'hsl(45, 100%, 65%)'],
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
    gradient: ['hsl(350, 80%, 55%)', 'hsl(20, 90%, 60%)'],
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
    gradient: ['hsl(45, 80%, 50%)', 'hsl(38, 90%, 65%)'],
    icon: (
      <g>
        <circle cx="50" cy="50" r="28" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <text x="50" y="56" textAnchor="middle" fontSize="20" fill="currentColor" opacity="0.6" fontFamily="serif" fontWeight="bold">$</text>
      </g>
    ),
  },
  Juguetes: {
    gradient: ['hsl(260, 70%, 60%)', 'hsl(290, 80%, 65%)'],
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
    gradient: ['hsl(200, 70%, 55%)', 'hsl(220, 80%, 60%)'],
    icon: (
      <g>
        <circle cx="50" cy="30" r="10" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2.5" />
        <path d="M50 40 v20 M40 50 h20 M42 75 l8-15 l8 15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      </g>
    ),
  },
  Sellos: {
    gradient: ['hsl(150, 60%, 45%)', 'hsl(170, 70%, 55%)'],
    icon: (
      <g>
        <rect x="25" y="25" width="50" height="50" rx="2" fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 3" />
        <rect x="32" y="32" width="36" height="36" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <circle cx="50" cy="50" r="10" fill="currentColor" opacity="0.2" />
      </g>
    ),
  },
  Vinilos: {
    gradient: ['hsl(0, 0%, 30%)', 'hsl(0, 0%, 50%)'],
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

const defaultIllustration = {
  gradient: ['hsl(220, 15%, 30%)', 'hsl(220, 20%, 45%)'] as [string, string],
  icon: (
    <g>
      <rect x="30" y="28" width="40" height="44" rx="4" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="50" cy="45" r="8" fill="currentColor" opacity="0.2" />
      <path d="M38 58 l8-6 l4 3 l10-8 l10 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </g>
  ),
};

const CategoryPlaceholder = ({ category, className = '' }: CategoryPlaceholderProps) => {
  const { gradient, icon } = illustrations[category] || defaultIllustration;

  return (
    <div className={`flex items-center justify-center overflow-hidden rounded-lg ${className}`}
      style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
    >
      <svg viewBox="0 0 100 100" className="w-3/5 h-3/5 text-white/80">
        {icon}
      </svg>
    </div>
  );
};

export default CategoryPlaceholder;
