/** Matrice champs fiche bien ↔ APIs réelles (pas de mock). */

export type CoverageStatus = 'prod' | 'empty' | 'partial';

export type ListingFieldCoverage = {
  section: string;
  status: CoverageStatus;
  api: string;
  fills: string;
  note: string;
};

export function buildListingDataCoverage(input: {
  listingHasAirbnb: boolean;
  hasAirroiSnapshot: boolean;
  hasRevenueEstimate?: boolean;
  hasTtm: boolean;
  hasL90d: boolean;
  hasMarketProd: boolean;
  hasCalendarProd: boolean;
  airroiCompsCount: number;
  airroiCalendarDaysCount?: number;
  /** Ville du bien — libellés refresh marché §05 */
  marketCityLabel?: string | null;
}): ListingFieldCoverage[] {
  const marketCity = input.marketCityLabel?.trim() || 'cette ville';
  const snap = input.hasAirroiSnapshot;
  const comps = input.airroiCompsCount;

  return [
    {
      section: '02 · TTM / L90D',
      status: input.hasTtm ? 'prod' : snap ? 'partial' : 'empty',
      api: 'GET /listings + /listings/metrics/all',
      fills: 'ttm_revenue, occupation, ADR, nuits',
      note: input.listingHasAirbnb
        ? snap
          ? 'Snapshot Mongo après ⟳ perf'
          : 'Lancer ⟳ performances ce bien'
        : 'Connecter ID Airbnb (legacy)',
    },
    {
      section: '02 · Potentiel annuel',
      status: input.hasRevenueEstimate ? 'prod' : input.airroiCompsCount > 0 ? 'partial' : 'empty',
      api: 'GET /calculator/estimate',
      fills: 'revenue, ADR, occupation, percentiles p25–p90',
      note: input.hasRevenueEstimate
        ? 'Estimate en snapshot — date en barre snapshot §02/§04'
        : 'Modal ⟳ → Envoyer calculator/estimate (GPS ou adresse + chambres)',
    },
    {
      section: '03 · Bornes & mode',
      status: input.hasTtm ? 'partial' : 'empty',
      api: 'Sojori (dérivé ADR snapshot)',
      fills: 'Plancher / plafond suggérés',
      note: 'Recommandation locale P25→P75 · pas persisté sans recalcul',
    },
    {
      section: '04 · Calendrier prix / jour',
      status: input.hasCalendarProd ? 'prod' : input.hasAirroiSnapshot ? 'partial' : 'empty',
      api: 'GET /calculator/estimate + recompute Sojori',
      fills: 'Prix MAD par date (grille §04)',
      note: input.hasCalendarProd
        ? 'Estimate obligatoire (modal ⟳) — pas de fallback future/rates'
        : 'Lancer estimate puis Recalculer 365 j — prix manuels dans srv-calendar',
    },
    {
      section: '05 · Graphiques marché',
      status: input.hasMarketProd ? 'partial' : 'empty',
      api: 'POST /markets/* (refresh portefeuille)',
      fills: 'Saisonnalité, pacing ville',
      note: input.hasMarketProd
        ? 'Après ⟳ Refresh marché portefeuille — graphiques si cache Mongo rempli'
        : `Aucun cache marché : modal ⟳ · Actualiser le marché · ${marketCity}`,
    },
    {
      section: '06 · Carte',
      status: comps > 0 ? 'prod' : snap ? 'partial' : 'empty',
      api: 'GET /listings/comparables',
      fills: 'Pins concurrents + votre bien',
      note: comps > 0
        ? `${comps} comps dans le dernier snapshot`
        : '⟳ perf inclut comparables si lat/lng OK',
    },
    {
      section: '07 · Table comps',
      status: comps > 0 ? 'prod' : 'empty',
      api: 'GET /listings/comparables',
      fills: 'Jusqu’à 25 annonces similaires',
      note:
        comps === 0
          ? 'marché renvoie souvent peu de comps actifs (annonces 404 / hors rayon). Pas d’autre source — uniquement cet endpoint.'
          : `${comps} ligne(s) hors « vous » possible`,
    },
    {
      section: 'Événements spéciaux',
      status: 'empty',
      api: '—',
      fills: 'Tarifs événementiels',
      note: 'Non implémenté',
    },
  ];
}

export const AIRROI_COMPS_FAQ = [
  'Le refresh ⟳ appelle GET /listings/comparables (≈ $0,10) avec lat/lng/chambres/sdb/voyageurs de votre fiche.',
  'L’API comparables renvoie au plus 25 listings « similaires » — beaucoup peuvent être inactifs ou sans métriques (d’où une table presque vide avant refresh).',
  'Ce n’est pas un bug Sojori : l’API ne garantit pas 25 comps avec données complètes (audit interne : nombreux 404 sur IDs comparables).',
  'Potentiel marché (P50 annuel) et graphiques ville nécessitent d’autres endpoints (revenue-estimate, markets/*) — voir tableau ci-dessus.',
];
