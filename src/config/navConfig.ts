import { Roles } from '../constants/roles';
import {
  DEFAULT_LANDLORD_DASHBOARD_GRANTS,
  grantAllows,
  isWorkerAdminAccess,
  type FeatureGrant,
} from '../utils/ownerRoutePermissions';

/** Rôles autorisés sur un groupe ou item (absent = hérite du groupe). */
export type NavRole = (typeof Roles)[keyof typeof Roles];

/**
 * Comptes autorisés sur les entrées marquées `restrictedToEmails`.
 * Verrou NOMINATIF, volontairement plus strict que le rôle : un autre
 * SuperAdmin (ex. un développeur) ne doit pas voir ces écrans.
 * ⚠️ Ce filtre masque l'entrée dans la sidebar — la donnée reste protégée
 * côté API par l'auth du service (le front n'est jamais la seule barrière).
 */
export const CRM_ALLOWED_EMAILS = ['tawfiq.gouach@sojori.com'];

export type NavItemConfig = {
  id: string;
  label: string;
  icon?: string;
  iconType?: string;
  iconColor?: string;
  badge?: string;
  badgeRed?: boolean;
  description?: string;
  /** Sous-liens — affichés sous le parent (parent reste cliquable si route définie). */
  sub?: NavItemConfig[];
  roles?: NavRole[];
  /**
   * Verrou nominatif : seuls ces emails voient l'entrée, quel que soit le rôle.
   * Se cumule avec `roles` (les deux doivent passer).
   */
  restrictedToEmails?: string[];
  /** Parent décoratif : pas de navigation au clic (ex. Orchestration CORE). */
  navDisabled?: boolean;
};

export type NavGroupConfig = {
  group: string;
  items: NavItemConfig[];
  roles?: NavRole[];
  /** Section Orchestration — accent visuel sidebar */
  core?: boolean;
};

const ADMIN_ROLES: NavRole[] = [Roles.SuperAdmin, Roles.Admin];
/** Staff Sojori / property managers — pilotage client (pas infra admin). */
const PM_ROLES: NavRole[] = [Roles.SuperAdmin, Roles.Admin, Roles.Owner];
const OPS_ROLES: NavRole[] = [Roles.SuperAdmin, Roles.Admin, Roles.Owner, Roles.Worker];
const WORKER_ONLY: NavRole[] = [Roles.Worker];

/**
 * Sidebar Owner / PM — catégories repliables (Sojori staff pour nos clients).
 * SuperAdmin & Admin voient en plus les sections infra en bas (navGroupsForRole).
 */
export const OWNER_NAV_GROUPS: NavGroupConfig[] = [
  {
    group: 'Dashboard',
    roles: PM_ROLES,
    items: [
      {
        id: 'ma-journee',
        label: 'Ma journée',
        iconType: 'calendar',
        iconColor: '#B8881A',
        badge: 'Live',
        description: 'Arrivées, départs, ménage, expériences et messages — écran d’atterrissage',
      },
      {
        id: 'admin/owner-monitor',
        label: 'Monitor',
        iconType: 'monitor',
        iconColor: '#C81E1E',
        badge: 'Live',
        /** Sécurité max : SuperAdmin / Admin uniquement — jamais Owner / Worker / Landlord. */
        roles: ADMIN_ROLES,
        description: 'Activité des owners (Admin only) — résas, messages, prix, sync',
      },
      { id: 'dashboard', label: 'Tableau de bord', iconType: 'dashboard', iconColor: '#D4A574', badge: 'Live' },
      { id: 'analytics', label: 'Analytics', iconType: 'chart', iconColor: '#5B9BD5' },
    ],
  },
  {
    group: 'Vue ops',
    roles: PM_ROLES,
    items: [
      {
        id: 'planning',
        label: 'Planning',
        iconType: 'calendar',
        iconColor: '#E06666',
        description: 'Résas · tasks · messages — grille par appartement',
      },
      {
        id: 'orch/cockpit',
        label: 'Cockpit IA',
        iconType: 'settings',
        iconColor: '#b8851a',
        badge: 'AI',
      },
      {
        id: 'ops-board',
        label: 'Ops Board',
        iconType: 'monitor',
        iconColor: '#1E5B57',
        badge: 'Live',
        description: 'Suivi unités · ménage · arrivées — Nommos (kanban HK)',
      },
      {
        id: 'reception/rack',
        label: 'Rack réception',
        iconType: 'calendar',
        iconColor: '#2d4a6b',
        badge: 'NEW',
        description: 'Affecter les chambres — chambres × jours, conflits détectés',
      },
      {
        id: 'menage/rack',
        label: 'Rack ménage',
        iconType: 'calendar',
        iconColor: '#B8881A',
        badge: 'Live',
        description: 'La journée ménage — fenêtres départ→arrivée, blocs, retards (Nommos)',
      },
      {
        id: 'menage/repartition',
        label: 'Répartition',
        iconType: 'calendar',
        iconColor: '#B8881A',
        badge: 'NEW',
        description: 'Répartition ménage — colonnes par femme de ménage, crédits (lecture seule)',
      },
      {
        id: 'menage/semaine',
        label: 'Semaine ménage',
        iconType: 'calendar',
        iconColor: '#B8881A',
        badge: 'NEW',
        description: 'Villas × 7 jours, crédits par jour vs capacité — quel jour va déborder ?',
      },
      {
        id: 'menage/equipe',
        label: 'Équipe ménage',
        iconType: 'calendar',
        iconColor: '#B8881A',
        badge: 'NEW',
        description: 'Qui travaille quand, capacité, plafonds de crédits — jamais de score',
      },
    ],
  },
  {
    group: 'Calendrier',
    roles: PM_ROLES,
    items: [
      { id: 'calendar/multi', label: 'Vue Multi', iconType: 'calendar', iconColor: '#E06666' },
      { id: 'calendar/simple', label: 'Vue Simple', iconType: 'calendar', iconColor: '#E06666' },
    ],
  },
  {
    group: 'Réservations',
    roles: OPS_ROLES,
    items: [
      { id: 'reservations', label: 'Liste', iconType: 'calendar', iconColor: '#E06666' },
      { id: 'payments', label: 'Paiements', iconType: 'chart', iconColor: '#5B9BD5', roles: PM_ROLES },
    ],
  },
  {
    group: 'Clients',
    roles: ADMIN_ROLES,
    items: [
      {
        id: 'customers',
        label: 'Fiches clients',
        iconType: 'chart',
        iconColor: '#7C5CD6',
        description: 'CRM — clients dédupliqués, séjours, CA, canaux (données personnelles)',
        /** Données personnelles : verrou nominatif, pas seulement le rôle. */
        restrictedToEmails: CRM_ALLOWED_EMAILS,
      },
    ],
  },
  {
    group: 'Inbox Guest',
    roles: PM_ROLES,
    items: [
      { id: 'comms/guests', label: 'WhatsApp', iconType: 'chat', iconColor: '#25D366' },
      {
        id: 'comms/owner-inbox',
        label: 'Resa Proprio',
        iconType: 'chat',
        iconColor: '#0F766E',
        roles: PM_ROLES,
        description: 'Échanges bookers sur le n° Réservation (+212 669-742611)',
        badge: 'NEW',
      },
      { id: 'comms/ota', label: 'Messages OTA', iconType: 'chat', iconColor: '#FF5A5F' },
      { id: 'comms/leads', label: 'Demande', iconType: 'chat', iconColor: '#6D9EEB' },
      { id: 'comms/reviews', label: 'Avis', iconType: 'chat', iconColor: '#E6B022' },
    ],
  },
  {
    group: 'Inbox Staff',
    roles: PM_ROLES,
    items: [
      { id: 'comms/staff', label: 'Staff WhatsApp', iconType: 'chat', iconColor: '#B45309', badgeRed: true },
      { id: 'comms/admin', label: 'Admin WhatsApp', iconType: 'chat', iconColor: '#7C3AED' },
      // Numéro booking sans owner → Inbox plateforme Admin uniquement
      {
        id: 'comms/booking',
        label: 'Inbox Resa',
        iconType: 'chat',
        iconColor: '#0D9488',
        roles: ADMIN_ROLES,
        description: 'Ligne résa Sojori — conversations sans owner',
      },
      // Vue unifiée web + WhatsApp des demandes de réservation (analyse client)
      {
        id: 'comms/conversations',
        label: 'Conversations Résa',
        iconType: 'chat',
        iconColor: '#2D6CB5',
        roles: ADMIN_ROLES,
        description: 'Demandes clients web + WhatsApp unifiées',
      },
    ],
  },
  {
    group: 'Task',
    roles: [Roles.SuperAdmin, Roles.Admin, Roles.Owner],
    items: [
      { id: 'tasks/list', label: 'Liste', iconType: 'check', iconColor: '#93C47D' },
      { id: 'tasks/team', label: 'Équipe', iconType: 'check', iconColor: '#93C47D', description: 'Staff terrain & admin WhatsApp' },
    ],
  },
  {
    group: 'Extra',
    roles: [Roles.SuperAdmin, Roles.Admin, Roles.Owner],
    items: [
      {
        id: 'tasks/extras/ventes',
        label: 'Ventes',
        iconType: 'chart',
        iconColor: '#E6B022',
        description: 'Tous les extras vendus — restauration, prestations, mini-bar',
      },
      {
        id: 'tasks/extras/minibar',
        label: 'Stock',
        iconType: 'check',
        iconColor: '#E6B022',
        description: 'Stocks suivis par villa — mini-bar, linge, consommables',
      },
      {
        id: 'tasks/extras/configuration',
        label: 'Catalogue',
        iconType: 'settings',
        iconColor: '#E6B022',
        description: 'Produits, prix, TVA, dotation villas',
      },
    ],
  },
  {
    group: 'Orchestration',
    roles: PM_ROLES,
    core: true,
    items: [
      { id: 'orch/plans', label: 'Plans par séjour', iconType: 'settings', iconColor: '#666666', badge: 'CORE' },
      { id: 'orch/workflows', label: 'Messages clients', iconType: 'settings', iconColor: '#666666' },
    ],
  },
  {
    group: 'Expériences',
    roles: PM_ROLES,
    items: [
      {
        id: 'providers',
        label: 'Ma fiche',
        iconType: 'building',
        iconColor: '#E6B022',
        description: 'Se déclarer pour vendre (forSale)',
      },
      {
        id: 'experiences',
        label: 'Catalogue',
        iconType: 'home',
        iconColor: '#E6B022',
        description: 'Activités par ville · lettre J',
      },
    ],
  },
  {
    group: 'Annonces',
    roles: PM_ROLES,
    items: [
      {
        id: 'listings/configuration',
        label: 'Configuration',
        iconType: 'home',
        iconColor: '#E6B022',
        description: 'Établissement · structure, contenu, publication',
      },
      { id: 'listings/list', label: 'Listings', iconType: 'home', iconColor: '#D4A574' },
      { id: 'listings/mapping', label: 'Mapping RU', iconType: 'link', iconColor: '#6D9EEB', roles: ADMIN_ROLES },
      { id: 'listings/orchestration-model', label: 'Modèle orchestration', iconType: 'home', iconColor: '#D4A574' },
      { id: 'chatbot/listing', label: 'Listing chatbot', iconType: 'home', iconColor: '#D4A574' },
      {
        id: 'admin/ChannelManager/channel-manager',
        label: 'Channel Manager',
        iconType: 'link',
        iconColor: '#6D9EEB',
        description: 'RU · connexion Airbnb & OTA',
      },
    ],
  },
  {
    group: 'Prix dynamique',
    roles: PM_ROLES,
    items: [
      { id: 'pricing/portfolio', label: 'Prix dynamique', iconType: 'trending', iconColor: '#93C47D' },
      { id: 'pricing/audit', label: 'Audit prix', iconType: 'trending', iconColor: '#93C47D' },
      { id: 'pricing/v2', label: 'Dynamic Price V2', iconType: 'trending', iconColor: '#B8881A', badge: 'Beta' },
    ],
  },
  {
    group: 'Direct booking',
    roles: PM_ROLES,
    items: [
      {
        id: 'comms/owner-booking',
        label: 'Resa Proprio · Numéros',
        iconType: 'chat',
        iconColor: '#0F766E',
        roles: PM_ROLES,
        description:
          'Allowlist sur le numéro Réservation (+212 669-742611) — pas le numéro Staff',
      },
      {
        id: 'direct-booking/config',
        label: 'Config',
        icon: '🌐',
        badge: 'NEW',
        description: 'Domaine, thème, forme, réseaux sociaux du site client',
      },
      {
        id: 'direct-booking/preview',
        label: 'Preview',
        icon: '👁️',
        description: 'Aperçu du site page par page, mobile et desktop',
      },
    ],
  },
  {
    group: 'Équipe',
    roles: OPS_ROLES,
    items: [
      { id: 'staff', label: 'Staff', iconType: 'worker', iconColor: '#D4A574', roles: PM_ROLES },
      { id: 'chatbot/whitelist', label: 'Whitelist', iconType: 'robot', iconColor: '#7C3AED', roles: PM_ROLES },
      {
        id: 'equipe/mon-profil',
        label: 'Mon profil PM',
        icon: '👤',
        roles: [Roles.Owner],
        description: 'Coordonnées, entreprise et vitrine sojori.com',
      },
      {
        id: 'equipe/onboarding',
        label: 'On-boarding',
        icon: '🚀',
        roles: PM_ROLES,
        description: 'Configuration initiale PM — équipe, import Airbnb, orchestration',
      },
      {
        id: 'equipe/notifications',
        label: 'Notifications',
        icon: '🔔',
        roles: PM_ROLES,
        description: 'Alertes cloche dashboard — historique & configuration',
      },
      { id: 'my-tasks', label: 'Mes tâches', iconType: 'check', iconColor: '#93C47D', roles: WORKER_ONLY },
      { id: 'my-sched', label: 'Mon planning', iconType: 'calendar', iconColor: '#E06666', roles: WORKER_ONLY },
    ],
  },
  {
    group: 'Rapports',
    roles: [Roles.SuperAdmin, Roles.Admin, Roles.Owner],
    items: [
      {
        id: 'reports',
        label: 'Tous les rapports',
        iconType: 'document',
        iconColor: '#b8851a',
        description: 'Lancer un rapport — exploitation, clients, ventes',
      },
      {
        id: 'reports/quotidien',
        label: 'Résumé quotidien',
        iconType: 'calendar',
        iconColor: '#b8851a',
        description: 'Le rapport du matin — mouvement, semaine, rythme de prise',
      },
      {
        id: 'reports/arrivees',
        label: 'Arrivées et départs',
        iconType: 'calendar',
        iconColor: '#93C47D',
        description: 'Qui arrive, qui part, et ce qui reste à faire',
      },
      {
        id: 'reports/produits',
        label: 'Produits',
        iconType: 'document',
        iconColor: '#C81E1E',
        description: 'Ce qui se vend, ce qui dort',
      },
      {
        id: 'reports/annuel',
        label: 'Tendance annuelle',
        iconType: 'chart',
        iconColor: '#2d4a6b',
        description: 'La saison mois par mois, et ce que les blocages coûtent',
      },
      {
        id: 'reports/exploitation',
        label: 'Exploitation',
        iconType: 'document',
        iconColor: '#2d4a6b',
        description: 'Occupation, revenu et encaissements',
      },
      {
        id: 'reports/clients',
        label: 'Clients',
        iconType: 'worker',
        iconColor: '#E6B022',
        description: 'D’où viennent les réservations, et ce qu’elles rapportent',
      },
    ],
  },
  {
    group: 'Finances',
    roles: [Roles.SuperAdmin, Roles.Admin, Roles.Owner, Roles.Landlord],
    items: [
      {
        id: 'finances/landlords',
        label: 'Propriétaires',
        iconType: 'worker',
        iconColor: '#B8851A',
        roles: [Roles.SuperAdmin, Roles.Admin, Roles.Owner],
      },
      {
        id: 'finances/ledger',
        label: 'Dépenses & extras',
        iconType: 'chart',
        iconColor: '#C81E1E',
      },
      {
        id: 'finances/reports',
        label: 'Rapports P&L',
        iconType: 'document',
        iconColor: '#93C47D',
      },
      {
        id: 'finances/branding',
        label: 'En-tête & logo P&L',
        iconType: 'document',
        iconColor: '#B8851A',
        roles: [Roles.SuperAdmin, Roles.Admin, Roles.Owner],
      },
    ],
  },
];

/** Sections réservées SuperAdmin / Admin (infra, pas PM client). */
export const ADMIN_NAV_GROUPS: NavGroupConfig[] = [
  {
    // Distinct du groupe owner « Expériences » : même nom = clé React + état collapsed en collision.
    group: 'Expériences · admin',
    roles: ADMIN_ROLES,
    items: [
      {
        id: 'admin/partners',
        label: 'Expériences',
        iconType: 'building',
        iconColor: '#E6B022',
        description: 'Fiches (liées à un owner) + catalogue',
        sub: [
          { id: 'admin/partners/list', label: 'Fiches' },
          { id: 'admin/partners/concierge', label: 'Catalogue' },
        ],
      },
    ],
  },
  {
    group: 'Logs API',
    roles: ADMIN_ROLES,
    items: [
      {
        id: 'admin/channels',
        label: 'Logs RU',
        iconType: 'link',
        iconColor: '#6D9EEB',
        description: 'Logs Rental United — Summary, Business, Debug',
        sub: [
          { id: 'admin/channels/summary', label: 'Summary' },
          { id: 'admin/channels/business', label: 'Business' },
          { id: 'admin/channels/logapiru', label: 'LogApiRU' },
          { id: 'admin/channels/logapimews', label: 'LogApiMews' },
          { id: 'admin/channels/debug', label: 'Debug' },
        ],
      },
      {
        id: 'admin/sojori-logs',
        label: 'Logs estimation marché',
        iconType: 'document',
        iconColor: '#E6B022',
        description: 'Logs estimation & données marché Sojori',
      },
    ],
  },
  {
    group: 'Monitor & infra',
    roles: ADMIN_ROLES,
    items: [
      {
        id: 'monitor',
        label: 'Monitoring',
        iconType: 'monitor',
        iconColor: '#C81E1E',
        badge: 'Live',
        sub: [
          { id: 'mon/summary', label: 'Résumé' },
          { id: 'mon/logs', label: 'Logs' },
          { id: 'mon/metrics', label: 'Métriques' },
          { id: 'mon/rabbit', label: 'RabbitMQ' },
          { id: 'mon/wa', label: 'WhatsApp API' },
          { id: 'mon/ai', label: 'AI usage' },
          { id: 'mon/infra', label: 'Infrastructure' },
          { id: 'mon/res-sync', label: 'Sync réservations' },
        ],
      },
    ],
  },
  {
    group: 'Cost',
    roles: ADMIN_ROLES,
    items: [
      {
        id: 'pricing/summary',
        label: 'Summary',
        iconType: 'chart',
        iconColor: '#0D9488',
        badge: 'Live',
        description: 'Récap consommation par owner et par mois — RU, WhatsApp, IA, AirROI',
      },
      {
        id: 'pricing/ru',
        label: 'Listings RU',
        iconType: 'building',
        iconColor: '#0D9488',
        description: 'Listings synchronisés RU par owner vs coût $700/200',
      },
      {
        id: 'pricing/whatsapp',
        label: 'WhatsApp',
        iconType: 'chat',
        iconColor: '#0D9488',
        description: 'Volume de messages WhatsApp (guest + staff) par owner',
      },
      {
        id: 'pricing/ai',
        label: 'IA',
        iconType: 'robot',
        iconColor: '#0D9488',
        description: 'Appels IA par owner',
      },
      {
        id: 'pricing/airroi',
        label: 'AirROI',
        iconType: 'trending',
        iconColor: '#0D9488',
        description: 'Coût réel AirROI par owner (dynamic pricing)',
      },
    ],
  },
  {
    group: 'Administration',
    roles: ADMIN_ROLES,
    items: [
      { id: 'admin/pms', label: 'Owners · PMs', iconType: 'building', iconColor: '#A6A6A6' },
      { id: 'admin/pm-lifecycle', label: 'Suivi onboarding PM', icon: '📋', iconColor: '#0D9488' },
      {
        id: 'crm',
        label: 'CRM Sojori',
        iconType: 'chat',
        iconColor: '#6D9EEB',
        description: 'Demandes PMS, leads commerciaux, rendez-vous — admin uniquement',
      },
      { id: 'admin/roles', label: 'Rôles & groupes', iconType: 'shield', iconColor: '#C81E1E' },
      { id: 'admin/mapping', label: 'Mapping global', iconType: 'link', iconColor: '#6D9EEB' },
      { id: 'admin/settings', label: 'Paramètres', iconType: 'settings', iconColor: '#666666' },
      {
        id: 'admin/settings/pm-simulation',
        label: 'Simulation PM',
        icon: '🎭',
        iconColor: '#B45309',
        description: 'Voir l’application comme un Property Manager (mode audit)',
      },
    ],
  },
  {
    group: 'Temp',
    roles: ADMIN_ROLES,
    items: [
      { id: 'temp/pricing-calendar', label: 'Tarifs calendrier (legacy)', icon: '📈' },
      { id: 'temp/settings-template', label: 'Templates mail', icon: '📧' },
      { id: 'temp/settings-currency', label: 'Devises', icon: '💱' },
      { id: 'temp/settings-admin-config', label: 'Pays & villes', icon: '🌍' },
      { id: 'temp/channel-distribution', label: 'Distribution channels', icon: '📡' },
      { id: 'temp/equipe-groups', label: 'Groupes staff', icon: '👨‍👩‍👧‍👦' },
      { id: 'temp/booking-clients', label: 'Clients Sojori Booking', icon: '🛒' },
    ],
  },
];

/** @deprecated alias — préférer OWNER_NAV_GROUPS + navGroupsForRole */
export const NAV_GROUPS: NavGroupConfig[] = [...OWNER_NAV_GROUPS, ...ADMIN_NAV_GROUPS];

function roleAllowed(allowed: NavRole[] | undefined, role: string | null | undefined): boolean {
  if (!allowed?.length) return true;
  if (!role) return false;
  return allowed.includes(role as NavRole);
}

/** Verrou nominatif — comparaison insensible à la casse/espaces. */
function emailAllowed(
  allowed: string[] | undefined,
  email: string | null | undefined,
): boolean {
  if (!allowed?.length) return true;
  const e = String(email ?? '').trim().toLowerCase();
  if (!e) return false;
  return allowed.some((a) => a.trim().toLowerCase() === e);
}

function filterItems(
  items: NavItemConfig[],
  role: string | null | undefined,
  email?: string | null,
): NavItemConfig[] {
  return items
    .filter((item) => roleAllowed(item.roles, role))
    .filter((item) => emailAllowed(item.restrictedToEmails, email))
    .map((item) => ({
      ...item,
      sub: item.sub ? filterItems(item.sub, role, email) : undefined,
    }))
    .filter((item) => !item.sub || item.sub.length > 0);
}

function filterGroup(
  group: NavGroupConfig,
  role: string | null | undefined,
  email?: string | null,
): NavGroupConfig {
  return {
    ...group,
    items: filterItems(group.items, role, email),
  };
}

/** Worker dashboard : filtre les entrées sidebar selon featureGrants (lecture = get). */
function filterNavItemsByGrants(
  items: NavItemConfig[],
  grants: FeatureGrant[],
  ownerAccess?: boolean,
): NavItemConfig[] {
  return items
    .map((item) => {
      if (item.sub?.length) {
        const sub = filterNavItemsByGrants(item.sub, grants, ownerAccess);
        if (!sub.length) return null;
        return { ...item, sub };
      }
      if (grantAllows(grants, item.id, 'get', ownerAccess)) {
        return { ...item, sub: undefined };
      }
      return null;
    })
    .filter((item): item is NavItemConfig => item != null);
}

export function navGroupsForWorker(
  grants: FeatureGrant[] = [],
  ownerAccess = false,
): NavGroupConfig[] {
  const admin = isWorkerAdminAccess(grants, ownerAccess);

  return OWNER_NAV_GROUPS.map((group) => {
    const ownerItems = filterItems(group.items, Roles.Owner);
    const items = admin
      ? ownerItems
      : filterNavItemsByGrants(ownerItems, grants, ownerAccess);
    return { ...group, items };
  }).filter((g) => g.items.length > 0);
}

function normalizeNavRole(role: string | null | undefined): string | null | undefined {
  if (role == null) return role;
  const r = String(role).trim();
  const lower = r.toLowerCase();
  if (r === Roles.Worker || lower === 'worker' || lower === 'staff') return Roles.Worker;
  if (r === Roles.Owner || lower === 'owner') return Roles.Owner;
  if (r === Roles.Admin || lower === 'admin') return Roles.Admin;
  if (r === Roles.SuperAdmin || lower === 'superadmin') return Roles.SuperAdmin;
  if (r === Roles.Landlord || lower === 'landlord') return Roles.Landlord;
  return r;
}

/** Sidebar filtrée par rôle (+ droits worker si role Worker). */
export function navGroupsForRole(
  role: string | null | undefined,
  workerGrants?: FeatureGrant[],
  workerOwnerAccess?: boolean,
  /** Email du compte connecté — requis pour les entrées à verrou nominatif. */
  email?: string | null,
): NavGroupConfig[] {
  const navRole = normalizeNavRole(role);
  if (navRole === Roles.Worker) {
    return navGroupsForWorker(workerGrants ?? [], !!workerOwnerAccess);
  }

  if (navRole === Roles.Landlord) {
    const stripPmOnly = (items: NavItemConfig[]): NavItemConfig[] =>
      items
        .filter((item) => item.id !== 'finances/landlords')
        .map((item) =>
          item.sub?.length ? { ...item, sub: stripPmOnly(item.sub) } : item,
        )
        .filter((item) => !item.sub || item.sub.length > 0);

    // Grants manquants (chrome/layout) → défaut création : dashboard + résas + finances lecture.
    const grants =
      Array.isArray(workerGrants) && workerGrants.length > 0
        ? workerGrants
        : [...DEFAULT_LANDLORD_DASHBOARD_GRANTS];

    return navGroupsForWorker(grants, false)
      .map((g) => ({ ...g, items: stripPmOnly(g.items) }))
      .filter((g) => g.items.length > 0);
  }

  const ownerGroups = OWNER_NAV_GROUPS.filter((g) => roleAllowed(g.roles, navRole))
    .map((g) => filterGroup(g, navRole, email))
    .filter((g) => g.items.length > 0);

  if (!roleAllowed(ADMIN_ROLES, navRole)) {
    return ownerGroups;
  }

  const adminGroups = ADMIN_NAV_GROUPS.filter((g) => roleAllowed(g.roles, navRole))
    .map((g) => filterGroup(g, navRole, email))
    .filter((g) => g.items.length > 0);

  return [...ownerGroups, ...adminGroups];
}

/** État collapsed par défaut — groupes secondaires repliés au premier login. */
export const NAV_DEFAULT_COLLAPSED: Record<string, boolean> = {
  Dashboard: false,
  Calendrier: false,
  'Prix dynamique': false,
  Pricing: false,
  Réservations: false,
  Task: false,
  Extra: false,
  Orchestration: false,
  Expériences: false,
  'Expériences · admin': true,
  Providers: false,
  Annonces: false,
  'Inbox Guest': false,
  'Inbox Staff': false,
  Inbox: false,
  Guest: false,
  Staff: false,
  Équipe: true,
  Finances: true,
  Partenaires: false,
  Providers: false,
  'Logs API': true,
  'Monitor & infra': true,
  Cost: true,
  Administration: false,
  Temp: true,
};

/** Compat legacy */
export const NAV = NAV_GROUPS;

export { ADMIN_ROLES, PM_ROLES, OPS_ROLES, WORKER_ONLY };
