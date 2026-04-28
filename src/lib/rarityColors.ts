// Centralized rarity color tokens.
// Uses semantic-style utility classes; colors chosen to convey rarity tier visually.
// Order: Común → Poco Común → Raro → Muy Raro → Ultra Raro → Secreta/Mítica

export const rarityColorMap: Record<string, string> = {
  // Comunes – gris neutro
  "Común": "bg-muted text-muted-foreground border-muted-foreground/30",
  "Comun": "bg-muted text-muted-foreground border-muted-foreground/30",
  "Common": "bg-muted text-muted-foreground border-muted-foreground/30",

  // Poco común – verde
  "Poco Común": "bg-green-500/15 text-green-400 border-green-500/40",
  "Poco Comun": "bg-green-500/15 text-green-400 border-green-500/40",
  "Uncommon": "bg-green-500/15 text-green-400 border-green-500/40",

  // Raro – azul
  "Raro": "bg-blue-500/15 text-blue-400 border-blue-500/40",
  "Rare": "bg-blue-500/15 text-blue-400 border-blue-500/40",
  "Holo": "bg-blue-500/15 text-blue-400 border-blue-500/40",
  "Rare Holo": "bg-blue-500/15 text-blue-400 border-blue-500/40",

  // Muy raro – púrpura
  "Muy Raro": "bg-purple-500/15 text-purple-400 border-purple-500/40",
  "Super Rare": "bg-purple-500/15 text-purple-400 border-purple-500/40",
  "Ultra Rare": "bg-purple-500/15 text-purple-400 border-purple-500/40",

  // Ultra raro – dorado (primary)
  "Ultra Raro": "bg-primary/15 text-primary border-primary/50",
  "Mythic": "bg-primary/15 text-primary border-primary/50",
  "Mítica": "bg-primary/15 text-primary border-primary/50",
  "Mitica": "bg-primary/15 text-primary border-primary/50",

  // Secreta / Especial – rosa/magenta con glow
  "Secreta": "bg-pink-500/15 text-pink-400 border-pink-500/50 shadow-[0_0_12px_-2px_hsl(330_80%_60%/0.5)]",
  "Secret Rare": "bg-pink-500/15 text-pink-400 border-pink-500/50 shadow-[0_0_12px_-2px_hsl(330_80%_60%/0.5)]",
  "Rainbow": "bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 text-pink-300 border-pink-500/40",

  // Promo / Especial
  "Promo": "bg-orange-500/15 text-orange-400 border-orange-500/40",
  "Especial": "bg-orange-500/15 text-orange-400 border-orange-500/40",
};

export function getRarityColor(rarity?: string | null): string {
  if (!rarity) return "bg-muted text-muted-foreground border-muted-foreground/30";
  // Exact match first
  if (rarityColorMap[rarity]) return rarityColorMap[rarity];
  // Case-insensitive normalized fallback
  const norm = rarity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  for (const [key, val] of Object.entries(rarityColorMap)) {
    const k = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (k === norm) return val;
  }
  // Heuristic by keyword
  if (/secret|rainbow|arcoiris/.test(norm)) return rarityColorMap["Secreta"];
  if (/mythic|mitica|ultra/.test(norm)) return rarityColorMap["Ultra Raro"];
  if (/super|muy/.test(norm)) return rarityColorMap["Muy Raro"];
  if (/holo|rare|raro/.test(norm)) return rarityColorMap["Raro"];
  if (/uncommon|poco/.test(norm)) return rarityColorMap["Poco Común"];
  if (/common|comun/.test(norm)) return rarityColorMap["Común"];
  if (/promo|especial/.test(norm)) return rarityColorMap["Promo"];
  return "bg-muted text-muted-foreground border-muted-foreground/30";
}
