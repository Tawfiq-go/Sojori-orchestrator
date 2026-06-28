import apiClient from '../../../services/apiClient';
import { MICROSERVICE_BASE_URL } from '../../../config/authConfig';

/** Base `/api/v1/reservations` — liste legacy = `${BASE}/reservations` */
const RESERVATIONS_BASE = MICROSERVICE_BASE_URL.SRV_RESERVATION;

export type LedgerReservationOption = {
  id: string;
  reservationNumber: string;
  guestName?: string;
  arrivalDate?: string;
  departureDate?: string;
  listingId?: string;
  listingName?: string;
};

function formatShort(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function mapRow(raw: Record<string, unknown>): LedgerReservationOption | null {
  const id = String(raw._id || raw.id || '');
  const reservationNumber = String(raw.reservationNumber || '').trim();
  if (!id || !reservationNumber) return null;
  const listing = (raw.listing || raw.sojoriListing) as Record<string, unknown> | undefined;
  const listingId = raw.sojoriId ? String(raw.sojoriId) : listing?._id ? String(listing._id) : undefined;
  const listingName = listing?.name ? String(listing.name) : undefined;
  const guestName = String(
    raw.guestName ||
      [raw.guestFirstName, raw.guestLastName].filter(Boolean).join(' ') ||
      '',
  ).trim();
  return {
    id,
    reservationNumber,
    guestName: guestName || undefined,
    arrivalDate: raw.arrivalDate ? String(raw.arrivalDate) : undefined,
    departureDate: raw.departureDate ? String(raw.departureDate) : undefined,
    listingId,
    listingName,
  };
}

export function formatReservationOptionLabel(opt: LedgerReservationOption): string {
  const dates =
    opt.arrivalDate || opt.departureDate
      ? ` · ${formatShort(opt.arrivalDate)}${opt.departureDate ? ` → ${formatShort(opt.departureDate)}` : ''}`
      : '';
  const guest = opt.guestName ? ` · ${opt.guestName}` : '';
  return `${opt.reservationNumber}${guest}${dates}`;
}

export async function searchLedgerReservations(
  query: string,
  ownerId?: string | null,
): Promise<LedgerReservationOption[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const now = new Date();
  const start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  const params = new URLSearchParams({
    dateType: 'arrival',
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    limit: '25',
    reservationNumber: q,
    sortField: 'createdAt',
    sortOrder: 'desc',
  });
  if (ownerId) params.append('filterOwnerId', ownerId);

  try {
    const { data } = await apiClient.get(`${RESERVATIONS_BASE}/reservations?${params}`, {
      validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
    });
    const rows = Array.isArray(data?.data) ? data.data : [];
    return rows
      .map((r: Record<string, unknown>) => mapRow(r))
      .filter((r): r is LedgerReservationOption => !!r);
  } catch {
    return [];
  }
}

export async function getLedgerReservationByNumber(
  reservationNumber: string,
): Promise<LedgerReservationOption | null> {
  const q = reservationNumber.trim();
  if (!q) return null;
  try {
    const { data } = await apiClient.get(
      `${RESERVATIONS_BASE}/reservations/by-reservation-number/${encodeURIComponent(q)}`,
    );
    const row = data?.reservation as Record<string, unknown> | undefined;
    return row ? mapRow(row) : null;
  } catch {
    return null;
  }
}

export async function fetchReservationLabels(
  ids: string[],
): Promise<Record<string, LedgerReservationOption>> {
  const unique = [...new Set(ids.map(String).filter(Boolean))];
  if (!unique.length) return {};
  try {
    const { data } = await apiClient.get(`${RESERVATIONS_BASE}/batch`, {
      params: { ids: unique.join(',') },
    });
    const rows = Array.isArray(data?.data) ? data.data : [];
    const out: Record<string, LedgerReservationOption> = {};
    for (const raw of rows) {
      const mapped = mapRow(raw as Record<string, unknown>);
      if (mapped) out[mapped.id] = mapped;
    }
    return out;
  } catch {
    return {};
  }
}
