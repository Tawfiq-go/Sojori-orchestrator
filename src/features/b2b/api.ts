// ════════════════════════════════════════════════════════════════════════════
// Sales B2B — client API de la politique commerciale
// ────────────────────────────────────────────────────────────────────────────
// Le contrat est le miroir de `srv-reservations/routes/internal/b2bPolicy.ts`.
// Si le backend ne produit pas un champ, l'UI ne l'affiche pas.
//
// `ownerId` est requis sur chaque appel : le proxy srv-admin refuse une requête
// qui ne nomme aucun établissement plutôt que de retomber sur « tous les
// clients ». Voir l'en-tête de `srv-admin/routes/b2bPolicy/index.ts` pour ce
// que cela garantit — et ce que cela ne garantit pas.
// ════════════════════════════════════════════════════════════════════════════
import { MICROSERVICE_BASE_URL } from "../../config/authConfig";
import apiClient from "../../services/apiClient";
import type { B2bPolicy } from "./policy";

/**
 * Message lisible par un PM plutôt que « Request failed with status code 404 ».
 * Une erreur technique brute à l'écran n'aide personne à savoir quoi faire.
 */
function readable(error: unknown, fallback: string): Error {
  const status = (error as { response?: { status?: number } })?.response?.status;
  const serverMessage = (
    error as { response?: { data?: { error?: string } } }
  )?.response?.data?.error;
  if (serverMessage) return new Error(serverMessage);
  if (status === 404)
    // Volontairement neutre : ce helper sert la politique, la file et la
    // messagerie. Nommer l'une des trois induit en erreur sur les deux autres.
    return new Error(
      "Service indisponible : le module B2B n'est pas encore déployé sur cet environnement.",
    );
  if (status === 401 || status === 403)
    return new Error("Accès refusé à la politique de cet établissement.");
  return new Error(fallback);
}

const BASE = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/b2b`;

/**
 * La file d'actions vit dans srv-agents, pas dans srv-reservations.
 *
 * Rédiger un message et choisir un canal sont des gestes d'agent commercial.
 * srv-reservations détecte l'échéance — il tient les calendriers et les
 * paiements — puis dépose l'action ici. Deux passerelles donc, une par service.
 */
const AGENTS_BASE = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/marketing/commercial`;

/** Ce que renvoie le serveur : la politique, plus deux méta-données. */
export interface StoredB2bPolicy extends B2bPolicy {
  ownerId: string;
  /** `false` = le PM n'a jamais enregistré : ce sont les valeurs par défaut. */
  isConfigured: boolean;
  updatedAt: string | null;
}

export async function fetchB2bPolicy(ownerId: string): Promise<StoredB2bPolicy> {
  try {
    const { data } = await apiClient.get<{ success: boolean; data: StoredB2bPolicy }>(
      `${BASE}/policy`,
      { params: { ownerId } },
    );
    return data.data;
  } catch (error) {
    throw readable(error, "Chargement de la politique impossible.");
  }
}

export async function saveB2bPolicy(
  ownerId: string,
  policy: B2bPolicy,
): Promise<StoredB2bPolicy> {
  try {
    const { data } = await apiClient.put<{ success: boolean; data: StoredB2bPolicy }>(
      `${BASE}/policy`,
      { ...policy, ownerId },
      { params: { ownerId } },
    );
    return data.data;
  } catch (error) {
    throw readable(error, "Enregistrement de la politique impossible.");
  }
}

/* ────────────────────────── File de sortie ────────────────────────── */

/**
 * Un message à relancer.
 *
 * ⚠️ `pending` signifie « il faudrait relancer », JAMAIS « le client a été
 * relancé ». Aucun envoi automatique n'existe : c'est le PM qui envoie depuis
 * sa boîte, puis marque la ligne traitée.
 */
export interface OutboxMessage {
  id: string;
  kind: "payment_reminder" | "quote_expiring";
  status: "pending" | "sent" | "sent_manually" | "dismissed" | "failed";
  /** Contexte lisible : « Séminaire Axa — mars 2027 ». */
  label: string | null;
  recipientEmail: string | null;
  subject: string;
  body: string;
  reason: string;
  amountMad: number;
  dueAt: string | null;
  sentAt: string | null;
  /** Renseigné quand un envoi a été tenté et a échoué. */
  lastError: string | null;
  attempts: number;
  createdAt: string;
}

export async function fetchB2bOutbox(
  ownerId: string,
  status: "open" | "all" = "open",
): Promise<OutboxMessage[]> {
  try {
    const { data } = await apiClient.get<{ success: boolean; data: OutboxMessage[] }>(
      `${AGENTS_BASE}/outbox`,
      { params: { ownerId, tenantId: ownerId, status } },
    );
    return data.data;
  } catch (error) {
    throw readable(error, "Chargement de la file impossible.");
  }
}

/** `sent_manually` = le PM a envoyé lui-même. `dismissed` = relance inutile. */
export async function handleOutboxMessage(
  ownerId: string,
  id: string,
  status: "sent_manually" | "dismissed",
): Promise<void> {
  try {
    await apiClient.post(
      `${AGENTS_BASE}/outbox/${id}/handle`,
      { status, ownerId },
      { params: { ownerId, tenantId: ownerId } },
    );
  } catch (error) {
    throw readable(error, "Mise à jour du message impossible.");
  }
}

/* ────────────────────────── Inbox commerciale ────────────────────────── */

const INBOX_BASE = `${AGENTS_BASE}/inbox`;

/** Un fil de discussion avec un interlocuteur. */
export interface InboxThread {
  id: string;
  channel: "email" | "whatsapp";
  contactAddress: string;
  contactName: string | null;
  subject: string | null;
  lastMessageAt: string | null;
  lastInboundAt: string | null;
  lastPreview: string | null;
  unreadCount: number;
}

export interface InboxMessage {
  id: string;
  direction: "inbound" | "outbound";
  from: string;
  to: string;
  subject: string | null;
  body: string;
  sentAt: string;
  /** Renseigné quand l'envoi a échoué — la ligne reste visible malgré tout. */
  error: string | null;
}

export interface InboxThreadDetail {
  id: string;
  channel: "email" | "whatsapp";
  contactAddress: string;
  contactName: string | null;
  subject: string | null;
  messages: InboxMessage[];
}

export async function fetchInboxThreads(ownerId: string): Promise<InboxThread[]> {
  try {
    const { data } = await apiClient.get<{ success: boolean; data: InboxThread[] }>(
      `${INBOX_BASE}/threads`,
      { params: { ownerId, tenantId: ownerId } },
    );
    return data.data;
  } catch (error) {
    throw readable(error, "Chargement de la messagerie impossible.");
  }
}

export async function fetchInboxThread(
  ownerId: string,
  threadId: string,
): Promise<InboxThreadDetail> {
  try {
    const { data } = await apiClient.get<{ success: boolean; data: InboxThreadDetail }>(
      `${INBOX_BASE}/threads/${threadId}`,
      { params: { ownerId, tenantId: ownerId } },
    );
    return data.data;
  } catch (error) {
    throw readable(error, "Ouverture du fil impossible.");
  }
}

/**
 * Envoie une réponse.
 *
 * ⚠️ Ce message part VRAIMENT au client depuis b2b@sojori.com. C'est le seul
 * geste de cet écran dont l'effet sort de Sojori et ne se rattrape pas.
 */
export async function replyToInboxThread(
  ownerId: string,
  threadId: string,
  body: string,
): Promise<void> {
  try {
    await apiClient.post(
      `${INBOX_BASE}/threads/${threadId}/reply`,
      { body, ownerId },
      { params: { ownerId, tenantId: ownerId } },
    );
  } catch (error) {
    throw readable(error, "Envoi de la réponse impossible.");
  }
}

/** Relève la boîte maintenant, sans attendre le passage automatique. */
export async function collectInbox(ownerId: string): Promise<{ imported: number; unresolved: number }> {
  try {
    const { data } = await apiClient.post<{
      success: boolean;
      data: { imported: number; unresolved: number };
    }>(`${INBOX_BASE}/collect`, { ownerId }, { params: { ownerId, tenantId: ownerId } });
    return data.data;
  } catch (error) {
    throw readable(error, "Relève de la boîte impossible.");
  }
}
