/** LogApiRU · Vue B — Journal : échanges enrichis, filtres, batchs corrélés repliables. */
import { useMemo, useState } from 'react';
import type {
  LogApiRuItem,
  LogApiRuListResponse,
  LogApiRuOwnerStat,
} from '../../services/logApiRuApi';
import {
  CATEGORY_ORDER,
  RU_CATEGORIES,
  RU_CODES,
  actionDir,
  actionLabel,
  absTime,
  clockTime,
  fmtN,
  relTime,
  uiStatus,
} from './logApiRuMeta';
import { CatPill, DirBadge, EmptyState, ErrorState, StatusBadge, msClass } from './logApiRuBits';
import type { LogApiRuFilters } from './logApiRuFilters';
import { categoryOfAction } from './logApiRuFilters';

function auditStr(item: LogApiRuItem, key: string): string {
  const v = item.auditContext?.[key];
  return typeof v === 'string' ? v : '';
}

function SkeletonJournal() {
  return (
    <div className="jlist">
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <div className="jrow" key={i}>
          <div className="skel" style={{ height: 30, width: 60 }} />
          <div className="skel" style={{ height: 34, width: 100 }} />
          <div className="skel" style={{ height: 44, width: '80%' }} />
          <div className="skel" style={{ height: 20, width: 90 }} />
          <div className="skel" style={{ height: 16, width: 60 }} />
          <div />
        </div>
      ))}
    </div>
  );
}

function JournalRow({
  item,
  active,
  now,
  onOpen,
}: {
  item: LogApiRuItem;
  active: boolean;
  now: Date;
  onOpen: (id: string) => void;
}) {
  const status = uiStatus(item.status, item.statusCode);
  const code = RU_CODES[item.statusCode];
  const cat = categoryOfAction(item.action);
  const source = auditStr(item, 'modificationSource') || auditStr(item, 'trigger');
  const chips: Array<{ icon: string; label: string }> = [];
  if (item.listingName || item.listingId) {
    chips.push({ icon: '🏠', label: item.listingName || item.listingId });
  }
  if (item.ownerName || item.ownerId) {
    chips.push({ icon: '👤', label: item.ownerName || item.ownerId });
  }
  if (item.sojoriReservationNumber) {
    chips.push({ icon: '🗓', label: item.sojoriReservationNumber });
  }

  return (
    <div className={`jrow ${active ? 'active' : ''}`} onClick={() => onOpen(item.id)}>
      <div className="jtime" title={absTime(item.createdAt)}>
        <b>{clockTime(item.createdAt)}</b>
        {relTime(item.createdAt, now)}
      </div>
      <div className="jdircat">
        <DirBadge dir={actionDir(item.action)} />
        <CatPill cat={cat} />
      </div>
      <div className="jaction">
        <div className="nm">{actionLabel(item.action)}</div>
        <div className="tech">{item.action}</div>
        <div className="chips">
          {chips.map((c) => (
            <span className="chip" key={`${c.icon}${c.label}`}>
              <span className="i">{c.icon}</span>
              {c.label}
            </span>
          ))}
          {source && (
            <span className="chip src">
              <span className="i">⚡</span>
              {source}
            </span>
          )}
        </div>
      </div>
      <div className="jstatus">
        <StatusBadge status={status} />
        {item.statusCode && item.statusCode !== '0' && (
          <span className="code">
            {item.statusCode}
            {code ? ` · ${code.label}` : ''}
          </span>
        )}
      </div>
      <div className="jdur">
        <span className={`ms ${msClass(item.responseTime)}`}>
          {item.responseTime == null ? '—' : `${fmtN(item.responseTime)} ms`}
        </span>
      </div>
      <div className="jchev">›</div>
    </div>
  );
}

export interface LogApiRuJournalProps {
  data: LogApiRuListResponse | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  filters: LogApiRuFilters;
  onFiltersChange: (patch: Partial<LogApiRuFilters>) => void;
  owners: LogApiRuOwnerStat[];
  actions: string[];
  page: number;
  onPageChange: (page: number) => void;
  activeCallId: string | null;
  onOpenCall: (id: string) => void;
}

export function LogApiRuJournal({
  data,
  loading,
  error,
  onRetry,
  filters,
  onFiltersChange,
  owners,
  actions,
  page,
  onPageChange,
  activeCallId,
  onOpenCall,
}: LogApiRuJournalProps) {
  const now = useMemo(() => new Date(), [data]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [qLocal, setQLocal] = useState(filters.q);
  const [qTimer, setQTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const items = data?.items ?? [];
  const total = data?.pagination.total ?? 0;
  const limit = data?.pagination.limit ?? 50;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const hasActiveFilters = Boolean(
    filters.status || filters.dir || filters.category || filters.action || filters.ownerId ||
      filters.minDur || filters.q || filters.correlationId,
  );

  const onQInput = (v: string) => {
    setQLocal(v);
    if (qTimer) clearTimeout(qTimer);
    setQTimer(setTimeout(() => onFiltersChange({ q: v }), 300));
  };

  const clearAll = () => {
    setQLocal('');
    onFiltersChange({
      status: '',
      dir: '',
      category: '',
      action: '',
      ownerId: '',
      minDur: '',
      q: '',
      correlationId: '',
    });
  };

  // Groupement par correlationId : ≥2 appels du même correlationId → batch repliable
  const grouped = useMemo(() => {
    const byCid = new Map<string, LogApiRuItem[]>();
    for (const it of items) {
      const cid = auditStr(it, 'correlationId');
      if (!cid) continue;
      const list = byCid.get(cid) || [];
      list.push(it);
      byCid.set(cid, list);
    }
    const seen = new Set<string>();
    const out: Array<{ type: 'row'; item: LogApiRuItem } | { type: 'batch'; cid: string; items: LogApiRuItem[] }> = [];
    for (const it of items) {
      if (seen.has(it.id)) continue;
      const cid = auditStr(it, 'correlationId');
      const group = cid ? byCid.get(cid) || [] : [];
      if (cid && group.length > 1) {
        for (const g of group) seen.add(g.id);
        out.push({ type: 'batch', cid, items: group });
      } else {
        seen.add(it.id);
        out.push({ type: 'row', item: it });
      }
    }
    return out;
  }, [items]);

  const filterBar = (
    <div className="filterbar">
      <div className="fsel">
        <select
          value={filters.status}
          onChange={(e) => onFiltersChange({ status: e.target.value as LogApiRuFilters['status'] })}
        >
          <option value="">Tout statut</option>
          <option value="success">Succès</option>
          <option value="warning">Retry / warning</option>
          <option value="error">Échec</option>
        </select>
      </div>
      <div className="fsel">
        <select
          value={filters.dir}
          onChange={(e) => onFiltersChange({ dir: e.target.value as LogApiRuFilters['dir'] })}
        >
          <option value="">Push & Pull</option>
          <option value="push">↑ Push</option>
          <option value="pull">↓ Pull</option>
        </select>
      </div>
      <div className="fsel">
        <select
          value={filters.category}
          onChange={(e) => onFiltersChange({ category: e.target.value as LogApiRuFilters['category'] })}
        >
          <option value="">Toute catégorie</option>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {RU_CATEGORIES[c].label}
            </option>
          ))}
        </select>
      </div>
      <div className="fsel">
        <select value={filters.action} onChange={(e) => onFiltersChange({ action: e.target.value })}>
          <option value="">Toute action</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {actionLabel(a)}
            </option>
          ))}
        </select>
      </div>
      <div className="fsel">
        <select value={filters.ownerId} onChange={(e) => onFiltersChange({ ownerId: e.target.value })}>
          <option value="">Tous les owners</option>
          {owners.map((o) => (
            <option key={o.ownerId} value={o.ownerId}>
              {o.ownerName}
            </option>
          ))}
        </select>
      </div>
      <div className="fsel">
        <select value={filters.minDur} onChange={(e) => onFiltersChange({ minDur: e.target.value })}>
          <option value="">Durée min</option>
          <option value="1000">≥ 1 s</option>
          <option value="2000">≥ 2 s</option>
          <option value="5000">≥ 5 s</option>
        </select>
      </div>
      <div className="fsearch">
        <input
          type="text"
          placeholder="Rechercher listing / owner / réservation…"
          value={qLocal}
          onChange={(e) => onQInput(e.target.value)}
        />
      </div>
      {hasActiveFilters && (
        <button type="button" className="fclear" onClick={clearAll}>
          Réinitialiser
        </button>
      )}
      {data != null && (
        <span className="fmeta">
          {fmtN(total)} échange{total > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );

  let body: React.ReactNode;
  if (loading) {
    body = <SkeletonJournal />;
  } else if (error) {
    body = <ErrorState onRetry={onRetry} />;
  } else if (!items.length) {
    body = (
      <EmptyState
        title="Aucun échange"
        detail={
          hasActiveFilters
            ? 'Aucun appel ne correspond à ces filtres. Réinitialisez pour voir tous les échanges.'
            : 'Aucun échange Rental United sur la période sélectionnée.'
        }
      />
    );
  } else {
    body = (
      <>
        <div className="jlist">
          {grouped.map((g) => {
            if (g.type === 'row') {
              return (
                <JournalRow
                  key={g.item.id}
                  item={g.item}
                  active={g.item.id === activeCallId}
                  now={now}
                  onOpen={onOpenCall}
                />
              );
            }
            const lead = g.items[0];
            const worst = g.items.some((x) => uiStatus(x.status, x.statusCode) === 'error')
              ? 'error'
              : g.items.some((x) => uiStatus(x.status, x.statusCode) === 'warning')
                ? 'warning'
                : 'success';
            const isCollapsed = collapsed[g.cid];
            const label = `${actionLabel(lead.action)}${lead.listingName ? ` — ${lead.listingName}` : ''}`;
            return (
              <div className={`batch ${isCollapsed ? 'collapsed' : ''}`} key={g.cid}>
                <div
                  className="batch-head"
                  onClick={() => setCollapsed((c) => ({ ...c, [g.cid]: !c[g.cid] }))}
                >
                  <span className="cr">⛓ {g.cid}</span>
                  <span className="lbl">{label}</span>
                  <span className="cnt">{g.items.length} appels</span>
                  <span className="agg">
                    <StatusBadge
                      status={worst}
                      label={worst === 'success' ? 'OK' : worst === 'warning' ? 'retry' : 'échec'}
                    />
                  </span>
                  <span className="chev">▾</span>
                </div>
                {g.items.map((it) => (
                  <JournalRow
                    key={it.id}
                    item={it}
                    active={it.id === activeCallId}
                    now={now}
                    onOpen={onOpenCall}
                  />
                ))}
              </div>
            );
          })}
        </div>
        {totalPages > 1 && (
          <div className="lru-pagination">
            <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              ← Préc.
            </button>
            <span>
              page {page} / {totalPages}
            </span>
            <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              Suiv. →
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <div>
      {filterBar}
      {filters.correlationId && (
        <div className="errbox warn" style={{ marginBottom: 12, padding: '9px 13px' }}>
          <span className="ic">⛓</span>
          <div>
            <div className="ed">
              Journal filtré sur la corrélation <code>{filters.correlationId}</code>{' '}
              <button
                type="button"
                className="corr-link"
                onClick={() => onFiltersChange({ correlationId: '' })}
              >
                retirer le filtre
              </button>
            </div>
          </div>
        </div>
      )}
      {body}
    </div>
  );
}
