import { useState, useEffect } from "react";
import { ExternalLink, ImageOff } from "lucide-react";
import { fetchCollectibleImage, type ImageResult } from "@/lib/api/collectibleImages";
import { Skeleton } from "@/components/ui/skeleton";

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

    fetchCollectibleImage(name, category).then((result) => {
      if (cancelled) return;
      setImageData(result);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setError(true);
      setLoading(false);
    });

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
        className={`${sizeClasses[size]} rounded-lg object-cover`}
        onError={() => setError(true)}
      />
      {/* Attribution overlay */}
      {imageData && !userImage && (
        <div className="absolute inset-x-0 bottom-0 rounded-b-lg bg-background/80 backdrop-blur-sm px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <a
            href={imageData.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink size={8} />
            {imageData.source}
          </a>
        </div>
      )}
    </div>
  );
};

export default CollectibleImage;
