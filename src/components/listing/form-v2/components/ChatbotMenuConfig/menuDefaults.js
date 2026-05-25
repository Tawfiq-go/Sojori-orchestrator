/** Ordre d’affichage menu WhatsApp voyageur (aligné srv-admin defaultChatbotMenu). */
export const MENU_DISPLAY_ORDER = [
  'A',
  'B',
  'C',
  'D',
  'D1',
  'D2',
  'D3',
  'D4',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'J1',
  'J2',
  'J3',
  'K',
  'L',
];

/** Option L — absente des anciens templates owner jusqu’à sync admin. */
export const DEFAULT_SERVICE_CLIENT_MENU_OPTION = {
  code: 'L',
  label: 'Service client 💌',
  enabled: true,
  availability: { type: 'always' },
  action: 'contact_service_client',
  createsTask: false,
};

export function ensureMenuOptionsComplete(options = []) {
  const list = [...options];
  if (!list.some((o) => o.code === 'L')) {
    list.push({ ...DEFAULT_SERVICE_CLIENT_MENU_OPTION });
  }
  return list;
}
