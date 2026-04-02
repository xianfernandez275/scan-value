import { useState, useEffect, useCallback } from "react";
import { ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import CategoryPlaceholder from "@/components/CategoryPlaceholder";
import ImageWatermark from "@/components/ImageWatermark";
import { fetchCollectibleImage, type ImageResult, type ImageSearchParams } from "@/lib/api/collectibleImages";
import { supabase } from "@/integrations/supabase/client";

interface CollectibleImageProps {
  name: string;
  category: string;
  userImage?: string;
  officialImageUrl?: string;
  source?: string;
  sourceUrl?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** If provided, fetched images will be persisted to DB for this item */
  collectionItemId?: string;
  /** Precise identifiers for exact image lookup */
  tcgSetId?: string;
  cardNumber?: string;
  catalogId?: string;
  officialCardId?: string;
  officialSetName?: string;
  officialCardNumber?: string;
  subcategory?: string;
}

const sizeClasses = {
  sm: "h-14 w-14",
  md: "h-32 w-32",
  lg: "h-48 w-full",
};

const CollectibleImage = ({
  name,
  category,
  userImage,
  officialImageUrl,
  source,
  sourceUrl,
  className = "",
  size = "md",
  collectionItemId,
  tcgSetId,
  cardNumber,
  catalogId,
  officialCardId,
  officialSetName,
  officialCardNumber,
  subcategory,
}: CollectibleImageProps) => {
  const [imageData, setImageData] = useState<ImageResult | null>(null);
  const [loading, setLoading] = useState(!userImage && !officialImageUrl);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (userImage || officialImageUrl) return;

    let cancelled = false;
    setLoading(true);
    setError(false);

    const params: ImageSearchParams = {
      name,
      category,
      subcategory,
      tcg_set_id: tcgSetId,
      card_number: cardNumber,
      catalog_id: catalogId,
      official_card_id: officialCardId,
      official_set_name: officialSetName,
      official_card_number: officialCardNumber,
    };

    fetchCollectibleImage(params, collectionItemId)
      .then((result) => {
        if (cancelled) return;
        setImageData(result);
      })
      .catch((fetchError) => {
        console.error("Collectible image lookup failed:", fetchError);
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      setLoading(false);
    };
  }, [name, category, userImage, officialImageUrl, tcgSetId, cardNumber, officialCardId]);

  const displayImage = officialImageUrl || userImage || imageData?.imageUrl;
  const attribution = imageData?.attribution;
  const resolvedSource = source || imageData?.source;
  const resolvedSourceUrl = sourceUrl || imageData?.sourceUrl;

  if (loading) {
    return <Skeleton className={`${sizeClasses[size]} rounded-lg ${className}`} />;
  }

  if (!displayImage || error) {
    return (
      <CategoryPlaceholder
        category={category}
        className={`${sizeClasses[size]} ${className}`}
        source={resolvedSource}
        sourceUrl={resolvedSourceUrl}
        itemName={name}
      />
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
