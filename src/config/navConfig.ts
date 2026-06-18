import { Roles } from '../constants/roles';

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
      { id: 'tasks/team', label: 'Équipe terrain', iconType: 'check', iconColor: '#93C47D' },
    ],
  },
  {
    group: 'Orchestration',
    roles: PM_ROLES,
    core: true,
    items: [
      { id: 'orch/plans', label: 'Plans par séjour', iconType: 'settings', iconColor: '#666666', badge: 'CORE' },
      { id: 'orch/ops', label: 'Ops · J0/J+1', iconType: 'settings', iconColor: '#666666' },
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
    ],
  },
  {
    group: 'Inbox',
    roles: PM_ROLES,
    items: [
      { id: 'comms/guests', label: 'WhatsApp Guest', iconType: 'chat', iconColor: '#6D9EEB' },
      { id: 'comms/ota', label: 'Messages OTA', iconType: 'chat', iconColor: '#6D9EEB' },
      { id: 'crm/requests', label: 'Demandes', iconType: 'chat', iconColor: '#6D9EEB' },
      { id: 'reviews', label: 'Avis', iconType: 'chat', iconColor: '#6D9EEB' },
      { id: 'comms/staff', label: 'Staff WhatsApp', iconType: 'chat', iconColor: '#6D9EEB', badgeRed: true },
    ],
  },
  {
    group: 'Équipe',
    roles: OPS_ROLES,
    items: [
      { id: 'staff', label: 'Staff', iconType: 'worker', iconColor: '#D4A574', roles: PM_ROLES },
      { id: 'chatbot/whitelist', label: 'Whitelist', iconType: 'robot', iconColor: '#7C3AED', roles: PM_ROLES },
      { id: 'my-tasks', label: 'Mes tâches', iconType: 'check', iconColor: '#93C47D', roles: WORKER_ONLY },
      { id: 'my-sched', label: 'Mon planning', iconType: 'calendar', iconColor: '#E06666', roles: WORKER_ONLY },
    ],
  },
  {
    group: 'Finances',
    roles: [Roles.SuperAdmin, Roles.Admin, Roles.Owner],
    items: [
      { id: 'revenue', label: 'Revenus & versements', iconType: 'trending', iconColor: '#93C47D' },
      { id: 'statements', label: 'Relevés', iconType: 'document', iconColor: '#A6A6A6' },
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
          { id: 'admin/channels/debug', label: 'Debug' },
        ],
      },
      {
        id: 'admin/sojori-logs',
        label: 'Logs AirROI',
        iconType: 'document',
        iconColor: '#E6B022',
        description: 'Logs API marché & listings',
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
    group: 'Administration',
    roles: ADMIN_ROLES,
    items: [
      { id: 'admin/pms', label: 'Owners · PMs', iconType: 'building', iconColor: '#A6A6A6' },
      { id: 'admin/roles', label: 'Rôles & groupes', iconType: 'shield', iconColor: '#C81E1E' },
      { id: 'admin/mapping', label: 'Mapping global', iconType: 'link', iconColor: '#6D9EEB' },
      { id: 'admin/settings', label: 'Paramètres', iconType: 'settings', iconColor: '#666666' },
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

/** Worker terrain : calendrier + réservations + mes tâches / planning. */
function workerNavGroups(): NavGroupConfig[] {
  return [
    {
      group: 'Réservations',
      items: [
        { id: 'reservations', label: 'Liste', iconType: 'calendar', iconColor: '#E06666' },
      ],
    },
    {
      group: 'Pricing',
      items: [{ id: 'calendar', label: 'Calendrier', iconType: 'calendar', iconColor: '#E06666' }],
    },
    {
      group: 'Équipe',
      items: [
        { id: 'my-tasks', label: 'Mes tâches', iconType: 'check', iconColor: '#93C47D' },
        { id: 'my-sched', label: 'Mon planning', iconType: 'calendar', iconColor: '#E06666' },
      ],
    },
  ];
}

/** Sidebar filtrée par rôle utilisateur. */
export function navGroupsForRole(role: string | null | undefined): NavGroupConfig[] {
  if (role === Roles.Worker) {
    return workerNavGroups();
  }

  const ownerGroups = OWNER_NAV_GROUPS.filter((g) => roleAllowed(g.roles, role))
    .map((g) => filterGroup(g, role))
    .filter((g) => g.items.length > 0);

  if (!roleAllowed(ADMIN_ROLES, role)) {
    return ownerGroups;
  }

  const adminGroups = ADMIN_NAV_GROUPS.filter((g) => roleAllowed(g.roles, role))
    .map((g) => filterGroup(g, role))
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
  Annonces: true,
  Inbox: false,
  Équipe: true,
  Finances: true,
  'Logs API': true,
  'Monitor & infra': true,
  Administration: true,
  Temp: true,
};

/** Compat legacy */
export const NAV = NAV_GROUPS;

export { ADMIN_ROLES, PM_ROLES, OPS_ROLES, WORKER_ONLY };
