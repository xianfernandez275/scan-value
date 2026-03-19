export interface CollectibleItem {
  id: string;
  name: string;
  category: string;
  year: number;
  description: string;
  version: string;
  specialFeatures: string[];
  rarity: "Común" | "Poco Común" | "Raro" | "Muy Raro" | "Ultra Raro";
  condition: string;
  currentValue: number;
  historicalPrices: { date: string; price: number }[];
  demand: "Baja" | "Media" | "Alta" | "Muy Alta";
  imageUrl: string;
}

export const mockResults: CollectibleItem[] = [
  {
    id: "1",
    name: "Spider-Man #129",
    category: "Cómics",
    year: 1974,
    description: "Primera aparición de The Punisher. Número icónico de Marvel Comics que marcó un hito en la historia del cómic.",
    version: "Primera edición",
    specialFeatures: ["Primera aparición de Punisher", "Cover de Gil Kane", "Mark Jewelers insert"],
    rarity: "Muy Raro",
    condition: "VF 8.0",
    currentValue: 15500,
    historicalPrices: [
      { date: "2020-01", price: 8000 },
      { date: "2021-01", price: 12000 },
      { date: "2022-01", price: 18000 },
      { date: "2023-01", price: 14000 },
      { date: "2024-01", price: 15500 },
    ],
    demand: "Muy Alta",
    imageUrl: "",
  },
  {
    id: "2",
    name: "Charizard Base Set 1st Edition",
    category: "Cartas",
    year: 1999,
    description: "La carta más icónica de Pokémon TCG. Holo rara de primera edición del set base.",
    version: "1st Edition Shadowless",
    specialFeatures: ["Holográfica", "Primera edición", "Sin sombra"],
    rarity: "Ultra Raro",
    condition: "PSA 9",
    currentValue: 250000,
    historicalPrices: [
      { date: "2020-01", price: 50000 },
      { date: "2021-01", price: 350000 },
      { date: "2022-01", price: 300000 },
      { date: "2023-01", price: 220000 },
      { date: "2024-01", price: 250000 },
    ],
    demand: "Muy Alta",
    imageUrl: "",
  },
  {
    id: "3",
    name: "Morgan Silver Dollar 1893-S",
    category: "Monedas",
    year: 1893,
    description: "Una de las monedas de dólar Morgan más raras y codiciadas por coleccionistas.",
    version: "San Francisco Mint",
    specialFeatures: ["Mintage: 100,000", "Key date", "90% plata"],
    rarity: "Ultra Raro",
    condition: "MS-63",
    currentValue: 45000,
    historicalPrices: [
      { date: "2020-01", price: 35000 },
      { date: "2021-01", price: 38000 },
      { date: "2022-01", price: 42000 },
      { date: "2023-01", price: 43000 },
      { date: "2024-01", price: 45000 },
    ],
    demand: "Alta",
    imageUrl: "",
  },
];

export const categories = [
  { id: "comics", label: "Cómics", icon: "📚", count: 1243 },
  { id: "cards", label: "Cartas", icon: "🃏", count: 3891 },
  { id: "coins", label: "Monedas", icon: "🪙", count: 2156 },
  { id: "toys", label: "Juguetes", icon: "🧸", count: 987 },
  { id: "stamps", label: "Sellos", icon: "📮", count: 1567 },
  { id: "vinyl", label: "Vinilos", icon: "🎵", count: 743 },
];
