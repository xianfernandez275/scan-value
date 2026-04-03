import { forwardRef } from "react";

import placeholderCards from "@/assets/placeholder-cards.jpg";
import placeholderComics from "@/assets/placeholder-comics.jpg";
import placeholderCoins from "@/assets/placeholder-coins.jpg";
import placeholderFigures from "@/assets/placeholder-figures.jpg";
import placeholderStamps from "@/assets/placeholder-stamps.jpg";
import placeholderVinyl from "@/assets/placeholder-vinyl.jpg";
import placeholderGeneric from "@/assets/placeholder-generic.jpg";

interface CategoryPlaceholderProps {
  category: string;
  className?: string;
  source?: string;
  sourceUrl?: string;
  itemName?: string;
}

const categoryImages: Record<string, string> = {
  Cartas: placeholderCards,
  Cómics: placeholderComics,
  Monedas: placeholderCoins,
  Juguetes: placeholderFigures,
  Figuras: placeholderFigures,
  Sellos: placeholderStamps,
  Vinilos: placeholderVinyl,
  Vinyl: placeholderVinyl,
};

function resolveCategory(category: string): string {
  const cleaned = category?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  const map: Record<string, string> = {
    carta: 'Cartas', cartas: 'Cartas', card: 'Cartas', cards: 'Cartas', tcg: 'Cartas',
    comic: 'Cómics', comics: 'Cómics', manga: 'Cómics',
    moneda: 'Monedas', monedas: 'Monedas', coin: 'Monedas', coins: 'Monedas',
    juguete: 'Juguetes', juguetes: 'Juguetes', toy: 'Juguetes', toys: 'Juguetes',
    figura: 'Figuras', figuras: 'Figuras', figure: 'Figuras', figures: 'Figuras',
    sello: 'Sellos', sellos: 'Sellos', stamp: 'Sellos', stamps: 'Sellos',
    vinilo: 'Vinilos', vinilos: 'Vinilos', vinyl: 'Vinilos', record: 'Vinilos', lp: 'Vinilos',
  };
  for (const [key, val] of Object.entries(map)) {
    if (cleaned === key || cleaned.includes(key)) return val;
  }
  return category;
}

const CategoryPlaceholder = forwardRef<HTMLDivElement, CategoryPlaceholderProps>(
  ({ category, className = "", itemName }, ref) => {
    const resolved = resolveCategory(category);
    const imgSrc = categoryImages[resolved] || placeholderGeneric;

    return (
      <div
        ref={ref}
        className={`relative flex items-center justify-center overflow-hidden rounded-lg ${className}`}
      >
        <img
          src={imgSrc}
          alt={itemName || category || "Coleccionable"}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }
);

CategoryPlaceholder.displayName = "CategoryPlaceholder";

export default CategoryPlaceholder;
