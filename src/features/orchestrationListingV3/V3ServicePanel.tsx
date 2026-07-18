import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import {
  CapabilityGestionPanel,
  CapabilityWhatsAppPanel,
} from '../serviceMatrix/CapabilityMatrixConfigPanels';
import CapabilityExecutionPanel from '../serviceMatrix/CapabilityExecutionPanel';
import type { CapabilityDefinition } from '../serviceMatrix/capabilityRegistry';
import { capabilityShortHint, isOnDemandCapability } from '../serviceMatrix/capabilityRegistry';
import type { CapabilityExecutionState, CapabilityRowState } from '../serviceMatrix/types';
import type { ListingOrchestrationDoc } from './listingOrchestrationApi';
import type { OwnerOrchestrationDoc } from './ownerOrchestrationApi';
import { saveListingGestion } from './listingOrchestrationApi';
import { saveOwnerGestion } from './ownerOrchestrationApi';
import V3CleaningIncludedPanel from './V3CleaningIncludedPanel';
import V3TaskBehaviorPanel from './V3TaskBehaviorPanel';
import { V3 } from './theme';
import { V3Badge, V3DecisionPill } from './V3Primitives';
import { logV3Orch } from './v3OrchestrationDebugLog';

type Props = {
  def: CapabilityDefinition;
  row: CapabilityRowState;
  ownerKey: string;
  listingId: string;
  orchestrationDoc: ListingOrchestrationDoc | OwnerOrchestrationDoc;
  listingValues: Record<string, unknown>;
  ownerTemplateMode?: boolean;
  /** Listing activation gate. true = all decision pills editable; false = read-only; undefined = owner managed chain. */
  serviceEffectivelyEnabled?: boolean;
  onGestionPatch: (patch: Record<string, unknown>) => Promise<void>;
  onRowChange: (patch: Partial<CapabilityRowState>) => void;
  onPersist: () => void | Promise<void>;
  onReload: (discardLocalKey?: string) => void;
  onExecutionDocPatch?: (execution: Record<string, unknown>) => void;
  onWhatsappPatch?: (capabilityKey: string, menuCodes: string[], menuOptions: unknown[]) => void;
};

type PanelId = 'gestion' | 'wa' | 'task' | 'exec';

const PANEL_META: Record<
  PanelId,
  { field: keyof CapabilityRowState; kind: 'manage' | 'client' | 'task' | 'orch'; icon: string; label: string; hint: string }
> = {
  gestion: { field: 'managed', kind: 'manage', icon: '⚙', label: 'Gérer', hint: "J'exploite ce service" },
  wa: { field: 'clientEnabled', kind: 'client', icon: '👤', label: 'Client choisit', hint: 'Menu WhatsApp' },
  task: { field: 'taskEnabled', kind: 'task', icon: '📋', label: 'Créer tâche', hint: 'Assigner l’équipe' },
  exec: { field: 'orchestrated', kind: 'orch', icon: '⚡', label: 'Orchestrer', hint: 'Relances auto' },
};

const EXEC_PILLS: {
  id: string;
  field: keyof CapabilityExecutionState;
  tab: 'relances' | 'staff' | 'escalade';
  icon: string;
  label: string;
  hint: string;
}[] = [
  { id: 'relances', field: 'clientReminders', tab: 'relances', icon: '💌', label: 'Relances', hint: 'Relances client' },
  { id: 'staff', field: 'staffAssignment', tab: 'staff', icon: '👷', label: 'Staff', hint: 'Assignation & rappels staff' },
  { id: 'escalade', field: 'pmEscalation', tab: 'escalade', icon: '🚨', label: 'Escalade', hint: 'Escalade PM' },
];

export default function V3ServicePanel({
  def,
  row,
  ownerKey,
  listingId,
  orchestrationDoc,
  listingValues,
  ownerTemplateMode = false,
  serviceEffectivelyEnabled,
  onGestionPatch,
  onRowChange,
  onPersist,
  onReload,
  onExecutionDocPatch,
  onWhatsappPatch,
}: Props) {
  const matrixScope = ownerTemplateMode ? ('owner' as const) : ('listing' as const);
  const panels = useMemo(() => {
    const list: PanelId[] = ['gestion'];
    if (def.columns.client !== 'na') list.push('wa');
    if (def.columns.execution !== 'na') list.push('exec');
    if (def.columns.task !== 'na') list.push('task');
    return list;
  }, [def.columns]);

  const [activePanel, setActivePanel] = useState<PanelId>('gestion');
  const [execTab, setExecTab] = useState('relances');

  useEffect(() => {
    setActivePanel('gestion');
    const firstExec =
      def.columns.client === 'na'
        ? EXEC_PILLS.find(p => p.id !== 'relances')
        : EXEC_PILLS[0];
    setExecTab(firstExec?.tab ?? 'relances');
    logV3Orch('service.open', { key: def.key, defaultExecTab: firstExec?.tab });
  }, [def.key, def.columns.client]);

  const gestionValues = useMemo(() => {
    const capGestion = orchestrationDoc.capabilities?.[def.key]?.gestion ?? {};
    const merged: Record<string, unknown> = { ...listingValues, ...capGestion };
    if (def.key === 'cleaning_sojori' && capGestion.cleaningOrchestration != null) {
      merged.cleaningOrchestration = capGestion.cleaningOrchestration;
    }
    return merged;
  }, [listingValues, orchestrationDoc, def.key]);

  const patchDecision = (field: keyof CapabilityRowState, value: boolean) => {
    logV3Orch('pill.toggle', { key: def.key, field, value });
    onRowChange({ [field]: value });
  };

  const patchExecutionFlag = (field: keyof CapabilityExecutionState, value: boolean) => {
    logV3Orch('exec.toggle', { key: def.key, field, value });
    onRowChange({
      execution: {
        ...row.execution,
        [field]: value,
      },
    });
  };

  const visibleExecPills = useMemo(
    () =>
      EXEC_PILLS.filter((p) => {
        if (p.id === 'relances' && (def.columns.client === 'na' || isOnDemandCapability(def))) {
          return false;
        }
        return true;
      }),
    [def],
  );

  const selectPanel = (id: PanelId) => {
    setActivePanel(id);
    logV3Orch('panel.select', { key: def.key, panel: id, viewOnly: true });
  };

  const selectExecTab = (p: (typeof EXEC_PILLS)[number]) => {
    setExecTab(p.tab);
    logV3Orch('exec.select', { key: def.key, tab: p.tab, field: p.field, viewOnly: true });
  };

  const isMenuNav = def.key === 'menu_navigation';
  const visiblePanels = useMemo(
    () => (isMenuNav ? ([] as PanelId[]) : panels),
    [isMenuNav, panels],
  );

  const workflowEditorLocked = serviceEffectivelyEnabled === false;
  const isLocked = (panel: PanelId) => {
    if (workflowEditorLocked) return true;
    if (serviceEffectivelyEnabled) return false;
    return panel !== 'gestion' && !row.managed;
  };
  const isEnabled = (panel: PanelId) => Boolean(row[PANEL_META[panel].field]);

  const statusBadge =
    row.status === 'configured' ? (
      <V3Badge tone="ok">OK</V3Badge>
    ) : row.status === 'incomplete' ? (
      <V3Badge tone="todo">!</V3Badge>
    ) : null;

  const renderPanelContent = () => {
    if (isMenuNav) {
      return (
        <CapabilityWhatsAppPanel
          def={def}
          scope={matrixScope}
          ownerKey={ownerKey}
          listingId={ownerTemplateMode ? undefined : listingId}
          orchestrationDoc={orchestrationDoc as ListingOrchestrationDoc}
          ownerOrchestrationDoc={ownerTemplateMode ? (orchestrationDoc as OwnerOrchestrationDoc) : undefined}
          onOrchestrationSaved={onReload}
        />
      );
    }

    if (activePanel !== 'gestion' && isLocked(activePanel)) {
      return (
        <Typography sx={{ fontSize: 12, color: V3.t3, py: 2, textAlign: 'center' }}>
          Activez d&apos;abord « Gérer ».
        </Typography>
      );
    }

    switch (activePanel) {
      case 'gestion':
        return def.key === 'cleaning_free' ? (
          <V3CleaningIncludedPanel
            gestion={(orchestrationDoc.capabilities?.cleaning_free?.gestion ?? {}) as Record<string, unknown>}
            listingValues={listingValues}
            onSave={async nextGestion => {
              if (ownerTemplateMode) {
                await saveOwnerGestion({
                  ownerKey,
                  capabilityKey: 'cleaning_free',
                  gestion: nextGestion,
                  doc: orchestrationDoc as OwnerOrchestrationDoc,
                });
              } else {
                await saveListingGestion({
                  listingId,
                  capabilityKey: 'cleaning_free',
                  gestion: nextGestion,
                  doc: orchestrationDoc as ListingOrchestrationDoc,
                });
              }
              onReload();
            }}
          />
        ) : (
          <CapabilityGestionPanel
            def={def}
            scope={matrixScope}
            ownerKey={ownerKey}
            listingId={ownerTemplateMode ? undefined : listingId}
            listingValues={gestionValues}
            onListingPatch={workflowEditorLocked ? async () => {} : onGestionPatch}
          />
        );
      case 'wa':
        return (
          <CapabilityWhatsAppPanel
            def={def}
            scope={matrixScope}
            ownerKey={ownerKey}
            listingId={ownerTemplateMode ? undefined : listingId}
            orchestrationDoc={orchestrationDoc as ListingOrchestrationDoc}
            ownerOrchestrationDoc={ownerTemplateMode ? (orchestrationDoc as OwnerOrchestrationDoc) : undefined}
            onWhatsappPatch={onWhatsappPatch}
          />
        );
      case 'task':
        return (
          <V3TaskBehaviorPanel
            def={def}
            listingId={ownerTemplateMode ? undefined : listingId}
            ownerKey={ownerKey}
            ownerTemplateMode={ownerTemplateMode}
            doc={orchestrationDoc}
            onSaved={onReload}
          />
        );
      case 'exec':
        return (
          <>
            <CapabilityExecutionPanel
              def={def}
              ownerKey={ownerKey}
              listingId={ownerTemplateMode ? undefined : listingId}
              orchestrationDoc={orchestrationDoc}
              ownerTemplateMode={ownerTemplateMode}
              readOnly={workflowEditorLocked}
              section={execTab as 'relances' | 'staff' | 'escalade'}
              executionFlags={row.execution}
              onExecutionDocPatch={onExecutionDocPatch}
              onSaved={() => onReload(def.key)}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          bgcolor: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${V3.b}`,
          px: 2,
          py: 1.25,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: `linear-gradient(135deg,${V3.ps},${V3.pd})`,
              color: '#1a1408',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            {def.emoji}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>
              {def.label} {statusBadge}
            </Typography>
            <Typography sx={{ fontSize: 11, color: V3.t3, lineHeight: 1.3 }}>
              {def.groupLabel} · {capabilityShortHint(def)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Button
              size="small"
              variant="contained"
              disabled={workflowEditorLocked}
              onClick={onPersist}
              sx={{ fontWeight: 800, borderRadius: '8px', bgcolor: V3.pd, fontSize: 11, px: 1.25 }}
            >
              Enregistrer décisions
            </Button>
            <Typography sx={{ fontSize: 9, color: V3.t4, mt: 0.35, lineHeight: 1.2, maxWidth: 140 }}>
              Pills Gérer · Client · Orchestrer · Tâche
            </Typography>
          </Box>
        </Box>

        {visiblePanels.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            {visiblePanels.map(id => {
              const meta = PANEL_META[id];
              return (
                <V3DecisionPill
                  key={id}
                  icon={meta.icon}
                  label={meta.label}
                  hint={meta.hint}
                  kind={meta.kind}
                  enabled={isEnabled(id)}
                  selected={activePanel === id}
                  locked={isLocked(id)}
                  onSelect={() => selectPanel(id)}
                  onEnabledChange={v => patchDecision(meta.field, v)}
                />
              );
            })}
          </Box>
        )}

        {activePanel === 'exec' && !isLocked('exec') && (
          <Box
            sx={{
              display: 'flex',
              gap: 0.75,
              mt: 1,
              pt: 1,
              borderTop: `1px dashed ${V3.b}`,
              flexWrap: 'wrap',
            }}
          >
            {visibleExecPills.map(p => (
              <V3DecisionPill
                key={p.id}
                icon={p.icon}
                label={p.label}
                hint={p.hint}
                kind="orch"
                enabled={Boolean(row.execution[p.field])}
                selected={execTab === p.tab}
                onSelect={() => selectExecTab(p)}
                onEnabledChange={v => patchExecutionFlag(p.field, v)}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Contenu — pleine largeur, sans boîte interne */}
      <Box sx={{ px: 2.5, py: 2, width: '100%', maxWidth: 'none' }}>{renderPanelContent()}</Box>
    </Box>
  );
}
