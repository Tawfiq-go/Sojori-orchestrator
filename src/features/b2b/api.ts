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
