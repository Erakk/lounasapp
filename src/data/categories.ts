// Categories are the main navigation of the app. A place has 1–3 of them (first = primary).
// "aasia" is also an umbrella: every place tagged thai/kiina/vietnam/japani/korea is
// treated as Asian by the filters, so it does not need to be tagged twice.

export const CATEGORY_IDS = [
  'kotiruoka',
  'buffet',
  'aasia',
  'thai',
  'kiina',
  'vietnam',
  'japani',
  'korea',
  'intia',
  'valimeri',
  'burger',
  'pizza',
  'kebab',
  'bistro',
  'vege',
  'keitto',
  'kahvila',
  'muu',
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export interface Category {
  id: CategoryId;
  label: string; // Finnish UI label
  emoji: string;
  /** Soft tile background (light theme). */
  tile: string;
  /** Umbrella category this one belongs to, if any. */
  parent?: CategoryId;
}

export const CATEGORIES: Category[] = [
  { id: 'kotiruoka', label: 'Kotiruoka', emoji: '🥘', tile: '#F6E7D7' },
  { id: 'buffet', label: 'Buffet', emoji: '🍽️', tile: '#EFE6F6' },
  { id: 'aasia', label: 'Aasialainen', emoji: '🥢', tile: '#FBE3E1' },
  { id: 'thai', label: 'Thai & Laos', emoji: '🌶️', tile: '#FDE6D8', parent: 'aasia' },
  { id: 'kiina', label: 'Kiina & nuudelit', emoji: '🍜', tile: '#FCE9D6', parent: 'aasia' },
  { id: 'vietnam', label: 'Vietnam', emoji: '🍲', tile: '#E5F1E2', parent: 'aasia' },
  { id: 'japani', label: 'Japani & sushi', emoji: '🍣', tile: '#E3ECF7', parent: 'aasia' },
  { id: 'korea', label: 'Korea', emoji: '🍗', tile: '#F7E4EC', parent: 'aasia' },
  { id: 'intia', label: 'Intia & Nepal', emoji: '🍛', tile: '#FBEBC8' },
  { id: 'valimeri', label: 'Välimeri & Lähi-itä', emoji: '🧆', tile: '#E8F0DD' },
  { id: 'burger', label: 'Burgerit', emoji: '🍔', tile: '#FBE5CF' },
  { id: 'pizza', label: 'Pizza & pasta', emoji: '🍕', tile: '#FCE0DA' },
  { id: 'kebab', label: 'Kebab & grilli', emoji: '🥙', tile: '#F3E3D3' },
  { id: 'bistro', label: 'Bistro & ravintola', emoji: '🍷', tile: '#EDE3E8' },
  { id: 'vege', label: 'Kasvis & vegaani', emoji: '🥗', tile: '#DFF0E3' },
  { id: 'keitto', label: 'Keitto & kevyt', emoji: '🥣', tile: '#E2EEF0' },
  { id: 'kahvila', label: 'Kahvila', emoji: '☕', tile: '#EDE4DA' },
  { id: 'muu', label: 'Muut maut', emoji: '🌍', tile: '#E6E6F2' },
];

/** Tile background that adapts to dark mode (token --tile-mix in index.css). */
export const tileBg = (hex: string) => `color-mix(in srgb, ${hex} var(--tile-mix), var(--surface))`;

export const ASIAN_SUBCATEGORIES: CategoryId[] = CATEGORIES.filter((c) => c.parent === 'aasia').map(
  (c) => c.id,
);

export const CLUSTERS = {
  koskikeskus: { name: 'Koskikeskus', address: 'Hatanpään valtatie 1', lat: 61.496259, lon: 23.766584 },
  kauppahalli: { name: 'Kauppahalli', address: 'Hämeenkatu 19', lat: 61.496931, lon: 23.758791 },
  ratina: { name: 'Ratina', address: 'Vuolteenkatu 1', lat: 61.493267, lon: 23.767339 },
} as const;

export type ClusterId = keyof typeof CLUSTERS;

/** Origin for all distances: Kehräsaari (OSM node 1835267025). */
export const ORIGIN = { name: 'Kehräsaari', lat: 61.4955657, lon: 23.7636643 } as const;
