/**
 * Statut « plan de relances » (PR) et couleurs de chips pour cartes orchestration.
 * ✅ SUPPRIMÉ: derivePlanRelanceStatusForHeader - Plus utilisé (PR supprimé)
 */
import { hasFuturePendingExecution } from './workflowUtils'

/**
 * Logs debug chip WF / statuts. Activer dans la console du navigateur :
 * `localStorage.setItem('DEBUG_ORCH_WF','1')` puis F5. Désactiver : `removeItem('DEBUG_ORCH_WF')` ou `'0'`.
 */
export function isDebugOrchWf() {
  try {
    return (
      typeof globalThis !== 'undefined' &&
      globalThis.localStorage?.getItem?.('DEBUG_ORCH_WF') === '1'
    )
  } catch {
    return false
  }
}

export function logOrchWf(scope, payload) {
  if (!isDebugOrchWf()) return
  // eslint-disable-next-line no-console -- opt-in via localStorage DEBUG_ORCH_WF
  console.info(`[orch-wf:${scope}]`, payload)
}

/** Au moins une ligne planifiée (relance / assignation) sur le workflow */
function hasAnyScheduledExecutions(workflow) {
  const actions = [
    workflow?.actions?.requestTimeslot,
    workflow?.actions?.sendNotification,
    workflow?.actions?.assignStaff,
  ]
  return actions.some((a) => a?.scheduledExecutions?.length > 0)
}

/** Il reste une exécution non terminée encore traitable (LM rattrapage inclus). */
function hasFuturePendingScheduledSlot(workflow) {
  const nowMs = Date.now()
  const actionsToCheck = [
    workflow?.actions?.requestTimeslot,
    workflow?.actions?.sendNotification,
    workflow?.actions?.assignStaff,
  ]
  for (const action of actionsToCheck) {
    const ex = action?.scheduledExecutions || []
    if (ex.length > 0 && hasFuturePendingExecution(ex, nowMs)) return true
  }
  return false
}

export function workflowPlanExhausted(workflow) {
  const wf = effectiveWorkflowStatusCode(workflow)
  if (wf !== 'PENDING' && wf !== 'FAILED') return false
  if (!hasAnyScheduledExecutions(workflow)) return false
  return !hasFuturePendingScheduledSlot(workflow)
}

/** Couleur chip WF : rouge si plan épuisé (plus de relance future) tout en gardant PENDING en base. */
export function deriveWorkflowColor(workflow) {
  const wfStatus = effectiveWorkflowStatusCode(workflow)

  if (wfStatus === 'COMPLETED') {
    return 'success'
  }

  if (wfStatus === 'PENDING') {
    if (!hasAnyScheduledExecutions(workflow)) {
      return 'warning'
    }
    return hasFuturePendingScheduledSlot(workflow) ? 'warning' : 'error'
  }

  if (String(wfStatus || '').toUpperCase() === 'FAILED') {
    if (workflow && workflowPlanExhausted(workflow)) return 'error'
    return chipColorForWorkflowStatus(wfStatus)
  }

  return chipColorForWorkflowStatus(wfStatus)
}

const CHOICE_TIMESLOT_CATEGORIES = new Set([
  'arrival_choose',
  'departure_choose',
  'cleaning_free',
  'cleaning_paid',
  'cleaning_sojori',
])

function isCleaningSojoriWorkflow(workflow) {
  return String(workflow?.category || '').toLowerCase() === 'cleaning_sojori' || workflow?.categoryType === 'CLEANING_SOJORI'
}

export function isTimeslotChoiceWorkflow(workflow) {
  const c = String(workflow?.category || '').toLowerCase()
  if (CHOICE_TIMESLOT_CATEGORIES.has(c)) return true
  const ct = String(workflow?.categoryType || '')
  if (ct.startsWith('CHOICE_')) return true
  return ['CLEANING_FREE', 'CLEANING_SOJORI', 'CLEANING_PAID'].includes(ct)
}

/** Workflows CHOICE / CLEANING avec panneaux multi-actions (aligné WorkflowCard). */
export function isOrchestrationWorkflow(workflow) {
  if (!workflow) return false
  const ct = String(workflow.categoryType || '')
  const cat = String(workflow.category || '').toLowerCase()
  if (ct.startsWith('CHOICE_') || ct.startsWith('CLEANING_')) return true
  if (ct === 'CHOICE' || ct === 'CLEANING') return true
  return CHOICE_TIMESLOT_CATEGORIES.has(cat)
}

/** Titre court pour le chip « Choisir arrivée : … » (action requestTimeslot). */
export function timeslotStepTitleForWorkflow(workflow) {
  if (!workflow) return null
  const hasRt = Boolean(workflow.actions?.requestTimeslot)
  if (!hasRt && !isOrchestrationWorkflow(workflow)) return null
  const cat = String(workflow.category || '').toLowerCase()
  const ct = String(workflow.categoryType || '')
  if (cat === 'arrival_choose' || ct === 'CHOICE_ARRIVAL' || ct.includes('CHOICE_ARRIVAL'))
    return 'Choisir arrivée'
  if (cat === 'departure_choose' || ct === 'CHOICE_DEPARTURE' || ct.includes('CHOICE_DEPARTURE'))
    return 'Choisir départ'
  if (cat === 'cleaning_sojori' || ct.includes('SOJORI')) return 'Créneau ménage Sojori'
  if (
    cat === 'cleaning_free' ||
    cat === 'cleaning_paid' ||
    ct.startsWith('CLEANING_') ||
    ct === 'CLEANING'
  )
    return 'Créneau ménage'
  return 'Demande créneau'
}

function requestTimeslotExecutionResponse(workflow) {
  return workflow?.actions?.requestTimeslot?.execution?.response || {}
}

export function timeslotChosenHourValue(workflow) {
  const r = requestTimeslotExecutionResponse(workflow)
  const candidates = [
    r.selectedHour,
    r.selected_hour,
    workflow?.whatsappInfo?.selectedHour,
    workflow?.whatsappInfo?.timeslotSelected?.start,
    workflow?.timeslotSelected?.start,
  ]
  for (const c of candidates) {
    if (c === undefined || c === null || c === '') continue
    const n = Number(c)
    if (!Number.isNaN(n) && n >= 0 && n <= 23) return n
  }
  return undefined
}

export function clientHasSelectedTimeslotHour(workflow) {
  if (timeslotChosenHourValue(workflow) !== undefined) return true
  const wi = workflow?.whatsappInfo || {}
  if (wi.arrivalTimeChosen === true || wi.departureTimeChosen === true) return true
  const rt = workflow?.actions?.requestTimeslot
  const rtSt = String(rt?.status || '').toUpperCase()
  if (rtSt === 'EXECUTED' || rtSt === 'COMPLETED') {
    const r = requestTimeslotExecutionResponse(workflow)
    if (Object.keys(r).length > 0) return true
  }
  return false
}

function formatCréneauChoisiLabel(workflow) {
  const n = timeslotChosenHourValue(workflow)
  return n !== undefined && !Number.isNaN(n) ? `Créneau choisi (${n}h)` : 'Créneau choisi'
}

function timeslotRequestExecutions(workflow) {
  return workflow?.actions?.requestTimeslot?.scheduledExecutions || []
}

export function deriveTimeslotChoiceWorkflowChipColor(workflow) {
  if (isCleaningSojoriWorkflow(workflow) && workflow?.metadata?.cleaningDate) return 'success'
  if (clientHasSelectedTimeslotHour(workflow)) return 'success'
  const rt = workflow?.actions?.requestTimeslot
  if (String(rt?.status || '').toUpperCase() === 'FAILED') return 'error'
  const executions = timeslotRequestExecutions(workflow)
  if (!executions.length) return 'warning'
  const nowMs = Date.now()
  if (hasFuturePendingExecution(executions, nowMs)) return 'warning'
  return 'error'
}

/** @returns {string|null} */
export function workflowTimeslotClientHeaderLabel(workflow) {
  if (!isTimeslotChoiceWorkflow(workflow)) return null
  if (isCleaningSojoriWorkflow(workflow)) {
    if (workflow?.metadata?.cleaningDate) return 'Ménage planifié'
    if (clientHasSelectedTimeslotHour(workflow)) {
      return formatCréneauChoisiLabel(workflow)
    }
    return 'Planification ménage Sojori'
  }
  if (clientHasSelectedTimeslotHour(workflow)) {
    return formatCréneauChoisiLabel(workflow)
  }
  if (String(workflow?.actions?.requestTimeslot?.status || '').toUpperCase() === 'FAILED') {
    return 'Échec relance créneau'
  }
  return 'En attente choix client'
}

/** Codes statut workflow reconnus (hors valeurs « libellé » erronées en base). */
const KNOWN_WORKFLOW_STATUS_CODES = new Set([
  'PENDING',
  'COMPLETED',
  'FAILED',
  'IN_PROGRESS',
  'CANCELLED',
  'TERMINATED',
  'DONE',
  'ERROR',
  'SKIPPED',
  'EXECUTED',
  'INHIBITED',
  'LAST_RELANCE',
])

/**
 * Statut workflow canonique pour affichage (chip « WF »), aligné sur
 * srv-orchestrator `deriveEffectiveWorkflowStatus`, avec tolérance si `status`
 * contient encore un libellé métier (ex. « En attente choix client ») au lieu de PENDING.
 */
export function effectiveWorkflowStatusCode(workflow) {
  logOrchWf('effectiveInput', {
    workflowId: workflow?.workflowId,
    statusRaw: workflow?.status,
    category: workflow?.category,
    categoryType: workflow?.categoryType,
    timeslotCode: workflow?.timeslotCode,
    rtExecCount: workflow?.actions?.requestTimeslot?.scheduledExecutions?.length ?? 0,
  })
  const stored = workflow?.status
  const storedStr = String(stored ?? '')
    .normalize('NFKC')
    .trim()
  const storedUpper = storedStr.toUpperCase()

  if (storedUpper === 'CANCELLED' || stored === 'CANCELLED') {
    logOrchWf('effectiveOut', { workflowId: workflow?.workflowId, out: 'CANCELLED' })
    return 'CANCELLED'
  }

  const clientHint = workflowTimeslotClientHeaderLabel(workflow)
  const looksLikePendingPlaceholder =
    storedUpper === 'PENDING' ||
    !KNOWN_WORKFLOW_STATUS_CODES.has(storedUpper) ||
    (clientHint && storedStr === clientHint) ||
    (storedUpper.includes('ATTENTE') &&
      storedUpper.includes('CLIENT') &&
      (storedUpper.includes('CHOIX') || storedUpper.includes('CHOISIR')))

  if (!looksLikePendingPlaceholder && KNOWN_WORKFLOW_STATUS_CODES.has(storedUpper)) {
    logOrchWf('effectiveOut', {
      workflowId: workflow?.workflowId,
      out: storedUpper,
      path: 'knownStoredStatus',
    })
    return storedUpper
  }

  const cat = String(workflow?.category || '').toLowerCase()
  const ct = String(workflow?.categoryType || '').toUpperCase()
  const rt = workflow?.actions?.requestTimeslot
  const execResp = rt?.execution?.response
  const timeslotStepDone =
    rt?.status === 'COMPLETED' ||
    !!(
      execResp &&
      (execResp.timeslotCode ||
        execResp.selectedAt ||
        (execResp.selectedHour != null && execResp.selectedHour !== ''))
    )

  const whatsappSaysChosen =
    workflow?.whatsappInfo?.timeslotSelected === true ||
    workflow?.whatsappInfo?.arrivalTimeChosen === true ||
    workflow?.whatsappInfo?.departureTimeChosen === true

  const hourChosen = clientHasSelectedTimeslotHour(workflow)

  /** Catégorie absente en API mais type présent (souvent le cas en JSON plan / action center). */
  const isArrivalOrDepartureChoice =
    cat === 'arrival_choose' ||
    cat === 'departure_choose' ||
    ct === 'CHOICE_ARRIVAL' ||
    ct === 'CHOICE_DEPARTURE' ||
    ct.includes('CHOICE_ARRIVAL') ||
    ct.includes('CHOICE_DEPARTURE') ||
    (ct.startsWith('CHOICE_') && (ct.includes('ARRIVAL') || ct.includes('DEPARTURE')))

  if (isArrivalOrDepartureChoice) {
    // Pas hasSmTimeslot : SM-* = liaison initiale, pas « client a choisi » (aligné orchestrateur deriveEffectiveWorkflowStatus).
    if (timeslotStepDone || whatsappSaysChosen || hourChosen) {
      logOrchWf('effectiveOut', {
        workflowId: workflow?.workflowId,
        out: 'COMPLETED',
        path: 'arrivalOrDepartureChoice',
        timeslotStepDone,
        whatsappSaysChosen,
        hourChosen,
      })
      return 'COMPLETED'
    }
  }

  const isCleaningTimeslotChoice =
    cat === 'cleaning_free' ||
    cat === 'cleaning_paid' ||
    cat === 'cleaning_sojori' ||
    ct === 'CLEANING_FREE' ||
    ct === 'CLEANING_PAID' ||
    ct === 'CLEANING_SOJORI'

  if (isCleaningTimeslotChoice) {
    const rtSt = String(rt?.status ?? '').toUpperCase()
    const nonWfHour =
      (execResp?.selectedHour != null && execResp.selectedHour !== '') ||
      !!execResp?.selectedAt ||
      (workflow?.whatsappInfo?.selectedHour != null && workflow?.whatsappInfo?.selectedHour !== '')
    if (hourChosen || whatsappSaysChosen || (nonWfHour && rtSt === 'COMPLETED')) {
      logOrchWf('effectiveOut', {
        workflowId: workflow?.workflowId,
        out: 'COMPLETED',
        path: 'cleaning',
        timeslotStepDone,
        hourChosen,
        rtSt,
      })
      return 'COMPLETED'
    }
  }

  if (cat === 'arrival_declare' || cat === 'departure_declare') {
    if (workflow?.declarationInfo?.actualTime) {
      logOrchWf('effectiveOut', { workflowId: workflow?.workflowId, out: 'COMPLETED', path: 'declare' })
      return 'COMPLETED'
    }
  }

  logOrchWf('effectiveOut', {
    workflowId: workflow?.workflowId,
    out: 'PENDING',
    path: 'fallback',
    isArrivalOrDepartureChoice,
    clientHint,
    looksLikePendingPlaceholder,
  })
  return 'PENDING'
}

/**
 * Aplatit `workflow.actions` (requestTimeslot, assignStaff, …) au même format que
 * les lignes du plan — pour réutiliser `mergeWorkflowWithPlanActionRows` dans WorkflowCard.
 */
export function flattenWorkflowEmbeddedActions(workflow) {
  if (!workflow?.actions || typeof workflow.actions !== 'object') return []
  const category = workflow.category
  const categoryType = workflow.categoryType
  const categoryDisplayLabel = workflow.categoryDisplayLabel
  const isPlaceholder = (workflow.workflowId || '').toString().startsWith('PLACEHOLDER-')
  const rows = []
  for (const [actionType, action] of Object.entries(workflow.actions)) {
    if (!action || typeof action !== 'object') continue
    const scheduledExecutions = action.scheduledExecutions || []
    const channelPriority =
      action.config?.resolvedChannelPriority || action.config?.channelPriority || null
    const base = {
      category,
      categoryType,
      categoryDisplayLabel,
      timeslotCode: workflow.timeslotCode || action.execution?.response?.timeslotCode,
      channelPriority,
      isPlaceholder,
    }
    if (scheduledExecutions.length > 0) {
      scheduledExecutions.forEach((exec, i) => {
        const at = exec.scheduledAt ?? exec.scheduledFor
        rows.push({
          ...base,
          parentActionId: action.actionId,
          executionId: exec.executionId,
          actionId: exec.actionId || `${workflow.workflowId}-${actionType}-${i}`,
          actionType,
          status: exec.status || action.status,
          scheduledFor: at ? new Date(at) : null,
          skippedReason: exec.skippedReason,
          execMetadata:
            exec.metadata && typeof exec.metadata === 'object' ? { ...exec.metadata } : undefined,
        })
      })
    } else {
      const scheduledFor =
        action.scheduledFor ||
        action.execution?.scheduledFor ||
        workflow.metadata?.timeslotCreatedAt
      rows.push({
        ...base,
        parentActionId: action.actionId,
        executionId: undefined,
        actionId: action.actionId || `${workflow.workflowId}-${actionType}`,
        actionType,
        status: action.status,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      })
    }
  }
  return rows
}

/**
 * Complète le nœud `workflow` avec ce qui est déjà sur les lignes d’actions du plan
 * (`getActionsFromWorkflow` / réponse API) : catégorie, SM-, lignes `requestTimeslot`, etc.
 * Sans ça, `effectiveWorkflowStatusCode` et le chip WF restent sur un statut obsolète
 * alors que les cartes action (timeslot / staff) reflètent la réalité.
 */
export function mergeWorkflowWithPlanActionRows(workflow, planActions = []) {
  if (!workflow || !Array.isArray(planActions) || planActions.length === 0) {
    return workflow
  }
  const first = planActions.find((a) => !a.isPlaceholder) || planActions[0]
  const sm = planActions.map((a) => a.timeslotCode).find((c) => c && String(c).startsWith('SM-'))
  const category = workflow.category || first?.category
  const categoryType = workflow.categoryType || first?.categoryType
  const categoryDisplayLabel = workflow.categoryDisplayLabel || first?.categoryDisplayLabel

  let out = { ...workflow }
  if (category && !workflow.category) out.category = category
  if (categoryType && !workflow.categoryType) out.categoryType = categoryType
  if (categoryDisplayLabel && !workflow.categoryDisplayLabel) {
    out.categoryDisplayLabel = categoryDisplayLabel
  }
  if (sm && !workflow.timeslotCode) out.timeslotCode = sm

  const rtSrc = workflow.actions?.requestTimeslot
  const rows = planActions.filter((a) => String(a.actionType) === 'requestTimeslot')
  if (rows.length === 0) return out

  const executions = rows
    .filter((a) => a.executionId)
    .map((a) => {
      const at = a.scheduledFor
      const scheduledAt =
        at instanceof Date ? at.toISOString() : at != null ? String(at) : null
      return {
        executionId: a.executionId,
        status: a.status,
        scheduledAt,
        scheduledFor: scheduledAt,
        skippedReason: a.skippedReason,
        metadata: a.execMetadata,
      }
    })

  const needSyntheticRt =
    !rtSrc ||
    !Array.isArray(rtSrc.scheduledExecutions) ||
    rtSrc.scheduledExecutions.length === 0

  if (needSyntheticRt && executions.length > 0) {
    out = {
      ...out,
      actions: {
        ...(out.actions || {}),
        requestTimeslot: {
          ...(typeof rtSrc === 'object' && rtSrc ? rtSrc : {}),
          actionId: rtSrc?.actionId || rows[0]?.parentActionId,
          status: rtSrc?.status || rows[0]?.status,
          scheduledExecutions: executions,
        },
      },
    }
  }

  logOrchWf('mergeWorkflow', {
    workflowId: out.workflowId,
    timeslotCode: out.timeslotCode,
    category: out.category,
    categoryType: out.categoryType,
    syntheticRtExecs: out.actions?.requestTimeslot?.scheduledExecutions?.length ?? 0,
  })
  return out
}

export function chipColorForWorkflowHeader(wfStatus, workflow) {
  if (workflow && isTimeslotChoiceWorkflow(workflow)) {
    return deriveTimeslotChoiceWorkflowChipColor(workflow)
  }
  if (workflow) {
    return deriveWorkflowColor(workflow)
  }
  return chipColorForWorkflowStatus(wfStatus)
}

export function chipColorForGranularStatus(status) {
  if (status === 'FAILED' || status === 'RETARD' || status === 'REMINDERS_EXHAUSTED') return 'error'
  if (status === 'LAST_SENT') return 'secondary'
  if (
    status === 'TERMINATED' ||
    status === 'ASSIGNMENTS_EXHAUSTED' ||
    status === 'NO_STAFF_AVAILABLE' ||
    status === 'LM_RELANCE'
  )
    return 'warning'
  if (status === 'COMPLETED' || status === 'DONE') return 'success'
  if (status === 'REMINDED' || status === 'INITIAL_SENT') return 'warning'
  return 'default'
}

export function chipColorForWorkflowStatus(st) {
  const s = String(st || '').toUpperCase()
  if (s === 'FAILED' || s === 'CANCELLED' || s === 'LAST_RELANCE') return 'error'
  if (s === 'COMPLETED' || s === 'EXECUTED') return 'success'
  if (s === 'IN_PROGRESS') return 'info'
  if (s === 'NOT_ASSIGNED') return 'warning'
  return 'default'
}

export function getOrchestrationStatusLabel(status) {
  if (status == null || status === '') return '—'
  let key = String(status)
    .normalize('NFKC')
    .trim()
    .toUpperCase()
  /** Valeurs parfois écrites en base / API à la place de PENDING. */
  if (
    key.includes('ATTENTE') &&
    key.includes('CLIENT') &&
    (key.includes('CHOIX') || key.includes('CHOISIR'))
  ) {
    logOrchWf('statusLabel', { step: 'mapKeyToPending', input: status, keyAfter: 'PENDING' })
    key = 'PENDING'
  }
  const labels = {
    PENDING: 'En attente',
    LAST_SENT: 'Dernier envoi (plus de relance auto)',
    INITIAL_SENT: 'Premier envoi',
    REMINDED: 'Relances',
    ALL_SENT: 'Toutes relances envoyées',
    RETARD: 'En retard',
    LM_RELANCE: 'Dernière minute',
    REMINDERS_EXHAUSTED: 'Relances terminées (attente client)',
    ASSIGNMENTS_EXHAUSTED: 'Tentatives staff épuisées',
    NO_STAFF_AVAILABLE: 'Aucun staff disponible',
    IN_PROGRESS: 'En cours',
    COMPLETED: 'Terminé',
    DONE: 'Fait',
    FAILED: 'Échec',
    TERMINATED: 'Terminé (sans succès auto)',
    ERROR: 'Erreur',
    SKIPPED: 'Ignoré',
    EXECUTED: 'Exécuté',
    CANCELLED: 'Annulé',
    INHIBITED: 'Inhibé',
    LAST_RELANCE: 'Dernière tentative (échec)',
    NOT_ASSIGNED: 'Non assigné',
  }
  const resolved = labels[key]
  if (resolved) return resolved
  const raw = String(status).normalize('NFKC').trim()
  const rawU = raw.toUpperCase()
  if (
    rawU.includes('ATTENTE') &&
    rawU.includes('CLIENT') &&
    (rawU.includes('CHOIX') || rawU.includes('CHOISIR'))
  ) {
    logOrchWf('statusLabel', { step: 'mapRawFrenchToPending', input: status, raw })
    return labels.PENDING
  }
  logOrchWf('statusLabel', { step: 'unmappedReturnRaw', input: status, key, raw })
  return raw
}

/** Compat dashboard (ex. NewWorkflowTimeline) — même libellé que le chip WF principal. */
export function workflowHeaderLabelWf(wfStatus) {
  return getOrchestrationStatusLabel(wfStatus)
}
