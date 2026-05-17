// ════════════════════════════════════════════════════════════════════
// Sojori · Orchestration — Atelier 2026
// ReservationCard.jsx redessinée. Logique fonctionnelle (force execute,
// formatDate, eventCounts, navigation API) STRICTEMENT identique.
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import { PlayArrow as PlayIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { API_BASE_URL } from '../../config/backendServer.config';

/** Status → presentation visuelle alignée tokens Atelier 2026. */
const STATUS_PRESENTATION = {
  active:     { label: 'ACTIVE',     chipClass: 'so-chip-success', dotClass: 'so-dot-success' },
  processing: { label: 'PROCESSING', chipClass: 'so-chip-warning', dotClass: 'so-dot-warning' },
  completed:  { label: 'COMPLETED',  chipClass: 'so-chip-info',    dotClass: 'so-dot-info' },
  error:      { label: 'ERROR',      chipClass: 'so-chip-error',   dotClass: 'so-dot-error' },
  failed:     { label: 'FAILED',     chipClass: 'so-chip-error',   dotClass: 'so-dot-error' },
  paused:     { label: 'PAUSED',     chipClass: 'so-chip-neutral', dotClass: 'so-dot-neutral' },
};

const ReservationCard = ({ reservation, selected, onClick }) => {
  const preset = STATUS_PRESENTATION[reservation.orchestrationStatus] || STATUS_PRESENTATION.active;
  const [isExecuting, setIsExecuting] = useState(false);

  const completedEvents = reservation.eventCounts?.executed || 0;
  const totalEvents     = reservation.eventCounts?.total || 0;
  const progress        = totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0;
  const pendingEvents   = reservation.eventCounts?.pending || 0;
  const isDone          = progress >= 100;

  const formatDate = (d) => {
    if (!d) return null;
    try { return format(new Date(d), 'dd MMM', { locale: fr }); } catch { return null; }
  };

  const handleForceExecuteAll = async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Forcer l'exécution de ${pendingEvents} événement(s) pending pour ${reservation.reservationNumber}?`)) return;
    try {
      setIsExecuting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/v1/orchestrator/reservations/${reservation.reservationNumber}/execute-all`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
      const data = await response.json();
      if (response.ok && data.success) {
        alert(`✅ Exécution réussie!\n\n${data.message}\n\nRechargez la page pour voir les changements.`);
        window.location.reload();
      } else {
        alert(`❌ Erreur: ${data.error || "Échec de l'exécution"}`);
      }
    } catch (err) {
      alert(`❌ Erreur: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div
      onClick={onClick}
      className={`so-rcard ${selected ? 'so-selected' : ''}`}
      style={{
        flex: '0 0 264px',
        background: selected
          ? 'linear-gradient(180deg, var(--accent-bg), var(--bg-paper) 70%)'
          : 'var(--bg-paper)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '13px 14px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {selected && (
        <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--accent)' }} />
      )}

      {/* Header : numéro + status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: '"Geist Mono", monospace', fontSize: 11.5, fontWeight: 700, color: 'var(--accent-deep)', letterSpacing: '-0.01em' }}>
          {reservation.reservationNumber}
        </span>
        <span className={`so-chip ${preset.chipClass}`}>
          <span className={`so-dot ${preset.dotClass}`} />
          {preset.label}
        </span>
      </div>

      {/* Listing + guest + dates */}
      {reservation.listingName && (
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-h)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          🏠 {reservation.listingName}
        </div>
      )}
      {reservation.guestName && (
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 4 }}>
          👤 {reservation.guestName}
        </div>
      )}
      {reservation.arrivalDate && reservation.departureDate && (
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: '"Geist Mono", monospace', marginBottom: 10 }}>
          📅 {formatDate(reservation.arrivalDate)} → {formatDate(reservation.departureDate)}
          {reservation.nights ? ` · ${reservation.nights}n` : ''}
        </div>
      )}

      {/* Stats + force execute */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10.5, color: 'var(--text-muted)', fontFamily: '"Geist Mono", monospace', marginBottom: 6 }}>
        <span>
          <span style={{ color: 'var(--accent-deep)', fontWeight: 700 }}>{completedEvents}</span>
          /<span>{totalEvents}</span>
          {' '}events
        </span>
        {pendingEvents > 0 && (
          <Tooltip title={`Forcer l'exécution de ${pendingEvents} événement(s)`}>
            <IconButton
              size="small" onClick={handleForceExecuteAll} disabled={isExecuting}
              sx={{
                background: 'linear-gradient(180deg, #cb9b2c 0%, #b8851a 100%)',
                color: '#1a1408', width: 22, height: 22, minWidth: 22,
                boxShadow: '0 1px 2px rgba(135,97,25,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
                '&:hover':    { filter: 'brightness(1.06)' },
                '&:disabled': { background: '#e7e4dc', color: '#a8a299' },
              }}
            >
              {isExecuting ? <CircularProgress size={11} sx={{ color: '#1a1408' }} /> : <PlayIcon sx={{ fontSize: 12 }} />}
            </IconButton>
          </Tooltip>
        )}
      </div>

      {/* Progress bar shimmer (sauf si done) */}
      <div className="so-progress">
        <div
          className={`so-progress-bar ${isDone ? 'so-progress-done' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default ReservationCard;
