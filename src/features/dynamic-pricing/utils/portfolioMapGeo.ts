/** Projection lat/lng → viewBox 1000×480 pour la carte portefeuille */

import { getCityMapCatalog, hasCityZoneLayer } from '../cityMapCatalog';
import { normalizeCityKey } from '../cityScope';

export type MapBounds = {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
};

const CITY_BOUNDS: Record<string, MapBounds> = {
  Marrakech: { latMin: 31.55, latMax: 31.72, lngMin: -8.12, lngMax: -7.95 },
  Casablanca: { latMin: 33.52, latMax: 33.64, lngMin: -7.72, lngMax: -7.55 },
};

const PADDING = 0.012;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function boundsFromPins(
  pins: Array<{ lat: number; lng: number }>,
): MapBounds | null {
  if (!pins.length) return null;
  let latMin = pins[0].lat;
  let latMax = pins[0].lat;
  let lngMin = pins[0].lng;
  let lngMax = pins[0].lng;
  for (const p of pins) {
    latMin = Math.min(latMin, p.lat);
    latMax = Math.max(latMax, p.lat);
    lngMin = Math.min(lngMin, p.lng);
    lngMax = Math.max(lngMax, p.lng);
  }
  const latPad = Math.max((latMax - latMin) * 0.15, PADDING);
  const lngPad = Math.max((lngMax - lngMin) * 0.15, PADDING);
  return {
    latMin: latMin - latPad,
    latMax: latMax + latPad,
    lngMin: lngMin - lngPad,
    lngMax: lngMax + lngPad,
  };
}

export function resolveMapBounds(
  cityLabel: string | null | undefined,
  pins: Array<{ lat: number; lng: number }>,
): MapBounds {
  const key = cityLabel ? normalizeCityKey(cityLabel) : null;
  if (key && CITY_BOUNDS[key]) return CITY_BOUNDS[key];
  const fromPins = boundsFromPins(pins);
  if (fromPins) return fromPins;
  return CITY_BOUNDS.Marrakech;
}

export function latLngToMapStage(
  lat: number,
  lng: number,
  bounds: MapBounds,
): { x: number; y: number } {
  const latSpan = bounds.latMax - bounds.latMin || 0.01;
  const lngSpan = bounds.lngMax - bounds.lngMin || 0.01;
  const x = ((lng - bounds.lngMin) / lngSpan) * 1000;
  const y = ((bounds.latMax - lat) / latSpan) * 480;
  return {
    x: clamp(Math.round(x), 24, 976),
    y: clamp(Math.round(y), 24, 456),
  };
}

/** @deprecated use hasCityZoneLayer */
export function shouldShowMarrakechZoneLayer(cityLabel: string | null | undefined): boolean {
  return hasCityZoneLayer(cityLabel);
}

export function mapSubtitleForCity(cityLabel: string | null | undefined): string {
  if (!cityLabel) {
    return 'Vue toutes villes — pins positionnés selon GPS (pas de zones quartiers).';
  }
  const catalog = getCityMapCatalog(cityLabel);
  if (!catalog) {
    return `Pins ${normalizeCityKey(cityLabel)} — carte centrée sur la ville (pas de polygones quartiers pour cette ville).`;
  }
  const names = catalog.zones.map((z) => z.name.charAt(0) + z.name.slice(1).toLowerCase()).slice(0, 4).join(', ');
  const marketNote = catalog.marketRefreshAvailable
    ? ' · cache marché ⟳ disponible'
    : ' · cache ville bientôt (pins + zones Sojori déjà actifs)';
  return `Quartiers ${catalog.cityKey} (${names}, …) · pins = vos biens avec coordonnées${marketNote}.`;
}
