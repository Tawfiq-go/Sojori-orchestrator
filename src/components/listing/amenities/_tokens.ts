// ════════════════════════════════════════════════════════════════════
// Sojori · Amenities Tab · _tokens.ts
// Palette light Sojori + types alignés API + keyframes
// ════════════════════════════════════════════════════════════════════

export const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a',
  primaryTint: 'rgba(184,133,26,0.10)', primaryTint2: 'rgba(184,133,26,0.20)',
  ai: '#7c3aed', aiTint: 'rgba(124,58,237,0.10)',
  bg0: '#f6f5f1', bg1: '#fff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)', borderStrong: 'rgba(20,17,10,0.14)',
  success: '#22c55e', successTint: 'rgba(34,197,94,0.10)',
  warning: '#c46506', warningTint: 'rgba(196,101,6,0.10)',
  error:   '#dc2626', errorTint:   'rgba(220,38,38,0.10)',
  info:    '#0673b3', infoTint:    'rgba(6,115,179,0.10)',
} as const;

export const KEYFRAMES = `
@keyframes sj-fadeIn { from {opacity:0; transform:translateY(6px)} to {opacity:1; transform:none} }
@keyframes sj-scaleIn { 0% {transform:scale(0.92)} 60% {transform:scale(1.04)} 100% {transform:scale(1)} }
@keyframes sj-popCheck { 0% {transform:scale(0)} 60% {transform:scale(1.2)} 100% {transform:scale(1)} }
@keyframes sj-shimmer { 0% {background-position:-200% 0} 100% {background-position:200% 0} }
@media (prefers-reduced-motion: reduce) { [class*="sj-anim-"] { animation: none !important; } }
`;

/* ─── Types (alignés API srv-listing) ────────────────────────────── */
export type CategoryName =
  | 'Bathroom' | 'Bedroom & Laundry' | 'Kitchen & Dining' | 'Heating & Cooling'
  | 'Internet & Office' | 'Cleaning & Disinfection' | 'Home Safety'
  | 'Accessibility Features' | 'Entertainment' | 'Family Friendly'
  | 'Pet-Friendly Amenities' | 'Outdoor & View' | 'Location features'
  | 'Parking & Transportation' | 'Services' | 'Wellness & Spa'
  | 'Sports & Activities' | 'Building Features';

export const CATEGORY_META: Record<CategoryName, { emoji: string; short: string }> = {
  'Bathroom':                  { emoji: '🚿', short: 'Bathroom' },
  'Bedroom & Laundry':         { emoji: '🛏', short: 'Bedroom & Laundry' },
  'Kitchen & Dining':          { emoji: '🍳', short: 'Kitchen & Dining' },
  'Heating & Cooling':         { emoji: '❄️', short: 'Heating & Cooling' },
  'Internet & Office':         { emoji: '📶', short: 'Internet & Office' },
  'Cleaning & Disinfection':   { emoji: '🧼', short: 'Cleaning & Disinfection' },
  'Home Safety':               { emoji: '🛡', short: 'Home Safety' },
  'Accessibility Features':    { emoji: '♿', short: 'Accessibility' },
  'Entertainment':             { emoji: '📺', short: 'Entertainment' },
  'Family Friendly':           { emoji: '👶', short: 'Family Friendly' },
  'Pet-Friendly Amenities':    { emoji: '🐾', short: 'Pet-Friendly' },
  'Outdoor & View':            { emoji: '🌳', short: 'Outdoor & View' },
  'Location features':         { emoji: '📍', short: 'Location' },
  'Parking & Transportation':  { emoji: '🚗', short: 'Parking & Transport' },
  'Services':                  { emoji: '🛎', short: 'Services' },
  'Wellness & Spa':            { emoji: '🧖', short: 'Wellness & Spa' },
  'Sports & Activities':       { emoji: '⛳', short: 'Sports & Activities' },
  'Building Features':         { emoji: '🏢', short: 'Building' },
};

/** Catégories Airbnb FR (catalogue PM srv-listing) */
export const AIRBNB_FR_CATEGORY_META: Record<string, { emoji: string; short: string }> = {
  'Équipements de base':           { emoji: '🏠', short: 'Essentiels' },
  'Salle de bain':                 { emoji: '🚿', short: 'Salle de bain' },
  'Chambre et linge':              { emoji: '🛏', short: 'Chambre & linge' },
  'Divertissement':                { emoji: '📺', short: 'Divertissement' },
  'Famille':                       { emoji: '👶', short: 'Famille' },
  'Chauffage et climatisations':   { emoji: '❄️', short: 'Chauffage & clim' },
  'Sécurité à la maison':          { emoji: '🛡', short: 'Sécurité' },
  'Internet et bureau':            { emoji: '📶', short: 'Internet & bureau' },
  'Cuisine et salle à manger':     { emoji: '🍳', short: 'Cuisine' },
  "Caractéristiques de l'emplacement": { emoji: '📍', short: 'Emplacement' },
  'Extérieur':                     { emoji: '🌳', short: 'Extérieur' },
  'Parking et installations':      { emoji: '🚗', short: 'Parking' },
  'Services':                      { emoji: '🛎', short: 'Services' },
};

export function getCategoryMeta(cat: string): { emoji: string; short: string } {
  if (cat === 'Basic') return { emoji: '⚡', short: 'Essentiels Airbnb' };
  return (
    CATEGORY_META[cat as CategoryName] ??
    AIRBNB_FR_CATEGORY_META[cat] ?? { emoji: '✨', short: cat }
  );
}

export interface Amenity {
  _id: string;
  rentalAmenityId: number;
  nameFr: string;
  nameEn: string;
  categories: string[];
  basic: boolean;
  useBed: boolean;
  needsRoomAssignment: boolean;
  /** rentalId des pièces où l'équipement peut être placé (catalogue API) */
  compositionRoomIds: string[];
  iconUrl?: string;
  emoji?: string;
}

export interface CompositionRoom {
  rentalId: string;
  roomName: string;
  nameFr: string;
  nameEn: string;
  useBed: boolean;
  order: number;
}

/** Sélection dans `listingAmenitiesIds[]` */
export interface SelectedAmenity {
  _id: string;
  count: number;
  /** rentalIds des CompositionRoom où l'amenity est placée (si needsRoomAssignment) */
  roomRentalIds?: string[];
}

export type Density = 'dense' | 'cozy' | 'list';
export type ViewMode = 'categories' | 'rooms' | 'plan';

/** Mapping rentalAmenityId → emoji (fallback front · liste partielle, étendre selon besoin) */
export const AMENITY_EMOJI: Record<number, string> = {
  792:  '📶', 187: '🌡', 180: '❄️', 600: '🧺', 599: '🧺', 781: '🚨', 955: '🧯', 943: '💨',
  364:  '🔥', 689: '🛗', 829: '💻', 438: '📶', 73:  '💼', 779: '🛏', 778: '🛏', 957: '🛏',
  852:  '📺', 480: '📺', 468: '📺', 889: '🔊', 1857: '🚿', 1858: '🚿', 1840: '🧴', 1838: '🧴',
  328:  '🌡', 281: '♿', 775: '♿', 1834: '🌳', 999: '🌳', 977: '🏖',
};

export function emojiFor(a: Amenity): string {
  if (a.emoji) return a.emoji;
  if (AMENITY_EMOJI[a.rentalAmenityId]) return AMENITY_EMOJI[a.rentalAmenityId];
  return getCategoryMeta(a.categories[0] ?? '').emoji || '✅';
}

export const ALL_CATEGORIES: CategoryName[] = Object.keys(CATEGORY_META) as CategoryName[];
