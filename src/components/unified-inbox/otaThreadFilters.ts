import type { OtaThreadRow } from './inboxOtaMappers';
import { isOtaDirectChannel, resolveOtaPlatformChannel } from './inboxOtaMappers';

/** Filtre canal (ligne 2) */
export type OtaChannelFilter = 'all' | 'ota' | 'ab' | 'bk' | 'direct';

/** @deprecated — utiliser OtaChannelFilter + unrepliedOnly */
export type OtaQuickFilter = OtaChannelFilter | 'unreplied';

export type OtaMessageLifecycleStatus = 'created' | 'received' | 'responded' | 'ignored';

export type OtaStayPeriod = 'all' | 'past' | 'future' | 'current';

export interface OtaAdvancedSearch {
  reservationNumber?: string;
  listingName?: string;
  guestName?: string;
  guestPhone?: string;
  messageText?: string;
  arrivalFrom?: string;
  arrivalTo?: string;
  stayPeriod?: OtaStayPeriod;
  messageStatus?: OtaMessageLifecycleStatus | '';
}

export interface OtaFilterCounts {
  all: number;
  ota: number;
  ab: number;
  bk: number;
  direct: number;
  unreplied: number;
}

const LEGACY_STATUS: Record<string, OtaMessageLifecycleStatus> = {
  pending: 'received',
  replied: 'responded',
};

export function normalizeOtaMessageStatus(raw?: string | null): OtaMessageLifecycleStatus | string {
  if (!raw) return 'created';
  const key = String(raw).toLowerCase().trim();
  if (key in LEGACY_STATUS) return LEGACY_STATUS[key];
  if (key === 'created' || key === 'received' || key === 'responded' || key === 'ignored') {
    return key;
  }
  return key;
}

export function hasActiveOtaAdvancedSearch(advanced: OtaAdvancedSearch): boolean {
  return !!(
    advanced.reservationNumber?.trim() ||
    advanced.listingName?.trim() ||
    advanced.guestName?.trim() ||
    advanced.guestPhone?.trim() ||
    advanced.messageText?.trim() ||
    advanced.arrivalFrom ||
    advanced.arrivalTo ||
    (advanced.stayPeriod && advanced.stayPeriod !== 'all') ||
    advanced.messageStatus
  );
}

/** Paramètres API GET /rentals/get-thread (recherche BD complète). */
export function buildOtaAdvancedApiParams(
  advanced: OtaAdvancedSearch,
  opts?: { channelFilter?: OtaChannelFilter; unrepliedOnly?: boolean },
): Record<string, string | boolean | undefined> {
  const channel = opts?.channelFilter ?? 'all';
  const unreplied = opts?.unrepliedOnly ?? false;

  if (!hasActiveOtaAdvancedSearch(advanced) && !unreplied) {
    return {};
  }

  return {
    otaSearch: true,
    reservationNumber: advanced.reservationNumber?.trim() || undefined,
    guestName: advanced.guestName?.trim() || undefined,
    guestPhone: advanced.guestPhone?.trim() || undefined,
    listingName: advanced.listingName?.trim() || undefined,
    messageText: advanced.messageText?.trim() || undefined,
    arrivalFrom: advanced.arrivalFrom || undefined,
    arrivalTo: advanced.arrivalTo || undefined,
    stayPeriod:
      advanced.stayPeriod && advanced.stayPeriod !== 'all' ? advanced.stayPeriod : undefined,
    messageStatus: advanced.messageStatus || undefined,
    unreplied: unreplied || undefined,
    otaChannel: channel === 'ab' ? 'ab' : channel === 'bk' ? 'bk' : undefined,
  };
}

/** Date d'activité du fil : dernier message, sinon MAJ thread, sinon création. */
export function threadActivityTimestamp(row: OtaThreadRow): number {
  const candidates = [row.lastMessageTime, row.threadUpdatedAt, row.threadCreatedAt];
  for (const c of candidates) {
    if (!c) continue;
    const t = new Date(c).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

export function sortOtaThreadsByActivity(rows: OtaThreadRow[]): OtaThreadRow[] {
  return [...rows].sort((a, b) => threadActivityTimestamp(b) - threadActivityTimestamp(a));
}

/** Non répondu : messageStatus received (ou legacy pending), ou dernier message entrant. */
export function isOtaUnreplied(row: OtaThreadRow): boolean {
  const status = normalizeOtaMessageStatus(row.messageStatus);
  if (status === 'received') return true;
  if (status === 'responded' || status === 'ignored') return false;
  if (row.lastMessageIsIncoming === true) return true;
  return false;
}

export function applyOtaChannelFilter(
  rows: OtaThreadRow[],
  filter: OtaChannelFilter,
): OtaThreadRow[] {
  if (filter === 'all') return rows;
  if (filter === 'ota') {
    return rows.filter((row) => resolveOtaPlatformChannel(row) != null);
  }
  if (filter === 'direct') {
    return rows.filter(isOtaDirectChannel);
  }
  return rows.filter((row) => {
    const platform = resolveOtaPlatformChannel(row);
    if (filter === 'ab') return platform === 'ab';
    if (filter === 'bk') return platform === 'bk';
    return true;
  });
}

export function applyOtaInboxFilters(
  rows: OtaThreadRow[],
  channelFilter: OtaChannelFilter,
  unrepliedOnly: boolean,
): OtaThreadRow[] {
  let list = applyOtaChannelFilter(rows, channelFilter);
  if (unrepliedOnly) {
    list = list.filter(isOtaUnreplied);
  }
  return list;
}

export function countOtaFilters(rows: OtaThreadRow[]): OtaFilterCounts {
  return {
    all: rows.length,
    ota: rows.filter((r) => resolveOtaPlatformChannel(r) != null).length,
    ab: rows.filter((r) => resolveOtaPlatformChannel(r) === 'ab').length,
    bk: rows.filter((r) => resolveOtaPlatformChannel(r) === 'bk').length,
    direct: rows.filter(isOtaDirectChannel).length,
    unreplied: rows.filter(isOtaUnreplied).length,
  };
}

/** @deprecated */
export function applyOtaQuickFilter(rows: OtaThreadRow[], filter: OtaQuickFilter): OtaThreadRow[] {
  if (filter === 'unreplied') return rows.filter(isOtaUnreplied);
  return applyOtaChannelFilter(rows, filter);
}

/** @deprecated */
export function countOtaQuickFilter(rows: OtaThreadRow[]): Record<OtaQuickFilter, number> {
  const c = countOtaFilters(rows);
  return { all: c.all, ota: c.ota, ab: c.ab, bk: c.bk, direct: c.direct, unreplied: c.unreplied };
}
