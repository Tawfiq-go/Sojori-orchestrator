/**
 * Modal « Bloquer la chambre » — calendrier Multi, ligne chambre.
 * Wording 100 % Sojori (jamais « Mews »).
 */
import React, { useEffect, useState } from 'react';
import { T } from './_shared';
import { postRoomBlock } from '../../services/channelsDashboardApi';

const CATEGORIES = [
  { id: 'travaux', label: 'Travaux', icon: '🔧' },
  { id: 'interne', label: 'Usage interne', icon: '👤' },
  { id: 'non_pret', label: 'Non prêt', icon: '🚧' },
  { id: 'autre', label: 'Autre', icon: '📌' },
];

/**
 * @param {{
 *   open: boolean,
 *   roomName?: string,
 *   roomId: string,
 *   dateFrom: string,
 *   dateTo: string,
 *   overlapMessage?: string | null,
 *   onClose: () => void,
 *   onSuccess: () => void | Promise<void>,
 * }} props
 */
export default function BlockRoomModal({
  open,
  roomName = 'Chambre',
  roomId,
  dateFrom: initialFrom,
  dateTo: initialTo,
  overlapMessage = null,
  onClose,
  onSuccess,
}) {
  const [category, setCategory] = useState('travaux');
  const [title, setTitle] = useState('');
  const [dateFrom, setDateFrom] = useState(initialFrom || '');
  const [dateTo, setDateTo] = useState(initialTo || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setCategory('travaux');
    setTitle('');
    setDateFrom(initialFrom || '');
    setDateTo(initialTo || '');
    setBusy(false);
    setError(overlapMessage || null);
  }, [open, initialFrom, initialTo, overlapMessage]);

  if (!open) return null;

  const blockedByOverlap = Boolean(overlapMessage);
  const canSubmit =
    !blockedByOverlap &&
    !busy &&
    Boolean(roomId) &&
    Boolean(title.trim()) &&
    Boolean(dateFrom) &&
    Boolean(dateTo) &&
    dateTo >= dateFrom;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await postRoomBlock({
        roomId: String(roomId),
        dateFrom,
        dateTo,
        category,
        title: title.trim(),
      });
      await onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Échec du blocage');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bloquer la chambre"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(20,17,10,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose?.();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: T.bg || '#fff',
          borderRadius: 14,
          border: `1px solid ${T.border}`,
          boxShadow: '0 18px 50px rgba(20,17,10,0.18)',
          padding: '18px 20px 16px',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 4 }}>
          Bloquer la chambre
        </div>
        <div style={{ fontSize: 12, color: T.text3, marginBottom: 14 }}>
          {roomName}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
          Catégorie
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                disabled={busy || blockedByOverlap}
                onClick={() => setCategory(c.id)}
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: `1px solid ${active ? T.primary || '#b8851a' : T.border}`,
                  background: active ? 'rgba(184,133,26,0.12)' : T.bg2 || '#faf9f7',
                  cursor: busy || blockedByOverlap ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.text,
                }}
              >
                {c.icon} {c.label}
              </button>
            );
          })}
        </div>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
          Libellé <span style={{ color: T.error || '#b91c1c' }}>*</span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy || blockedByOverlap}
          placeholder="ex. invité M. Rachid"
          maxLength={120}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '9px 11px',
            borderRadius: 9,
            border: `1px solid ${T.border}`,
            fontSize: 13,
            marginBottom: 14,
            fontFamily: 'inherit',
          }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
              Du
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              disabled={busy || blockedByOverlap}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 10px',
                borderRadius: 9,
                border: `1px solid ${T.border}`,
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.text2, marginBottom: 6 }}>
              Au (inclus)
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              disabled={busy || blockedByOverlap}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 10px',
                borderRadius: 9,
                border: `1px solid ${T.border}`,
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {error ? (
          <div
            style={{
              fontSize: 12,
              color: T.error || '#b91c1c',
              background: 'rgba(185,28,28,0.08)',
              borderRadius: 8,
              padding: '8px 10px',
              marginBottom: 12,
              whiteSpace: 'pre-wrap',
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={() => !busy && onClose?.()}
            disabled={busy}
            style={{
              padding: '8px 14px',
              borderRadius: 9,
              border: `1px solid ${T.border}`,
              background: '#fff',
              fontWeight: 700,
              fontSize: 12,
              cursor: busy ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            style={{
              padding: '8px 14px',
              borderRadius: 9,
              border: 0,
              background: canSubmit ? (T.primary || '#b8851a') : '#d6d3cd',
              color: '#fff',
              fontWeight: 800,
              fontSize: 12,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit',
            }}
          >
            {busy ? 'Blocage…' : 'Bloquer'}
          </button>
        </div>
      </div>
    </div>
  );
}
