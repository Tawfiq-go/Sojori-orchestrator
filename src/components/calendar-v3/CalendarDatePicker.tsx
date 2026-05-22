// Popover calendrier — sélection d'une date de début (taille fixe)
import React, { useState, useRef, useEffect } from 'react';
import { T } from './_shared';

const WEEKDAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type Props = {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  value: Date;
  onSelect: (date: Date) => void;
  /** Dernière date de début sélectionnable (horizon 3 ans) */
  maxSelectableDate?: Date;
  horizonEndDate?: Date;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function CalendarDatePicker({
  anchorEl,
  open,
  onClose,
  value,
  onSelect,
  maxSelectableDate,
  horizonEndDate,
}: Props) {
  const [pickerMonth, setPickerMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));

  useEffect(() => {
    if (open) setPickerMonth(new Date(value.getFullYear(), value.getMonth(), 1));
  }, [open, value]);

  if (!open || !anchorEl) return null;

  const todayIso = toIso(new Date());
  const currentIso = toIso(value);
  const maxIso = maxSelectableDate ? toIso(startOfDay(maxSelectableDate)) : null;
  const pickerMonthStart = startOfDay(
    new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1),
  );
  const canNextMonth =
    !maxSelectableDate ||
    pickerMonthStart.getTime() <
      startOfDay(new Date(maxSelectableDate.getFullYear(), maxSelectableDate.getMonth(), 1)).getTime();
  const startOfMonth = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1);
  const endOfMonth = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 0);
  const firstDow = (startOfMonth.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= endOfMonth.getDate(); d++) {
    cells.push(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), d));
  }
  while (cells.length < 42) cells.push(null);

  const rect = anchorEl.getBoundingClientRect();

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 1299 }}
      />
      <div
        style={{
          position: 'fixed',
          top: rect.bottom + 6,
          left: rect.left,
          zIndex: 1300,
          width: 252,
          minWidth: 252,
          maxWidth: 252,
          background: T.bg1,
          border: `1px solid ${T.borderStrong}`,
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(20,17,10,0.18)',
          padding: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <button
            type="button"
            onClick={() =>
              setPickerMonth((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))
            }
            style={pickerNavBtn}
          >
            ‹
          </button>
          <span
            style={{
              fontWeight: 700,
              fontSize: 13,
              color: T.text,
              textTransform: 'capitalize',
            }}
          >
            {pickerMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
          <button
            type="button"
            disabled={!canNextMonth}
            onClick={() =>
              canNextMonth &&
              setPickerMonth((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))
            }
            style={{ ...pickerNavBtn, opacity: canNextMonth ? 1 : 0.4, cursor: canNextMonth ? 'pointer' : 'not-allowed' }}
          >
            ›
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
          {WEEKDAYS.map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: T.text3 }}>
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, minHeight: 216 }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} style={{ minHeight: 32 }} />;
            const iso = toIso(day);
            const selected = iso === currentIso;
            const isToday = iso === todayIso;
            const disabled = maxIso != null && iso > maxIso;
            return (
              <button
                key={iso}
                type="button"
                disabled={disabled}
                title={disabled ? 'Hors fenêtre calendrier (3 ans)' : undefined}
                onClick={() => {
                  if (disabled) return;
                  onSelect(day);
                  onClose();
                }}
                style={{
                  minHeight: 32,
                  borderRadius: 6,
                  border: 0,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: selected || isToday ? 700 : 400,
                  background: selected ? T.primary : isToday ? T.primaryTint : disabled ? T.bg2 : T.bg1,
                  color: selected ? '#fff' : disabled ? T.text4 : isToday ? T.primaryDeep : T.text,
                  opacity: disabled ? 0.45 : 1,
                }}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>

        <p style={{ margin: '8px 0 0', fontSize: 10, color: T.text3, textAlign: 'center', lineHeight: 1.35 }}>
          Calendrier géré sur 3 ans
          {horizonEndDate
            ? ` · jusqu'au ${horizonEndDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : ''}
        </p>

        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button
            type="button"
            onClick={() => {
              onSelect(new Date());
              onClose();
            }}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: T.primaryDeep,
              background: T.primaryTint,
              border: 0,
              borderRadius: 20,
              padding: '4px 14px',
              cursor: 'pointer',
            }}
          >
            Aujourd&apos;hui
          </button>
        </div>
      </div>
    </>
  );
}

const pickerNavBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  border: 0,
  background: T.bg2,
  cursor: 'pointer',
  fontSize: 14,
  color: T.text2,
};
