import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../services/fulltaskApi';
import type { OpsFeedItem } from '../../services/fulltaskApi';
import PlanManualAssignModal from '../planReservation/PlanManualAssignModal';
import './opsDashboard.css';

const GROUP_LABELS: Record<string, string> = {
  turnover: 'Turnovers même jour',
  cleaning: 'Ménages',
  concierge: 'Transport & conciergerie',
  support: 'Support / SAV',
  arrival: 'Arrivées',
  departure: 'Départs',
  registration: 'Enregistrement',
  messages: 'Messages planifiés',
  staff_reminder: 'Rappels staff',
  escalade: 'Escalades',
  other: 'Autres',
};

const URGENCY_CHIPS = [
  { id: 'all', label: 'Tout' },
  { id: 'turnover', label: '🔄 Turnover' },
  { id: 'cleaning', label: '🧹 Ménage sans staff' },
  { id: 'transport', label: '🚗 Transport' },
  { id: 'hour_missing', label: '🛬 Heure non choisie' },
  { id: 'escalade', label: '⚡ Escalade' },
  { id: 'relance_late', label: '💬 Relance en retard' },
  { id: 'support', label: '🆘 Support' },
];

function formatNow(): string {
  const d = new Date();
  const months = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc'];
  return `${d.getDate()} ${months[d.getMonth()]} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function OpsItemCard({
  item,
  onAction,
}: {
  item: OpsFeedItem;
  onAction: (item: OpsFeedItem, kind: string) => void;
}) {
  return (
    <div className={`ops-item ${item.priority}`}>
      <div className="ops-prio-bar" />
      <div className="ops-item-main">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4, flexWrap: 'wrap' }}>
          <span className={`ops-pchip ${item.priority}`}>{item.priority === 'ok' ? 'OK' : item.priority.toUpperCase()}</span>
          <span>{item.emoji}</span>
          <span style={{ fontWeight: 700 }}>
            {item.title} · <span style={{ color: 'var(--t2)' }}>{item.listingName}</span>
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t3)' }}>{item.guestName}</span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--t3)' }}>
            {item.reservationCode}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--t2)', marginBottom: 4 }}>
          {item.timeLabel && <span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{item.timeLabel}</span>}
          {item.timeLabel && ' · '}
          <span style={{ color: item.priority === 'ok' ? 'var(--t2)' : 'var(--p1)', fontWeight: 700 }}>{item.problem}</span>
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>
          {item.meta}{' '}
          {item.statusBadges.map((b) => (
            <span key={b.code} className={`ops-status-badge ${b.code}`} style={{ marginLeft: 6 }}>
              {b.label}
            </span>
          ))}
        </div>
      </div>
      <div className="ops-item-actions">
        {item.actions.map((a) => (
          <button
            key={`${a.kind}-${a.label}`}
            type="button"
            className={`ops-act ${a.primary ? 'primary' : a.kind === 'plan' ? 'link' : 'sec'}`}
            onClick={() => onAction(item, a.kind)}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DayColumn({
  label,
  sub,
  day,
  items,
  onAction,
}: {
  label: string;
  sub: string;
  day: 'today' | 'tomorrow';
  items: OpsFeedItem[];
  onAction: (item: OpsFeedItem, kind: string) => void;
}) {
  const dayItems = items.filter((i) => i.day === day);
  const groups = useMemo(() => {
    const map = new Map<string, OpsFeedItem[]>();
    for (const it of dayItems) {
      const k = it.groupKey;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return [...map.entries()];
  }, [dayItems]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  return (
    <div>
      <div className={`ops-day-head ${day === 'tomorrow' ? 'tomorrow' : ''}`}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>
          {label}
          <small style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--t3)', marginLeft: 7 }}>{sub}</small>
        </div>
      </div>
      {groups.map(([key, rows]) => {
        const open = openGroups[key] ?? true;
        const p1 = rows.filter((r) => r.priority === 'p1').length;
        return (
          <div className="ops-group" key={key}>
            <button
              type="button"
              className={`ops-group-h ${open ? 'open' : ''}`}
              onClick={() => setOpenGroups((s) => ({ ...s, [key]: !open }))}
            >
              <span>{rows[0]?.emoji || '📋'}</span>
              <span style={{ fontWeight: 700 }}>{GROUP_LABELS[key] || key}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, background: 'var(--alt)', padding: '2px 7px', borderRadius: 99 }}>
                {rows.length}
              </span>
              {p1 > 0 && (
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--p1)', background: 'var(--p1T)', padding: '2px 7px', borderRadius: 99 }}>
                  🔴 {p1}
                </span>
              )}
              <span style={{ marginLeft: 8, color: 'var(--t3)' }}>{open ? '▼' : '▶'}</span>
            </button>
            <div className={`ops-group-body ${open ? 'open' : ''}`}>
              {rows.map((item) => (
                <OpsItemCard key={item.id} item={item} onAction={onAction} />
              ))}
            </div>
          </div>
        );
      })}
      {groups.length === 0 && (
        <div style={{ padding: 24, color: 'var(--t3)', textAlign: 'center' }}>Rien à signaler ce jour</div>
      )}
    </div>
  );
}

export function OpsDashboard() {
  const navigate = useNavigate();
  const [view, setView] = useState<'today' | 'urg'>('today');
  const [feed, setFeed] = useState<fulltaskApi.OpsFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [assignCtx, setAssignCtx] = useState<{ reservationId: string; taskId: string } | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fulltaskApi.getOpsFeed(2);
      setFeed(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur chargement Ops');
      setFeed(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  const filteredItems = useMemo(() => {
    if (!feed?.items) return [];
    const q = search.trim().toLowerCase();
    return feed.items.filter((i) => {
      if (q) {
        const hay = `${i.reservationCode} ${i.guestName} ${i.listingName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [feed, search]);

  const urgentItems = useMemo(() => {
    let rows = filteredItems.filter((i) => i.urgent || i.priority === 'p1' || i.priority === 'p2');
    if (urgencyFilter !== 'all') {
      rows = rows.filter((i) => i.urgencyFilter === urgencyFilter);
    }
    return rows;
  }, [filteredItems, urgencyFilter]);

  const handleAction = async (item: OpsFeedItem, kind: string) => {
    if (kind === 'plan') {
      navigate(`/orchestration/plans?reservationId=${encodeURIComponent(item.reservationId)}`);
      return;
    }
    if (kind === 'assign' && item.taskId) {
      setAssignCtx({ reservationId: item.reservationId, taskId: item.taskId });
      return;
    }
    if (kind === 'relance_guest' && item.taskId) {
      const idx = item.actions.find((a) => a.kind === 'relance_guest')?.index ?? 0;
      try {
        const res = await fulltaskApi.sendPlanRelance(item.reservationId, item.taskId, idx);
        if (res?.success === false) throw new Error(res?.error || 'Échec');
        toast.success('Relance envoyée');
        void load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur relance');
      }
      return;
    }
    if (kind === 'send_message' && item.messageIndex != null) {
      try {
        const res = await fulltaskApi.sendPlanMessage(item.reservationId, item.messageIndex);
        if (res?.success === false) throw new Error(res?.error || 'Échec');
        toast.success('Message envoyé');
        void load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur envoi');
      }
    }
  };

  const stats = feed?.stats;
  const urgentCount = filteredItems.filter((i) => i.urgent).length;

  return (
    <div className="ops-root">
      <div className="ops-hdr">
        <div className="ops-hdr-top">
          <div className="ops-brand">
            <div className="ops-brand-mark">S</div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>
              Sojori Ops<span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--t3)', marginLeft: 7 }}>PILOTAGE</span>
            </div>
          </div>
          <div className="ops-tabs">
            <button type="button" className={`ops-tab ${view === 'today' ? 'on' : ''}`} onClick={() => setView('today')}>
              📅 Aujourd&apos;hui & Demain
            </button>
            <button type="button" className={`ops-tab ${view === 'urg' ? 'on' : ''}`} onClick={() => setView('urg')}>
              🚨 Urgences
              <span className="ops-tab-ct">{urgentCount}</span>
            </button>
          </div>
          <input
            placeholder="SJ-, guest, listing…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '8px 13px',
              borderRadius: 10,
              border: '1px solid var(--b)',
              minWidth: 200,
              fontSize: 12.5,
            }}
          />
          <button type="button" className="ops-act sec" onClick={() => void load()}>
            ↻
          </button>
          <div style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--t2)' }}>{formatNow()}</div>
        </div>
        {stats && (
          <div className="ops-kpi-bar">
            <div className="ops-kpi c1">
              <span className="ops-kpi-v">{stats.critical}</span>
              <span className="ops-kpi-l">🔴 Critiques</span>
            </div>
            <div className="ops-kpi">
              <span className="ops-kpi-v" style={{ color: 'var(--p2)' }}>
                {stats.important}
              </span>
              <span className="ops-kpi-l">🟠 Importants</span>
            </div>
            <div className="ops-kpi">
              <span className="ops-kpi-v" style={{ color: 'var(--su)' }}>
                {stats.ok}
              </span>
              <span className="ops-kpi-l">🟢 OK</span>
            </div>
            <div className="ops-kpi">
              <span className="ops-kpi-v">{stats.checkInsToday}</span>
              <span className="ops-kpi-l">🛬 Check-in</span>
            </div>
            <div className="ops-kpi">
              <span className="ops-kpi-v">{stats.checkOutsToday}</span>
              <span className="ops-kpi-l">🛫 Check-out</span>
            </div>
            <div className="ops-kpi">
              <span className="ops-kpi-v">{stats.turnoversToday}</span>
              <span className="ops-kpi-l">🔄 Turnovers</span>
            </div>
          </div>
        )}
      </div>

      <div className="ops-body">
        {loading && !feed && <div className="ops-loading">Chargement des opérations…</div>}

        {view === 'today' && feed && (
          <div className="ops-two-day">
            <DayColumn label="Aujourd'hui" sub="J0" day="today" items={filteredItems} onAction={handleAction} />
            <DayColumn label="Demain" sub="J+1" day="tomorrow" items={filteredItems} onAction={handleAction} />
          </div>
        )}

        {view === 'urg' && feed && (
          <>
            <div className="ops-urg-chips">
              {URGENCY_CHIPS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`ops-uchip ${urgencyFilter === c.id ? 'on' : ''}`}
                  onClick={() => setUrgencyFilter(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="ops-urg-table">
              <div className="ops-ut-row ops-ut-head">
                <div>P</div>
                <div>Type</div>
                <div>Listing / Guest</div>
                <div>Séjour</div>
                <div>Problème</div>
                <div>Deadline</div>
                <div>Staff</div>
                <div>Actions</div>
              </div>
              {urgentItems.map((item) => (
                <div className="ops-ut-row" key={item.id}>
                  <div>{item.priority.toUpperCase()}</div>
                  <div>
                    {item.emoji} {item.title.split('·')[0]}
                  </div>
                  <div>
                    <div>{item.listingName}</div>
                    <div style={{ color: 'var(--t3)', fontSize: 11 }}>{item.guestName}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{item.reservationCode}</div>
                  </div>
                  <div>{item.problem}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{item.timeLabel || '—'}</div>
                  <div>{item.staffName || '—'}</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {item.actions.slice(0, 3).map((a) => (
                      <button
                        key={a.kind}
                        type="button"
                        className={`ops-act ${a.primary ? 'primary' : 'sec'}`}
                        onClick={() => handleAction(item, a.kind)}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {urgentItems.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--t3)' }}>Aucune urgence — tout est OK</div>
              )}
            </div>
          </>
        )}
      </div>

      {assignCtx && (
        <PlanManualAssignModal
          open
          reservationId={assignCtx.reservationId}
          taskId={assignCtx.taskId}
          onClose={() => setAssignCtx(null)}
          onDone={() => {
            setAssignCtx(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

export default OpsDashboard;
