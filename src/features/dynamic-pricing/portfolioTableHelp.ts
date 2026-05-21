/** Libellés d’aide colonnes portefeuille — périodes alignées backend (TTM 12 mois, historique 24 mois). */

export const PORTFOLIO_TABLE_INTRO = `Ce tableau liste vos annonces Sojori (pas le parc marché global).
Les colonnes de performance utilisent un snapshot marché enregistré en base (bouton ⟳ « Actualisation des données ») :
TTM = revenus et KPIs des 12 derniers mois avant la date du snapshot ;
historique mensuel = jusqu’à 24 mois (metrics/all).
Sans snapshot : valeurs estimées à partir des prix recommandés Sojori.`

export const METRICS_HISTORY_MONTHS = 24
export const TTM_MONTHS = 12

export type PortfolioColumnHelp = {
  id: string
  label: string
  sortMark?: boolean
  title: string
  body: string
}

export const PORTFOLIO_COLUMNS: PortfolioColumnHelp[] = [
  {
    id: 'check',
    label: '',
    title: '',
    body: '',
  },
  {
    id: 'bien',
    label: 'Bien',
    title: 'Bien Sojori',
    body: 'Nom de l’annonce et clé RU (Rentals United) si connue. Clic → fiche bien.',
  },
  {
    id: 'airbnb',
    label: 'Airbnb',
    title: 'Connexion Airbnb',
    body:
      'Connecté = ID annonce présent dans otaChannelsSnapshot (dashboard legacy, bouton Vérifier). ' +
      'Lien public = URL fiche voyageur Airbnb.',
  },
  {
    id: 'zone',
    label: 'Zone',
    title: 'Quartier',
    body: 'Quartier Sojori (neighborhood), mappé vers une zone Marrakech pour la carte.',
  },
  {
    id: 'potential',
    label: 'Potentiel · MAD',
    sortMark: true,
    title: 'Potentiel annuel (P50)',
    body:
      'Estimation Sojori : prix recommandé moyen sur le calendrier × ~220 nuits, avec fourchettes P25/P75. ' +
      'Ne vient pas du snapshot marché. Sert de plafond de référence pour le score de performance.',
  },
  {
    id: 'realized',
    label: 'Réalisé TTM',
    title: 'Réalisé TTM (12 mois)',
    body:
      `Avec snapshot marché : revenus TTM (ttm_revenue) en MAD sur les ${TTM_MONTHS} mois précédant la date du snapshot (conservée en historique). ` +
      'Sans snapshot : estimation interne (non facturée).',
  },
  {
    id: 'occ',
    label: 'Occ.',
    title: 'Occupation TTM',
    body:
      `Avec snapshot : ttm_occupancy marché sur la période TTM (${TTM_MONTHS} mois). ` +
      'Sans snapshot : ratio estimé réalisé / potentiel.',
  },
  {
    id: 'adr',
    label: 'ADR',
    title: 'ADR TTM',
    body:
      `Average Daily Rate : avec snapshot = ttm_avg_rate (USD→MAD ×10) sur la période TTM (${TTM_MONTHS} mois). ` +
      'Sans snapshot = prix recommandé moyen.',
  },
  {
    id: 'score',
    label: 'Score perf',
    title: 'Score performance',
    body:
      'Indice 0–100 dérivé du ratio réalisé TTM / potentiel P50 sur la même période TTM (ou estimation). ' +
      'Filtre « Sous-performants » : score faible vs potentiel.',
  },
  {
    id: 'mode',
    label: 'Mode',
    title: 'Mode tarification',
    body: 'Prudent / Équilibré / Agressif si tarification dynamique (useDynamicPrice) active ; sinon AI OFF.',
  },
  {
    id: 'bounds',
    label: 'Bornes',
    title: 'Plancher / plafond',
    body: 'Bornes MAD dérivées du prix recommandé moyen (≈ −35 % / +35 %) quand l’IA est active.',
  },
  {
    id: 'ai',
    label: 'AI',
    title: 'Tarification dynamique',
    body: 'Indique si useDynamicPrice est activé sur le listing Sojori.',
  },
  {
    id: 'action',
    label: '',
    title: '',
    body: '',
  },
]

export function formatPerfPeriodHint(meta?: {
  source?: string
  ttmPeriodLabel?: string
  metricsPeriodLabel?: string
  snapshotAt?: string | null
} | null): string {
  if (!meta || meta.source !== 'airroi_snapshot') {
    return `Pas de snapshot : estimation Sojori. TTM cible = ${TTM_MONTHS} mois ; historique marché = ${METRICS_HISTORY_MONTHS} mois après import.`
  }
  const snap = meta.snapshotAt
    ? new Date(meta.snapshotAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
    : '—'
  return `Snapshot enregistré le ${snap}. TTM : ${meta.ttmPeriodLabel ?? '—'}. Historique mensuel : ${meta.metricsPeriodLabel ?? '—'}.`
}
