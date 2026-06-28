import { useEffect, useMemo, useRef, useState } from 'react';

export type SearchSelectOption = {
  value: string;
  label: string;
  group?: string;
  hint?: string;
};

type SearchSelectProps = {
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string, option?: SearchSelectOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  required?: boolean;
  disabled?: boolean;
};

export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Choisir…',
  searchPlaceholder = 'Rechercher…',
  emptyMessage = 'Aucun résultat',
  required,
  disabled,
}: SearchSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.group?.toLowerCase().includes(q) ||
        o.hint?.toLowerCase().includes(q),
    );
  }, [options, query]);

  const groups = useMemo(() => {
    const map = new Map<string, SearchSelectOption[]>();
    for (const o of filtered) {
      const g = o.group || '';
      const list = map.get(g) || [];
      list.push(o);
      map.set(g, list);
    }
    return [...map.entries()];
  }, [filtered]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (opt: SearchSelectOption) => {
    onChange(opt.value, opt);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className={`fin-search ${open ? 'open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className={`fin fin-search-trigger ${!selected ? 'placeholder' : ''}`}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{selected?.label || placeholder}</span>
        <span className="fin-search-caret">▾</span>
      </button>
      {required && !value && (
        <input tabIndex={-1} required value="" onChange={() => {}} style={{ opacity: 0, height: 0, position: 'absolute' }} />
      )}
      {open && (
        <div className="fin-search-panel">
          <div className="fin-search-bar">
            <span>🔎</span>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>
          <div className="fin-search-list" role="listbox">
            {filtered.length === 0 ? (
              <div className="fin-search-empty">{emptyMessage}</div>
            ) : (
              groups.map(([group, items]) => (
                <div key={group || '_'} className="fin-search-group">
                  {group ? <div className="fin-search-group-label">{group}</div> : null}
                  {items.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={opt.value === value}
                      className={`fin-search-opt ${opt.value === value ? 'on' : ''}`}
                      onClick={() => pick(opt)}
                    >
                      <span>{opt.label}</span>
                      {opt.hint ? <span className="fin-search-hint">{opt.hint}</span> : null}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
