// ════════════════════════════════════════════════════════════════════
// ListingFormV2.jsx — Exemple d'intégration finale
// Combine ListingFormShell + onglets Detail + Orchestration V3
// Branchez vos vrais hooks de données à la place de useState({}).
// ════════════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import ListingFormShell from './ListingFormShell';
import { ListingFormStructureContext } from './ListingFormStructureContext';
import listingsService from '../../../services/listingsService';
import { useSnackbar } from 'notistack';

import { GeneralTab, LocationTab }                          from './tabs/GeneralLocationTabs';
import { PhotosTabReal }                                    from './tabs/PhotosTabReal';
import AmenitiesTab                                         from './tabs/DetailTabsAmenities';
import { PricingTab, AvailabilityTab, FeesTab }             from './tabs/DetailTabsCommercial';
import { ChannelsTab, DirectBookingTab, RoomsTab, LicenseTab } from './tabs/DetailTabsDistribution';
import ListingOrchestrationV3Embed from '../../../features/orchestrationListingV3/ListingOrchestrationV3Embed';

export default function ListingFormV2({
  listingId,
  initialValues = {},
  defaultLevel = 'detail',
  defaultTab,
  lockLevel,
  embedded = false,
  onSave,
  onImagesPersisted,
  onVerifyRuChannels,
  verifyRuLoading = false,
  listingStructure = null,
  roomTypeConfigs = [],
}) {
  const [values, setValues] = useState(initialValues);
  const [publishLoading, setPublishLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setValues(initialValues);
    }
  }, [initialValues]);

  /** GeneralTab passe un objet ; AmenitiesTab passe (field, value). */
  const handleFormChange = (arg1, arg2) => {
    if (typeof arg1 === 'string') {
      setValues((prev) => ({ ...prev, [arg1]: arg2 }));
      return;
    }
    if (arg1 && typeof arg1 === 'object') {
      setValues((prev) => ({ ...prev, ...arg1 }));
    }
  };

  /**
   * Publier = Synchroniser vers Rentals United (sans sauvegarder d'abord)
   * Appelle POST /api/v1/listing/listings/:listingId/sync-with-rental-united
   */
  const handlePublish = async () => {
    console.log('[ListingFormV2] handlePublish called, listingId:', listingId);

    if (!listingId) {
      console.error('[ListingFormV2] No listingId provided');
      enqueueSnackbar('Impossible de publier: listing ID manquant', { variant: 'error' });
      return;
    }

    setPublishLoading(true);
    try {
      console.log('[ListingFormV2] Starting RU sync for listingId:', listingId);
      enqueueSnackbar('Synchronisation vers Rentals United en cours...', { variant: 'info' });

      // Synchroniser avec Rentals United
      const syncResult = await listingsService.syncListingToRentalUnited(listingId);

      console.log('[ListingFormV2] Sync result:', syncResult);

      if (syncResult.success) {
        const apiCallCount = syncResult.data?.apiCallCount || 0;
        const propertyIds = syncResult.data?.propertyIds || [];
        console.log('[ListingFormV2] Sync SUCCESS - apiCallCount:', apiCallCount, 'propertyIds:', propertyIds);
        enqueueSnackbar(
          `✓ Listing synchronisé avec RU (${apiCallCount} appels API, ${propertyIds.length} propriétés)`,
          { variant: 'success', autoHideDuration: 5000 }
        );
      } else {
        console.error('[ListingFormV2] Sync FAILED - error:', syncResult.error);
        enqueueSnackbar(
          `Échec de la synchronisation RU: ${syncResult.error || 'Erreur inconnue'}`,
          { variant: 'error', autoHideDuration: 8000 }
        );
      }
    } catch (error) {
      console.error('[ListingFormV2] handlePublish exception:', error);
      enqueueSnackbar(
        `Erreur lors de la publication: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        { variant: 'error' }
      );
    } finally {
      setPublishLoading(false);
      console.log('[ListingFormV2] handlePublish finished');
    }
  };

  const renderTab = (tabKey, level) => {
    const common = { values, onChange: handleFormChange };
    if (level === 'orchestration-v3' && listingId) {
      return (
        <ListingOrchestrationV3Embed
          listingId={listingId}
          ownerId={values.ownerId}
          listingName={values.name}
        />
      );
    }
    if (level === 'detail') {
      if (tabKey === 'general') {
        return (
          <GeneralTab
            {...common}
            aiFilled={new Set(values._aiFilled || [])}
            roomTypeConfigs={roomTypeConfigs}
          />
        );
      }
      if (tabKey === 'location')     return <LocationTab    {...common} />;
      if (tabKey === 'photos')       return <PhotosTabReal  listingId={listingId}
                                                            listingImages={values.listingImages || []}
                                                            onChange={imgs => setValues(v => ({ ...v, listingImages: imgs }))}
                                                            onImagesPersisted={onImagesPersisted}
                                                            airbnbHeroOrder={values.airbnbHeroOrder}
                                                            onAirbnbOrderChange={v => setValues(s => ({ ...s, airbnbHeroOrder: v }))} />;
      if (tabKey === 'amenities')    return <AmenitiesTab   {...common} listingId={listingId} />;
      if (tabKey === 'pricing')      return <PricingTab     {...common} />;
      if (tabKey === 'availability') return <AvailabilityTab {...common} />;
      if (tabKey === 'fees')         return <FeesTab        {...common} />;
      if (tabKey === 'channels')     return <ChannelsTab    {...common} listingId={listingId} onVerifyRuChannels={onVerifyRuChannels} verifyRuLoading={verifyRuLoading} />;
      if (tabKey === 'direct')       return <DirectBookingTab {...common} />;
      if (tabKey === 'rooms')        return <RoomsTab       {...common} listingId={listingId} />;
      if (tabKey === 'license')      return <LicenseTab     {...common} />;
    }
    return null;
  };

  return (
    <ListingFormStructureContext.Provider value={listingStructure}>
    <ListingFormShell
      listing={{
        id: listingId || 'SJ-LIST-9F2A',
        name: values.name || '',
        bedrooms: values.bedrooms ?? 4,
        bathrooms: values.bathrooms ?? 2,
        guests: values.guests ?? 8,
        location: values.locationLine || '',
        completionPct: 72,
      }}
      tabsStatus={{
        general:      { tone: 'success', label: '✓' },
        location:     { tone: 'success', label: '✓' },
        photos:       { tone: 'warning', label: `${(values.photos || []).length}/15` },
        amenities:    { tone: 'success', label: '✓' },
        channels:     { tone: 'warning', label: '2/3' },
        license:      { tone: 'warning', label: '⚠' },
      }}
      defaultLevel={defaultLevel}
      defaultTab={defaultTab || (defaultLevel === 'orchestration-v3' ? 'orchestration-v3' : 'general')}
      lockLevel={lockLevel}
      embedded={embedded}
      onSave={() => onSave?.(values)}
      onPublish={handlePublish}
      publishLoading={publishLoading}
      onPreview={() => window.open(`/listings/${listingId}/preview`)}
      onAiAssist={() => {}}
      renderTab={renderTab}
    />
    </ListingFormStructureContext.Provider>
  );
}
