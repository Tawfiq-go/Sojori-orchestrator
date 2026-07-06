import { OWNER_NAV_GROUPS } from './navConfig';
import { NAV_TO_ROUTE } from './navRoutes';

export type PageChromeDef = {
  breadcrumb: string[];
  title: string;
};

const navIdToMeta = new Map<string, { group: string; label: string }>();

for (const group of OWNER_NAV_GROUPS) {
  for (const item of group.items) {
    navIdToMeta.set(item.id, { group: group.group, label: item.label });
    for (const sub of item.sub ?? []) {
      navIdToMeta.set(sub.id, { group: group.group, label: sub.label });
    }
  }
}

/** Titre H1 — peut différer du libellé sidebar (ex. « Dashboard principal »). */
const TITLE_OVERRIDES: Record<string, string> = {
  dashboard: 'Dashboard principal',
  calendar: 'Calendrier',
  'listings/list': 'Listings',
  'listings/orchestration-model': 'Modèle orchestration',
  'reservations/planning': 'Planning réservations',
  'tasks/planning': 'Planning tâches',
  'tasks/list': 'Liste des tâches',
  'tasks/kanban': 'Kanban',
  'pricing/portfolio': 'Prix dynamique',
  'pricing/audit': 'Audit prix',
  'comms/guests': 'WhatsApp',
  'comms/ota': 'Messages OTA',
  'comms/leads': 'Demandes',
  'comms/reviews': 'Avis',
  'comms/staff': 'Staff WhatsApp',
  'orch/plans': 'Plans par séjour',
  'orch/ops': 'Ops · J0/J+1',
  'orch/workflows': 'Workflows · config',
  staff: 'Staff',
  'equipe/onboarding': 'On-boarding',
  payments: 'Paiements',
  reservations: 'Réservations',
};

function routePath(route: string): string {
  return route.split('?')[0];
}

function resolveNavId(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  const entries = Object.entries(NAV_TO_ROUTE).sort(
    (a, b) => routePath(b[1]).length - routePath(a[1]).length,
  );

  for (const [navId, route] of entries) {
    const base = routePath(route);
    if (base === '/') continue;
    if (path === base || path.startsWith(`${base}/`)) return navId;
  }
  return null;
}

/** Fil d’Ariane + titre H1 alignés sur la sidebar owner. */
export function resolvePageChrome(pathname: string): PageChromeDef | null {
  const navId = resolveNavId(pathname);
  if (!navId) return null;

  const meta = navIdToMeta.get(navId);
  if (!meta) return null;

  return {
    breadcrumb: [meta.group, meta.label],
    title: TITLE_OVERRIDES[navId] ?? meta.label,
  };
}
