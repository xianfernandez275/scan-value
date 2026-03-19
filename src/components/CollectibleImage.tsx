import { useState, useEffect } from "react";
import { ExternalLink, ImageOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ImageResult {
  imageUrl: string;
  source: string;
  attribution: string;
  sourceUrl: string;
}

interface CollectibleImageProps {
  name: string;
  category: string;
  userImage?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-14 w-14",
  md: "h-32 w-32",
  lg: "h-48 w-full",
};

const categoryEmojis: Record<string, string> = {
  "Cómics": "📚",
  "Cartas": "🃏",
  "Monedas": "🪙",
  "Juguetes": "🧸",
  "Sellos": "📮",
  "Vinilos": "🎵",
};

const knownPokemon = [
  'charizard', 'pikachu', 'mewtwo', 'blastoise', 'venusaur', 'gengar',
  'dragonite', 'gyarados', 'lugia', 'rayquaza', 'mew', 'eevee', 'snorlax',
  'machamp', 'alakazam', 'zapdos', 'moltres', 'articuno', 'raichu',
  'arcanine', 'ninetales', 'lapras', 'vaporeon', 'jolteon', 'flareon',
  'umbreon', 'espeon', 'tyranitar', 'gardevoir', 'salamence', 'metagross',
];

function extractPokemonName(name: string): string | null {
  const lower = name.toLowerCase();
  for (const pokemon of knownPokemon) {
    if (lower.includes(pokemon)) return pokemon;
  }
  return null;
}

async function fetchPokemonImage(name: string): Promise<ImageResult | null> {
  const pokemonName = extractPokemonName(name);
  if (!pokemonName) return null;

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
    if (!res.ok) return null;
    const data = await res.json();
    const artwork = data.sprites?.other?.['official-artwork']?.front_default;
    if (!artwork) return null;
    return {
      imageUrl: artwork,
      source: 'PokéAPI',
      attribution: '© Nintendo/Creatures Inc./GAME FREAK inc.',
      sourceUrl: `https://pokeapi.co/api/v2/pokemon/${pokemonName}`,
    };
  } catch {
    return null;
  }
}

const CollectibleImage = ({
  name,
  category,
  userImage,
  className = "",
  size = "md",
}: CollectibleImageProps) => {
  const [imageData, setImageData] = useState<ImageResult | null>(null);
  const [loading, setLoading] = useState(!userImage);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (userImage) return;

    let cancelled = false;
    setLoading(true);
    setError(false);

    const cat = category.toLowerCase();

    // For cards, try PokéAPI directly (fast, CORS-enabled)
    if (cat.includes('carta') || cat.includes('card')) {
      fetchPokemonImage(name).then((result) => {
        if (cancelled) return;
        setImageData(result);
        setLoading(false);
      });
    } else {
      // For other categories, show placeholder (edge function handles these when API keys are configured)
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [name, category, userImage]);

  const displayImage = userImage || imageData?.imageUrl;

  if (loading) {
    return <Skeleton className={`${sizeClasses[size]} rounded-lg ${className}`} />;
  }

  if (!displayImage || error) {
    return (
      <div className={`${sizeClasses[size]} flex items-center justify-center rounded-lg bg-secondary text-2xl ${className}`}>
        {categoryEmojis[category] || <ImageOff size={20} className="text-muted-foreground" />}
      </div>
    );
  }

  return (
    <div className={`relative group ${className}`}>
      <img
        src={displayImage}
        alt={name}
        className={`${sizeClasses[size]} rounded-lg object-contain bg-secondary`}
        onError={() => setError(true)}
      />
      {imageData && !userImage && (
        <div className="absolute inset-x-0 bottom-0 rounded-b-lg bg-background/80 backdrop-blur-sm px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-[9px] text-muted-foreground flex items-center gap-1">
            <ExternalLink size={8} />
            {imageData.attribution}
          </p>
        </div>
      )}
    </div>
  );
};

export default CollectibleImage;
