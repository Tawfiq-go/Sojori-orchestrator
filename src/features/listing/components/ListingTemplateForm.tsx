import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import ListingFormShell, { CONFIG_NEW_TAB_COUNT } from '../../../components/listing/form-v2/ListingFormShell';
import { ListingFormStructureContext } from '../../../components/listing/form-v2/ListingFormStructureContext';
import SupportConfigTabContainer from './ConfigOrchestration/SupportConfigTabContainer';
import ConciergeConfigTab from './ConfigOrchestration/ConciergeConfigTab';
import CleaningHubTab from './ConfigOrchestration/CleaningHubTab';
import ArrivalDepartureConfigTab from './ConfigOrchestration/ArrivalDepartureConfigTab';
import TransportConfigTab from './ConfigOrchestration/TransportConfigTab';
import GroceryConfigTab from './ConfigOrchestration/GroceryConfigTab';
import ServiceClientConfigTab from './ConfigOrchestration/ServiceClientConfigTab';
import AccessConfigTab from './ConfigOrchestration/AccessConfigTab';
import MessagesConfigTab from './ConfigOrchestration/MessagesConfigTab';
import OwnerOrchestrationFlagsTab from './ConfigOrchestration/OwnerOrchestrationFlagsTab';
import OwnerTemplateWhatsAppTab from './ConfigOrchestration/OwnerTemplateWhatsAppTab';
import RulesConfigTab from './ConfigOrchestration/RulesConfigTab';
import PmConfigTabFrame from './ConfigOrchestration/PmConfigTabFrame';
import listingsService from '../../../services/listingsService';
import { logOrchConfig, orchConfigError } from '../utils/orchConfigDebugLog';
import { ORCHESTRATION_ADMIN_OWNER_ID } from '../../../constants/orchestrationAdmin';

export function isAdminGlobalTemplateScope(ownerKey: string, isAdminTemplate?: boolean): boolean {
  if (isAdminTemplate) return true;
  if (!ownerKey || ownerKey === 'global') return true;
  return ownerKey === ORCHESTRATION_ADMIN_OWNER_ID;
}

type Props = {
  ownerKey: string;
  ownerDisplayName: string;
  ownerIdForTabs?: string;
  referenceListingId: string | null;
  referenceListingName?: string;
  referenceLocation?: string;
  initialValues?: Record<string, unknown>;
  listingCount?: number;
  isAdminTemplate?: boolean;
  adminViewingPm?: boolean;
  defaultTab?: string;
  templateRefreshKey?: number;
};

function TemplateTabPlaceholder({ title, hint }: { title: string; hint: string }) {
  return (
    <Alert severity="info" sx={{ borderRadius: 2 }}>
      <Typography variant="subtitle2" fontWeight={700}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {hint}
      </Typography>
    </Alert>
  );
}

type OwnerCfgPayload = {
  listing?: Record<string, unknown>;
  chatbot?: { menuOptions?: unknown[] };
  rulesAndInfo?: { Rules?: string[]; InfoUtils?: string[] };
};

export default function ListingTemplateForm({
  ownerKey,
  ownerDisplayName,
  ownerIdForTabs,
  referenceListingId,
  referenceListingName = '',
  referenceLocation = '',
  initialValues = {},
  listingCount = 0,
  isAdminTemplate = false,
  adminViewingPm = false,
  defaultTab = 'access-config',
  templateRefreshKey = 0,
}: Props) {
  const [ownerCfg, setOwnerCfg] = useState<OwnerCfgPayload | null>(null);
  const [cfgLoading, setCfgLoading] = useState(true);

  const loadOwnerTemplate = useCallback(async () => {
    setCfgLoading(true);
    try {
      const res = await listingsService.getListingOwnerConfigTemplate(ownerKey);
      const data = ((res as { data?: OwnerCfgPayload })?.data ?? res) as OwnerCfgPayload;
      setOwnerCfg(data);
    } catch {
      setOwnerCfg({});
    } finally {
      setCfgLoading(false);
    }
  }, [ownerKey]);

  useEffect(() => {
    void loadOwnerTemplate();
  }, [loadOwnerTemplate, templateRefreshKey]);

  const templateListingValues = (ownerCfg?.listing || {}) as Record<string, unknown>;
  const listingRef = useRef<Record<string, unknown>>(templateListingValues);
  listingRef.current = templateListingValues;

  const persistListingSection = useCallback(
    async (patch: Record<string, unknown>) => {
      const prev = listingRef.current;
      const next = { ...prev, ...patch };
      const cleaningOrch = next.cleaningOrchestration as Record<string, unknown> | undefined;
      logOrchConfig('template.listing.persist →', {
        ownerKey,
        patchKeys: Object.keys(patch),
        preferredDayAfterCheckout: cleaningOrch?.preferredDayAfterCheckout,
        safetyMaxDirtyDays: cleaningOrch?.safetyMaxDirtyDays,
        checklistCount: Array.isArray(cleaningOrch?.checklist) ? cleaningOrch.checklist.length : 0,
      });
      try {
        const res = await listingsService.putListingOwnerConfigTemplateSection(ownerKey, 'listing', next);
        listingRef.current = next;
        setOwnerCfg((cfg) => ({ ...cfg, listing: next }));
        const version = (res as { data?: { version?: number } })?.data?.version;
        logOrchConfig('template.listing.persist ← OK', { ownerKey, version });
      } catch (e: unknown) {
        orchConfigError('template.listing.persist ← FAIL', e, { ownerKey, patchKeys: Object.keys(patch) });
        toast.error('Échec enregistrement template orchestration (voir console OrchConfig)');
        throw e;
      }
    },
    [ownerKey],
  );

  const templateOwnerKey = ownerKey === ORCHESTRATION_ADMIN_OWNER_ID ? 'global' : ownerKey;
  const isAdminGlobal = isAdminGlobalTemplateScope(ownerKey, isAdminTemplate);
  const ownerId = ownerIdForTabs || (templateListingValues.ownerId as string | undefined);

  const renderTab = (tabKey: string, _level: string) => {
    if (cfgLoading) {
      return (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      );
    }

    if (tabKey === 'orchestration-config') {
      return (
        <PmConfigTabFrame tabKey={tabKey}>
          <OwnerOrchestrationFlagsTab ownerKey={ownerKey} templateLabel={ownerDisplayName} />
        </PmConfigTabFrame>
      );
    }

    const wrap = (tabId: string, node: ReactNode) => (
      <PmConfigTabFrame tabKey={tabId}>{node}</PmConfigTabFrame>
    );

    if (tabKey === 'access-config') {
      return wrap(
        tabKey,
        <AccessConfigTab templateOwnerKey={templateOwnerKey} listingName={referenceListingName} ownerId={ownerId} />,
      );
    }
    if (tabKey === 'support-config') {
      return wrap(
        tabKey,
        <SupportConfigTabContainer templateOwnerKey={templateOwnerKey} ownerId={ownerId} />,
      );
    }
    if (tabKey === 'concierge-config') {
      return wrap(
        tabKey,
        <ConciergeConfigTab
          templateOwnerKey={templateOwnerKey}
          ownerId={ownerId}
          adminCatalogOnly={isAdminGlobal}
        />,
      );
    }
    if (tabKey === 'cleaning-config') {
      return wrap(
        tabKey,
        <CleaningHubTab
          listingId=""
          templateMode
          ownerId={ownerId}
          listingValues={templateListingValues}
          onListingPatch={persistListingSection}
        />,
      );
    }
    if (tabKey === 'timeslots-config') {
      return wrap(
        tabKey,
        <ArrivalDepartureConfigTab
          listingId=""
          templateMode
          ownerId={ownerId}
          listingValues={templateListingValues}
          onListingPatch={persistListingSection}
        />,
      );
    }
    if (tabKey === 'transport-config') {
      return wrap(
        tabKey,
        <TransportConfigTab
          templateOwnerKey={templateOwnerKey}
          ownerId={ownerId}
          listingValues={templateListingValues}
        />,
      );
    }
    if (tabKey === 'grocery-config') {
      return wrap(tabKey, <GroceryConfigTab templateOwnerKey={templateOwnerKey} ownerId={ownerId} />);
    }
    if (tabKey === 'service-client-config') {
      return wrap(
        tabKey,
        <ServiceClientConfigTab templateOwnerKey={templateOwnerKey} ownerId={ownerId} />,
      );
    }
    if (tabKey === 'messages-config') {
      return wrap(
        tabKey,
        <MessagesConfigTab
          listingId=""
          templateMode
          ownerId={ownerId}
          referenceListingId={referenceListingId}
          listingValues={templateListingValues}
          onListingPatch={persistListingSection}
        />,
      );
    }
    if (tabKey === 'rules-config') {
      return wrap(
        tabKey,
        <RulesConfigTab templateOwnerKey={templateOwnerKey} listingName={referenceListingName} ownerId={ownerId} />,
      );
    }
    if (tabKey === 'whatsapp-config') {
      return wrap(tabKey, <OwnerTemplateWhatsAppTab templateOwnerKey={templateOwnerKey} />);
    }

    return <TemplateTabPlaceholder title="Onglet" hint="Non configuré." />;
  };

  const hasTemplateData = Boolean(
    ownerCfg?.listing ||
      ownerCfg?.chatbot?.menuOptions?.length ||
      (ownerCfg?.rulesAndInfo?.Rules?.length ?? 0) > 0 ||
      (ownerCfg?.rulesAndInfo?.InfoUtils?.length ?? 0) > 0 ||
      templateListingValues.paidCleaningConfig ||
      (Array.isArray(templateListingValues.TS_CHECKIN) &&
        (templateListingValues.TS_CHECKIN as unknown[]).length > 0),
  );

  return (
    <ListingFormStructureContext.Provider value={null}>
      <ListingFormShell
        embedded
        listing={{
          id: referenceListingId || ownerKey,
          name:
            isAdminTemplate || adminViewingPm
              ? ''
              : referenceListingName || ownerDisplayName,
          bedrooms: (templateListingValues.bedrooms as number) ?? 0,
          bathrooms: (templateListingValues.bathrooms as number) ?? 0,
          guests: (templateListingValues.guests as number) ?? 0,
          location: referenceLocation || '',
          completionPct: 0,
        }}
        tabsStatus={{
          'orchestration-config': { tone: 'success', label: 'TPL' },
          'whatsapp-config': {
            tone: ownerCfg?.chatbot?.menuOptions?.length ? 'success' : 'neutral',
            label: ownerCfg?.chatbot?.menuOptions?.length ? 'TPL' : '—',
          },
          'access-config': { tone: hasTemplateData ? 'success' : 'neutral', label: hasTemplateData ? 'TPL' : '—' },
          'rules-config': {
            tone:
              (ownerCfg?.rulesAndInfo?.Rules?.length ?? 0) > 0 ||
              (ownerCfg?.rulesAndInfo?.InfoUtils?.length ?? 0) > 0
                ? 'success'
                : 'neutral',
            label:
              (ownerCfg?.rulesAndInfo?.Rules?.length ?? 0) > 0 ||
              (ownerCfg?.rulesAndInfo?.InfoUtils?.length ?? 0) > 0
                ? 'TPL'
                : '—',
          },
        }}
        defaultLevel="config"
        defaultTab={defaultTab}
        lockLevel="config"
        configNewBadgeLabel=""
        onSave={() => {}}
        renderTab={renderTab}
      />
      {!isAdminTemplate && listingCount > 0 && (
        <Box sx={{ mt: 1, px: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {listingCount} annonce{listingCount !== 1 ? 's' : ''} pour ce propriétaire
          </Typography>
        </Box>
      )}
    </ListingFormStructureContext.Provider>
  );
}

export { CONFIG_NEW_TAB_COUNT };
