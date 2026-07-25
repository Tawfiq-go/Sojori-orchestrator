/**
 * Labels & pills staff — alignés catalogue admin (13 types fulltask granulaires).
 */
import {
  FULLTASK_TASK_TYPES,
  FULLTASK_TASK_TYPE_EMOJI,
  labelForTaskTypeId,
  type FulltaskTaskTypeId,
} from './fulltaskTaskTypes';

/** Libellés courts UI équipe terrain (même split que admin push). */
const STAFF_PILL_LABEL_OVERRIDES: Partial<Record<FulltaskTaskTypeId, string>> = {
  cleaning_free: 'Ménage gratuit',
  cleaning_paid: 'Ménage payant',
  arrival_choose: 'Choisir arrivée',
  departure_choose: 'Choisir départ',
  arrival_declare: 'Déclarer arrivée',
  departure_declare: 'Déclarer départ',
  receive_arrival: 'Accueil arrivée',
  receive_departure: 'Accueil départ',
  registration: 'Enregistrement',
  checkout_cleaning: 'Ménage Sojori',
};

export const STAFF_TASK_PILLS = FULLTASK_TASK_TYPES.map((key) => ({
  key,
  label: STAFF_PILL_LABEL_OVERRIDES[key] ?? labelForTaskTypeId(key),
  emoji: FULLTASK_TASK_TYPE_EMOJI[key] ?? '📋',
}));

/**
 * ⚠️ CRITICAL : l'index DOIT suivre la convention JS/backend (Dimanche = 0),
 * car il est envoyé tel quel dans Staff.schedule[].dayOfWeek et lu par
 * assignmentService (map { Sun:0, Mon:1, ... }). Un tableau commençant par
 * Lundi décalait tous les plannings d'un jour.
 * L'ordre d'AFFICHAGE (lundi d'abord) est géré par DAY_DISPLAY_ORDER.
 */
export const DAY_LABELS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'] as const;

/** Ordre d'affichage lundi → dimanche, valeurs = index DAY_LABELS. */
export const DAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const LANG_OPTIONS = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'Darija' },
] as const;
export type WorkLang = (typeof LANG_OPTIONS)[number]['value'];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const LEGACY_TASK_TYPE_MAP: Record<string, FulltaskTaskTypeId> = {
  cleaning_in_out: 'cleaning_free',
  cleaning_mid_stay: 'cleaning_paid',
  check_in: 'arrival_choose',
  check_out: 'departure_choose',
  maintenance: 'support',
  inventory: 'support',
};

export function normalizeStaffAllowedTaskType(type: string): FulltaskTaskTypeId | null {
  const key = String(type || '').trim();
  if ((FULLTASK_TASK_TYPES as readonly string[]).includes(key)) {
    return key as FulltaskTaskTypeId;
  }
  return LEGACY_TASK_TYPE_MAP[key] ?? null;
}

export function pillLabelForType(type: string): { label: string; emoji: string } | null {
  const canonical = normalizeStaffAllowedTaskType(type) ?? type;
  const found = STAFF_TASK_PILLS.find((p) => p.key === canonical);
  if (found) return found;
  return { label: labelForTaskTypeId(canonical), emoji: '📋' };
}

/**
 * Métiers = préréglages du formulaire simplifié. Choisir un métier remplit
 * d'un coup les types de tâches (le client n'a pas à trier 15 clés techniques
 * dont les libellés décrivent un modèle de facturation, pas un travail).
 * « Personnalisé » = l'utilisateur a modifié la sélection à la main.
 */
export const STAFF_JOB_PRESETS = [
  {
    id: 'menage',
    emoji: '🧹',
    label: 'Ménage',
    desc: 'Ménages entre séjours et à la demande',
    taskTypes: ['cleaning_free', 'cleaning_paid', 'checkout_cleaning'],
  },
  {
    id: 'accueil',
    emoji: '🙋',
    label: 'Accueil',
    desc: 'Arrivées, départs, remise des clés',
    taskTypes: [
      'receive_arrival',
      'receive_departure',
      'arrival_declare',
      'departure_declare',
      'registration',
    ],
  },
  {
    id: 'conciergerie',
    emoji: '🛎',
    label: 'Conciergerie',
    desc: 'Transport, courses, demandes voyageurs',
    taskTypes: ['transport', 'groceries', 'concierge', 'support', 'service_client'],
  },
  {
    id: 'polyvalent',
    emoji: '✳️',
    label: 'Polyvalent',
    desc: 'Toutes les tâches',
    taskTypes: [...FULLTASK_TASK_TYPES],
  },
] as const;

export type StaffJobPresetId = (typeof STAFF_JOB_PRESETS)[number]['id'];

/** Retrouve le métier correspondant à une sélection, sinon null (= personnalisé). */
export function jobPresetForTaskTypes(taskTypes: string[] | undefined): StaffJobPresetId | null {
  const set = new Set(taskTypes ?? []);
  if (set.size === 0) return null;
  for (const preset of STAFF_JOB_PRESETS) {
    if (
      preset.taskTypes.length === set.size &&
      preset.taskTypes.every((t) => set.has(t))
    ) {
      return preset.id;
    }
  }
  return null;
}
