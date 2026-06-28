import { useEffect, useMemo, useRef, useState } from 'react';
import {
  formatReservationOptionLabel,
  searchLedgerReservations,
  type LedgerReservationOption,
} from '../services/ledgerReservationApi';

type Props = {
  ownerId: string | null;
  value: string;
  selected?: LedgerReservationOption | null;
  onChange: (reservationId: string, option?: LedgerReservationOption) => void;
  onClear?: () => void;
  disabled?: boolean;
  placeholder?: string;
};

export function ReservationSearchSelect({
  ownerId,
  value,
  selected,
  onChange,
  onClear,
  disabled,
  placeholder = 'Rechercher SJ-… ou voyageur',
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<LedgerReservationOption[]>([]);
  const [loading, setLoading] = useState(false);

  const displayLabel = useMemo(() => {
    if (selected?.reservationNumber) return formatReservationOptionLabel(selected);
    return '';
  }, [selected]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setOptions([]);
      return;
    }
    const tmr = setTimeout(() => {
      setLoading(true);
      void searchLedgerReservations(q, ownerId)
        .then(setOptions)
        .finally(() => setLoading(false));
    }, 280);
    return () => clearTimeout(tmr);
  }, [query, open, ownerId]);

  const pick = (opt: LedgerReservationOption) => {
    onChange(opt.id, opt);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className={`fin-search ${open ? 'open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className={`fin fin-search-trigger ${!value ? 'placeholder' : ''}`}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{displayLabel || placeholder}</span>
        <span className="fin-search-caret">▾</span>
      </button>
      {value && onClear ? (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 6 }}
          disabled={disabled}
          onClick={() => {
            onClear();
            setQuery('');
          }}
        >
          Retirer la réservation
        </button>
      ) : null}
      {open && (
        <div className="fin-search-panel">
          <div className="fin-search-bar">
            <span>🔎</span>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SJ-…, nom voyageur, email…"
            />
          </div>
          <div className="fin-search-list" role="listbox">
            {loading ? (
              <div className="fin-search-empty">Recherche…</div>
            ) : query.trim().length < 2 ? (
              <div className="fin-search-empty">Tapez au moins 2 caractères</div>
            ) : options.length === 0 ? (
              <div className="fin-search-empty">Aucune réservation</div>
            ) : (
              options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={opt.id === value}
                  className={`fin-search-opt ${opt.id === value ? 'on' : ''}`}
                  onClick={() => pick(opt)}
                >
                  <span>{opt.reservationNumber}</span>
                  <span className="fin-search-hint">
                    {[opt.guestName, opt.listingName].filter(Boolean).join(' · ')}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReservationSearchSelect;
