/** LogApiRU · Vue C — Détail d'un échange : XML/JSON colorisé, copie, navigation ↑↓/Esc. */
import { useEffect, useMemo, useState } from 'react';
import {
  fetchLogApiRuCallDetail,
  type LogApiRuCallDetail,
  type LogApiRuItem,
} from '../../services/logApiRuApi';
import {
  RU_CODES,
  actionDir,
  actionLabel,
  absTime,
  fmtN,
  highlightJson,
  highlightXml,
  uiStatus,
} from './logApiRuMeta';
import { CatPill, DirBadge, StatusBadge } from './logApiRuBits';
import { categoryOfAction } from './logApiRuFilters';

type Fmt = 'xml' | 'json';

function XPanel({
  label,
  side,
  xml,
  json,
}: {
  label: string;
  side: 'req' | 'res';
  xml: string;
  json: unknown;
}) {
  const [fmt, setFmt] = useState<Fmt>('xml');
  const [copied, setCopied] = useState(false);

  const jsonText = useMemo(() => {
    try {
      return JSON.stringify(json ?? null, null, 2);
    } catch {
      return String(json);
    }
  }, [json]);

  const html = useMemo(
    () => (fmt === 'xml' ? highlightXml(xml || '—') : highlightJson(jsonText)),
    [fmt, xml, jsonText],
  );

  const onCopy = () => {
    const txt = fmt === 'xml' ? xml : jsonText;
    if (navigator.clipboard) void navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="xpanel">
      <div className="xpanel-h">
        <span className="lbl">{label}</span>
        <span className={`dir ${side === 'req' ? 'push' : 'pull'}`}>
          <span className="ar">{side === 'req' ? '↗' : '↙'}</span>
          {side === 'req' ? 'RQ' : 'RS'}
        </span>
        <div className="right">
          <div className="fmt-toggle">
            <button type="button" className={fmt === 'xml' ? 'on' : ''} onClick={() => setFmt('xml')}>
              XML
            </button>
            <button type="button" className={fmt === 'json' ? 'on' : ''} onClick={() => setFmt('json')}>
              JSON
            </button>
          </div>
          <button type="button" className={`copy-btn ${copied ? 'done' : ''}`} onClick={onCopy}>
            <span>{copied ? '✓' : '⧉'}</span>
            {copied ? 'Copié' : 'Copier'}
          </button>
        </div>
      </div>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: contenu échappé via escHtml avant coloration */}
      <pre className="code" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

export interface LogApiRuDrawerProps {
  callId: string | null;
  ids: string[];
  /** Item enrichi correspondant (noms listing/owner/résa) si présent dans la page courante du journal. */
  enriched?: LogApiRuItem | null;
  onClose: () => void;
  onNavigate: (id: string) => void;
  onFilterCorrelation: (correlationId: string) => void;
}

export function LogApiRuDrawer({
  callId,
  ids,
  enriched,
  onClose,
  onNavigate,
  onFilterCorrelation,
}: LogApiRuDrawerProps) {
  const [detail, setDetail] = useState<LogApiRuCallDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const open = Boolean(callId);
  const idx = callId ? ids.indexOf(callId) : -1;

  useEffect(() => {
    if (!callId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetchLogApiRuCallDetail(callId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [callId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown' && idx >= 0 && idx < ids.length - 1) {
        onNavigate(ids[idx + 1]);
        e.preventDefault();
      }
      if (e.key === 'ArrowUp' && idx > 0) {
        onNavigate(ids[idx - 1]);
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, idx, ids, onClose, onNavigate]);

  const audit = detail?.auditContext ?? {};
  const auditStr = (k: string): string => {
    const v = audit[k];
    return typeof v === 'string' ? v : '';
  };
  const contextIds = useMemo(() => {
    const out: string[] = [];
    for (const k of ['listingId', 'ownerId', 'accountId', 'sojoriReservationNumber']) {
      const v = auditStr(k);
      if (v) out.push(v);
    }
    for (const k of ['listingIds', 'ownerIds', 'roomTypeIds']) {
      const v = audit[k];
      if (Array.isArray(v)) out.push(...v.map(String));
    }
    return [...new Set(out)];
  }, [audit]);

  const status = detail ? uiStatus(detail.status, detail.statusCode, detail.responseTime) : 'success';
  const code = detail ? RU_CODES[detail.statusCode] : undefined;
  const correlationId = auditStr('correlationId');
  const trigger = auditStr('trigger');
  const source = auditStr('modificationSource');

  return (
    <>
      <div className={`scrim ${open ? 'on' : ''}`} onClick={onClose} />
      <aside className={`drawer ${open ? 'on' : ''}`} aria-hidden={!open}>
        {open && (
          <>
            <div className="dwr-nav">
              <button type="button" className="close" onClick={onClose} title="Fermer (Esc)">
                ✕
              </button>
              {detail && (
                <>
                  <DirBadge dir={actionDir(detail.action)} />
                  <CatPill cat={categoryOfAction(detail.action)} />
                </>
              )}
              <div className="pn">
                <button
                  type="button"
                  disabled={idx <= 0}
                  onClick={() => idx > 0 && onNavigate(ids[idx - 1])}
                  title="Précédent (↑)"
                >
                  ↑
                </button>
                <span className="pos">
                  {idx >= 0 ? idx + 1 : '—'} / {ids.length}
                </span>
                <button
                  type="button"
                  disabled={idx < 0 || idx >= ids.length - 1}
                  onClick={() => idx < ids.length - 1 && onNavigate(ids[idx + 1])}
                  title="Suivant (↓)"
                >
                  ↓
                </button>
              </div>
            </div>
            <div className="dwr-body">
              {loading && (
                <div>
                  <div className="skel" style={{ height: 24, width: 280, marginBottom: 14 }} />
                  <div className="skel" style={{ height: 90, width: '100%', marginBottom: 14 }} />
                  <div className="skel" style={{ height: 300, width: '100%' }} />
                </div>
              )}
              {!loading && failed && (
                <div className="errstate">
                  <div className="em">⚠️</div>
                  <div className="t">Détail introuvable</div>
                  <div className="d">Impossible de charger cet échange (supprimé après 30 j ?).</div>
                </div>
              )}
              {!loading && detail && (
                <>
                  <div className="dwr-title">
                    <div style={{ flex: 1 }}>
                      <div className="big">{actionLabel(detail.action)}</div>
                      <div className="tech">
                        {detail.action} · id {detail.id}
                      </div>
                      {enriched &&
                        (enriched.listingName || enriched.ownerName || enriched.sojoriReservationNumber) && (
                          <div className="chips" style={{ display: 'flex', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                            {enriched.listingName && (
                              <span className="chip">
                                <span className="i">🏠</span>
                                {enriched.listingName}
                              </span>
                            )}
                            {enriched.ownerName && (
                              <span className="chip">
                                <span className="i">👤</span>
                                {enriched.ownerName}
                              </span>
                            )}
                            {enriched.sojoriReservationNumber && (
                              <span className="chip">
                                <span className="i">🗓</span>
                                {enriched.sojoriReservationNumber}
                              </span>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                  <div className="dwr-meta">
                    <div className="cell">
                      <div className="l">Statut</div>
                      <StatusBadge status={status} statusCode={detail.statusCode} />
                    </div>
                    <div className="cell">
                      <div className="l">Code RU</div>
                      <div className="val mono">
                        {detail.statusCode || '—'}
                        {code ? ` · ${code.label}` : ''}
                      </div>
                    </div>
                    <div className="cell">
                      <div className="l">Durée</div>
                      <div className="val mono">
                        {detail.responseTime == null ? '—' : `${fmtN(detail.responseTime)} ms`}
                      </div>
                    </div>
                    <div className="cell">
                      <div className="l">Date</div>
                      <div className="val mono">{absTime(detail.createdAt)}</div>
                    </div>
                    <div className="cell">
                      <div className="l">Déclencheur</div>
                      <div className="val">{[source, trigger].filter(Boolean).join(' · ') || '—'}</div>
                    </div>
                    <div className="cell">
                      <div className="l">Route</div>
                      <div className="val mono">{auditStr('route') || '—'}</div>
                    </div>
                    <div className="cell">
                      <div className="l">Corrélation</div>
                      {correlationId ? (
                        <button
                          type="button"
                          className="corr-link"
                          onClick={() => onFilterCorrelation(correlationId)}
                          title="Voir tous les appels de ce batch"
                        >
                          ⛓ {correlationId}
                        </button>
                      ) : (
                        <div className="val mono">—</div>
                      )}
                    </div>
                    <div className="cell">
                      <div className="l">Contexte</div>
                      <div className="val mono">{contextIds.join(', ') || '—'}</div>
                    </div>
                  </div>

                  {status !== 'success' && (
                    <div className={`errbox ${status === 'error' ? '' : 'warn'}`}>
                      <span className="ic">{status === 'error' ? '⛔' : '⚠️'}</span>
                      <div>
                        <div className="et">
                          {status === 'error' ? 'Erreur' : 'Avertissement'} · code {detail.statusCode}
                          {code ? ` — ${code.label}` : ''}
                        </div>
                        <div className="ed">
                          {detail.responseMsg}
                          {code?.hint && (
                            <>
                              <br />
                              <span style={{ color: 'var(--lru-text3)' }}>{code.hint}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="xchange">
                    <XPanel label="Requête" side="req" xml={detail.requestXml} json={detail.requestPayload} />
                    <XPanel label="Réponse" side="res" xml={detail.responseXml} json={detail.responseJson} />
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
