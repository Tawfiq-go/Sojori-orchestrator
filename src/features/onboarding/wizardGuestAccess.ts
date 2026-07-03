import type { WizardCapabilities, WizardConditions, WizardJxSettings } from './types';

export type WizardJxPreset = WizardJxSettings['preset'];

export type JxOptionGroup =
  | 'menu'
  | 'welcome'
  | 'fromJ'
  | 'arrivalWindow'
  | 'departureWindow'
  | 'declareDeparture'
  | 'always'
  | 'services'
  | 'accessCodes';

export const JX_OPTIONS: Record<JxOptionGroup, readonly string[]> = {
  menu: ['À la réservation', 'À partir de J-7', 'À partir de J-3', 'À partir de J-1', "Jour d'arrivée (J0)"],
  welcome: [
    'À la réservation',
    'J-7 avant arrivée',
    'J-3 avant arrivée',
    'J-1 avant arrivée',
    "Jour d'arrivée (J0)",
  ],
  fromJ: [
    'À la réservation',
    'À partir de J-7',
    'À partir de J-5',
    'À partir de J-3',
    'À partir de J-1',
    "Jour d'arrivée (J0)",
  ],
  arrivalWindow: [
    'De la réservation à J-1',
    'De J-14 à J-1',
    'De J-7 à J-1',
    'De J-3 à J-1',
    "Jusqu'à J-1",
    "Jour d'arrivée uniquement",
  ],
  departureWindow: [
    'De la réservation à veille départ',
    'De J-7 à veille départ',
    'De J-3 à veille départ',
    'Jour de départ uniquement',
  ],
  declareDeparture: [
    'À la réservation',
    'Dès la veille du départ',
    'Jour de départ uniquement',
  ],
  always: ['Toujours disponible', 'Dès la réservation', 'À partir de J-3', 'À partir de J-1', "Jour d'arrivée"],
  services: [
    'Dès la réservation',
    'À partir de J-7',
    'À partir de J-3',
    'À partir de J-1',
    "Jour d'arrivée",
  ],
  accessCodes: [
    'À la réservation',
    'Après enregistrement + créneau arrivée',
    'Après enregistrement uniquement',
    "Jour d'arrivée (J0)",
    'J-1 avant arrivée',
  ],
};

export type JxRowDef = {
  key: keyof WizardJxSettings;
  emoji: string;
  label: string;
  hint?: string;
  optionGroup: JxOptionGroup;
  /** Toujours visible (menu voyageur) */
  core?: boolean;
  /** Clé capability étape 3 — si absente = core ou cleaning group */
  capability?: keyof WizardCapabilities | 'cleaning';
  toggle?: boolean;
};

export const JX_ROWS: JxRowDef[] = [
  {
    key: 'menuActive',
    emoji: '📱',
    label: 'Menu WhatsApp actif dès',
    hint: 'Le voyageur peut ouvrir le menu',
    optionGroup: 'menu',
    core: true,
  },
  {
    key: 'welcome',
    emoji: '👋',
    label: 'Message de bienvenue',
    hint: 'Premier contact automatisé',
    optionGroup: 'welcome',
    capability: 'welcome',
  },
  {
    key: 'registration',
    emoji: '📝',
    label: 'Enregistrement voyageurs',
    hint: 'Saisie des infos & pièces',
    optionGroup: 'fromJ',
    capability: 'registration',
  },
  {
    key: 'arrivalChoose',
    emoji: '🕓',
    label: "Choisir l'heure d'arrivée",
    optionGroup: 'arrivalWindow',
    capability: 'arrivalChoose',
  },
  {
    key: 'departureChoose',
    emoji: '🕐',
    label: "Choisir l'heure de départ",
    optionGroup: 'departureWindow',
    capability: 'departureChoose',
  },
  {
    key: 'arrivalDeclare',
    emoji: '📍',
    label: "Déclarer l'arrivée sur place",
    optionGroup: 'fromJ',
    capability: 'arrivalDeclare',
  },
  {
    key: 'departureDeclare',
    emoji: '🚪',
    label: 'Déclarer le départ',
    optionGroup: 'declareDeparture',
    capability: 'departureDeclare',
  },
  {
    key: 'support',
    emoji: '🆘',
    label: 'Support urgence',
    hint: 'Signaler un problème',
    optionGroup: 'always',
    capability: 'support',
  },
  {
    key: 'serviceClient',
    emoji: '🛎',
    label: 'Service client',
    hint: 'Réclamations & suivi',
    optionGroup: 'always',
    capability: 'serviceClient',
  },
  {
    key: 'transport',
    emoji: '🚐',
    label: 'Transport',
    optionGroup: 'services',
    capability: 'transport',
  },
  {
    key: 'groceries',
    emoji: '🛒',
    label: 'Courses',
    optionGroup: 'services',
    capability: 'groceries',
  },
  {
    key: 'concierge',
    emoji: '✨',
    label: 'Conciergerie',
    hint: 'Réserver un service',
    optionGroup: 'services',
    capability: 'concierge',
  },
  {
    key: 'cleaning',
    emoji: '🧹',
    label: 'Ménage (inclus / payant)',
    optionGroup: 'services',
    capability: 'cleaning',
  },
  {
    key: 'accessCodes',
    emoji: '🔑',
    label: "Envoi des codes d'accès",
    optionGroup: 'accessCodes',
    capability: 'accessCodes',
  },
  {
    key: 'wifi',
    emoji: '📶',
    label: 'Infos WiFi',
    optionGroup: 'fromJ',
    capability: 'wifi',
  },
  {
    key: 'rules',
    emoji: '📋',
    label: 'Règles du logement',
    optionGroup: 'fromJ',
    capability: 'rules',
  },
  {
    key: 'codesAfterRegistration',
    emoji: '🔗',
    label: 'Codes bloqués sans enregistrement + créneau',
    hint: 'Condition avant envoi des codes',
    optionGroup: 'menu',
    core: true,
    toggle: true,
  },
];

const PRESET_STANDARD: Omit<WizardJxSettings, 'preset'> = {
  menuActive: 'À la réservation',
  welcome: 'J-3 avant arrivée',
  registration: 'À partir de J-3',
  arrivalChoose: 'De J-7 à J-1',
  departureChoose: 'De J-7 à veille départ',
  arrivalDeclare: 'Jour d\'arrivée (J0)',
  departureDeclare: 'Jour de départ uniquement',
  support: 'Toujours disponible',
  serviceClient: 'Dès la réservation',
  transport: 'Dès la réservation',
  groceries: 'À partir de J-3',
  concierge: 'Dès la réservation',
  cleaning: 'À partir de J-3',
  accessCodes: 'Après enregistrement + créneau arrivée',
  wifi: 'À partir de J-1',
  rules: 'À partir de J-3',
  codesAfterRegistration: true,
};

const PRESET_EARLY: Omit<WizardJxSettings, 'preset'> = {
  menuActive: 'À la réservation',
  welcome: 'À la réservation',
  registration: 'À la réservation',
  arrivalChoose: 'De la réservation à J-1',
  departureChoose: 'De la réservation à veille départ',
  arrivalDeclare: "Jour d'arrivée (J0)",
  departureDeclare: 'Dès la veille du départ',
  support: 'Toujours disponible',
  serviceClient: 'Dès la réservation',
  transport: 'Dès la réservation',
  groceries: 'Dès la réservation',
  concierge: 'Dès la réservation',
  cleaning: 'Dès la réservation',
  accessCodes: 'Après enregistrement + créneau arrivée',
  wifi: 'À la réservation',
  rules: 'À la réservation',
  codesAfterRegistration: true,
};

const PRESET_SECURE: Omit<WizardJxSettings, 'preset'> = {
  menuActive: 'À partir de J-3',
  welcome: 'J-1 avant arrivée',
  registration: 'À partir de J-3',
  arrivalChoose: 'De J-3 à J-1',
  departureChoose: 'De J-3 à veille départ',
  arrivalDeclare: "Jour d'arrivée (J0)",
  departureDeclare: 'Jour de départ uniquement',
  support: 'Toujours disponible',
  serviceClient: 'À partir de J-3',
  transport: 'À partir de J-3',
  groceries: 'À partir de J-3',
  concierge: 'À partir de J-3',
  cleaning: 'À partir de J-3',
  accessCodes: 'Après enregistrement + créneau arrivée',
  wifi: 'À partir de J-1',
  rules: 'À partir de J-3',
  codesAfterRegistration: true,
};

export const JX_PRESETS: Array<{
  id: WizardJxPreset;
  emoji: string;
  title: string;
  desc: string;
}> = [
  { id: 'standard', emoji: '⚖️', title: 'Standard', desc: 'Équilibre réservation / avant séjour' },
  { id: 'early', emoji: '🚀', title: 'Dès réservation', desc: 'Maximum de services tôt' },
  { id: 'secure', emoji: '🔒', title: 'Sécurisé', desc: 'Menu et actions plus tardifs' },
  { id: 'custom', emoji: '✏️', title: 'Personnalisé', desc: 'Réglage ligne par ligne' },
];

export function applyJxPreset(preset: WizardJxPreset): WizardJxSettings {
  if (preset === 'early') return { preset: 'early', ...PRESET_EARLY };
  if (preset === 'secure') return { preset: 'secure', ...PRESET_SECURE };
  if (preset === 'standard') return { preset: 'standard', ...PRESET_STANDARD };
  return { preset: 'custom', ...PRESET_STANDARD };
}

export function normalizeJxSettings(raw?: Partial<WizardJxSettings>): WizardJxSettings {
  const base = applyJxPreset('standard');
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    preset: raw.preset ?? base.preset,
    codesAfterRegistration:
      typeof raw.codesAfterRegistration === 'boolean'
        ? raw.codesAfterRegistration
        : base.codesAfterRegistration,
  };
}

function cleaningEnabled(caps: WizardCapabilities): boolean {
  return caps.cleaningFree || caps.cleaningPaid || caps.cleaningSojori;
}

export function jxRowsForCapabilities(caps: WizardCapabilities): JxRowDef[] {
  return JX_ROWS.filter((row) => {
    if (row.core) return true;
    if (row.capability === 'cleaning') return cleaningEnabled(caps);
    if (!row.capability) return true;
    return caps[row.capability];
  });
}

export function deriveConditionsFromJx(
  jx: WizardJxSettings,
  caps: WizardCapabilities,
): WizardConditions {
  const hasRegistration = caps.registration;
  const hasArrivalChoose = caps.arrivalChoose;
  const hasCodes = caps.accessCodes;

  return {
    registrationBeforeArrival: hasRegistration && hasArrivalChoose,
    arrivalBeforeCodes: hasCodes && jx.codesAfterRegistration,
    registrationBeforeStaff: hasRegistration,
    arrivalBeforeStaff: hasArrivalChoose,
    preset: 'secure',
  };
}

export function jxSelectOptions(row: JxRowDef, currentValue: string): string[] {
  const opts = [...JX_OPTIONS[row.optionGroup]];
  if (currentValue && !opts.includes(currentValue)) {
    opts.unshift(currentValue);
  }
  return opts;
}
