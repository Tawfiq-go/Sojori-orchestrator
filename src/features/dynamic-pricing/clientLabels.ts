/** Libellés visibles client — marque Sojori uniquement (pas provider marché, $ ni endpoints). */

export const DP = {
  /** Libellé client principal (① base A, bandeaux, tooltips). */
  estimationPrixMarche: 'Estimation prix de marché',
  estimationSojori: 'Estimation prix de marché',
  estimationSojoriBrute: 'Estimation prix de marché (brute)',
  tarifsMarcheSojori: 'Estimation prix de marché',
  tarifsMarcheSojoriBruts: 'Estimation prix de marché (brute)',
  prixSojori: 'Prix Sojori',
  calendrierSojori: 'Calendrier Sojori',
  calendrierActuel: 'Calendrier actuel',
  performancesAnnonce: 'Performances annonce',
  annonceConnectee: 'Annonce connectée',
  annoncesConnectees: 'Annonces connectées',
  canalDiffusion: 'Canal de diffusion',
  publicationCanaux: 'Publication canaux',
  prixDeBase: 'Prix de base',
  profilEstimation: 'Profil estimation marché',
  snapshotMarche: 'Estimation prix de marché',
  autoSnapshotTitle: 'Actualisation marché — chaque lundi',
  autoSnapshotSubtitle:
    'Met à jour l’estimation prix de marché du bien pour la semaine',
  autoPropagationSubtitle:
    'Applique l’estimation au calendrier + publication canaux (sans nouvel appel marché)',
  fetchSnapshotNow: '① Actualiser l’estimation prix de marché',
  fetchEstimationHint:
    '⟳ Récupérer l’estimation prix de marché puis prévisualiser ici (12 mois)',
  fetchEstimationRequired:
    'Estimation prix de marché requise — lancez ⟳ puis vérifiez la courbe avant d’appliquer.',
  fetchEstimationEmpty:
    'Aucun jour dans la fenêtre — relancez ⟳ l’estimation prix de marché.',
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
    ? 'Estimation prix de marché — prix brut (ADR × saisonnalité)'
    : 'Estimation prix de marché enregistrée en base';
}
