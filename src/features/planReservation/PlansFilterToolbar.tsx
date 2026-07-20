import React from 'react';
import type { ResaFilterKey, ResaSortKey } from './types';

const FILTER_CHIPS: { id: ResaFilterKey; label: string; icon: string; sepBefore?: boolean }[] = [
  { id: 'in_progress', label: 'En cours', icon: '⚡' },
  { id: 'blocked', label: 'Bloquées', icon: '🚨' },
  { id: 'today', label: "Aujourd'hui", icon: '📅' },
  { id: 'next7d', label: 'À venir', icon: '7j' },
  { id: 'done', label: 'Terminées', icon: '✓' },
  { id: 'registration_pending', label: 'Enreg. à faire', icon: '⏳', sepBefore: true },
  { id: 'registration_done', label: 'Enreg. OK', icon: '📝' },
  { id: 'arrival_time_pending', label: 'Heure manquante', icon: '❔' },
  { id: 'arrival_time_set', label: 'Heure OK', icon: '🕒' },
  { id: 'archived', label: 'Archivés', icon: '📦', sepBefore: true },
];

const EXCLUSIVE_PAIRS: [ResaFilterKey, ResaFilterKey][] = [
  ['registration_done', 'registration_pending'],
  ['arrival_time_set', 'arrival_time_pending'],
];

const SORT_OPTIONS: { id: ResaSortKey; label: string }[] = [
  { id: 'arrival_asc', label: 'Check-in ↑' },
  { id: 'checkin_desc', label: 'Check-in ↓' },
  { id: 'checkout_asc', label: 'Check-out ↑' },
  { id: 'checkout_desc', label: 'Check-out ↓' },
  { id: 'created_desc', label: 'Création ↓' },
  { id: 'created_asc', label: 'Création ↑' },
  { id: 'urgency', label: "Urgence · bloquées d'abord" },
  { id: 'recent', label: 'Plus récente (check-in)' },
  { id: 'by_listing', label: 'Par listing' },
];

interface Props {
  filters: ResaFilterKey[];
  sort: ResaSortKey;
  listingId: string;
  listingOptions: { id: string; name: string }[];
  onFiltersChange: (filters: ResaFilterKey[]) => void;
  onSortChange: (sort: ResaSortKey) => void;
  onListingIdChange?: (listingId: string) => void;
  onClearFilters: () => void;
}

export default function PlansFilterToolbar({
  filters,
  sort,
  listingId,
  listingOptions,
  onFiltersChange,
  onSortChange,
  onListingIdChange,
  onClearFilters,
}: Props) {
  const toggleFilter = (k: ResaFilterKey) => {
    if (filters.includes(k)) {
      onFiltersChange(filters.filter((f) => f !== k));
      return;
    }
    let next = [...filters, k];
    for (const [a, b] of EXCLUSIVE_PAIRS) {
      if (k === a) next = next.filter((f) => f !== b);
      if (k === b) next = next.filter((f) => f !== a);
    }
    onFiltersChange(next);
  };

  const hasActive =
    filters.length > 0 || Boolean(listingId.trim());

  return (
    <div className="plans-toolbar" role="toolbar" aria-label="Filtres plans">
      {onListingIdChange && listingOptions.length > 0 ? (
        <label className="plans-toolbar-field">
          <span className="lbl">Listing</span>
          <select value={listingId} onChange={(e) => onListingIdChange(e.target.value)}>
            <option value="">Tous les listings</option>
            {listingOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="plans-toolbar-chips">
        {FILTER_CHIPS.map((f) => (
          <React.Fragment key={f.id}>
            {f.sepBefore ? <span className="plans-toolbar-sep" aria-hidden /> : null}
            <button
              type="button"
              className={`sb-chip${filters.includes(f.id) ? ' on' : ''}`}
              onClick={() => toggleFilter(f.id)}
            >
              {f.icon} {f.label}
            </button>
          </React.Fragment>
        ))}
      </div>

      <label className="plans-toolbar-field plans-toolbar-sort">
        <span className="lbl">Tri</span>
        <select value={sort} onChange={(e) => onSortChange(e.target.value as ResaSortKey)}>
          {SORT_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      {hasActive ? (
        <button type="button" className="sb-chip plans-toolbar-clear" onClick={onClearFilters}>
          ✕ Reset
        </button>
      ) : null}
    </div>
  );
}
