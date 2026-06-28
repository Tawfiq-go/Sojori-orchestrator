// ════════════════════════════════════════════════════════════════════
// ListingFormV2.jsx — Exemple d'intégration finale
// Combine ListingFormShell + onglets Detail + Orchestration V3
// Branchez vos vrais hooks de données à la place de useState({}).
// ════════════════════════════════════════════════════════════════════
import React, { useEffect, useState, useCallback } from 'react';
import ListingFormShell from './ListingFormShell';
import { ListingFormStructureContext } from './ListingFormStructureContext';
import { ListingFormImportedProvider } from './ListingFormImportedContext';
import listingsService from '../../../services/listingsService';
import { getListingImportOnboarding } from '../../../services/importOnboardingService';
import { toast } from 'react-toastify';

import { GeneralTab, LocationTab }                          from './tabs/GeneralLocationTabs';
import { PhotosTabReal }                                    from './tabs/PhotosTabReal';
import AmenitiesTab                                         from './tabs/DetailTabsAmenities';
import { PricingTab, AvailabilityTab, FeesTab }             from './tabs/DetailTabsCommercial';
import { DistributionTab, RoomsTab, LicenseTab } from './tabs/DetailTabsDistribution';
import { RuImportDataTab } from './tabs/DetailTabsRuImport';
import PostImportOnboardingTab from './tabs/PostImportOnboardingTab';
import ListingOrchestrationV3Embed from '../../../features/orchestrationListingV3/ListingOrchestrationV3Embed';

export default function ListingFormV2({
  listingId,
  initialValues = {},
  importedFieldsSource,
  defaultLevel = 'detail',
  defaultTab,
  lockLevel,
  embedded = false,
  onSave,
  onImagesPersisted,
  listingStructure = null,
  roomTypeConfigs = [],
}) {
  const [values, setValues] = useState(initialValues);
  const [publishLoading, setPublishLoading] = useState(false);
  const [importOnboardingActive, setImportOnboardingActive] = useState(
    Boolean(initialValues?.importOnboarding?.active),
  );
  const ruImportSnapshot = importedFieldsSource ?? initialValues;

  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setValues(initialValues);
      setImportOnboardingActive(Boolean(initialValues.importOnboarding?.active));
    }
  }, [initialValues]);

  useEffect(() => {
    if (!listingId) return;
    let cancelled = false;
    (async () => {
      try {
        const state = await getListingImportOnboarding(listingId);
        if (!cancelled) setImportOnboardingActive(Boolean(state?.active));
      } catch {
        /* listing sans onboarding — ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [listingId]);

  const handleImportOnboardingFinished = useCallback(() => {
    setImportOnboardingActive(false);
  }, []);

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
      toast.error('Impossible de publier: listing ID manquant');
      return;
    }

    setPublishLoading(true);
    try {
      console.log('[ListingFormV2] Starting RU sync for listingId:', listingId);
      toast.info('Synchronisation vers Rentals United en cours...');

      // Synchroniser avec Rentals United
      const syncResult = await listingsService.syncListingToRentalUnited(listingId);

      console.log('[ListingFormV2] Sync result:', syncResult);

      if (syncResult.success) {
        const apiCallCount = syncResult.data?.apiCallCount || 0;
        const propertyIds = syncResult.data?.propertyIds || [];
        console.log('[ListingFormV2] Sync SUCCESS - apiCallCount:', apiCallCount, 'propertyIds:', propertyIds);
        toast.success(
          `✓ Listing synchronisé avec RU (${apiCallCount} appels API, ${propertyIds.length} propriétés)`,
          { autoClose: 5000 }
        );
      } else {
        console.error('[ListingFormV2] Sync FAILED - error:', syncResult.error);
        toast.error(
          `Échec de la synchronisation RU: ${syncResult.error || 'Erreur inconnue'}`,
          { autoClose: 8000 }
        );
      }
    } catch (error) {
      console.error('[ListingFormV2] handlePublish exception:', error);
      toast.error(
        `Erreur lors de la publication: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
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
      if (tabKey === 'post-import' && listingId) {
        return (
          <PostImportOnboardingTab
            listingId={listingId}
            onFinished={handleImportOnboardingFinished}
          />
        );
      }
      if (tabKey === 'general') {
        return (
          <GeneralTab
            {...common}
            aiFilled={new Set(values._aiFilled || [])}
            roomTypeConfigs={roomTypeConfigs}
          />
        );
      }
      if (tabKey === 'rules-guest') return <AvailabilityTab {...common} />;
      if (tabKey === 'location')     return <LocationTab    {...common} />;
      if (tabKey === 'photos')       return <PhotosTabReal  listingId={listingId}
                                                            listingImages={values.listingImages || []}
                                                            onChange={imgs => setValues(v => ({ ...v, listingImages: imgs }))}
                                                            onImagesPersisted={onImagesPersisted}
                                                            airbnbHeroOrder={values.airbnbHeroOrder}
                                                            onAirbnbOrderChange={v => setValues(s => ({ ...s, airbnbHeroOrder: v }))} />;
      if (tabKey === 'amenities')    return <AmenitiesTab   {...common} listingId={listingId} />;
      if (tabKey === 'ru-import')    return <RuImportDataTab {...common} />;
      if (tabKey === 'pricing')      return <PricingTab     {...common} />;
      if (tabKey === 'availability') return <AvailabilityTab {...common} />;
      if (tabKey === 'fees')         return <FeesTab        {...common} />;
      if (tabKey === 'distribution' || tabKey === 'direct') {
        return <DistributionTab {...common} listingId={listingId} />;
      }
      if (tabKey === 'rooms')        return <RoomsTab       {...common} listingId={listingId} />;
      if (tabKey === 'license')      return <LicenseTab     {...common} />;
    }
    return null;
  };

  return (
    <ListingFormImportedProvider listingRaw={ruImportSnapshot}>
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
        license:      { tone: 'warning', label: '⚠' },
      }}
      defaultLevel={defaultLevel}
      defaultTab={
        defaultTab ||
        (importOnboardingActive && defaultLevel === 'detail'
          ? 'post-import'
          : defaultLevel === 'orchestration-v3'
            ? 'orchestration-v3'
            : 'general')
      }
      lockLevel={lockLevel}
      embedded={embedded}
      importOnboardingActive={importOnboardingActive}
      onSave={() => onSave?.(values)}
      onPublish={handlePublish}
      publishLoading={publishLoading}
      onPreview={() => window.open(`/listings/${listingId}/preview`)}
      onAiAssist={() => {}}
      renderTab={renderTab}
    />
    </ListingFormStructureContext.Provider>
    </ListingFormImportedProvider>
  );
}
