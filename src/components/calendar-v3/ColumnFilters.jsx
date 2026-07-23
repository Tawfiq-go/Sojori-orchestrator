// ════════════════════════════════════════════════════════════════════
// ColumnFilters.jsx — dropdown multi-select colonnes (Atelier 2026)
// Tags ambre · search live · footer clear+counter
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { T, ALL_COLUMNS, sortCalendarColumns, sortAllColumnsForPicker, CALENDAR_DEFAULT_COLUMNS } from './_shared';

export default function ColumnFilters({
  selectedColumns = [],
  onChange,
  compact = false,
  ultraCompact = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);
  const tight = ultraCompact || compact;

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current?.contains(e.target)) return;
      if (buttonRef.current?.contains(e.target)) return;
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
      const rect = buttonRef.current.getBoundingClientRect();
      const width = Math.max(rect.width, 300);
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
  }, [open]);

  const orderedColumns = useMemo(() => sortAllColumnsForPicker(ALL_COLUMNS), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? orderedColumns.filter(
          (c) =>
            c.label.toLowerCase().includes(q) ||
            c.short.toLowerCase().includes(q),
        )
      : orderedColumns;
    return list;
  }, [search, orderedColumns]);

  const tagsVisible = useMemo(
    () => sortCalendarColumns(selectedColumns),
    [selectedColumns],
  );

  const toggle = (id) => {
    let next = selectedColumns.includes(id)
      ? selectedColumns.filter((x) => x !== id)
      : sortCalendarColumns([...selectedColumns, id]);
    if (next.length === 0) next = [...CALENDAR_DEFAULT_COLUMNS];
    onChange?.(next);
  };

  const dropdown = open && menuStyle && typeof document !== 'undefined'
    ? createPortal(
        <div
          ref={ref}
          style={{
            ...menuStyle,
            background: T.bg1,
            border: `1px solid ${T.borderStrong}`,
            borderRadius: 12,
            boxShadow: '0 16px 48px rgba(20,17,10,0.22), 0 0 0 1px rgba(20,17,10,0.06)',
            animation: 'sojori-fade-up 0.18s both',
          }}
        >
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${T.border}`, background: T.bg2 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Rechercher une colonne…"
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
                boxShadow: 'inset 0 1px 2px rgba(20,17,10,0.04)',
              }}
            />
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto', padding: '6px 0' }}>
            {filtered.map((c) => {
              const isOn = selectedColumns.includes(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  style={{
                    padding: '9px 14px',
                    cursor: 'pointer',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: isOn ? T.primaryTint : 'transparent',
                    color: isOn ? T.primaryDeep : T.text2,
                    fontWeight: isOn ? 700 : 500,
                    borderLeft: isOn ? `3px solid ${T.primary}` : '3px solid transparent',
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: `1.5px solid ${isOn ? T.primaryDeep : T.borderStrong}`,
                      background: isOn ? T.primary : T.bg1,
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isOn ? '✓' : ''}
                  </span>
                  <span style={{ flex: 1 }}>{c.label}</span>
                  <span
                    style={{
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: 10,
                      fontWeight: 700,
                      color: isOn ? T.primaryDeep : T.text3,
                      background: isOn ? T.primaryTint2 : T.bg2,
                      padding: '1px 7px',
                      borderRadius: 999,
                    }}
                  >
                    {c.short}
                  </span>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: T.text3, fontSize: 12 }}>
                Aucun résultat
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
              onClick={() => onChange?.([...CALENDAR_DEFAULT_COLUMNS])}
              style={{
                color: T.text2,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: 'none',
                border: 0,
              }}
            >
              Par défaut (prix · dispo · min stay · dyn)
            </button>
            <span style={{ fontFamily: '"Geist Mono", monospace' }}>
              {selectedColumns.length} / {ALL_COLUMNS.length}
            </span>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <div
        style={{
          position: 'relative',
          minWidth: ultraCompact ? 0 : compact ? 0 : 200,
          flex: tight ? '0 0 auto' : undefined,
          width: tight ? 'auto' : undefined,
          maxWidth: ultraCompact ? 140 : compact ? 180 : undefined,
          flexShrink: 0,
        }}
      >
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            width: tight ? 'auto' : '100%',
            minHeight: ultraCompact ? 24 : compact ? 32 : 36,
            minWidth: ultraCompact ? 88 : compact ? 120 : undefined,
            padding: ultraCompact ? '2px 5px' : compact ? '4px 8px' : '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: ultraCompact ? 3 : compact ? 5 : 8,
            background: selectedColumns.length ? T.primaryTint : T.bg1,
            border: `1px solid ${open || selectedColumns.length ? T.primary : T.border}`,
            borderRadius: ultraCompact ? 7 : 9,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
            boxShadow: open ? `0 0 0 3px ${T.primaryTint2}` : 'none',
          }}
        >
          {selectedColumns.length === 0 ? (
            <span style={{ color: T.text3, fontSize: ultraCompact ? 9.5 : compact ? 11 : 12.5, whiteSpace: 'nowrap' }}>
              {ultraCompact ? 'Col.' : compact ? 'Colonnes' : 'Sélectionner colonnes…'}
            </span>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: ultraCompact ? 2 : 4,
                flex: 1,
                flexWrap: 'nowrap',
                overflowX: 'auto',
                scrollbarWidth: 'none',
              }}
            >
              {tagsVisible.map((id) => {
                const c = ALL_COLUMNS.find((x) => x.id === id);
                return (
                  c && (
                    <span
                      key={id}
                      style={{
                        background: T.primaryTint2,
                        color: T.primaryDeep,
                        fontSize: ultraCompact ? 9 : 10.5,
                        fontWeight: 600,
                        padding: ultraCompact ? '0 4px' : '1px 7px',
                        borderRadius: 999,
                        fontFamily: '"Geist Mono", monospace',
                        letterSpacing: '0.02em',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {c.short}
                    </span>
                  )
                );
              })}
            </div>
          )}
          {!ultraCompact && (
            <span
              style={{
                fontSize: 9,
                color: T.text4,
                marginLeft: 'auto',
                transform: open ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
                flexShrink: 0,
              }}
            >
              ▾
            </span>
          )}
        </button>
      </div>
      {dropdown}
    </>
  );
}
