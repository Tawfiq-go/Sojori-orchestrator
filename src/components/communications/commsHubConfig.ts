export type CommsSection = 'guest' | 'staff';

export type CommsGuestTab = 'whatsapp' | 'ota' | 'leads' | 'reviews';
export type CommsStaffTab = 'staff';
export type CommsHubTab = CommsGuestTab | CommsStaffTab;

export const GUEST_HUB_TABS: {
  id: CommsGuestTab;
  label: string;
  emoji: string;
}[] = [
  { id: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
  { id: 'ota', label: 'Messages OTA', emoji: '🏨' },
  { id: 'leads', label: 'Demande', emoji: '🎯' },
  { id: 'reviews', label: 'Avis', emoji: '⭐' },
];

export const STAFF_HUB_TABS: {
  id: CommsStaffTab;
  label: string;
  emoji: string;
}[] = [{ id: 'staff', label: 'Staff WhatsApp', emoji: '👷' }];

const GUEST_TAB_SET = new Set<string>(GUEST_HUB_TABS.map((t) => t.id));
const STAFF_TAB_SET = new Set<string>(STAFF_HUB_TABS.map((t) => t.id));

export function resolveCommsSection(
  sectionParam: string | null,
  tabParam: string | null,
): CommsSection {
  if (sectionParam === 'staff' || sectionParam === 'guest') return sectionParam;
  if (tabParam === 'staff') return 'staff';
  return 'guest';
}

export function defaultTabForSection(section: CommsSection): CommsHubTab {
  return section === 'staff' ? 'staff' : 'whatsapp';
}

export function tabBelongsToSection(tab: string, section: CommsSection): boolean {
  if (section === 'staff') return STAFF_TAB_SET.has(tab);
  return GUEST_TAB_SET.has(tab);
}

export function normalizeCommsTab(tab: string | null, section: CommsSection): CommsHubTab {
  const fallback = defaultTabForSection(section);
  if (!tab || tab === 'templates') return fallback;
  return tabBelongsToSection(tab, section) ? (tab as CommsHubTab) : fallback;
}
