/**
 * Enrichissement planning : WA + OTA par réservation (messages GLOBAUX).
 * Les tâches restent attachées par jour via timeline.scheduledFor.
 *
 * Sources (mêmes que l’inbox qui marche) :
 * - cache OTA inbox si présent
 * - get-thread (OTA)
 * - inbox-resas (lien id / phone)
 * - debug/conversations guest (WA)
 *
 * Preview aligné inbox WA/OTA : Q/R réel + ligne A (plan) + heure Auj/Hier/Dem.
 */
import messagesService from './messagesService';
import { fetchInboxResas } from './inboxResasService';
import { mapApiItemToOtaThread, type OtaThreadRow } from '../components/unified-inbox/inboxOtaMappers';
import {
  resolveOtaListLastMessage,
  resolveOtaProgrammedAutoLine,
} from '../components/unified-inbox/otaExchangePresence';
import { formatThreadWhenExact } from '../components/unified-inbox/inboxFormat';
import { inboxMessagePreview } from '../components/unified-inbox/formatInboxMessageText';
import {
  buildWaListPreview,
  humanizeOwnerPreview,
  isEmptyThreadPreview,
  ownerLabelForPlanCatalog,
  type WaLastMessageKind,
} from '../components/unified-inbox/waThreadPreview';
import { isWaUnreplied } from '../components/unified-inbox/waThreadFilters';
import { getCachedOtaInbox } from '../utils/otaInboxCache';
import type { Conversation } from '../types/messages.types';

export type PlanningProgrammedAuto = {
  catalogKey: string;
  label: string;
  time: string;
  sentAt?: string;
};

export interface PlanningLastMessage {
  text: string;
  at?: string;
  /** Heure formatée liste (Auj 14:32 / Hier …). */
  time?: string;
  lastMessageKind?: WaLastMessageKind;
  programmedAuto?: PlanningProgrammedAuto;
  channel: 'ota' | 'wa';
  threadId?: string | number;
  phone?: string;
  count: number;
  unread: number;
  needsReply: boolean;
  exists: boolean;
}

export interface PlanningCommsMeta {
  lastOta?: PlanningLastMessage;
  lastWa?: PlanningLastMessage;
}

function clip(text: string, max = 160): string {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function normKey(raw?: string | null): string {
  const s = String(raw || '').trim();
  if (!s || s === 'N/A' || s === '[object Object]') return '';
  return s.toUpperCase().replace(/[\s\-_/]/g, '');
}

function phoneKey(raw?: string | null): string {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length < 9) return '';
  return d.slice(-9);
}

function keyVariants(raw?: string | null): string[] {
  const s = String(raw || '').trim();
  if (!s || s === 'N/A') return [];
  const out = new Set<string>();
  out.add(s);
  out.add(s.toUpperCase());
  const n = normKey(s);
  if (n) out.add(n);
  return [...out];
}

function isPlaceholderCommsText(text?: string | null): boolean {
  const t = String(text || '')
    .trim()
    .toLowerCase();
  if (!t) return true;
  return (
    t === 'fil ota' ||
    t === 'whatsapp lié' ||
    t === 'whatsapp' ||
    t === 'conversation whatsapp' ||
    t === 'message récent' ||
    t === 'aucun message' ||
    t.startsWith('aucun message')
  );
}

function extractOtaItems(payload: unknown): unknown[] {
  if (!payload || typeof payload !== 'object') return [];
  const r = payload as Record<string, unknown>;
  if (Array.isArray(r.threads)) return r.threads;
  const data = r.data as Record<string, unknown> | unknown[] | undefined;
  if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.threads)) {
    return data.threads as unknown[];
  }
  if (Array.isArray(data)) return data;
  return [];
}

function extractConversations(payload: unknown): Conversation[] {
  if (!payload || typeof payload !== 'object') return [];
  const r = payload as Record<string, unknown>;
  if (r.status === 'success' && r.data && typeof r.data === 'object') {
    const d = r.data as { conversations?: Conversation[] };
    if (Array.isArray(d.conversations)) return d.conversations;
  }
  if (Array.isArray((r as { conversations?: Conversation[] }).conversations)) {
    return (r as { conversations: Conversation[] }).conversations;
  }
  const data = r.data as { conversations?: Conversation[] } | Conversation[] | undefined;
  if (Array.isArray(data)) return data as Conversation[];
  if (data && Array.isArray(data.conversations)) return data.conversations;
  return [];
}

function otaNeedsReply(row: {
  messageStatus?: string;
  lastMessageIsIncoming?: boolean;
  unreadCount?: number;
}): boolean {
  const s = (row.messageStatus || '').toLowerCase();
  if (s === 'received' || s === 'pending') return true;
  if (s === 'responded' || s === 'ignored' || s === 'replied') return false;
  if (row.lastMessageIsIncoming === true) return true;
  return (row.unreadCount || 0) > 0;
}

function resolveOtaLastMessageKind(effective: {
  text: string;
  isIncoming: boolean | undefined;
  empty: boolean;
}): WaLastMessageKind | undefined {
  if (effective.empty || !effective.text.trim()) return undefined;
  if (effective.isIncoming === false) return 'R';
  return 'Q';
}

/** Aligné mapOtaRowToThread — Q/R réel + A si dernier. */
function fromOtaRow(row: OtaThreadRow): PlanningLastMessage {
  const effective = resolveOtaListLastMessage(row);
  const rawPreview = inboxMessagePreview(effective.text) || '';
  const preview = humanizeOwnerPreview(rawPreview) || rawPreview;
  const empty = effective.empty || isEmptyThreadPreview(preview) || !rawPreview;
  const lastMessageKind = empty ? undefined : resolveOtaLastMessageKind(effective);
  const autoLine = resolveOtaProgrammedAutoLine(row);
  const programmedAuto = autoLine
    ? {
        catalogKey: autoLine.catalogKey,
        label: ownerLabelForPlanCatalog(autoLine.catalogKey),
        time: formatThreadWhenExact(autoLine.sentAt),
        sentAt: autoLine.sentAt,
      }
    : undefined;
  const at = empty ? row.lastMessageTime : effective.at || row.lastMessageTime;
  const text = empty
    ? programmedAuto
      ? programmedAuto.label
      : row.unreadCount > 0
        ? 'Message non lu'
        : 'Aucun message'
    : clip(preview);

  return {
    text,
    at,
    time: empty ? programmedAuto?.time || '' : formatThreadWhenExact(at),
    lastMessageKind: empty ? undefined : lastMessageKind,
    programmedAuto,
    channel: 'ota',
    threadId: row.threadId,
    phone: row.guestPhone || undefined,
    count: Math.max(row.messageMatchCount || 0, row.unreadCount || 0, empty && !programmedAuto ? 0 : 1),
    unread: row.unreadCount || 0,
    needsReply: otaNeedsReply(row),
    exists: true,
  };
}

function fromWaConversation(conv: Conversation): PlanningLastMessage {
  const waPreview = buildWaListPreview(conv);
  const count = conv.messages_count || 0;
  const unread = conv.unread_count || 0;
  const programmedAuto = waPreview.programmedAuto
    ? {
        catalogKey: waPreview.programmedAuto.catalogKey,
        label: waPreview.programmedAuto.label,
        time: formatThreadWhenExact(waPreview.programmedAuto.sentAt || waPreview.lastMessageAt),
        sentAt: waPreview.programmedAuto.sentAt,
      }
    : undefined;
  const empty = !waPreview.lastMessageKind && !programmedAuto;
  const preview =
    clip(waPreview.preview) ||
    (programmedAuto ? programmedAuto.label : unread > 0 ? 'Message non lu' : 'Aucun message');
  return {
    text: preview,
    at: waPreview.lastMessageAt || conv.last_message_time,
    time: empty
      ? programmedAuto?.time || ''
      : formatThreadWhenExact(waPreview.lastMessageAt || conv.last_message_time),
    lastMessageKind: waPreview.lastMessageKind,
    programmedAuto,
    channel: 'wa',
    phone: conv.phone,
    count: Math.max(
      count,
      unread,
      waPreview.lastMessageKind || programmedAuto ? 1 : 0,
    ),
    unread,
    needsReply: isWaUnreplied(conv),
    exists:
      count > 0 ||
      unread > 0 ||
      Boolean(waPreview.lastMessageKind) ||
      Boolean(programmedAuto) ||
      Boolean(conv.phone),
  };
}

function messageAtMs(m?: PlanningLastMessage): number {
  if (!m?.at) return 0;
  const t = new Date(m.at).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function mergeLastMessage(
  prev: PlanningLastMessage | undefined,
  incoming: PlanningLastMessage,
): PlanningLastMessage {
  if (!prev) return incoming;
  const prevWeak =
    isPlaceholderCommsText(prev.text) && !prev.lastMessageKind && !prev.programmedAuto;
  // Placeholder (« Fil OTA », « Message non lu »…) MÊME daté : jamais prioritaire
  // sur un vrai texte. Le stub inbox-resas porte thread.lastMessageAt (souvent
  // plus récent que le createdAt du vrai message) et écrasait le vrai preview
  // → « Aucun message » avec unread=1 (bug SJ-FKR7WV4W, 24/07).
  const incomingWeak =
    isPlaceholderCommsText(incoming.text) &&
    !incoming.lastMessageKind &&
    !incoming.programmedAuto;
  if (incomingWeak && !prevWeak) {
    return {
      ...prev,
      threadId: incoming.threadId ?? prev.threadId,
      phone: incoming.phone || prev.phone,
      unread: Math.max(prev.unread || 0, incoming.unread || 0),
      needsReply: prev.needsReply || incoming.needsReply,
      exists: true,
    };
  }
  // Prev placeholder + incoming réel → le vrai texte gagne, même plus ancien.
  if (prevWeak && !incomingWeak) {
    return {
      ...incoming,
      threadId: incoming.threadId ?? prev.threadId,
      phone: incoming.phone || prev.phone,
      unread: Math.max(prev.unread || 0, incoming.unread || 0),
      needsReply: prev.needsReply || incoming.needsReply,
      exists: true,
    };
  }

  const prevT = messageAtMs(prev);
  const incT = messageAtMs(incoming);
  // Incoming plus ancien → garder le plus récent (évite Q « 28 mai » qui revient)
  // — comparaison valable seulement entre deux VRAIS previews (cf. gardes ci-dessus).
  if (prevT > 0 && incT > 0 && incT < prevT) {
    return {
      ...prev,
      threadId: incoming.threadId ?? prev.threadId,
      phone: incoming.phone || prev.phone,
      unread: Math.max(prev.unread || 0, incoming.unread || 0),
    };
  }

  // Incoming plus récent (même sans Q/R : que des relances) → remplacer l’ancien Q/R périmé
  return {
    ...prev,
    ...incoming,
    phone: incoming.phone || prev.phone,
    threadId: incoming.threadId ?? prev.threadId,
    unread: Math.max(prev.unread || 0, incoming.unread || 0),
    // Ne pas ressusciter un vieux Q/R via ??
    lastMessageKind: incoming.lastMessageKind,
    programmedAuto: incoming.programmedAuto,
    text: incoming.text || prev.text,
    time: incoming.time || prev.time,
    at: incoming.at || prev.at,
  };
}

export async function fetchPlanningCommsIndex(opts?: {
  ownerId?: string;
}): Promise<Map<string, PlanningCommsMeta>> {
  const map = new Map<string, PlanningCommsMeta>();
  const ownerId = opts?.ownerId;

  const upsert = (keys: string[], patch: Partial<PlanningCommsMeta>) => {
    for (const k of keys) {
      if (!k) continue;
      const prev = map.get(k) || {};
      const next: PlanningCommsMeta = { ...prev };
      if (patch.lastOta) {
        next.lastOta = mergeLastMessage(prev.lastOta, patch.lastOta);
      }
      if (patch.lastWa) {
        next.lastWa = mergeLastMessage(prev.lastWa, patch.lastWa);
      }
      map.set(k, next);
    }
  };

  // 0) Cache OTA déjà chargé par l’inbox (même session)
  try {
    const cached = getCachedOtaInbox();
    if (cached?.length) {
      for (const row of cached) {
        upsert(
          [
            ...keyVariants(row.reservationNumber),
            ...keyVariants(phoneKey(row.guestPhone)),
            ...keyVariants(normKey(row.guestName)),
          ],
          { lastOta: fromOtaRow(row) },
        );
      }
    }
  } catch {
    /* ignore */
  }

  // WA : même source que l’onglet WhatsApp (smart, SANS hasReservation) —
  // sinon les fils visibles inbox sont absents du planning Résas.
  const [inboxRes, otaRes, waSmart, waRecent] = await Promise.all([
    fetchInboxResas(ownerId).catch(() => []),
    messagesService
      .getOTAThreads({ page: 0, limit: 200, ownerId, sortBy: 'lastMessageAt' })
      .catch(() => null),
    messagesService
      .getConversations({
        filter: 'smart',
        limit: 200,
        owner_id: ownerId,
        silent: true,
      })
      .catch(() => null),
    messagesService
      .getConversations({
        filter: 'recent',
        limit: 200,
        owner_id: ownerId,
        silent: true,
      })
      .catch(() => null),
  ]);

  // 1) inbox-resas (lien seulement — ne pas écraser un vrai preview)
  for (const row of inboxRes) {
    const keys = [
      ...keyVariants(row.id),
      ...keyVariants(row.reservationNumber),
      ...keyVariants(phoneKey(row.phone)),
    ];
    if (row.ota?.exists) {
      upsert(keys, {
        lastOta: {
          text: 'Fil OTA',
          at: row.ota.lastMessageAt,
          time: formatThreadWhenExact(row.ota.lastMessageAt),
          channel: 'ota',
          threadId: row.ota.threadId,
          count: Math.max(row.ota.unread || 0, 1),
          unread: row.ota.unread || 0,
          needsReply: (row.ota.unread || 0) > 0,
          exists: true,
        },
      });
    }
    if (row.phone) {
      upsert(keys, {
        lastWa: {
          text: 'WhatsApp lié',
          channel: 'wa',
          phone: row.phone,
          count: 0,
          unread: 0,
          needsReply: false,
          exists: true,
        },
      });
    }
  }

  // 2) OTA live
  const otaByPhone = new Map<string, OtaThreadRow>();
  const otaByThread = new Map<string, OtaThreadRow>();
  for (const item of extractOtaItems(otaRes)) {
    const row = mapApiItemToOtaThread(item);
    const mongoId = String((item as { reservation?: { _id?: string } })?.reservation?._id || '');
    const pk = phoneKey(row.guestPhone);
    if (pk) otaByPhone.set(pk, row);
    otaByThread.set(String(row.threadId), row);
    upsert(
      [
        ...keyVariants(row.reservationNumber),
        ...keyVariants(mongoId),
        ...keyVariants(pk),
        ...keyVariants(normKey(row.guestName)),
      ],
      { lastOta: fromOtaRow(row) },
    );
  }

  // Cache OTA aussi indexé pour re-lien téléphone
  try {
    for (const row of getCachedOtaInbox() || []) {
      const pk = phoneKey(row.guestPhone);
      if (pk && !otaByPhone.has(pk)) otaByPhone.set(pk, row);
      if (!otaByThread.has(String(row.threadId))) otaByThread.set(String(row.threadId), row);
    }
  } catch {
    /* ignore */
  }

  // Relier OTA via inbox-resas (threadId / téléphone) → clés résa planning
  for (const row of inboxRes) {
    const keys = [
      ...keyVariants(row.id),
      ...keyVariants(row.reservationNumber),
      ...keyVariants(phoneKey(row.phone)),
    ];
    const byThread =
      row.ota?.threadId != null ? otaByThread.get(String(row.ota.threadId)) : undefined;
    const byPhone = phoneKey(row.phone) ? otaByPhone.get(phoneKey(row.phone)) : undefined;
    const hit = byThread || byPhone;
    if (hit) upsert(keys, { lastOta: fromOtaRow(hit) });
  }

  // 3) WA (smart + recent) — index par résa + téléphone (lien inbox-resas)
  const waConvs = [...extractConversations(waSmart), ...extractConversations(waRecent)];
  const seenPhone = new Set<string>();
  const waByPhone = new Map<string, Conversation>();
  for (const conv of waConvs) {
    const pk = phoneKey(conv.phone);
    const dedupe = pk || conv.reservation_number || conv.reservation_mongo_id || '';
    if (dedupe && seenPhone.has(dedupe)) continue;
    if (dedupe) seenPhone.add(dedupe);
    if (pk) waByPhone.set(pk, conv);

    upsert(
      [
        ...keyVariants(conv.reservation_number),
        ...keyVariants(conv.reservation_mongo_id),
        ...keyVariants(conv.reservation_id),
        ...keyVariants(pk),
        ...keyVariants(normKey(conv.name)),
      ],
      { lastWa: fromWaConversation(conv) },
    );
  }

  // Relier WA via téléphone inbox-resas quand la conv n’a pas de reservation_number
  for (const row of inboxRes) {
    const pk = phoneKey(row.phone);
    if (!pk) continue;
    const conv = waByPhone.get(pk);
    if (!conv) continue;
    upsert(
      [...keyVariants(row.id), ...keyVariants(row.reservationNumber), ...keyVariants(pk)],
      { lastWa: fromWaConversation(conv) },
    );
  }

  console.info('[planningComms] index', {
    keys: map.size,
    inbox: inboxRes.length,
    otaApi: extractOtaItems(otaRes).length,
    wa: seenPhone.size,
    cachedOta: getCachedOtaInbox()?.length || 0,
    ownerId: ownerId || null,
  });

  return map;
}

export function lookupPlanningComms(
  index: Map<string, PlanningCommsMeta>,
  reservationId?: string,
  reservationNumber?: string,
  extra?: { phone?: string; guestName?: string },
): PlanningCommsMeta {
  const keys = [
    ...keyVariants(reservationNumber),
    ...keyVariants(reservationId),
    ...keyVariants(phoneKey(extra?.phone)),
    ...keyVariants(normKey(extra?.guestName)),
  ];
  const merged: PlanningCommsMeta = {};
  for (const k of keys) {
    const hit = index.get(k);
    if (!hit) continue;
    if (hit.lastOta && !merged.lastOta) merged.lastOta = hit.lastOta;
    if (hit.lastWa && !merged.lastWa) merged.lastWa = hit.lastWa;
    if (merged.lastOta && merged.lastWa) break;
  }
  return merged;
}
