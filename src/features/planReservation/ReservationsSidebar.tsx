import React, { useMemo, useState } from 'react';
import { planCodeDisplay, reservationRefDisplay } from './buildPlanViewModel';
import type { Reservation, ResaFilterKey, ResaSortKey, ReservationGroup } from './types';

interface Props {
  reservations: Reservation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  /** Titre colonne gauche (défaut : plans avec résa). */
  listTitle?: string;
}

const FILTERS: { id: ResaFilterKey; label: string; icon: string }[] = [
  { id: 'in_progress', label: 'En cours', icon: '⚡' },
  { id: 'blocked', label: 'Bloquées', icon: '🚨' },
  { id: 'today', label: "Aujourd'hui", icon: '📅' },
  { id: 'next7d', label: 'À venir', icon: '7j' },
  { id: 'done', label: 'Terminées', icon: '✓' },
];

const SORT_OPTIONS: { id: ResaSortKey; label: string }[] = [
  { id: 'arrival_asc', label: 'Arrivée la plus proche' },
  { id: 'urgency', label: "Urgence · bloquées d'abord" },
  { id: 'recent', label: 'Plus récente' },
  { id: 'by_listing', label: 'Par listing' },
];

export default function ReservationsSidebar({
  reservations,
  activeId,
  onSelect,
  listTitle = 'Plans',
}: Props) {
  const [search, setSearch] = useState('');
  /** Vide = afficher tous les plans (évite « 0 sur 1 » quand le séjour calendrier est passé mais le plan tourne encore). */
  const [activeFilters, setActiveFilters] = useState<Set<ResaFilterKey>>(new Set());
  const [sort, setSort] = useState<ResaSortKey>('arrival_asc');

  const toggleFilter = (k: ResaFilterKey) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86400000);
    const in7 = new Date(now.getTime() + 7 * 86400000);

    return reservations.filter((r) => {
      if (activeId && r.id === activeId) return true;

      if (search) {
        const q = search.toLowerCase();
        if (
          !r.guest.name.toLowerCase().includes(q) &&
          !r.listing.name.toLowerCase().includes(q) &&
          !r.planCode.toLowerCase().includes(q) &&
          !r.reference.toLowerCase().includes(q) &&
          !r.id.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (activeFilters.size === 0) return true;
      const checkIn = new Date(r.checkIn);
      const checkOut = new Date(r.checkOut);
      let ok = false;
      if (activeFilters.has('in_progress') && (r.status === 'now' || r.status === 'pending')) ok = true;
      if (activeFilters.has('blocked') && r.status === 'blocked') ok = true;
      if (activeFilters.has('today') && checkIn < todayEnd && checkOut >= todayStart) ok = true;
      if (activeFilters.has('next7d') && checkIn > now && checkIn <= in7) ok = true;
      if (activeFilters.has('done') && r.status === 'done') ok = true;
      return ok;
    });
  }, [reservations, search, activeFilters, activeId]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === 'urgency') {
      const rank = (s: Reservation['status']) =>
        ({ blocked: 0, now: 1, pending: 2, future: 3, done: 4 })[s] ?? 5;
      list.sort((a, b) => rank(a.status) - rank(b.status) || new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
    } else if (sort === 'recent') {
      list.sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime());
    } else if (sort === 'by_listing') {
      list.sort((a, b) => a.listing.name.localeCompare(b.listing.name) || a.guest.name.localeCompare(b.guest.name));
    } else {
      list.sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
    }
    return list;
  }, [filtered, sort]);

  const groups = useMemo<ReservationGroup[]>(() => {
    return [
      { label: 'Attention requise', icon: '🚨', reservations: sorted.filter((r) => r.status === 'blocked') },
      { label: 'En cours', icon: '⚡', reservations: sorted.filter((r) => r.status === 'now' || r.status === 'pending') },
      { label: 'À venir', icon: '📅', reservations: sorted.filter((r) => r.status === 'future') },
      { label: 'Terminées récemment', icon: '✓', reservations: sorted.filter((r) => r.status === 'done') },
    ].filter((g) => g.reservations.length > 0);
  }, [sorted]);

  const totalShown = groups.reduce((sum, g) => sum + g.reservations.length, 0);

  return (
    <aside className="sidebar">
      <div className="sb-h">
        <h2>📋 {listTitle}</h2>
        <span className="ct">{reservations.length}</span>
      </div>

      <div className="sb-search">
        <span className="ic">🔍</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nom, listing, réf. résa, id…"
        />
        <kbd>⌘K</kbd>
      </div>

      <div className="sb-filters">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`sb-chip${activeFilters.has(f.id) ? ' on' : ''}`}
            onClick={() => toggleFilter(f.id)}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      <div className="sb-sort">
        <span className="lbl">TRI</span>
        <select value={sort} onChange={(e) => setSort(e.target.value as ResaSortKey)}>
          {SORT_OPTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="sb-list">
        {totalShown === 0 && reservations.length > 0 ? (
          <div className="sb-empty">
            <p>Aucun plan ne correspond aux filtres.</p>
            <button
              type="button"
              className="sb-chip on"
              onClick={() => {
                setActiveFilters(new Set());
                setSearch('');
              }}
            >
              Afficher tous ({reservations.length})
            </button>
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
          📊 {totalShown} sur {reservations.length} plan{reservations.length > 1 ? 's' : ''}
        </span>
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
      title={`${planLabel} · ${r.guest.name} · résa ${resaLabel}`}
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

/** Abréviation dans le pastille (ex. SJ-12345 → SJ). */
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
