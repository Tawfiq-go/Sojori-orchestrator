import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import {
  CapabilityGestionPanel,
  CapabilityWhatsAppPanel,
} from '../serviceMatrix/CapabilityMatrixConfigPanels';
import CapabilityExecutionPanel from '../serviceMatrix/CapabilityExecutionPanel';
import type { CapabilityDefinition } from '../serviceMatrix/capabilityRegistry';
import type { CapabilityExecutionState, CapabilityRowState } from '../serviceMatrix/types';
import type { ListingOrchestrationDoc } from './listingOrchestrationApi';
import { saveListingGestion } from './listingOrchestrationApi';
import V3CleaningIncludedPanel from './V3CleaningIncludedPanel';
import V3TaskBehaviorPanel from './V3TaskBehaviorPanel';
import { V3 } from './theme';
import { V3Badge, V3DecisionPill } from './V3Primitives';

type Props = {
  def: CapabilityDefinition;
  row: CapabilityRowState;
  ownerKey: string;
  listingId: string;
  orchestrationDoc: ListingOrchestrationDoc;
  listingValues: Record<string, unknown>;
  onGestionPatch: (patch: Record<string, unknown>) => Promise<void>;
  onRowChange: (patch: Partial<CapabilityRowState>) => void;
  onPersist: () => void;
  onReload: () => void;
};

type PanelId = 'gestion' | 'wa' | 'task' | 'exec';

const PANEL_META: Record<
  PanelId,
  { field: keyof CapabilityRowState; kind: 'manage' | 'client' | 'task' | 'orch'; icon: string; label: string; hint: string }
> = {
  gestion: { field: 'managed', kind: 'manage', icon: '⚙', label: 'Gérer', hint: "J'exploite ce service" },
  wa: { field: 'clientEnabled', kind: 'client', icon: '👤', label: 'Client choisit', hint: 'Menu WhatsApp' },
  task: { field: 'taskEnabled', kind: 'task', icon: '📋', label: 'Créer tâche', hint: 'Ops staff' },
  exec: { field: 'orchestrated', kind: 'orch', icon: '⚡', label: 'Orchestrer', hint: 'Relances auto' },
};

const EXEC_PILLS: {
  id: string;
  field: keyof CapabilityExecutionState;
  tab: 'relances' | 'staff' | 'escalade';
  staffFocus?: 'assignment' | 'reminders';
  icon: string;
  label: string;
  hint: string;
}[] = [
  { id: 'relances', field: 'clientReminders', tab: 'relances', icon: '💌', label: 'Relances', hint: 'Relances client' },
  { id: 'staff', field: 'staffAssignment', tab: 'staff', staffFocus: 'assignment', icon: '👷', label: 'Staff', hint: 'Assignation' },
  {
    id: 'staff-reminders',
    field: 'staffReminders',
    tab: 'staff',
    staffFocus: 'reminders',
    icon: '🔔',
    label: 'Rappels staff',
    hint: 'Rappels staff',
  },
  { id: 'escalade', field: 'pmEscalation', tab: 'escalade', icon: '🚨', label: 'Escalade', hint: 'Escalade PM' },
];

export default function V3ServicePanel({
  def,
  row,
  ownerKey,
  listingId,
  orchestrationDoc,
  listingValues,
  onGestionPatch,
  onRowChange,
  onPersist,
  onReload,
}: Props) {
  const panels = useMemo(() => {
    const list: PanelId[] = ['gestion'];
    if (def.columns.client !== 'na') list.push('wa');
    if (def.columns.execution !== 'na') list.push('exec');
    if (def.columns.task !== 'na') list.push('task');
    return list;
  }, [def.columns]);

  const [activePanel, setActivePanel] = useState<PanelId>('gestion');
  const [execTab, setExecTab] = useState('relances');
  const [execStaffFocus, setExecStaffFocus] = useState<'assignment' | 'reminders'>('assignment');

  useEffect(() => {
    setActivePanel('gestion');
    setExecTab('relances');
    setExecStaffFocus('assignment');
  }, [def.key]);

  const gestionValues = useMemo(
    () => ({
      ...listingValues,
      ...(orchestrationDoc.capabilities?.[def.key]?.gestion ?? {}),
    }),
    [listingValues, orchestrationDoc, def.key],
  );

  const patchDecision = (field: keyof CapabilityRowState, value: boolean) => {
    onRowChange({ [field]: value });
  };

  const patchExecutionFlag = (field: keyof CapabilityExecutionState, value: boolean) => {
    onRowChange({
      execution: {
        ...row.execution,
        [field]: value,
      },
    });
  };

  const isMenuNav = def.key === 'menu_navigation';
  const visiblePanels = useMemo(
    () => (isMenuNav ? ([] as PanelId[]) : panels),
    [isMenuNav, panels],
  );

  const isLocked = (panel: PanelId) => panel !== 'gestion' && !row.managed;
  const isEnabled = (panel: PanelId) => Boolean(row[PANEL_META[panel].field]);

  const expertUrl = `/tasks/orchestration-config?owner=${encodeURIComponent(ownerKey)}&tab=workflows`;

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
          scope="listing"
          ownerKey={ownerKey}
          listingId={listingId}
          orchestrationDoc={orchestrationDoc}
          onOrchestrationSaved={onReload}
        />
      );
    }

    if (activePanel !== 'gestion' && !isEnabled(activePanel)) {
      return (
        <Typography sx={{ fontSize: 12, color: V3.t3, py: 2, textAlign: 'center' }}>
          Activez « {PANEL_META[activePanel].label} » (toggle ON) pour éditer.
        </Typography>
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
              await saveListingGestion({
                listingId,
                capabilityKey: 'cleaning_free',
                gestion: nextGestion,
                doc: orchestrationDoc,
              });
              onReload();
            }}
          />
        ) : (
          <CapabilityGestionPanel
            def={def}
            scope="listing"
            ownerKey={ownerKey}
            listingId={listingId}
            listingValues={gestionValues}
            onListingPatch={onGestionPatch}
          />
        );
      case 'wa':
        return (
          <CapabilityWhatsAppPanel
            def={def}
            scope="listing"
            ownerKey={ownerKey}
            listingId={listingId}
            orchestrationDoc={orchestrationDoc}
            onOrchestrationSaved={onReload}
          />
        );
      case 'task':
        return (
          <V3TaskBehaviorPanel def={def} listingId={listingId} doc={orchestrationDoc} onSaved={onReload} />
        );
      case 'exec':
        return (
          <>
            <CapabilityExecutionPanel
              def={def}
              ownerKey={ownerKey}
              listingId={listingId}
              orchestrationDoc={orchestrationDoc}
              section={execTab as 'relances' | 'staff' | 'escalade'}
              executionFlags={row.execution}
              onSaved={onReload}
            />
            {execTab === 'escalade' && (
              <Button
                component={RouterLink}
                to={expertUrl}
                size="small"
                sx={{ mt: 1, textTransform: 'none', fontSize: 11, fontWeight: 700, color: V3.orch, px: 0 }}
              >
                Mode expert →
              </Button>
            )}
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
            <Typography sx={{ fontSize: 10, color: V3.t4, fontFamily: 'monospace' }}>{def.key}</Typography>
          </Box>
          <Button
            size="small"
            variant="contained"
            onClick={onPersist}
            sx={{ fontWeight: 800, borderRadius: '8px', bgcolor: V3.pd, fontSize: 11, px: 1.25 }}
          >
            Enregistrer
          </Button>
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
                  onSelect={() => setActivePanel(id)}
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
            {EXEC_PILLS.map(p => {
              const pillSelected =
                execTab === p.tab &&
                (p.tab !== 'staff' || execStaffFocus === p.staffFocus);
              return (
                <V3DecisionPill
                  key={p.id}
                  icon={p.icon}
                  label={p.label}
                  hint={p.hint}
                  kind="orch"
                  enabled={Boolean(row.execution[p.field])}
                  selected={pillSelected}
                  onSelect={() => {
                    setExecTab(p.tab);
                    if (p.staffFocus) setExecStaffFocus(p.staffFocus);
                  }}
                  onEnabledChange={v => patchExecutionFlag(p.field, v)}
                />
              );
            })}
          </Box>
        )}
      </Box>

      {/* Contenu — pleine largeur, sans boîte interne */}
      <Box sx={{ px: 2.5, py: 2, width: '100%', maxWidth: 'none' }}>{renderPanelContent()}</Box>
    </Box>
  );
}
