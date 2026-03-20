/**
 * Local search history & viewed items store for personalized recommendations.
 * Data stays in localStorage — no server-side storage.
 */

export interface SearchHistoryEntry {
  query: string;
  timestamp: number;
  category?: string;
}

export interface ViewedItem {
  id: string;
  name: string;
  category: string;
  price?: number;
  rarity?: string;
  year?: number;
  series?: string;
  timestamp: number;
}

const SEARCH_KEY = "colecscan_search_history";
const VIEWED_KEY = "colecscan_viewed_items";
const MAX_SEARCHES = 50;
const MAX_VIEWED = 50;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// ── Search history ──────────────────────────────────

export function getSearchHistory(): SearchHistoryEntry[] {
  return readJSON<SearchHistoryEntry[]>(SEARCH_KEY, []);
}

export function addSearchEntry(query: string, category?: string) {
  if (!query || query.length < 2) return;
  const history = getSearchHistory();
  // Deduplicate: remove previous identical query
  const filtered = history.filter(
    (h) => h.query.toLowerCase() !== query.toLowerCase()
  );
  filtered.unshift({ query, timestamp: Date.now(), category });
  localStorage.setItem(SEARCH_KEY, JSON.stringify(filtered.slice(0, MAX_SEARCHES)));
}

export function getRecentSearches(limit = 10): SearchHistoryEntry[] {
  return getSearchHistory().slice(0, limit);
}

export function clearSearchHistory() {
  localStorage.removeItem(SEARCH_KEY);
}

// ── Viewed items ────────────────────────────────────

export function getViewedItems(): ViewedItem[] {
  return readJSON<ViewedItem[]>(VIEWED_KEY, []);
}

export function addViewedItem(item: Omit<ViewedItem, "timestamp">) {
  const items = getViewedItems();
  const filtered = items.filter((v) => v.id !== item.id);
  filtered.unshift({ ...item, timestamp: Date.now() });
  localStorage.setItem(VIEWED_KEY, JSON.stringify(filtered.slice(0, MAX_VIEWED)));
}

export function getRecentlyViewed(limit = 10): ViewedItem[] {
  return getViewedItems().slice(0, limit);
}

export function clearViewedItems() {
  localStorage.removeItem(VIEWED_KEY);
}

// ── Frequent categories ─────────────────────────────

export function getFrequentCategories(limit = 3): string[] {
  const searches = getSearchHistory();
  const viewed = getViewedItems();
  const counts: Record<string, number> = {};

  searches.forEach((s) => {
    if (s.category) counts[s.category] = (counts[s.category] || 0) + 2;
  });
  viewed.forEach((v) => {
    counts[v.category] = (counts[v.category] || 0) + 1;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([cat]) => cat);
}

// ── Build context for AI recommendations ────────────

export function buildRecommendationContext(): {
  recentSearches: string[];
  recentViewed: { name: string; category: string; rarity?: string }[];
  frequentCategories: string[];
} {
  return {
    recentSearches: getRecentSearches(10).map((s) => s.query),
    recentViewed: getRecentlyViewed(10).map((v) => ({
      name: v.name,
      category: v.category,
      rarity: v.rarity,
    })),
    frequentCategories: getFrequentCategories(3),
  };
}
