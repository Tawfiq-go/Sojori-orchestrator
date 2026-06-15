/**
 * ═══════════════════════════════════════════════════════════════════
 * Module partagé : dérivations statuts orchestration v2
 * ═══════════════════════════════════════════════════════════════════
 *
 * PARTAGÉ entre backend (srv-fulltask) ET frontend (Sojori-orchestrator).
 * Centralise TOUTE la logique de calcul de statuts dérivés.
 *
 * Règles :
 * - `en_retard` JAMAIS stocké, toujours dérivé
 * - Statuts de blocs/séquences dérivés des atomes
 * - Logique identique backend/frontend (fini la dispersion)
 */

import type {
  AssignationDoc,
  AtomeStatus,
  EscaladeDoc,
  PlanDocShape,
  PlanStatus,
  RelanceDoc,
  SequenceDoc,
  SequenceStatus,
  StaffReminderDoc,
} from '../types/planOrchestrationV2'

// ═══════════════════════════════════════════════════════════════════
// 1. UTILITAIRES DE BASE
// ═══════════════════════════════════════════════════════════════════

/**
 * Un atome est en retard si `en_attente` ET date passée
 */
export function isEnRetard(
  line: { status: AtomeStatus; scheduledAt: Date | string },
  now: Date = new Date(),
): boolean {
  const scheduledDate = typeof line.scheduledAt === 'string' ? new Date(line.scheduledAt) : line.scheduledAt
  return line.status === 'en_attente' && scheduledDate < now
}

/**
 * Statut terminal (ne changera plus)
 */
export function isTerminal(status: AtomeStatus): boolean {
  return status === 'fait' || status === 'saute' || status === 'echec'
}

// ═══════════════════════════════════════════════════════════════════
// 2. DÉRIVATIONS BLOCS
// ═══════════════════════════════════════════════════════════════════

/**
 * Bloc relance voyageur (résolu par RÉSULTAT, pas par épuisement)
 *
 * - Si client a fait l'action (action_completed) → 'termine'
 * - Sinon dérivé des lignes :
 *   - Un `en_retard` → 'en_retard'
 *   - Au moins un `fait` → 'en_cours'
 *   - Tout `saute`/`fait` → 'termine'
 *   - Sinon 'en_attente'
 */
export function deriveRelanceBlockStatus(
  relances: RelanceDoc[],
  actionCompleted: boolean = false,
  now: Date = new Date(),
): SequenceStatus {
  if (relances.length === 0) return 'en_attente'
  if (actionCompleted) return 'termine'

  const hasEnRetard = relances.some((r) => isEnRetard(r, now))
  if (hasEnRetard) return 'en_retard'

  const hasFait = relances.some((r) => r.status === 'fait')
  if (hasFait) return 'en_cours'

  const allTerminal = relances.every((r) => isTerminal(r.status))
  if (allTerminal) return 'termine'

  return 'en_attente'
}

/**
 * Bloc rappel staff (hérite de ses lignes)
 *
 * Même logique que relance, SANS la résolution par action client.
 */
export function deriveStaffReminderBlockStatus(
  reminders: StaffReminderDoc[],
  now: Date = new Date(),
): SequenceStatus {
  if (reminders.length === 0) return 'en_attente'

  const hasEnRetard = reminders.some((r) => isEnRetard(r, now))
  if (hasEnRetard) return 'en_retard'

  const hasFait = reminders.some((r) => r.status === 'fait')
  if (hasFait) return 'en_cours'

  const allTerminal = reminders.every((r) => isTerminal(r.status))
  if (allTerminal) return 'termine'

  return 'en_attente'
}

/**
 * Bloc assignation (statut GLOBAL enrichi)
 *
 * États :
 * - `en_attente` : fenêtre pas encore ouverte
 * - `en_cours` : recherche active, pas encore trouvé
 * - `attente_acceptation` : staff trouvé, en attente acceptation
 * - `termine` : staff accepté
 * - `echec` : fenêtre fermée sans staff accepté
 *
 * Retourne aussi `en_retard` si fenêtre fermée sans succès (dérivé).
 */
export function deriveAssignationBlockStatus(
  assignation: AssignationDoc | null,
  now: Date = new Date(),
): SequenceStatus {
  if (!assignation) return 'en_attente'

  const { status, startAt, endAt } = assignation
  const startDate = typeof startAt === 'string' ? new Date(startAt) : startAt
  const endDate = typeof endAt === 'string' ? new Date(endAt) : endAt
  const windowClosed = now > endDate

  // Terminé
  if (status === 'termine') return 'termine'

  // Échec confirmé
  if (status === 'echec') return 'bloque'

  // Fenêtre fermée sans succès → en_retard (dérivé)
  if (windowClosed && (status === 'en_cours' || status === 'attente_acceptation')) {
    return 'en_retard'
  }

  // En attente acceptation
  if (status === 'attente_acceptation') return 'en_cours'

  // En cours de recherche
  if (status === 'en_cours') return 'en_cours'

  // Fenêtre pas encore ouverte
  if (now < startDate) return 'en_attente'

  return 'en_attente'
}

/**
 * Bloc escalade/deadline
 */
export function deriveEscaladeBlockStatus(
  escalade: EscaladeDoc | null,
  now: Date = new Date(),
): SequenceStatus {
  if (!escalade) return 'en_attente'

  if (escalade.status === 'fait') return 'termine'
  if (escalade.status === 'saute') return 'termine' // Sauté = terminé

  // En retard si date passée et pas déclenché
  if (isEnRetard(escalade, now)) return 'en_retard'

  return 'en_attente'
}

// ═══════════════════════════════════════════════════════════════════
// 3. DÉRIVATIONS SÉQUENCES
// ═══════════════════════════════════════════════════════════════════

/**
 * Séquence `kind: 'task'` — miroir exclusif de task.status (aligné srv-fulltask).
 * Les blocs relances / assignation / escalade ne pilotent pas le statut séquence.
 */
export function deriveSequenceTaskStatus(
  _sequence: SequenceDoc,
  task?: { status?: string },
): SequenceStatus {
  if (!task?.status) return 'en_attente'
  const taskStatus = task.status.toLowerCase()
  if (taskStatus === 'done') return 'termine'
  if (taskStatus === 'cancelled' || taskStatus === 'rejected') return 'annule'
  return 'en_cours'
}

/**
 * Séquence `kind: 'message'` (logique simple)
 *
 * Dérivée des lignes message :
 * - Tout `fait`/`saute` → `termine`
 * - Un `en_retard` → `en_retard`
 * - Au moins un `fait` → `en_cours`
 * - Sinon `en_attente`
 */
export function deriveSequenceMessageStatus(
  sequence: SequenceDoc,
  now: Date = new Date(),
): SequenceStatus {
  // Pour kind:message, on regarde principalement les relances (messages)
  return deriveRelanceBlockStatus(sequence.relances, false, now)
}

/**
 * Dérivation séquence COMPLÈTE (branche selon kind)
 * kind:task → miroir task.status ; kind:message → relances.
 */
export function deriveSequenceStatus(
  sequence: SequenceDoc,
  now: Date = new Date(),
  task?: { status?: string },
): SequenceStatus {
  if (sequence.kind === 'message') {
    return deriveSequenceMessageStatus(sequence, now)
  }
  return deriveSequenceTaskStatus(sequence, task)
}

// ═══════════════════════════════════════════════════════════════════
// 4. DÉRIVATION STATUT PLAN (cycle de vie propre)
// ═══════════════════════════════════════════════════════════════════

export interface ReservationContext {
  status: string // 'completed', 'confirmed', 'cancelled', etc.
}

/**
 * Calcule le statut du plan (NE dérive PAS des séquences)
 *
 * Règles :
 * - `cree` → `completed` quand :
 *   1. Réservation est completed
 *   2. ET tous les messages sont terminés (aucun `en_attente` dans messages[] ni sequences[].kind='message')
 * - Les sequences `kind: 'task'` NE bloquent PAS la complétion
 */
export function recomputePlanStatus(
  plan: PlanDocShape,
  reservation: ReservationContext,
): PlanStatus {
  // Si déjà archived, rester archived
  if (plan.status === 'archived') return 'archived'

  // Réservation completed ? (case-insensitive pour robustesse)
  const reservationCompleted = reservation.status?.toLowerCase() === 'completed'

  if (!reservationCompleted) {
    return 'cree'
  }

  // Tous les messages terminés ?
  const pendingMessages = plan.messages.filter((m) => m.status === 'en_attente')
  const pendingMessageSequences = plan.sequences.filter(
    (s) => s.kind === 'message' && s.status !== 'termine',
  )

  const allMessagesDone = pendingMessages.length === 0 && pendingMessageSequences.length === 0

  if (reservationCompleted && allMessagesDone) {
    return 'completed'
  }

  return 'cree'
}

// ═══════════════════════════════════════════════════════════════════
// 5. NEXT ACTION (prochaine action à venir)
// ═══════════════════════════════════════════════════════════════════

export interface NextAction {
  type: 'message' | 'relance' | 'reminder' | 'assignation' | 'escalade' | null
  label: string
  scheduledAt: Date | null
  /** Tick d'heure pleine suivant (cron horaire) */
  executionAt: Date | null
}

/**
 * Calcule la prochaine action à venir (plus petit scheduledAt en attente)
 */
export function computeNextAction(plan: PlanDocShape): NextAction {
  const candidates: Array<{ type: NextAction['type']; label: string; scheduledAt: Date }> = []

  // Messages
  for (const msg of plan.messages) {
    if (msg.status === 'en_attente') {
      const scheduledDate = typeof msg.scheduledAt === 'string' ? new Date(msg.scheduledAt) : msg.scheduledAt
      candidates.push({
        type: 'message',
        label: msg.label,
        scheduledAt: scheduledDate,
      })
    }
  }

  // Séquences
  for (const seq of plan.sequences) {
    // Relances
    for (const rel of seq.relances) {
      if (rel.status === 'en_attente') {
        const scheduledDate = typeof rel.scheduledAt === 'string' ? new Date(rel.scheduledAt) : rel.scheduledAt
        candidates.push({
          type: 'relance',
          label: rel.label,
          scheduledAt: scheduledDate,
        })
      }
    }

    // Rappels staff
    for (const rem of seq.staffReminders) {
      if (rem.status === 'en_attente') {
        const scheduledDate = typeof rem.scheduledAt === 'string' ? new Date(rem.scheduledAt) : rem.scheduledAt
        candidates.push({
          type: 'reminder',
          label: rem.label,
          scheduledAt: scheduledDate,
        })
      }
    }

    // Assignation (ouverture fenêtre)
    if (seq.assignation && seq.assignation.status === 'en_attente') {
      const startDate = typeof seq.assignation.startAt === 'string'
        ? new Date(seq.assignation.startAt)
        : seq.assignation.startAt
      candidates.push({
        type: 'assignation',
        label: `Assignation ${seq.taskType}`,
        scheduledAt: startDate,
      })
    }

    // Escalade
    if (seq.escalade && seq.escalade.status === 'en_attente') {
      const scheduledDate = typeof seq.escalade.scheduledAt === 'string'
        ? new Date(seq.escalade.scheduledAt)
        : seq.escalade.scheduledAt
      candidates.push({
        type: 'escalade',
        label: `Escalade ${seq.taskType}`,
        scheduledAt: scheduledDate,
      })
    }
  }

  if (candidates.length === 0) {
    return { type: null, label: '', scheduledAt: null, executionAt: null }
  }

  // Trouver la plus proche
  candidates.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
  const next = candidates[0]

  // Calcul executionAt (tick d'heure pleine suivant)
  const executionAt = new Date(Math.ceil(next.scheduledAt.getTime() / 3600000) * 3600000)

  return {
    type: next.type,
    label: next.label,
    scheduledAt: next.scheduledAt,
    executionAt,
  }
}
