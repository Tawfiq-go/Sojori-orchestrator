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
