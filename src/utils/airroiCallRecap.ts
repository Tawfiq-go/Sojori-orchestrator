/** Récap lisible — miroir de srv-channels/airroiCallRecap (fallback si API sans champ recap). */

export type AirroiRecapInput = {
  endpoint: string;
  success: boolean;
  errorMessage?: string | null;
  responseStatus?: number;
  responseSize?: number;
  durationMs?: number;
  costUsd?: number;
  requestPayload?: Record<string, unknown> | null;
};

function fmtMarket(m: unknown): string {
  if (!m || typeof m !== 'object') return '';
  const o = m as Record<string, unknown>;
  const parts = [o.locality, o.region, o.country].filter(Boolean).map(String);
  return parts.join(', ') || 'marché';
}

function pickStr(obj: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!obj) return '';
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function pickNum(obj: Record<string, unknown> | null | undefined, ...keys: string[]): number | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
}

function fmtBytes(n?: number): string {
  if (n == null || !Number.isFinite(n)) return '';
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

function fmtCoords(lat?: number, lng?: number): string {
  if (lat == null || lng == null) return '';
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function outcomeSuffix(input: AirroiRecapInput): string {
  const parts: string[] = [];
  const b = fmtBytes(input.responseSize);
  if (b) parts.push(b);
  if (input.durationMs != null) parts.push(`${input.durationMs} ms`);
  if (input.costUsd != null) parts.push(`$${Number(input.costUsd).toFixed(2)}`);
  return parts.length ? ` · ${parts.join(' · ')}` : '';
}

function requestRecap(endpoint: string, req: Record<string, unknown> | null | undefined): string {
  const p = req || {};
  const market = fmtMarket(p.market ?? p.Market);

  switch (endpoint) {
    case 'GET /markets/search': {
      const q = pickStr(p, 'query', 'q', 'search');
      return q ? `Recherche de marché « ${q} »` : 'Recherche de marché par texte';
    }
    case 'GET /markets/lookup': {
      const lat = pickNum(p, 'lat', 'latitude');
      const lng = pickNum(p, 'lng', 'longitude', 'lon');
      const c = fmtCoords(lat, lng);
      return c ? `Identification marché au GPS ${c}` : 'Lookup marché par coordonnées GPS';
    }
    case 'POST /markets/summary':
      return market ? `KPIs synthèse du marché ${market}` : 'Résumé KPIs marché (occupation, ADR, revenus…)';
    case 'POST /markets/metrics/all':
      return market
        ? `Toutes métriques marché ${market}${pickNum(p, 'num_months') ? ` · ${pickNum(p, 'num_months')} mois` : ''}`
        : 'Série complète métriques marché';
    case 'POST /markets/metrics/occupancy':
      return market
        ? `Taux d'occupation · ${market}${pickNum(p, 'num_months') ? ` · ${pickNum(p, 'num_months')} mois` : ''}`
        : 'Historique occupation marché';
    case 'POST /markets/metrics/average-daily-rate':
      return market
        ? `Prix moyen nuit (ADR) · ${market}${pickNum(p, 'num_months') ? ` · ${pickNum(p, 'num_months')} mois` : ''}`
        : 'Historique ADR marché';
    case 'POST /markets/metrics/revpar':
      return market
        ? `RevPAR · ${market}${pickNum(p, 'num_months') ? ` · ${pickNum(p, 'num_months')} mois` : ''}`
        : 'Revenu par chambre disponible (RevPAR)';
    case 'POST /markets/metrics/revenue':
      return market
        ? `Revenus totaux marché · ${market}${pickNum(p, 'num_months') ? ` · ${pickNum(p, 'num_months')} mois` : ''}`
        : 'Revenus agrégés marché';
    case 'POST /markets/metrics/booking-lead-time':
      return market ? `Délai de réservation (lead time) · ${market}` : 'Anticipation moyenne des réservations';
    case 'POST /markets/metrics/length-of-stay':
      return market ? `Durée moyenne de séjour · ${market}` : 'Durée moyenne des séjours';
    case 'POST /markets/metrics/min-nights':
      return market ? `Séjour minimum imposé · ${market}` : 'Min nights par mois';
    case 'POST /markets/metrics/active-listings':
      return market ? `Nombre d'annonces actives · ${market}` : 'Stock annonces actives sur le marché';
    case 'POST /markets/metrics/future/pacing':
      return market ? `Pacing / réservations futures · ${market}` : 'Prévisions occupation & demande à venir';
    case 'GET /listings': {
      const id = pickNum(p, 'id', 'listingId', 'listing_id');
      return id != null ? `Fiche détaillée annonce #${id}` : 'Détail d\'une annonce Airbnb';
    }
    case 'POST /listings/batch': {
      const ids = p.ids ?? p.listing_ids ?? p.listingIds;
      const n = Array.isArray(ids) ? ids.length : pickNum(p, 'count');
      return n != null ? `Batch · ${n} annonce(s) en une requête` : 'Import batch jusqu\'à 25 listings';
    }
    case 'GET /listings/comparables': {
      const lat = pickNum(p, 'lat', 'latitude');
      const lng = pickNum(p, 'lng', 'longitude');
      const c = fmtCoords(lat, lng);
      return c ? `Comparables autour de ${c}` : 'Annonces comparables géolocalisées';
    }
    case 'GET /listings/metrics/all': {
      const id = pickNum(p, 'id', 'listingId');
      return id != null
        ? `Historique perf. annonce #${id}${pickNum(p, 'num_months') ? ` · ${pickNum(p, 'num_months')} mois` : ''}`
        : 'Métriques historiques listing (60 mois max)';
    }
    case 'GET /listings/future/rates': {
      const id = pickNum(p, 'id', 'listingId');
      return id != null ? `Calendrier prix futurs · annonce #${id}` : 'Tarifs & dispo à venir (365 j)';
    }
    case 'POST /listings/search/market':
      return market ? `Scan annonces sur marché ${market}` : 'Recherche listings dans un marché';
    case 'POST /listings/search/radius': {
      const lat = pickNum(p, 'lat', 'latitude');
      const lng = pickNum(p, 'lng', 'longitude');
      const r = pickNum(p, 'radius', 'radius_km', 'distance');
      const c = fmtCoords(lat, lng);
      if (c && r != null) return `Listings dans ${r} km autour de ${c}`;
      return c ? `Recherche rayon autour de ${c}` : 'Recherche listings par rayon';
    }
    case 'POST /listings/search/polygon':
      return 'Recherche listings dans une zone polygonale';
    case 'GET /calculator/estimate': {
      const id = pickNum(p, 'id', 'listingId');
      return id != null ? `Estimation revenus / occupation · annonce #${id}` : 'Calculateur revenue estimator';
    }
    default:
      return 'Appel API marché';
  }
}

export function buildAirroiCallRecap(input: AirroiRecapInput): string {
  if (!input.success) {
    const err = (input.errorMessage || '').trim();
    const code = input.responseStatus != null ? `HTTP ${input.responseStatus}` : 'Erreur';
    return err ? `${code} — ${err.slice(0, 120)}` : code;
  }
  return `${requestRecap(input.endpoint, input.requestPayload ?? undefined)}${outcomeSuffix(input)}`;
}

/** Utilise recap API si présent, sinon calcule côté client. */
export function resolveAirroiRowRecap(row: Record<string, unknown>): string {
  const fromApi = row.recap;
  if (typeof fromApi === 'string' && fromApi.trim()) return fromApi.trim();
  return buildAirroiCallRecap({
    endpoint: String(row.endpoint || ''),
    success: Boolean(row.success),
    errorMessage: row.errorMessage as string | null | undefined,
    responseStatus: row.responseStatus as number | undefined,
    responseSize: row.responseSize as number | undefined,
    durationMs: row.durationMs as number | undefined,
    costUsd: row.costUsd as number | undefined,
    requestPayload: (row.requestPayload as Record<string, unknown> | null) ?? null,
  });
}
