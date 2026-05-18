import React from 'react';

const statusLabels = {
  online: 'En ligne',
  pending: 'En attente',
  error: 'Erreur',
  not_connected: 'Non connecté',
  stopped: 'Arrêté',
};

export default function ChannelDetailDrawer({
  open,
  onClose,
  property,
  channel,
  onOpenSync,
  onOpenPromos,
  onOpenConnect,
  onOpenWidgetForMarkup,
  onOrderMcqCheck,
  loadingMcq,
}) {
  if (!open) return null;

  const status = channel?.status ?? 'not_connected';
  const statusLabel = statusLabels[status] ?? status;

  return (
    <>
      <div
        className="channel-drawer-backdrop"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Fermer"
      />
      <div className="channel-drawer" role="dialog" aria-label="Détail canal">
        <div className="channel-drawer-header">
          <h2 className="channel-drawer-title">Canal — {channel?.channelName ?? '—'}</h2>
          <button
            type="button"
            className="channel-drawer-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
        <div className="channel-drawer-body">
          <div className="channel-drawer-section">
            <div className="channel-drawer-label">Propriété</div>
            <div className="channel-drawer-value channel-drawer-property-name">
              {property?.name ?? '—'}
            </div>
            {property?.city && (
              <div className="channel-drawer-value channel-drawer-property-city">{property.city}</div>
            )}
          </div>
          <div className="channel-drawer-section">
            <div className="channel-drawer-label">Canal</div>
            <div className="channel-drawer-value">{channel?.channelName ?? '—'}</div>
          </div>
          <div className="channel-drawer-section">
            <div className="channel-drawer-label">Statut</div>
            <div className={`channel-drawer-status channel-drawer-status-${status}`}>
              {statusLabel}
            </div>
          </div>
          <div className="channel-drawer-section">
            <div className="channel-drawer-label">Markup</div>
            <div className="channel-drawer-value">
              {channel?.markup != null ? `+${channel.markup} %` : '—'}
            </div>
          </div>
          {channel?.externalUrl && (
            <div className="channel-drawer-section">
              <div className="channel-drawer-label">Lien OTA</div>
              <a
                href={channel.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="channel-drawer-link"
              >
                Ouvrir sur l’OTA ↗
              </a>
            </div>
          )}
          {channel?.statusMessage && (
            <div className="channel-drawer-section">
              <div className="channel-drawer-label">Message</div>
              <div className="channel-drawer-value channel-drawer-message">
                {channel.statusMessage}
              </div>
            </div>
          )}
        </div>
        <div className="channel-drawer-actions">
          {channel?.externalUrl && (
            <a
              href={channel.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="channel-drawer-btn channel-drawer-btn-secondary"
            >
              Ouvrir sur l’OTA
            </a>
          )}
          {status === 'not_connected' && (
            <button
              type="button"
              className="channel-drawer-btn channel-drawer-btn-primary"
              onClick={() => {
                onOpenConnect?.(property, channel);
                onClose();
              }}
            >
              Connecter ce canal
            </button>
          )}
          <button
            type="button"
            className="channel-drawer-btn channel-drawer-btn-secondary"
            onClick={() => {
              onOpenSync?.(property);
              onClose();
            }}
          >
            Configurer la sync
          </button>
          <button
            type="button"
            className="channel-drawer-btn channel-drawer-btn-secondary"
            onClick={() => {
              onOpenPromos?.(property);
              onClose();
            }}
          >
            Promotions OTA
          </button>
          {onOpenWidgetForMarkup && status !== 'not_connected' && (
            <button
              type="button"
              className="channel-drawer-btn channel-drawer-btn-secondary"
              onClick={() => {
                onOpenWidgetForMarkup(property, channel);
                onClose();
              }}
            >
              Modifier markup (widget RU)
            </button>
          )}
          {onOrderMcqCheck && status !== 'not_connected' && (
            <button
              type="button"
              className="channel-drawer-btn channel-drawer-btn-secondary"
              onClick={() => onOrderMcqCheck(property)}
              disabled={loadingMcq}
            >
              {loadingMcq ? 'En cours…' : 'Lancer contrôle MCQ'}
            </button>
          )}
        </div>
      </div>
      <style>{`
        .channel-drawer-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1000;
        }
        .channel-drawer {
          position: fixed; top: 0; right: 0; width: 380px; max-width: 100%; height: 100%;
          background: #fff; box-shadow: -4px 0 24px rgba(0,0,0,0.12); z-index: 1001;
          display: flex; flex-direction: column; overflow: hidden;
        }
        .channel-drawer-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 20px 16px; border-bottom: 1px solid #E5E7EB;
        }
        .channel-drawer-title { margin: 0; font-size: 18px; font-weight: 600; color: #111827; }
        .channel-drawer-close {
          width: 36px; height: 36px; border: none; background: #F3F4F6; border-radius: 8px;
          font-size: 22px; line-height: 1; color: #6B7280; cursor: pointer; padding: 0;
        }
        .channel-drawer-close:hover { background: #E5E7EB; color: #374151; }
        .channel-drawer-body { flex: 1; overflow-y: auto; padding: 20px; }
        .channel-drawer-section { margin-bottom: 18px; }
        .channel-drawer-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #6B7280; margin-bottom: 4px; }
        .channel-drawer-value { font-size: 14px; color: #111827; }
        .channel-drawer-property-name { font-weight: 600; }
        .channel-drawer-property-city { font-size: 13px; color: #6B7280; margin-top: 2px; }
        .channel-drawer-status {
          display: inline-block; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 500;
        }
        .channel-drawer-status-online { background: #DCFCE7; color: #166534; }
        .channel-drawer-status-pending { background: #FEF3C7; color: #854D0E; }
        .channel-drawer-status-error { background: #FEE2E2; color: #991B1B; }
        .channel-drawer-status-not_connected { background: #F5F5F5; color: #6B7280; }
        .channel-drawer-status-stopped { background: #E5E7EB; color: #4B5563; }
        .channel-drawer-link { font-size: 14px; color: #FF6B35; text-decoration: none; }
        .channel-drawer-link:hover { text-decoration: underline; }
        .channel-drawer-message { font-size: 13px; color: #6B7280; }
        .channel-drawer-actions {
          padding: 16px 20px; border-top: 1px solid #E5E7EB; display: flex; flex-direction: column; gap: 10px;
        }
        .channel-drawer-btn {
          padding: 10px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; text-align: center;
          border: 1px solid #FF6B35; background: #fff; color: #FF6B35; text-decoration: none;
        }
        .channel-drawer-btn:hover:not(:disabled) { background: #FFF5F0; }
        .channel-drawer-btn.primary, .channel-drawer-btn-primary { background: #FF6B35; color: #fff; }
        .channel-drawer-btn.primary:hover:not(:disabled), .channel-drawer-btn-primary:hover:not(:disabled) { filter: brightness(0.95); }
        .channel-drawer-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </>
  );
}
