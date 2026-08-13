/**
 * Panneau détail + libération d'un blocage chambre (Multi).
 */
import React, { useState } from 'react';
import { T } from './_shared';
import { postRoomBlockRelease } from '../../services/channelsDashboardApi';
import {
  blockIsoDay,
  inferRoomBlockCategory,
  roomBlockCategoryLabel,
} from './roomBlockDisplay';

/**
 * @param {{
 *   block: any,
 *   roomName?: string,
 *   onClose: () => void,
 *   onReleased: () => void | Promise<void>,
 * }} props
 */
export default function ReleaseRoomBlockPanel({ block, roomName, onClose, onReleased }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  if (!block) return null;

  const title = String(block.title || 'Blocage').trim() || 'Blocage';
  const cat = inferRoomBlockCategory(title);
  const from = blockIsoDay(block.dateFrom);
  const to = blockIsoDay(block.dateTo);
  const mewsBlockId = String(block.mewsBlockId || '').trim();

  const release = async () => {
    if (!mewsBlockId) {
      setError('Impossible de libérer : identifiant de blocage manquant. Resynchroniser le calendrier.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await postRoomBlockRelease({ mewsBlockId });
      await onReleased?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Échec de la libération');
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Détail blocage chambre"
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
          maxWidth: 400,
          background: '#fff',
          borderRadius: 14,
          border: `1px solid ${T.border}`,
          boxShadow: '0 18px 50px rgba(20,17,10,0.18)',
          padding: '18px 20px 16px',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 800, color: T.text, marginBottom: 4 }}>
          Blocage de chambre
        </div>
        {roomName ? (
          <div style={{ fontSize: 12, color: T.text3, marginBottom: 12 }}>{roomName}</div>
        ) : null}

        <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 12, color: T.text2, marginBottom: 4 }}>
          {roomBlockCategoryLabel(cat)}
        </div>
        <div
          style={{
            fontSize: 12,
            color: T.text3,
            fontFamily: '"Geist Mono", monospace',
            marginBottom: 16,
          }}
        >
          {from} → {to}
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

        {confirm ? (
          <div
            style={{
              background: 'rgba(185,28,28,0.06)',
              borderRadius: 10,
              padding: '10px 12px',
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>
              Cette chambre redeviendra vendable sur ces dates. Confirmer la libération ?
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirm(false)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: '#fff',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={release}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: 0,
                  background: T.error || '#b91c1c',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: busy ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {busy ? 'Libération…' : 'Confirmer'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={() => !busy && onClose?.()}
              style={{
                padding: '8px 14px',
                borderRadius: 9,
                border: `1px solid ${T.border}`,
                background: '#fff',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={() => setConfirm(true)}
              style={{
                padding: '8px 14px',
                borderRadius: 9,
                border: 0,
                background: T.primary || '#b8851a',
                color: '#fff',
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Libérer la chambre
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
