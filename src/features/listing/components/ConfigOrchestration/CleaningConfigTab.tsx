// ════════════════════════════════════════════════════════════════════
// CleaningConfigTab.tsx
// Configuration conciergerie avec design Claude
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Stack,
  Typography,
  IconButton,
  TextField,
  Switch,
  Button,
  Tooltip,
  Collapse,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
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
import axios from 'axios';
import { SOJORI_TOKENS } from './types';

const T = SOJORI_TOKENS;

interface LocalizedString {
  fr: string;
  en: string;
  ar?: string;
}

interface CleaningType {
  id: string;
  label: LocalizedString;
  description?: LocalizedString;
  icon: string;
  price: number;
  duration: string;
  enabled: boolean;
  order: number;
}

interface CleaningConfig {
  enabled: boolean;
  cleaningTypes: CleaningType[];
}

const DEFAULT_CLEANING_TYPES: CleaningType[] = [
  {
    id: 'standard',
    label: { fr: 'Ménage standard', en: 'Standard cleaning', ar: 'تنظيف قياسي' },
    description: { fr: 'Nettoyage complet du logement', en: 'Complete property cleaning', ar: 'تنظيف كامل للسكن' },
    icon: '🧹',
    price: 150,
    duration: '2-3h',
    enabled: true,
    order: 0,
  },
  {
    id: 'deep',
    label: { fr: 'Ménage approfondi', en: 'Deep cleaning', ar: 'تنظيف عميق' },
    description: { fr: 'Nettoyage en profondeur', en: 'Deep cleaning', ar: 'تنظيف شامل' },
    icon: '✨',
    price: 300,
    duration: '4-5h',
    enabled: true,
    order: 1,
  },
];

interface Props {
  listingId: string;
  ownerId?: string;
}

export default function CleaningConfigTab({ listingId }: Props) {
  const [config, setConfig] = useState<CleaningConfig>({ enabled: true, cleaningTypes: DEFAULT_CLEANING_TYPES });
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchConfig();
  }, [listingId]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/v1/listing/internal/${listingId}/cleaning-config`);
      const data = res.data?.data;
      if (data && data.cleaningTypes && data.cleaningTypes.length > 0) {
        setConfig(data);
      } else {
        setConfig({ enabled: true, cleaningTypes: DEFAULT_CLEANING_TYPES });
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setConfig({ enabled: true, cleaningTypes: DEFAULT_CLEANING_TYPES });
      }
    } finally {
      setLoading(false);
    }
  };

  const debouncedSave = useCallback(() => {
    setSavingState('saving');
    if ((debouncedSave as any)._t) clearTimeout((debouncedSave as any)._t);
    (debouncedSave as any)._t = setTimeout(async () => {
      try {
        await axios.post(`/api/v1/listing/internal/${listingId}/cleaning-config`, config);
        setSavingState('saved');
        setTimeout(() => setSavingState('idle'), 2000);
      } catch (error) {
        setSavingState('idle');
      }
    }, 800);
  }, [config, listingId]);

  useEffect(() => {
    if (!loading) {
      debouncedSave();
    }
  }, [config, loading]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setConfig((prev) => {
        const oldIndex = prev.cleaningTypes.findIndex((s) => s.id === active.id);
        const newIndex = prev.cleaningTypes.findIndex((s) => s.id === over.id);
        const reordered = arrayMove(prev.cleaningTypes, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }));
        return { ...prev, cleaningTypes: reordered };
      });
    }
  };

  const addCleaningType = () => {
    const newType: CleaningType = {
      id: `cleaning-${Date.now()}`,
      label: { fr: 'Nouveau type', en: 'New type', ar: 'نوع جديد' },
      description: { fr: '', en: '', ar: '' },
      icon: '🧽',
      price: 0,
      duration: '',
      enabled: true,
      order: config.cleaningTypes.length,
    };
    setConfig((prev) => ({ ...prev, cleaningTypes: [...prev.cleaningTypes, newType] }));
  };

  const deleteCleaningType = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      cleaningTypes: prev.cleaningTypes.filter((c) => c.id !== id),
    }));
  };

  const updateCleaningType = (id: string, updates: Partial<CleaningType>) => {
    setConfig((prev) => ({
      ...prev,
      cleaningTypes: prev.cleaningTypes.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 8 }}>
        <Typography>Chargement...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography sx={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em' }}>
            🧹 Ménage
          </Typography>
          <Typography sx={{ fontSize: 13, color: T.text3, mt: 0.5 }}>
            Types de ménage proposés aux voyageurs via WhatsApp.
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            Activer ménage
          </Typography>
          <Switch
            checked={config.enabled}
            onChange={(e) => setConfig((prev) => ({ ...prev, enabled: e.target.checked }))}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': { color: T.primary },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: T.primary },
            }}
          />
        </Stack>
      </Stack>

      {/* Status badge */}
      <Box sx={{
        display: 'inline-flex',
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        bgcolor: savingState === 'saved' ? '#e8f5e9' : savingState === 'saving' ? '#fff3e0' : T.bg2,
        border: `1px solid ${savingState === 'saved' ? '#4caf50' : savingState === 'saving' ? '#ff9800' : T.border}`,
        mb: 3,
      }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: savingState === 'saved' ? '#2e7d32' : savingState === 'saving' ? '#e65100' : T.text3 }}>
          {savingState === 'saved' ? '✓ Sauvegardé' : savingState === 'saving' ? '⏳ Sauvegarde...' : 'Aucun changement'}
        </Typography>
      </Box>

      {/* Services list */}
      <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.text3, mb: 1.5 }}>
        🧽 Types de ménage ({config.cleaningTypes.length} / 15 max)
      </Typography>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={config.cleaningTypes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <Stack spacing={1.5}>
            {config.cleaningTypes.map((type) => (
              <SortableCleaningType
                key={type.id}
                type={type}
                onUpdate={(updates) => updateCleaningType(type.id, updates)}
                onDelete={() => deleteCleaningType(type.id)}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>

      {/* Add button */}
      {config.cleaningTypes.length < 10 && (
        <Button
          variant="outlined"
          onClick={addCleaningType}
          sx={{
            mt: 2,
            borderColor: T.border,
            color: T.text2,
            '&:hover': { borderColor: T.primary, bgcolor: T.bg2 },
          }}
        >
          + Ajouter un type de ménage
        </Button>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// SortableCleaningType
// ════════════════════════════════════════════════════════════════════
function SortableCleaningType({
  type,
  onUpdate,
  onDelete,
}: {
  type: CleaningType;
  onUpdate: (updates: Partial<CleaningType>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: type.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Safety check: ensure type has valid structure
  if (!type.label || !type.label.fr) {
    return null;
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        border: `2px solid ${expanded ? T.primary : T.border}`,
        borderRadius: 1.5,
        p: 2,
        bgcolor: '#fff',
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.12)' : 'none',
      }}
    >
      {/* Header */}
      <Stack direction="row" alignItems="center" gap={1.5}>
        <Box
          {...attributes}
          {...listeners}
          sx={{
            cursor: 'grab',
            color: T.text3,
            fontSize: 16,
            '&:active': { cursor: 'grabbing' },
          }}
        >
          ⠿
        </Box>

        <Switch
          checked={type.enabled}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
          size="small"
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': { color: T.primary },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: T.primary },
          }}
        />

        <Box sx={{ fontSize: 20, flexShrink: 0 }}>{type.icon}</Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{type.label.fr}</Typography>
          {type.description && (
            <Typography sx={{ fontSize: 12, color: T.text3 }}>{type.description.fr}</Typography>
          )}
        </Box>

        <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.primary }}>{type.price} MAD</Typography>
        <Typography sx={{ fontSize: 12, color: T.text3 }}>{type.duration}</Typography>

        <IconButton size="small" onClick={() => setExpanded(!expanded)}>
          <Box sx={{ fontSize: 18 }}>{expanded ? '▲' : '▼'}</Box>
        </IconButton>

        <Tooltip title="Supprimer">
          <IconButton size="small" onClick={onDelete} sx={{ color: '#c62828' }}>
            ✕
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Expanded form */}
      <Collapse in={expanded}>
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${T.border}` }}>
          <Stack spacing={2}>
            {/* Icon */}
            <TextField
              size="small"
              label="Icône (emoji)"
              value={type.icon}
              onChange={(e) => onUpdate({ icon: e.target.value })}
              fullWidth
            />

            {/* Label FR/EN */}
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', mb: 0.5 }}>
                Label
              </Typography>
              <Stack spacing={1}>
                <TextField
                  size="small"
                  label="FR"
                  value={type.label.fr}
                  onChange={(e) => onUpdate({ label: { ...type.label, fr: e.target.value } })}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="EN"
                  value={type.label.en}
                  onChange={(e) => onUpdate({ label: { ...type.label, en: e.target.value } })}
                  fullWidth
                />
              </Stack>
            </Box>

            {/* Description */}
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', mb: 0.5 }}>
                Description
              </Typography>
              <Stack spacing={1}>
                <TextField
                  size="small"
                  label="FR"
                  value={type.description?.fr || ''}
                  onChange={(e) => onUpdate({ description: { ...type.description, fr: e.target.value } as LocalizedString })}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="EN"
                  value={type.description?.en || ''}
                  onChange={(e) => onUpdate({ description: { ...type.description, en: e.target.value } as LocalizedString })}
                  fullWidth
                />
              </Stack>
            </Box>

            {/* Prix et durée */}
            <Stack direction="row" spacing={2}>
              <TextField
                size="small"
                label="Prix (MAD)"
                type="number"
                value={type.price}
                onChange={(e) => onUpdate({ price: Number(e.target.value) })}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Durée"
                value={type.duration}
                onChange={(e) => onUpdate({ duration: e.target.value })}
                placeholder="ex: 2-3h"
                sx={{ flex: 1 }}
              />
            </Stack>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}
