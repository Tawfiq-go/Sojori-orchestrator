import {
  FULLTASK_TASK_TYPE_EMOJI,
  labelForTaskTypeId,
} from '../../taskHub/staff-design/fulltaskTaskTypes';

export type TaskTypeOption = { id: string; label: string; count: number };

/**
 * Famille « Option séjour » unifiée : ambiance (villa_experience), piscine/beds
 * (stay_option) et les anciens tickets support pas encore migrés — un seul
 * type dans le filtre, jamais « Support » (demande Tawfiq 13/09).
 */
export const STAY_OPTION_FAMILY_ID = 'stay_option_family';

function isStayOptionFamilyTask(t: { type?: string | null; stayOptionSubLabel?: string | null }): boolean {
  return t.type === 'villa_experience' || t.type === 'stay_option' || Boolean(t.stayOptionSubLabel);
}

/** id de filtre (réel ou STAY_OPTION_FAMILY_ID) → types réels à envoyer au backend. */
export function expandTaskTypeFilterIds(ids: string[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    if (id === STAY_OPTION_FAMILY_ID) {
      out.push('villa_experience', 'stay_option', 'support');
    } else {
      out.push(id);
    }
  }
  return Array.from(new Set(out));
}

/**
 * Options du filtre Type : uniquement les types présents dans les tâches
 * chargées, avec leur nombre, les plus fréquents en premier. Les types déjà
 * cochés restent listés (à 0) pour pouvoir les décocher. Demande Tawfiq 12/09 :
 * les 22 types du référentiel noyaient Expérience, Navette, Room service.
 */
export function buildTaskTypeOptions(
  tasks: Array<{ type?: string | null; subType?: string | null; stayOptionSubLabel?: string | null }>,
  selected: string[] = [],
): TaskTypeOption[] {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (isStayOptionFamilyTask(t)) {
      counts.set(STAY_OPTION_FAMILY_ID, (counts.get(STAY_OPTION_FAMILY_ID) ?? 0) + 1);
      continue;
    }
    const id = String(t.type || t.subType || '').trim();
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const id of selected) if (id && !counts.has(id)) counts.set(id, 0);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id, count]) => ({
      id,
      count,
      label:
        id === STAY_OPTION_FAMILY_ID
          ? `🏖️ Option séjour${count ? ` (${count})` : ''}`
          : `${FULLTASK_TASK_TYPE_EMOJI[id as keyof typeof FULLTASK_TASK_TYPE_EMOJI] || '📋'} ${labelForTaskTypeId(id)}${count ? ` (${count})` : ''}`,
    }));
}
