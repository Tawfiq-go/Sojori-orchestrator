import type { CatalogMessage } from './types';

export type CatalogPickerScope = 'relance' | 'reservation' | 'all';

export function filterCatalogByScope(
  catalog: CatalogMessage[],
  scope: CatalogPickerScope,
): CatalogMessage[] {
  if (scope === 'all') return catalog;
  if (scope === 'relance') {
    return catalog.filter((c) => c.id.startsWith('msg_relance_'));
  }
  return catalog.filter((c) => !c.id.startsWith('msg_relance_'));
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
