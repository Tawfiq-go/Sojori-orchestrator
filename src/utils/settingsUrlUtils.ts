/** URL Paramètres — aligné legacy sojori-dashboard /admin/Settings */

export type SettingsSection = 'template' | 'host-profile' | 'admin-config' | 'currency';

export const SETTINGS_SECTION_TABS: Record<Exclude<SettingsSection, 'currency'>, string> = {
  template: 'template',
  'host-profile': 'host-profile',
  'admin-config': 'admin-config',
};

export function settingsSectionFromPath(pathname: string, tabParam: string | null): SettingsSection {
  const path = pathname.toLowerCase();
  if (path.includes('/admin/setting/currency') || path.includes('/admin/settings/currency')) {
    return 'currency';
  }
  const tab = (tabParam || '').toLowerCase();
  if (tab === 'host-profile') return 'host-profile';
  if (tab === 'admin-config') return 'admin-config';
  if (tab === 'template') return 'template';
  return 'template';
}

export function settingsSectionToPath(section: SettingsSection): string {
  if (section === 'currency') return '/admin/setting/currency';
  return `/admin/settings?tab=${SETTINGS_SECTION_TABS[section as keyof typeof SETTINGS_SECTION_TABS] ?? 'template'}`;
}
