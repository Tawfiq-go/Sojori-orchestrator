// ════════════════════════════════════════════════════════════════════
// ColumnFilters.jsx — dropdown multi-select colonnes (Atelier 2026)
// Tags ambre · search live · footer clear+counter
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { T, ALL_COLUMNS } from './_shared';

export default function ColumnFilters({ selectedColumns = [], onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const filtered = useMemo(() =>
    ALL_COLUMNS.filter(c => c.label.toLowerCase().includes(search.toLowerCase())), [search]);

  const toggle = (id) => {
    const next = selectedColumns.includes(id) ? selectedColumns.filter(x => x !== id) : [...selectedColumns, id];
    onChange?.(next);
  };

  const tagsVisible = selectedColumns.slice(0, 2);
  const overflow = selectedColumns.length - tagsVisible.length;

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 200 }}>
      <button onClick={() => setOpen(!open)}
        style={{
          width: '100%', minHeight: 36, padding: '6px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
          background: selectedColumns.length ? T.primaryTint : T.bg1,
          border: `1px solid ${selectedColumns.length ? T.primary : T.border}`,
          borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
          transition: 'all 0.15s',
        }}>
        {selectedColumns.length === 0 ? (
          <span style={{ color: T.text3, fontSize: 12.5 }}>Sélectionner colonnes…</span>
        ) : (
          <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'nowrap', overflow: 'hidden' }}>
            {tagsVisible.map(id => {
              const c = ALL_COLUMNS.find(x => x.id === id);
              return c && (
                <span key={id} style={{
                  background: T.primaryTint2, color: T.primaryDeep,
                  fontSize: 10.5, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
                  fontFamily: '"Geist Mono", monospace', letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                }}>{c.short}</span>
              );
            })}
            {overflow > 0 && (
              <span style={{
                background: T.bg2, color: T.text3, fontSize: 10, fontWeight: 700,
                padding: '1px 7px', borderRadius: 999, fontFamily: '"Geist Mono", monospace',
              }}>+{overflow}</span>
            )}
          </div>
        )}
        <span style={{ fontSize: 9, color: T.text4, marginLeft: 'auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: T.bg1, border: `1px solid ${T.border}`,
          borderRadius: 10, boxShadow: '0 12px 32px rgba(20,17,10,0.14)',
          zIndex: 9999, animation: 'sojori-fade-up 0.18s both',
        }}>
          <div style={{ padding: '8px 12px', borderBottom: `1px solid ${T.border}` }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Rechercher…" autoFocus
              style={{
                width: '100%', padding: '7px 10px', border: `1px solid ${T.border}`,
                borderRadius: 7, font: 'inherit', fontSize: 12.5, outline: 'none',
                background: T.bg2,
              }} />
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto', padding: '6px 0' }}>
            {filtered.map(c => {
              const isOn = selectedColumns.includes(c.id);
              return (
                <div key={c.id} onClick={() => toggle(c.id)}
                  style={{
                    padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: isOn ? T.primaryTint : 'transparent',
                    color: isOn ? T.primaryDeep : T.text2,
                    fontWeight: isOn ? 600 : 500,
                  }}>
                  <span style={{
                    width: 14, height: 14, borderRadius: 4,
                    border: `1.5px solid ${isOn ? T.primaryDeep : T.borderStrong}`,
                    background: isOn ? T.primary : 'transparent',
                    color: T.text, fontSize: 10, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>{isOn ? '✓' : ''}</span>
                  {c.label}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: T.text3, fontSize: 12 }}>
                Aucun résultat
              </div>
            )}
          </div>
          <div style={{
            padding: '8px 14px', borderTop: `1px solid ${T.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 11.5, color: T.text3, background: T.bg2,
          }}>
            <button onClick={() => onChange?.([])}
              style={{ color: selectedColumns.length ? T.error : T.text4, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: 'none', border: 0 }}>
              Tout effacer
            </button>
            <span style={{ fontFamily: '"Geist Mono", monospace' }}>{selectedColumns.length} / {ALL_COLUMNS.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
