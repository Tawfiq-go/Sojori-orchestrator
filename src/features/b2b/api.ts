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
    return new Error(
      "Service indisponible : la politique commerciale n'est pas encore déployée sur cet environnement.",
    );
  if (status === 401 || status === 403)
    return new Error("Accès refusé à la politique de cet établissement.");
  return new Error(fallback);
}

const BASE = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/b2b`;

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
  groupId: string;
  groupLabel: string;
  groupStatus: string | null;
  kind: "payment_reminder" | "quote_expiring";
  status: "pending" | "sent_manually" | "sent" | "dismissed";
  recipientEmail: string | null;
  recipientName: string | null;
  subject: string;
  body: string;
  reason: string;
  amountMad: number;
  dueAt: string | null;
  createdAt: string;
  handledAt: string | null;
}

export async function fetchB2bOutbox(
  ownerId: string,
  status: "pending" | "all" = "pending",
): Promise<OutboxMessage[]> {
  try {
    const { data } = await apiClient.get<{ success: boolean; data: OutboxMessage[] }>(
      `${BASE}/outbox`,
      { params: { ownerId, status } },
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
      `${BASE}/outbox/${id}/handle`,
      { status, ownerId },
      { params: { ownerId } },
    );
  } catch (error) {
    throw readable(error, "Mise à jour du message impossible.");
  }
}
