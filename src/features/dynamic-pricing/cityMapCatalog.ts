/**
 * Cartes portefeuille par ville — polygones SVG (viewBox 1000×480) + métadonnées.
 * Marrakech : design validé. Casablanca : brouillon géographique (à affiner via Claude Design).
 */
import { normalizeCityKey } from './cityScope';

export type MapCityKey = 'Marrakech' | 'Casablanca';

/** Villes proposées dans le modal ⟳ « Actualiser le marché » */
export const MARKET_REFRESH_CITIES: MapCityKey[] = ['Marrakech', 'Casablanca'];

export interface MapZoneDef {
  id: string;
  name: string;
  path: string;
  labelX: number;
  labelY: number;
  fill: string;
  labelColor: string;
}

export interface CityMapCatalogEntry {
  cityKey: MapCityKey;
  zones: MapZoneDef[];
  /** Bbox [minLat, maxLat, minLng, maxLng] — assignation pin → zone si district absent */
  zoneBboxes: Record<string, [number, number, number, number]>;
  zoneLabels: Record<string, string>;
  marketRefreshAvailable: boolean;
}

/** Marrakech — polygones actuels (PortfolioMap) */
const MARRAKECH_ZONES: MapZoneDef[] = [
  { id: 'gueliz', name: 'GUÉLIZ', path: 'M 380,100 Q 480,80 580,110 Q 610,200 580,280 Q 480,300 380,270 Q 350,180 380,100 Z', labelX: 480, labelY: 200, fill: '#F4CF5E', labelColor: '#14110a' },
  { id: 'medina', name: 'MÉDINA', path: 'M 610,150 Q 720,120 820,160 Q 870,220 850,310 Q 770,370 670,360 Q 580,300 590,220 Z', labelX: 720, labelY: 260, fill: '#c79b22', labelColor: '#fff' },
  { id: 'hivernage', name: 'HIVERNAGE', path: 'M 250,280 Q 340,260 420,290 Q 440,360 410,410 Q 320,420 250,400 Q 230,340 250,280 Z', labelX: 340, labelY: 340, fill: '#fae5a3', labelColor: '#14110a' },
  { id: 'menara', name: 'MÉNARA', path: 'M 100,360 Q 180,340 240,370 Q 250,420 220,450 Q 140,450 100,440 Q 80,400 100,360 Z', labelX: 170, labelY: 405, fill: '#fdf3d0', labelColor: '#14110a' },
  { id: 'palmeraie', name: 'PALMERAIE', path: 'M 870,90 Q 970,70 970,140 Q 970,210 920,250 Q 850,250 830,200 Q 830,120 870,90 Z', labelX: 905, labelY: 170, fill: '#fdf3d0', labelColor: '#14110a' },
  { id: 'agdal', name: 'AGDAL', path: 'M 520,360 Q 620,340 720,370 Q 750,420 700,450 Q 600,460 520,440 Q 500,400 520,360 Z', labelX: 620, labelY: 405, fill: '#fae5a3', labelColor: '#14110a' },
];

/**
 * Casablanca — brouillon (côte en haut du SVG ≈ nord).
 * Quartiers cibles produit : Ain Diab, Anfa, Maarif, CFC, Bourgogne, Gauthier.
 * TODO design : paths SVG finaux + alignement marché quand refresh marché CFC exist.
 */
const CASABLANCA_ZONES: MapZoneDef[] = [
  { id: 'ain_diab', name: 'AIN DIAB', path: 'M 40,80 Q 120,40 200,90 Q 220,180 160,240 Q 80,250 50,180 Q 30,120 40,80 Z', labelX: 130, labelY: 155, fill: '#fdf3d0', labelColor: '#14110a' },
  { id: 'anfa', name: 'ANFA', path: 'M 180,100 Q 280,70 360,120 Q 380,200 320,260 Q 220,270 190,210 Q 160,150 180,100 Z', labelX: 280, labelY: 175, fill: '#fae5a3', labelColor: '#14110a' },
  { id: 'maarif', name: 'MAARIF', path: 'M 360,120 Q 480,90 580,140 Q 600,220 520,290 Q 400,300 360,240 Q 340,180 360,120 Z', labelX: 470, labelY: 200, fill: '#F4CF5E', labelColor: '#14110a' },
  { id: 'cfc', name: 'CFC', path: 'M 520,150 Q 640,120 760,170 Q 780,250 700,320 Q 580,330 520,270 Q 500,210 520,150 Z', labelX: 640, labelY: 235, fill: '#c79b22', labelColor: '#fff' },
  { id: 'bourgogne', name: 'BOURGOGNE', path: 'M 700,90 Q 820,60 920,110 Q 940,190 860,250 Q 760,260 720,200 Q 680,140 700,90 Z', labelX: 810, labelY: 165, fill: '#fae5a3', labelColor: '#14110a' },
  { id: 'gauthier', name: 'GAUTHIER', path: 'M 280,280 Q 400,250 520,300 Q 540,380 460,430 Q 340,440 280,390 Q 250,330 280,280 Z', labelX: 400, labelY: 355, fill: '#fdf3d0', labelColor: '#14110a' },
];

const CATALOG: Record<MapCityKey, CityMapCatalogEntry> = {
  Marrakech: {
    cityKey: 'Marrakech',
    zones: MARRAKECH_ZONES,
    zoneBboxes: {
      medina: [31.618, 31.642, -7.998, -7.968],
      gueliz: [31.628, 31.658, -8.018, -7.982],
      hivernage: [31.632, 31.652, -8.028, -7.998],
      menara: [31.608, 31.632, -8.045, -8.005],
      agdal: [31.598, 31.622, -8.028, -7.988],
      palmeraie: [31.655, 31.72, -8.06, -7.92],
      annakhil: [31.638, 31.668, -8.055, -8.015],
    },
    zoneLabels: {
      medina: 'Médina',
      gueliz: 'Guéliz',
      hivernage: 'Hivernage',
      menara: 'Ménara',
      agdal: 'Agdal',
      palmeraie: 'Palmeraie',
      annakhil: 'Annakhil',
    },
    marketRefreshAvailable: true,
  },
  Casablanca: {
    cityKey: 'Casablanca',
    zones: CASABLANCA_ZONES,
    zoneBboxes: {
      ain_diab: [33.565, 33.595, -7.72, -7.68],
      anfa: [33.575, 33.605, -7.7, -7.66],
      maarif: [33.58, 33.61, -7.66, -7.62],
      cfc: [33.59, 33.62, -7.64, -7.6],
      bourgogne: [33.6, 33.63, -7.66, -7.62],
      gauthier: [33.585, 33.615, -7.68, -7.64],
    },
    zoneLabels: {
      ain_diab: 'Ain Diab',
      anfa: 'Anfa',
      maarif: 'Maarif',
      cfc: 'CFC',
      bourgogne: 'Bourgogne',
      gauthier: 'Gauthier',
    },
    marketRefreshAvailable: true,
  },
};

export function resolveMapCityKey(cityLabel: string | null | undefined): MapCityKey | null {
  if (!cityLabel) return null;
  const key = normalizeCityKey(cityLabel);
  if (key === 'Marrakech' || key === 'Casablanca') return key;
  return null;
}

export function getCityMapCatalog(cityLabel: string | null | undefined): CityMapCatalogEntry | null {
  const key = resolveMapCityKey(cityLabel);
  return key ? CATALOG[key] : null;
}

export function hasCityZoneLayer(cityLabel: string | null | undefined): boolean {
  return getCityMapCatalog(cityLabel) != null;
}

export function guessZoneIdForCity(
  cityLabel: string | null | undefined,
  district?: string | null,
  lat?: number | null,
  lng?: number | null,
): string {
  const catalog = getCityMapCatalog(cityLabel);
  if (!catalog) return 'gueliz';

  const t = (district ?? '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  for (const [id, label] of Object.entries(catalog.zoneLabels)) {
    const token = label.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    if (t.includes(token) || t.includes(id.replace('_', ' '))) return id;
  }
  if (catalog.cityKey === 'Casablanca') {
    if (t.includes('californie') || t.includes('oasis')) return 'gauthier';
    if (t.includes('centre') || t.includes('downtown')) return 'cfc';
  }
  if (catalog.cityKey === 'Marrakech') {
    if (t.includes('medina') || t.includes('souks')) return 'medina';
    if (t.includes('gueliz')) return 'gueliz';
    if (t.includes('hivernage')) return 'hivernage';
    if (t.includes('menara')) return 'menara';
    if (t.includes('palmeraie')) return 'palmeraie';
    if (t.includes('agdal')) return 'agdal';
  }

  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    for (const [id, bbox] of Object.entries(catalog.zoneBboxes)) {
      const [minLat, maxLat, minLng, maxLng] = bbox;
      if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) return id;
    }
  }

  return catalog.cityKey === 'Casablanca' ? 'maarif' : 'gueliz';
}
