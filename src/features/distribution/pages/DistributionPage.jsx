import React, { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { distributionApi } from '../services/distributionApi';
import { RentalUnitedApi } from '../../rentalUnited/services/RentalUnitedApi';
import { getOwners } from '../../staff/services/serverApi.task';
import { hasAdminAccess } from 'utils/rbac.utils';
import { useAdminOwnerFilter } from '../../../context/AdminOwnerFilterContext';
import { usePmSimulation } from '../../../context/PmSimulationContext';
import DistributionHeader from '../components/DistributionHeader';
import PropertyChannelTable from '../components/PropertyChannelTable';
import ChannelDetailDrawer from '../components/ChannelDetailDrawer';
import WidgetModal from '../components/WidgetModal';

export default function DistributionPage() {
  const { user } = useSelector((state) => state.auth);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [owners, setOwners] = useState([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [scriptUrl, setScriptUrl] = useState(null);
  const [widgetModal, setWidgetModal] = useState({ open: false, mode: 'sync', property: null });
  const [detailDrawer, setDetailDrawer] = useState({ open: false, property: null, channel: null });
  const [loadingMcq, setLoadingMcq] = useState(false);
  /** null = OK ou pas encore chargé ; sinon message utilisateur (API indispo, etc.) */
  const [overviewError, setOverviewError] = useState(null);

  const { requestOwnerId } = useAdminOwnerFilter();
  const { isActive: simulationActive } = usePmSimulation();

  const isAdmin = hasAdminAccess(user?.role) && !simulationActive;
  const ownerId =
    requestOwnerId ||
    (isAdmin && selectedOwnerId ? selectedOwnerId : user?.ownerId || user?._id);

  useEffect(() => {
    if (!isAdmin) return;
    getOwners({ page: 0, limit: 100, deleted: false, banned: false, search_text: '' })
      .then((res) => {
        const ru = (res?.data || []).filter((o) => o.channelManager === 'RU');
        setOwners(ru);
        if (ru.length && !selectedOwnerId) setSelectedOwnerId(ru[0]._id);
      })
      .catch(() => setOwners([]));
  }, [isAdmin]);

  const fetchOverview = useCallback(() => {
    if (!ownerId) return;
    setLoading(true);
    distributionApi
      .getOverview(ownerId)
      .then((data) => {
        setOverviewError(null);
        setOverview(data);
        if (ownerId && (data?.properties?.length ?? 0) > 0) {
          setLoadingStatus(true);
          distributionApi
            .getStatus(ownerId)
            .then((statusData) => {
              if (!statusData?.availableChannels?.length) return;
              const priority = ['airbnb', 'booking', 'vrbo'];
              const sorted = [...statusData.availableChannels].sort((a, b) => {
                const na = (a.name || '').toLowerCase();
                const nb = (b.name || '').toLowerCase();
                const ia = priority.findIndex((p) => na.includes(p));
                const ib = priority.findIndex((p) => nb.includes(p));
                if (ia !== -1 && ib !== -1) return ia - ib;
                if (ia !== -1) return -1;
                if (ib !== -1) return 1;
                return na.localeCompare(nb);
              });
              const statusByChannel = statusData.statusByChannel || {};
              const enriched = {
                ...data,
                availableChannels: sorted,
                properties: (data.properties || []).map((prop) => {
                  const ruId = String(prop.ruPropertyId ?? '');
                  const channels = sorted.map((ch) => {
                    const s = statusByChannel[ch.id]?.[ruId] || {};
                    return {
                      channelId: ch.id,
                      channelName: ch.name,
                      status: s.status || 'not_connected',
                      statusMessage: null,
                      externalUrl: s.externalUrl ?? null,
                      externalId: null,
                      markup: s.markup ?? null,
                      customName: null,
                      lastSync: null,
                    };
                  });
                  return { ...prop, channels };
                }),
              };
              let totalConnections = 0;
              let online = 0;
              let pending = 0;
              let errors = 0;
              for (const p of enriched.properties) {
                for (const ch of p.channels) {
                  if (ch.status !== 'not_connected') {
                    totalConnections += 1;
                    if (ch.status === 'online') online += 1;
                    else if (ch.status === 'pending') pending += 1;
                    else if (ch.status === 'error') errors += 1;
                  }
                }
              }
              const totalSlots = enriched.properties.length * enriched.availableChannels.length;
              enriched.summary = {
                ...(data.summary || {}),
                totalConnections,
                online,
                pending,
                errors,
                notConnected: totalSlots - totalConnections,
              };
              setOverview(enriched);
            })
            .catch(() => {})
            .finally(() => setLoadingStatus(false));
        }
      })
      .catch((err) => {
        const status = err?.response?.status;
        const msg = err?.response?.data?.message || err?.message;
        if (status === 404) {
          setOverviewError({ short: true });
        } else if (status === 400 && msg?.toLowerCase().includes('rental united')) {
          setOverviewError({
            title: 'Compte non connecté à Rental United',
            detail:
              'Ce propriétaire n’est pas lié à Rental United ou les identifiants RU sont absents. Connectez le compte dans les paramètres (Channel Manager) ou sélectionnez un autre propriétaire.',
          });
        } else if (status === 401) {
          setOverviewError({
            title: 'Session expirée',
            detail: 'Reconnectez-vous pour afficher la grille Distribution.',
          });
        } else if (err?.code === 'ECONNABORTED' || msg?.toLowerCase().includes('timeout')) {
          setOverviewError({
            title: 'Délai dépassé',
            detail:
              'L’API Distribution n’a pas répondu à temps (backend occupé ou réseau lent). Réessayez dans un instant ou utilisez le widget RU ci-dessous.',
          });
        } else {
          setOverviewError({
            title: 'Grille indisponible',
            detail: msg || 'Réessayez ou utilisez le widget RU ci-dessous.',
          });
        }
        setOverview({ properties: [], availableChannels: [], summary: {} });
      })
      .finally(() => setLoading(false));
  }, [ownerId]);

  useEffect(() => {
    if (ownerId) fetchOverview();
  }, [ownerId, fetchOverview]);

  useEffect(() => {
    if (!ownerId) return;
    RentalUnitedApi.getUserToken(ownerId, 4)
      .then((res) => {
        if (res?.success && res?.scriptUrl) setScriptUrl(res.scriptUrl);
      })
      .catch(() => setScriptUrl(null));
  }, [ownerId]);

  const openSync = useCallback((property) => {
    setWidgetModal({ open: true, mode: 'sync', property });
  }, []);
  const openPromos = useCallback((property) => {
    setWidgetModal({ open: true, mode: 'promotions', property });
  }, []);
  const openConnect = useCallback((property, channel) => {
    setWidgetModal({ open: true, mode: 'connect', property });
  }, []);
  const closeModal = useCallback(() => {
    setWidgetModal((p) => ({ ...p, open: false }));
  }, []);

  const openDrawer = useCallback((property, channel) => {
    setDetailDrawer({ open: true, property, channel });
  }, []);
  const closeDrawer = useCallback(() => {
    setDetailDrawer((p) => ({ ...p, open: false }));
  }, []);

  const openWidgetForMarkup = useCallback((property, _channel) => {
    setWidgetModal({ open: true, mode: 'sync', property });
  }, []);

  const handleOrderMcqCheck = useCallback(
    (property) => {
      const propertyId = property?.ruPropertyId ?? property?.id;
      if (!propertyId) return;
      setLoadingMcq(true);
      distributionApi
        .orderMcqCheck(propertyId)
        .then(() => {
          closeDrawer();
          fetchOverview();
        })
        .catch((err) => {
          const msg =
            err?.response?.data?.message ||
            err?.message ||
            'Action non disponible. Utilisez le widget RU pour lancer un contrôle MCQ.';
          window.alert(msg);
        })
        .finally(() => setLoadingMcq(false));
    },
    [closeDrawer, fetchOverview],
  );

  return (
    <>
      <div className="distribution-page">
        {isAdmin && owners.length > 1 && (
          <div className="distribution-owner-bar">
            <label>Owner :</label>
            <select
              value={selectedOwnerId}
              onChange={(e) => setSelectedOwnerId(e.target.value)}
            >
              {owners.map((o) => (
                <option key={o._id} value={o._id}>
                  {o.firstName} {o.lastName}
                </option>
              ))}
            </select>
          </div>
        )}
        <DistributionHeader
          summary={overview?.summary}
          onRefresh={fetchOverview}
          loading={loading}
          apiUnavailable={!!overviewError}
        />
        {overviewError && !overviewError.short && (
          <div className="distribution-api-banner" role="alert">
            <strong>{overviewError.title}</strong>
            <p>{overviewError.detail}</p>
          </div>
        )}
        {!ownerId && !loading && !overviewError && (
          <div className="distribution-api-banner distribution-api-banner-info" role="status">
            <strong>Aucun propriétaire sélectionné</strong>
            <p>
              {isAdmin
                ? 'Sélectionnez un propriétaire dans la liste ci-dessus pour afficher sa grille Distribution.'
                : 'Connectez-vous avec un compte propriétaire lié à Rental United pour afficher la grille.'}
            </p>
          </div>
        )}
        {overview && !overviewError && (overview.properties?.length ?? 0) === 0 && (
          <div className="distribution-api-banner distribution-api-banner-info" role="status">
            <strong>Données chargées — aucune propriété distribuée</strong>
            <p>
              {overview.hint === 'listings_exist_no_ru_sync'
                ? 'Ce compte a des logements mais aucun n’est encore lié à Rental United. Liez-les depuis la fiche d’édition de chaque logement (bouton violet « Sync with Rental United »), puis rafraîchissez.'
                : overview.hint === 'no_listings'
                  ? 'Ce compte n’a aucun logement. Créez un listing puis faites le sync avec Rental United pour le voir ici.'
                  : 'Aucune propriété synchronisée avec Rental United pour ce compte. Liez vos logements depuis leur fiche d’édition (bouton « Sync with Rental United »), puis rafraîchissez.'}
            </p>
          </div>
        )}
        <div className="distribution-body">
          <PropertyChannelTable
            properties={overview?.properties}
            availableChannels={overview?.availableChannels}
            loadingStatus={loadingStatus}
            apiUnavailable={!!overviewError}
            emptyHint={overview?.hint}
            scriptUrl={scriptUrl}
            onOpenSync={openSync}
            onOpenPromos={openPromos}
            onOpenConnect={openConnect}
            onOpenDrawer={openDrawer}
          />
        </div>
      </div>
      <ChannelDetailDrawer
        open={detailDrawer.open}
        onClose={closeDrawer}
        property={detailDrawer.property}
        channel={detailDrawer.channel}
        onOpenSync={openSync}
        onOpenPromos={openPromos}
        onOpenConnect={openConnect}
        onOpenWidgetForMarkup={openWidgetForMarkup}
        onOrderMcqCheck={handleOrderMcqCheck}
        loadingMcq={loadingMcq}
      />
      <WidgetModal
        open={widgetModal.open}
        mode={widgetModal.mode}
        property={widgetModal.property}
        scriptUrl={scriptUrl}
        onClose={closeModal}
      />
      <style>{`
        .distribution-page { background: #FAFAFA; min-height: 100vh; font-family: 'Inter', sans-serif; }
        .distribution-owner-bar { padding: 10px 24px; background: #fff; border-bottom: 1px solid #E0E0E0; display: flex; align-items: center; gap: 8px; }
        .distribution-owner-bar select { padding: 6px 10px; border-radius: 6px; border: 1px solid #ddd; }
        .distribution-body { padding: 24px; }
        .distribution-api-banner {
          margin: 0 24px;
          padding: 14px 18px;
          background: #fff7ed;
          border: 1px solid #fdba74;
          border-radius: 10px;
          color: #9a3412;
        }
        .distribution-api-banner strong { display: block; margin-bottom: 6px; }
        .distribution-api-banner p { margin: 0; font-size: 14px; line-height: 1.45; }
        .distribution-api-banner-info { background: #eff6ff; border-color: #93c5fd; color: #1e40af; }
      `}</style>
    </>
  );
}
