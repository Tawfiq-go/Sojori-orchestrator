/** Déclarations problèmes ménage — liste plate FR/DA/AR/EN (WA Terminer CheckboxGroup). */
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
  CHECKLIST_UI,
  canPersistListingConfig,
  createEmptyDeclareOption,
  mapCleaningDeclarePatch,
  mapListingToCleaningSojoriConfig,
  type CleaningDeclareOption,
  type CleaningSojoriConfig,
} from './cleaningSojoriConfigTypes';
import { logOrchConfig, orchConfigError } from '../../utils/orchConfigDebugLog';
import type { ChecklistLangFilter } from './CleaningChecklistPanel';

const U = CHECKLIST_UI;

const LANG_FILTERS: { id: ChecklistLangFilter; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'fr', label: 'FR' },
  { id: 'da', label: 'DA' },
  { id: 'ar', label: 'AR' },
  { id: 'en', label: 'EN' },
];

function showLang(filter: ChecklistLangFilter, lang: 'fr' | 'da' | 'ar' | 'en'): boolean {
  return filter === 'all' || filter === lang;
}

function LangField({
  code,
  value,
  placeholder,
  dir,
  onChange,
}: {
  code: string;
  value: string;
  placeholder: string;
  dir?: 'rtl' | 'ltr';
  onChange: (v: string) => void;
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 0.5, alignItems: 'center' }}>
      <Typography sx={{ ...U.fieldLabel, color: T.text3 }}>{code}</Typography>
      <TextInput
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={dir}
        style={{ ...U.input }}
      />
    </Box>
  );
}

function SortableDeclareRow({
  item,
  langFilter,
  onUpdate,
  onDelete,
}: {
  item: CleaningDeclareOption;
  langFilter: ChecklistLangFilter;
  onUpdate: (p: Partial<CleaningDeclareOption>) => void;
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
        gridTemplateColumns: '22px 1fr 26px',
        gap: 0.5,
        alignItems: 'start',
        p: 0.75,
        bgcolor: '#fff',
        border: `1px solid ${T.border}`,
        borderRadius: 1,
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{ cursor: 'grab', color: T.text3, fontSize: 12, textAlign: 'center', pt: 0.5, userSelect: 'none' }}
      >
        ⠿
      </Box>
      <Stack spacing={0.4}>
        {showLang(langFilter, 'fr') ? (
          <LangField code="FR" value={item.label} placeholder="Problème…" onChange={(v) => onUpdate({ label: v })} />
        ) : null}
        {showLang(langFilter, 'da') ? (
          <LangField
            code="DA"
            value={item.labelDa || ''}
            placeholder="بالدارجة…"
            dir="rtl"
            onChange={(v) => onUpdate({ labelDa: v })}
          />
        ) : null}
        {showLang(langFilter, 'ar') ? (
          <LangField
            code="AR"
            value={item.labelAr || ''}
            placeholder="بالعربية…"
            dir="rtl"
            onChange={(v) => onUpdate({ labelAr: v })}
          />
        ) : null}
        {showLang(langFilter, 'en') ? (
          <LangField code="EN" value={item.labelEn || ''} placeholder="English…" onChange={(v) => onUpdate({ labelEn: v })} />
        ) : null}
      </Stack>
      <IconButton size="small" onClick={onDelete} sx={{ color: T.error, p: 0.25 }} aria-label="Supprimer">
        <Typography sx={{ fontSize: 12 }}>✕</Typography>
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

export default function CleaningDeclarePanel({
  listingId,
  listingValues = {},
  onListingPatch,
  templateMode = false,
}: Props) {
  const [config, setConfig] = useState<CleaningSojoriConfig | null>(null);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [langFilter, setLangFilter] = useState<ChecklistLangFilter>('fr');
  const configRef = useRef<CleaningSojoriConfig | null>(null);
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    dirtyRef.current = false;
  }, [listingId]);

  const orchSig = JSON.stringify((listingValues.cleaningOrchestration as object) || {});

  useEffect(() => {
    if (dirtyRef.current) return;
    if (!listingValues || !Object.keys(listingValues).length) return;
    const mapped = mapListingToCleaningSojoriConfig(listingValues);
    setConfig(mapped);
    configRef.current = mapped;
  }, [listingValues, listingId, orchSig]);

  const patchOpts = useCallback((fn: (opts: CleaningDeclareOption[]) => CleaningDeclareOption[]) => {
    dirtyRef.current = true;
    setConfig((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        declareOptions: fn(prev.declareOptions).map((o, i) => ({ ...o, order: i })),
      };
      configRef.current = next;
      return next;
    });
  }, []);

  const persist = useCallback(async () => {
    const cfg = configRef.current;
    if (!cfg || !canPersistListingConfig(listingId, templateMode)) return;
    const payload = mapCleaningDeclarePatch(cfg.declareOptions, listingValues);
    logOrchConfig('cleaning.declare.persist →', {
      listingId: listingId || '(template)',
      n: cfg.declareOptions.length,
    });
    setSavingState('saving');
    try {
      if (!templateMode && listingId) {
        await listingsService.updateListingProperty(listingId, payload);
      }
      await onListingPatch?.(payload);
      setSavingState('saved');
    } catch (e) {
      orchConfigError('cleaning.declare.persist ← FAIL', e, { listingId });
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

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !config) return;
    const oldIndex = config.declareOptions.findIndex((o) => o.id === active.id);
    const newIndex = config.declareOptions.findIndex((o) => o.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    patchOpts((opts) => arrayMove(opts, oldIndex, newIndex));
  };

  if (!config || !Object.keys(listingValues).length) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={24} sx={{ color: T.primary }} />
        <Typography sx={{ mt: 1.5, ...TYPO.intro, fontSize: 12 }}>Chargement déclarations…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <ConfigIntroBar saveState={savingState}>
        Pattern : 1 liste plate · FR/DA/AR/EN · WA Terminer = CheckboxGroup « باش نصرح » (non bloquant).
      </ConfigIntroBar>

      <Card
        compact
        icon="⚠️"
        title="Déclarations problèmes"
        subtitle={`${config.declareOptions.length} options · police compacte`}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          <Typography sx={{ ...U.fieldLabel, color: T.text3, mr: 0.5 }}>Langues</Typography>
          {LANG_FILTERS.map((f) => (
            <PillButton key={f.id} compact active={langFilter === f.id} onClick={() => setLangFilter(f.id)}>
              {f.label}
            </PillButton>
          ))}
        </Box>
        <Typography sx={{ ...U.hint, color: T.text3, mb: 1 }}>
          Si la FdM coche un problème → photos + note. Même écran Terminer que la checklist.
        </Typography>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={config.declareOptions.map((o) => o.id)} strategy={verticalListSortingStrategy}>
            <Stack sx={{ gap: 0.5 }}>
              {config.declareOptions.map((item) => (
                <SortableDeclareRow
                  key={item.id}
                  item={item}
                  langFilter={langFilter}
                  onUpdate={(p) =>
                    patchOpts((opts) => opts.map((row) => (row.id === item.id ? { ...row, ...p } : row)))
                  }
                  onDelete={() => patchOpts((opts) => opts.filter((row) => row.id !== item.id))}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
        <AddRowBtn onClick={() => patchOpts((opts) => [...opts, createEmptyDeclareOption(opts.length)])}>
          + Déclaration
        </AddRowBtn>
      </Card>
    </Box>
  );
}
