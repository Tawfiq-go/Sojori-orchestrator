import apiClient from '../../services/apiClient';
import { FULLTASK_ADMIN_BASE } from '../../config/microserviceBases';
import { isAxiosError } from 'axios';

/**
 * Suivi mini-bar — lecture journal/stock + contrôle extra/paiement depuis le PM.
 * Les lignes de conso restent écrites par le flow WhatsApp du contrôleur.
 */
const BASE = `${FULLTASK_ADMIN_BASE}/minibar`;

type ApiList<T> = { success?: boolean; data?: T; error?: string; message?: string };

function throwApiError(e: unknown, fallback: string): never {
  if (isAxiosError(e)) {
    const body = e.response?.data as ApiList<unknown> | undefined;
    const msg = body?.error || body?.message;
    if (msg) throw new Error(String(msg));
    if (e.response?.status === 404) {
      throw new Error(
        'Route mini-bar absente sur l’API (srv-admin / srv-fulltask pas à jour). En local : VITE_FULLTASK_URL=http://127.0.0.1:4015 + srv-fulltask, ou déployer admin+fulltask.',
      );
    }
  }
  throw e instanceof Error ? e : new Error(fallback);
}

async function getList<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  try {
    const { data } = await apiClient.get<ApiList<T>>(`${BASE}${path}`, { params });
    if (data?.success === false) throw new Error(data.error || data.message || 'Request failed');
    return (data?.data ?? []) as T;
  } catch (e) {
    throwApiError(e, 'Chargement mini-bar impossible');
  }
}

export type MinibarRoomOverview = {
  roomId: string;
  roomName?: string;
  listingId?: string;
  stockItems: number;
  products: number;
  lastMoveAt?: string;
  openExtra?: {
    reservationId: string;
    reservationCode?: string;
    guestName?: string;
    totalToBill: number;
    currency: string;
    linesCount: number;
    openedAt: string;
  };
  lastEntryAt?: string;
  lastEntryBy?: string;
  lastEntryType?: string;
};

export type MinibarStockLine = {
  roomId: string;
  roomName?: string;
  productId: string;
  productName: string;
  qty: number;
  lastMoveAt: string;
  lastMoveType?: string;
  lastMoveBy?: string;
};

export type MinibarExtraLine = {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  amount: number;
  declaredAt: string;
  declaredBy?: string;
};

export type MinibarExtraStatus = 'open' | 'completed';
export type MinibarPaymentStatus = 'paid' | 'not_paid';
export type MinibarPaymentType = 'reception' | 'especes' | 'cb' | 'virement' | 'autre';

export type MinibarStayExtra = {
  _id: string;
  reservationId: string;
  reservationCode?: string;
  listingId: string;
  roomId: string;
  roomName?: string;
  guestName?: string;
  extraStatus: MinibarExtraStatus;
  paymentStatus: MinibarPaymentStatus;
  paymentType?: MinibarPaymentType;
  closedReason?: string;
  invoiceSeq?: number;
  currency: string;
  itemsCount: number;
  linesCount: number;
  totalToBill: number;
  paidAmount: number;
  remaining: number;
  htAmount: number;
  vatAmount: number;
  taxRatePct: number;
  staff: string[];
  lines: MinibarExtraLine[];
  openedAt: string;
  closedAt?: string;
  invoiceValidatedAt?: string;
  invoiceValidatedBy?: string;
  receptionNotifiedAt?: string;
  /** @deprecated raw Mongo status — prefer extraStatus */
  status?: 'open' | 'completed' | 'paid' | 'closed';
};

function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function splitTtc(ttc: number, taxRatePct = 10): { ht: number; vat: number } {
  const total = Math.max(0, Number(ttc) || 0);
  const ht = roundMoney(total / (1 + taxRatePct / 100));
  return { ht, vat: roundMoney(total - ht) };
}

export function normalizeStayExtra(raw: Partial<MinibarStayExtra> & {
  status?: string;
  lines?: MinibarExtraLine[];
  declaredBy?: string;
}): MinibarStayExtra {
  const lines = Array.isArray(raw.lines) ? raw.lines : [];
  const totalToBill = Math.max(0, Number(raw.totalToBill) || 0);
  const paidAmount = Math.max(0, Number(raw.paidAmount) || 0);
  const remaining = Math.max(0, Math.floor(totalToBill) - Math.max(0, Math.floor(paidAmount)));
  const extraStatus: MinibarExtraStatus =
    raw.extraStatus === 'open' || raw.extraStatus === 'completed'
      ? raw.extraStatus
      : String(raw.status || 'open') === 'open'
        ? 'open'
        : 'completed';
  const paymentStatus: MinibarPaymentStatus =
    raw.paymentStatus === 'paid' || raw.paymentStatus === 'not_paid'
      ? raw.paymentStatus
      : remaining <= 0
        ? 'paid'
        : 'not_paid';
  const vat = splitTtc(totalToBill, Number(raw.taxRatePct) || 10);
  const staff = Array.isArray(raw.staff) && raw.staff.length
    ? raw.staff.map(String).filter(Boolean)
    : [...new Set(lines.map((l) => String(l.declaredBy || '').trim()).filter(Boolean))];
  return {
    _id: String(raw._id || ''),
    reservationId: String(raw.reservationId || ''),
    reservationCode: raw.reservationCode,
    listingId: String(raw.listingId || ''),
    roomId: String(raw.roomId || ''),
    roomName: raw.roomName,
    guestName: raw.guestName,
    extraStatus,
    paymentStatus,
    paymentType: paymentStatus === 'paid' ? raw.paymentType : undefined,
    closedReason: raw.closedReason,
    invoiceSeq: raw.invoiceSeq,
    currency: String(raw.currency || 'MAD'),
    itemsCount: Number(raw.itemsCount) || lines.reduce((n, l) => n + Math.max(0, Number(l.qty) || 0), 0),
    linesCount: Number(raw.linesCount) || lines.length,
    totalToBill,
    paidAmount,
    remaining,
    htAmount: raw.htAmount != null ? Number(raw.htAmount) : vat.ht,
    vatAmount: raw.vatAmount != null ? Number(raw.vatAmount) : vat.vat,
    taxRatePct: Number(raw.taxRatePct) || 10,
    staff,
    lines,
    openedAt: String(raw.openedAt || ''),
    closedAt: raw.closedAt,
    invoiceValidatedAt: raw.invoiceValidatedAt,
    invoiceValidatedBy: raw.invoiceValidatedBy,
    receptionNotifiedAt: raw.receptionNotifiedAt,
    status: extraStatus,
  };
}

export type MinibarEntryType = 'stock_in' | 'consumption' | 'restock' | 'correction';

export type MinibarJournalEntry = {
  _id: string;
  roomId: string;
  roomName?: string;
  reservationId?: string;
  guestName?: string;
  productId: string;
  productName: string;
  unitPrice: number;
  currency: string;
  qty: number;
  type: MinibarEntryType;
  billingStatus: 'pending' | 'validated' | 'posted' | 'cancelled';
  declaredByName?: string;
  declaredByPhone?: string;
  declaredAt: string;
  note?: string;
};

export type MinibarSession = {
  token: string;
  staffName?: string;
  phone?: string;
  roomId?: string;
  roomName?: string;
  openedAt: string;
  lastActionAt: string;
  gestures: number;
  emptyPayloads: number;
  saved: boolean;
  closedReason?: string;
};

export function fetchMinibarOverview(): Promise<MinibarRoomOverview[]> {
  return getList<MinibarRoomOverview[]>('/overview');
}

export function fetchMinibarStock(roomId?: string): Promise<MinibarStockLine[]> {
  return getList<MinibarStockLine[]>('/stock', roomId ? { roomId } : {});
}

export function fetchMinibarExtras(params: {
  status?: 'open' | 'completed' | 'closed' | 'all';
  payment?: 'paid' | 'not_paid' | 'all';
  limit?: number;
} | 'open' | 'closed' | 'all' = 'all'): Promise<MinibarStayExtra[]> {
  const q = typeof params === 'string' ? { status: params } : params;
  return getList<Array<Partial<MinibarStayExtra>>>('/extras', {
    status: q.status && q.status !== 'all' ? q.status : undefined,
    payment: q.payment && q.payment !== 'all' ? q.payment : undefined,
    limit: q.limit ?? 500,
  }).then((rows) => (Array.isArray(rows) ? rows.map((row) => normalizeStayExtra(row)) : []));
}

export async function patchMinibarExtra(
  extraId: string,
  body: {
    extraStatus?: MinibarExtraStatus;
    paymentStatus?: MinibarPaymentStatus;
    paymentType?: MinibarPaymentType;
    validatedBy?: string;
  },
): Promise<MinibarStayExtra> {
  try {
    const { data } = await apiClient.patch<ApiList<Partial<MinibarStayExtra>>>(
      `${BASE}/extras/${encodeURIComponent(extraId)}`,
      body,
    );
    if (data?.success === false) throw new Error(data.error || data.message || 'Request failed');
    if (!data?.data) throw new Error('Mise à jour extra impossible');
    return normalizeStayExtra(data.data);
  } catch (e) {
    throwApiError(e, 'Mise à jour extra impossible');
  }
}

export function fetchMinibarJournal(params: {
  roomId?: string;
  type?: MinibarEntryType | '';
  limit?: number;
} = {}): Promise<MinibarJournalEntry[]> {
  return getList<MinibarJournalEntry[]>('/journal', {
    roomId: params.roomId || undefined,
    type: params.type || undefined,
    limit: params.limit,
  });
}

export function fetchMinibarSessions(): Promise<MinibarSession[]> {
  return getList<MinibarSession[]>('/sessions');
}
