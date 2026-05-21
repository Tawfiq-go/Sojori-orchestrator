/**
 * Fonds §06 — Carto (fiable en dev) ; Esri en secours.
 * Zoom ville (≥12) : pas de frontière Sahara visible (contrairement à OSM zoom pays).
 */
export type MapBasemapId = 'cartoVoyager' | 'esriStreet' | 'esriImagery';

export interface MapBasemapDef {
  id: MapBasemapId;
  label: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string;
}

export const MAP_BASEMAPS: Record<MapBasemapId, MapBasemapDef> = {
  cartoVoyager: {
    id: 'cartoVoyager',
    label: 'Plan',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
  },
  esriStreet: {
    id: 'esriStreet',
    label: 'Esri plan',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      '© Esri — <a href="https://www.esri.com/">Esri</a>',
    maxZoom: 19,
  },
  esriImagery: {
    id: 'esriImagery',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      '© Esri — <a href="https://www.esri.com/">Esri</a>',
    maxZoom: 19,
  },
};

/** Vue Maroc — évite zoom arrière-plan national. */
export const MOROCCO_MAP_BOUNDS: [[number, number], [number, number]] = [
  [20.75, -17.35],
  [36.05, -0.98],
];

export const DEFAULT_MAP_BASEMAP: MapBasemapId = 'cartoVoyager';

export const MAP_CONTAINER_HEIGHT_PX = 480;
