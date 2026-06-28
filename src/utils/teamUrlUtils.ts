/** URL Équipe & Rôles — aligné legacy sojori-dashboard */

export type TeamSection = 'property-manager' | 'worker' | 'groups' | 'onboarding';

export const TEAM_SECTION_TABS: Record<TeamSection, string> = {
  'property-manager': 'list',
  worker: 'worker',
  groups: 'groups',
  onboarding: 'onboarding',
};

/** @deprecated → /admin/equipe?tab=onboarding */
export const ONBOARDING_LEGACY_TAB = 'setup';

/** Admin WhatsApp → /tasks/team */
export const ADMIN_WHATSAPP_LEGACY_TAB = 'admin-whatsapp';

/** @deprecated Dashboard Staff migré vers /tasks/team */
export const STAFF_DASHBOARD_LEGACY_TAB = 'staff-dashboard';

export function teamSectionFromPath(pathname: string, tabParam: string | null): TeamSection {
  if (pathname.includes('/admin/User/owner') || pathname.includes('/admin/equipe/owners')) {
    return 'property-manager';
  }
  const tab = (tabParam || '').toLowerCase();
  if (tab === ADMIN_WHATSAPP_LEGACY_TAB) return 'property-manager';
  if (tab === 'onboarding' || tab === ONBOARDING_LEGACY_TAB) return 'onboarding';
  if (tab === 'worker') return 'worker';
  if (tab === 'groups') return 'groups';
  return 'property-manager';
}

export function teamSectionToPath(section: TeamSection): string {
  if (section === 'property-manager') return '/admin/equipe/owners?tab=list';
  return `/admin/equipe?tab=${TEAM_SECTION_TABS[section]}`;
}

/** Migre anciennes URLs `/admin/User/team` et `/admin/User/owner`. */
export function migrateLegacyTeamSearchParams(pathname: string, sp: URLSearchParams): URLSearchParams | null {
  if (pathname.includes('/admin/User/owner')) {
    const next = new URLSearchParams(sp);
    if (!next.get('tab')) next.set('tab', 'list');
    return next;
  }
  if (pathname.includes('/admin/User/team')) {
    const next = new URLSearchParams(sp);
    const tab = next.get('tab');
    if (tab === STAFF_DASHBOARD_LEGACY_TAB || tab === 'owners' || !tab) {
      next.delete('tab');
    }
    return next;
  }
  return null;
}
