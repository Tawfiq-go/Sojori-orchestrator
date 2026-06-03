import { arrayMove } from '@dnd-kit/sortable';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../components/DashboardWrapper';
import OrchestrationPageView, {
  type OrchestrationSubTab,
} from '../features/taskHub/staff-design/OrchestrationPageView';
import { emptyWorkflowPlan, type FulltaskTaskTypeId } from '../features/taskHub/staff-design/fulltaskTaskTypes';
import { defaultStaffReminderMessageId } from '../features/taskHub/staff-design/staffReminderTemplates';
import type {
  CatalogMessage,
  ScheduledOrchestrationMessage,
  Workflow,
} from '../features/taskHub/staff-design/types';
import * as fulltaskApi from '../services/fulltaskApi';
import { mergeCatalogWithClaudeDefaults } from '../features/taskHub/staff-design/defaultMessageCatalog';
import {
  applyListOrderToState,
  defaultOrchestrationListOrder,
  reconcileOrchestrationListOrder,
  schedListKey,
  wfListKey,
  type OrchListKey,
} from '../features/taskHub/staff-design/orchestrationListOrder';
import {
  apiOrchestrationToDesign,
  designOrchestrationToApi,
  RELANCE_MESSAGE_BY_TASK_TYPE,
} from '../utils/fulltaskMappers';
import { unwrapFulltaskData } from '../utils/unwrapFulltaskResponse';
import AdminOwnerScopeLayout from '../components/AdminOwnerScopeLayout/AdminOwnerScopeLayout';
import OwnerConfigScopeBarWithSync from '../features/taskHub/components/OwnerConfigScopeBarWithSync';
import { useFulltaskConfigOwner } from '../hooks/useFulltaskConfigOwner';
import { ORCHESTRATION_ADMIN_OWNER_ID } from '../constants/orchestrationAdmin';

function newCatalogId(): string {
  return `msg_${Date.now()}`;
}

function parseOrchestrationSubTab(raw: string | null): OrchestrationSubTab {
  if (raw === 'messages' || raw === 'config' || raw === 'whatsapp') return raw === 'whatsapp' ? 'config' : raw;
  return 'workflows';
}

function TasksOrchestrationFulltaskPageInner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const subTab = parseOrchestrationSubTab(searchParams.get('tab'));

  const ownerScope = useFulltaskConfigOwner();
  const { ownerKey, ownerDisplayName, ownerKeyDetail, isAdminTemplate, showOwnerPicker } = ownerScope;

  console.log('[TasksOrchestrationFulltaskPageInner] RENDER - ownerKey:', ownerKey);

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [catalog, setCatalog] = useState<CatalogMessage[]>([]);
  const [scheduledRules, setScheduledRules] = useState<ScheduledOrchestrationMessage[]>([]);
  const [listOrder, setListOrder] = useState<OrchListKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadState, setLoadState] = useState<'ok' | 'empty' | 'error'>('ok');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const applyDocToState = useCallback((doc: Record<string, unknown> | null) => {
    if (!doc) return;
    const mapped = apiOrchestrationToDesign(doc);
    const wf = mapped.workflows as Workflow[];
    const sched = mapped.scheduledRules as ScheduledOrchestrationMessage[];
    const savedOrder = (mapped.listOrder as OrchListKey[] | undefined) ?? [];
    setWorkflows(wf);
    setCatalog(mergeCatalogWithClaudeDefaults(mapped.catalog as CatalogMessage[]));
    setScheduledRules(sched);
    const order =
      savedOrder.length > 0
        ? reconcileOrchestrationListOrder(savedOrder, sched, wf)
        : defaultOrchestrationListOrder(sched, wf);
    setListOrder(order);
  }, []);

  const load = useCallback(
    async (options?: { background?: boolean }) => {
      const background = options?.background === true;
      if (!background) setLoading(true);
      try {
        const raw = await fulltaskApi.getOrchestrationConfig(ownerKey);
        const doc = unwrapFulltaskData<Record<string, unknown>>(raw);
        if (!doc) {
          if (!background) {
            setWorkflows([]);
            setCatalog([]);
            setScheduledRules([]);
            setListOrder([]);
            setLoadState('empty');
            setLoadError(null);
          }
        } else {
          const wfN = (doc.workflows as unknown[] | undefined)?.length ?? 0;
          const catN = (doc.messageCatalog as unknown[] | undefined)?.length ?? 0;
          const schedN = (doc.scheduledMessages as unknown[] | undefined)?.length ?? 0;
          applyDocToState(doc);
          setLoadState(wfN === 0 && catN === 0 && schedN === 0 ? 'empty' : 'ok');
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
          setWorkflows([]);
          setCatalog([]);
          setScheduledRules([]);
          setListOrder([]);
          setLoadState('error');
          if (err.response?.status === 401) {
            setLoadError(
              'Connexion refusée (401) — reconnectez-vous. La config n’a pas été chargée (ce n’est pas un vidage MongoDB).',
            );
          } else if (err.response?.status === 404) {
            setLoadError(null);
            setLoadState('empty');
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
    [ownerKey, applyDocToState],
  );

  useEffect(() => {
    console.log('[TasksOrchestrationFulltaskPageInner] useEffect triggered - ownerKey:', ownerKey);
    void load();
  }, [load, ownerKey]);

  const persist = async () => {
    if (workflows.length === 0 && scheduledRules.length === 0) {
      toast.error(
        'Config vide : utilisez "Charger le seed complet". N\'enregistrez pas un état vide (cela effacerait MongoDB).',
      );
      return;
    }
    setSaving(true);
    try {
      const ordered = applyListOrderToState(listOrder, scheduledRules, workflows);
      const body = designOrchestrationToApi(
        ordered.workflows as Record<string, unknown>[],
        catalog as Record<string, unknown>[],
        ordered.scheduledRules as Record<string, unknown>[],
        listOrder,
      );
      const raw = await fulltaskApi.upsertOrchestrationConfig(ownerKey, body);
      const saved = unwrapFulltaskData<Record<string, unknown>>(raw);
      const savedWf = (saved?.workflows as unknown[] | undefined)?.length ?? 0;
      if (saved && !(savedWf === 0 && workflows.length > 0)) {
        applyDocToState(saved);
        setLoadState('ok');
      } else {
        await load({ background: true });
      }
      toast.success('Enregistré', { autoClose: 2000 });
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
      // Copy API : 'global' ou ID admin legacy → template (ownerId null). Les deux sont acceptés.
      await fulltaskApi.copyOrchestrationConfigToOwner(
        ORCHESTRATION_ADMIN_OWNER_ID,
        targetOwnerId,
      );
      toast.success(`Orchestration synchronisée vers ${targetOwnerName}`);
      await load();
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
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || err.message || 'Erreur synchronisation');
    }
  };

  if (loading) {
    return (
      <DashboardWrapper breadcrumb={['Tâches', 'Orchestration', 'Config']}>
        <p style={{ padding: 24 }}>Chargement…</p>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper breadcrumb={['Tâches', 'Orchestration', 'Config']}>
      <OwnerConfigScopeBarWithSync
        {...ownerScope}
        compact
        onSyncToOwner={handleSyncToOwner}
        onSyncToAllOwners={handleSyncToAllOwners}
      />
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
        ownerDisplayName={ownerDisplayName}
        ownerKeyDetail={ownerKeyDetail}
        initialSubTab={subTab}
        loadState={loadState}
        onSubTabChange={(tab) => {
          const next = new URLSearchParams(searchParams);
          if (tab === 'workflows') next.delete('tab');
          else next.set('tab', tab);
          setSearchParams(next, { replace: true });
        }}
        workflows={workflows}
        catalog={catalog}
        scheduledRules={scheduledRules}
        listOrder={listOrder}
        saving={saving}
        onSave={() => void persist()}
        seedingDefaults={seeding}
        onSeedDefaults={() => {
                void (async () => {
                  const isEmpty =
                    workflows.length === 0 &&
                    catalog.length === 0 &&
                    scheduledRules.length === 0;
                  if (!isEmpty) {
                    if (
                      !window.confirm(
                        'Réinitialiser toute la config orchestration (workflows + messages + ordre) ? Action destructive.',
                      )
                    ) {
                      return;
                    }
                  }
                  setSeeding(true);
                  try {
                    await fulltaskApi.seedOrchestrationComplete(!isEmpty);
                    toast.success(
                      'Seed chargé : 12 workflows, messages catalogue/plan + templates WhatsApp',
                    );
                    await load({ background: true });
                  } catch (e: unknown) {
                    const err = e as {
                      response?: { status?: number; data?: { error?: string } };
                      message?: string;
                    };
                    console.error('[orch-config] seed-complete failed', {
                      status: err.response?.status,
                      error: err.response?.data?.error || err.message,
                    });
                    toast.error(err.response?.data?.error || err.message);
                  } finally {
                    setSeeding(false);
                  }
                })();
              }}
        onSeedDefaultsVisible={loadState === 'empty' && !loadError}
        onUpdateWorkflow={(id, patch) =>
          setWorkflows((prev) => prev.map((w) => (w._id === id ? { ...w, ...patch } : w)))
        }
        onUpdateCatalogEntry={(id, patch) =>
          setCatalog((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
        }
        onUpdateScheduledRule={(id, patch) =>
          setScheduledRules((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)))
        }
        onAddRelance={(workflowId) =>
          setWorkflows((prev) =>
            prev.map((w) => {
              if (w._id !== workflowId) return w;
              const taskTypeId = w.taskTypeId || w.triggerTaskType || '';
              const defaultMsg =
                RELANCE_MESSAGE_BY_TASK_TYPE[taskTypeId] ||
                catalog.find((c) => c.id.startsWith('msg_relance_'))?.id ||
                '';
              return {
                ...w,
                relances: [
                  ...w.relances,
                  {
                    id: `rel-${Date.now()}`,
                    channel: 'whatsapp',
                    deliveryChannel: 'whatsapp',
                    reference: 'check_in',
                    delay: { value: -1, unit: 'days' },
                    time: '09:00',
                    catalogMessageId: defaultMsg,
                    enabled: true,
                  },
                ],
              };
            }),
          )
        }
        onDeleteRelance={(workflowId, relanceId) =>
          setWorkflows((prev) =>
            prev.map((w) =>
              w._id === workflowId
                ? { ...w, relances: w.relances.filter((r) => r.id !== relanceId) }
                : w,
            ),
          )
        }
        onAddStaffReminder={(workflowId) =>
          setWorkflows((prev) =>
            prev.map((w) => {
              if (w._id !== workflowId) return w;
              const taskTypeId = w.taskTypeId || w.triggerTaskType || '';
              return {
                ...w,
                staffReminders: [
                  ...(w.staffReminders ?? []),
                  {
                    id: `staff-${Date.now()}`,
                    label: `Rappel ${(w.staffReminders ?? []).length + 1}`,
                    reference: 'previous_step_done',
                    delay: { value: -2, unit: 'hours' },
                    time: '09:00',
                    enabled: true,
                    staffTemplateId: defaultStaffReminderMessageId(taskTypeId),
                  },
                ],
              };
            }),
          )
        }
        onDeleteStaffReminder={(workflowId, reminderId) =>
          setWorkflows((prev) =>
            prev.map((w) =>
              w._id === workflowId
                ? {
                    ...w,
                    staffReminders: (w.staffReminders ?? []).filter((r) => r.id !== reminderId),
                  }
                : w,
            ),
          )
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
        onAddScheduledRule={(newId) => {
          const firstResa = catalog.find((c) => !c.id.startsWith('msg_relance_'));
          setScheduledRules((prev) => [
            ...prev,
            {
              _id: newId,
              label: 'Nouvel envoi',
              enabled: true,
              catalogMessageId: firstResa?.id || '',
              trigger: {
                reference: 'reservation_date',
                delay: { value: 1, unit: 'hours' },
                time: '10:00',
              },
              deliveryChannel: 'ota',
            },
          ]);
          setListOrder((prev) => [...prev, schedListKey(newId)]);
        }}
        onDeleteScheduledRule={(id) => {
          setScheduledRules((prev) => prev.filter((r) => r._id !== id));
          setListOrder((prev) => prev.filter((k) => k !== schedListKey(id)));
        }}
        onAddWorkflow={(taskTypeId: FulltaskTaskTypeId) => {
          const plan = emptyWorkflowPlan(taskTypeId) as Workflow;
          setWorkflows((prev) => [...prev, plan]);
          setListOrder((prev) => [...prev, wfListKey(plan._id)]);
          return plan._id;
        }}
        onDeleteWorkflow={(workflowId) => {
          setWorkflows((prev) => prev.filter((w) => w._id !== workflowId));
          setListOrder((prev) => prev.filter((k) => k !== wfListKey(workflowId)));
        }}
        onReorderList={(oldIndex, newIndex) =>
          setListOrder((prev) => arrayMove(prev, oldIndex, newIndex))
        }
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
