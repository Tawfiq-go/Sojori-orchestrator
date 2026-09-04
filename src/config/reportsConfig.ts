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
  /**
   * Retiré du hub pour les deux modes — donnée source structurellement
   * vide (pas un problème de filtrage par PM). Le champ `mode` reste
   * renseigné pour documenter l'intention si la source est réparée.
   */
  hidden?: boolean;
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
  // Ma journée n'apparaît pas ici : elle a sa propre entrée dans le menu
  // latéral (à côté de "Reports"), la remontrer dans ce hub serait redondant.
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
    // Audit 2026-09-04 : le mouvement/ADR n'utilise qu'un listingId
    // SINGULIER (pas scope.listingIds) — pour un PM à N listings, seul le
    // premier est couvert. "hotel" tient ici car Nommos n'a qu'1 listing,
    // pas parce que le code est structurellement hôtel-only. À corriger :
    // adapter getDailyMovement/getOccupiedNights au multi-listing.
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
    // Audit 2026-09-04 : daily_inventory_snapshots.listingId est null sur
    // 100% des 738 documents, POUR TOUS LES PM (y compris Nommos) — bug
    // d'ingestion, pas un problème hôtel/LCD. Masqué partout tant que
    // dailyInventorySnapshotService n'écrit pas ce champ.
    mode: 'hotel',
    hidden: true,
  },
  {
    id: 'reports/exploitation',
    title: 'Exploitation',
    pitch: 'Occupation, revenu et encaissements',
    detail:
      'Six blocs de gestion sur quatre périodes. Ventile les nuitées retirées de la vente par motif — ce que le PMS range sous un type unique.',
    accent: T.blue,
    route: '/reports/exploitation',
    // Audit 2026-09-04 : occupation/ADR/RevPAR à zéro (même cause que
    // Tendance annuelle), mais revenu/encaissements réels et affichés
    // clairement en « — » quand vides — gardé visible, pas totalement vide.
    mode: 'hotel',
  },
  {
    id: 'reports/arrivees',
    title: 'Arrivées et départs',
    pitch: 'Le mouvement du jour, villa par villa',
    detail:
      'Qui arrive, qui part, et ce qui reste à faire : fiche de police à signer, séjour non soldé. La liste que la réception prépare le matin.',
    accent: T.green,
    route: '/reports/arrivees',
    // Même limitation que Résumé quotidien : listingId singulier obligatoire
    // côté getArrivalsDepartures — ne couvre qu'1 bien sur N en LCD.
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
    // Audit 2026-09-04 : les ventes (RevenueLine, filtrées par listingIds)
    // sont réelles pour les deux modes. Le catalogue ExtraProduct est
    // global (sans ownerId) mais reste lisible — pas un blocage.
    mode: 'both',
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
  return REPORTS_CATALOG.filter((r) => !r.hidden && (r.mode === 'both' || r.mode === mode));
}
