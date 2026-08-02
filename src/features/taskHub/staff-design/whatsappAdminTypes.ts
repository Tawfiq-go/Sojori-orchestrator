import {
  FULLTASK_TASK_TYPES,
  FULLTASK_TASK_TYPE_EMOJI,
  labelForTaskTypeId,
} from './fulltaskTaskTypes';
import { normalizeOwnerId } from '../../../utils/fulltaskMappers';

export type WhatsappAdminPermission = {
  type: string;
  access: 'read' | 'write' | 'none';
};

export type WhatsappAdminDesign = {
  _id: string;
  username: string;
  whatsappPhone: string;
  language: string;
  listingIds: string[];
  /** Villes autorisées — sentinel « All » = toutes les villes (comme staff). */
  cityIds: string[];
  banned: boolean;
  permissions: WhatsappAdminPermission[];
  /** Clés srv-fulltask — false = ne pas envoyer (opt-out si absent en base). */
  notifications: Record<string, boolean>;
  ownerId?: string;
};

/** Menus WhatsApp (lettre tapée) ↔ permission stockée en base.
 * Pas de `Task` générique (« tout ») — uniquement superviseurs par métier (anti-fuite / clarté). */
export const WA_ADMIN_TYPES = [
  { type: 'Message', label: 'Messages', menuLetter: 'M', abbr: 'MS' },
  { type: 'Reviews', label: 'Avis', menuLetter: 'V', abbr: 'AV' },
  { type: 'Lead', label: 'Leads', menuLetter: 'L', abbr: 'LD' },
  { type: 'Reservation', label: 'Réservations', menuLetter: 'R', abbr: 'RS' },
  { type: 'ArrivalDeparture', label: 'Arr. / dép.', menuLetter: 'D', abbr: 'DC' },
  { type: 'Finances', label: 'Dépense / Extra', menuLetter: 'E', abbr: 'EX' },
  { type: 'Enregistrement', label: 'Enregistrement (passeports)', menuLetter: 'P', abbr: 'PG' },
  { type: 'Task:Cleaning', label: 'Superviseur Ménage', menuLetter: 'T', abbr: 'TM' },
  { type: 'Task:Arrival', label: 'Superviseur Accueil', menuLetter: 'T', abbr: 'TA' },
  { type: 'Task:Support', label: 'Superviseur Support', menuLetter: 'T', abbr: 'TP' },
  { type: 'Task:ServiceClient', label: 'Superviseur Service client', menuLetter: 'T', abbr: 'TC' },
] as const;

/** Types T encore lus en base (legacy) mais plus exposés dans l’UI. */
const LEGACY_TASK_GENERIC_TYPES = ['Task', 'Tâche'] as const;

const TASK_STAR_TYPES = [
  'Task:Cleaning',
  'Task:Arrival',
  'Task:Support',
  'Task:ServiceClient',
] as const;

/** Langues WhatsApp Admin (ops) — alignées normalizeAdminLanguageForTemplates. */
export const WA_LANGUAGES = [
  { value: 'French', label: 'Français' },
  { value: 'English', label: 'English' },
  { value: 'Arabic', label: 'Darija' },
] as const;

export type WaLanguageValue = (typeof WA_LANGUAGES)[number]['value'];

/** Normalize legacy stored values (Francais, Darija, …) to a WA_LANGUAGES value. */
export function normalizeWaAdminLanguage(raw: string | null | undefined): WaLanguageValue {
  const n = String(raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (['english', 'en', 'eng'].includes(n)) return 'English';
  if (['arabic', 'ar', 'darija', 'dariya', 'arab'].includes(n)) return 'Arabic';
  return 'French';
}

export function waAdminLanguageLabel(raw: string | null | undefined): string {
  const value = normalizeWaAdminLanguage(raw);
  return WA_LANGUAGES.find((l) => l.value === value)?.label ?? value;
}

export type TaskNotifyEvent = 'created' | 'cancelled';

export function taskNotifyKey(type: string, event: TaskNotifyEvent): string {
  return event === 'created' ? `task_notify_${type}` : `task_cancel_notify_${type}`;
}

/** Aligné apps/srv-fulltask/src/utils/adminTaskNotifications.ts */
export const DEFAULT_TASK_NOTIFY_ENABLED: Record<(typeof FULLTASK_TASK_TYPES)[number], boolean> = {
  arrival_choose: false,
  departure_choose: false,
  arrival_declare: false,
  departure_declare: false,
  registration: false,
  cleaning_free: false,
  cleaning_paid: true,
  checkout_cleaning: true,
  transport: true,
  groceries: true,
  concierge: true,
  support: true,
  service_client: true,
};

/** Types tâches exposés dans l’UI admin (simplifié). */
export const WA_ADMIN_TASK_NOTIFY_TYPES = [
  'transport',
  'groceries',
  'concierge',
  'support',
  'service_client',
] as const;

export function defaultTaskNotifyFlags(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const t of FULLTASK_TASK_TYPES) {
    const on = (WA_ADMIN_TASK_NOTIFY_TYPES as readonly string[]).includes(t)
      ? DEFAULT_TASK_NOTIFY_ENABLED[t]
      : false;
    out[taskNotifyKey(t, 'created')] = on;
    out[taskNotifyKey(t, 'cancelled')] = false;
  }
  return out;
}

export const WA_TASK_NOTIFY_CREATED = WA_ADMIN_TASK_NOTIFY_TYPES.map((t) => ({
  key: taskNotifyKey(t, 'created'),
  taskType: t,
  label: labelForTaskTypeId(t),
  emoji: FULLTASK_TASK_TYPE_EMOJI[t] || '📋',
}));

/** @deprecated — section UI retirée. */
export const WA_TASK_NOTIFY_CANCELLED: typeof WA_TASK_NOTIFY_CREATED = [];

/** Notifs push exposées (UI simplifiée). */
export const WA_ADMIN_NOTIFICATION_GROUPS: {
  title: string;
  hint?: string;
  items: { key: string; label: string }[];
}[] = [
  {
    title: 'Réservation & inbox',
    items: [
      { key: 'reservation_new', label: 'Réservation créée' },
      { key: 'reservation_cancelled', label: 'Réservation annulée' },
      { key: 'message_received', label: 'Message OTA' },
      { key: 'lead_new', label: 'Message Lead' },
      { key: 'review_new', label: 'Avis OTA' },
    ],
  },
];

/** Clés retirées de l’UI — forcées à false à la sauvegarde. */
export const WA_ADMIN_NOTIFICATION_KEYS_REMOVED = [
  'message_automated_sent',
  'registration_started',
  'airbnb_new_request',
  'reservation_modified',
] as const;

export const WA_ADMIN_NOTIFICATION_KEYS = [
  ...WA_ADMIN_NOTIFICATION_GROUPS.flatMap((g) => g.items.map((i) => i.key)),
  ...Object.keys(defaultTaskNotifyFlags()),
];

export function defaultAdminNotifications(): Record<string, boolean> {
  return {
    ...Object.fromEntries(
      WA_ADMIN_NOTIFICATION_GROUPS.flatMap((g) => g.items).map((i) => [i.key, true]),
    ),
    ...defaultTaskNotifyFlags(),
  };
}

function isTaskNotifyKey(k: string): boolean {
  return k.startsWith('task_notify_') || k.startsWith('task_cancel_notify_');
}

/** Normalise un id listing (string, ObjectId, legacy). */
export function normalizeListingId(id: unknown): string {
  if (id === 'All' || id === 'ALL') return 'All';
  if (id == null || id === '') return '';
  if (typeof id === 'object') {
    const o = id as { _id?: unknown; toString?: () => string };
    if (o._id != null) return String(o._id);
    if (typeof o.toString === 'function') {
      const s = o.toString();
      if (s && s !== '[object Object]') return s;
    }
  }
  return String(id).trim();
}

export function normalizeListingIds(raw: unknown[] | undefined): string[] {
  const ids = (raw ?? []).map(normalizeListingId).filter(Boolean);
  if (ids.some((x) => x === 'All')) return ['All'];
  return ids;
}

/** Villes autorisées — même sémantique que listingIds (sentinel « All »). */
export function normalizeCityIds(raw: unknown[] | undefined): string[] {
  return normalizeListingIds(raw);
}

const TYPE_TO_CANONICAL: Record<string, string> = {
  Réservation: 'Reservation',
  Reservation: 'Reservation',
  Tâche: 'Task',
  Task: 'Task',
  'Task:Cleaning': 'Task:Cleaning',
  TaskCleaning: 'Task:Cleaning',
  'Supervision:Ménage': 'Task:Cleaning',
  'Supervision:Menage': 'Task:Cleaning',
  'Task:Arrival': 'Task:Arrival',
  TaskArrival: 'Task:Arrival',
  'Supervision:Accueil': 'Task:Arrival',
  'Task:Support': 'Task:Support',
  TaskSupport: 'Task:Support',
  'Supervision:Support': 'Task:Support',
  'Task:ServiceClient': 'Task:ServiceClient',
  TaskServiceClient: 'Task:ServiceClient',
  'Supervision:ServiceClient': 'Task:ServiceClient',
  Message: 'Message',
  Messages: 'Message',
  Avis: 'Reviews',
  Reviews: 'Reviews',
  Lead: 'Lead',
  Leads: 'Lead',
  'Arrivée/Départ': 'ArrivalDeparture',
  ArrivalDeparture: 'ArrivalDeparture',
  Finances: 'Finances',
  ExpenseExtra: 'Finances',
  Dépense: 'Finances',
  Extra: 'Finances',
  Expense: 'Finances',
  Ledger: 'Finances',
  Enregistrement: 'Enregistrement',
  Registration: 'Enregistrement',
  Passeport: 'Enregistrement',
  Passport: 'Enregistrement',
};

function notificationsFromApi(raw: unknown): Record<string, boolean> {
  const base = defaultAdminNotifications();
  if (raw == null) return base;

  const rec: Record<string, unknown> = {};
  if (raw instanceof Map) {
    raw.forEach((v, k) => {
      rec[String(k)] = v;
    });
  } else if (typeof raw === 'object') {
    Object.assign(rec, raw as Record<string, unknown>);
  }

  for (const [k, v] of Object.entries(rec)) {
    if (WA_ADMIN_NOTIFICATION_KEYS.includes(k) || isTaskNotifyKey(k)) {
      base[k] = Boolean(v);
    }
  }

  const legacyCreateOff = rec.task_createdByCustomer === false;
  const legacyCancelOff = rec.task_cancelled === false;
  for (const t of FULLTASK_TASK_TYPES) {
    const ck = taskNotifyKey(t, 'created');
    const xk = taskNotifyKey(t, 'cancelled');
    if (!Object.prototype.hasOwnProperty.call(rec, ck) && legacyCreateOff) {
      base[ck] = false;
    }
    if (!Object.prototype.hasOwnProperty.call(rec, xk) && legacyCancelOff) {
      base[xk] = false;
    }
  }

  return base;
}

export function emptyWhatsappAdmin(): WhatsappAdminDesign {
  return {
    _id: '',
    username: '',
    whatsappPhone: '',
    language: 'French',
    listingIds: [],
    cityIds: [],
    banned: false,
    permissions: WA_ADMIN_TYPES.map((t) => ({
      type: t.type,
      // T métiers à none par défaut — l’opérateur active Superviseur Ménage / Accueil / …
      access: (t.type.startsWith('Task:') ? 'none' : 'write') as 'read' | 'write' | 'none',
    })),
    notifications: defaultAdminNotifications(),
  };
}

export function apiWhatsappAdminToDesign(row: Record<string, unknown>): WhatsappAdminDesign {
  const permMap = new Map<string, 'read' | 'write' | 'none'>();
  WA_ADMIN_TYPES.forEach((t) => permMap.set(t.type, 'none'));

  ;(row.permissions as Array<Record<string, unknown>> | undefined)?.forEach((p) => {
    const canonical = TYPE_TO_CANONICAL[String(p.type)] || String(p.type);
    let access = p.access as string | undefined;
    if (!access || !['read', 'write', 'none'].includes(access)) {
      if (p.write) access = 'write';
      else if (p.read) access = 'read';
      else access = 'none';
    }
    // Legacy Task générique → stocké temporairement sous clé Task
    if ((LEGACY_TASK_GENERIC_TYPES as readonly string[]).includes(String(p.type))) {
      permMap.set('Task', access as 'read' | 'write' | 'none');
      return;
    }
    permMap.set(canonical, access as 'read' | 'write' | 'none');
  });

  // Migration soft : Task=write et aucun Task:* → déplier en 4 superviseurs (même access).
  const genericAccess = permMap.get('Task');
  const anyStar = TASK_STAR_TYPES.some((t) => {
    const a = permMap.get(t);
    return a === 'read' || a === 'write';
  });
  if ((genericAccess === 'read' || genericAccess === 'write') && !anyStar) {
    for (const t of TASK_STAR_TYPES) permMap.set(t, genericAccess);
  }

  const listingIds = normalizeListingIds(row.listingIds as unknown[] | undefined);
  const cityIds = normalizeCityIds(row.cityIds as unknown[] | undefined);

  return {
    _id: String(row._id),
    username: String(row.username || ''),
    whatsappPhone: String(row.whatsappPhone || ''),
    language: normalizeWaAdminLanguage(String(row.language || 'French')),
    listingIds,
    cityIds,
    banned: Boolean(row.banned),
    permissions: WA_ADMIN_TYPES.map((t) => ({
      type: t.type,
      access: permMap.get(t.type) || 'none',
    })),
    notifications: notificationsFromApi(row.notifications),
    ownerId: row.ownerId ? String(row.ownerId) : undefined,
  };
}

export function designWhatsappAdminToApi(
  form: WhatsappAdminDesign,
  ownerId?: string,
): Record<string, unknown> {
  const notifications: Record<string, boolean> = {};
  const keys = new Set([
    ...WA_ADMIN_NOTIFICATION_KEYS,
    ...Object.keys(defaultTaskNotifyFlags()),
    ...Object.keys(form.notifications).filter(isTaskNotifyKey),
  ]);
  for (const key of keys) {
    notifications[key] = form.notifications[key] !== false;
  }
  // Clés retirées de l’UI : toujours OFF.
  for (const key of WA_ADMIN_NOTIFICATION_KEYS_REMOVED) {
    notifications[key] = false;
  }
  // Types tâches hors liste simplifiée → OFF.
  for (const t of FULLTASK_TASK_TYPES) {
    if (!(WA_ADMIN_TASK_NOTIFY_TYPES as readonly string[]).includes(t)) {
      notifications[taskNotifyKey(t, 'created')] = false;
      notifications[taskNotifyKey(t, 'cancelled')] = false;
    }
  }

  const body: Record<string, unknown> = {
    username: form.username.trim(),
    whatsappPhone: form.whatsappPhone.trim(),
    language: form.language,
    listingIds: normalizeListingIds(form.listingIds),
    cityIds: normalizeCityIds(form.cityIds),
    banned: form.banned,
    permissions: form.permissions.map((p) => ({
      type: p.type,
      access: p.access,
      read: p.access === 'read' || p.access === 'write',
      write: p.access === 'write',
    })),
    notifications,
  };
  const resolvedOwnerId = normalizeOwnerId(ownerId ?? form.ownerId);
  if (resolvedOwnerId) body.ownerId = resolvedOwnerId;
  return body;
}

export function cyclePermissionAccess(current: 'read' | 'write' | 'none'): 'read' | 'write' | 'none' {
  if (current === 'none') return 'read';
  if (current === 'read') return 'write';
  return 'none';
}
