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
  'ma-journee': 'Ma journée',
  'admin/owner-monitor': 'Monitor',
  dashboard: 'Dashboard principal',
  calendar: 'Calendrier',
  'calendar/multi': 'Vue Multi',
  'calendar/simple': 'Vue Simple',
  'listings/configuration': 'Configuration',
  'listings/list': 'Listings',
  'listings/orchestration-model': 'Modèle orchestration',
  planning: 'Planning',
  'reservations/planning': 'Planning',
  'tasks/planning': 'Planning',
  'tasks/list': 'Liste des tâches',
  reports: 'Rapports',
  'reports/clients': 'Client 360',
  'reports/exploitation': "Rapport d'exploitation",
  'tasks/extras/ventes': 'Ventes',
  'tasks/extras/configuration': 'Catalogue',
  'tasks/extras/minibar': 'Mini-bar',
  'pricing/portfolio': 'Prix dynamique',
  'pricing/audit': 'Audit prix',
  'comms/guests': 'WhatsApp',
  'comms/owner-inbox': 'Resa Proprio',
  'comms/booking': 'Inbox Resa',
  'comms/owner-booking': 'Resa Proprio · Numéros',
  'comms/ota': 'Messages OTA',
  'comms/leads': 'Demandes',
  'comms/reviews': 'Avis',
  'comms/staff': 'Staff WhatsApp',
  'comms/admin': 'Admin WhatsApp',
  'orch/plans': 'Plans par séjour',
  'orch/ops': 'Ops · J0/J+1',
  'orch/workflows': 'Workflows · config',
  staff: 'Staff',
  'equipe/onboarding': 'On-boarding',
  'equipe/notifications': 'Notifications',
  payments: 'Paiements',
  reservations: 'Réservations',
};

function routePath(route: string): string {
  return route.split('?')[0];
}

function chromeFromNavId(navId: string): PageChromeDef | null {
  const meta = navIdToMeta.get(navId);
  if (!meta) return null;
  return {
    breadcrumb: [meta.group, meta.label],
    title: TITLE_OVERRIDES[navId] ?? meta.label,
  };
}

function resolveNavId(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  const entries = Object.entries(NAV_TO_ROUTE).sort(
    (a, b) => routePath(b[1]).length - routePath(a[1]).length,
  );

  for (const [navId, route] of entries) {
    const base = routePath(route);
    if (base === '/') continue;
    if (path === base || path.startsWith(`${base}/`)) {
      // Skip bare ids without sidebar meta (ex. `calendar` vs `calendar/multi`)
      if (!navIdToMeta.has(navId)) continue;
      return navId;
    }
  }
  return null;
}

/** Fil d’Ariane + titre H1 alignés sur la sidebar owner. */
export function resolvePageChrome(pathname: string, search = ''): PageChromeDef | null {
  const path = pathname.replace(/\/+$/, '') || '/';

  // Calendrier : ?view=simple|multi (aligné useDashboardChrome) — sinon topbar vide.
  if (path === '/calendar' || path.startsWith('/calendar-v2')) {
    const view = new URLSearchParams(search).get('view');
    const navId = view === 'simple' ? 'calendar/simple' : 'calendar/multi';
    return chromeFromNavId(navId);
  }

  const navId = resolveNavId(pathname);
  if (!navId) return null;
  return chromeFromNavId(navId);
}
