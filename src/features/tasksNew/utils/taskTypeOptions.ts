import {
  FULLTASK_TASK_TYPE_EMOJI,
  labelForTaskTypeId,
} from '../../taskHub/staff-design/fulltaskTaskTypes';

export type TaskTypeOption = { id: string; label: string; count: number };

/**
 * Options du filtre Type : uniquement les types présents dans les tâches
 * chargées, avec leur nombre, les plus fréquents en premier. Les types déjà
 * cochés restent listés (à 0) pour pouvoir les décocher. Demande Tawfiq 12/09 :
 * les 22 types du référentiel noyaient Expérience, Navette, Room service.
 */
export function buildTaskTypeOptions(
  tasks: Array<{ type?: string | null; subType?: string | null }>,
  selected: string[] = [],
): TaskTypeOption[] {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    const id = String(t.type || t.subType || '').trim();
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const id of selected) if (id && !counts.has(id)) counts.set(id, 0);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id, count]) => ({
      id,
      count,
      label: `${FULLTASK_TASK_TYPE_EMOJI[id as keyof typeof FULLTASK_TASK_TYPE_EMOJI] || '📋'} ${labelForTaskTypeId(id)}${count ? ` (${count})` : ''}`,
    }));
}
