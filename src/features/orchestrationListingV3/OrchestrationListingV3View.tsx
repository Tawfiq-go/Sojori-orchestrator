import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import listingsService from '../../services/listingsService';
import type { Workflow } from '../taskHub/staff-design/types';
import { loadCapabilityMatrix, saveCapabilityRow } from '../serviceMatrix/capabilityMatrixApi';
import { CAPABILITY_REGISTRY, getCapabilityDefinition } from '../serviceMatrix/capabilityRegistry';
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
  type ListingOrchestrationDoc,
} from './listingOrchestrationApi';

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
};

export default function OrchestrationListingV3View({
  ownerKey,
  isAdminTemplate,
  listingId,
  listings,
  onListingChange,
  listingCount,
  embedded = false,
}: Props) {
  const [scope, setScope] = useState<V3ScopeMode>('listing');
  const [rows, setRows] = useState<CapabilityRowState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(CAPABILITY_REGISTRY[0]?.key ?? null);
  const [libraryActive, setLibraryActive] = useState(false);
  const [listingValues, setListingValues] = useState<Record<string, unknown>>({});
  const listingRef = useRef<Record<string, unknown>>({});
  const menuOptionsRef = useRef<unknown[]>([]);
  const workflowsRef = useRef<Workflow[]>([]);
  const [orchestrationDoc, setOrchestrationDoc] = useState<ListingOrchestrationDoc | null>(null);

  const effectiveListingId = scope === 'listing' ? listingId : null;

  const loadListingValues = useCallback(async () => {
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
  }, [effectiveListingId]);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (scope === 'listing' && !effectiveListingId) {
      setRows([]);
      if (!silent) setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      if (scope === 'listing' && effectiveListingId) {
        const loaded = await loadListingOrchestrationMatrix(effectiveListingId);
        setRows(loaded.rows);
        menuOptionsRef.current = loaded.menuOptions;
        workflowsRef.current = loaded.workflows;
        setOrchestrationDoc(loaded.doc);
      } else {
        const next = await loadCapabilityMatrix({
          scope: 'owner',
          ownerKey,
        });
        setRows(next);
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
  }, [scope, ownerKey, effectiveListingId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadListingValues();
  }, [loadListingValues]);

  useEffect(() => {
    if (scope === 'template') {
      setLibraryActive(true);
    }
  }, [scope]);

  const selectedRow = useMemo(
    () => rows.find(r => r.key === selectedKey) ?? null,
    [rows, selectedKey],
  );
  const selectedDef = selectedKey ? getCapabilityDefinition(selectedKey) ?? null : null;

  const patchRow = (key: string, patch: Partial<CapabilityRowState>) => {
    setRows(prev =>
      prev.map(r => (r.key === key ? applyDependencyRules(r, { ...patch, inherited: false }) : r)),
    );
  };

  const onGestionPatch = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!effectiveListingId || !orchestrationDoc || !selectedKey) return;
      const existing = orchestrationDoc.capabilities?.[selectedKey]?.gestion ?? {};
      await saveListingGestion({
        listingId: effectiveListingId,
        capabilityKey: selectedKey,
        gestion: { ...existing, ...patch },
        doc: orchestrationDoc,
      });
      toast.success('Config gestion enregistrée');
      await load({ silent: true });
    },
    [effectiveListingId, orchestrationDoc, selectedKey, load],
  );

  const persistRow = async (key: string) => {
    const row = rows.find(r => r.key === key);
    if (!row || !effectiveListingId) return;
    const doc = orchestrationDoc;
    if (!doc) {
      toast.error('Document orchestration non chargé');
      return;
    }
    setSaving(true);
    try {
      const result = await saveCapabilityRow({
        scope: 'listing',
        ownerKey,
        listingId: effectiveListingId,
        row,
        allMenuOptions: menuOptionsRef.current,
        allWorkflows: workflowsRef.current,
        listingOrchestrationDoc: doc,
      });
      if (result.listingOk && result.fulltaskOk) {
        toast.success('Service enregistré (listing)');
        await load({ silent: true });
      } else {
        toast.error(result.error ?? 'Erreur enregistrement');
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (libraryActive || scope === 'template') {
      toast.info('Bibliothèque messages — édition via orchestration-config');
      return;
    }
    if (selectedKey) void persistRow(selectedKey);
  };

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
      {!embedded && (
        <V3Header
          scope={scope}
          onScopeChange={s => {
            setScope(s);
            if (s === 'template') setLibraryActive(true);
            else setLibraryActive(false);
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
        {scope === 'listing' && effectiveListingId && (
          <V3Rail
            rows={rows}
            selectedKey={selectedKey}
            libraryActive={libraryActive}
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
          {!embedded && (libraryActive || scope === 'template') && (
            <V3MessageLibrary ownerKey={ownerKey} />
          )}

          {!libraryActive && scope === 'listing' && selectedDef && selectedRow && effectiveListingId && orchestrationDoc && (
            <V3ServicePanel
              def={selectedDef}
              row={selectedRow}
              ownerKey={ownerKey}
              listingId={effectiveListingId}
              orchestrationDoc={orchestrationDoc}
              listingValues={listingValues}
              onGestionPatch={onGestionPatch}
              onRowChange={patch => selectedKey && patchRow(selectedKey, patch)}
              onPersist={() => selectedKey && void persistRow(selectedKey)}
              onReload={() => void load({ silent: true })}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
