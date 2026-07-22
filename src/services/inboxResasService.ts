// Onglet « Résas » Inbox Guest — résas × état des canaux + initiation WhatsApp
import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';

const BASE = MICROSERVICE_BASE_URL.SRV_RESERVATION;

export interface InboxResaRow {
  id: string;
  reservationNumber: string;
  guestName: string;
  phone: string;
  /** Provenance : ota | whatsapp | admin — rempli via whitelist si backfill */
  phoneSource?: 'ota' | 'whatsapp' | 'admin' | null;
  channelName: string;
  listingId: string;
  listingName: string;
  arrivalDate: string;
  departureDate: string;
  inStay: boolean;
  ota: { exists: boolean; threadId?: number; lastMessageAt?: string; unread?: number };
}

export async function fetchInboxResas(ownerId?: string) {
  const res = await apiClient.get<{ success: boolean; reservations: InboxResaRow[] }>(
    `${BASE}/inbox-resas`,
    { params: ownerId ? { ownerId } : undefined },
  );
  return res.data.reservations ?? [];
}

export async function initiateWhatsAppForResa(
  resaId: string,
  templateId = 'welcome_sojori_v2',
): Promise<{ success: boolean; messageId?: string; error?: string; notWhatsApp?: boolean }> {
  try {
    const res = await apiClient.post<{ success: boolean; messageId?: string }>(
      `${BASE}/inbox-resas/${encodeURIComponent(resaId)}/initiate-whatsapp`,
      { templateId },
    );
    return { success: res.data.success === true, messageId: res.data.messageId };
  } catch (e) {
    const axiosErr = e as {
      response?: { data?: { error?: string; notWhatsApp?: boolean } };
      message?: string;
    };
    return {
      success: false,
      error: axiosErr.response?.data?.error || axiosErr.message || 'Envoi impossible',
      notWhatsApp: axiosErr.response?.data?.notWhatsApp === true,
    };
  }
}
