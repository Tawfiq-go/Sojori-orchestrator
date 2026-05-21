/**
 * Libellés UI pour scheduledExecutions (relances, LM, skips).
 */

const SKIP_REASON_LABELS = {
  LAST_MINUTE_OVERTAKEN: 'Trop tard — fenêtre dépassée',
  STALE_WINDOW: 'Trop tard — créneau > 6h au plan',
  STALE_EVENT: 'Expiré — cron (> 6h de retard)',
  TIMESLOT_ALREADY_SELECTED: 'Créneau déjà choisi',
  TIMESLOT_RECEIVED: 'Créneau déjà reçu',
  STAFF_ALREADY_ASSIGNED: 'Staff déjà assigné',
  WORKFLOW_COMPLETED: 'Workflow terminé',
  NO_STAFF_ASSIGNED_YET: 'Pas encore de staff',
  CATCH_UP_OBSOLETE: 'Rattrapé — autre relance exécutée',
  NEWER_EVENT_EXISTS: 'Ignoré — relance plus récente',
}

export function getSkippedReasonLabel(skippedReason) {
  if (!skippedReason) return null
  const key = String(skippedReason).trim().toUpperCase()
  return SKIP_REASON_LABELS[key] || skippedReason.replace(/_/g, ' ').toLowerCase()
}

export function getExecutionTypeLabel(exec) {
  if (exec?.metadata?.lastMinuteRecovery || exec?.condition === 'LAST_CHANCE') {
    return 'Dernier créneau (LM)'
  }
  const t = String(exec?.type || '').toUpperCase()
  if (t === 'INITIAL_REQUEST') return '1er message'
  if (t === 'REMINDER') return 'Relance'
  if (t === 'PRIMARY') return 'Message'
  if (t === 'ASSIGN_ATTEMPT') return 'Assignation staff'
  if (t === 'CREATE') return 'Création tâche'
  return t || 'Exécution'
}

export function mapExecutionRowStatus(exec) {
  const s = String(exec?.status || 'PENDING').toUpperCase()
  if (s === 'EXECUTED' || s === 'SENT' || s === 'ASSIGNED') {
    return { key: 'sent', label: 'Exécuté', crossed: false }
  }
  if (s === 'FAILED') {
    return { key: 'failed', label: 'Échec', crossed: false }
  }
  if (s === 'SKIPPED') {
    return { key: 'missed', label: 'Ignoré', crossed: true }
  }
  if (s === 'PENDING' && exec?.metadata?.lastMinuteRecovery) {
    return { key: 'pending', label: 'À envoyer (dernier créneau)', crossed: false }
  }
  return { key: 'pending', label: 'Planifié', crossed: false }
}
