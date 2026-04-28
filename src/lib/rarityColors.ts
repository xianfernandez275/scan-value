// Centralized rarity color tokens.
// Each rarity tier gets a UNIQUE color — no two rarities share the same hue.
//
// Tier scale (low → high):
//   Común        → gris
//   Poco Común   → verde
//   Raro         → azul
//   Muy Raro     → cian/teal
//   Ultra Raro   → púrpura
//   Mítica       → dorado (primary)
//   Secreta      → rosa con glow
//   Rainbow      → degradado multicolor
//   Promo        → naranja

const COLOR = {
  comun:       "bg-muted text-muted-foreground border-muted-foreground/30",
  pocoComun:   "bg-green-500/15 text-green-400 border-green-500/40",
  raro:        "bg-blue-500/15 text-blue-400 border-blue-500/40",
  muyRaro:     "bg-cyan-500/15 text-cyan-400 border-cyan-500/40",
  ultraRaro:   "bg-purple-500/15 text-purple-400 border-purple-500/40",
  mitica:      "bg-primary/15 text-primary border-primary/50",
  secreta:     "bg-pink-500/15 text-pink-400 border-pink-500/50 shadow-[0_0_12px_-2px_hsl(330_80%_60%/0.5)]",
  rainbow:     "bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 text-pink-300 border-pink-500/40",
  promo:       "bg-orange-500/15 text-orange-400 border-orange-500/40",
} as const;

export const rarityColorMap: Record<string, string> = {
  // Común
  "Común": COLOR.comun,
  "Comun": COLOR.comun,
  "Common": COLOR.comun,

  // Poco común
  "Poco Común": COLOR.pocoComun,
  "Poco Comun": COLOR.pocoComun,
  "Uncommon": COLOR.pocoComun,

  // Raro
  "Raro": COLOR.raro,
  "Rare": COLOR.raro,
  "Holo": COLOR.raro,
  "Rare Holo": COLOR.raro,

  // Muy raro
  "Muy Raro": COLOR.muyRaro,
  "Super Rare": COLOR.muyRaro,

  // Ultra raro
  "Ultra Raro": COLOR.ultraRaro,
  "Ultra Rare": COLOR.ultraRaro,

  // Mítica
  "Mítica": COLOR.mitica,
  "Mitica": COLOR.mitica,
  "Mythic": COLOR.mitica,

  // Secreta
  "Secreta": COLOR.secreta,
  "Secret Rare": COLOR.secreta,

  // Rainbow
  "Rainbow": COLOR.rainbow,
  "Rainbow Rare": COLOR.rainbow,
  "Arcoíris": COLOR.rainbow,

  // Promo / Especial
  "Promo": COLOR.promo,
  "Especial": COLOR.promo,
};

export function getRarityColor(rarity?: string | null): string {
  if (!rarity) return COLOR.comun;
  if (rarityColorMap[rarity]) return rarityColorMap[rarity];

  const norm = rarity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  for (const [key, val] of Object.entries(rarityColorMap)) {
    const k = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (k === norm) return val;
  }

  // Heuristic — order matters: most specific first.
  if (/rainbow|arcoiris/.test(norm)) return COLOR.rainbow;
  if (/secret/.test(norm)) return COLOR.secreta;
  if (/mythic|mitica/.test(norm)) return COLOR.mitica;
  if (/ultra/.test(norm)) return COLOR.ultraRaro;
  if (/super|muy/.test(norm)) return COLOR.muyRaro;
  if (/holo|rare|raro/.test(norm)) return COLOR.raro;
  if (/uncommon|poco/.test(norm)) return COLOR.pocoComun;
  if (/promo|especial/.test(norm)) return COLOR.promo;
  if (/common|comun/.test(norm)) return COLOR.comun;
  return COLOR.comun;
}
