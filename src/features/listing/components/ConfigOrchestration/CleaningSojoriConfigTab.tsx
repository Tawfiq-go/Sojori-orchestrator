// Ménage Sojori — cleaningOrchestration (déclenchement · filet DIRTY · checklist)
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Stack, Typography, CircularProgress, IconButton } from '@mui/material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { listingsService } from '../../../../services/listingsService';
import { SOJORI_TOKENS as T, CONFIG_ORCH_FONT } from './types';
import {
  Card,
  FormRow,
  TextInput,
  ConfigIntroBar,
  PillButton,
  Toggle,
  NumInput,
  AddRowBtn,
  TYPO,
} from './SHARED';
import {
  createEmptyChecklistItem,
  mapCleaningSojoriToListingPatch,
  mapListingToCleaningSojoriConfig,
  type CleaningChecklistItem,
  type CleaningSojoriConfig,
} from './cleaningSojoriConfigTypes';

const TRIGGER_OPTIONS = [
  { value: 0, label: 'J (checkout)' },
  { value: 1, label: 'J+1' },
  { value: 2, label: 'J+2' },
  { value: 3, label: 'J+3' },
];

interface Props {
  listingId: string;
  ownerId?: string;
  listingValues?: Record<string, unknown>;
  onListingPatch?: (patch: Record<string, unknown>) => void;
}

function SortableChecklistRow({
  item,
  onUpdate,
  onDelete,
}: {
  item: CleaningChecklistItem;
  onUpdate: (patch: Partial<CleaningChecklistItem>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 }}
      sx={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr auto 32px',
        gap: 1,
        alignItems: 'center',
        p: 1,
        bgcolor: T.bg1,
        border: `1px solid ${T.border}`,
        borderRadius: 1,
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{ cursor: 'grab', color: T.text3, fontSize: 14, textAlign: 'center', userSelect: 'none' }}
      >
        ⠿
      </Box>
      <TextInput
        value={item.label}
        onChange={e => onUpdate({ label: e.target.value })}
        placeholder="Libellé de l'item…"
        style={{ padding: '8px 10px', fontSize: 12.5 }}
      />
      <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <PillButton compact active={item.required} onClick={() => onUpdate({ required: true, photoRequired: item.photoRequired })}>
          REQUIS
        </PillButton>
        <PillButton
          compact
          active={!item.required}
          onClick={() => onUpdate({ required: false, photoRequired: false })}
        >
          OPT
        </PillButton>
        {item.required && (
          <PillButton compact active={item.photoRequired} onClick={() => onUpdate({ photoRequired: !item.photoRequired })}>
            PHOTO
          </PillButton>
        )}
      </Stack>
      <IconButton size="small" onClick={onDelete} sx={{ color: T.error, p: 0.25 }} aria-label="Supprimer">
        ✕
      </IconButton>
    </Box>
  );
}

export default function CleaningSojoriConfigTab({
  listingId,
  listingValues = {},
  onListingPatch,
}: Props) {
  const [config, setConfig] = useState<CleaningSojoriConfig | null>(null);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const configRef = useRef<CleaningSojoriConfig | null>(null);
  const hydratedRef = useRef(false);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    hydratedRef.current = false;
    dirtyRef.current = false;
  }, [listingId]);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (!listingValues || !Object.keys(listingValues).length) return;
    const mapped = mapListingToCleaningSojoriConfig(listingValues);
    setConfig(mapped);
    configRef.current = mapped;
    hydratedRef.current = true;
  }, [listingValues, listingId]);

  const patch = useCallback((fn: (c: CleaningSojoriConfig) => CleaningSojoriConfig) => {
    dirtyRef.current = true;
    setConfig(prev => {
      if (!prev) return prev;
      const next = fn(prev);
      configRef.current = next;
      return next;
    });
  }, []);

  const persist = useCallback(async () => {
    const cfg = configRef.current;
    if (!cfg || !listingId) return;
    const payload = mapCleaningSojoriToListingPatch(cfg);
    setSavingState('saving');
    try {
      await listingsService.updateListingProperty(listingId, payload);
      onListingPatch?.(payload);
      setSavingState('saved');
    } catch {
      setSavingState('idle');
      dirtyRef.current = true;
    }
  }, [listingId, onListingPatch]);

  useEffect(() => {
    if (!config || !dirtyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persist().finally(() => {
        dirtyRef.current = false;
      });
    }, 800);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [config, persist]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    patch(prev => {
      const o = prev.checklist.findIndex(i => i.id === active.id);
      const n = prev.checklist.findIndex(i => i.id === over.id);
      const moved = arrayMove(prev.checklist, o, n).map((item, i) => ({ ...item, order: i }));
      return { ...prev, checklist: moved };
    });
  };

  if (!config || !Object.keys(listingValues).length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={28} sx={{ color: T.primary }} />
        <Typography sx={{ mt: 2, ...TYPO.intro }}>Chargement ménage Sojori…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <ConfigIntroBar saveState={savingState}>
        Orchestration interne Sojori : tâche auto après checkout, filet si le logement reste <b>DIRTY</b>, checklist staff.
      </ConfigIntroBar>

      <Card compact icon="🧼" title="Ménage Sojori" subtitle="Activer la création automatique des tâches">
        <FormRow compact label="Automatisation">
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <Toggle
              on={config.enabled}
              onChange={() => patch(c => ({ ...c, enabled: !c.enabled }))}
            />
            <Typography sx={{ fontSize: 12, color: T.text2, fontWeight: 600 }}>
              {config.enabled ? 'Activé' : 'Désactivé'}
            </Typography>
          </Stack>
        </FormRow>
      </Card>

      {config.enabled && (
        <>
          <Card compact icon="⏱" title="Déclenchement" subtitle="Date cible de la tâche si pas de prochaine réservation">
            <FormRow
              compact
              label="Jour après checkout"
              help="0 = jour J (checkout), 1 = J+1…"


            >
              <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
                {TRIGGER_OPTIONS.map(opt => (
                  <PillButton
                    key={opt.value}
                    compact
                    active={config.preferredDayAfterCheckout === opt.value}
                    onClick={() => patch(c => ({ ...c, preferredDayAfterCheckout: opt.value }))}
                  >
                    {opt.label}
                  </PillButton>
                ))}
              </Stack>
            </FormRow>
          </Card>

          <Card
            compact
            icon="🛡"
            title="Filet de sécurité · max jours en statut DIRTY"
            subtitle="Alerte si non nettoyé après X jours"

          >
            <FormRow
              compact
              label="Max jours en statut DIRTY"
              help="Au-delà → ménage d'urgence créé automatiquement"


            >
              <Box sx={{ maxWidth: 160 }}>
                <NumInput
                  value={config.safetyMaxDirtyDays}
                  suffix="JOURS"
                  min={1}
                  max={4}
                  onChange={e =>
                    patch(c => ({
                      ...c,
                      safetyMaxDirtyDays: Math.min(4, Math.max(1, Number(e.target.value) || 4)),
                    }))
                  }
                />
              </Box>
            </FormRow>
          </Card>

          <Card
            compact
            icon="📋"
            title="Checklist de ménage"
            subtitle="Items obligatoires + photos requises"

          >
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={config.checklist.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <Stack sx={{ gap: 0.75 }}>
                  {config.checklist.map(item => (
                    <SortableChecklistRow
                      key={item.id}
                      item={item}
                      onUpdate={p =>
                        patch(c => ({
                          ...c,
                          checklist: c.checklist.map(row => (row.id === item.id ? { ...row, ...p } : row)),
                        }))
                      }
                      onDelete={() =>
                        patch(c => ({
                          ...c,
                          checklist: c.checklist.filter(row => row.id !== item.id).map((row, i) => ({ ...row, order: i })),
                        }))
                      }
                    />
                  ))}
                </Stack>
              </SortableContext>
            </DndContext>
            <AddRowBtn
              onClick={() =>
                patch(c => ({
                  ...c,
                  checklist: [...c.checklist, createEmptyChecklistItem(c.checklist.length)],
                }))
              }
            >
              + Ajouter un item checklist
            </AddRowBtn>
          </Card>
        </>
      )}
    </Box>
  );
}
