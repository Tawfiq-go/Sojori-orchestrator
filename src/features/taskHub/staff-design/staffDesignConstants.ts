/**
 * Labels & pills staff — types réellement assignables à l’équipe terrain.
 * Les parcours voyageur (choix/déclaration/enregistrement) ne sont plus des tâches staff.
 */
import {
  FULLTASK_TASK_TYPES,
  FULLTASK_TASK_TYPE_EMOJI,
  labelForTaskTypeId,
  type FulltaskTaskTypeId,
} from './fulltaskTaskTypes';

/**
 * Types exclus de l’annuaire / assignation staff :
 * flux client (WhatsApp / OTA), plus de tâches opérationnelles terrain.
 */
export const STAFF_EXCLUDED_TASK_TYPES = [
  'arrival_choose',
  'departure_choose',
  'arrival_declare',
  'departure_declare',
  'registration',
] as const;

const EXCLUDED = new Set<string>(STAFF_EXCLUDED_TASK_TYPES);

/** Catalogue staff = fulltask minus parcours voyageur. */
export const STAFF_ASSIGNABLE_TASK_TYPES = FULLTASK_TASK_TYPES.filter(
  (t) => !EXCLUDED.has(t),
) as FulltaskTaskTypeId[];

/** Libellés courts UI équipe terrain. */
const STAFF_PILL_LABEL_OVERRIDES: Partial<Record<FulltaskTaskTypeId, string>> = {
  cleaning_free: 'Ménage gratuit',
  cleaning_paid: 'Ménage payant',
  receive_arrival: 'Accueil arrivée',
  receive_departure: 'Accueil départ',
  checkout_cleaning: 'Ménage Sojori',
};

export const STAFF_TASK_PILLS = STAFF_ASSIGNABLE_TASK_TYPES.map((key) => ({
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

/** Libellés complets (index = dayOfWeek JS). */
export const DAY_FULL_LABELS = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
] as const;

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
  check_in: 'receive_arrival',
  check_out: 'receive_departure',
  /** Anciens types voyageur → plus assignables ; mappés vers l’accueil terrain. */
  arrival_choose: 'receive_arrival',
  departure_choose: 'receive_departure',
  arrival_declare: 'receive_arrival',
  departure_declare: 'receive_departure',
  registration: 'receive_arrival',
  maintenance: 'support',
  inventory: 'support',
};

export function normalizeStaffAllowedTaskType(type: string): FulltaskTaskTypeId | null {
  const key = String(type || '').trim();
  if (EXCLUDED.has(key)) {
    return LEGACY_TASK_TYPE_MAP[key] ?? null;
  }
  if ((STAFF_ASSIGNABLE_TASK_TYPES as readonly string[]).includes(key)) {
    return key as FulltaskTaskTypeId;
  }
  const mapped = LEGACY_TASK_TYPE_MAP[key];
  if (mapped && !EXCLUDED.has(mapped)) return mapped;
  return null;
}

/** Filtre + dédoublonne les types autorisés (purge parcours voyageur). */
export function sanitizeStaffAllowedTaskTypes(types: string[] | undefined): FulltaskTaskTypeId[] {
  const out: FulltaskTaskTypeId[] = [];
  const seen = new Set<string>();
  for (const raw of types || []) {
    const n = normalizeStaffAllowedTaskType(raw);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

export function pillLabelForType(type: string): { label: string; emoji: string } | null {
  const canonical = normalizeStaffAllowedTaskType(type) ?? type;
  const found = STAFF_TASK_PILLS.find((p) => p.key === canonical);
  if (found) return found;
  if (EXCLUDED.has(canonical)) return null;
  return { label: labelForTaskTypeId(canonical), emoji: '📋' };
}
