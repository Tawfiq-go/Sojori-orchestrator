import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import apiClient from './apiClient';

/** Aperçu WhatsApp d'un listing — calculé par srv-fullchatbot sur un voyageur fictif. */
export type GuestPreviewMenuRow = { code: string; id: string; title: string; description: string };

export type GuestPreview = {
  listingId: string;
  listingName: string;
  lang: string;
  phase: 'pre_arrival' | 'in_stay';
  menu: {
    lang: string;
    header: string;
    body: string;
    button: string;
    footer: string;
    rows: GuestPreviewMenuRow[];
  };
  doors: {
    breakfast: { on: boolean; formulas: number };
    paidCard: { on: boolean; dishes: number };
    stayOptions: { ambiances: number; privatePool: boolean; beds: boolean };
    experiences: { on: boolean; count: number };
    transport: { on: boolean; count: number };
    cleaning: {
      cadence: { always: boolean; everyNDays: number };
      recouche: boolean;
      intro: string | null;
      flow: 'timeslots' | 'included_paid';
    };
  };
};

export async function fetchGuestPreview(
  listingId: string,
  params: { lang?: string; roomTypeId?: string; phase?: 'pre_arrival' | 'in_stay' } = {},
): Promise<GuestPreview> {
  const q = new URLSearchParams();
  if (params.lang) q.set('lang', params.lang);
  if (params.roomTypeId) q.set('roomTypeId', params.roomTypeId);
  if (params.phase) q.set('phase', params.phase);
  const url = `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/listings/${encodeURIComponent(listingId)}/guest-preview${
    q.toString() ? `?${q}` : ''
  }`;
  const res = await apiClient.get<{ success?: boolean; data?: GuestPreview; error?: string }>(url);
  if (!res.data?.success || !res.data.data) {
    throw new Error(res.data?.error || 'Aperçu indisponible');
  }
  return res.data.data;
}
