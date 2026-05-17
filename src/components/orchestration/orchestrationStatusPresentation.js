/**
 * Présentation harmonisée PR / WF / cartes timeline / chip technique.
 * Une seule sémantique « tone » → mêmes familles couleur partout (ActionCard, chip haut, panneau Registration).
 */

export const TONE_OK = 'ok'
export const TONE_ALERT = 'alert'
export const TONE_WARN = 'warn'
export const TONE_INFO = 'info'
export const TONE_NEUTRAL = 'neutral'

/** Statuts granulaires / workflow → tone (aligné chipColorForGranularStatus + lecture métier). */
export function toneFromGranularOrWorkflowStatus(status) {
  if (status == null || status === '') return TONE_NEUTRAL
  const u = String(status).trim().toUpperCase()

  if (['REMINDERS_EXHAUSTED', 'RETARD', 'FAILED', 'CANCELLED', 'ERROR'].includes(u)) {
    return TONE_ALERT
  }
  if (['NO_STAFF_AVAILABLE', 'ASSIGNMENTS_EXHAUSTED'].includes(u)) return TONE_WARN
  if (['TERMINATED', 'ALL_SENT'].includes(u)) return TONE_WARN
  if (['LM_RELANCE', 'REMINDED', 'INITIAL_SENT'].includes(u)) return TONE_INFO
  if (['COMPLETED', 'EXECUTED', 'MET', 'CONFIRMED', 'DONE'].includes(u)) return TONE_OK
  if (['SKIPPED', 'EXPIRED', 'CREATED', 'PENDING', 'IN_PROGRESS', 'ACTIVE', 'INHIBITED', 'INFO'].includes(u)) {
    return TONE_NEUTRAL
  }
  return TONE_NEUTRAL
}

/** Variantes historiques NewWorkflowTimeline → tone. */
export function toneFromCardBorderVariant(v) {
  if (!v) return null
  const m = {
    green: TONE_OK,
    blue: TONE_OK,
    red: TONE_ALERT,
    orange: TONE_WARN,
    amber: TONE_WARN,
    cyan: TONE_INFO,
    gray: TONE_NEUTRAL,
  }
  return m[v] ?? null
}

/**
 * Tone pour ActionCard : statut d’abord ; si neutre et variante explicite, la variante gagne.
 */
export function resolveActionCardTone(status, cardBorderVariant, isLate) {
  const s = String(status || '').trim().toUpperCase()
  if (s === 'PENDING' && isLate) return TONE_ALERT

  const fromStatus = toneFromGranularOrWorkflowStatus(status)
  const fromVariant = toneFromCardBorderVariant(cardBorderVariant)

  if (fromStatus !== TONE_NEUTRAL) return fromStatus
  if (fromVariant) return fromVariant
  return TONE_NEUTRAL
}

const CARD_SKIN = {
  [TONE_OK]: 'bg-emerald-50 border-emerald-300 hover:border-emerald-400 text-emerald-900',
  [TONE_ALERT]: 'bg-red-50 border-red-300 hover:border-red-400 text-red-900',
  [TONE_WARN]: 'bg-orange-50 border-orange-300 hover:border-orange-400 text-orange-950',
  [TONE_INFO]: 'bg-cyan-50 border-cyan-300 hover:border-cyan-400 text-cyan-950',
  [TONE_NEUTRAL]: 'bg-slate-50 border-slate-300 hover:border-slate-400 text-slate-800',
}

const CHIP_SKIN = {
  [TONE_OK]: 'bg-emerald-50 text-emerald-950 border border-emerald-400',
  [TONE_ALERT]: 'bg-red-50 text-red-950 border border-red-400',
  [TONE_WARN]: 'bg-orange-50 text-orange-950 border border-orange-400',
  [TONE_INFO]: 'bg-cyan-50 text-cyan-950 border border-cyan-400',
  [TONE_NEUTRAL]: 'bg-slate-100 text-slate-800 border border-slate-300',
}

export function getActionCardSkinClasses(tone) {
  return CARD_SKIN[tone] || CARD_SKIN[TONE_NEUTRAL]
}

export function getActionCardTitleTextClass(tone) {
  const m = {
    [TONE_OK]: 'text-emerald-900',
    [TONE_ALERT]: 'text-red-900',
    [TONE_WARN]: 'text-orange-950',
    [TONE_INFO]: 'text-cyan-950',
    [TONE_NEUTRAL]: 'text-slate-800',
  }
  return m[tone] || m[TONE_NEUTRAL]
}

/** Libellé court chip technique (bandeau ActionCard) — cohérent avec getOrchestrationStatusLabel côté sens. */
function technicalChipLabel(status) {
  if (status === undefined || status === null || status === '') return '—'
  const u = String(status).trim().toUpperCase()
  if (u === 'LM_RELANCE') return 'Dernière minute'
  if (u === 'RETARD') return 'Retard'
  if (u === 'REMINDERS_EXHAUSTED') return 'Relances terminées'
  return u
}

/** Chip technique + tone (remplace la logique éclatée dans workflowUtils). */
export function getTechnicalPlanChipPresentation(status) {
  if (status === undefined || status === null || status === '') {
    return { label: '—', chipClass: CHIP_SKIN[TONE_NEUTRAL], tone: TONE_NEUTRAL }
  }
  const label = technicalChipLabel(status)
  const tone = toneFromGranularOrWorkflowStatus(String(status).trim().toUpperCase())
  return { label, chipClass: CHIP_SKIN[tone] || CHIP_SKIN[TONE_NEUTRAL], tone }
}

/** Panneau Registration (gradient bordure) — même tones que ActionCard. */
export function getRegistrationPanelSkin(tone) {
  const skins = {
    [TONE_OK]: {
      outer: 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300',
      text: 'text-emerald-900',
      innerStats: 'bg-emerald-50/80 p-2 rounded-lg border border-emerald-200',
    },
    [TONE_ALERT]: {
      outer: 'bg-gradient-to-br from-red-50 to-red-100 border-red-300',
      text: 'text-red-900',
      innerStats: 'bg-red-50/90 p-2 rounded-lg border border-red-200',
    },
    [TONE_WARN]: {
      outer: 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-300',
      text: 'text-orange-900',
      innerStats: 'bg-orange-50/90 p-2 rounded-lg border border-orange-200',
    },
    [TONE_INFO]: {
      outer: 'bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-300',
      text: 'text-cyan-900',
      innerStats: 'bg-cyan-50/90 p-2 rounded-lg border border-cyan-200',
    },
    [TONE_NEUTRAL]: {
      outer: 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300',
      text: 'text-slate-900',
      innerStats: 'bg-slate-50 p-2 rounded-lg border border-slate-200',
    },
  }
  return skins[tone] || skins[TONE_NEUTRAL]
}

/**
 * Tone registration : completed WF → ok ; échec send ; sinon dérivé granulaire (sendNotif ou fallback PENDING).
 */
export function resolveRegistrationTone({ isRegCompleted, sendNotifFailed, derivedRegistrationStatus }) {
  if (isRegCompleted) return TONE_OK
  if (sendNotifFailed) return TONE_ALERT
  return toneFromGranularOrWorkflowStatus(derivedRegistrationStatus)
}
