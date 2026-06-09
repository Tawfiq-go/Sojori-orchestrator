// Checklist ménage globale (inclus · payant · Sojori)
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, Stack, Typography, CircularProgress } from '@mui/material';
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
import { SOJORI_TOKENS as T } from './types';
import { Card, TextInput, ConfigIntroBar, PillButton, AddRowBtn, TYPO } from './SHARED';
import {
  createEmptyChecklistItem,
  canPersistListingConfig,
  mapCleaningChecklistPatch,
  mapListingToCleaningSojoriConfig,
  type CleaningChecklistItem,
  type CleaningSojoriConfig,
} from './cleaningSojoriConfigTypes';
import { logOrchConfig, orchConfigError } from '../../utils/orchConfigDebugLog';

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

type Props = {
  listingId: string;
  listingValues?: Record<string, unknown>;
  onListingPatch?: (patch: Record<string, unknown>) => void;
  templateMode?: boolean;
};

export default function CleaningChecklistPanel({
  listingId,
  listingValues = {},
  onListingPatch,
  templateMode = false,
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

  const orchSig = JSON.stringify((listingValues.cleaningOrchestration as object) || {});

  useEffect(() => {
    if (dirtyRef.current) return;
    if (!listingValues || !Object.keys(listingValues).length) return;
    const mapped = mapListingToCleaningSojoriConfig(listingValues);
    setConfig(mapped);
    configRef.current = mapped;
    hydratedRef.current = true;
  }, [listingValues, listingId, orchSig]);

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
    if (!cfg || !canPersistListingConfig(listingId, templateMode)) return;
    const payload = mapCleaningChecklistPatch(cfg.checklist, listingValues);
    logOrchConfig('cleaning.checklist.persist →', {
      listingId: listingId || '(template)',
      templateMode,
      itemCount: cfg.checklist.length,
    });
    setSavingState('saving');
    try {
      if (!templateMode && listingId) {
        await listingsService.updateListingProperty(listingId, payload);
      }
      await onListingPatch?.(payload);
      logOrchConfig('cleaning.checklist.persist ← OK', {
        listingId: listingId || '(template)',
        itemCount: cfg.checklist.length,
      });
      setSavingState('saved');
    } catch (e) {
      orchConfigError('cleaning.checklist.persist ← FAIL', e, {
        listingId: listingId || '(template)',
        templateMode,
      });
      setSavingState('idle');
      dirtyRef.current = true;
    }
  }, [listingId, listingValues, onListingPatch, templateMode]);

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
        <Typography sx={{ mt: 2, ...TYPO.intro }}>Chargement checklist…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <ConfigIntroBar saveState={savingState}>
        Checklist staff commune à tous les ménages (inclus, payant, Sojori).
      </ConfigIntroBar>

      <Card compact icon="📋" title="Checklist de ménage" subtitle="Items obligatoires + photos requises">
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
    </Box>
  );
}
