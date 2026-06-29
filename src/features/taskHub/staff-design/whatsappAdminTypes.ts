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
  banned: boolean;
  permissions: WhatsappAdminPermission[];
  /** Clés srv-fulltask — false = ne pas envoyer (opt-out si absent en base). */
  notifications: Record<string, boolean>;
  ownerId?: string;
};

/** Menus WhatsApp (lettre tapée) ↔ permission stockée en base. */
export const WA_ADMIN_TYPES = [
  { type: 'Message', label: 'Messages', menuLetter: 'M', abbr: 'MS' },
  { type: 'Reviews', label: 'Avis', menuLetter: 'V', abbr: 'AV' },
  { type: 'Lead', label: 'Leads', menuLetter: 'L', abbr: 'LD' },
  { type: 'Reservation', label: 'Réservations', menuLetter: 'R', abbr: 'RS' },
  { type: 'ArrivalDeparture', label: 'Arr. / dép.', menuLetter: 'D', abbr: 'DC' },
  { type: 'Finances', label: 'Dépense / Extra', menuLetter: 'E', abbr: 'EX' },
  { type: 'Task', label: 'Supervision tâches', menuLetter: 'T', abbr: 'TS' },
] as const;

export const WA_LANGUAGES = ['French', 'English', 'Francais', 'Arabic'] as const;

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

export function defaultTaskNotifyFlags(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const t of FULLTASK_TASK_TYPES) {
    const on = DEFAULT_TASK_NOTIFY_ENABLED[t];
    out[taskNotifyKey(t, 'created')] = on;
    out[taskNotifyKey(t, 'cancelled')] = on;
  }
  return out;
}

export const WA_TASK_NOTIFY_CREATED = FULLTASK_TASK_TYPES.map((t) => ({
  key: taskNotifyKey(t, 'created'),
  taskType: t,
  label: labelForTaskTypeId(t),
  emoji: FULLTASK_TASK_TYPE_EMOJI[t] || '📋',
}));

export const WA_TASK_NOTIFY_CANCELLED = FULLTASK_TASK_TYPES.map((t) => ({
  key: taskNotifyKey(t, 'cancelled'),
  taskType: t,
  label: labelForTaskTypeId(t),
  emoji: FULLTASK_TASK_TYPE_EMOJI[t] || '📋',
}));

/** Aligné apps/srv-fulltask/src/routes/adminWhatsapp/getNotificationTypes.ts */
export const WA_ADMIN_NOTIFICATION_GROUPS: {
  title: string;
  hint?: string;
  items: { key: string; label: string }[];
}[] = [
  {
    title: 'Réservation',
    items: [
      { key: 'reservation_new', label: 'Nouvelle réservation' },
      { key: 'airbnb_new_request', label: 'Demande Airbnb (pending)' },
      { key: 'reservation_cancelled', label: 'Réservation annulée' },
      { key: 'reservation_modified', label: 'Réservation modifiée' },
    ],
  },
  {
    title: 'Inbox OTA',
    hint: 'Lié aux menus M · V · L',
    items: [
      { key: 'message_received', label: 'Message reçu' },
      { key: 'review_new', label: 'Nouvel avis' },
      { key: 'lead_new', label: 'Nouveau lead' },
      { key: 'message_automated_sent', label: 'Message auto envoyé (peu utilisé)' },
    ],
  },
  {
    title: 'Divers',
    items: [{ key: 'registration_started', label: 'Enregistrement démarré (bientôt)' }],
  },
];

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

const TYPE_TO_CANONICAL: Record<string, string> = {
  Réservation: 'Reservation',
  Reservation: 'Reservation',
  Tâche: 'Task',
  Task: 'Task',
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
    banned: false,
    permissions: WA_ADMIN_TYPES.map((t) => ({ type: t.type, access: 'write' as const })),
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
    permMap.set(canonical, access as 'read' | 'write' | 'none');
  });

  const listingIds = normalizeListingIds(row.listingIds as unknown[] | undefined);

  return {
    _id: String(row._id),
    username: String(row.username || ''),
    whatsappPhone: String(row.whatsappPhone || ''),
    language: String(row.language || 'French'),
    listingIds,
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
    ...Object.keys(form.notifications).filter(isTaskNotifyKey),
  ]);
  for (const key of keys) {
    notifications[key] = form.notifications[key] !== false;
  }

  const body: Record<string, unknown> = {
    username: form.username.trim(),
    whatsappPhone: form.whatsappPhone.trim(),
    language: form.language,
    listingIds: normalizeListingIds(form.listingIds),
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
