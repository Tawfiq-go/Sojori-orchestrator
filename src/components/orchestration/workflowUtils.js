/**
 * Fonctions utilitaires pour la workflow timeline
 */

import { getTechnicalPlanChipPresentation } from './orchestrationStatusPresentation'

// Nom affiché = toujours depuis la config (categoryDisplayLabel). Pas de fallback sur des noms codés en dur.
export const getTemplateName = (code) => {
  if (!code) return 'N/A'
  return 'Template configuré'
}

// Fonction pour obtenir la condition d'envoi en français
export const getSendConditionLabel = (sendCondition, category) => {
  if (!sendCondition || sendCondition === 'ALWAYS') return 'toujours'

  // ✅ Conditions spécifiques par workflow (depuis scheduledExecutions.condition)
  if (sendCondition === 'IF_REGISTRATION_INCOMPLETE' || sendCondition === 'INCOMPLETE_REGISTRATION') {
    return 'si enregistrement non complet'
  }
  if (sendCondition === 'IF_ARRIVAL_NOT_DECLARED' || sendCondition === 'NOT_DECLARED') {
    return category === 'arrival_declare' ? 'si arrivée non déclarée' : 'si non déclaré'
  }
  if (sendCondition === 'IF_DEPARTURE_NOT_DECLARED') {
    return 'si départ non déclaré'
  }

  // Anciennes conditions génériques (fallback)
  if (sendCondition === 'IF_NOT_DONE' || sendCondition === 'IF_NOT_COMPLETE') {
    if (category === 'registration') return 'si enregistrement non complet'
    if (category === 'arrival_declare') return 'si arrivée non déclarée'
    if (category === 'departure_declare') return 'si départ non déclaré'
    return 'si non fait'
  }
  if (sendCondition === 'IF_NO_TIMESLOT' || sendCondition === 'NO_TIMESLOT') return 'si pas de créneau choisi'

  return sendCondition.toLowerCase()
}

// Libellé canal (Timeslot + Notification) - même logique partagée
export const getOtaShortLabel = (otaSource) => {
  if (!otaSource) return null
  const s = String(otaSource).toLowerCase()
  if (s.includes('airbnb')) return 'Airbnb'
  if (s.includes('booking')) return 'Booking'
  if (s.includes('expedia')) return 'Expedia'
  if (s.includes('vrbo')) return 'VRBO'
  return otaSource
}

export const getChannelLabel = (channelPriority, otaSource, atSojoriDirect) => {
  const ch = (channelPriority || '').toString()
  const isDirect = atSojoriDirect === true
  if (isDirect && (ch === 'OTA_PRIORITY' || ch === 'OTA_ONLY')) return '📧 Email (résa directe)'
  if (ch === 'WHATSAPP_PRIORITY') return '📱 Priorité WhatsApp'
  if (ch === 'WHATSAPP_ONLY') return '📱 WhatsApp uniquement'
  if (ch === 'EMAIL_PRIORITY') return '📧 Priorité Email'
  if (ch === 'OTA_PRIORITY') return getOtaShortLabel(otaSource) ? `🏨 Priorité ${getOtaShortLabel(otaSource)}` : '🏨 Priorité Email-OTA'
  if (ch === 'OTA_ONLY') return getOtaShortLabel(otaSource) ? `🏨 ${getOtaShortLabel(otaSource)}` : '🏨 OTA'
  const s = ch.toLowerCase()
  if (s.includes('whatsapp')) return s.includes('priority') ? '📱 Priorité WhatsApp' : '📱 WhatsApp'
  if (s === 'email') return '📧 Email'
  if (s.includes('ota')) return '🏨 OTA'
  return ch || 'N/A'
}

// Libellé pour catégorie → staff assignment
export const workflowCategoryToStaff = (cat) => {
  const c = (cat || '').toLowerCase()
  if (c.startsWith('cleaning_')) return 'Technicien de surface'
  if (c.includes('check_in') || c.includes('checkin')) return 'Agent accueil'
  if (c.includes('check_out') || c.includes('checkout')) return 'Agent sortie'
  if (c === 'maintenance' || c === 'repair') return 'Maintenanc'
  if (c === 'support' || c === 'concierge') return 'Support'
  return 'Agent'
}

// ✅ NOUVEAU: Fonction pour obtenir le badge de statut avec couleur
export const getStatusBadge = (status) => {
  if (!status) return { text: 'N/A', color: 'gray' }

  const statusMap = {
    'CREATED': { text: 'À faire', color: 'gray', bg: 'bg-gray-200', textColor: 'text-gray-700' },
    'CONFIRMED': { text: 'Client a choisi', color: 'blue', bg: 'bg-blue-200', textColor: 'text-blue-700' },
    'ASSIGNED': { text: 'Assigné', color: 'orange', bg: 'bg-orange-200', textColor: 'text-orange-700' },
    'ACCEPTED': { text: 'Accepté', color: 'yellow', bg: 'bg-yellow-200', textColor: 'text-yellow-700' },
    'IN_PROGRESS': { text: 'En cours', color: 'purple', bg: 'bg-purple-200', textColor: 'text-purple-700' },
    'COMPLETED': { text: 'Terminé', color: 'green', bg: 'bg-green-200', textColor: 'text-green-700' },
    'CANCELLED': { text: 'Annulé', color: 'red', bg: 'bg-red-200', textColor: 'text-red-700' },
    'FAILED': { text: 'Échoué', color: 'red', bg: 'bg-red-300', textColor: 'text-red-800' },
  }

  return statusMap[status] || { text: status, color: 'gray', bg: 'bg-gray-200', textColor: 'text-gray-700' }
}

/**
 * Libellé technique affiché en haut des cartes timeline (aligné plan / actions Mongo).
 * INFO = cartes config (WhatsApp, Notifications admin/client).
 */
function execStatusUpper(e) {
  return String(e?.status ?? 'PENDING').toUpperCase()
}

function isExecTerminal(st) {
  return (
    st === 'EXECUTED' ||
    st === 'SKIPPED' ||
    st === 'CANCELLED' ||
    st === 'FAILED' ||
    st === 'INHIBITED'
  )
}

function scheduledAtMs(e) {
  if (e?.scheduledAt == null) return null
  const d = e.scheduledAt instanceof Date ? e.scheduledAt : new Date(e.scheduledAt)
  const t = d.getTime()
  return Number.isNaN(t) ? null : t
}

/** Ligne PENDING issue du rattrapage dernière minute (même si date passée : le cron va la traiter). */
function hasLastMinuteRecoveryPendingLine(executions) {
  return executions.some(
    (e) => execStatusUpper(e) === 'PENDING' && Boolean(e?.metadata?.lastMinuteRecovery),
  )
}

export function hasFuturePendingExecution(executions, nowMs) {
  return executions.some((e) => {
    if (isExecTerminal(execStatusUpper(e))) return false
    const t = scheduledAtMs(e)
    if (t == null) {
      // LM sans scheduledAt exploitable : ne pas basculer en « plus aucune fenêtre future »
      if (execStatusUpper(e) === 'PENDING' && e?.metadata?.lastMinuteRecovery) return true
      return false
    }
    return t >= nowMs
  })
}

/**
 * Même ordre que RegistrationRappelsCard (`reqTs?.scheduledExecutions || sendNotif?.scheduledExecutions`).
 * Sinon le statut granulaire reste sur sendNotif vide alors que les relances vivent sur requestTimeslot.
 */
export function pickRelanceScheduledSource(actions) {
  const reqTs = actions?.requestTimeslot
  const sendNotif = actions?.sendNotification
  if (reqTs?.scheduledExecutions?.length) {
    return { action: reqTs, actionKey: 'requestTimeslot' }
  }
  if (sendNotif?.scheduledExecutions?.length) {
    return { action: sendNotif, actionKey: 'sendNotification' }
  }
  return { action: sendNotif || reqTs || null, actionKey: 'sendNotification' }
}

function allExecutionsTerminal(executions) {
  return executions.length > 0 && executions.every((e) => isExecTerminal(execStatusUpper(e)))
}

function readExecFailureFields(exec) {
  const r = exec?.result || exec?.executionResult || {}
  const msg = String(exec?.error ?? r?.error ?? '')
    .trim()
    .toLowerCase()
  const code = String(exec?.errorCode ?? r?.errorCode ?? '')
    .trim()
    .toUpperCase()
  return { msg, code }
}

function isNoStaffFailure(exec) {
  if (execStatusUpper(exec) !== 'FAILED') return false
  const { msg, code } = readExecFailureFields(exec)
  if (!code && !msg) return false
  if (code.includes('NO_STAFF') || code === 'NO_STAFF_AVAILABLE') return true
  if (msg.includes('no staff') || msg.includes('aucun staff') || msg.includes('pas de staff')) return true
  if (msg.includes('staff not available')) return true
  if (msg.includes('no staff available')) return true
  return false
}

function isTechnicalStaffFailure(exec) {
  if (execStatusUpper(exec) !== 'FAILED') return false
  return !isNoStaffFailure(exec)
}

function staffAssignSucceeded(action, executions) {
  if (action?.status === 'COMPLETED') return true
  const ex = action?.execution
  if (ex?.assignedStaff) return true
  if (Array.isArray(ex?.attempts) && ex.attempts.some((a) => a?.success)) return true
  return executions.some((e) => execStatusUpper(e) === 'EXECUTED')
}

function deriveAssignStaffTerminalStatus(action, executions) {
  if (staffAssignSucceeded(action, executions)) return 'COMPLETED'
  const failed = executions.filter((e) => execStatusUpper(e) === 'FAILED')
  if (failed.some((f) => isTechnicalStaffFailure(f))) return 'FAILED'
  if (failed.length > 0 && failed.every((f) => isNoStaffFailure(f))) return 'NO_STAFF_AVAILABLE'
  return 'ASSIGNMENTS_EXHAUSTED'
}

/**
 * Statut granulaire depuis scheduledExecutions (timeslot, relances, staff, deadline…).
 * Aligné sur web-app-v2 / srv-orchestrator `deriveStatusFromScheduledExecutions`.
 * @param {string} [actionKey] requestTimeslot | sendNotification | assignStaff | createTask | deadlineEscalation
 */
export const deriveGranularScheduledActionStatus = (action, workflow, now = new Date(), actionKey) => {
  const executions = action?.scheduledExecutions || []
  if (!executions.length) return action?.status || 'PENDING'

  // Créneau déjà matérialisé sur le workflow (consumer / sync) alors que les relances planifiées sont
  // encore PENDING → éviter un chip créneau bloqué à PENDING (régression vs affichage attendu).
  if (actionKey === 'requestTimeslot' && workflow) {
    const st = String(action?.status || '').toUpperCase()
    if (st === 'COMPLETED' || st === 'EXECUTED') return 'COMPLETED'
    const wi = workflow?.whatsappInfo
    if (
      wi?.timeslotSelected === true ||
      wi?.arrivalTimeChosen === true ||
      wi?.departureTimeChosen === true
    ) {
      return 'COMPLETED'
    }
    // ❌ REMOVED: if (code.startsWith('SM-')) return 'COMPLETED'
    // SM-* = liaison technique initiale (création timeslot), PAS preuve de choix client.
    // Ne retourner COMPLETED que si le client a vraiment choisi (heure, flags, execution.response).
    const ts = workflow?.timeslotSelected
    if (typeof ts?.start === 'number' && ts.start >= 0 && ts.start <= 23) return 'COMPLETED'
    const wh = workflow?.whatsappInfo?.selectedHour
    if (wh != null && wh !== '' && !Number.isNaN(Number(wh))) return 'COMPLETED'
    const r = action?.execution?.response || {}
    if (r.selectedAt != null && String(r.selectedAt).trim() !== '') return 'COMPLETED'
    const rh = r.selectedHour ?? r.selected_hour
    if (rh != null && rh !== '' && !Number.isNaN(Number(rh))) return 'COMPLETED'
  }

  const nowMs = now.getTime()
  const executedCount = executions.filter((e) => execStatusUpper(e) === 'EXECUTED').length
  const failedCount = executions.filter((e) => execStatusUpper(e) === 'FAILED').length
  const totalCount = executions.length

  if (workflow?.status === 'COMPLETED') return 'COMPLETED'

  const noFuturePending = !hasFuturePendingExecution(executions, nowMs)

  if (
    actionKey === 'assignStaff' &&
    noFuturePending &&
    workflow?.status !== 'COMPLETED' &&
    allExecutionsTerminal(executions)
  ) {
    return deriveAssignStaffTerminalStatus(action, executions)
  }

  if (noFuturePending && failedCount > 0 && executedCount === 0 && totalCount > 0) {
    return 'TERMINATED'
  }

  if (noFuturePending && workflow?.status !== 'COMPLETED') {
    if (executedCount === totalCount && totalCount > 0) {
      if (actionKey === 'requestTimeslot' || actionKey === 'sendNotification') {
        return 'REMINDERS_EXHAUSTED'
      }
      if (hasLastMinuteRecoveryPendingLine(executions)) return 'LM_RELANCE'
      return 'RETARD'
    }
    const anyPastPending = executions.some((e) => {
      if (isExecTerminal(execStatusUpper(e))) return false
      const t = scheduledAtMs(e)
      return t != null && t < nowMs
    })
    if (anyPastPending) {
      if (hasLastMinuteRecoveryPendingLine(executions)) return 'LM_RELANCE'
      return 'RETARD'
    }
    if (executedCount === 0 && failedCount === 0 && totalCount > 0) {
      const allDatesStrictlyPast = executions.every((e) => {
        const t = scheduledAtMs(e)
        return t != null && t < nowMs
      })
      if (allDatesStrictlyPast) {
        if (hasLastMinuteRecoveryPendingLine(executions)) return 'LM_RELANCE'
        return 'RETARD'
      }
    }
  }

  if (
    (actionKey === 'sendNotification' || actionKey === 'requestTimeslot') &&
    allExecutionsTerminal(executions) &&
    workflow?.status !== 'COMPLETED'
  ) {
    if (executedCount > 0 && failedCount === 0) return 'REMINDERS_EXHAUSTED'
    if (executedCount > 0 && failedCount > 0) return 'REMINDED'
    if (executedCount === 0 && failedCount > 0) return 'TERMINATED'
    if (executedCount === 0 && failedCount === 0) return 'TERMINATED'
  }

  if (executedCount === 0) return 'PENDING'
  if (executedCount === 1 && failedCount === 0) return 'INITIAL_SENT'
  if (executedCount > 1 && executedCount < totalCount) return 'REMINDED'
  return executedCount > 0 ? 'REMINDED' : 'PENDING'
}

/** Chip technique plan (bandeau ActionCard, etc.) — harmonisé via orchestrationStatusPresentation. */
export const getTechnicalPlanStatusChip = (status) => {
  const { label, chipClass } = getTechnicalPlanChipPresentation(status)
  return { label, chipClass }
}

// ✅ NOUVEAU: Fonction pour vérifier si le client a choisi (pour icône ✅)
export const isClientConfirmed = (workflow) => {
  return workflow?.metadata?.isClientConfirmed === true || workflow?.timeslot?.isClientConfirmed === true
}
