import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import listingsService from '../../services/listingsService';
import type { Workflow } from '../taskHub/staff-design/types';
import {
  CAPABILITY_REGISTRY,
  defaultListingRailCapabilityKey,
  getCapabilityDefinition,
  isCapabilityVisibleOnListingRail,
} from '../serviceMatrix/capabilityRegistry';
import { applyDependencyRules } from '../serviceMatrix/matrixStateUtils';
import type { CapabilityRowState } from '../serviceMatrix/types';
import V3Header, { type V3ScopeMode } from './V3Header';
import V3MessageLibrary from './V3MessageLibrary';
import V3Rail from './V3Rail';
import V3ServicePanel from './V3ServicePanel';
import { V3 } from './theme';
import {
  loadListingOrchestrationMatrix,
  saveListingGestion,
  saveListingOrchestrationRow,
  type ListingOrchestrationDoc,
} from './listingOrchestrationApi';
import {
  loadOwnerOrchestrationMatrix,
  saveOwnerGestion,
  saveOwnerOrchestrationRow,
  type OwnerOrchestrationDoc,
} from './ownerOrchestrationApi';
import { mergeLocalRowsAfterLoad, patchOrchestrationDocExecution, patchOrchestrationDocGestion, patchOrchestrationDocWhatsapp } from './mergeLocalRowsAfterLoad';
import { logV3Orch } from './v3OrchestrationDebugLog';

type ListingPick = { id: string; name: string };

type Props = {
  ownerKey: string;
  isAdminTemplate: boolean;
  listingId: string | null;
  listings: ListingPick[];
  onListingChange: (id: string) => void;
  listingCount?: number;
  /** Formulaire listing /listings/:id — pas de header ni sélecteur annonce. */
  embedded?: boolean;
  /** Modèle PM complet (owner_orchestrations) — même UI que listing. */
  ownerTemplateMode?: boolean;
};

export default function OrchestrationListingV3View({
  ownerKey,
  isAdminTemplate,
  listingId,
  listings,
  onListingChange,
  listingCount,
  embedded = false,
  ownerTemplateMode = false,
}: Props) {
  const [scope, setScope] = useState<V3ScopeMode>(ownerTemplateMode ? 'template' : 'listing');
  const [rows, setRows] = useState<CapabilityRowState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(CAPABILITY_REGISTRY[0]?.key ?? null);
  const [libraryActive, setLibraryActive] = useState(false);
  const [listingValues, setListingValues] = useState<Record<string, unknown>>({});
  const listingRef = useRef<Record<string, unknown>>({});
  const menuOptionsRef = useRef<unknown[]>([]);
  const workflowsRef = useRef<Workflow[]>([]);
  const [orchestrationDoc, setOrchestrationDoc] = useState<
    ListingOrchestrationDoc | OwnerOrchestrationDoc | null
  >(null);

  const isOwnerTemplate = ownerTemplateMode;
  const effectiveListingId = !isOwnerTemplate && scope === 'listing' ? listingId : null;

  const loadListingValues = useCallback(async () => {
    if (isOwnerTemplate) {
      try {
        const res = await listingsService.getListingOwnerConfigTemplate(ownerKey);
        const payload = (res as { data?: { listing?: Record<string, unknown> } })?.data ?? res;
        const vals = ((payload as { listing?: Record<string, unknown> })?.listing ?? {}) as Record<
          string,
          unknown
        >;
        listingRef.current = vals;
        setListingValues(vals);
      } catch {
        listingRef.current = {};
        setListingValues({});
      }
      return;
    }
    if (!effectiveListingId) {
      listingRef.current = {};
      setListingValues({});
      return;
    }
    try {
      const doc = await listingsService.getListingDocument(effectiveListingId);
      const vals = (doc ?? {}) as Record<string, unknown>;
      listingRef.current = vals;
      setListingValues(vals);
    } catch {
      listingRef.current = {};
      setListingValues({});
    }
  }, [effectiveListingId, isOwnerTemplate, ownerKey]);

  const load = useCallback(async (options?: { silent?: boolean; discardLocalKey?: string }) => {
    const silent = options?.silent === true;
    const discardLocalKey = options?.discardLocalKey;
    if (!isOwnerTemplate && scope === 'listing' && !effectiveListingId) {
      setRows([]);
      if (!silent) setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      if (isOwnerTemplate) {
        const loaded = await loadOwnerOrchestrationMatrix(ownerKey);
        setRows(prev => mergeLocalRowsAfterLoad(prev, loaded.rows, discardLocalKey));
        menuOptionsRef.current = loaded.menuOptions;
        workflowsRef.current = loaded.workflows;
        setOrchestrationDoc(loaded.doc);
        logV3Orch('load.owner', { discardLocalKey, rowCount: loaded.rows.length });
      } else if (scope === 'listing' && effectiveListingId) {
        const loaded = await loadListingOrchestrationMatrix(effectiveListingId);
        setRows(prev => mergeLocalRowsAfterLoad(prev, loaded.rows, discardLocalKey));
        menuOptionsRef.current = loaded.menuOptions;
        workflowsRef.current = loaded.workflows;
        setOrchestrationDoc(loaded.doc);
        logV3Orch('load.listing', { listingId: effectiveListingId, discardLocalKey });
      } else {
        setRows([]);
        setOrchestrationDoc(null);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Chargement impossible';
      if (msg.includes('orchestration') || msg.includes('404')) {
        toast.error(
          'Orchestration listing non migrée — lancer migrate-listing-orchestration.ts sur srv-listing',
        );
      } else {
        toast.error(msg);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [scope, ownerKey, effectiveListingId, isOwnerTemplate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadListingValues();
  }, [loadListingValues]);

  useEffect(() => {
    if (isOwnerTemplate || !effectiveListingId || !selectedKey) return;
    if (!isCapabilityVisibleOnListingRail(selectedKey)) {
      setSelectedKey(defaultListingRailCapabilityKey());
    }
  }, [isOwnerTemplate, effectiveListingId, selectedKey]);

  useEffect(() => {
    if (!isOwnerTemplate) {
      setLibraryActive(false);
    }
  }, [isOwnerTemplate, scope]);

  const selectedRow = useMemo(
    () => rows.find(r => r.key === selectedKey) ?? null,
    [rows, selectedKey],
  );
  const selectedDef = selectedKey ? getCapabilityDefinition(selectedKey) ?? null : null;

  const patchRow = (key: string, patch: Partial<CapabilityRowState>) => {
    setRows(prev =>
      prev.map(r => {
        if (r.key !== key) return r;
        const next = applyDependencyRules(r, { ...patch, inherited: false });
        logV3Orch('row.patch', {
          key,
          patch,
          next: {
            managed: next.managed,
            orchestrated: next.orchestrated,
            taskEnabled: next.taskEnabled,
            execution: next.execution,
          },
        });
        return next;
      }),
    );
  };

  const onWhatsappPatch = useCallback(
    (capabilityKey: string, menuCodes: string[], menuOptions: unknown[]) => {
      setOrchestrationDoc(prev =>
        prev ? patchOrchestrationDocWhatsapp(prev, capabilityKey, menuOptions, menuCodes) : prev,
      );
      logV3Orch('whatsapp.saved', { key: capabilityKey, codes: menuCodes });
    },
    [],
  );

  const onGestionPatch = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!orchestrationDoc || !selectedKey) return;
      const existing = orchestrationDoc.capabilities?.[selectedKey]?.gestion ?? {};
      if (isOwnerTemplate) {
        await saveOwnerGestion({
          ownerKey,
          capabilityKey: selectedKey,
          gestion: { ...existing, ...patch },
          doc: orchestrationDoc as OwnerOrchestrationDoc,
        });
      } else if (effectiveListingId) {
        await saveListingGestion({
          listingId: effectiveListingId,
          capabilityKey: selectedKey,
          gestion: { ...existing, ...patch },
          doc: orchestrationDoc as ListingOrchestrationDoc,
        });
      } else {
        return;
      }
      toast.success('Config gestion enregistrée');
      setOrchestrationDoc(prev =>
        prev ? patchOrchestrationDocGestion(prev, selectedKey, { ...existing, ...patch }) : prev,
      );
      logV3Orch('gestion.saved', { key: selectedKey, patchKeys: Object.keys(patch) });
    },
    [effectiveListingId, orchestrationDoc, selectedKey, isOwnerTemplate, ownerKey],
  );

  const persistRow = async (key: string) => {
    const row = rows.find(r => r.key === key);
    if (!row) return;
    const doc = orchestrationDoc;
    if (!doc) {
      toast.error('Document orchestration non chargé');
      return;
    }
    setSaving(true);
    try {
      if (isOwnerTemplate) {
        await saveOwnerOrchestrationRow({
          ownerKey,
          row,
          allMenuOptions: menuOptionsRef.current,
          allWorkflows: workflowsRef.current,
          doc: doc as OwnerOrchestrationDoc,
        });
        toast.success('Service enregistré (modèle PM)');
        await load({ silent: true, discardLocalKey: key });
      } else if (effectiveListingId) {
        await saveListingOrchestrationRow({
          listingId: effectiveListingId,
          row,
          allMenuOptions: menuOptionsRef.current,
          allWorkflows: workflowsRef.current,
          doc: doc as ListingOrchestrationDoc,
        });
        toast.success('Service enregistré (listing)');
        await load({ silent: true, discardLocalKey: key });
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (libraryActive) {
      toast.info('Bibliothèque messages — édition via orchestration-config');
      return;
    }
    if (selectedKey) void persistRow(selectedKey);
  };

  const showRail = Boolean((scope === 'listing' && effectiveListingId) || isOwnerTemplate);
  const showServicePanel =
    !libraryActive &&
    selectedDef &&
    selectedRow &&
    orchestrationDoc &&
    (isOwnerTemplate || (scope === 'listing' && effectiveListingId)) &&
    (isOwnerTemplate || isCapabilityVisibleOnListingRail(selectedKey ?? ''));

  if (loading) {
    return (
      <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: V3.p }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        bgcolor: V3.bg,
        flex: embedded ? 1 : undefined,
        minHeight: embedded ? 0 : undefined,
        height: embedded ? '100%' : `calc(100vh - 120px)`,
        maxHeight: embedded ? '100%' : undefined,
        mx: embedded ? 0 : -3,
        mt: embedded ? 0 : -1.5,
        borderRadius: embedded ? 2 : 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {!embedded && !ownerTemplateMode && (
        <V3Header
          scope={scope}
          onScopeChange={s => {
            setScope(s);
            setLibraryActive(false);
          }}
          listings={listings}
          listingId={listingId}
          onListingChange={onListingChange}
          listingCount={listingCount}
          saving={saving}
          onSave={handleSave}
        />
      )}

      {scope === 'listing' && !effectiveListingId && (
        <Alert severity="info" sx={{ m: 2 }}>
          Sélectionnez une annonce pour configurer l'orchestration par listing.
        </Alert>
      )}

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: `${V3.railWidth}px 1fr` },
          overflow: 'hidden',
        }}
      >
        {showRail && (
          <V3Rail
            rows={rows}
            selectedKey={selectedKey}
            libraryActive={libraryActive}
            ownerTemplateMode={isOwnerTemplate}
            onSelectService={key => {
              setSelectedKey(key);
              setLibraryActive(false);
            }}
            onSelectLibrary={() => {
              setLibraryActive(true);
            }}
          />
        )}

        <Box
          component="main"
          sx={{
            minHeight: 0,
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            width: '100%',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {!embedded && isOwnerTemplate && libraryActive && (
            <V3MessageLibrary ownerKey={ownerKey} />
          )}

          {showServicePanel && (
            <V3ServicePanel
              def={selectedDef!}
              row={selectedRow!}
              ownerKey={ownerKey}
              listingId={effectiveListingId ?? ''}
              orchestrationDoc={orchestrationDoc as ListingOrchestrationDoc}
              listingValues={listingValues}
              ownerTemplateMode={isOwnerTemplate}
              onGestionPatch={onGestionPatch}
              onRowChange={patch => selectedKey && patchRow(selectedKey, patch)}
              onPersist={() => selectedKey && void persistRow(selectedKey)}
              onReload={(discardKey?: string) =>
                void load({ silent: true, discardLocalKey: discardKey ?? selectedKey ?? undefined })
              }
              onExecutionDocPatch={execution => {
                if (!selectedKey || !orchestrationDoc) return;
                setOrchestrationDoc(prev =>
                  prev ? patchOrchestrationDocExecution(prev, selectedKey, execution) : prev,
                );
              }}
              onWhatsappPatch={onWhatsappPatch}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
