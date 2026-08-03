/** Checklist ménage par catégories — pattern compact (petite police). */
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
  createEmptyChecklistCategory,
  createEmptyChecklistItem,
  mapCleaningChecklistPatch,
  mapListingToCleaningSojoriConfig,
  type CleaningChecklistCategory,
  type CleaningChecklistItem,
  type CleaningSojoriConfig,
} from './cleaningSojoriConfigTypes';
import { logOrchConfig, orchConfigError } from '../../utils/orchConfigDebugLog';

const U = CHECKLIST_UI;

/** Filtre d’affichage éditeur (FR → DA → AR → EN stockées). */
export type ChecklistLangFilter = 'all' | 'fr' | 'da' | 'ar' | 'en';

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

function SortableItemRow({
  item,
  langFilter,
  onUpdate,
  onDelete,
}: {
  item: CleaningChecklistItem;
  langFilter: ChecklistLangFilter;
  onUpdate: (p: Partial<CleaningChecklistItem>) => void;
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
        gridTemplateColumns: '22px 1fr auto 26px',
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
          <LangField code="FR" value={item.label} placeholder="Libellé…" onChange={(v) => onUpdate({ label: v })} />
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
            placeholder="العربية…"
            dir="rtl"
            onChange={(v) => onUpdate({ labelAr: v })}
          />
        ) : null}
        {showLang(langFilter, 'en') ? (
          <LangField
            code="EN"
            value={item.labelEn || ''}
            placeholder="English…"
            onChange={(v) => onUpdate({ labelEn: v })}
          />
        ) : null}
      </Stack>
      <Stack direction="row" sx={{ gap: 0.35, flexWrap: 'wrap', pt: 0.25 }}>
        <PillButton compact active={item.required} onClick={() => onUpdate({ required: true, photoRequired: item.photoRequired })}>
          REQ
        </PillButton>
        <PillButton compact active={!item.required} onClick={() => onUpdate({ required: false, photoRequired: false })}>
          OPT
        </PillButton>
        {item.required ? (
          <PillButton compact active={item.photoRequired} onClick={() => onUpdate({ photoRequired: !item.photoRequired })}>
            📷
          </PillButton>
        ) : null}
      </Stack>
      <IconButton size="small" onClick={onDelete} sx={{ color: T.error, p: 0.15, mt: 0.25 }} aria-label="Supprimer">
        <Typography sx={{ fontSize: 11 }}>✕</Typography>
      </IconButton>
    </Box>
  );
}

function CategoryBlock({
  cat,
  langFilter,
  onPatchCat,
  onDeleteCat,
  sensors,
}: {
  cat: CleaningChecklistCategory;
  langFilter: ChecklistLangFilter;
  onPatchCat: (p: Partial<CleaningChecklistCategory> | ((c: CleaningChecklistCategory) => CleaningChecklistCategory)) => void;
  onDeleteCat: () => void;
  sensors: ReturnType<typeof useSensors>;
}) {
  const patchItem = (id: string, p: Partial<CleaningChecklistItem>) => {
    onPatchCat((c) => ({
      ...c,
      items: c.items.map((row) => (row.id === id ? { ...row, ...p } : row)),
    }));
  };
  const deleteItem = (id: string) => {
    onPatchCat((c) => ({
      ...c,
      items: c.items.filter((row) => row.id !== id).map((row, i) => ({ ...row, order: i })),
    }));
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onPatchCat((c) => {
      const o = c.items.findIndex((i) => i.id === active.id);
      const n = c.items.findIndex((i) => i.id === over.id);
      if (o < 0 || n < 0) return c;
      return { ...c, items: arrayMove(c.items, o, n).map((it, i) => ({ ...it, order: i })) };
    });
  };

  return (
    <Box
      sx={{
        border: `1px solid ${T.border}`,
        borderRadius: 1.5,
        bgcolor: T.bg1,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1,
          py: 0.75,
          borderBottom: `1px solid ${T.border}`,
          bgcolor: 'rgba(184,133,26,0.06)',
        }}
      >
        <TextInput
          value={cat.emoji || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPatchCat({ emoji: e.target.value })}
          placeholder="🏠"
          style={{ width: 36, textAlign: 'center', ...U.input, padding: '4px' }}
        />
        <Stack spacing={0.35} sx={{ flex: 1 }}>
          {showLang(langFilter, 'fr') ? (
            <LangField code="FR" value={cat.label} placeholder="Catégorie…" onChange={(v) => onPatchCat({ label: v })} />
          ) : null}
          {showLang(langFilter, 'da') ? (
            <LangField
              code="DA"
              value={cat.labelDa || ''}
              placeholder="الفئة بالدارجة…"
              dir="rtl"
              onChange={(v) => onPatchCat({ labelDa: v })}
            />
          ) : null}
          {showLang(langFilter, 'ar') ? (
            <LangField
              code="AR"
              value={cat.labelAr || ''}
              placeholder="الفئة…"
              dir="rtl"
              onChange={(v) => onPatchCat({ labelAr: v })}
            />
          ) : null}
          {showLang(langFilter, 'en') ? (
            <LangField
              code="EN"
              value={cat.labelEn || ''}
              placeholder="Category…"
              onChange={(v) => onPatchCat({ labelEn: v })}
            />
          ) : null}
        </Stack>
        <Typography sx={{ ...U.catMeta, color: T.text3, whiteSpace: 'nowrap' }}>
          {cat.items.length} pts
        </Typography>
        <IconButton size="small" onClick={onDeleteCat} sx={{ color: T.error, p: 0.25 }} aria-label="Supprimer catégorie">
          <Typography sx={{ fontSize: 12 }}>✕</Typography>
        </IconButton>
      </Box>

      <Box sx={{ p: 0.75 }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={cat.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <Stack sx={{ gap: 0.5 }}>
              {cat.items.map((item) => (
                <SortableItemRow
                  key={item.id}
                  item={item}
                  langFilter={langFilter}
                  onUpdate={(p) => patchItem(item.id, p)}
                  onDelete={() => deleteItem(item.id)}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
        <AddRowBtn
          onClick={() =>
            onPatchCat((c) => ({
              ...c,
              items: [...c.items, createEmptyChecklistItem(c.items.length)],
            }))
          }
        >
          + Item
        </AddRowBtn>
      </Box>
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
  /** Affichage éditeur — FR par défaut ; Tout / EN / AR au besoin. Les 3 restent en base. */
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

  const patch = useCallback((fn: (c: CleaningSojoriConfig) => CleaningSojoriConfig) => {
    dirtyRef.current = true;
    setConfig((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      configRef.current = next;
      return next;
    });
  }, []);

  const persist = useCallback(async () => {
    const cfg = configRef.current;
    if (!cfg || !canPersistListingConfig(listingId, templateMode)) return;
    const payload = mapCleaningChecklistPatch(cfg.checklistCategories, listingValues);
    logOrchConfig('cleaning.checklist.persist →', {
      listingId: listingId || '(template)',
      templateMode,
      cats: cfg.checklistCategories.length,
      items: cfg.checklist.length,
    });
    setSavingState('saving');
    try {
      if (!templateMode && listingId) {
        await listingsService.updateListingProperty(listingId, payload);
      }
      await onListingPatch?.(payload);
      logOrchConfig('cleaning.checklist.persist ← OK', {
        listingId: listingId || '(template)',
        cats: cfg.checklistCategories.length,
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

  if (!config || !Object.keys(listingValues).length) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={24} sx={{ color: T.primary }} />
        <Typography sx={{ mt: 1.5, ...TYPO.intro, fontSize: 12 }}>Chargement checklist…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <ConfigIntroBar saveState={savingState}>
        Pattern : 1 catégorie = 1 thème · items FR/EN/AR · WA Terminer = 1 CheckboxGroup / cat (même
        écran, non bloquant au début).
      </ConfigIntroBar>

      <Card
        compact
        icon="📋"
        title="Checklist par catégories"
        subtitle={`${config.checklistCategories.length} thèmes · ${config.checklist.length} points · police compacte`}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 0.5,
            mb: 1,
          }}
        >
          <Typography sx={{ ...U.fieldLabel, color: T.text3, mr: 0.5 }}>Langues</Typography>
          {LANG_FILTERS.map((f) => (
            <PillButton key={f.id} compact active={langFilter === f.id} onClick={() => setLangFilter(f.id)}>
              {f.label}
            </PillButton>
          ))}
          <Typography sx={{ ...U.hint, color: T.text3, ml: 0.5 }}>
            {langFilter === 'all'
              ? 'FR → DA → AR → EN visibles'
              : `Édition ${langFilter.toUpperCase()} seule (les autres langues restent enregistrées)`}
          </Typography>
        </Box>
        <Typography sx={{ ...U.hint, color: T.text3, mb: 1 }}>
          Chambres → SDB → Cuisine → Logement → Avant de partir. Même structure côté staff Meta.
        </Typography>
        <Stack sx={{ gap: 1 }}>
          {config.checklistCategories.map((cat) => (
            <CategoryBlock
              key={cat.id}
              cat={cat}
              langFilter={langFilter}
              sensors={sensors}
              onPatchCat={(p) =>
                patch((c) => ({
                  ...c,
                  checklistCategories: c.checklistCategories.map((row) => {
                    if (row.id !== cat.id) return row;
                    return typeof p === 'function' ? p(row) : { ...row, ...p };
                  }),
                }))
              }
              onDeleteCat={() =>
                patch((c) => ({
                  ...c,
                  checklistCategories: c.checklistCategories
                    .filter((row) => row.id !== cat.id)
                    .map((row, i) => ({ ...row, order: i })),
                }))
              }
            />
          ))}
        </Stack>
        <AddRowBtn
          onClick={() =>
            patch((c) => ({
              ...c,
              checklistCategories: [
                ...c.checklistCategories,
                createEmptyChecklistCategory(c.checklistCategories.length),
              ],
            }))
          }
        >
          + Catégorie
        </AddRowBtn>
      </Card>
    </Box>
  );
}
