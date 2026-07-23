import React, { useMemo } from 'react';
import { planCodeDisplay, reservationRefDisplay } from './buildPlanViewModel';
import { normalizeReservationSourceLabel, sourceChipClass } from './planDispatchPreview';
import type { Reservation, ReservationGroup } from './types';

interface Props {
  reservations: Reservation[];
  totalCount: number;
  activeId: string | null;
  onSelect: (id: string) => void;
  listTitle?: string;
  searchInput: string;
  appliedSearch: string;
  listRefreshing?: boolean;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
  hasActiveQuery?: boolean;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: () => void;
  onClearFilters: () => void;
  onPageChange?: (page: number) => void;
}

export default function ReservationsSidebar({
  reservations,
  totalCount,
  activeId,
  onSelect,
  listTitle = 'Plans',
  searchInput,
  appliedSearch,
  listRefreshing = false,
  page = 1,
  pageSize = 100,
  hasMore = false,
  hasActiveQuery = false,
  onSearchInputChange,
  onSearchSubmit,
  onClearFilters,
  onPageChange,
}: Props) {
  const groups = useMemo<ReservationGroup[]>(() => {
    return [
      { label: 'Attention requise', icon: '🚨', reservations: reservations.filter((r) => r.status === 'blocked') },
      {
        label: 'En cours',
        icon: '⚡',
        reservations: reservations.filter((r) => r.status === 'now' || r.status === 'pending'),
      },
      { label: 'À venir', icon: '📅', reservations: reservations.filter((r) => r.status === 'future') },
      { label: 'Terminées récemment', icon: '✓', reservations: reservations.filter((r) => r.status === 'done') },
    ].filter((g) => g.reservations.length > 0);
  }, [reservations]);

  const totalShown = groups.reduce((sum, g) => sum + g.reservations.length, 0);
  const queryActive = hasActiveQuery || Boolean(appliedSearch.trim());
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1);

  return (
    <aside className="sidebar">
      <div className="sb-h">
        <h2>📋 {listTitle}</h2>
        <span className="ct">{totalCount}</span>
      </div>

      <div className="sb-search">
        <span className="ic">🔍</span>
        <input
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSearchSubmit();
            }
          }}
          placeholder="Nom, listing, réf. résa, id…"
        />
        <button type="button" className="sb-search-ok" onClick={onSearchSubmit}>
          OK
        </button>
      </div>

      <div className={`sb-list${listRefreshing ? ' sb-list--refreshing' : ''}`}>
        {totalShown === 0 && queryActive ? (
          <div className="sb-empty">
            <p>Aucun plan ne correspond aux filtres.</p>
            <button type="button" className="sb-chip on" onClick={onClearFilters}>
              Réinitialiser
            </button>
          </div>
        ) : totalShown === 0 && !queryActive ? (
          <div className="sb-empty">
            <p>Aucun plan.</p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div className="sb-group">
                {group.icon} {group.label} · {group.reservations.length}
              </div>
              {group.reservations.map((r) => (
                <ResaItem key={r.id} r={r} active={r.id === activeId} onClick={() => onSelect(r.id)} />
              ))}
            </div>
          ))
        )}
      </div>

      <div className="sb-foot">
        <span>
          📊 {totalShown} sur {totalCount} plan{totalCount > 1 ? 's' : ''}
          {listRefreshing ? ' · …' : ''}
        </span>
        {onPageChange && totalCount > pageSize ? (
          <div className="sb-pager">
            <button
              type="button"
              className="sb-chip"
              disabled={page <= 1 || listRefreshing}
              onClick={() => onPageChange(page - 1)}
            >
              ←
            </button>
            <span className="sb-pager-lbl">
              {page}/{totalPages}
            </span>
            <button
              type="button"
              className="sb-chip"
              disabled={(!hasMore && page >= totalPages) || listRefreshing}
              onClick={() => onPageChange(page + 1)}
            >
              →
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function ResaItem({ r, active, onClick }: { r: Reservation; active: boolean; onClick: () => void }) {
  const badge = badgeFor(r.status);
  const barClass = barClassFor(r.status);
  const color = r.guest.avatarColor || 1;
  const planLabel = planCodeDisplay(r.planCode);
  const resaLabel = reservationRefDisplay(r.reference);
  const sourceLabel = normalizeReservationSourceLabel(r.source) || r.source || '';
  const sourceCls = sourceChipClass(sourceLabel);

  return (
    <div
      className={`sb-item${active ? ' on' : ''}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      title={`${planLabel} · ${r.guest.name} · ${sourceLabel || '—'} · résa ${resaLabel}`}
    >
      <div className={`av av-ref c${color}`} title={planLabel}>
        {refShort(planLabel)}
      </div>
      <div className="info">
        <div className="row-ref" title="Code plan orchestration">
          {planLabel}
        </div>
        <div className="row-ref row-ref--resa" title="Numéro réservation">
          {resaLabel}
        </div>
        <div className="row1">
          <span className="nm">{r.guest.name}</span>
          {sourceLabel ? (
            <span className={`src-chip ${sourceCls}`} title={`Source · ${sourceLabel}`}>
              {sourceLabel}
            </span>
          ) : null}
          <span className={`badge ${badge.cls}`}>{badge.label}</span>
        </div>
        <div className="row2">
          <span className="listing">{r.listing.name}</span>
          <span>
            {shortDate(r.checkIn)}-{shortDate(r.checkOut)}
          </span>
        </div>
        <div className="prog">
          <div className={`bar ${barClass}`} style={{ width: `${Math.round(r.progress * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

function badgeFor(s: Reservation['status']) {
  switch (s) {
    case 'blocked':
      return { cls: 'blocked', label: 'BLOQUÉE' };
    case 'now':
    case 'pending':
      return { cls: 'now', label: 'EN COURS' };
    case 'done':
      return { cls: 'done', label: 'OK' };
    case 'future':
      return { cls: 'future', label: 'À VENIR' };
  }
}

function barClassFor(s: Reservation['status']): string {
  switch (s) {
    case 'blocked':
      return 'blocked';
    case 'now':
    case 'pending':
      return 'now';
    case 'done':
      return 'done';
    case 'future':
      return 'future';
  }
}

function refShort(ref: string): string {
  if (/^OS-/i.test(ref)) return 'OS';
  if (/^SJ-/i.test(ref)) return 'SJ';
  if (ref.length <= 4) return ref;
  return ref.slice(0, 3).toUpperCase();
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  const months = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}
