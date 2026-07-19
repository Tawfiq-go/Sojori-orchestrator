import { arrayMove } from '@dnd-kit/sortable';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../components/DashboardWrapper';
import OrchestrationPageView, {
  type OrchestrationSubTab,
} from '../features/taskHub/staff-design/OrchestrationPageView';
import OrchestrationOwnerScopeTabs, {
  type OwnerConfigTabStatus,
} from '../features/taskHub/staff-design/OrchestrationOwnerScopeTabs';
import type { CatalogMessage } from '../features/taskHub/staff-design/types';
import * as fulltaskApi from '../services/fulltaskApi';
import { mergeCatalogWithClaudeDefaults } from '../features/taskHub/staff-design/defaultMessageCatalog';
import { apiOrchestrationToDesign } from '../utils/fulltaskMappers';
import { unwrapFulltaskData } from '../utils/unwrapFulltaskResponse';
import AdminOwnerScopeLayout from '../components/AdminOwnerScopeLayout/AdminOwnerScopeLayout';
import OwnerConfigScopeBarWithSync from '../features/taskHub/components/OwnerConfigScopeBarWithSync';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import { useFulltaskConfigOwner } from '../hooks/useFulltaskConfigOwner';
import { useAuth } from '../hooks/useAuth';
import { ORCHESTRATION_ADMIN_OWNER_ID, isOrchestrationAdminOwnerRow } from '../constants/orchestrationAdmin';
import type { OrchestrationConfigLoadMeta } from '../services/fulltaskApi';
import { getOwnerListLabel } from '../utils/ownerDisplay.utils';
import { isPlatformAdminRole, normalizeUserRole } from '../utils/taskScope.utils';

function newCatalogId(): string {
  return `msg_${Date.now()}`;
}

function parseOrchestrationSubTab(raw: string | null): OrchestrationSubTab {
  if (raw === 'config' || raw === 'whatsapp') return 'config';
  if (raw === 'workflows') return 'messages';
  return raw === 'messages' ? 'messages' : 'messages';
}

function TasksOrchestrationFulltaskPageInner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const subTab = parseOrchestrationSubTab(searchParams.get('tab'));
  const showWhatsAppConfigTab = useMemo(
    () => isPlatformAdminRole(normalizeUserRole(user?.role)),
    [user?.role],
  );

  useEffect(() => {
    if (!showWhatsAppConfigTab && subTab === 'config') {
      const next = new URLSearchParams(searchParams);
      next.delete('tab');
      setSearchParams(next, { replace: true });
    }
  }, [showWhatsAppConfigTab, subTab, searchParams, setSearchParams]);

  const ownerScope = useFulltaskConfigOwner();
  const { ownerKey, ownerDisplayName, ownerKeyDetail, isAdminTemplate, hideOwnerScopeLabels } =
    ownerScope;
  const { owners } = useAdminOwnerFilter();

  const pmOwners = useMemo(
    () =>
      (owners || []).filter((o) => {
        const id = o?._id ?? o?.id;
        if (id == null) return false;
        return !isOrchestrationAdminOwnerRow(o);
      }),
    [owners],
  );

  const adminScopeTab = isAdminTemplate ? searchParams.get('ownerScope') || 'global' : ownerKey;

  const effectiveOwnerKey = useMemo(() => {
    if (isAdminTemplate) {
      return adminScopeTab === 'global' ? 'global' : adminScopeTab;
    }
    return ownerKey;
  }, [isAdminTemplate, adminScopeTab, ownerKey]);

  const effectiveDisplayName = useMemo(() => {
    if (isAdminTemplate && adminScopeTab !== 'global') {
      const row = pmOwners.find((o) => String(o._id ?? o.id) === adminScopeTab);
      return getOwnerListLabel(row) || adminScopeTab;
    }
    return ownerDisplayName;
  }, [isAdminTemplate, adminScopeTab, pmOwners, ownerDisplayName]);

  const effectiveKeyDetail = useMemo(() => {
    if (isAdminTemplate && adminScopeTab === 'global') {
      return ownerKeyDetail;
    }
    if (isAdminTemplate && adminScopeTab !== 'global') {
      return `${adminScopeTab} · onglet PM (mode Admin)`;
    }
    return ownerKeyDetail;
  }, [isAdminTemplate, adminScopeTab, ownerKeyDetail]);

  const syncContextOwnerId = isAdminTemplate
    ? adminScopeTab === 'global'
      ? ORCHESTRATION_ADMIN_OWNER_ID
      : adminScopeTab
    : ownerKey;

  const setAdminScopeTab = useCallback(
    (scope: string) => {
      const next = new URLSearchParams(searchParams);
      if (scope === 'global') next.delete('ownerScope');
      else next.set('ownerScope', scope);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const [catalog, setCatalog] = useState<CatalogMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadState, setLoadState] = useState<'ok' | 'empty' | 'error'>('ok');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [configSource, setConfigSource] = useState<OrchestrationConfigLoadMeta['configSource']>(null);
  const [ownerConfigStatus, setOwnerConfigStatus] = useState<Record<string, OwnerConfigTabStatus>>({});
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const applyDocToState = useCallback((doc: Record<string, unknown> | null) => {
    if (!doc) return;
    const mapped = apiOrchestrationToDesign(doc);
    setCatalog(mergeCatalogWithClaudeDefaults(mapped.catalog as CatalogMessage[]));
  }, []);

  const load = useCallback(
    async (options?: { background?: boolean }) => {
      const background = options?.background === true;
      if (!background) setLoading(true);
      try {
        // Héritage template global (comme modèle orchestration / messages planifiés).
        const raw = await fulltaskApi.getOrchestrationConfig(effectiveOwnerKey);
        const meta = (raw as { meta?: OrchestrationConfigLoadMeta })?.meta;
        setConfigSource(meta?.configSource ?? null);
        const doc = unwrapFulltaskData<Record<string, unknown>>(raw);
        if (!doc) {
          if (!background) {
            setCatalog(mergeCatalogWithClaudeDefaults([]));
            setLoadState('empty');
            setLoadError(null);
            setConfigSource(meta?.configSource ?? 'global_template');
          }
        } else {
          const catN = (doc.messageCatalog as unknown[] | undefined)?.length ?? 0;
          applyDocToState(doc);
          setLoadState(catN === 0 ? 'empty' : 'ok');
          setLoadError(null);
        }
      } catch (e: unknown) {
        const err = e as {
          response?: { status?: number; data?: { error?: string } };
          message?: string;
        };
        console.error('[orch-config] GET failed', {
          status: err.response?.status,
          error: err.response?.data?.error || err.message,
        });
        if (!background) {
          setCatalog([]);
          setLoadState('error');
          if (err.response?.status === 401) {
            setLoadError(
              'Connexion refusée (401) — reconnectez-vous. La config n’a pas été chargée (ce n’est pas un vidage MongoDB).',
            );
          } else if (err.response?.status === 404) {
            setLoadError(null);
            setLoadState('empty');
            setConfigSource('global_template');
            setCatalog(mergeCatalogWithClaudeDefaults([]));
          } else {
            setLoadError(
              err.response?.data?.error ||
                err.message ||
                'Erreur réseau — impossible de charger orchestration_configs.',
            );
          }
        }
      } finally {
        if (!background) setLoading(false);
      }
    },
    [effectiveOwnerKey, applyDocToState],
  );

  const refreshOwnerConfigStatus = useCallback(async () => {
    if (!isAdminTemplate || pmOwners.length === 0) return;
    const loadingMap = Object.fromEntries(
      pmOwners.map((o) => [String(o._id ?? o.id), 'loading' as OwnerConfigTabStatus]),
    );
    setOwnerConfigStatus(loadingMap);
    const entries = await Promise.all(
      pmOwners.map(async (o) => {
        const id = String(o._id ?? o.id);
        try {
          const raw = await fulltaskApi.getOrchestrationConfig(id, { strictOwner: true });
          const meta = (raw as { meta?: OrchestrationConfigLoadMeta })?.meta;
          const doc = unwrapFulltaskData<Record<string, unknown>>(raw);
          const hasOwn =
            meta?.configSource === 'owner' ||
            Boolean((doc?.messageCatalog as unknown[] | undefined)?.length);
          return [id, hasOwn ? ('owner' as const) : ('empty' as const)] as const;
        } catch {
          return [id, 'empty' as const] as const;
        }
      }),
    );
    setOwnerConfigStatus(Object.fromEntries(entries));
  }, [isAdminTemplate, pmOwners]);

  useEffect(() => {
    void load();
  }, [load, effectiveOwnerKey]);

  useEffect(() => {
    void refreshOwnerConfigStatus();
  }, [refreshOwnerConfigStatus]);

  useEffect(() => {
    if (!isAdminTemplate) {
      const next = new URLSearchParams(searchParams);
      if (next.has('ownerScope')) {
        next.delete('ownerScope');
        setSearchParams(next, { replace: true });
      }
    }
  }, [isAdminTemplate, searchParams, setSearchParams]);

  useEffect(() => {
    if (!isAdminTemplate || adminScopeTab === 'global') return;
    const valid = pmOwners.some((o) => String(o._id ?? o.id) === adminScopeTab);
    if (!valid && pmOwners.length > 0) {
      setAdminScopeTab('global');
    }
  }, [isAdminTemplate, adminScopeTab, pmOwners, setAdminScopeTab]);

  const persist = async () => {
    if (catalog.length === 0) {
      toast.error(
        'Catalogue vide : utilisez "Charger le seed complet" ou ajoutez un message avant d\'enregistrer.',
      );
      return;
    }
    setSaving(true);
    try {
      const raw = await fulltaskApi.upsertOrchestrationConfig(effectiveOwnerKey, {
        messageCatalog: catalog.map((c) => ({
          id: String(c.id || c.whatsappTemplateId || `msg-${Date.now()}`),
          label: String(c.label || ''),
          whatsappTemplateId: String(c.whatsappTemplateId || c.id || ''),
          ...(c.flowCategory ? { flowCategory: String(c.flowCategory) } : {}),
          messageFrOta: String(c.messageFrOta || ''),
          messageFrEmail: String(c.messageFrEmail || ''),
        })),
      });
      const saved = unwrapFulltaskData<Record<string, unknown>>(raw);
      if (saved) {
        applyDocToState(saved);
        setLoadState('ok');
      } else {
        await load({ background: true });
      }
      toast.success('Catalogue messages enregistré', { autoClose: 2000 });
      if (effectiveOwnerKey !== 'global') {
        await refreshOwnerConfigStatus();
      }
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } }; message?: string };
      if (err.response?.status === 401) {
        toast.error('Session expirée ou non connecté — reconnectez-vous puis réessayez Enregistrer.');
      } else {
        toast.error(err.response?.data?.error || err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSyncToOwner = async (targetOwnerId: string, targetOwnerName: string) => {
    try {
      await fulltaskApi.copyOrchestrationConfigToOwner(
        ORCHESTRATION_ADMIN_OWNER_ID,
        targetOwnerId,
      );
      toast.success(`Orchestration synchronisée vers ${targetOwnerName}`);
      await load();
      await refreshOwnerConfigStatus();
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || err.message || 'Erreur synchronisation');
    }
  };

  const handleSyncToAllOwners = async () => {
    try {
      await fulltaskApi.copyOrchestrationConfigToAllOwners(ORCHESTRATION_ADMIN_OWNER_ID);
      toast.success('Orchestration synchronisée vers tous les PMs');
      await load();
      await refreshOwnerConfigStatus();
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || err.message || 'Erreur synchronisation');
    }
  };

  const scopeBar = (
    <OwnerConfigScopeBarWithSync
      {...ownerScope}
      compact
      syncContextOwnerId={syncContextOwnerId}
      onSyncToOwner={handleSyncToOwner}
      onSyncToAllOwners={handleSyncToAllOwners}
    />
  );

  if (loading) {
    return (
      <DashboardWrapper breadcrumb={['Tâches', 'Orchestration', 'Config']}>
        {scopeBar}
        {isAdminTemplate ? (
          <OrchestrationOwnerScopeTabs
            activeScope={adminScopeTab}
            onChange={setAdminScopeTab}
            ownerConfigStatus={ownerConfigStatus}
          />
        ) : null}
        <p style={{ padding: 24 }}>Chargement…</p>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper breadcrumb={['Tâches', 'Orchestration', 'Config']}>
      {scopeBar}
      {isAdminTemplate ? (
        <OrchestrationOwnerScopeTabs
          activeScope={adminScopeTab}
          onChange={setAdminScopeTab}
          ownerConfigStatus={ownerConfigStatus}
        />
      ) : null}
      {isAdminTemplate &&
      adminScopeTab !== 'global' &&
      configSource === 'global_template' &&
      loadState === 'ok' &&
      !loadError ? (
        <div
          className="orch-load-banner"
          style={{
            margin: '0 0 16px',
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(6,115,179,0.08)',
            border: '1px solid rgba(6,115,179,0.22)',
            fontSize: 13,
          }}
        >
          {effectiveDisplayName} hérite du template Admin (aperçu).{' '}
          <strong>Synchroniser PM {effectiveDisplayName}</strong> pour copier la config, ou{' '}
          <strong>Enregistrer</strong> après modification pour créer un catalogue propre au PM.
        </div>
      ) : null}
      {!isAdminTemplate &&
      configSource === 'global_template' &&
      effectiveOwnerKey !== 'global' &&
      loadState === 'ok' &&
      !loadError ? (
        <div
          className="orch-load-banner"
          style={{
            margin: '0 0 16px',
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(6,115,179,0.08)',
            border: '1px solid rgba(6,115,179,0.22)',
            fontSize: 13,
          }}
        >
          Catalogue hérité du template Admin (lecture). <strong>Enregistrer</strong> crée votre
          catalogue PM ; contactez l&apos;admin pour une sync complète depuis le template.
        </div>
      ) : null}
      {!isAdminTemplate && loadState === 'empty' && !loadError ? (
        <div
          className="orch-load-banner"
          style={{
            margin: '0 0 16px',
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(6,115,179,0.08)',
            border: '1px solid rgba(6,115,179,0.22)',
            fontSize: 13,
          }}
        >
          {hideOwnerScopeLabels ? (
            <>
              Votre catalogue messages est vide. Chargez le seed puis enregistrez.
            </>
          ) : (
            <>
              Ce PM n&apos;a pas encore de catalogue messages. Utilisez{' '}
              <strong>Synchroniser PM {ownerDisplayName}</strong> pour copier le template Admin, ou
              chargez le seed puis enregistrez.
            </>
          )}
        </div>
      ) : null}
      {configSource === 'owner' && effectiveOwnerKey !== 'global' && !hideOwnerScopeLabels ? (
        <div
          style={{
            margin: '0 0 12px',
            padding: '8px 14px',
            borderRadius: 8,
            background: 'rgba(10,143,94,0.08)',
            border: '1px solid rgba(10,143,94,0.2)',
            fontSize: 12,
            color: '#0a5c40',
          }}
        >
          Catalogue propre du PM · vous modifiez uniquement <strong>{effectiveDisplayName}</strong>
        </div>
      ) : null}
      {loadError ? (
        <div
          className="orch-load-banner orch-load-banner--error"
          style={{
            margin: '0 0 16px',
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(200,30,30,0.08)',
            border: '1px solid rgba(200,30,30,0.25)',
            fontSize: 13,
          }}
        >
          {loadError}
        </div>
      ) : null}
      <OrchestrationPageView
        hideOwnerScope={hideOwnerScopeLabels}
        showWhatsAppConfigTab={showWhatsAppConfigTab}
        ownerDisplayName={hideOwnerScopeLabels ? undefined : effectiveDisplayName}
        ownerKeyDetail={hideOwnerScopeLabels ? undefined : effectiveKeyDetail}
        initialSubTab={subTab}
        loadState={loadState}
        onSubTabChange={(tab) => {
          const next = new URLSearchParams(searchParams);
          if (tab === 'messages') next.delete('tab');
          else next.set('tab', tab);
          setSearchParams(next, { replace: true });
        }}
        catalog={catalog}
        saving={saving}
        onSave={() => void persist()}
        seedingDefaults={seeding}
        onSeedDefaultsVisible={loadState === 'empty' && !loadError}
        onSeedDefaults={() => {
          void (async () => {
            const isEmpty = catalog.length === 0;
            if (!isEmpty) {
              if (
                !window.confirm(
                  'Réinitialiser le catalogue messages (seed admin) ? Les workflows listing ne sont pas affectés.',
                )
              ) {
                return;
              }
            }
            setSeeding(true);
            try {
              await fulltaskApi.seedOrchestrationComplete(!isEmpty);
              toast.success('Seed chargé : catalogue messages + templates WhatsApp');
              await load({ background: true });
            } catch (e: unknown) {
              const err = e as {
                response?: { status?: number; data?: { error?: string } };
                message?: string;
              };
              toast.error(err.response?.data?.error || err.message);
            } finally {
              setSeeding(false);
            }
          })();
        }}
        onUpdateCatalogEntry={(id, patch) =>
          setCatalog((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
        }
        onAddCatalogEntry={() => {
          const id = newCatalogId();
          setCatalog((prev) => [
            ...prev,
            {
              id,
              label: 'Nouveau message',
              whatsappTemplateId: '',
              messageFrOta: '',
              messageFrEmail: '',
            },
          ]);
          return id;
        }}
        onDeleteCatalogEntry={(id) => setCatalog((prev) => prev.filter((c) => c.id !== id))}
        onReorderCatalog={(oldIndex, newIndex) =>
          setCatalog((prev) => arrayMove(prev, oldIndex, newIndex))
        }
      />
    </DashboardWrapper>
  );
}

export default function TasksOrchestrationFulltaskPage() {
  return (
    <AdminOwnerScopeLayout showTopBar={false}>
      <TasksOrchestrationFulltaskPageInner />
    </AdminOwnerScopeLayout>
  );
}
