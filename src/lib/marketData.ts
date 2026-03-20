export interface MarketItem {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  currentPrice: number;
  previousPrice: number;
  change: number; // percentage
  rarity: "Común" | "Poco Común" | "Raro" | "Muy Raro" | "Ultra Raro";
  condition: string;
  year: number;
  description: string;
  demand: "Baja" | "Media" | "Alta" | "Muy Alta";
  historicalPrices: { date: string; price: number }[];
}

const comicsItems: MarketItem[] = [
  { id: "c1", name: "Action Comics #1", category: "Cómics", imageUrl: "", currentPrice: 3200000, previousPrice: 2800000, change: 14.3, rarity: "Ultra Raro", condition: "CGC 2.0", year: 1938, description: "Primera aparición de Superman. El cómic más valioso del mundo.", demand: "Muy Alta", historicalPrices: [{ date: "2023-06", price: 2500000 }, { date: "2023-09", price: 2650000 }, { date: "2023-12", price: 2800000 }, { date: "2024-03", price: 3000000 }, { date: "2024-06", price: 3200000 }] },
  { id: "c2", name: "Detective Comics #27", category: "Cómics", imageUrl: "", currentPrice: 1800000, previousPrice: 1650000, change: 9.1, rarity: "Ultra Raro", condition: "CGC 4.0", year: 1939, description: "Primera aparición de Batman.", demand: "Muy Alta", historicalPrices: [{ date: "2023-06", price: 1500000 }, { date: "2023-09", price: 1550000 }, { date: "2023-12", price: 1650000 }, { date: "2024-03", price: 1750000 }, { date: "2024-06", price: 1800000 }] },
  { id: "c3", name: "Amazing Fantasy #15", category: "Cómics", imageUrl: "", currentPrice: 1500000, previousPrice: 1420000, change: 5.6, rarity: "Ultra Raro", condition: "CGC 6.0", year: 1962, description: "Primera aparición de Spider-Man.", demand: "Muy Alta", historicalPrices: [{ date: "2023-06", price: 1350000 }, { date: "2023-09", price: 1380000 }, { date: "2023-12", price: 1420000 }, { date: "2024-03", price: 1460000 }, { date: "2024-06", price: 1500000 }] },
  { id: "c4", name: "Spider-Man #129", category: "Cómics", imageUrl: "", currentPrice: 15500, previousPrice: 14000, change: 10.7, rarity: "Muy Raro", condition: "VF 8.0", year: 1974, description: "Primera aparición de The Punisher.", demand: "Muy Alta", historicalPrices: [{ date: "2023-06", price: 12500 }, { date: "2023-09", price: 13000 }, { date: "2023-12", price: 14000 }, { date: "2024-03", price: 14800 }, { date: "2024-06", price: 15500 }] },
  { id: "c5", name: "X-Men #1", category: "Cómics", imageUrl: "", currentPrice: 85000, previousPrice: 92000, change: -7.6, rarity: "Muy Raro", condition: "CGC 7.5", year: 1963, description: "Primera aparición de los X-Men.", demand: "Alta", historicalPrices: [{ date: "2023-06", price: 95000 }, { date: "2023-09", price: 93000 }, { date: "2023-12", price: 92000 }, { date: "2024-03", price: 88000 }, { date: "2024-06", price: 85000 }] },
  { id: "c6", name: "Hulk #181", category: "Cómics", imageUrl: "", currentPrice: 22000, previousPrice: 25000, change: -12.0, rarity: "Raro", condition: "VG 4.0", year: 1974, description: "Primera aparición completa de Wolverine.", demand: "Alta", historicalPrices: [{ date: "2023-06", price: 28000 }, { date: "2023-09", price: 27000 }, { date: "2023-12", price: 25000 }, { date: "2024-03", price: 23500 }, { date: "2024-06", price: 22000 }] },
  { id: "c7", name: "Batman Adventures #12", category: "Cómics", imageUrl: "", currentPrice: 3200, previousPrice: 3500, change: -8.6, rarity: "Raro", condition: "NM 9.4", year: 1993, description: "Primera aparición de Harley Quinn.", demand: "Media", historicalPrices: [{ date: "2023-06", price: 4000 }, { date: "2023-09", price: 3800 }, { date: "2023-12", price: 3500 }, { date: "2024-03", price: 3300 }, { date: "2024-06", price: 3200 }] },
];

const cardsItems: MarketItem[] = [
  { id: "k1", name: "Charizard 1st Ed. Base Set", category: "Cartas", imageUrl: "", currentPrice: 250000, previousPrice: 220000, change: 13.6, rarity: "Ultra Raro", condition: "PSA 9", year: 1999, description: "La carta más icónica de Pokémon TCG.", demand: "Muy Alta", historicalPrices: [{ date: "2023-06", price: 200000 }, { date: "2023-09", price: 210000 }, { date: "2023-12", price: 220000 }, { date: "2024-03", price: 235000 }, { date: "2024-06", price: 250000 }] },
  { id: "k2", name: "Black Lotus (Alpha)", category: "Cartas", imageUrl: "", currentPrice: 500000, previousPrice: 460000, change: 8.7, rarity: "Ultra Raro", condition: "BGS 9.5", year: 1993, description: "La carta más valiosa de Magic: The Gathering.", demand: "Muy Alta", historicalPrices: [{ date: "2023-06", price: 420000 }, { date: "2023-09", price: 440000 }, { date: "2023-12", price: 460000 }, { date: "2024-03", price: 480000 }, { date: "2024-06", price: 500000 }] },
  { id: "k3", name: "Pikachu Illustrator", category: "Cartas", imageUrl: "", currentPrice: 900000, previousPrice: 850000, change: 5.9, rarity: "Ultra Raro", condition: "PSA 7", year: 1998, description: "Solo 39 copias existen. La carta Pokémon más rara.", demand: "Muy Alta", historicalPrices: [{ date: "2023-06", price: 800000 }, { date: "2023-09", price: 820000 }, { date: "2023-12", price: 850000 }, { date: "2024-03", price: 875000 }, { date: "2024-06", price: 900000 }] },
  { id: "k4", name: "Pokémon Base Set Booster Box", category: "Cartas", imageUrl: "", currentPrice: 45000, previousPrice: 38000, change: 18.4, rarity: "Muy Raro", condition: "Sellado", year: 1999, description: "Caja sellada del set base original.", demand: "Muy Alta", historicalPrices: [{ date: "2023-06", price: 32000 }, { date: "2023-09", price: 35000 }, { date: "2023-12", price: 38000 }, { date: "2024-03", price: 42000 }, { date: "2024-06", price: 45000 }] },
  { id: "k5", name: "Yu-Gi-Oh! Blue-Eyes White Dragon", category: "Cartas", imageUrl: "", currentPrice: 8500, previousPrice: 9200, change: -7.6, rarity: "Raro", condition: "PSA 8", year: 2002, description: "Carta icónica del TCG Yu-Gi-Oh!", demand: "Alta", historicalPrices: [{ date: "2023-06", price: 10000 }, { date: "2023-09", price: 9800 }, { date: "2023-12", price: 9200 }, { date: "2024-03", price: 8800 }, { date: "2024-06", price: 8500 }] },
  { id: "k6", name: "MTG Ancestral Recall (Beta)", category: "Cartas", imageUrl: "", currentPrice: 18000, previousPrice: 20000, change: -10.0, rarity: "Muy Raro", condition: "LP", year: 1993, description: "Parte del Power Nine de Magic.", demand: "Alta", historicalPrices: [{ date: "2023-06", price: 22000 }, { date: "2023-09", price: 21000 }, { date: "2023-12", price: 20000 }, { date: "2024-03", price: 19000 }, { date: "2024-06", price: 18000 }] },
];

const coinsItems: MarketItem[] = [
  { id: "m1", name: "1933 Double Eagle", category: "Monedas", imageUrl: "", currentPrice: 18900000, previousPrice: 18500000, change: 2.2, rarity: "Ultra Raro", condition: "MS-65", year: 1933, description: "La moneda más cara del mundo. Solo una es legal.", demand: "Muy Alta", historicalPrices: [{ date: "2023-06", price: 18000000 }, { date: "2023-09", price: 18200000 }, { date: "2023-12", price: 18500000 }, { date: "2024-03", price: 18700000 }, { date: "2024-06", price: 18900000 }] },
  { id: "m2", name: "1794 Flowing Hair Dollar", category: "Monedas", imageUrl: "", currentPrice: 10000000, previousPrice: 9500000, change: 5.3, rarity: "Ultra Raro", condition: "VF-35", year: 1794, description: "Primer dólar de plata acuñado por EEUU.", demand: "Muy Alta", historicalPrices: [{ date: "2023-06", price: 9000000 }, { date: "2023-09", price: 9200000 }, { date: "2023-12", price: 9500000 }, { date: "2024-03", price: 9800000 }, { date: "2024-06", price: 10000000 }] },
  { id: "m3", name: "Morgan Dollar 1893-S", category: "Monedas", imageUrl: "", currentPrice: 45000, previousPrice: 43000, change: 4.7, rarity: "Ultra Raro", condition: "MS-63", year: 1893, description: "Key date del Morgan Dollar.", demand: "Alta", historicalPrices: [{ date: "2023-06", price: 40000 }, { date: "2023-09", price: 41500 }, { date: "2023-12", price: 43000 }, { date: "2024-03", price: 44000 }, { date: "2024-06", price: 45000 }] },
  { id: "m4", name: "1955 Double Die Lincoln Penny", category: "Monedas", imageUrl: "", currentPrice: 1800, previousPrice: 1750, change: 2.9, rarity: "Muy Raro", condition: "AU-55", year: 1955, description: "Error de acuñación icónico.", demand: "Alta", historicalPrices: [{ date: "2023-06", price: 1650 }, { date: "2023-09", price: 1700 }, { date: "2023-12", price: 1750 }, { date: "2024-03", price: 1780 }, { date: "2024-06", price: 1800 }] },
  { id: "m5", name: "2€ Mónaco Grace Kelly 2007", category: "Monedas", imageUrl: "", currentPrice: 2500, previousPrice: 2800, change: -10.7, rarity: "Muy Raro", condition: "FDC", year: 2007, description: "Moneda conmemorativa de tirada limitada.", demand: "Alta", historicalPrices: [{ date: "2023-06", price: 3000 }, { date: "2023-09", price: 2900 }, { date: "2023-12", price: 2800 }, { date: "2024-03", price: 2650 }, { date: "2024-06", price: 2500 }] },
  { id: "m6", name: "Walking Liberty Half Dollar 1916", category: "Monedas", imageUrl: "", currentPrice: 12000, previousPrice: 13500, change: -11.1, rarity: "Raro", condition: "MS-64", year: 1916, description: "Primer año de emisión.", demand: "Media", historicalPrices: [{ date: "2023-06", price: 14500 }, { date: "2023-09", price: 14000 }, { date: "2023-12", price: 13500 }, { date: "2024-03", price: 12800 }, { date: "2024-06", price: 12000 }] },
];

const toysItems: MarketItem[] = [
  { id: "t1", name: "Star Wars Boba Fett (1979)", category: "Juguetes", imageUrl: "", currentPrice: 45000, previousPrice: 40000, change: 12.5, rarity: "Ultra Raro", condition: "AFA 85", year: 1979, description: "Figura de acción del prototipo de Boba Fett.", demand: "Muy Alta", historicalPrices: [{ date: "2023-06", price: 35000 }, { date: "2023-09", price: 37000 }, { date: "2023-12", price: 40000 }, { date: "2024-03", price: 42000 }, { date: "2024-06", price: 45000 }] },
  { id: "t2", name: "Hot Wheels Pink Rear-Load VW Beach Bomb", category: "Juguetes", imageUrl: "", currentPrice: 150000, previousPrice: 145000, change: 3.4, rarity: "Ultra Raro", condition: "Excelente", year: 1969, description: "El Hot Wheels más valioso del mundo.", demand: "Muy Alta", historicalPrices: [{ date: "2023-06", price: 140000 }, { date: "2023-09", price: 142000 }, { date: "2023-12", price: 145000 }, { date: "2024-03", price: 148000 }, { date: "2024-06", price: 150000 }] },
  { id: "t3", name: "LEGO Café Corner 10182", category: "Juguetes", imageUrl: "", currentPrice: 3500, previousPrice: 3200, change: 9.4, rarity: "Raro", condition: "Sellado", year: 2007, description: "Primer set modular de LEGO.", demand: "Alta", historicalPrices: [{ date: "2023-06", price: 2800 }, { date: "2023-09", price: 3000 }, { date: "2023-12", price: 3200 }, { date: "2024-03", price: 3350 }, { date: "2024-06", price: 3500 }] },
  { id: "t4", name: "G.I. Joe Original (1964)", category: "Juguetes", imageUrl: "", currentPrice: 6000, previousPrice: 6500, change: -7.7, rarity: "Muy Raro", condition: "CIB", year: 1964, description: "Primera figura de acción G.I. Joe.", demand: "Media", historicalPrices: [{ date: "2023-06", price: 7000 }, { date: "2023-09", price: 6800 }, { date: "2023-12", price: 6500 }, { date: "2024-03", price: 6200 }, { date: "2024-06", price: 6000 }] },
  { id: "t5", name: "Transformers G1 Optimus Prime", category: "Juguetes", imageUrl: "", currentPrice: 2200, previousPrice: 2500, change: -12.0, rarity: "Raro", condition: "Completo", year: 1984, description: "Optimus Prime original de la serie G1.", demand: "Media", historicalPrices: [{ date: "2023-06", price: 2800 }, { date: "2023-09", price: 2700 }, { date: "2023-12", price: 2500 }, { date: "2024-03", price: 2350 }, { date: "2024-06", price: 2200 }] },
];

const stampsItems: MarketItem[] = [
  { id: "s1", name: "British Guiana 1c Magenta", category: "Sellos", imageUrl: "", currentPrice: 8300000, previousPrice: 8100000, change: 2.5, rarity: "Ultra Raro", condition: "Usado", year: 1856, description: "El sello más caro del mundo.", demand: "Muy Alta", historicalPrices: [{ date: "2023-06", price: 7800000 }, { date: "2023-09", price: 7950000 }, { date: "2023-12", price: 8100000 }, { date: "2024-03", price: 8200000 }, { date: "2024-06", price: 8300000 }] },
  { id: "s2", name: "Inverted Jenny", category: "Sellos", imageUrl: "", currentPrice: 1500000, previousPrice: 1350000, change: 11.1, rarity: "Ultra Raro", condition: "MNH", year: 1918, description: "Error de impresión del avión invertido.", demand: "Muy Alta", historicalPrices: [{ date: "2023-06", price: 1200000 }, { date: "2023-09", price: 1280000 }, { date: "2023-12", price: 1350000 }, { date: "2024-03", price: 1420000 }, { date: "2024-06", price: 1500000 }] },
  { id: "s3", name: "Penny Black", category: "Sellos", imageUrl: "", currentPrice: 5000, previousPrice: 4800, change: 4.2, rarity: "Raro", condition: "Usado", year: 1840, description: "Primer sello postal del mundo.", demand: "Alta", historicalPrices: [{ date: "2023-06", price: 4500 }, { date: "2023-09", price: 4600 }, { date: "2023-12", price: 4800 }, { date: "2024-03", price: 4900 }, { date: "2024-06", price: 5000 }] },
  { id: "s4", name: "Treskilling Yellow", category: "Sellos", imageUrl: "", currentPrice: 2300000, previousPrice: 2500000, change: -8.0, rarity: "Ultra Raro", condition: "Usado", year: 1855, description: "Error sueco impreso en amarillo en vez de verde.", demand: "Alta", historicalPrices: [{ date: "2023-06", price: 2600000 }, { date: "2023-09", price: 2550000 }, { date: "2023-12", price: 2500000 }, { date: "2024-03", price: 2400000 }, { date: "2024-06", price: 2300000 }] },
];

const vinylItems: MarketItem[] = [
  { id: "v1", name: "The Beatles — Yesterday and Today (Butcher Cover)", category: "Vinilos", imageUrl: "", currentPrice: 125000, previousPrice: 110000, change: 13.6, rarity: "Ultra Raro", condition: "Sellado", year: 1966, description: "Portada censurada, mono, sellado.", demand: "Muy Alta", historicalPrices: [{ date: "2023-06", price: 100000 }, { date: "2023-09", price: 105000 }, { date: "2023-12", price: 110000 }, { date: "2024-03", price: 118000 }, { date: "2024-06", price: 125000 }] },
  { id: "v2", name: "Wu-Tang Clan — Once Upon a Time in Shaolin", category: "Vinilos", imageUrl: "", currentPrice: 4000000, previousPrice: 3800000, change: 5.3, rarity: "Ultra Raro", condition: "Mint", year: 2015, description: "Una sola copia producida.", demand: "Muy Alta", historicalPrices: [{ date: "2023-06", price: 3500000 }, { date: "2023-09", price: 3650000 }, { date: "2023-12", price: 3800000 }, { date: "2024-03", price: 3900000 }, { date: "2024-06", price: 4000000 }] },
  { id: "v3", name: "Sex Pistols — God Save the Queen (A&M)", category: "Vinilos", imageUrl: "", currentPrice: 18000, previousPrice: 20000, change: -10.0, rarity: "Muy Raro", condition: "VG+", year: 1977, description: "Retirado antes de distribución.", demand: "Alta", historicalPrices: [{ date: "2023-06", price: 22000 }, { date: "2023-09", price: 21000 }, { date: "2023-12", price: 20000 }, { date: "2024-03", price: 19000 }, { date: "2024-06", price: 18000 }] },
  { id: "v4", name: "Bob Dylan — The Freewheelin' (stereo)", category: "Vinilos", imageUrl: "", currentPrice: 35000, previousPrice: 33000, change: 6.1, rarity: "Muy Raro", condition: "NM", year: 1963, description: "Edición original con pistas retiradas.", demand: "Alta", historicalPrices: [{ date: "2023-06", price: 30000 }, { date: "2023-09", price: 31500 }, { date: "2023-12", price: 33000 }, { date: "2024-03", price: 34000 }, { date: "2024-06", price: 35000 }] },
];

export const marketDataByCategory: Record<string, MarketItem[]> = {
  comics: comicsItems,
  cards: cardsItems,
  coins: coinsItems,
  toys: toysItems,
  stamps: stampsItems,
  vinyl: vinylItems,
};

export function getTopValuable(categoryId: string): MarketItem[] {
  const items = marketDataByCategory[categoryId] || [];
  return [...items].sort((a, b) => b.currentPrice - a.currentPrice);
}

export function getRising(categoryId: string): MarketItem[] {
  const items = marketDataByCategory[categoryId] || [];
  return [...items].filter(i => i.change > 0).sort((a, b) => b.change - a.change);
}

export function getFalling(categoryId: string): MarketItem[] {
  const items = marketDataByCategory[categoryId] || [];
  return [...items].filter(i => i.change < 0).sort((a, b) => a.change - b.change);
}

export function formatPrice(price: number): string {
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `$${(price / 1_000).toFixed(1)}K`;
  return `$${price}`;
}
