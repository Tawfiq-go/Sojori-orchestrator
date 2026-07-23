// Support — catégories « Signaler un problème » (drag & drop)
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Stack, Typography, IconButton } from '@mui/material';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SupportConfig, SupportCategory, SupportPriority } from './types';
import { SOJORI_TOKENS, DEFAULT_CATEGORIES } from './types';
import { SUPPORT_PRIORITIES, priorityMeta } from './supportPriority';
import { FormRow, TYPO } from './SHARED';
import {
  GuestLangTextFields,
  mergeGuestLangMap,
  emptyGuestLangMap,
} from '../../shared/GuestLangTextFields';

const T = SOJORI_TOKENS;
const MAX_CATEGORIES = 50;

export interface SupportConfigTabProps {
  initial?: SupportConfig;
  listingId: string;
  onSave?: (config: SupportConfig) => Promise<void>;
}

export default function SupportConfigTab({ initial, onSave }: SupportConfigTabProps) {
  const [config, setConfig] = useState<SupportConfig>(initial || {
    enabled: true,
    categories: DEFAULT_CATEGORIES,
  });
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const updateCategory = useCallback((id: string, patch: Partial<SupportCategory>) => {
    setConfig(c => ({
      ...c,
      categories: c.categories.map(cat => cat.id === id ? { ...cat, ...patch } : cat),
    }));
    debouncedSave();
  }, []);

  const deleteCategory = (id: string) => {
    setConfig(c => ({ ...c, categories: c.categories.filter(cat => cat.id !== id) }));
    debouncedSave();
  };

  const addCategory = () => {
    if (config.categories.length >= MAX_CATEGORIES) return;
    const newCat: SupportCategory = {
      id: `cat_${Date.now()}`,
      enabled: true,
      label: mergeGuestLangMap({ fr: 'Nouvelle catégorie', en: 'New category' }),
      description: emptyGuestLangMap(''),
      icon: '💬',
      defaultUrgency: 'normal',
      guestCanChoosePriority: true,
      order: config.categories.length,
    };
    setConfig(c => ({ ...c, categories: [...c.categories, newCat] }));
    debouncedSave();
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = config.categories.findIndex(c => c.id === active.id);
    const newIndex = config.categories.findIndex(c => c.id === over.id);
    const reordered = arrayMove(config.categories, oldIndex, newIndex)
      .map((c, i) => ({ ...c, order: i }));
    setConfig(c => ({ ...c, categories: reordered }));
    debouncedSave();
  };

  const debouncedSave = useCallback(() => {
    setSavingState('saving');
    if ((debouncedSave as any)._t) clearTimeout((debouncedSave as any)._t);
    (debouncedSave as any)._t = setTimeout(async () => {
      if (onSave) await onSave(configRef.current);
      setSavingState('saved');
      setTimeout(() => setSavingState('idle'), 2000);
    }, 800);
  }, [onSave]);

  const categoryCount = config.categories.length;

  return (
    <Box sx={{ p: 2, maxWidth: 880 }}>
      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        <Typography sx={{ ...TYPO.intro, flex: 1 }}>
          Catégories « Signaler un problème » : libellés multilingues (FR, EN, ES, DE, IT, AR, Darija), icônes et urgence.
        </Typography>
        {savingState !== 'idle' && (
          <Typography sx={{ fontSize: 10.5, color: savingState === 'saved' ? T.success : T.text3, fontWeight: 700 }}>
            {savingState === 'saving' ? 'Enregistrement…' : 'Enregistré'}
          </Typography>
        )}
      </Stack>

      <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text3, mb: 1 }}>
        {categoryCount} catégorie{categoryCount > 1 ? 's' : ''}
      </Typography>

      <Box sx={{
        bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.625,
        overflow: 'hidden', boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
      }}>
        <Box sx={{ p: 2 }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={config.categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <Stack sx={{ gap: 1 }}>
                {config.categories.map(cat => (
                  <SortableCategory
                    key={cat.id}
                    category={cat}
                    onUpdate={(patch) => updateCategory(cat.id, patch)}
                    onDelete={() => deleteCategory(cat.id)}
                  />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>

          <Box component="button" onClick={addCategory}
            disabled={config.categories.length >= MAX_CATEGORIES} sx={{
              all: 'unset', cursor: 'pointer', width: '100%', mt: 1.25,
              p: '11px', bgcolor: T.bg1, border: `1.5px dashed ${T.borderStrong}`,
              borderRadius: 1.125, fontSize: 12.5, fontWeight: 700, color: T.text3,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.875,
              transition: 'all 0.15s',
              opacity: config.categories.length >= MAX_CATEGORIES ? 0.4 : 1,
              '&:hover': config.categories.length < MAX_CATEGORIES ? {
                borderColor: T.primary, bgcolor: T.primaryTint, color: T.primaryDeep,
              } : {},
            }}>+ Ajouter une catégorie</Box>
        </Box>
      </Box>
    </Box>
  );
}

function SortableCategory({ category, onUpdate, onDelete }: {
  category: SupportCategory;
  onUpdate: (patch: Partial<SupportCategory>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style} sx={{
      border: `1px solid ${expanded ? T.primary : T.border}`,
      borderRadius: 1, bgcolor: '#fff',
    }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, p: 1.25 }}>
        <Box {...attributes} {...listeners} sx={{ cursor: 'grab', color: T.text3, fontSize: 16 }}>⠿</Box>
        <Box sx={{ fontSize: 20 }}>{category.icon}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => setExpanded(e => !e)} role="button" tabIndex={0}>
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{category.label.fr}</Typography>
          <Typography sx={{ fontSize: 11, color: T.text3 }}>
            {category.description?.fr || category.id} · {priorityMeta(category.defaultUrgency).emoji}{' '}
            {priorityMeta(category.defaultUrgency).labelFr}
            {!category.guestCanChoosePriority ? ' · forcée' : ' · client choisit'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onDelete} sx={{ color: T.error }}>✕</IconButton>
      </Stack>

      {expanded && (
        <Box sx={{ p: '14px 16px', display: 'flex', flexDirection: 'column', gap: 1.5, borderTop: `1px solid ${T.border}` }}>
          <FormRow label="ID (slug)" help="Lettres minuscules et underscores · unique">
            <input style={inputSx} value={category.id} onChange={e => onUpdate({ id: e.target.value.replace(/[^a-z_]/g, '') })} />
          </FormRow>
          <GuestLangTextFields
            fieldLabel="Libellé"
            requiredFr
            dense
            autoFillMissing
            value={mergeGuestLangMap(category.label)}
            onChange={(label) => onUpdate({ label })}
            helperText="FR requis · ✨ génère les autres langues (WhatsApp)."
            maxLength={40}
          />
          <GuestLangTextFields
            fieldLabel="Description"
            dense
            autoFillMissing
            value={mergeGuestLangMap(category.description)}
            onChange={(description) => onUpdate({ description })}
            multiline
            rows={2}
            maxLength={60}
          />
          <FormRow label="Icône" help="Emoji">
            <input style={{ ...inputSx, width: 60, textAlign: 'center', fontSize: 18 }} value={category.icon}
              onChange={e => onUpdate({ icon: e.target.value })} />
          </FormRow>
          <FormRow label="Urgence par défaut" help="Normal · Haute · Critique">
            <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
              {SUPPORT_PRIORITIES.map(p => {
                const on = category.defaultUrgency === p.id;
                return (
                  <Box
                    key={p.id}
                    component="button"
                    type="button"
                    onClick={() => onUpdate({ defaultUrgency: p.id as SupportPriority })}
                    sx={{
                      all: 'unset',
                      cursor: 'pointer',
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 0.875,
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      ...(on
                        ? { bgcolor: p.bg, color: p.fg, border: `1px solid ${p.fg}` }
                        : { bgcolor: T.bg1, color: T.text3, border: `1px solid ${T.border}` }),
                    }}
                  >
                    <span>{p.emoji}</span>
                    {p.labelFr}
                  </Box>
                );
              })}
            </Stack>
          </FormRow>
          <FormRow label="Affichage voyageur" help="Forcer l’urgence ou laisser le voyageur choisir">
            <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
              <Box
                component="button"
                type="button"
                onClick={() => onUpdate({ guestCanChoosePriority: false })}
                sx={urgencyModeBtnSx(!category.guestCanChoosePriority, T)}
              >
                Forcer cette urgence
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => onUpdate({ guestCanChoosePriority: true })}
                sx={urgencyModeBtnSx(category.guestCanChoosePriority, T)}
              >
                Laisser le voyageur choisir
              </Box>
            </Stack>
          </FormRow>
        </Box>
      )}
    </Box>
  );
}

const inputSx: React.CSSProperties = {
  width: '100%', padding: '8px 11px', border: `1px solid ${T.border}`,
  borderRadius: 7, background: T.bg1, fontSize: 13, color: T.text, fontFamily: 'inherit',
  boxSizing: 'border-box',
};

function urgencyModeBtnSx(active: boolean, tokens: typeof T) {
  return {
    all: 'unset' as const,
    cursor: 'pointer',
    px: 1.5,
    py: 0.75,
    borderRadius: 0.875,
    fontSize: 12,
    fontWeight: 700,
    ...(active
      ? { bgcolor: tokens.primaryTint, color: tokens.primaryDeep, border: `1px solid ${tokens.primary}` }
      : { bgcolor: tokens.bg1, color: tokens.text3, border: `1px solid ${tokens.border}` }),
  };
}
