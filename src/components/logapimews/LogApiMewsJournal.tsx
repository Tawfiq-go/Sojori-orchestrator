/** LogApiMews · Vue B — Journal : échanges enrichis, filtres, batchs corrélés repliables. */
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type {
  LogApiMewsItem,
  LogApiMewsListResponse,
  LogApiMewsOwnerStat,
} from '../../services/logApiMewsApi';
import {
  CATEGORY_ORDER,
  RU_CATEGORIES,
  RU_CODES,
  actionDir,
  actionLabel,
  absTime,
  clockTime,
  fmtN,
  msClass,
  relTime,
  uiStatus,
} from './logApiMewsMeta';
import { CatPill, DirBadge, EmptyState, ErrorState, StatusBadge } from './logApiMewsBits';
import type { LogApiMewsFilters } from './logApiMewsFilters';
import { categoryOfAction } from './logApiMewsFilters';

const ROW_TSV_HEADER = [
  'heure',
  'date',
  'dir',
  'catégorie',
  'libellé',
  'action',
  'listing',
  'owner',
  'réservation',
  'source',
  'statut',
  'code',
  'durée',
  'correlationId',
  'id',
].join('\t');

function auditStr(item: LogApiMewsItem, key: string): string {
  const v = item.auditContext?.[key];
  return typeof v === 'string' ? v : '';
}

/** true si l’utilisateur est en train de sélectionner du texte (ne pas ouvrir le drawer). */
function hasTextSelection(): boolean {
  const sel = window.getSelection();
  return Boolean(sel && sel.toString().trim().length > 0);
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback below */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function formatRowPlain(item: LogApiMewsItem): string {
  const status = uiStatus(item.status, item.statusCode, item.responseTime);
  const source = auditStr(item, 'modificationSource') || auditStr(item, 'trigger');
  const cid = auditStr(item, 'correlationId');
  const parts = [
    clockTime(item.createdAt),
    absTime(item.createdAt),
    actionDir(item.action),
    categoryOfAction(item.action),
    actionLabel(item.action),
    item.action,
    item.listingName || item.listingId || '',
    item.ownerName || item.ownerId || '',
    item.sojoriReservationNumber || '',
    source,
    status,
    item.statusCode || '',
    item.responseTime == null ? '' : `${item.responseTime} ms`,
    cid,
    item.id,
  ];
  return parts.join('\t');
}

function formatRowsPlain(items: LogApiMewsItem[]): string {
  if (!items.length) return '';
  return [ROW_TSV_HEADER, ...items.map(formatRowPlain)].join('\n');
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
  selected,
  now,
  onOpen,
  onToggleSelect,
  onCheckToggle,
}: {
  item: LogApiMewsItem;
  active: boolean;
  selected: boolean;
  now: Date;
  onOpen: (id: string) => void;
  onToggleSelect: (id: string, e?: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) => void;
  onCheckToggle: (id: string) => void;
}) {
  const status = uiStatus(item.status, item.statusCode, item.responseTime);
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

  const onRowClick = (e: MouseEvent) => {
    if (hasTextSelection()) return;
    // Clic ligne = multi-select (Shift = plage, Cmd/Ctrl = toggle)
    onToggleSelect(item.id, e);
  };

  return (
    <div
      className={`jrow selectable ${active ? 'active' : ''} ${selected ? 'picked' : ''}`}
      onClick={onRowClick}
      onDoubleClick={() => onOpen(item.id)}
    >
      <label className="jcheck" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onCheckToggle(item.id)}
          aria-label="Sélectionner la ligne"
        />
      </label>
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
        <StatusBadge status={status} statusCode={item.statusCode} />
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
      <div className="jactions-end">
        <button
          type="button"
          className="jchev-btn"
          title="Ouvrir le détail"
          aria-label="Ouvrir le détail"
          onClick={(e) => {
            e.stopPropagation();
            onOpen(item.id);
          }}
        >
          ›
        </button>
      </div>
    </div>
  );
}

export interface LogApiMewsJournalProps {
  data: LogApiMewsListResponse | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  filters: LogApiMewsFilters;
  onFiltersChange: (patch: Partial<LogApiMewsFilters>) => void;
  owners: LogApiMewsOwnerStat[];
  actions: string[];
  page: number;
  onPageChange: (page: number) => void;
  activeCallId: string | null;
  onOpenCall: (id: string) => void;
}

export function LogApiMewsJournal({
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
}: LogApiMewsJournalProps) {
  const now = new Date();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [qLocal, setQLocal] = useState(filters.q);
  const [qTimer, setQTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [copyFlash, setCopyFlash] = useState<string | null>(null);
  const lastAnchorId = useRef<string | null>(null);

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.pagination.total ?? 0;
  const limit = data?.pagination.limit ?? 50;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const itemIds = useMemo(() => items.map((i) => i.id), [items]);
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setSelectedIds(new Set());
        lastAnchorId.current = null;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [page, filters, data?.pagination.total]);

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
    const byCid = new Map<string, LogApiMewsItem[]>();
    for (const it of items) {
      const cid = auditStr(it, 'correlationId');
      if (!cid) continue;
      const list = byCid.get(cid) || [];
      list.push(it);
      byCid.set(cid, list);
    }
    const seen = new Set<string>();
    const out: Array<{ type: 'row'; item: LogApiMewsItem } | { type: 'batch'; cid: string; items: LogApiMewsItem[] }> = [];
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

  const flashCopy = (label: string) => {
    setCopyFlash(label);
    window.setTimeout(() => setCopyFlash(null), 1400);
  };

  const checkToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    lastAnchorId.current = id;
  };

  const toggleSelect = (
    id: string,
    e?: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean },
  ) => {
    const shift = Boolean(e?.shiftKey);
    const multi = Boolean(e?.metaKey || e?.ctrlKey);
    setSelectedIds((prev) => {
      if (shift && lastAnchorId.current) {
        const next = new Set(prev);
        const a = itemIds.indexOf(lastAnchorId.current);
        const b = itemIds.indexOf(id);
        if (a >= 0 && b >= 0) {
          const [lo, hi] = a < b ? [a, b] : [b, a];
          for (let i = lo; i <= hi; i++) next.add(itemIds[i]);
          return next;
        }
      }
      if (multi) {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }
      if (prev.size === 1 && prev.has(id)) return new Set();
      return new Set([id]);
    });
    if (!shift) lastAnchorId.current = id;
  };

  const selectAllPage = () => {
    setSelectedIds(new Set(itemIds));
    lastAnchorId.current = itemIds[0] ?? null;
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    lastAnchorId.current = null;
  };

  const copyIds = async (ids: string[], label: string) => {
    const rows = ids.map((id) => itemById.get(id)).filter(Boolean) as LogApiMewsItem[];
    if (!rows.length) return;
    const ok = await copyText(formatRowsPlain(rows));
    if (ok) flashCopy(label);
  };

  const selectedCount = selectedIds.size;
  const allPageSelected = itemIds.length > 0 && itemIds.every((id) => selectedIds.has(id));

  const statusChips: Array<{ id: '' | 'error' | 'warning' | 'success'; label: string; hint: string }> = [
    { id: '', label: 'Tous', hint: 'Tous les appels' },
    { id: 'error', label: 'Échecs', hint: 'Échecs Connector Mews, hors rate limit' },
    { id: 'warning', label: 'Lents / rate limit', hint: 'Succès >10s ou HTTP 429 — pas une erreur métier' },
    { id: 'success', label: 'Succès', hint: 'OK et <10s' },
  ];

  const filterBar = (
    <div className="filterbar">
      <div className="status-chips" role="group" aria-label="Filtrer par statut">
        {statusChips.map((c) => (
          <button
            key={c.id || 'all'}
            type="button"
            className={`schip ${filters.status === c.id ? 'on' : ''} ${c.id === 'error' ? 'err' : ''} ${c.id === 'warning' ? 'warn' : ''}`}
            title={c.hint}
            onClick={() => onFiltersChange({ status: c.id })}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="fsel">
        <select
          value={filters.status}
          onChange={(e) => onFiltersChange({ status: e.target.value as LogApiMewsFilters['status'] })}
          aria-label="Statut (liste)"
        >
          <option value="">Tout statut</option>
          <option value="success">Succès</option>
          <option value="warning">Lent / rate limit</option>
          <option value="error">Échec</option>
        </select>
      </div>
      <div className="fsel">
        <select
          value={filters.dir}
          onChange={(e) => onFiltersChange({ dir: e.target.value as LogApiMewsFilters['dir'] })}
        >
          <option value="">Push · Pull · Webhook</option>
          <option value="push">↑ Push (sortant)</option>
          <option value="pull">↓ Pull (lecture)</option>
          <option value="webhook">↯ Webhook (entrant)</option>
        </select>
      </div>
      <div className="fsel">
        <select
          value={filters.category}
          onChange={(e) => onFiltersChange({ category: e.target.value as LogApiMewsFilters['category'] })}
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
          <option value="10000">≥ 10 s (lent)</option>
        </select>
      </div>
      <div className="fsearch">
        <input
          type="text"
          placeholder="Rechercher action / message / corrélation / réservation…"
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
            ? filters.dir === 'webhook' && filters.category && filters.category !== 'webhook'
              ? `Webhook + « ${filters.category} » : retire la catégorie ou choisis Webhooks.`
              : 'Aucun appel ne correspond à ces filtres. Réinitialisez, élargis la fenêtre, ou retire une contrainte (dir / catégorie).'
            : 'Aucun échange Mews Connector sur la période sélectionnée.'
        }
      />
    );
  } else {
    body = (
      <>
        <div className="jcopybar" role="toolbar" aria-label="Copie multi-lignes">
          <label className="jcheck">
            <input
              type="checkbox"
              checked={allPageSelected}
              onChange={() => (allPageSelected ? clearSelection() : selectAllPage())}
              aria-label="Tout sélectionner sur la page"
            />
            <span>Page</span>
          </label>
          <button type="button" className="jcopy-action" onClick={selectAllPage}>
            Tout sélectionner
          </button>
          <button
            type="button"
            className="jcopy-action primary"
            disabled={selectedCount === 0}
            onClick={() => void copyIds([...selectedIds], `${selectedCount} ligne(s) copiée(s)`)}
          >
            Copier {selectedCount > 0 ? `${selectedCount} ligne${selectedCount > 1 ? 's' : ''}` : 'la sélection'}
          </button>
          <button
            type="button"
            className="jcopy-action"
            onClick={() => void copyIds(itemIds, `Page · ${itemIds.length} ligne(s) copiée(s)`)}
          >
            Copier la page ({itemIds.length})
          </button>
          {selectedCount > 0 && (
            <button type="button" className="jcopy-action ghost" onClick={clearSelection}>
              Effacer
            </button>
          )}
          {copyFlash && <span className="jcopy-flash">✓ {copyFlash}</span>}
          <span className="jcopy-hint">Clic = sélection · Shift = plage · › = détail</span>
        </div>
        <div className="jlist">
          {grouped.map((g) => {
            if (g.type === 'row') {
              return (
                <JournalRow
                  key={g.item.id}
                  item={g.item}
                  active={g.item.id === activeCallId}
                  selected={selectedIds.has(g.item.id)}
                  now={now}
                  onOpen={onOpenCall}
                  onToggleSelect={toggleSelect}
                  onCheckToggle={checkToggle}
                />
              );
            }
            const lead = g.items[0];
            const worst = g.items.some((x) => uiStatus(x.status, x.statusCode, x.responseTime) === 'error')
              ? 'error'
              : g.items.some((x) => uiStatus(x.status, x.statusCode, x.responseTime) === 'warning')
                ? 'warning'
                : 'success';
            const isCollapsed = collapsed[g.cid];
            const label = `${actionLabel(lead.action)}${lead.listingName ? ` — ${lead.listingName}` : ''}`;
            const batchIds = g.items.map((it) => it.id);
            const batchAllSelected = batchIds.every((id) => selectedIds.has(id));
            return (
              <div className={`batch ${isCollapsed ? 'collapsed' : ''}`} key={g.cid}>
                <div
                  className="batch-head selectable"
                  onClick={() => {
                    if (hasTextSelection()) return;
                    setCollapsed((c) => ({ ...c, [g.cid]: !c[g.cid] }));
                  }}
                >
                  <label className="jcheck" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={batchAllSelected}
                      onChange={() => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (batchAllSelected) for (const id of batchIds) next.delete(id);
                          else for (const id of batchIds) next.add(id);
                          return next;
                        });
                        lastAnchorId.current = batchIds[0] ?? null;
                      }}
                      aria-label="Sélectionner le batch"
                    />
                  </label>
                  <span className="cr" title="Sélectionner pour copier">
                    ⛓ {g.cid}
                  </span>
                  <button
                    type="button"
                    className="jcopy batch-copy"
                    title="Copier toutes les lignes du batch"
                    aria-label="Copier toutes les lignes du batch"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await copyIds(batchIds, `Batch · ${batchIds.length} ligne(s) copiée(s)`);
                    }}
                  >
                    ⧉
                  </button>
                  <span className="lbl">{label}</span>
                  <span className="cnt">{g.items.length} appels</span>
                  <span className="agg">
                    <StatusBadge
                      status={worst}
                      label={worst === 'success' ? 'OK' : worst === 'warning' ? 'lent / 429' : 'échec'}
                    />
                  </span>
                  <span className="chev">▾</span>
                </div>
                {g.items.map((it) => (
                  <JournalRow
                    key={it.id}
                    item={it}
                    active={it.id === activeCallId}
                    selected={selectedIds.has(it.id)}
                    now={now}
                    onOpen={onOpenCall}
                    onToggleSelect={toggleSelect}
                    onCheckToggle={checkToggle}
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
