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

import { SOJORI_DEFAULT_MENU_OPTIONS } from './defaultChatbotMenuSeed';

/** Option L — absente des anciens templates owner jusqu’à sync admin. */
export const DEFAULT_SERVICE_CLIENT_MENU_OPTION = {
  code: 'L',
  label: 'Service client 💌',
  enabled: true,
  availability: { type: 'always' },
  action: 'contact_service_client',
  createsTask: false,
};

/** D1–D4 · fenêtre WhatsApp par service journey */
export const JOURNEY_MENU_CODES = ['D1', 'D2', 'D3', 'D4'];

export function ensureMenuOptionsComplete(options = []) {
  return ensureMenuOptionsForCodes(options, []);
}

/** Complète les codes manquants depuis le seed Sojori (ex. D2 select_departure_time). */
export function ensureMenuOptionsForCodes(options = [], codes = []) {
  const byCode = new Map(
    (Array.isArray(options) ? options : [])
      .filter((o) => o && typeof o === 'object' && o.code)
      .map((o) => [String(o.code), o]),
  );

  const wantCodes = codes.length
    ? codes
    : SOJORI_DEFAULT_MENU_OPTIONS.map((o) => o.code);

  for (const def of SOJORI_DEFAULT_MENU_OPTIONS) {
    if (wantCodes.length && !wantCodes.includes(def.code)) continue;
    if (!byCode.has(def.code)) {
      byCode.set(def.code, { ...def });
    }
  }

  if (!byCode.has('L')) {
    byCode.set('L', { ...DEFAULT_SERVICE_CLIENT_MENU_OPTION });
  }

  const ordered = [];
  const order = codes.length ? codes : [...MENU_DISPLAY_ORDER];
  for (const code of order) {
    if (byCode.has(code)) ordered.push(byCode.get(code));
  }
  for (const [code, opt] of byCode.entries()) {
    if (!ordered.some((o) => o.code === code)) ordered.push(opt);
  }
  return ordered;
}
