// ════════════════════════════════════════════════════════════════════
// SupportConfigTab.tsx
// Sojori PM Dashboard · Atelier 2026 · Section Support
//
// Layout 2 colonnes : form (gauche) · WhatsApp preview live (droite)
// Drag & drop : @dnd-kit (moderne, accessible, sans dépendances obsolètes)
// ════════════════════════════════════════════════════════════════════
import React, { useState, useCallback } from 'react';
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
import type { SupportConfig, SupportCategory, UrgencyLevel } from './types';
import { SOJORI_TOKENS, URGENCY_COLORS, DEFAULT_CATEGORIES } from './types';
import WhatsAppPreview from './WhatsAppPreview';

const T = SOJORI_TOKENS;
const MAX_CATEGORIES = 10;

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
      defaultUrgency: 'NORMAL',
      urgencyLocked: false,
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
      if (onSave) await onSave(config);
      setSavingState('saved');
      setTimeout(() => setSavingState('idle'), 2000);
    }, 800);
  }, [config, onSave]);

  // ─── Render ───────────────────────────────────────────────
  const enabledCount = config.categories.filter(c => c.enabled).length;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 3, p: 3 }}>

      {/* ═══ LEFT · FORM ═══ */}
      <Box>
        <Stack direction="row" alignItems="flex-start" gap={2} sx={{ mb: 3 }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: 1.625,
            background: `linear-gradient(135deg, ${T.primarySoft}, ${T.primaryDeep})`,
            color: '#1a1408', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0,
            boxShadow: '0 6px 16px rgba(184,133,26,0.25)',
          }}>🆘</Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" gap={1.25}>
              <Typography sx={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em' }}>
                Support client
              </Typography>
              <Box sx={{
                fontSize: 9.5, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
                bgcolor: T.successTint, color: T.success, px: 0.875, py: 0.25,
                borderRadius: 0.625, letterSpacing: '0.06em',
              }}>WA · OUI</Box>
            </Stack>
            <Typography sx={{ fontSize: 13, color: T.text3, mt: 0.625, lineHeight: 1.55 }}>
              Catégories affichées dans le flow support du voyageur.
              <b style={{ color: T.text }}> Quand OFF</b> : le bouton "Signaler un problème" disparaît du menu WhatsApp.
            </Typography>
          </Box>
          <Stack direction="row" alignItems="center" gap={1.125} sx={{
            p: '6px 11px', bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.125,
          }}>
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: T.text2 }}>Activer support</Typography>
            <Toggle on={config.enabled} onChange={() => { setConfig(c => ({ ...c, enabled: !c.enabled })); debouncedSave(); }} />
          </Stack>
        </Stack>

        {/* Save indicator */}
        {savingState !== 'idle' && (
          <Box sx={{
            mb: 1.5, fontSize: 10.5, color: savingState === 'saved' ? T.success : T.text3,
            fontFamily: '"Geist Mono", monospace', fontWeight: 700, letterSpacing: '0.04em',
          }}>{savingState === 'saving' ? '⏳ Enregistrement…' : '✓ Sauvegardé · il y a 2s'}</Box>
        )}

        {/* Card · catégories */}
        <Box sx={{
          bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.625,
          overflow: 'hidden', boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
        }}>
          <Stack direction="row" alignItems="center" gap={1.5} sx={{
            p: '14px 16px', borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2,
          }}>
            <Box sx={{
              width: 34, height: 34, borderRadius: 1, bgcolor: T.primaryTint,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>📋</Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.005em' }}>
                Catégories de support
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.25, fontWeight: 500 }}>
                {config.categories.length} / {MAX_CATEGORIES} max · ID slug + label + urgence
              </Typography>
            </Box>
            <Box sx={{
              fontFamily: '"Geist Mono", monospace', fontSize: 10, color: T.text3,
              bgcolor: T.bg1, border: `1px solid ${T.border}`,
              px: 0.875, py: 0.25, borderRadius: 0.625, fontWeight: 700, letterSpacing: '0.04em',
            }}>support.categories[]</Box>
          </Stack>

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

        {/* When-off note */}
        <Box sx={{
          mt: 2, p: '11px 13px', bgcolor: T.bg2, border: `1px solid ${T.border}`,
          borderRadius: 1.125, fontSize: 11.5, color: T.text3, display: 'flex',
          alignItems: 'flex-start', gap: 1, lineHeight: 1.5,
        }}>
          <Box sx={{ fontSize: 14 }}>💡</Box>
          <Box><b style={{ color: T.text }}>Quand support OFF</b> · le bouton "Signaler un problème"
            est masqué du menu WhatsApp principal. Les catégories désactivées individuellement
            disparaissent du flow de sélection mais le bouton reste visible.</Box>
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
        <WhatsAppPreview categories={config.categories.filter(c => c.enabled && config.enabled)} />
        <Typography sx={{
          textAlign: 'center', fontSize: 10.5, color: T.text3, mt: 1.5,
          fontFamily: '"Geist Mono", monospace', letterSpacing: '0.04em',
        }}>Flow Support · 1 écran · {enabledCount} catégorie{enabledCount > 1 ? 's' : ''} active{enabledCount > 1 ? 's' : ''}</Typography>
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
      ...(!category.enabled ? { opacity: 0.55 } : {}),
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
            {category.description?.fr || category.id} · {URGENCY_COLORS[category.defaultUrgency].label}
          </Typography>
        </Box>
        <Toggle on={category.enabled} sm onChange={() => onUpdate({ enabled: !category.enabled })} />
        <IconButton size="small" onClick={onDelete} sx={{
          width: 24, height: 24, borderRadius: 0.75, color: T.text3, fontSize: 13,
          '&:hover': { bgcolor: T.errorTint, color: T.error },
        }}>✕</IconButton>
      </Stack>

      {expanded && (
        <Box sx={{ p: '14px 16px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <FormRow label="ID (slug)" help="Lettres minuscules + underscores · unique">
            <input style={inputSx} value={category.id} onChange={e => onUpdate({ id: e.target.value.replace(/[^a-z_]/g, '') })} />
          </FormRow>
          <FormRow label="Label (FR)" required help="Max 40 caractères">
            <input style={inputSx} value={category.label.fr} maxLength={40}
              onChange={e => onUpdate({ label: { ...category.label, fr: e.target.value } })} />
          </FormRow>
          <FormRow label="Label (EN)" required>
            <input style={inputSx} value={category.label.en} maxLength={40}
              onChange={e => onUpdate({ label: { ...category.label, en: e.target.value } })} />
          </FormRow>
          <FormRow label="Label (AR)" help="Optionnel">
            <input style={{ ...inputSx, direction: 'rtl', textAlign: 'right' }} value={category.label.ar || ''} maxLength={40}
              onChange={e => onUpdate({ label: { ...category.label, ar: e.target.value } })} />
          </FormRow>
          <FormRow label="Description" help="Sous le label dans WA · max 60 car.">
            <input style={inputSx} value={category.description?.fr || ''} maxLength={60}
              onChange={e => onUpdate({ description: { fr: e.target.value, en: category.description?.en || '' } })} />
          </FormRow>
          <FormRow label="Icône" help="Emoji uniquement">
            <input style={{ ...inputSx, width: 60, textAlign: 'center', fontSize: 18 }} value={category.icon}
              onChange={e => onUpdate({ icon: e.target.value })} />
          </FormRow>
          <FormRow label="Urgence par défaut">
            <Stack direction="row" gap={0.5}>
              {(Object.keys(URGENCY_COLORS) as UrgencyLevel[]).map(u => {
                const c = URGENCY_COLORS[u];
                const on = category.defaultUrgency === u;
                return (
                  <Box key={u} component="button" onClick={() => onUpdate({ defaultUrgency: u })} sx={{
                    all: 'unset', cursor: 'pointer', px: 1.25, py: 0.625, borderRadius: 0.75,
                    fontSize: 10.5, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
                    letterSpacing: '0.04em',
                    ...(on
                      ? { bgcolor: c.bg, color: c.fg }
                      : { bgcolor: T.bg1, color: T.text3, border: `1px solid ${T.border}` }),
                  }}>{c.label}</Box>
                );
              })}
            </Stack>
          </FormRow>
          <Box component="label" sx={{
            display: 'flex', alignItems: 'center', gap: 1.125, fontSize: 12, cursor: 'pointer',
            color: T.text2,
          }}>
            <Toggle sm on={category.urgencyLocked} onChange={() => onUpdate({ urgencyLocked: !category.urgencyLocked })} />
            Verrouiller l'urgence côté voyageur
          </Box>
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

function FormRow({ label, required, help, children }: {
  label: string; required?: boolean; help?: string; children: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 1.5, alignItems: 'flex-start' }}>
      <Box sx={{ pt: 0.875 }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: T.text2 }}>
          {label}{required && <Box component="span" sx={{ color: T.error, ml: 0.25 }}>*</Box>}
        </Typography>
        {help && <Typography sx={{
          fontSize: 10.5, color: T.text4, fontFamily: '"Geist Mono", monospace',
          fontWeight: 600, mt: 0.375, letterSpacing: '0.02em', lineHeight: 1.4,
        }}>{help}</Typography>}
      </Box>
      <Box>{children}</Box>
    </Box>
  );
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
