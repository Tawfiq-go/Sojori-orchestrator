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
import { ensureMenuOptionsComplete } from '../../components/listing/form-v2/components/ChatbotMenuConfig/menuDefaults';
import { menuBtnOutlined, T as menuT } from '../../components/listing/form-v2/components/ChatbotMenuConfig/menuTheme';
import listingsService from '../../services/listingsService';
import { saveListingWhatsappOption } from '../orchestrationListingV3/listingOrchestrationApi';
import type { ListingOrchestrationDoc } from '../orchestrationListingV3/listingOrchestrationApi';
import AccessConfigTab from '../listing/components/ConfigOrchestration/AccessConfigTab';
import ArrivalDepartureConfigTab from '../listing/components/ConfigOrchestration/ArrivalDepartureConfigTab';
import CleaningConfigTab from '../listing/components/ConfigOrchestration/CleaningConfigTab';
import CleaningSojoriConfigTab from '../listing/components/ConfigOrchestration/CleaningSojoriConfigTab';
import ConciergeConfigTab from '../listing/components/ConfigOrchestration/ConciergeConfigTab';
import GroceryConfigTab from '../listing/components/ConfigOrchestration/GroceryConfigTab';
import RulesConfigTab from '../listing/components/ConfigOrchestration/RulesConfigTab';
import ServiceClientConfigTab from '../listing/components/ConfigOrchestration/ServiceClientConfigTab';
import SupportConfigTabContainer from '../listing/components/ConfigOrchestration/SupportConfigTabContainer';
import TransportConfigTab from '../listing/components/ConfigOrchestration/TransportConfigTab';
import type { CapabilityDefinition } from './capabilityRegistry';
import type { MatrixScopeMode } from './types';
import { SOJORI_TOKENS as T } from '../listing/components/ConfigOrchestration/types';

type GestionProps = {
  def: CapabilityDefinition;
  scope: MatrixScopeMode;
  ownerKey: string;
  listingId?: string;
  listingValues: Record<string, unknown>;
  onListingPatch: (patch: Record<string, unknown>) => Promise<void>;
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
        <ArrivalDepartureConfigTab {...commonListing} />
      </Box>
    );
  }
  if (key === 'registration') {
    return (
      <Alert severity="info" sx={{ fontSize: 12.5 }}>
        Enregistrement voyageurs (flow E) — règles dans le menu WhatsApp ci-dessous. Contenu formulaire :
        orchestration / fulltask.
      </Alert>
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
          listingId={lid || undefined}
          ownerId={ownerId}
          listingValues={listingValues}
          templateOwnerKey={templateMode ? templateOwnerKey : undefined}
        />
      </Box>
    );
  }
  if (key === 'groceries') {
    return (
      <Box sx={embeddedSx}>
        <GroceryConfigTab
          listingId={lid || undefined}
          ownerId={ownerId}
          templateOwnerKey={templateMode ? templateOwnerKey : undefined}
        />
      </Box>
    );
  }
  if (key === 'concierge') {
    return (
      <Box sx={embeddedSx}>
        <ConciergeConfigTab
          listingId={lid || undefined}
          ownerId={ownerId}
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
          listingId={lid || undefined}
          ownerId={ownerId}
          templateOwnerKey={templateMode ? templateOwnerKey : undefined}
        />
      </Box>
    );
  }
  if (key === 'property_wifi') {
    return (
      <Alert severity="info" sx={{ fontSize: 12.5 }}>
        WiFi et infos propriété : champs sur la fiche listing (wifiUsername, wifiPassword, descriptions).
        Menu G ci-dessous.
      </Alert>
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
  onOrchestrationSaved?: () => void;
};

export function CapabilityWhatsAppPanel({
  def,
  scope,
  ownerKey,
  listingId,
  orchestrationDoc,
  onOrchestrationSaved,
}: WhatsAppProps) {
  if (!def.menuCodes.length) {
    return (
      <Typography sx={{ fontSize: 13, color: T.text3 }}>Pas d’option menu WhatsApp pour ce service.</Typography>
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
      onSaved={onOrchestrationSaved}
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

function ListingOrchestrationWhatsAppPanel({
  listingId,
  capabilityKey,
  menuCodes,
  orchestrationDoc,
  onSaved,
}: {
  listingId: string;
  capabilityKey: string;
  menuCodes: string[];
  orchestrationDoc: ListingOrchestrationDoc;
  onSaved?: () => void;
}) {
  const cap = orchestrationDoc.capabilities?.[capabilityKey];
  const storedOptions = (cap?.whatsapp?.menuOptions ?? []) as Record<string, unknown>[];
  const [menuOptions, setMenuOptions] = useState<Record<string, unknown>[]>(() =>
    ensureMenuOptionsComplete(storedOptions) as Record<string, unknown>[],
  );
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const next = ensureMenuOptionsComplete(storedOptions) as Record<string, unknown>[];
    setMenuOptions(next);
  }, [orchestrationDoc, capabilityKey]);

  const persist = async (next: Record<string, unknown>[]) => {
    setSaving(true);
    try {
      await saveListingWhatsappOption({
        listingId,
        capabilityKey,
        menuCodes,
        menuOptions: next,
        doc: orchestrationDoc,
      });
      toast.success('WhatsApp enregistré (listing orchestration)');
      onSaved?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur enregistrement WhatsApp');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      {capabilityKey === 'menu_navigation' ? (
        <>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: T.text2, mb: 0.5 }}>
            Menu WhatsApp
          </Typography>
          {MENU_NAV_ALWAYS_CODES.map(code => {
            const opt = menuOptions.find(o => String(o.code) === code);
            if (!opt) {
              return (
                <Alert key={code} severity="warning" sx={{ fontSize: 12 }}>
                  Option {code} absente — migrer le listing ou compléter le doc orchestration.
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
                  Option {code} absente — migrer le listing ou compléter le doc orchestration.
                </Alert>
              );
            }
            return (
              <MenuOptionCard
                key={code}
                option={opt}
                variant="navigation-leaf"
                defaultExpanded
                onChange={(updated: Record<string, unknown>) => {
                  const next = menuOptions.map(o =>
                    String(o.code) === code ? { ...o, ...updated } : o,
                  );
                  setMenuOptions(next);
                  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                  saveTimerRef.current = setTimeout(() => {
                    void persist(next);
                  }, 900);
                }}
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
                onChange={(updated: Record<string, unknown>) => {
                  const next = menuOptions.map(o =>
                    String(o.code) === code ? { ...o, ...updated } : o,
                  );
                  setMenuOptions(next);
                  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                  saveTimerRef.current = setTimeout(() => {
                    void persist(next);
                  }, 900);
                }}
              />
            );
          })}
          <Typography sx={{ fontSize: 11, color: T.text3, lineHeight: 1.5 }}>
            A et B sont toujours visibles dans le menu. C = fenêtre de parcours. D et J = entrées
            sous-menu — détail D1–D4 et J1–J3 dans chaque service (Arrivée & départ, Conciergerie…).
          </Typography>
        </>
      ) : (
        menuCodes.map(code => {
          const opt = menuOptions.find(o => String(o.code) === code);
          if (!opt) {
            return (
              <Alert key={code} severity="warning" sx={{ fontSize: 12 }}>
                Option {code} absente — migrer le listing ou compléter le doc orchestration.
              </Alert>
            );
          }
          return (
            <MenuOptionCard
              key={code}
              option={opt}
              defaultExpanded
              onChange={(updated: Record<string, unknown>) => {
                const next = menuOptions.map(o =>
                  String(o.code) === code ? { ...o, ...updated } : o,
                );
                setMenuOptions(next);
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                saveTimerRef.current = setTimeout(() => {
                  void persist(next);
                }, 900);
              }}
            />
          );
        })
      )}
      <Typography sx={{ fontSize: 11, color: T.text3 }}>
        Sauvegarde auto · listing_orchestrations → chatbot + whitelist
        {saving ? ' · enregistrement…' : ''}
      </Typography>
    </Stack>
  );
}
