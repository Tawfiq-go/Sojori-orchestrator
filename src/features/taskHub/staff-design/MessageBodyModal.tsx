import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ModalScrollColumn } from '../../../components/common/ModalScrollColumn';
import { MESSAGE_MERGE_VARIABLES } from './orchestrationMessageVars';
import * as fulltaskApi from '../../../services/fulltaskApi';

interface Props {
  open: boolean;
  title: string;
  messageFr: string;
  channelLabel: string;
  channel: 'ota' | 'email';
  catalogId: string;
  ownerId?: string;
  signature?: string;
  onClose: () => void;
  /** Absent = aperçu lecture seule (ex. avec signature). */
  onChange?: (text: string) => void;
}

type PreviewData = NonNullable<
  Awaited<ReturnType<typeof fulltaskApi.previewCatalogMessage>>['data']
>;

/** Aperçu + édition message Email/OTA avec variables résa / listing */
export default function MessageBodyModal({
  open,
  title,
  messageFr,
  channelLabel,
  channel,
  catalogId,
  ownerId,
  signature,
  onClose,
  onChange,
}: Props) {
  const readOnly = !onChange;
  const [showVars, setShowVars] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  const groupedVars = useMemo(() => {
    const map = new Map<string, typeof MESSAGE_MERGE_VARIABLES>();
    MESSAGE_MERGE_VARIABLES.forEach((v) => {
      const arr = map.get(v.group) || [];
      arr.push(v);
      map.set(v.group, arr);
    });
    return [...map.entries()];
  }, []);

  const showTaxDual = messageFr.includes('{cityTaxParagraph}') || catalogId === 'departure_instructions';

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !readOnly || !ownerId || !catalogId) {
      setPreview(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fulltaskApi.previewCatalogMessage(ownerId, {
          catalogId,
          channel,
          messageFr,
          signature,
        });
        if (cancelled) return;
        if (!res.success || !res.data) {
          setPreview(null);
          setError(res.error || 'Aperçu indisponible');
          return;
        }
        setPreview(res.data);
      } catch (e) {
        if (cancelled) return;
        setPreview(null);
        setError(e instanceof Error ? e.message : 'Erreur aperçu');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, readOnly, ownerId, catalogId, channel, messageFr, signature]);

  if (!open) return null;

  const insertVar = (key: string) => {
    if (!onChange) return;
    onChange(`${messageFr}${messageFr.endsWith('\n') || messageFr === '' ? '' : '\n'}${key}`);
  };

  return createPortal(
    <div
      className="orch-msg-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orch-msg-modal-title"
      onClick={onClose}
    >
      <div
        className="orch-msg-modal"
        style={{ maxWidth: readOnly ? 960 : undefined, width: readOnly ? 'min(960px, 96vw)' : undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="orch-msg-modal-h">
          <div>
            <h3 id="orch-msg-modal-title">{title}</h3>
            <span className="orch-msg-modal-sub">
              Canal · {channelLabel} · version FR
              {preview
                ? ` · résa ${preview.reservation.number} · ${preview.reservation.guestName}`
                : ''}
            </span>
          </div>
          <button type="button" className="orch-msg-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>

        <div className="orch-msg-modal-body" style={readOnly ? { display: 'block' } : undefined}>
          {readOnly ? (
            <div>
              {loading ? (
                <p style={{ fontSize: 13, color: 'var(--t3)', padding: 16 }}>
                  Chargement de la dernière réservation…
                </p>
              ) : null}
              {error ? (
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--er, #b00)',
                    padding: '12px 16px',
                    background: 'rgba(200,30,30,0.06)',
                    borderRadius: 8,
                    margin: '0 0 12px',
                  }}
                >
                  {error}
                </p>
              ) : null}
              {preview ? (
                <p style={{ fontSize: 12, color: 'var(--t3)', margin: '0 0 12px', lineHeight: 1.45 }}>
                  Simulation sur <b>{preview.reservation.listingName}</b>
                  {preview.reservation.channelName ? ` · ${preview.reservation.channelName}` : ''}
                  {' · '}
                  {preview.reservation.arrivalDate} → {preview.reservation.departureDate}
                  {preview.cityTaxWouldCollect
                    ? ' · cette résa a une taxe à récupérer'
                    : ' · cette résa n’a pas de taxe à récupérer (aperçu « avec taxe » = simulation listing)'}
                </p>
              ) : null}

              {showTaxDual && preview ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                  }}
                >
                  <PreviewPane label="Sans taxe de séjour" text={preview.withoutTax} />
                  <PreviewPane label="Avec taxe de séjour" text={preview.withTax} accent />
                </div>
              ) : preview ? (
                <PreviewPane
                  label="Aperçu (données réservation réelle + signature)"
                  text={preview.withoutTax || preview.withTax}
                />
              ) : !loading && !error ? (
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: 13,
                    lineHeight: 1.45,
                    margin: 0,
                    padding: 14,
                    background: '#f7f8fa',
                    borderRadius: 10,
                    border: '1px solid var(--bd, #e8e4d9)',
                  }}
                >
                  {messageFr}
                </pre>
              ) : null}
            </div>
          ) : (
            <>
              <div className="orch-msg-editor-col">
                <label className="orch-msg-lbl" htmlFor="orch-msg-textarea">
                  Corps du message
                </label>
                <textarea
                  id="orch-msg-textarea"
                  className="orch-msg-textarea"
                  value={messageFr}
                  readOnly={readOnly}
                  onChange={(e) => onChange?.(e.target.value)}
                  spellCheck={false}
                />
              </div>

              <aside className="orch-msg-vars-col">
                <button
                  type="button"
                  className="orch-msg-vars-toggle"
                  onClick={() => setShowVars((v) => !v)}
                >
                  {showVars ? '▼' : '▶'} Variables réservation / listing
                </button>
                {showVars && (
                  <ModalScrollColumn
                    active={open}
                    className="orch-message-vars-scroll"
                    wrapperSx={{ flex: 1, minHeight: 0 }}
                    innerSx={{ p: 1 }}
                  >
                    {groupedVars.map(([group, vars]) => (
                      <div key={group} className="orch-msg-var-group">
                        <div className="orch-msg-var-group-h">{group}</div>
                        {vars.map((v) => (
                          <button
                            key={v.key}
                            type="button"
                            className="orch-msg-var-btn"
                            title={`Insérer ${v.key}`}
                            onClick={() => insertVar(v.key)}
                          >
                            <code>{v.key}</code>
                            <span>{v.label}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </ModalScrollColumn>
                )}
              </aside>
            </>
          )}
        </div>

        <footer className="orch-msg-modal-foot">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Fermer
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function PreviewPane({
  label,
  text,
  accent,
}: {
  label: string;
  text: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          color: accent ? 'var(--pd, #0673b3)' : 'var(--t3)',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          fontSize: 13,
          lineHeight: 1.45,
          margin: 0,
          padding: 14,
          minHeight: 220,
          background: accent ? 'rgba(6,115,179,0.05)' : '#f7f8fa',
          borderRadius: 10,
          border: accent
            ? '1px solid rgba(6,115,179,0.35)'
            : '1px solid var(--bd, #e8e4d9)',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        {text || '—'}
      </pre>
    </div>
  );
}
