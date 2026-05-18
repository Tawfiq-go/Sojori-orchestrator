import React from 'react';

const statusStyles = {
  online: { badge: 'badge-online', label: 'En ligne' },
  pending: { badge: 'badge-pending', label: 'Attente' },
  error: { badge: 'badge-error', label: 'Erreur' },
  not_connected: { badge: 'badge-none', label: '—' },
  stopped: { badge: 'badge-stopped', label: 'Arrêté' },
};

export default function ChannelStatusCell({ channel, property, onConnect, onClick }) {
  const status = channel?.status ?? 'not_connected';
  const style = statusStyles[status] || statusStyles.not_connected;

  return (
    <div
      className={`channel-cell ${style.badge}`}
      onClick={() => onClick?.(channel, property)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(channel, property)}
    >
      <span className="channel-status-label">{style.label}</span>
      <span className="channel-markup">
        {channel?.markup != null ? `+${channel.markup} %` : '—'}
      </span>
      {channel?.externalUrl && (
        <a
          href={channel.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="channel-link"
          title={channel.externalUrl}
          onClick={(e) => e.stopPropagation()}
        >
          Lien OTA ↗
        </a>
      )}
      {status === 'not_connected' && (
        <button
          type="button"
          className="channel-connect-btn"
          onClick={(e) => {
            e.stopPropagation();
            onConnect?.(channel, property);
          }}
        >
          Connecter
        </button>
      )}
      <style>{`
        .channel-cell {
          min-width: 120px; padding: 10px; border-radius: 8px; cursor: pointer;
          display: flex; flex-direction: column; gap: 4px; font-size: 12px;
        }
        .channel-cell:hover { background: rgba(255,107,53,0.06); }
        .badge-online { background: #DCFCE7; color: #166534; }
        .badge-pending { background: #FEF3C7; color: #854D0E; }
        .badge-error { background: #FEE2E2; color: #991B1B; }
        .badge-none { background: #F5F5F5; color: #9E9E9E; }
        .badge-stopped { background: #E0E0E0; color: #616161; }
        .channel-markup { font-weight: 600; min-height: 1.2em; }
        .channel-link { color: #00b4b4; text-decoration: none; }
        .channel-connect-btn { margin-top: 4px; padding: 4px 8px; border-radius: 6px; border: 1px solid #FF6B35; background: #fff; color: #FF6B35; cursor: pointer; font-size: 11px; }
      `}</style>
    </div>
  );
}
