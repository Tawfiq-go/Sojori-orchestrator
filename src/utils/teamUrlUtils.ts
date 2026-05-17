/** URL Équipe & Rôles — aligné legacy sojori-dashboard */

export type TeamSection =
  | 'property-manager'
  | 'staff-dashboard'
  | 'admin-whatsapp'
  | 'worker'
  | 'groups';

export const TEAM_SECTION_TABS: Record<TeamSection, string> = {
  'property-manager': 'list',
  'staff-dashboard': 'staff-dashboard',
  'admin-whatsapp': 'admin-whatsapp',
  worker: 'worker',
  groups: 'groups',
};

export function teamSectionFromPath(pathname: string, tabParam: string | null): TeamSection {
  if (pathname.includes('/admin/User/owner') || pathname.includes('/admin/equipe/owners')) {
    return 'property-manager';
  }
  const tab = (tabParam || '').toLowerCase();
  if (tab === 'admin-whatsapp') return 'admin-whatsapp';
  if (tab === 'worker') return 'worker';
  if (tab === 'groups') return 'groups';
  if (tab === 'staff-dashboard' || tab === 'owners') return 'staff-dashboard';
  return 'staff-dashboard';
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
    return next; // redirect handler maps path
  }
  if (pathname.includes('/admin/User/team')) {
    const next = new URLSearchParams(sp);
    const tab = next.get('tab') || 'staff-dashboard';
    next.set('tab', tab);
    return next;
  }
  return null;
}
