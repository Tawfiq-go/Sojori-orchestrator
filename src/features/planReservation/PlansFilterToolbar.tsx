import React from 'react';
import type { ResaFilterKey, ResaSortKey } from './types';

/** Ligne chips — même logique que OTA/WA : groupes + labels courts + scroll horizontal. */
const FILTER_GROUPS: Array<{
  chips: { id: ResaFilterKey; label: string; title?: string; urgent?: boolean }[];
}> = [
  {
    chips: [
      { id: 'in_progress', label: 'En cours', title: 'Séjours en cours / en attente' },
      { id: 'blocked', label: 'Bloquées', title: 'Plans bloqués', urgent: true },
      { id: 'today', label: 'Auj', title: "Aujourd'hui (check-in/out)" },
      { id: 'next7d', label: '7j', title: 'Arrivées sous 7 jours' },
      { id: 'done', label: 'Terminées', title: 'Terminées récemment' },
    ],
  },
  {
    chips: [
      { id: 'registration_pending', label: 'Enreg.', title: 'Enregistrement à faire' },
      { id: 'registration_done', label: 'Enreg. OK', title: 'Enregistrement fait' },
      { id: 'arrival_time_pending', label: 'Heure ?', title: "Heure d'arrivée manquante" },
      { id: 'arrival_time_set', label: 'Heure OK', title: "Heure d'arrivée renseignée" },
    ],
  },
  {
    chips: [{ id: 'archived', label: 'Archivés', title: 'Plans archivés' }],
  },
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
  { id: 'urgency', label: 'Urgence' },
  { id: 'recent', label: 'Récente' },
  { id: 'by_listing', label: 'Listing' },
];

interface Props {
  filters: ResaFilterKey[];
  sort: ResaSortKey;
  listingId: string;
  listingOptions: { id: string; name: string }[];
  totalCount?: number;
  searchInput?: string;
  onSearchInputChange?: (value: string) => void;
  onSearchSubmit?: () => void;
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
  totalCount,
  searchInput = '',
  onSearchInputChange,
  onSearchSubmit,
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

  const hasActive = filters.length > 0 || Boolean(listingId.trim()) || Boolean(searchInput.trim());

  return (
    <div className="plans-toolbar" role="toolbar" aria-label="Filtres plans">
      {/* Ligne 1 — leading style inbox : titre + recherche + listing/tri */}
      <div className="plans-toolbar-leading">
        <div className="plans-toolbar-title">
          <span className="plans-toolbar-title-txt">📋 Plans</span>
          {typeof totalCount === 'number' ? (
            <span className="plans-toolbar-count">{totalCount}</span>
          ) : null}
        </div>

        {onSearchInputChange && onSearchSubmit ? (
          <div className="plans-toolbar-search">
            <span className="ic" aria-hidden>
              🔍
            </span>
            <input
              value={searchInput}
              onChange={(e) => onSearchInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSearchSubmit();
                }
              }}
              placeholder="Nom, listing, réf…"
              aria-label="Rechercher un plan"
            />
            <button type="button" className="plans-toolbar-search-ok" onClick={onSearchSubmit}>
              OK
            </button>
          </div>
        ) : null}

        {onListingIdChange && listingOptions.length > 0 ? (
          <label className="plans-toolbar-field">
            <span className="lbl">Listing</span>
            <select value={listingId} onChange={(e) => onListingIdChange(e.target.value)}>
              <option value="">Tous</option>
              {listingOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

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
            ✕
          </button>
        ) : null}
      </div>

      {/* Ligne 2 — chips groups, nowrap scroll (comme subBar OTA/WA) */}
      <div className="plans-toolbar-chips">
        {FILTER_GROUPS.map((group, gi) => (
          <React.Fragment key={gi}>
            {gi > 0 ? <span className="plans-toolbar-sep" aria-hidden /> : null}
            {group.chips.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`sb-chip${filters.includes(f.id) ? ' on' : ''}${f.urgent ? ' urgent' : ''}`}
                title={f.title || f.label}
                onClick={() => toggleFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
