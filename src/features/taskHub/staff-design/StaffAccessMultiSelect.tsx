import { useEffect, useMemo, useRef, useState } from 'react';

export type StaffAccessOption = { id: string; label: string; emoji?: string };

type Props = {
  options: StaffAccessOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  addLabel?: string;
};

export default function StaffAccessMultiSelect({
  options,
  selectedIds,
  onChange,
  disabled = false,
  placeholder = 'Aucune sélection',
  searchPlaceholder = 'Rechercher…',
  emptyLabel = 'Aucun résultat',
  addLabel = '+ Ajouter',
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedItems = useMemo(
    () =>
      selectedIds
        .map((id) => options.find((o) => o.id === id))
        .filter(Boolean) as StaffAccessOption[],
    [options, selectedIds],
  );

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;
    return [...list].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggleId = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  const removeId = (id: string) => {
    onChange(selectedIds.filter((x) => x !== id));
  };

  return (
    <div className={`access-multi${disabled ? ' disabled' : ''}`} ref={rootRef}>
      <div className="access-selected-chips">
        {selectedItems.length === 0 ? (
          <span className="access-empty">{placeholder}</span>
        ) : (
          selectedItems.map((item) => (
            <span key={item.id} className="access-chip">
              {item.emoji ? <span className="access-chip-emoji">{item.emoji}</span> : null}
              <span className="access-chip-label">{item.label}</span>
              {!disabled ? (
                <button
                  type="button"
                  className="access-chip-x"
                  aria-label={`Retirer ${item.label}`}
                  onClick={() => removeId(item.id)}
                >
                  ✕
                </button>
              ) : null}
            </span>
          ))
        )}
      </div>

      {!disabled ? (
        <div className="access-picker">
          <button
            type="button"
            className={`access-add-btn${open ? ' on' : ''}`}
            onClick={() => setOpen((v) => !v)}
          >
            {addLabel}
          </button>
          {open ? (
            <div className="access-dropdown">
              <input
                className="input access-search"
                type="search"
                value={search}
                placeholder={searchPlaceholder}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              <div className="access-options" role="listbox">
                {filteredOptions.length === 0 ? (
                  <div className="access-option-empty">{emptyLabel}</div>
                ) : (
                  filteredOptions.map((opt) => {
                    const checked = selectedSet.has(opt.id);
                    return (
                      <label key={opt.id} className={`access-option${checked ? ' on' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleId(opt.id)}
                        />
                        {opt.emoji ? <span className="access-opt-emoji">{opt.emoji}</span> : null}
                        <span className="access-opt-label">{opt.label}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
