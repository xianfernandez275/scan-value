import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import CategoryPlaceholder from "@/components/CategoryPlaceholder";

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
  officialImageUrl?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-14 w-14",
  md: "h-32 w-32",
  lg: "h-48 w-full",
};

async function fetchPokemonTCGImage(name: string): Promise<ImageResult | null> {
  try {
    const pokemonName = name.split(/\s+/)[0];
    const res = await fetch(
      `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(pokemonName)}"&pageSize=1&orderBy=-set.releaseDate`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const card = data.data?.[0];
    if (!card?.images) return null;
    return {
      imageUrl: card.images.large || card.images.small,
      source: 'Pokémon TCG API',
      attribution: '© Nintendo/Creatures Inc./GAME FREAK inc. via pokemontcg.io',
      sourceUrl: `https://pokemontcg.io/card/${card.id}`,
    };
  } catch {
    return null;
  }
}

const CollectibleImage = ({
  name,
  category,
  userImage,
  officialImageUrl,
  className = "",
  size = "md",
}: CollectibleImageProps) => {
  const [imageData, setImageData] = useState<ImageResult | null>(null);
  const [loading, setLoading] = useState(!userImage && !officialImageUrl);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (userImage || officialImageUrl) return;

    let cancelled = false;
    setLoading(true);
    setError(false);

    const cat = category.toLowerCase();

    if (cat.includes('carta') || cat.includes('card')) {
      fetchPokemonTCGImage(name).then((result) => {
        if (cancelled) return;
        setImageData(result);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [name, category, userImage, officialImageUrl]);

  const displayImage = officialImageUrl || userImage || imageData?.imageUrl;
  const attribution = imageData?.attribution;

  if (loading) {
    return <Skeleton className={`${sizeClasses[size]} rounded-lg ${className}`} />;
  }

  // If no image available or image failed to load, show attractive placeholder
  if (!displayImage || error) {
    return <CategoryPlaceholder category={category} className={`${sizeClasses[size]} ${className}`} />;
  }

  return (
    <div className={`relative group ${className}`}>
      <img
        src={displayImage}
        alt={name}
        className={`${sizeClasses[size]} rounded-lg object-contain bg-secondary`}
        onError={() => setError(true)}
      />
      {attribution && (
        <div className="absolute inset-x-0 bottom-0 rounded-b-lg bg-background/80 backdrop-blur-sm px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-[9px] text-muted-foreground flex items-center gap-1">
            <ExternalLink size={8} />
            {attribution}
          </p>
        </div>
      )}
    </div>
  );
};

export default CollectibleImage;
