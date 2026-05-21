// ════════════════════════════════════════════════════════════════════
// SupportConfigTab.tsx
// Sojori PM Dashboard · Atelier 2026 · Section Support
//
// Layout 2 colonnes : form (gauche) · WhatsApp preview live (droite)
// Drag & drop : @dnd-kit (moderne, accessible, sans dépendances obsolètes)
// ════════════════════════════════════════════════════════════════════
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Stack, Typography, IconButton, Tooltip } from '@mui/material';
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
import WhatsAppPreview from './WhatsAppPreview';

const T = SOJORI_TOKENS;
const MAX_CATEGORIES = 50;

export interface SupportConfigTabProps {
  initial?: SupportConfig;
  listingId: string;
  onSave?: (config: SupportConfig) => Promise<void>;
}

export default function SupportConfigTab({ initial, listingId, onSave }: SupportConfigTabProps) {
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

  // ─── Mutations ────────────────────────────────────────────
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
      label: { fr: 'Nouvelle catégorie', en: 'New category' },
      description: { fr: '', en: '' },
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

  // ─── Auto-save (debounced 800ms) ──────────────────────────
  const debouncedSave = useCallback(() => {
    setSavingState('saving');
    if ((debouncedSave as any)._t) clearTimeout((debouncedSave as any)._t);
    (debouncedSave as any)._t = setTimeout(async () => {
      if (onSave) await onSave(configRef.current);
      setSavingState('saved');
      setTimeout(() => setSavingState('idle'), 2000);
    }, 800);
  }, [onSave]);

  // ─── Render ───────────────────────────────────────────────
  const categoryCount = config.categories.length;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 3, p: 3 }}>

      {/* ═══ LEFT · FORM ═══ */}
      <Box>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1}
          sx={{ mb: 1.5 }}
        >
          <Typography sx={{ fontSize: 13, color: T.text2, lineHeight: 1.5 }}>
            Flow « Signaler un problème » · libellés, icônes, urgence (Normal / Haute / Critique).
            <Box component="span" sx={{ color: T.text3 }}> · Activation : </Box>
            <Box component="span" sx={{ fontWeight: 700, color: T.text }}>Menu WhatsApp</Box>
          </Typography>
          {savingState !== 'idle' && (
            <Typography
              sx={{
                fontSize: 10.5,
                color: savingState === 'saved' ? T.success : T.text3,
                fontFamily: '"Geist Mono", monospace',
                fontWeight: 700,
              }}
            >
              {savingState === 'saving' ? '⏳ …' : '✓ OK'}
            </Typography>
          )}
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1, px: 0.25 }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text3 }}>
            {categoryCount} catégorie{categoryCount > 1 ? 's' : ''}
          </Typography>
        </Stack>

        <Box sx={{
          bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.625,
          overflow: 'hidden', boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
        }}>
          <Box sx={{ p: 2 }}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={config.categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <Stack gap={1}>
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

      {/* ═══ RIGHT · WHATSAPP PREVIEW ═══ */}
      <Box sx={{
        bgcolor: 'linear-gradient(180deg, #f0eee8, #e7e1d2)',
        background: 'linear-gradient(180deg, #f0eee8, #e7e1d2)',
        borderRadius: 1.625, p: 3, position: 'sticky', top: 80, alignSelf: 'flex-start',
      }}>
        <Stack direction="row" alignItems="center" gap={1.125} sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800 }}>📱 Aperçu WhatsApp</Typography>
          <Box sx={{
            ml: 'auto', display: 'inline-flex', alignItems: 'center', gap: 0.625,
            fontSize: 9.5, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
            color: T.success, bgcolor: T.successTint, px: 1, py: 0.375,
            borderRadius: '99px', letterSpacing: '0.04em',
            '&::before': { content: '""', width: 6, height: 6, borderRadius: '50%', bgcolor: T.success },
          }}>LIVE</Box>
        </Stack>
        <WhatsAppPreview categories={config.categories} />
        <Typography sx={{
          textAlign: 'center', fontSize: 10.5, color: T.text3, mt: 1.5,
          fontFamily: '"Geist Mono", monospace', letterSpacing: '0.04em',
        }}>Flow Support · 1 écran · {categoryCount} catégorie{categoryCount > 1 ? 's' : ''}</Typography>
      </Box>
    </Box>
  );
}

/* ═══════════════════ SortableCategory ═══════════════════ */
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

  // Safety check: ensure category has valid structure
  if (!category.label || !category.label.fr) {
    return null;
  }

  return (
    <Box ref={setNodeRef} style={style} sx={{
      bgcolor: T.bg2, border: `1px solid ${T.border}`, borderRadius: 1.25, overflow: 'hidden',
    }}>
      <Stack direction="row" alignItems="center" gap={1.25} sx={{
        p: '11px', bgcolor: T.bg1, borderBottom: expanded ? `1px solid ${T.border}` : 0,
      }}>
        <Box {...attributes} {...listeners} sx={{
          color: T.text3, cursor: 'grab', fontSize: 14, flexShrink: 0,
          '&:active': { cursor: 'grabbing' },
        }}>⠿</Box>
        <Box sx={{ fontSize: 18, flexShrink: 0 }}>{category.icon}</Box>
        <Box sx={{ flex: 1, cursor: 'pointer', minWidth: 0 }} onClick={() => setExpanded(e => !e)}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.005em', lineHeight: 1.3 }}>
            {category.label.fr}
          </Typography>
          <Typography sx={{
            fontSize: 11, color: T.text3, fontWeight: 500, mt: 0.25,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {category.description?.fr || category.id} · {priorityMeta(category.defaultUrgency).emoji}{' '}
            {priorityMeta(category.defaultUrgency).labelFr}
            {!category.guestCanChoosePriority ? ' · forcée' : ' · client choisit'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onDelete} sx={{
          width: 24, height: 24, borderRadius: 0.75, color: T.text3, fontSize: 13,
          '&:hover': { bgcolor: T.errorTint, color: T.error },
        }}>✕</IconButton>
      </Stack>

      {expanded && (
        <Box sx={{ p: '14px 16px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <FormRow label="ID (slug)" help="Lettres minuscules + underscores · unique" schemaHint="categories[].id" inSchema>
            <input style={inputSx} value={category.id} onChange={e => onUpdate({ id: e.target.value.replace(/[^a-z_]/g, '') })} />
          </FormRow>
          <FormRow label="Label" required help="BD: name.fr (EN/AR = copie FR)" schemaHint="categories[].name.fr" inSchema>
            <input style={inputSx} value={category.label.fr} maxLength={40}
              onChange={e => {
                const fr = e.target.value;
                onUpdate({ label: { fr, en: fr, ar: fr } });
              }} />
          </FormRow>
          <FormRow label="Description" help="Sous le label dans WA · max 60 car." schemaHint="categories[].description.fr" inSchema>
            <input style={inputSx} value={category.description?.fr || ''} maxLength={60}
              onChange={e => {
                const fr = e.target.value;
                onUpdate({ description: { fr, en: fr, ar: fr } });
              }} />
          </FormRow>
          <FormRow label="Icône" help="Emoji uniquement">
            <input style={{ ...inputSx, width: 60, textAlign: 'center', fontSize: 18 }} value={category.icon}
              onChange={e => onUpdate({ icon: e.target.value })} />
          </FormRow>
          <FormRow
            label="Urgence par défaut"
            help="Comme Operto / Guesty : 3 niveaux"
            schemaHint="categories[].priority"
            inSchema
          >
            <Stack direction="row" gap={0.75} flexWrap="wrap">
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
          <FormRow
            label="Affichage voyageur"
            help="Forcer = urgence imposée · Client = choix dans le flow WA"
            schemaHint="fields.__sojori.guestCanChoosePriority"
            inSchema
          >
            <Stack direction="row" gap={0.75} flexWrap="wrap">
              <Box
                component="button"
                type="button"
                onClick={() => onUpdate({ guestCanChoosePriority: false })}
                sx={urgencyModeBtnSx(!category.guestCanChoosePriority, T)}
              >
                🔒 Forcer cette urgence
              </Box>
              <Box
                component="button"
                type="button"
                onClick={() => onUpdate({ guestCanChoosePriority: true })}
                sx={urgencyModeBtnSx(category.guestCanChoosePriority, T)}
              >
                👤 Laisser le voyageur choisir
              </Box>
            </Stack>
          </FormRow>
        </Box>
      )}
    </Box>
  );
}

/* ═══════════════════ Helpers ═══════════════════ */
const inputSx: React.CSSProperties = {
  width: '100%', padding: '8px 11px', border: `1px solid ${T.border}`,
  borderRadius: 7, background: T.bg1, fontSize: 13, color: T.text, fontFamily: 'inherit',
  boxSizing: 'border-box',
};

function FormRow({ label, required, help, children, inSchema = true, schemaHint }: {
  label: string; required?: boolean; help?: string; children: React.ReactNode;
  inSchema?: boolean; schemaHint?: string;
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr 180px', gap: 1.5, alignItems: 'flex-start' }}>
      <Box sx={{ pt: 0.875 }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: T.text2 }}>
          {label}{required && <Box component="span" sx={{ color: T.error, ml: 0.25 }}>*</Box>}
        </Typography>
        {help && <Typography sx={{
          fontSize: 10.5, color: T.text4, fontFamily: '"Geist Mono", monospace',
          fontWeight: 600, mt: 0.375, letterSpacing: '0.02em', lineHeight: 1.4,
        }}>{help}</Typography>}
      </Box>
      <Box sx={{
        border: `1px solid ${inSchema ? T.border : T.error}`,
        borderRadius: 1,
        p: 0.5,
        bgcolor: inSchema ? 'transparent' : T.errorTint,
      }}>{children}</Box>
      {schemaHint && (
        <Typography sx={{
          fontSize: 9.5, fontFamily: '"Geist Mono", monospace', color: inSchema ? T.success : T.error,
          pt: 0.75,
        }}>
          {inSchema ? '✓' : '⚠'} {schemaHint}
        </Typography>
      )}
    </Box>
  );
}

function urgencyModeBtnSx(active: boolean, t: typeof T) {
  return {
    all: 'unset' as const,
    cursor: 'pointer',
    px: 1.375,
    py: 0.875,
    borderRadius: 0.875,
    fontSize: 12,
    fontWeight: 700,
    ...(active
      ? { bgcolor: t.primaryTint, color: t.primaryDeep, border: `1px solid ${t.primary}` }
      : { bgcolor: t.bg1, color: t.text3, border: `1px solid ${t.border}` }),
  };
}

function Toggle({ on, sm, onChange }: { on: boolean; sm?: boolean; onChange: () => void }) {
  const w = sm ? 28 : 36; const h = sm ? 16 : 20; const knob = sm ? 12 : 16;
  return (
    <Box onClick={onChange} sx={{
      width: w, height: h, borderRadius: '99px', position: 'relative', flexShrink: 0, cursor: 'pointer',
      background: on ? `linear-gradient(135deg, #cb9b2c, ${T.primary})` : T.borderStrong,
      transition: 'background 0.2s',
      '&::after': {
        content: '""', position: 'absolute', top: 2, left: 2, width: knob, height: knob,
        bgcolor: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.20)',
        transition: 'transform 0.2s',
        ...(on ? { transform: `translateX(${w - knob - 4}px)` } : {}),
      },
    }} />
  );
}
