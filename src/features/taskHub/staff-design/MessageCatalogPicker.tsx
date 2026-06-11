import type { CatalogMessage } from './types';
import { RELANCE_MESSAGE_BY_TASK_TYPE } from '../../../utils/fulltaskMappers';
import {
  defaultStaffReminderMessageId,
  STAFF_REMINDER_TEMPLATE_OPTIONS,
} from './staffReminderTemplates';

export type CatalogPickerScope = 'relance' | 'reservation' | 'all';

export function filterCatalogByScope(
  catalog: CatalogMessage[],
  scope: CatalogPickerScope,
): CatalogMessage[] {
  if (scope === 'all') return catalog;
  if (scope === 'relance') {
    return catalog.filter(c => c.id.startsWith('msg_relance_'));
  }
  return catalog.filter(c => !c.id.startsWith('msg_relance_'));
}

/** Templates relance voyageur — catalogue client uniquement, filtré par type de tâche si connu. */
export function clientRelanceTemplatesForTask(
  catalog: CatalogMessage[],
  taskTypeId?: string,
): CatalogMessage[] {
  const relances = filterCatalogByScope(catalog, 'relance');
  if (!taskTypeId) return relances;
  const preferredId = RELANCE_MESSAGE_BY_TASK_TYPE[taskTypeId];
  if (!preferredId) return relances;
  const match = relances.filter(c => c.id === preferredId);
  return match.length > 0 ? match : relances;
}

/** Templates rappel staff WhatsApp — slugs staff_reminder_* pour ce type de tâche. */
export function staffReminderTemplatesForTask(
  taskTypeId: string,
): { id: string; label: string }[] {
  const preferredId = defaultStaffReminderMessageId(taskTypeId);
  const match = STAFF_REMINDER_TEMPLATE_OPTIONS.filter(o => o.id === preferredId);
  return match.length > 0
    ? match
    : STAFF_REMINDER_TEMPLATE_OPTIONS.filter(o => o.id === 'staff_reminder_generic');
}

interface Props {
  catalog: CatalogMessage[];
  selectedId: string;
  onChange: (messageId: string) => void;
  scope?: CatalogPickerScope;
  /** chips = cases côte à côte (orchestration) · select = liste déroulante */
  variant?: 'chips' | 'select';
}

export default function MessageCatalogPicker({
  catalog,
  selectedId,
  onChange,
  scope = 'all',
  variant = 'chips',
}: Props) {
  const items = filterCatalogByScope(catalog, scope);

  if (items.length === 0) {
    return (
      <span className="orch-msg-pick-empty">
        Aucun message — onglet <b>Messages</b> puis <b>+ Ajouter</b> ou Enregistrer.
      </span>
    );
  }

  if (variant === 'select') {
    return (
      <select
        className="input orch-msg-select"
        value={selectedId}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {items.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label || c.id}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="orch-msg-chips" role="group" aria-label="Choisir un message">
      {items.map((c) => {
        const on = selectedId === c.id;
        return (
          <label key={c.id} className={`orch-msg-chip${on ? ' on' : ''}`} title={c.id}>
            <input
              type="checkbox"
              checked={on}
              onChange={() => onChange(on ? '' : c.id)}
            />
            <span className="orch-msg-chip-lbl">{c.label || c.id}</span>
          </label>
        );
      })}
    </div>
  );
}
