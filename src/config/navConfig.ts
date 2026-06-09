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
  sub?: NavItemConfig[];
  roles?: NavRole[];
};

export type NavGroupConfig = {
  group: string;
  items: NavItemConfig[];
  roles?: NavRole[];
  /** Section Orchestration — accent visuel sidebar */
  core?: boolean;
};

const ADMIN_ROLES: NavRole[] = [Roles.SuperAdmin, Roles.Admin];
const PILOTAGE_ROLES: NavRole[] = [Roles.SuperAdmin, Roles.Admin, Roles.Owner];
const OPS_ROLES: NavRole[] = [Roles.SuperAdmin, Roles.Admin, Roles.Owner, Roles.Worker];
const PM_ROLES: NavRole[] = [Roles.SuperAdmin, Roles.Admin, Roles.Owner];
const OWNER_ONLY: NavRole[] = [Roles.Owner];
const WORKER_ONLY: NavRole[] = [Roles.Worker];

/**
 * Sidebar Atelier 2026 — alignée maquette Claude Design (Sojori Sidebar.html).
 * @see docs/SIDEBAR_CLAUDE_DESIGN.md
 */
export const NAV_GROUPS: NavGroupConfig[] = [
  {
    group: 'Pilotage',
    roles: PILOTAGE_ROLES,
    items: [
      { id: 'dashboard', label: 'Tableau de bord', iconType: 'dashboard', iconColor: '#D4A574', badge: 'Live' },
      { id: 'analytics', label: 'Analytics', iconType: 'chart', iconColor: '#5B9BD5' },
      { id: 'reports', label: 'Rapports', iconType: 'document', iconColor: '#A6A6A6', roles: ADMIN_ROLES },
    ],
  },
  {
    group: 'Opérations',
    roles: OPS_ROLES,
    items: [
      {
        id: 'reservations',
        label: 'Réservations',
        iconType: 'calendar',
        iconColor: '#E06666',
        sub: [
          { id: 'reservations/list', label: 'Liste' },
          { id: 'reservations/planning', label: 'Planning', roles: ADMIN_ROLES },
        ],
      },
      {
        id: 'payments',
        label: 'Paiements',
        iconType: 'chart',
        iconColor: '#5B9BD5',
        description: 'Audit NAPS · idDemande · token',
      },
      {
        id: 'tasks',
        label: 'Tâches',
        iconType: 'check',
        iconColor: '#93C47D',
        roles: [Roles.SuperAdmin, Roles.Admin, Roles.Owner],
        sub: [
          { id: 'tasks/list', label: 'Liste' },
          { id: 'tasks/planning', label: 'Planning séjour' },
          { id: 'tasks/kanban', label: 'Kanban' },
          { id: 'tasks/team', label: 'Équipe terrain' },
          { id: 'tasks/config', label: 'Config tâches' },
        ],
      },
      { id: 'calendar', label: 'Calendrier & inventaire', iconType: 'calendar', iconColor: '#E06666' },
    ],
  },
  {
    group: 'Orchestration',
    roles: PM_ROLES,
    core: true,
    items: [
      {
        id: 'orchestration',
        label: 'Orchestration',
        iconType: 'settings',
        iconColor: '#666666',
        badge: 'CORE',
        sub: [
          { id: 'orch/plans', label: 'Plans par séjour' },
          { id: 'orch/ops', label: 'Ops · J0/J+1' },
          { id: 'orch/workflows', label: 'Workflows · config' },
        ],
      },
    ],
  },
  {
    group: 'Catalogue & revenue',
    roles: PM_ROLES,
    items: [
      {
        id: 'listings',
        label: 'Annonces',
        iconType: 'home',
        iconColor: '#D4A574',
        sub: [
          { id: 'listings/list', label: 'Listings' },
          { id: 'listings/config', label: 'Template orchestration' },
        ],
      },
      {
        id: 'pricing',
        label: 'Dynamic Pricing',
        iconType: 'trending',
        iconColor: '#93C47D',
        sub: [
          { id: 'pricing/portfolio', label: 'Portefeuille' },
          { id: 'pricing/audit', label: 'Audit prix' },
        ],
      },
      { id: 'channels', label: 'Channel Manager', iconType: 'link', iconColor: '#6D9EEB' },
    ],
  },
  {
    group: 'Relation client',
    roles: PM_ROLES,
    items: [
      {
        id: 'comms',
        label: 'Communications',
        iconType: 'chat',
        iconColor: '#6D9EEB',
        badgeRed: true,
        sub: [
          { id: 'comms/inbox', label: 'Inbox unifiée' },
          { id: 'comms/guests', label: 'WhatsApp voyageurs' },
          { id: 'comms/staff', label: 'WhatsApp staff' },
          { id: 'comms/ota', label: 'Messages OTA' },
          { id: 'comms/templates', label: 'Templates' },
        ],
      },
      {
        id: 'chatbot',
        label: 'Chatbot',
        iconType: 'robot',
        iconColor: '#7C3AED',
        badge: 'AI',
        sub: [
          { id: 'chatbot/whitelist', label: 'Whitelist' },
          { id: 'chatbot/listing', label: 'Listing chatbot' },
        ],
      },
      {
        id: 'crm',
        label: 'CRM & clients',
        iconType: 'users',
        iconColor: '#A6A6A6',
        sub: [
          { id: 'crm/clients', label: 'Clients' },
          { id: 'crm/requests', label: 'Demandes' },
          { id: 'crm/leads', label: 'Leads & fiches' },
          { id: 'crm/support', label: 'Rendez-vous' },
          { id: 'crm/onboarding', label: 'Onboarding' },
          { id: 'crm/reviews', label: 'Avis' },
        ],
      },
    ],
  },
  {
    group: 'Équipe',
    roles: OPS_ROLES,
    items: [
      { id: 'staff', label: 'Staff', iconType: 'worker', iconColor: '#D4A574', roles: [Roles.SuperAdmin, Roles.Admin, Roles.Owner] },
      { id: 'my-tasks', label: 'Mes tâches', iconType: 'check', iconColor: '#93C47D', roles: WORKER_ONLY },
      { id: 'my-sched', label: 'Mon planning', iconType: 'calendar', iconColor: '#E06666', roles: WORKER_ONLY },
    ],
  },
  {
    group: 'Finances',
    roles: [Roles.SuperAdmin, Roles.Owner],
    items: [
      { id: 'revenue', label: 'Revenus & versements', iconType: 'trending', iconColor: '#93C47D' },
      { id: 'statements', label: 'Relevés', iconType: 'document', iconColor: '#A6A6A6' },
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
      { id: 'admin/sojori-logs', label: 'Logs Sojori', iconType: 'document', iconColor: '#A6A6A6' },
    ],
  },
  {
    group: 'Administration',
    roles: ADMIN_ROLES,
    items: [
      { id: 'admin/pms', label: 'Owners · PMs', iconType: 'building', iconColor: '#A6A6A6' },
      { id: 'admin/channels', label: 'Channels globaux', iconType: 'link', iconColor: '#6D9EEB' },
      { id: 'admin/roles', label: 'Rôles & groupes', iconType: 'shield', iconColor: '#C81E1E' },
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

function applyWorkerOpsFilter(group: NavGroupConfig, role: string | null | undefined): NavGroupConfig {
  if (role !== Roles.Worker || group.group !== 'Opérations') return group;
  return {
    ...group,
    items: group.items.filter((item) => item.id === 'calendar' || item.id === 'reservations'),
  };
}

/** Sidebar filtrée par rôle utilisateur. */
export function navGroupsForRole(role: string | null | undefined): NavGroupConfig[] {
  return NAV_GROUPS.filter((g) => roleAllowed(g.roles, role))
    .map((g) => applyWorkerOpsFilter(g, role))
    .map((g) => ({
      ...g,
      items: filterItems(g.items, role),
    }))
    .filter((g) => g.items.length > 0);
}

/** État collapsed par défaut — groupes secondaires repliés. */
export const NAV_DEFAULT_COLLAPSED: Record<string, boolean> = {
  Pilotage: false,
  Opérations: false,
  Orchestration: false,
  'Catalogue & revenue': true,
  'Relation client': true,
  Équipe: false,
  Finances: true,
  'Monitor & infra': true,
  Administration: true,
  Temp: true,
};

/** Compat legacy */
export const NAV = NAV_GROUPS;

export { ADMIN_ROLES, PILOTAGE_ROLES, OPS_ROLES, PM_ROLES, OWNER_ONLY, WORKER_ONLY };
