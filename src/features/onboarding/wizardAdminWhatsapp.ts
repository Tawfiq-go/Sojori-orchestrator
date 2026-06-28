import type { WizardWaNotifCategory } from './types';
import {
  WA_ADMIN_NOTIFICATION_GROUPS,
  defaultAdminNotifications,
  cyclePermissionAccess,
} from '../taskHub/staff-design/whatsappAdminTypes';

/** Icônes menus WA admin (aligné prod). */
export const WA_MENU_ICONS: Record<string, string> = {
  Message: '💬',
  Reviews: '⭐',
  Lead: '📋',
  Reservation: '📅',
  ArrivalDeparture: '🛬',
  Task: '✅',
};

export const WA_MENU_TYPES = [
  { type: 'Message', label: 'Messages', menuLetter: 'M' },
  { type: 'Reviews', label: 'Avis', menuLetter: 'V' },
  { type: 'Lead', label: 'Leads', menuLetter: 'L' },
  { type: 'Reservation', label: 'Réservations', menuLetter: 'R' },
  { type: 'ArrivalDeparture', label: 'Arr. / dép.', menuLetter: 'D' },
  { type: 'Task', label: 'Supervision tâches', menuLetter: 'T' },
] as const;

const RESERVATION_PUSH_KEYS = [
  'reservation_new',
  'airbnb_new_request',
  'reservation_cancelled',
  'reservation_modified',
] as const;

const INBOX_OTA_PUSH_KEYS = [
  'message_received',
  'review_new',
  'lead_new',
  'message_automated_sent',
] as const;

/** Catégories push — tout activé par défaut ; le PM affine dans /tasks/team. */
export const WIZARD_WA_NOTIF_CATEGORIES: {
  key: WizardWaNotifCategory;
  label: string;
  icon: string;
  hint: string;
}[] = [
  {
    key: 'reservation',
    label: 'Réservation',
    icon: '📅',
    hint: 'Nouvelle résa, Airbnb pending, annulation, modification',
  },
  {
    key: 'inboxOta',
    label: 'Inbox OTA',
    icon: '💬',
    hint: 'Messages, avis, leads (lié aux menus M · V · L)',
  },
  {
    key: 'divers',
    label: 'Divers',
    icon: '🔔',
    hint: 'Enregistrement démarré, etc.',
  },
  {
    key: 'tasksCreated',
    label: 'Tâches · création',
    icon: '➕',
    hint: 'Toutes les notifs push à la création d’une tâche',
  },
  {
    key: 'tasksCancelled',
    label: 'Tâches · annulation',
    icon: '✖',
    hint: 'Toutes les notifs push à l’annulation d’une tâche',
  },
];

export function defaultWaNotifCategories(): Record<WizardWaNotifCategory, boolean> {
  return {
    reservation: true,
    inboxOta: true,
    divers: true,
    tasksCreated: true,
    tasksCancelled: true,
  };
}

export function defaultWaNotifCategoriesOff(): Record<WizardWaNotifCategory, boolean> {
  return {
    reservation: false,
    inboxOta: false,
    divers: false,
    tasksCreated: false,
    tasksCancelled: false,
  };
}

export function syncWaNotifCategoriesFromPush(
  push: Record<string, boolean>,
): Record<WizardWaNotifCategory, boolean> {
  const resGroup = WA_ADMIN_NOTIFICATION_GROUPS.find((g) => g.title === 'Réservation');
  const inboxGroup = WA_ADMIN_NOTIFICATION_GROUPS.find((g) => g.title === 'Inbox OTA');
  const resKeys = resGroup?.items.map((i) => i.key) ?? [];
  const inboxKeys = inboxGroup?.items.map((i) => i.key) ?? [];
  const allOn = (keys: string[]) => keys.length > 0 && keys.every((k) => push[k] !== false);
  const anyTaskCreated = Object.keys(push).some(
    (k) => k.startsWith('task_notify_') && push[k] !== false,
  );
  const anyTaskCancelled = Object.keys(push).some(
    (k) => k.startsWith('task_cancel_notify_') && push[k] !== false,
  );
  return {
    reservation: allOn(resKeys),
    inboxOta: allOn(inboxKeys),
    divers: push.registration_started !== false,
    tasksCreated: anyTaskCreated,
    tasksCancelled: anyTaskCancelled,
  };
}

export const DEFAULT_WA_MENU_PERMISSIONS: Record<string, 'read' | 'write' | 'none'> = {
  Message: 'write',
  Reviews: 'write',
  Lead: 'write',
  Reservation: 'write',
  ArrivalDeparture: 'write',
  Task: 'write',
};

/** Onboarding — rien de coché par défaut. */
export const ONBOARDING_WA_MENU_PERMISSIONS: Record<string, 'read' | 'write' | 'none'> = {
  Message: 'none',
  Reviews: 'none',
  Lead: 'none',
  Reservation: 'none',
  ArrivalDeparture: 'none',
  Task: 'none',
};

export function defaultWizardWaPushNotifications(): Record<string, boolean> {
  return defaultAdminNotifications();
}

export function defaultWizardWaPushNotificationsOff(): Record<string, boolean> {
  const keys = Object.keys(defaultAdminNotifications());
  return Object.fromEntries(keys.map((k) => [k, false]));
}

export function waPermLabel(access: 'read' | 'write' | 'none'): string {
  if (access === 'write') return 'W';
  if (access === 'read') return 'R';
  return 'N';
}

/** Onboarding — clic = activer (write) ou désactiver (none), pas de cycle N→R→W. */
export function toggleWaMenuOnOff(
  menuPermissions: Record<string, 'read' | 'write' | 'none'>,
  pushNotifications: Record<string, boolean>,
  menuType: string,
): {
  menuPermissions: Record<string, 'read' | 'write' | 'none'>;
  pushNotifications: Record<string, boolean>;
  notifCategories: Record<WizardWaNotifCategory, boolean>;
} {
  const current = menuPermissions[menuType] ?? 'none';
  const nextAccess: 'read' | 'write' | 'none' = current === 'none' ? 'write' : 'none';
  const nextMenus = { ...menuPermissions, [menuType]: nextAccess };
  const nextPush = { ...pushNotifications };

  if (menuType === 'Message' && nextAccess !== 'none') {
    for (const key of RESERVATION_PUSH_KEYS) nextPush[key] = true;
    nextPush.message_received = true;
  }
  if (menuType === 'Reviews' && nextAccess !== 'none') {
    nextPush.review_new = true;
  }
  if (menuType === 'Lead' && nextAccess !== 'none') {
    nextPush.lead_new = true;
  }

  return {
    menuPermissions: nextMenus,
    pushNotifications: nextPush,
    notifCategories: syncWaNotifCategoriesFromPush(nextPush),
  };
}

/** Cycle N→R→W — détail dans /tasks/team */
export function cycleWaMenuPermission(
  menuPermissions: Record<string, 'read' | 'write' | 'none'>,
  pushNotifications: Record<string, boolean>,
  menuType: string,
): {
  menuPermissions: Record<string, 'read' | 'write' | 'none'>;
  pushNotifications: Record<string, boolean>;
  notifCategories: Record<WizardWaNotifCategory, boolean>;
} {
  const current = menuPermissions[menuType] ?? 'none';
  const nextAccess = cyclePermissionAccess(current);
  const nextMenus = { ...menuPermissions, [menuType]: nextAccess };
  const nextPush = { ...pushNotifications };

  if (menuType === 'Message' && nextAccess !== 'none') {
    for (const key of RESERVATION_PUSH_KEYS) nextPush[key] = true;
  }
  if (menuType === 'Reviews' && nextAccess !== 'none') {
    nextPush.review_new = true;
  }
  if (menuType === 'Lead' && nextAccess !== 'none') {
    nextPush.lead_new = true;
  }
  if (menuType === 'Message' && nextAccess !== 'none') {
    nextPush.message_received = true;
  }

  return {
    menuPermissions: nextMenus,
    pushNotifications: nextPush,
    notifCategories: syncWaNotifCategoriesFromPush(nextPush),
  };
}

export function toggleWaPushNotification(
  pushNotifications: Record<string, boolean>,
  key: string,
): {
  pushNotifications: Record<string, boolean>;
  notifCategories: Record<WizardWaNotifCategory, boolean>;
} {
  const nextPush = {
    ...pushNotifications,
    [key]: pushNotifications[key] !== true,
  };
  return {
    pushNotifications: nextPush,
    notifCategories: syncWaNotifCategoriesFromPush(nextPush),
  };
}

export const WA_PUSH_GROUPS_FOR_EXPAND = WA_ADMIN_NOTIFICATION_GROUPS;

export { RESERVATION_PUSH_KEYS, INBOX_OTA_PUSH_KEYS };
