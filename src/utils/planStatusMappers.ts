/**
 * ═══════════════════════════════════════════════════════════════════
 * Mappers statuts orchestration v2 → UI
 * ═══════════════════════════════════════════════════════════════════
 *
 * Convertit les statuts canoniques (backend) vers les représentations UI.
 */

import type { AtomeStatus, SequenceStatus, PlanStatus, AssignationStatus } from '../types/planOrchestrationV2'
import type { EventStatus } from '../features/planReservation/types'

/**
 * Mapping atome → couleurs UI existantes
 *
 * | Statut canon | UI existante |
 * |--------------|--------------|
 * | fait         | done (vert)  |
 * | en_cours     | now (bleu)   |
 * | en_retard    | pending (orange) |
 * | echec/saute  | blocked (rouge) |
 * | en_attente   | future (gris) |
 */
export function mapAtomeStatusToUI(status: AtomeStatus, scheduledAt: Date | string, now: Date = new Date()): EventStatus {
  const scheduledDate = typeof scheduledAt === 'string' ? new Date(scheduledAt) : scheduledAt

  switch (status) {
    case 'fait':
      return 'done'

    case 'en_cours':
      return 'now'

    case 'echec':
    case 'saute':
      return 'blocked'

    case 'en_attente':
      // Dériver en_retard (statut pas stocké, calculé)
      if (scheduledDate < now) {
        return 'pending' // Orange pour en_retard
      }
      return 'future' // Gris pour futur

    default:
      return 'future'
  }
}

/**
 * Mapping séquence → UI
 */
export function mapSequenceStatusToUI(status: SequenceStatus): EventStatus {
  switch (status) {
    case 'termine':
      return 'done'

    case 'en_cours':
      return 'now'

    case 'en_retard':
      return 'pending'

    case 'bloque':
      return 'blocked'

    case 'en_attente':
      return 'future'

    default:
      return 'future'
  }
}

/**
 * Mapping plan → UI (pour compatibilité, mais cycle de vie propre maintenant)
 */
export function mapPlanStatusToUI(status: PlanStatus): EventStatus {
  switch (status) {
    case 'completed':
      return 'done'

    case 'cree':
      return 'now' // Plan actif

    case 'archived':
      return 'blocked' // Archivé = fermé

    default:
      return 'future'
  }
}

/**
 * Mapping assignation → description textuelle
 */
export function formatAssignationStatus(status: AssignationStatus): string {
  switch (status) {
    case 'en_attente':
      return 'En attente'

    case 'en_cours':
      return 'Recherche en cours'

    case 'attente_acceptation':
      return 'Attente acceptation staff'

    case 'termine':
      return 'Staff confirmé'

    case 'echec':
      return 'Échec assignation'

    default:
      return 'Inconnu'
  }
}

/**
 * Couleur badge pour assignation
 */
export function getAssignationStatusColor(status: AssignationStatus): string {
  switch (status) {
    case 'termine':
      return 'green'

    case 'en_cours':
    case 'attente_acceptation':
      return 'blue'

    case 'echec':
      return 'red'

    case 'en_attente':
    default:
      return 'gray'
  }
}

/**
 * Icône pour type d'action (next action)
 */
export function getActionTypeIcon(type: string): string {
  switch (type) {
    case 'message':
      return '💬'

    case 'relance':
      return '🔔'

    case 'reminder':
      return '⏰'

    case 'assignation':
      return '👤'

    case 'escalade':
      return '🚨'

    default:
      return '📌'
  }
}

/**
 * Badge LM (Last-Minute)
 */
export function shouldShowLMBadge(item: { lm?: boolean }): boolean {
  return item.lm === true
}

/**
 * Format raison skip
 */
export function formatSkipReason(reason?: string): string {
  if (!reason) return ''

  switch (reason) {
    case 'client_a_repondu':
      return 'Client a répondu'

    case 'date_passee_creation':
      return 'Date dépassée à la création'

    case 'remplace_par_lm':
      return 'Remplacé par Last-Minute'

    case 'regroupe_veille_depart':
      return 'Regroupée veille départ'

    case 'reporte_avant_arrivee':
      return 'Reportée avant arrivée'

    case 'decale_collision_arrivee':
      return 'Décalée (collision arrivée)'

    case 'assignation_exhausted':
      return 'Assignation épuisée'

    case 'expire':
      return 'Expiré'

    default:
      return reason
  }
}
