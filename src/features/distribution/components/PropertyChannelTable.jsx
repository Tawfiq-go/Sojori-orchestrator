import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ChannelStatusCell from './ChannelStatusCell';

const PLACEHOLDER_PROPERTY = { id: '_widget', name: 'Channel manager RU', city: '' };
const VISIBLE_CHANNELS = 3;

export default function PropertyChannelTable({
  properties,
  availableChannels,
  scriptUrl,
  onOpenSync,
  onOpenPromos,
  onOpenConnect,
  onOpenDrawer,
  apiUnavailable = false,
  /** hint from API when empty: 'listings_exist_no_ru_sync' = owner has listings but none synced to RU */
  emptyHint,
  loadingStatus = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const channels = availableChannels ?? [];
  const visibleChannels = expanded ? channels : channels.slice(0, VISIBLE_CHANNELS);
  const hasMore = channels.length > VISIBLE_CHANNELS;

  const getPropertyStats = (prop) => {
    const list = prop.channels ?? [];
    const connected = list.filter((c) => c.status && c.status !== 'not_connected').length;
    const online = list.filter((c) => c.status === 'online');
    const pending = list.filter((c) => c.status === 'pending').length;
    const errors = list.filter((c) => c.status === 'error').length;
    return {
      connected,
      total: list.length,
      onlineNames: online.map((c) => c.channelName || c.channelId).join(', ') || '—',
      pending,
      errors,
    };
  };

  if (apiUnavailable) {
    return (
      <div className="distribution-fallback-card">
        <h2 className="distribution-fallback-title">Continuer sans la grille</h2>
        <p className="distribution-fallback-text">
          La synthèse propriétés × canaux nécessite l’API srv-listing déployée. En attendant, le widget
          Rentals United couvre sync, promos et connexion aux OTAs.
        </p>
        {scriptUrl ? (
          <div className="distribution-fallback-actions">
            <button type="button" className="distribution-fallback-btn primary" onClick={() => onOpenSync?.(PLACEHOLDER_PROPERTY)}>
              Sync & canaux
            </button>
            <button type="button" className="distribution-fallback-btn" onClick={() => onOpenPromos?.(PLACEHOLDER_PROPERTY)}>
              Promotions OTA
            </button>
            <button type="button" className="distribution-fallback-btn" onClick={() => onOpenConnect?.(PLACEHOLDER_PROPERTY, {})}>
              Connecter un channel
            </button>
          </div>
        ) : (
          <p className="distribution-fallback-warn">
            Script Rentals United indisponible pour cet owner — vérifiez la liaison Channel Manager RU.
          </p>
        )}
        <style>{`
          .distribution-fallback-card {
            background: #fff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 28px 32px; max-width: 560px;
          }
          .distribution-fallback-title { margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #111827; }
          .distribution-fallback-text { margin: 0 0 20px 0; font-size: 14px; color: #4b5563; line-height: 1.5; }
          .distribution-fallback-actions { display: flex; flex-wrap: wrap; gap: 10px; }
          .distribution-fallback-btn {
            padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;
            border: 1px solid #ff6b35; background: #fff; color: #ff6b35;
          }
          .distribution-fallback-btn:hover { background: #fff5f0; }
          .distribution-fallback-btn.primary { background: #ff6b35; color: #fff; border-color: #ff6b35; }
          .distribution-fallback-btn.primary:hover { filter: brightness(0.95); }
          .distribution-fallback-warn { margin: 0; font-size: 14px; color: #b45309; background: #fffbeb; padding: 12px 14px; border-radius: 8px; border: 1px solid #fde68a; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="property-table-wrap">
      <table className="property-table">
        <thead>
          <tr>
            <th className="col-property">Propriété</th>
            <th className="col-id-ru">ID RU</th>
            <th className="col-city">Ville</th>
            {visibleChannels.map((ch) => (
              <th key={ch.id} className="col-channel">
                {ch.name}
              </th>
            ))}
            {hasMore && !expanded && (
              <th className="col-see-more">
                <button
                  type="button"
                  className="see-more-btn"
                  onClick={() => setExpanded(true)}
                >
                  Voir plus
                </button>
              </th>
            )}
            <th className="col-connections">Connexions</th>
            <th className="col-online">Canaux en ligne</th>
            <th className="col-alerts">Alertes</th>
            <th className="col-sync">Sync</th>
            <th className="col-promos">Promos</th>
            <th className="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {properties?.map((prop) => {
            const stats = getPropertyStats(prop);
            return (
            <tr key={prop.id}>
              <td className="col-property">
                <div className="prop-name">{prop.name}</div>
              </td>
              <td className="col-id-ru">
                <span className="cell-mono" title={prop.ruPropertyId}>{prop.ruPropertyId || '—'}</span>
              </td>
              <td className="col-city">
                <span>{prop.city || '—'}</span>
              </td>
              {visibleChannels.map((ch) => {
                const cellCh = prop.channels?.find((c) => c.channelId === ch.id);
                return (
                  <td key={ch.id} className="col-channel">
                    <ChannelStatusCell
                      channel={cellCh ?? { channelId: ch.id, channelName: ch.name, status: 'not_connected' }}
                      property={prop}
                      onConnect={() => onOpenConnect?.(prop, cellCh ?? { channelId: ch.id, channelName: ch.name })}
                      onClick={() => onOpenDrawer?.(prop, cellCh ?? { channelId: ch.id, channelName: ch.name })}
                    />
                  </td>
                );
              })}
              {hasMore && !expanded && (
                <td className="col-see-more">
                  {loadingStatus ? (
                    <span className="loading-dots">…</span>
                  ) : (
                    <button
                      type="button"
                      className="see-more-btn"
                      onClick={() => setExpanded(true)}
                    >
                      Voir plus
                    </button>
                  )}
                </td>
              )}
              <td className="col-connections">
                <span className="cell-mono">{stats.connected} / {stats.total}</span>
              </td>
              <td className="col-online">
                <span className="cell-online" title={stats.onlineNames}>{stats.onlineNames}</span>
              </td>
              <td className="col-alerts">
                {(stats.pending > 0 || stats.errors > 0) ? (
                  <span className="alerts-wrap">
                    {stats.pending > 0 && <span className="badge badge-pending">{stats.pending} attente</span>}
                    {stats.errors > 0 && <span className="badge badge-error">{stats.errors} erreur</span>}
                  </span>
                ) : (
                  <span className="cell-ok">—</span>
                )}
              </td>
              <td className="col-sync">
                <span className="sync-label">Partiel</span>
                <button
                  type="button"
                  className="table-action-btn"
                  onClick={() => onOpenSync?.(prop)}
                >
                  Config
                </button>
              </td>
              <td className="col-promos">
                <span className="promos-label">0</span>
                <button
                  type="button"
                  className="table-action-btn"
                  onClick={() => onOpenPromos?.(prop)}
                >
                  Gérer
                </button>
              </td>
              <td className="col-actions">
                <span className="actions-dots">•••</span>
              </td>
            </tr>
          );
          })}
        </tbody>
      </table>
      {(!properties || properties.length === 0) && (
        <div className="property-table-empty">
          <strong>
            {emptyHint === 'listings_exist_no_ru_sync'
              ? 'Vous avez des logements mais aucun n’est lié à RU'
              : emptyHint === 'no_listings'
                ? 'Aucun logement pour ce compte'
                : 'Aucune propriété à afficher.'}
          </strong>
          <p className="property-table-empty-hint">
            {emptyHint === 'listings_exist_no_ru_sync'
              ? 'Ouvre chaque logement en édition et clique sur le bouton violet « Sync with Rental United ». Une fois le sync réussi, rafraîchis cette page.'
              : emptyHint === 'no_listings'
                ? 'Créez un listing (Voir les listings → Créer un listing), puis faites « Sync with Rental United » depuis sa fiche d’édition.'
                : 'Le sync calendrier (depuis la liste) ne suffit pas. Il faut faire « Sync with Rental United » depuis la fiche d’édition du logement (bouton violet), puis rafraîchir.'}
          </p>
          <div className="property-table-empty-actions">
            <Link to="/admin/Listing/Active" className="property-table-empty-link primary">
              Voir les listings
            </Link>
            <Link to="/admin/Listing/new" className="property-table-empty-link">
              Créer un listing
            </Link>
          </div>
        </div>
      )}
      <style>{`
        .property-table-wrap { overflow-x: auto; background: #fff; border-radius: 12px; border: 1px solid #E0E0E0; }
        .property-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .property-table th { text-align: left; padding: 14px 12px; background: #fff; border-bottom: 2px solid #E6B022; font-weight: 600; color: #333; white-space: nowrap; }
        .property-table td { padding: 10px 12px; border-bottom: 1px solid #eee; vertical-align: middle; }
        .property-table tbody tr:nth-child(even) { background: #FAFAFA; }
        .property-table tbody tr:hover { background: rgba(255,107,53,0.05); }
        .col-property { min-width: 160px; max-width: 220px; position: sticky; left: 0; background: inherit; z-index: 1; }
        .col-id-ru { min-width: 72px; }
        .col-city { min-width: 100px; }
        .col-channel { min-width: 110px; }
        .col-see-more { min-width: 90px; }
        .col-connections { min-width: 72px; text-align: center; }
        .col-online { min-width: 120px; max-width: 180px; font-size: 12px; color: #374151; }
        .col-alerts { min-width: 100px; }
        .see-more-btn { padding: 6px 12px; font-size: 12px; color: #ff6b35; background: #fff; border: 1px solid #ff6b35; border-radius: 6px; cursor: pointer; }
        .see-more-btn:hover { background: #fff5f0; }
        .loading-dots { color: #999; }
        .cell-mono { font-family: ui-monospace, monospace; font-size: 12px; color: #6b7280; }
        .cell-online { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cell-ok { color: #9ca3af; }
        .alerts-wrap { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
        .badge { font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: 500; }
        .badge-pending { background: #fef3c7; color: #b45309; }
        .badge-error { background: #fee2e2; color: #b91c1c; }
        .col-sync, .col-promos { min-width: 95px; }
        .col-actions { min-width: 52px; }
        .prop-name { font-weight: 600; color: #333; }
        .sync-label, .promos-label { margin-right: 6px; }
        .table-action-btn { padding: 4px 10px; border-radius: 6px; border: 1px solid #E6B022; background: #fff; color: #E6B022; cursor: pointer; font-size: 12px; }
        .table-action-btn:hover { background: #E6B022; color: #fff; }
        .actions-dots { color: #999; cursor: pointer; }
        .property-table-empty { padding: 48px 24px; text-align: center; color: #555; max-width: 520px; margin: 0 auto; }
        .property-table-empty strong { display: block; margin-bottom: 10px; color: #333; }
        .property-table-empty-hint { margin: 0 0 16px 0; font-size: 14px; line-height: 1.5; text-align: center; color: #666; }
        .property-table-empty-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
        .property-table-empty-link {
          padding: 10px 18px; border-radius: 8px; font-size: 14px; font-weight: 500; text-decoration: none;
          border: 1px solid #ff6b35; background: #fff; color: #ff6b35;
        }
        .property-table-empty-link:hover { background: #fff5f0; }
        .property-table-empty-link.primary { background: #ff6b35; color: #fff; border-color: #ff6b35; }
        .property-table-empty-link.primary:hover { filter: brightness(0.95); }
      `}</style>
    </div>
  );
}
