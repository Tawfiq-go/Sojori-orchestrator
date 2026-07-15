import { Roles } from '../constants/roles';
import {
  grantAllows,
  isWorkerAdminAccess,
  type FeatureGrant,
} from '../utils/ownerRoutePermissions';

/** Rôles autorisés sur un groupe ou item (absent = hérite du groupe). */
export type NavRole = (typeof Roles)[keyof typeof Roles];

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
      { id: 'dashboard', label: 'Tableau de bord', iconType: 'dashboard', iconColor: '#D4A574', badge: 'Live' },
      { id: 'analytics', label: 'Analytics', iconType: 'chart', iconColor: '#5B9BD5' },
      { id: 'reports', label: 'Rapports', iconType: 'document', iconColor: '#A6A6A6' },
    ],
  },
  {
    group: 'Pricing',
    roles: PM_ROLES,
    items: [
      { id: 'calendar', label: 'Calendrier', iconType: 'calendar', iconColor: '#E06666' },
      { id: 'pricing/portfolio', label: 'Prix dynamique', iconType: 'trending', iconColor: '#93C47D' },
      { id: 'pricing/audit', label: 'Audit prix', iconType: 'trending', iconColor: '#93C47D' },
    ],
  },
  {
    group: 'Réservations',
    roles: OPS_ROLES,
    items: [
      { id: 'reservations', label: 'Liste', iconType: 'calendar', iconColor: '#E06666' },
      { id: 'reservations/planning', label: 'Planning', iconType: 'calendar', iconColor: '#E06666', roles: PM_ROLES },
      { id: 'payments', label: 'Paiements', iconType: 'chart', iconColor: '#5B9BD5', roles: PM_ROLES },
    ],
  },
  {
    group: 'Task',
    roles: [Roles.SuperAdmin, Roles.Admin, Roles.Owner],
    items: [
      { id: 'tasks/list', label: 'Liste', iconType: 'check', iconColor: '#93C47D' },
      { id: 'tasks/planning', label: 'Planning', iconType: 'check', iconColor: '#93C47D' },
      { id: 'tasks/kanban', label: 'Kanban', iconType: 'check', iconColor: '#93C47D' },
      { id: 'tasks/team', label: 'Équipe', iconType: 'check', iconColor: '#93C47D', description: 'Staff terrain & admin WhatsApp' },
    ],
  },
  {
    group: 'Orchestration',
    roles: PM_ROLES,
    core: true,
    items: [
      { id: 'orch/plans', label: 'Plans par séjour', iconType: 'settings', iconColor: '#666666', badge: 'CORE' },
      { id: 'orch/ops', label: 'Ops · J0/J+1', iconType: 'settings', iconColor: '#666666' },
      { id: 'orch/day-plan', label: 'Plan de journée', iconType: 'settings', iconColor: '#666666', badge: 'NEW' },
      { id: 'orch/workflows', label: 'Workflows · config', iconType: 'settings', iconColor: '#666666' },
    ],
  },
  {
    group: 'Annonces',
    roles: PM_ROLES,
    items: [
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
    group: 'Inbox Guest',
    roles: PM_ROLES,
    items: [
      { id: 'comms/guests', label: 'WhatsApp', iconType: 'chat', iconColor: '#25D366' },
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
    ],
  },
];

/** Sections réservées SuperAdmin / Admin (infra, pas PM client). */
export const ADMIN_NAV_GROUPS: NavGroupConfig[] = [
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
      { id: 'temp/reservations-planning', label: 'Planning résa (doublon)', icon: '📆' },
      { id: 'temp/settings-template', label: 'Templates mail', icon: '📧' },
      { id: 'temp/settings-currency', label: 'Devises', icon: '💱' },
      { id: 'temp/settings-admin-config', label: 'Pays & villes', icon: '🌍' },
      { id: 'temp/channel-distribution', label: 'Distribution channels', icon: '📡' },
      { id: 'temp/equipe-groups', label: 'Groupes staff', icon: '👨‍👩‍👧‍👦' },
      { id: 'temp/tasks-team-legacy', label: 'Équipe (legacy)', icon: '👷' },
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

function filterItems(items: NavItemConfig[], role: string | null | undefined): NavItemConfig[] {
  return items
    .filter((item) => roleAllowed(item.roles, role))
    .map((item) => ({
      ...item,
      sub: item.sub ? filterItems(item.sub, role) : undefined,
    }))
    .filter((item) => !item.sub || item.sub.length > 0);
}

function filterGroup(group: NavGroupConfig, role: string | null | undefined): NavGroupConfig {
  return {
    ...group,
    items: filterItems(group.items, role),
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

    return navGroupsForWorker(workerGrants ?? [], false)
      .map((g) => ({ ...g, items: stripPmOnly(g.items) }))
      .filter((g) => g.items.length > 0);
  }

  const ownerGroups = OWNER_NAV_GROUPS.filter((g) => roleAllowed(g.roles, navRole))
    .map((g) => filterGroup(g, navRole))
    .filter((g) => g.items.length > 0);

  if (!roleAllowed(ADMIN_ROLES, navRole)) {
    return ownerGroups;
  }

  const adminGroups = ADMIN_NAV_GROUPS.filter((g) => roleAllowed(g.roles, navRole))
    .map((g) => filterGroup(g, navRole))
    .filter((g) => g.items.length > 0);

  return [...ownerGroups, ...adminGroups];
}

/** État collapsed par défaut — groupes secondaires repliés au premier login. */
export const NAV_DEFAULT_COLLAPSED: Record<string, boolean> = {
  Dashboard: false,
  Pricing: false,
  Réservations: false,
  Task: false,
  Orchestration: false,
  Annonces: false,
  'Inbox Guest': false,
  'Inbox Staff': false,
  Inbox: false,
  Guest: false,
  Staff: false,
  Équipe: true,
  Finances: true,
  'Logs API': true,
  'Monitor & infra': true,
  Cost: true,
  Administration: true,
  Temp: true,
};

/** Compat legacy */
export const NAV = NAV_GROUPS;

export { ADMIN_ROLES, PM_ROLES, OPS_ROLES, WORKER_ONLY };
