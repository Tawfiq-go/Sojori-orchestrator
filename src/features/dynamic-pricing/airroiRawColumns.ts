/** Colonnes tableau portefeuille — champs bruts marché (GET /listings), sans calcul Sojori. */

import type { AirroiRawFields } from './_tokens';

export type AirroiColumnDef = {
  id: string;
  label: string;
  field?: keyof AirroiRawFields;
  kind: 'sojori' | 'airroi' | 'meta';
  format?: 'num' | 'pct' | 'bool' | 'text' | 'usd';
  /** Infobulle en-tête colonne (vue opérationnelle étendue) */
  hintTitle?: string;
  hintBody?: string;
};

/** KPIs snapshot affichés par défaut (vue opérationnelle) */
export const CORE_SNAPSHOT_COLUMN_IDS = [
  'district',
  'ttm_revenue',
  'ttm_avg_rate',
  'ttm_occupancy',
  'rating',
  'rates_n',
] as const;

function hint(
  title: string,
  body: string,
): Pick<AirroiColumnDef, 'hintTitle' | 'hintBody'> {
  return { hintTitle: title, hintBody: body };
}

export const AIRROI_RAW_TABLE_INTRO =
  'Mode test : colonnes = valeurs brutes du snapshot marché (API listings, USD) stockées en Mongo. Aucun potentiel / score / bornes calculés par Sojori.';

export const AIRROI_RAW_COLUMNS: AirroiColumnDef[] = [
  { id: 'check', label: '', kind: 'sojori' },
  { id: 'bien', label: 'Bien Sojori', kind: 'sojori' },
  { id: 'airbnb', label: 'Airbnb', kind: 'sojori' },
  { id: 'snapshot', label: 'Snapshot', kind: 'meta' },
  { id: 'currency', label: 'Devise', field: 'currency', kind: 'airroi', format: 'text', ...hint('Devise', 'Code devise du snapshot listing (souvent USD).') },
  { id: 'district', label: 'Zone', field: 'district', kind: 'airroi', format: 'text', ...hint('Quartier', 'District renvoyé par l’API marché — aligné carte zones quand disponible.') },
  { id: 'locality', label: 'Ville API', field: 'locality', kind: 'airroi', format: 'text', ...hint('Locality', 'Libellé ville côté API marché.') },
  { id: 'country', label: 'Pays', field: 'country', kind: 'airroi', format: 'text', ...hint('Pays', 'Pays du listing dans le snapshot.') },
  { id: 'lat_ar', label: 'Lat.', field: 'latitude', kind: 'airroi', format: 'num', ...hint('Latitude', 'Coordonnée pour pin carte.') },
  { id: 'lng_ar', label: 'Lng.', field: 'longitude', kind: 'airroi', format: 'num', ...hint('Longitude', 'Coordonnée pour pin carte.') },
  { id: 'superhost', label: 'Superhost', field: 'superhost', kind: 'airroi', format: 'bool', ...hint('Superhost', 'Badge superhost au moment du snapshot.') },
  { id: 'min_nights', label: 'Min nuits', field: 'min_nights', kind: 'airroi', format: 'num', ...hint('Min. nuits', 'Séjour minimum annoncé sur la fiche.') },
  { id: 'cleaning_fee', label: 'Ménage', field: 'cleaning_fee', kind: 'airroi', format: 'usd', ...hint('Frais ménage', 'Cleaning fee (USD) dans le snapshot.') },
  { id: 'rating', label: 'Note', field: 'rating_overall', kind: 'airroi', format: 'num', ...hint('Note globale', 'rating_overall · moyenne avis voyageurs.') },
  { id: 'reviews', label: 'Avis', field: 'num_reviews', kind: 'airroi', format: 'num', ...hint('Nombre d’avis', 'num_reviews au moment du snapshot.') },
  { id: 'ttm_revenue', label: 'TTM rev.', field: 'ttm_revenue', kind: 'airroi', format: 'usd', ...hint('Revenus TTM', 'ttm_revenue · 12 mois avant la date snapshot (USD).') },
  { id: 'ttm_avg_rate', label: 'ADR TTM', field: 'ttm_avg_rate', kind: 'airroi', format: 'usd', ...hint('ADR TTM', 'ttm_avg_rate · tarif journalier moyen sur la période TTM (USD).') },
  { id: 'ttm_occupancy', label: 'Occ. TTM', field: 'ttm_occupancy', kind: 'airroi', format: 'pct', ...hint('Occupation TTM', 'ttm_occupancy · part des nuits réservées sur 12 mois.') },
  { id: 'ttm_adj_occ', label: 'Occ. adj.', field: 'ttm_adjusted_occupancy', kind: 'airroi', format: 'pct', ...hint('Occ. ajustée TTM', 'ttm_adjusted_occupancy · occupation corrigée.') },
  { id: 'ttm_revpar', label: 'RevPAR TTM', field: 'ttm_revpar', kind: 'airroi', format: 'usd', ...hint('RevPAR TTM', 'Revenu par nuit disponible · période TTM.') },
  { id: 'ttm_adj_revpar', label: 'RevPAR adj.', field: 'ttm_adjusted_revpar', kind: 'airroi', format: 'usd', ...hint('RevPAR ajusté TTM', 'RevPAR corrigé sur TTM.') },
  { id: 'ttm_total', label: 'Jours TTM', field: 'ttm_total_days', kind: 'airroi', format: 'num', ...hint('Jours calendrier TTM', 'Nombre total de jours dans la fenêtre TTM.') },
  { id: 'ttm_days_res', label: 'Rés. TTM', field: 'ttm_days_reserved', kind: 'airroi', format: 'num', ...hint('Nuits réservées TTM', 'Jours réservés sur la période.') },
  { id: 'ttm_avail', label: 'Dispo TTM', field: 'ttm_available_days', kind: 'airroi', format: 'num', ...hint('Nuits dispo TTM', 'Jours encore disponibles à la vente.') },
  { id: 'ttm_blocked', label: 'Bloqué TTM', field: 'ttm_blocked_days', kind: 'airroi', format: 'num', ...hint('Nuits bloquées TTM', 'Jours indisponibles (bloqués).') },
  { id: 'ttm_min_nights', label: 'Min n. TTM', field: 'ttm_avg_min_nights', kind: 'airroi', format: 'num', ...hint('Min nuits moy. TTM', 'Séjour minimum moyen observé sur TTM.') },
  { id: 'ttm_los', label: 'LOS TTM', field: 'ttm_avg_length_of_stay', kind: 'airroi', format: 'num', ...hint('Durée séjour TTM', 'Length of stay moyen (nuits).') },
  { id: 'l90d_revenue', label: 'L90 rev.', field: 'l90d_revenue', kind: 'airroi', format: 'usd', ...hint('Revenus 90 j', 'l90d_revenue · fenêtre glissante 90 jours.') },
  { id: 'l90d_avg_rate', label: 'ADR L90', field: 'l90d_avg_rate', kind: 'airroi', format: 'usd', ...hint('ADR 90 j', 'Tarif journalier moyen sur 90 jours.') },
  { id: 'l90d_occupancy', label: 'Occ. L90', field: 'l90d_occupancy', kind: 'airroi', format: 'pct', ...hint('Occupation 90 j', 'Occupation sur les 90 derniers jours.') },
  { id: 'l90d_adj_occ', label: 'Occ. adj. L90', field: 'l90d_adjusted_occupancy', kind: 'airroi', format: 'pct', ...hint('Occ. ajustée 90 j', 'Occupation ajustée · 90 j.') },
  { id: 'l90d_revpar', label: 'RevPAR L90', field: 'l90d_revpar', kind: 'airroi', format: 'usd', ...hint('RevPAR 90 j', 'RevPAR sur 90 jours.') },
  { id: 'l90d_adj_revpar', label: 'RevPAR adj. L90', field: 'l90d_adjusted_revpar', kind: 'airroi', format: 'usd', ...hint('RevPAR ajusté 90 j', 'RevPAR ajusté · 90 j.') },
  { id: 'l90d_total', label: 'Jours L90', field: 'l90d_total_days', kind: 'airroi', format: 'num', ...hint('Jours calendrier L90', 'Total jours dans la fenêtre 90 j.') },
  { id: 'l90d_days_res', label: 'Rés. L90', field: 'l90d_days_reserved', kind: 'airroi', format: 'num', ...hint('Nuits réservées L90', 'Jours réservés · 90 j.') },
  { id: 'l90d_avail', label: 'Dispo L90', field: 'l90d_available_days', kind: 'airroi', format: 'num', ...hint('Nuits dispo L90', 'Jours disponibles · 90 j.') },
  { id: 'l90d_blocked', label: 'Bloqué L90', field: 'l90d_blocked_days', kind: 'airroi', format: 'num', ...hint('Nuits bloquées L90', 'Jours bloqués · 90 j.') },
  { id: 'l90d_min_nights', label: 'Min n. L90', field: 'l90d_avg_min_nights', kind: 'airroi', format: 'num', ...hint('Min nuits moy. L90', 'Min stay moyen · 90 j.') },
  { id: 'l90d_los', label: 'LOS L90', field: 'l90d_avg_length_of_stay', kind: 'airroi', format: 'num', ...hint('Durée séjour L90', 'LOS moyen · 90 jours.') },
  { id: 'bedrooms_ar', label: 'Ch.', field: 'bedrooms', kind: 'airroi', format: 'num', ...hint('Chambres', 'Nombre de chambres (snapshot).') },
  { id: 'beds_ar', label: 'Lits', field: 'beds', kind: 'airroi', format: 'num', ...hint('Lits', 'Nombre de lits.') },
  { id: 'baths_ar', label: 'Sdb', field: 'baths', kind: 'airroi', format: 'num', ...hint('Salles de bain', 'Nombre de salles de bain.') },
  { id: 'guests_ar', label: 'Voyageurs', field: 'guests', kind: 'airroi', format: 'num', ...hint('Capacité', 'Nombre max de voyageurs.') },
  { id: 'metrics_n', label: 'Mois hist.', field: 'metricsMonthsCount', kind: 'airroi', format: 'num', ...hint('Historique mensuel', 'Nombre de mois metrics/all stockés.') },
  { id: 'rates_n', label: 'Tarifs/j', field: 'futureRatesDaysCount', kind: 'airroi', format: 'num', ...hint('Couverture calendrier', 'Jours avec future/rates dans le snapshot (suggestion prix/jour).') },
  { id: 'action', label: '', kind: 'sojori' },
];

const airroiById = new Map(AIRROI_RAW_COLUMNS.map((c) => [c.id, c]));

/** Colonnes KPI snapshot pour la vue opérationnelle (hors meta Sojori). */
export function getOperationalSnapshotColumns(showAll: boolean): AirroiColumnDef[] {
  if (showAll) {
    return AIRROI_RAW_COLUMNS.filter((c) => c.kind === 'airroi');
  }
  return CORE_SNAPSHOT_COLUMN_IDS.map((id) => airroiById.get(id)).filter(
    (c): c is AirroiColumnDef => Boolean(c),
  );
}

export function formatAirroiRawValue(
  field: keyof AirroiRawFields,
  raw: AirroiRawFields | null | undefined,
): string {
  if (!raw) return '—';
  const v = raw[field];
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? 'oui' : 'non';
  if (field.includes('occupancy') && typeof v === 'number') {
    return `${(v * 100).toFixed(1)}%`;
  }
  if (typeof v === 'number') {
    if (field.includes('revenue') || field.includes('rate') || field.includes('revpar')) {
      return v.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    }
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }
  return String(v);
}
