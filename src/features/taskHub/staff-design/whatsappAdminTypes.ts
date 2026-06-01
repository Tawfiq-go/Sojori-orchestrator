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
  ownerId?: string;
};

export const WA_ADMIN_TYPES = [
  { type: 'Reservation', label: 'Réservation', abbr: 'RS' },
  { type: 'Task', label: 'Tâche', abbr: 'TS' },
  { type: 'Message', label: 'Message', abbr: 'MS' },
  { type: 'Reviews', label: 'Avis', abbr: 'AV' },
  { type: 'ArrivalDeparture', label: 'Arrivée/Départ', abbr: 'DC' },
] as const;

export const WA_LANGUAGES = ['French', 'English', 'Francais', 'Arabic'] as const;

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
  Avis: 'Reviews',
  Reviews: 'Reviews',
  'Arrivée/Départ': 'ArrivalDeparture',
  ArrivalDeparture: 'ArrivalDeparture',
};

export function emptyWhatsappAdmin(): WhatsappAdminDesign {
  return {
    _id: '',
    username: '',
    whatsappPhone: '',
    language: 'French',
    listingIds: [],
    banned: false,
    permissions: WA_ADMIN_TYPES.map((t) => ({ type: t.type, access: 'write' as const })),
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
    ownerId: row.ownerId ? String(row.ownerId) : undefined,
  };
}

export function designWhatsappAdminToApi(
  form: WhatsappAdminDesign,
  ownerId?: string,
): Record<string, unknown> {
  return {
    username: form.username.trim(),
    whatsappPhone: form.whatsappPhone.trim(),
    language: form.language,
    listingIds: normalizeListingIds(form.listingIds),
    banned: form.banned,
    ownerId: ownerId || form.ownerId || null,
    permissions: form.permissions.map((p) => ({
      type: p.type,
      access: p.access,
      read: p.access === 'read' || p.access === 'write',
      write: p.access === 'write',
    })),
    notifications: {},
  };
}

export function cyclePermissionAccess(current: 'read' | 'write' | 'none'): 'read' | 'write' | 'none' {
  if (current === 'none') return 'read';
  if (current === 'read') return 'write';
  return 'none';
}
