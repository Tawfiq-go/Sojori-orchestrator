/** Libellés visibles client — marque Sojori uniquement (pas AirROI, RU, endpoints techniques). */

export const DP = {
  estimationSojori: 'Estimation Sojori',
  estimationSojoriBrute: 'Estimation Sojori (brute)',
  tarifsMarcheSojori: 'Tarifs marché Sojori',
  tarifsMarcheSojoriBruts: 'Tarifs marché Sojori (bruts)',
  prixSojori: 'Prix Sojori',
  calendrierSojori: 'Calendrier Sojori',
  calendrierActuel: 'Calendrier actuel',
  performancesAnnonce: 'Performances annonce',
  annonceConnectee: 'Annonce connectée',
  annoncesConnectees: 'Annonces connectées',
  canalDiffusion: 'Canal de diffusion',
  publicationCanaux: 'Publication canaux',
  prixDeBase: 'Prix de base',
  profilEstimation: 'Profil estimation Sojori',
  fetchEstimationHint:
    '⟳ Récupérer l’estimation Sojori puis prévisualiser ici (12 mois)',
  fetchEstimationRequired:
    'Estimation Sojori requise — lancez ⟳ « Estimation Sojori » puis vérifiez la courbe avant d’appliquer.',
  fetchEstimationEmpty:
    'Aucun jour dans la fenêtre — relancez ⟳ l’estimation Sojori.',
} as const;

export type DpMarketSource = 'estimate' | 'airroi';

export function marketColumnLabel(source: DpMarketSource): string {
  return source === 'estimate' ? DP.estimationSojori : DP.tarifsMarcheSojori;
}

export function marketCurveLegend(source: DpMarketSource | 'sojori' | undefined): string {
  if (source === 'estimate') return DP.estimationSojoriBrute;
  if (source === 'airroi') return DP.tarifsMarcheSojoriBruts;
  return DP.estimationSojori;
}

export function marketColumnTooltip(source: DpMarketSource): string {
  return source === 'estimate'
    ? 'Estimation marché Sojori — prix brut (ADR × saisonnalité)'
    : 'Tarifs journaliers marché Sojori enregistrés en base';
}
