/**
 * Catalogue unique des rapports (fusion Dashboard + Rapports + Rapports 2).
 *
 * `mode` détermine la visibilité selon le tag `reportsMode` du PM regardé :
 * - `hotel` : structure hôtelière single-listing (roomtypes physiques) — ex. NOMMOS
 * - `lcd` : location courte durée multi-biens — tous les autres PM par défaut
 * - `both` : fonctionne dans les deux configurations
 *
 * `featured` met le rapport en avant sur /reports, en dehors du groupe
 * "Autres rapports".
 */

export type ReportMode = 'hotel' | 'lcd' | 'both';

export type ReportEntry = {
  id: string;
  title: string;
  pitch: string;
  detail: string;
  accent: string;
  route: string;
  mode: ReportMode;
  featured?: boolean;
  /** Réservé à un rôle précis (ex. Monitor = Admin/SuperAdmin uniquement). */
  adminOnly?: boolean;
};

const T = {
  primary: '#b8851a',
  gold: '#E6B022',
  green: '#93C47D',
  red: '#C81E1E',
  blue: '#2d4a6b',
  lightBlue: '#5B9BD5',
};

export const REPORTS_CATALOG: ReportEntry[] = [
  // Live — écrans d'action / pilotage temps réel
  {
    id: 'ma-journee',
    title: 'Ma journée',
    pitch: 'Ce que l’équipe fait maintenant',
    detail:
      'Arrivées, départs, ménage, expériences et messages — l’écran d’atterrissage opérationnel du jour.',
    accent: T.gold,
    route: '/ma-journee',
    mode: 'both',
    featured: true,
  },
  {
    id: 'dashboard',
    title: 'Tableau de bord',
    pitch: 'Les KPIs consolidés, en un coup d’œil',
    detail:
      'Réservations, revenus, occupation, ADR, RevPAR, sources et top biens — la vue pilotage visuelle.',
    accent: T.primary,
    route: '/dashboard',
    mode: 'both',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    pitch: 'Saisonnalité, démographie, lead time',
    detail:
      'Analyse avancée : évolution des revenus, sources, saisonnalité 12 mois, durée de séjour, performance par bien.',
    accent: T.lightBlue,
    route: '/analytics',
    mode: 'both',
  },
  {
    id: 'admin/owner-monitor',
    title: 'Monitor',
    pitch: 'Activité des owners',
    detail: 'Résas, messages, prix, synchronisation — vue plateforme réservée aux admins.',
    accent: T.red,
    route: '/admin/owner-monitor',
    mode: 'both',
    adminOnly: true,
  },

  // Rapports classiques — jamais fusionnés hôtel/LCD, filtrage listing corrigé
  {
    id: 'reports/quotidien',
    title: 'Résumé quotidien',
    pitch: 'Ce que l’équipe lit chaque matin',
    detail:
      'Mouvement du jour, villas immobilisées et pourquoi, semaine à venir, rythme de prise. Le PMS donne les chiffres ; celui-ci nomme les villas.',
    accent: T.gold,
    route: '/reports/quotidien',
    mode: 'hotel',
    featured: true,
  },
  {
    id: 'reports/annuel',
    title: 'Tendance annuelle',
    pitch: 'La saison mois par mois',
    detail:
      'Occupation, prix et rendement sur l’année, plus ce qu’aucun PMS ne calcule : ce que les villas retirées de la vente représentent.',
    accent: T.primary,
    route: '/reports/annuel',
    mode: 'both',
  },
  {
    id: 'reports/exploitation',
    title: 'Exploitation',
    pitch: 'Occupation, revenu et encaissements',
    detail:
      'Six blocs de gestion sur quatre périodes. Ventile les nuitées retirées de la vente par motif — ce que le PMS range sous un type unique.',
    accent: T.blue,
    route: '/reports/exploitation',
    mode: 'both',
  },
  {
    id: 'reports/arrivees',
    title: 'Arrivées et départs',
    pitch: 'Le mouvement du jour, villa par villa',
    detail:
      'Qui arrive, qui part, et ce qui reste à faire : fiche de police à signer, séjour non soldé. La liste que la réception prépare le matin.',
    accent: T.green,
    route: '/reports/arrivees',
    mode: 'hotel',
  },
  {
    id: 'reports/produits',
    title: 'Produits',
    pitch: 'Ce qui se vend, ce qui dort',
    detail:
      'Rotation par article et articles jamais vendus. Révèle l’écart entre le catalogue déclaré et ce qui sort réellement.',
    accent: T.red,
    route: '/reports/produits',
    // Catalogue ExtraProduct (Mews) non filtrable par owner — hôtel uniquement.
    mode: 'hotel',
  },

  // Rapports 2 — pensés multi-biens dès le départ
  {
    id: 'reports2/clients',
    title: 'Clients',
    pitch: 'D’où viennent les réservations',
    detail:
      'Carte, canal de distribution et concentration. Le podium change selon le critère : le Maroc réserve le plus, la France dépense le plus.',
    accent: T.gold,
    route: '/reports2/clients',
    mode: 'both',
    featured: true,
  },
  {
    id: 'reports2/performance',
    title: 'Performance & projection',
    pitch: 'Le réalisé et ce qui est déjà au carnet',
    detail: 'Portefeuille, propriétaire, bien — trois profondeurs de lecture LCD.',
    accent: T.primary,
    route: '/reports2/performance',
    mode: 'lcd',
  },

  // Ailleurs dans l'app, référencé depuis le hub rapports
  {
    id: 'extras/ventes',
    title: 'Ventes d’extras',
    pitch: 'Ventilation USALI du chiffre d’affaires',
    detail:
      'Restauration, prestations, divers — vue facture ou vue ligne, avec le détail des articles.',
    accent: T.primary,
    route: '/tasks/extras/ventes',
    mode: 'both',
  },
];

export function reportsForMode(reportsMode: 'hotel' | 'lcd' | undefined | null): ReportEntry[] {
  const mode = reportsMode === 'hotel' ? 'hotel' : 'lcd';
  return REPORTS_CATALOG.filter((r) => r.mode === 'both' || r.mode === mode);
}
