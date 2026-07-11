// ════════════════════════════════════════════════════════════════════
// AuditBlockedDaysModal.jsx — audit disponibilité, résultat en tableau
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { ModalPortal } from '../ModalPortal';
import { T } from './_shared';
import { CLASSIFICATION_LABEL, CLASSIFICATION_TONE, formatBlockedDayRange } from './auditBlockedDays';

export default function AuditBlockedDaysModal({
  open, onClose, listingName, roomTypeName, loading, error, roomTypes = [],
  onRelease,
}) {
  const [releaseState, setReleaseState] = React.useState({}); // clé plage → 'busy' | 'done' | message d'erreur
  if (!open) return null;

  const allRanges = roomTypes.flatMap((rt) =>
    (rt.ranges || []).map((range) => ({ ...range, roomTypeName: rt.roomTypeName, roomTypeId: rt.roomTypeId }))
  );

  const rangeKey = (r) => `${r.roomTypeId}:${r.from}:${r.to}`;
  const handleRelease = async (range) => {
    if (!onRelease) return;
    const key = rangeKey(range);
    setReleaseState((s) => ({ ...s, [key]: 'busy' }));
    try {
      await onRelease(range);
      setReleaseState((s) => ({ ...s, [key]: 'done' }));
    } catch (err) {
      setReleaseState((s) => ({ ...s, [key]: err?.message || 'Échec de la libération' }));
    }
  };

  return (
    <ModalPortal>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(20,17,10,0.45)',
        backdropFilter: 'blur(4px)', zIndex: 55,
      }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, pointerEvents: 'none',
      }}>
        <div style={{
          pointerEvents: 'auto',
          background: T.bg1,
          borderRadius: 18,
          width: 'min(720px, calc(100vw - 32px))',
          maxHeight: 'min(85vh, calc(100dvh - 32px))',
          boxShadow: '0 24px 64px rgba(20,17,10,0.25)',
          animation: 'fadeIn 0.3s both',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', boxSizing: 'border-box',
        }}>
          {/* Header */}
          <div style={{
            padding: '18px 22px', borderBottom: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-0.015em' }}>
                Audit disponibilité
              </h3>
              <div style={{ fontSize: 12.5, color: T.text3, marginTop: 4 }}>
                {listingName}{roomTypeName ? ` · ${roomTypeName}` : ''} · 365 prochains jours
              </div>
            </div>
            <button onClick={onClose} aria-label="Fermer"
              style={{ background: 'none', border: 0, color: T.text4, fontSize: 20, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>
              ×
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '16px 22px 22px', overflowY: 'auto' }}>
            {loading && (
              <div style={{ padding: '24px 0', fontSize: 13, color: T.text3, textAlign: 'center' }}>
                Analyse des 365 prochains jours…
              </div>
            )}

            {!loading && error && (
              <div style={{ padding: '16px 0', fontSize: 13, color: T.error }}>
                Erreur : {error}
              </div>
            )}

            {!loading && !error && allRanges.length === 0 && (
              <div style={{ padding: '24px 0', fontSize: 13, color: T.text3, textAlign: 'center' }}>
                Aucune anomalie — jours bloqués couverts par une résa, et aucune résa active sur un jour encore disponible.
              </div>
            )}

            {!loading && !error && allRanges.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    <th style={thStyle}>Du</th>
                    <th style={thStyle}>Au</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Jours</th>
                    <th style={thStyle}>Cause probable</th>
                    <th style={thStyle}>Résa</th>
                    {roomTypeName == null && <th style={thStyle}>Room type</th>}
                    {onRelease ? <th style={thStyle}>Action</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {allRanges.map((range, i) => {
                    const tone = CLASSIFICATION_TONE[range.classification];
                    const color = T[tone] || T.text3;
                    const canRelease = range.classification !== 'missing_reservation_block';
                    return (
                      <tr key={`${range.from}-${range.to}-${i}`}
                        style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={tdStyle}>{range.from}</td>
                        <td style={tdStyle}>{range.to}</td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>{range.dayCount}</td>
                        <td style={{ ...tdStyle, color, fontWeight: 600 }}>
                          {CLASSIFICATION_LABEL[range.classification]}
                        </td>
                        <td style={{ ...tdStyle, color: T.text3, fontFamily: '"Geist Mono", monospace', fontSize: 11 }}>
                          {(range.reservationNumbers || []).join(', ') || '—'}
                        </td>
                        {roomTypeName == null && (
                          <td style={{ ...tdStyle, color: T.text3 }}>{range.roomTypeName || '—'}</td>
                        )}
                        {onRelease ? (
                          <td style={tdStyle}>
                            {(() => {
                              if (!canRelease) {
                                return (
                                  <span style={{ color: T.text3, fontSize: 11 }} title="Utiliser ReservationSync → Corriger (CALENDAR_BLOCK_MISSING)">
                                    À rebloquer
                                  </span>
                                );
                              }
                              const st = releaseState[rangeKey(range)];
                              if (st === 'done') return <span style={{ color: T.success, fontWeight: 700 }}>Libéré ✓</span>;
                              if (st === 'busy') return <span style={{ color: T.text3 }}>Libération…</span>;
                              return (
                                <>
                                  <button
                                    onClick={() => void handleRelease(range)}
                                    title="Rouvrir ces jours à la vente (calendrier + canaux). Les jours couverts par une réservation active ne sont jamais listés ici."
                                    style={{
                                      background: 'none', cursor: 'pointer', fontWeight: 700,
                                      border: `1px solid ${T.gold}`, color: T.goldDeep,
                                      borderRadius: 8, padding: '3px 10px', fontSize: 12,
                                    }}
                                  >
                                    Libérer
                                  </button>
                                  {st && st !== 'done' && st !== 'busy' ? (
                                    <div style={{ color: T.error, fontSize: 11, marginTop: 2 }}>{st}</div>
                                  ) : null}
                                </>
                              );
                            })()}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

const thStyle = {
  textAlign: 'left', padding: '6px 10px', fontSize: 10.5, fontWeight: 700,
  color: T.text3, textTransform: 'uppercase', letterSpacing: '0.04em',
  fontFamily: '"Geist Mono", monospace',
};

const tdStyle = {
  padding: '8px 10px', color: T.text,
};
