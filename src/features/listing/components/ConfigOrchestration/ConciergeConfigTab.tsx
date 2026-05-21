// ════════════════════════════════════════════════════════════════════
// ConciergeConfigTab.tsx
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

type PriceType = 'FIXED' | 'PER_HOUR' | 'ON_QUOTE';

interface ConciergeService {
  id: string;
  label: LocalizedString;
  description?: LocalizedString;
  icon: string;
  price: number;
  priceType: PriceType;
  enabled: boolean;
  order: number;
}

interface ConciergeConfig {
  enabled: boolean;
  services: ConciergeService[];
}

const DEFAULT_SERVICES: ConciergeService[] = [
  {
    id: 'babysitting',
    label: { fr: 'Babysitting', en: 'Babysitting', ar: 'مربية أطفال' },
    description: { fr: 'Garde d\'enfants qualifiée', en: 'Qualified childcare', ar: 'رعاية أطفال مؤهلة' },
    icon: '👶',
    price: 80,
    priceType: 'PER_HOUR',
    enabled: true,
    order: 0,
  },
  {
    id: 'massage',
    label: { fr: 'Massage', en: 'Massage', ar: 'تدليك' },
    description: { fr: 'Massage relaxant à domicile', en: 'Relaxing home massage', ar: 'تدليك استرخائي في المنزل' },
    icon: '💆',
    price: 350,
    priceType: 'FIXED',
    enabled: true,
    order: 1,
  },
  {
    id: 'chef',
    label: { fr: 'Chef à domicile', en: 'Private chef', ar: 'طاهٍ خاص' },
    description: { fr: 'Repas préparé par un chef', en: 'Meal prepared by a chef', ar: 'وجبة يعدها طاهٍ' },
    icon: '👨‍🍳',
    price: 0,
    priceType: 'ON_QUOTE',
    enabled: true,
    order: 2,
  },
];

interface Props {
  listingId: string;
  ownerId?: string;
}

export default function ConciergeConfigTab({ listingId }: Props) {
  const [config, setConfig] = useState<ConciergeConfig>({ enabled: true, services: DEFAULT_SERVICES });
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
      const res = await axios.get(`/api/v1/listing/internal/${listingId}/concierge-config`);
      const data = res.data?.data;
      if (data && data.services && data.services.length > 0) {
        setConfig(data);
      } else {
        setConfig({ enabled: true, services: DEFAULT_SERVICES });
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setConfig({ enabled: true, services: DEFAULT_SERVICES });
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
        await axios.post(`/api/v1/listing/internal/${listingId}/concierge-config`, config);
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
        const oldIndex = prev.services.findIndex((s) => s.id === active.id);
        const newIndex = prev.services.findIndex((s) => s.id === over.id);
        const reordered = arrayMove(prev.services, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }));
        return { ...prev, services: reordered };
      });
    }
  };

  const addService = () => {
    const newService: ConciergeService = {
      id: `service-${Date.now()}`,
      label: { fr: 'Nouveau service', en: 'New service', ar: 'خدمة جديدة' },
      description: { fr: '', en: '', ar: '' },
      icon: '✨',
      price: 0,
      priceType: 'FIXED',
      enabled: true,
      order: config.services.length,
    };
    setConfig((prev) => ({ ...prev, services: [...prev.services, newService] }));
  };

  const deleteService = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s.id !== id),
    }));
  };

  const updateService = (id: string, updates: Partial<ConciergeService>) => {
    setConfig((prev) => ({
      ...prev,
      services: prev.services.map((s) => (s.id === id ? { ...s, ...updates } : s)),
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
            🛎️ Conciergerie
          </Typography>
          <Typography sx={{ fontSize: 13, color: T.text3, mt: 0.5 }}>
            Services sur-mesure proposés aux voyageurs via WhatsApp.
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            Activer conciergerie
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
        🎯 Services ({config.services.length} / 15 max)
      </Typography>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={config.services.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <Stack spacing={1.5}>
            {config.services.map((service) => (
              <SortableService
                key={service.id}
                service={service}
                onUpdate={(updates) => updateService(service.id, updates)}
                onDelete={() => deleteService(service.id)}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>

      {/* Add button */}
      {config.services.length < 15 && (
        <Button
          variant="outlined"
          onClick={addService}
          sx={{
            mt: 2,
            borderColor: T.border,
            color: T.text2,
            '&:hover': { borderColor: T.primary, bgcolor: T.bg2 },
          }}
        >
          + Ajouter un service
        </Button>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// SortableService
// ════════════════════════════════════════════════════════════════════
function SortableService({
  service,
  onUpdate,
  onDelete,
}: {
  service: ConciergeService;
  onUpdate: (updates: Partial<ConciergeService>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: service.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Safety check: ensure service has valid structure
  if (!service.label || !service.label.fr) {
    return null;
  }

  const getPriceLabel = () => {
    if (service.priceType === 'ON_QUOTE') return 'Sur devis';
    if (service.priceType === 'PER_HOUR') return `${service.price} MAD/h`;
    return `${service.price} MAD`;
  };

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
          checked={service.enabled}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
          size="small"
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': { color: T.primary },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: T.primary },
          }}
        />

        <Box sx={{ fontSize: 20, flexShrink: 0 }}>{service.icon}</Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{service.label.fr}</Typography>
          {service.description && (
            <Typography sx={{ fontSize: 12, color: T.text3 }}>{service.description.fr}</Typography>
          )}
        </Box>

        <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.primary }}>{getPriceLabel()}</Typography>

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
              value={service.icon}
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
                  value={service.label.fr}
                  onChange={(e) => onUpdate({ label: { ...service.label, fr: e.target.value } })}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="EN"
                  value={service.label.en}
                  onChange={(e) => onUpdate({ label: { ...service.label, en: e.target.value } })}
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
                  value={service.description?.fr || ''}
                  onChange={(e) => onUpdate({ description: { ...service.description, fr: e.target.value } as LocalizedString })}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="EN"
                  value={service.description?.en || ''}
                  onChange={(e) => onUpdate({ description: { ...service.description, en: e.target.value } as LocalizedString })}
                  fullWidth
                />
              </Stack>
            </Box>

            {/* Type de prix */}
            <FormControl size="small" fullWidth>
              <InputLabel>Type de tarification</InputLabel>
              <Select
                value={service.priceType}
                label="Type de tarification"
                onChange={(e) => onUpdate({ priceType: e.target.value as PriceType })}
              >
                <MenuItem value="FIXED">Prix fixe</MenuItem>
                <MenuItem value="PER_HOUR">Prix par heure</MenuItem>
                <MenuItem value="ON_QUOTE">Sur devis</MenuItem>
              </Select>
            </FormControl>

            {/* Prix */}
            {service.priceType !== 'ON_QUOTE' && (
              <TextField
                size="small"
                label={service.priceType === 'PER_HOUR' ? 'Prix par heure (MAD)' : 'Prix (MAD)'}
                type="number"
                value={service.price}
                onChange={(e) => onUpdate({ price: Number(e.target.value) })}
                fullWidth
              />
            )}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}
