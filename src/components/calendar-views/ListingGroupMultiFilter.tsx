/**
 * Filtre multi-choix des groupes de listings (villes) — StayView planning.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { T } from './_shared';

export interface ListingGroupOption {
  id: string;
  label: string;
  count: number;
}

export default function ListingGroupMultiFilter({
  options,
  selected,
  onChange,
  dense = false,
  buttonLabel = '🏘 Groupes',
  searchPlaceholder = '🔍 Rechercher…',
  allLabel = 'Tous',
  emptyLabel = 'Aucun résultat',
  title,
}: {
  options: ListingGroupOption[];
  /** Vide = tous. */
  selected: string[];
  onChange: (next: string[]) => void;
  dense?: boolean;
  buttonLabel?: string;
  searchPlaceholder?: string;
  allLabel?: string;
  emptyLabel?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuStyle(null);
      return;
    }
    const update = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      const width = Math.max(rect.width, dense ? 240 : 280);
      let left = rect.left;
      if (left + width > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - width - 12);
      }
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left,
        width,
        zIndex: 10050,
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, dense]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const allSelected = selected.length === 0 || selected.length === options.length;
  const labelCount = allSelected ? options.length : selected.length;

  const toggle = (id: string) => {
    // Vide = tous visibles. Premier clic → ce groupe seul ; suivants → multi-ajout.
    if (selected.length === 0) {
      onChange([id]);
      return;
    }
    const set = new Set(selected);
    if (set.has(id)) {
      set.delete(id);
      onChange(set.size === 0 ? [] : Array.from(set));
      return;
    }
    set.add(id);
    // Tout coché → revenir à « tous » (liste vide).
    if (set.size >= options.length) {
      onChange([]);
      return;
    }
    onChange(Array.from(set));
  };

  const isOn = (id: string) => selected.length === 0 || selected.includes(id);

  const dropdown =
    open && menuStyle && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            style={{
              ...menuStyle,
              background: T.bg1,
              border: `1px solid ${T.borderStrong}`,
              borderRadius: 12,
              boxShadow: '0 16px 48px rgba(20,17,10,0.22), 0 0 0 1px rgba(20,17,10,0.06)',
              animation: 'sojori-fade-up 0.18s both',
            }}
          >
            <div
              style={{
                padding: '10px 12px',
                borderBottom: `1px solid ${T.border}`,
                background: T.bg2,
              }}
            >
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 11px',
                  border: `1px solid ${T.borderStrong}`,
                  borderRadius: 8,
                  font: 'inherit',
                  fontSize: 13,
                  outline: 'none',
                  background: T.bg1,
                  color: T.text,
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', padding: '6px 0' }}>
              {filtered.map((o) => {
                const on = isOn(o.id);
                return (
                  <div
                    key={o.id}
                    onClick={() => toggle(o.id)}
                    role="option"
                    aria-selected={on}
                    style={{
                      padding: '9px 14px',
                      cursor: 'pointer',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: on && selected.length > 0 ? T.primaryTint : 'transparent',
                      color: on ? T.primaryDeep : T.text2,
                      fontWeight: on ? 700 : 500,
                      borderLeft: on && selected.length > 0 ? `3px solid ${T.primary}` : '3px solid transparent',
                    }}
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: `1.5px solid ${on ? T.primaryDeep : T.borderStrong}`,
                        background: on ? T.primary : T.bg1,
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {on ? '✓' : ''}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>{o.label}</span>
                    <span
                      style={{
                        fontFamily: '"Geist Mono", monospace',
                        fontSize: 10,
                        fontWeight: 700,
                        color: T.text3,
                        background: T.bg2,
                        padding: '1px 7px',
                        borderRadius: 999,
                      }}
                    >
                      {o.count}
                    </span>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: T.text3, fontSize: 12 }}>
                  {emptyLabel}
                </div>
              )}
            </div>
            <div
              style={{
                padding: '9px 14px',
                borderTop: `1px solid ${T.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 11.5,
                color: T.text3,
                background: T.bg2,
              }}
            >
              <button
                type="button"
                onClick={() => onChange([])}
                style={{
                  color: T.text2,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: 'none',
                  border: 0,
                }}
              >
                {allLabel}
              </button>
              <span style={{ fontFamily: '"Geist Mono", monospace' }}>
                {allSelected ? options.length : selected.length} / {options.length}
              </span>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={title || buttonLabel}
        style={{
          all: 'unset',
          boxSizing: 'border-box',
          cursor: 'pointer',
          height: dense ? 22 : 30,
          padding: dense ? '0 8px' : '0 11px',
          borderRadius: dense ? 6 : 8,
          background: !allSelected ? T.primaryTint : T.bg1,
          border: `1px solid ${!allSelected ? T.primary : T.border}`,
          fontSize: dense ? 10 : 11.5,
          fontWeight: 600,
          color: !allSelected ? T.primaryDeep : T.text2,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        {buttonLabel}
        <span
          style={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: dense ? 9 : 9.5,
            background: !allSelected ? T.primaryTint : T.bg3,
            color: !allSelected ? T.primaryDeep : T.text3,
            padding: '1px 6px',
            borderRadius: 999,
            fontWeight: 700,
          }}
        >
          {labelCount}
        </span>
        ▾
      </button>
      {dropdown}
    </>
  );
}
