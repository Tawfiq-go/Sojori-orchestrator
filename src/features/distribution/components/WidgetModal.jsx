import React from 'react';
import RentalUnitedIframe from '../../rentalUnited/components/RentalUnitedIframe';

const MODES = {
  connect: {
    title: 'Connecter à un channel',
    description: 'Suivez les étapes dans le widget pour connecter votre propriété.',
    widgetHint: 'Dans le widget ci-dessous, allez à la section « Connecter à plus de canaux de vente » pour lier un OTA (Airbnb, Booking, etc.).',
    icon: '🔗',
    fullScreen: true,
  },
  sync: {
    title: 'Paramètres de synchronisation',
    description: 'Choisissez quelles données synchroniser avec les OTAs (dans le widget ci-dessous).',
    widgetHint: 'Dans le widget, utilisez la section dédiée à la synchronisation des données (calendrier, tarifs, contenu) avec vos canaux connectés.',
    icon: '⚙️',
    fullScreen: false,
  },
  promotions: {
    title: 'Promotions & Discounts OTA',
    description: 'Configurez les promotions spécifiques à chaque OTA dans le widget.',
    widgetHint: 'Dans le widget, ouvrez la section « Promotions » ou « Discounts » pour gérer les offres par canal.',
    icon: '🏷️',
    fullScreen: false,
  },
  rates: {
    title: 'Tarifs par channel',
    description: 'Visualisez et ajustez les tarifs envoyés aux OTAs.',
    widgetHint: 'Dans le widget, consultez la section tarifs par canal.',
    icon: '💰',
    fullScreen: false,
  },
  advanced: {
    title: 'Configuration avancée',
    description: 'Paramètres avancés de distribution.',
    widgetHint: null,
    icon: '🔧',
    fullScreen: true,
  },
};

export default function WidgetModal({ mode, property, scriptUrl, open, onClose }) {
  if (!open) return null;

  const config = MODES[mode] || MODES.sync;
  const propertyName = property?.name ?? 'Propriété';

  return (
    <div
      className="widget-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      role="presentation"
    >
      <div
        className={`widget-modal ${config.fullScreen ? 'widget-modal-full' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="widget-modal-header">
          <span className="widget-modal-icon">{config.icon}</span>
          <div>
            <h2 className="widget-modal-title">
              {config.title} — {propertyName}
            </h2>
            <p className="widget-modal-desc">{config.description}</p>
            {config.widgetHint && (
              <p className="widget-modal-hint">{config.widgetHint}</p>
            )}
          </div>
          <button type="button" className="widget-modal-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        <div className="widget-modal-body">
          <RentalUnitedIframe
            scriptUrl={scriptUrl}
            tokenData={null}
            isAdmin={false}
            openSection={mode}
          />
        </div>
        <div className="widget-modal-footer">
          <button type="button" className="widget-modal-btn" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
      <style>{`
        .widget-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center; z-index: 1300; padding: 24px;
        }
        .widget-modal {
          background: #fff; border-radius: 16px; box-shadow: 0 24px 48px rgba(0,0,0,0.2);
          display: flex; flex-direction: column; max-height: 90vh; width: 100%; max-width: 900px;
        }
        .widget-modal-full { max-width: 95vw; max-height: 95vh; }
        .widget-modal-header {
          display: flex; align-items: flex-start; gap: 12px; padding: 16px 20px;
          background: #FFF3E0; border-bottom: 1px solid #E0E0E0; border-radius: 16px 16px 0 0;
          border-left: 4px solid #FF6B35;
        }
        .widget-modal-icon { font-size: 24px; }
        .widget-modal-title { margin: 0; font-size: 18px; font-weight: 600; color: #333; }
        .widget-modal-desc { margin: 4px 0 0 0; font-size: 13px; color: #666; }
        .widget-modal-hint { margin: 8px 0 0 0; font-size: 13px; color: #b45309; background: #fffbeb; padding: 8px 10px; border-radius: 6px; border-left: 3px solid #f59e0b; }
        .widget-modal-close {
          margin-left: auto; width: 32px; height: 32px; border: none; background: #eee;
          border-radius: 8px; font-size: 20px; cursor: pointer; line-height: 1;
        }
        .widget-modal-body { flex: 1; min-height: 500px; overflow: hidden; }
        .widget-modal-body iframe { width: 100%; height: 100%; min-height: 500px; border: none; }
        .widget-modal-footer { padding: 12px 20px; border-top: 1px solid #E0E0E0; }
        .widget-modal-btn {
          padding: 8px 16px; border-radius: 8px; border: none;
          background: #FF6B35; color: white; font-weight: 600; cursor: pointer;
        }
      `}</style>
    </div>
  );
}
