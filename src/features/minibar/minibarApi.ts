import apiClient from '../../services/apiClient';
import { FULLTASK_ADMIN_BASE } from '../../config/microserviceBases';
import { isAxiosError } from 'axios';

/**
 * Suivi mini-bar — LECTURE SEULE.
 * La vérité vit dans le journal (minibar_entries) côté srv-fulltask ; le
 * dashboard observe, il n'écrit jamais (toute écriture passe par le flow
 * WhatsApp du contrôleur, pour garder la traçabilité).
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

export type MinibarStayExtra = {
  reservationId: string;
  reservationCode?: string;
  listingId: string;
  roomId: string;
  roomName?: string;
  guestName?: string;
  status: 'open' | 'closed';
  currency: string;
  totalToBill: number;
  lines: MinibarExtraLine[];
  openedAt: string;
  closedAt?: string;
};

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

export function fetchMinibarExtras(status: 'open' | 'closed' | 'all' = 'all'): Promise<MinibarStayExtra[]> {
  return getList<MinibarStayExtra[]>('/extras', { status });
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
