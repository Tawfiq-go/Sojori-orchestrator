import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import MenuOptionCard from '../../components/listing/form-v2/components/ChatbotMenuConfig/MenuOptionCard';
import { ensureMenuOptionsComplete, ensureMenuOptionsForCodes, JOURNEY_MENU_CODES } from '../../components/listing/form-v2/components/ChatbotMenuConfig/menuDefaults';
import { menuBtnOutlined, T as menuT } from '../../components/listing/form-v2/components/ChatbotMenuConfig/menuTheme';
import listingsService from '../../services/listingsService';
import { saveListingWhatsappOption } from '../orchestrationListingV3/listingOrchestrationApi';
import type { ListingOrchestrationDoc } from '../orchestrationListingV3/listingOrchestrationApi';
import {
  saveOwnerWhatsappOption,
  type OwnerOrchestrationDoc,
} from '../orchestrationListingV3/ownerOrchestrationApi';
import AccessConfigTab from '../listing/components/ConfigOrchestration/AccessConfigTab';
import ArrivalDepartureConfigTab from '../listing/components/ConfigOrchestration/ArrivalDepartureConfigTab';
import CleaningConfigTab from '../listing/components/ConfigOrchestration/CleaningConfigTab';
import CleaningSojoriConfigTab from '../listing/components/ConfigOrchestration/CleaningSojoriConfigTab';
import ConciergeConfigTab from '../listing/components/ConfigOrchestration/ConciergeConfigTab';
import GroceryConfigTab from '../listing/components/ConfigOrchestration/GroceryConfigTab';
import PropertyWifiConfigTab from '../listing/components/ConfigOrchestration/PropertyWifiConfigTab';
import RulesConfigTab from '../listing/components/ConfigOrchestration/RulesConfigTab';
import ServiceClientConfigTab from '../listing/components/ConfigOrchestration/ServiceClientConfigTab';
import SupportConfigTabContainer from '../listing/components/ConfigOrchestration/SupportConfigTabContainer';
import TransportConfigTab from '../listing/components/ConfigOrchestration/TransportConfigTab';
import { V3BlockSaveBar } from '../orchestrationListingV3/V3BlockSaveBar';
import PreArrivalRequiredToggle from './PreArrivalRequiredToggle';
import type { MatrixScopeMode } from './types';
import { SOJORI_TOKENS as T } from '../listing/components/ConfigOrchestration/types';

type GestionProps = {
  def: CapabilityDefinition;
  scope: MatrixScopeMode;
  ownerKey: string;
  listingId?: string;
  listingValues: Record<string, unknown>;
  onListingPatch: (patch: Record<string, unknown>) => Promise<void>;
  /** Orchestration V3 : pas d’auto-save, barre Enregistrer par bloc. */
  manualSaveMode?: boolean;
};

const embeddedSx = {
  maxWidth: '100%',
  overflow: 'visible',
  '& > *': { maxWidth: '100%' },
  fontSize: 13,
  /* Masque la barre intro redondante dans le drawer */
  '& > div > div:first-of-type': {
    '&:has(> [class*="MuiCircularProgress"])': {},
  },
};

export function CapabilityGestionPanel({
  def,
  scope,
  ownerKey,
  listingId,
  listingValues,
  onListingPatch,
  manualSaveMode = true,
}: GestionProps) {
  const templateMode = scope === 'owner';
  const templateOwnerKey = ownerKey === 'global' ? 'global' : ownerKey;
  const lid = templateMode ? '' : listingId ?? '';
  const ownerId = ownerKey === 'global' ? undefined : ownerKey;

  const commonListing = {
    listingId: lid,
    ownerId,
    listingValues,
    onListingPatch,
    templateMode,
    manualSaveMode,
  };

  const key = def.key;

  if (key === 'menu_navigation') {
    return null;
  }

  if (key === 'cleaning_free') {
    return (
      <Box sx={embeddedSx}>
        <CleaningConfigTab {...commonListing} forcedSub="included" hideSubNav />
      </Box>
    );
  }
  if (key === 'cleaning_paid') {
    return (
      <Box sx={embeddedSx}>
        <CleaningConfigTab {...commonListing} forcedSub="paid" hideSubNav />
      </Box>
    );
  }
  if (key === 'cleaning_sojori') {
    return (
      <Box sx={embeddedSx}>
        <CleaningSojoriConfigTab {...commonListing} showChecklist={false} />
      </Box>
    );
  }
  if (
    key === 'arrival_choose' ||
    key === 'departure_choose' ||
    key === 'arrival_declare' ||
    key === 'departure_declare'
  ) {
    return (
      <Box sx={embeddedSx}>
        <ArrivalDepartureConfigTab {...commonListing} capabilityKey={key} />
        {key === 'arrival_choose' && (lid || templateMode) && (
          <PreArrivalRequiredToggle
            listingId={lid || undefined}
            ownerKey={templateMode ? templateOwnerKey : undefined}
            capabilityKey="arrival_choose"
            title="Choix de l'heure d'arrivée"
            helpRequired="Le voyageur doit choisir son heure d'arrivée (menu D1) avant le jour J — relances puis escalade selon la config. L'assistant WhatsApp le présente comme requis."
            helpOptional="Une heure d'arrivée par défaut s'applique si le voyageur ne choisit pas. L'assistant WhatsApp le présente comme optionnel."
          />
        )}
      </Box>
    );
  }
  if (key === 'receive_arrival' || key === 'receive_departure') {
    return null; // V3ServicePanel → V3ReceiveChecklistPanel
  }
  if (key === 'registration') {
    return (
      <Box sx={embeddedSx}>
        <Alert severity="info" sx={{ fontSize: 12.5 }}>
          Enregistrement voyageurs (flow E) — règles dans le menu WhatsApp ci-dessous. Contenu formulaire :
          orchestration / fulltask.
        </Alert>
        {(lid || templateMode) && (
          <PreArrivalRequiredToggle
            listingId={lid || undefined}
            ownerKey={templateMode ? templateOwnerKey : undefined}
            capabilityKey="registration"
            title="Enregistrement voyageurs"
            helpRequired="Les codes d'accès (menu F) restent verrouillés tant que l'enregistrement n'est pas complété, et l'assistant WhatsApp l'explique au voyageur : l'enregistrement sur place ne suffit pas."
            helpOptional="Le voyageur peut aussi s'enregistrer sur place à l'arrivée — le menu F (Accès & codes) n'exige plus l'enregistrement, et l'assistant le confirme si on lui demande."
          />
        )}
      </Box>
    );
  }
  if (key === 'support') {
    return (
      <Box sx={embeddedSx}>
        <SupportConfigTabContainer
          listingId={lid || undefined}
          ownerId={ownerId}
          templateOwnerKey={templateMode ? templateOwnerKey : undefined}
        />
      </Box>
    );
  }
  if (key === 'service_client') {
    return (
      <Box sx={embeddedSx}>
        <ServiceClientConfigTab
          listingId={lid || undefined}
          ownerId={ownerId}
          templateOwnerKey={templateMode ? templateOwnerKey : undefined}
        />
      </Box>
    );
  }
  if (key === 'transport') {
    return (
      <Box sx={embeddedSx}>
        <TransportConfigTab
          {...commonListing}
          templateOwnerKey={templateMode ? templateOwnerKey : undefined}
        />
      </Box>
    );
  }
  if (key === 'groceries') {
    return (
      <Box sx={embeddedSx}>
        <GroceryConfigTab
          {...commonListing}
          templateOwnerKey={templateMode ? templateOwnerKey : undefined}
        />
      </Box>
    );
  }
  if (key === 'concierge') {
    return (
      <Box sx={embeddedSx}>
        <ConciergeConfigTab
          {...commonListing}
          templateOwnerKey={templateMode ? templateOwnerKey : undefined}
          adminCatalogOnly={templateOwnerKey === 'global'}
        />
      </Box>
    );
  }
  if (key === 'access') {
    return (
      <Box sx={embeddedSx}>
        <AccessConfigTab
          {...commonListing}
          templateOwnerKey={templateMode ? templateOwnerKey : undefined}
        />
      </Box>
    );
  }
  if (key === 'property_wifi') {
    return (
      <Box sx={embeddedSx}>
        <PropertyWifiConfigTab {...commonListing} templateOwnerKey={templateMode ? templateOwnerKey : undefined} />
      </Box>
    );
  }
  if (key === 'house_rules') {
    return (
      <Box sx={embeddedSx}>
        <RulesConfigTab
          listingId={lid || undefined}
          ownerId={ownerId}
          templateOwnerKey={templateMode ? templateOwnerKey : undefined}
        />
      </Box>
    );
  }

  return (
    <Typography sx={{ fontSize: 13, color: T.text3 }}>{def.gestionHint}</Typography>
  );
}

type WhatsAppProps = {
  def: CapabilityDefinition;
  scope: MatrixScopeMode;
  ownerKey: string;
  listingId?: string;
  orchestrationDoc?: ListingOrchestrationDoc;
  ownerOrchestrationDoc?: OwnerOrchestrationDoc;
  onOrchestrationSaved?: () => void;
  onWhatsappPatch?: (capabilityKey: string, menuCodes: string[], menuOptions: unknown[]) => void;
};

export function CapabilityWhatsAppPanel({
  def,
  scope,
  ownerKey,
  listingId,
  orchestrationDoc,
  ownerOrchestrationDoc,
  onOrchestrationSaved,
  onWhatsappPatch,
}: WhatsAppProps) {
  if (!def.menuCodes.length) {
    return (
      <Typography sx={{ fontSize: 13, color: T.text3 }}>Pas d’option menu WhatsApp pour ce service.</Typography>
    );
  }

  if (scope === 'owner' && ownerOrchestrationDoc) {
    return (
      <OwnerOrchestrationWhatsAppPanel
        ownerKey={ownerKey}
        capabilityKey={def.key}
        menuCodes={def.menuCodes}
        orchestrationDoc={ownerOrchestrationDoc}
        onWhatsappPatch={onWhatsappPatch}
      />
    );
  }

  if (scope === 'owner') {
    return <OwnerWhatsAppPanel ownerKey={ownerKey} menuCodes={def.menuCodes} />;
  }

  if (!listingId) {
    return (
      <Alert severity="warning" sx={{ fontSize: 12.5 }}>
        Sélectionnez une annonce pour configurer les overrides menu WhatsApp.
      </Alert>
    );
  }

  if (!orchestrationDoc) {
    return (
      <Alert severity="warning" sx={{ fontSize: 12.5 }}>
        Orchestration listing non migrée — lancer la migration puis éditer le menu ici (Orchestration).
      </Alert>
    );
  }

  return (
    <ListingOrchestrationWhatsAppPanel
      listingId={listingId}
      capabilityKey={def.key}
      menuCodes={def.menuCodes}
      orchestrationDoc={orchestrationDoc}
      onWhatsappPatch={onWhatsappPatch}
    />
  );
}

function OwnerWhatsAppPanel({
  ownerKey,
  menuCodes,
}: {
  ownerKey: string;
  menuCodes: string[];
}) {
  const templateKey = ownerKey === 'global' ? 'global' : ownerKey;
  const [menuOptions, setMenuOptions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listingsService.getListingOwnerConfigTemplate(templateKey);
      const payload = (res as { data?: { chatbot?: { menuOptions?: unknown[] } } })?.data ?? res;
      const raw = (payload as { chatbot?: { menuOptions?: unknown[] } })?.chatbot?.menuOptions ?? [];
      setMenuOptions(ensureMenuOptionsComplete(raw) as Record<string, unknown>[]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Menu WhatsApp indisponible');
      setMenuOptions([]);
    } finally {
      setLoading(false);
    }
  }, [templateKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveOptions = async (next: Record<string, unknown>[]) => {
    setSaving(true);
    try {
      await listingsService.putListingOwnerConfigTemplateSection(templateKey, 'chatbot', {
        menuOptions: next,
      });
      setMenuOptions(next);
      toast.success('Menu WhatsApp enregistré');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = (next: Record<string, unknown>[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveOptions(next);
    }, 800);
  };

  const updateOption = (code: string, updated: Record<string, unknown>) => {
    const next = menuOptions.map(o =>
      String(o.code) === code ? { ...o, ...updated } : o,
    );
    setMenuOptions(next);
    scheduleSave(next);
  };

  if (loading) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <CircularProgress size={28} sx={{ color: menuT.primary }} />
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {menuCodes.map(code => {
        const opt = menuOptions.find(o => String(o.code) === code);
        if (!opt) {
          return (
            <Alert key={code} severity="warning" sx={{ fontSize: 12 }}>
              Option {code} absente du template — chargez les défauts dans l’onglet Menu WhatsApp v1.
            </Alert>
          );
        }
        return (
          <MenuOptionCard
            key={code}
            option={opt}
            defaultExpanded
            onChange={(updated: Record<string, unknown>) => updateOption(code, updated)}
          />
        );
      })}
      <Button size="small" variant="outlined" disabled={saving} onClick={() => void load()} sx={menuBtnOutlined}>
        Actualiser
      </Button>
    </Stack>
  );
}

const MENU_NAV_ALWAYS_CODES = ['A', 'B'];
const MENU_NAV_WINDOW_CODES = ['C'];
const MENU_NAV_STRUCTURE_CODES = ['D', 'J'];

type WhatsappOptionsEditorProps = {
  capabilityKey: string;
  menuCodes: string[];
  storedOptions: Record<string, unknown>[];
  saving: boolean;
  dirty: boolean;
  menuOptions: Record<string, unknown>[];
  onUpdateOption: (code: string, updated: Record<string, unknown>) => void;
};

function WhatsappOptionsEditor({
  capabilityKey,
  menuCodes,
  saving,
  dirty,
  menuOptions,
  onUpdateOption,
}: WhatsappOptionsEditorProps) {
  const isJourney = menuCodes.some(code => JOURNEY_MENU_CODES.includes(code));
  const cardVariant = capabilityKey === 'menu_navigation' ? undefined : isJourney ? 'navigation-leaf' : undefined;

  if (capabilityKey === 'menu_navigation') {
    return (
      <>
        <Typography sx={{ fontSize: 12, fontWeight: 800, color: T.text2, mb: 0.5 }}>
          Menu WhatsApp
        </Typography>
        {MENU_NAV_ALWAYS_CODES.map(code => {
          const opt = menuOptions.find(o => String(o.code) === code);
          if (!opt) {
            return (
              <Alert key={code} severity="warning" sx={{ fontSize: 12 }}>
                Option {code} absente — compléter le modèle orchestration.
              </Alert>
            );
          }
          return (
            <MenuOptionCard
              key={code}
              option={{ ...opt, enabled: true, availability: { type: 'always' } }}
              variant="navigation-leaf"
              lockEnabledOn
              lockAvailabilityAlways
              defaultExpanded
              onChange={() => {}}
            />
          );
        })}
        {MENU_NAV_WINDOW_CODES.map(code => {
          const opt = menuOptions.find(o => String(o.code) === code);
          if (!opt) {
            return (
              <Alert key={code} severity="warning" sx={{ fontSize: 12 }}>
                Option {code} absente — compléter le modèle orchestration.
              </Alert>
            );
          }
          return (
            <MenuOptionCard
              key={code}
              option={opt}
              variant="navigation-leaf"
              defaultExpanded
              onChange={(updated: Record<string, unknown>) => onUpdateOption(code, updated)}
            />
          );
        })}
        {MENU_NAV_STRUCTURE_CODES.map(code => {
          const opt = menuOptions.find(o => String(o.code) === code);
          if (!opt) return null;
          return (
            <MenuOptionCard
              key={code}
              option={opt}
              variant="navigation-category"
              onChange={(updated: Record<string, unknown>) => onUpdateOption(code, updated)}
            />
          );
        })}
      </>
    );
  }

  return (
    <>
      {menuCodes.map(code => {
        const opt = menuOptions.find(o => String(o.code) === code);
        if (!opt) {
          return (
            <Alert key={code} severity="warning" sx={{ fontSize: 12 }}>
              Option {code} absente — compléter le modèle orchestration.
            </Alert>
          );
        }
        return (
          <MenuOptionCard
            key={code}
            option={opt}
            variant={cardVariant}
            defaultExpanded
            onChange={(updated: Record<string, unknown>) => onUpdateOption(code, updated)}
          />
        );
      })}
    </>
  );
}

function useOrchestrationWhatsappState(
  capabilityKey: string,
  menuCodes: string[],
  storedOptions: Record<string, unknown>[],
  persist: (next: Record<string, unknown>[]) => Promise<void>,
) {
  const [menuOptions, setMenuOptions] = useState<Record<string, unknown>[]>(() =>
    ensureMenuOptionsForCodes(storedOptions, menuCodes) as Record<string, unknown>[],
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const menuOptionsRef = useRef(menuOptions);
  menuOptionsRef.current = menuOptions;

  useEffect(() => {
    setMenuOptions(ensureMenuOptionsForCodes(storedOptions, menuCodes) as Record<string, unknown>[]);
    setDirty(false);
    dirtyRef.current = false;
  }, [capabilityKey]);

  const updateOption = (code: string, updated: Record<string, unknown>) => {
    const next = menuOptionsRef.current.map(o =>
      String(o.code) === code ? { ...o, ...updated } : o,
    );
    menuOptionsRef.current = next;
    setMenuOptions(next);
    dirtyRef.current = true;
    setDirty(true);
  };

  const savePending = useCallback(async () => {
    if (!dirtyRef.current || !menuOptionsRef.current.length) return;
    setSaving(true);
    try {
      await persist(menuOptionsRef.current);
      dirtyRef.current = false;
      setDirty(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur enregistrement WhatsApp');
      throw e;
    } finally {
      setSaving(false);
    }
  }, [persist]);

  return { menuOptions, saving, dirty, updateOption, savePending };
}

function whatsappSaveLabel(scope: 'owner' | 'listing') {
  return scope === 'owner'
    ? 'Menu WhatsApp · owner_orchestrations'
    : 'Menu WhatsApp · listing_orchestrations';
}

function OwnerOrchestrationWhatsAppPanel({
  ownerKey,
  capabilityKey,
  menuCodes,
  orchestrationDoc,
  onWhatsappPatch,
}: {
  ownerKey: string;
  capabilityKey: string;
  menuCodes: string[];
  orchestrationDoc: OwnerOrchestrationDoc;
  onWhatsappPatch?: (capabilityKey: string, menuCodes: string[], menuOptions: unknown[]) => void;
}) {
  const cap = orchestrationDoc.capabilities?.[capabilityKey];
  const storedOptions = (cap?.whatsapp?.menuOptions ?? []) as Record<string, unknown>[];

  const persist = useCallback(
    async (next: Record<string, unknown>[]) => {
      await saveOwnerWhatsappOption({
        ownerKey,
        capabilityKey,
        menuCodes,
        menuOptions: next,
        doc: orchestrationDoc,
      });
      onWhatsappPatch?.(capabilityKey, menuCodes, next);
      toast.success('WhatsApp enregistré (modèle PM)');
    },
    [ownerKey, capabilityKey, menuCodes, orchestrationDoc, onWhatsappPatch],
  );

  const { menuOptions, saving, dirty, updateOption, savePending } = useOrchestrationWhatsappState(
    capabilityKey,
    menuCodes,
    storedOptions,
    persist,
  );

  return (
    <Stack spacing={0}>
      <WhatsappOptionsEditor
        capabilityKey={capabilityKey}
        menuCodes={menuCodes}
        storedOptions={storedOptions}
        saving={saving}
        dirty={dirty}
        menuOptions={menuOptions}
        onUpdateOption={updateOption}
      />
      <V3BlockSaveBar
        label={whatsappSaveLabel('owner')}
        dirty={dirty}
        saving={saving}
        onSave={savePending}
      />
    </Stack>
  );
}

function ListingOrchestrationWhatsAppPanel({
  listingId,
  capabilityKey,
  menuCodes,
  orchestrationDoc,
  onWhatsappPatch,
}: {
  listingId: string;
  capabilityKey: string;
  menuCodes: string[];
  orchestrationDoc: ListingOrchestrationDoc;
  onWhatsappPatch?: (capabilityKey: string, menuCodes: string[], menuOptions: unknown[]) => void;
}) {
  const cap = orchestrationDoc.capabilities?.[capabilityKey];
  const storedOptions = (cap?.whatsapp?.menuOptions ?? []) as Record<string, unknown>[];

  const persist = useCallback(
    async (next: Record<string, unknown>[]) => {
      await saveListingWhatsappOption({
        listingId,
        capabilityKey,
        menuCodes,
        menuOptions: next,
        doc: orchestrationDoc,
      });
      onWhatsappPatch?.(capabilityKey, menuCodes, next);
      toast.success('WhatsApp enregistré (listing orchestration)');
    },
    [listingId, capabilityKey, menuCodes, orchestrationDoc, onWhatsappPatch],
  );

  const { menuOptions, saving, dirty, updateOption, savePending } = useOrchestrationWhatsappState(
    capabilityKey,
    menuCodes,
    storedOptions,
    persist,
  );

  return (
    <Stack spacing={0}>
      <WhatsappOptionsEditor
        capabilityKey={capabilityKey}
        menuCodes={menuCodes}
        storedOptions={storedOptions}
        saving={saving}
        dirty={dirty}
        menuOptions={menuOptions}
        onUpdateOption={updateOption}
      />
      {capabilityKey === 'menu_navigation' && (
        <Typography sx={{ fontSize: 11, color: T.text3, lineHeight: 1.5, px: 0.5, mt: 1 }}>
          A et B sont toujours visibles dans le menu. C = fenêtre de parcours. D et J = entrées
          sous-menu — détail D1–D4 et J1–J3 dans chaque service (Arrivée & départ, Conciergerie…).
        </Typography>
      )}
      <V3BlockSaveBar
        label={whatsappSaveLabel('listing')}
        dirty={dirty}
        saving={saving}
        onSave={savePending}
      />
    </Stack>
  );
}
