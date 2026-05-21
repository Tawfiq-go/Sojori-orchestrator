// ════════════════════════════════════════════════════════════════════
// TransportConfigTab.tsx
// Configuration transport/navette avec design Claude
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

interface TransportRoute {
  id: string;
  label: LocalizedString;
  description?: LocalizedString;
  origin: {
    address: string;
    lat?: number;
    lng?: number;
  };
  destination: {
    address: string;
    lat?: number;
    lng?: number;
  };
  price: number;
  duration: string;
  enabled: boolean;
  order: number;
}

interface TransportConfig {
  enabled: boolean;
  routes: TransportRoute[];
}

const DEFAULT_ROUTES: TransportRoute[] = [
  {
    id: 'aeroport-listing',
    label: { fr: 'Aéroport → Logement', en: 'Airport → Property', ar: 'المطار ← السكن' },
    description: { fr: 'Transfert depuis l\'aéroport', en: 'Transfer from airport', ar: 'نقل من المطار' },
    origin: {
      address: 'Aéroport Mohammed V, Casablanca',
      lat: 33.3673,
      lng: -7.5898,
    },
    destination: {
      address: 'À compléter (adresse du logement)',
      lat: 0,
      lng: 0,
    },
    price: 250,
    duration: '45 min',
    enabled: true,
    order: 0,
  },
  {
    id: 'listing-aeroport',
    label: { fr: 'Logement → Aéroport', en: 'Property → Airport', ar: 'السكن ← المطار' },
    description: { fr: 'Transfert vers l\'aéroport', en: 'Transfer to airport', ar: 'نقل إلى المطار' },
    origin: {
      address: 'À compléter (adresse du logement)',
      lat: 0,
      lng: 0,
    },
    destination: {
      address: 'Aéroport Mohammed V, Casablanca',
      lat: 33.3673,
      lng: -7.5898,
    },
    price: 250,
    duration: '45 min',
    enabled: true,
    order: 1,
  },
];

interface Props {
  listingId: string;
  ownerId?: string;
}

export default function TransportConfigTab({ listingId }: Props) {
  const [config, setConfig] = useState<TransportConfig>({ enabled: true, routes: DEFAULT_ROUTES });
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
      const res = await axios.get(`/api/v1/listing/internal/${listingId}/transport-config`);
      const data = res.data?.data;
      if (data && data.routes && data.routes.length > 0) {
        setConfig(data);
      } else {
        // Utiliser les routes par défaut si aucune config
        setConfig({ enabled: true, routes: DEFAULT_ROUTES });
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setConfig({ enabled: true, routes: DEFAULT_ROUTES });
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
        await axios.post(`/api/v1/listing/internal/${listingId}/transport-config`, config);
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
        const oldIndex = prev.routes.findIndex((r) => r.id === active.id);
        const newIndex = prev.routes.findIndex((r) => r.id === over.id);
        const reordered = arrayMove(prev.routes, oldIndex, newIndex).map((r, i) => ({ ...r, order: i }));
        return { ...prev, routes: reordered };
      });
    }
  };

  const addRoute = () => {
    const newRoute: TransportRoute = {
      id: `route-${Date.now()}`,
      label: { fr: 'Nouvelle route', en: 'New route', ar: 'طريق جديد' },
      description: { fr: '', en: '', ar: '' },
      origin: { address: '' },
      destination: { address: '' },
      price: 0,
      duration: '',
      enabled: true,
      order: config.routes.length,
    };
    setConfig((prev) => ({ ...prev, routes: [...prev.routes, newRoute] }));
  };

  const deleteRoute = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      routes: prev.routes.filter((r) => r.id !== id),
    }));
  };

  const updateRoute = (id: string, updates: Partial<TransportRoute>) => {
    setConfig((prev) => ({
      ...prev,
      routes: prev.routes.map((r) => (r.id === id ? { ...r, ...updates } : r)),
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
            🚗 Transport / Navette
          </Typography>
          <Typography sx={{ fontSize: 13, color: T.text3, mt: 0.5 }}>
            Routes fixes affichées dans le flow WhatsApp transport.
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            Activer transport
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

      {/* Routes list */}
      <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.text3, mb: 1.5 }}>
        📍 Routes ({config.routes.length} / 10 max)
      </Typography>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={config.routes.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <Stack spacing={1.5}>
            {config.routes.map((route) => (
              <SortableRoute
                key={route.id}
                route={route}
                onUpdate={(updates) => updateRoute(route.id, updates)}
                onDelete={() => deleteRoute(route.id)}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>

      {/* Add button */}
      {config.routes.length < 10 && (
        <Button
          variant="outlined"
          onClick={addRoute}
          sx={{
            mt: 2,
            borderColor: T.border,
            color: T.text2,
            '&:hover': { borderColor: T.primary, bgcolor: T.bg2 },
          }}
        >
          + Ajouter une route
        </Button>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// SortableRoute
// ════════════════════════════════════════════════════════════════════
function SortableRoute({
  route,
  onUpdate,
  onDelete,
}: {
  route: TransportRoute;
  onUpdate: (updates: Partial<TransportRoute>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: route.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
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
          checked={route.enabled}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
          size="small"
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': { color: T.primary },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: T.primary },
          }}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{route.label.fr}</Typography>
          {route.description && (
            <Typography sx={{ fontSize: 12, color: T.text3 }}>{route.description.fr}</Typography>
          )}
        </Box>

        <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.primary }}>{route.price} MAD</Typography>

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
            {/* Label FR/EN/AR */}
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', mb: 0.5 }}>
                Label
              </Typography>
              <Stack spacing={1}>
                <TextField
                  size="small"
                  label="FR"
                  value={route.label.fr}
                  onChange={(e) => onUpdate({ label: { ...route.label, fr: e.target.value } })}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="EN"
                  value={route.label.en}
                  onChange={(e) => onUpdate({ label: { ...route.label, en: e.target.value } })}
                  fullWidth
                />
              </Stack>
            </Box>

            {/* Origine */}
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', mb: 0.5 }}>
                📍 Origine
              </Typography>
              <TextField
                size="small"
                label="Adresse de départ"
                value={route.origin.address}
                onChange={(e) => onUpdate({ origin: { ...route.origin, address: e.target.value } })}
                fullWidth
              />
            </Box>

            {/* Destination */}
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', mb: 0.5 }}>
                📍 Destination
              </Typography>
              <TextField
                size="small"
                label="Adresse d'arrivée"
                value={route.destination.address}
                onChange={(e) => onUpdate({ destination: { ...route.destination, address: e.target.value } })}
                fullWidth
              />
            </Box>

            {/* Prix et durée */}
            <Stack direction="row" spacing={2}>
              <TextField
                size="small"
                label="Prix (MAD)"
                type="number"
                value={route.price}
                onChange={(e) => onUpdate({ price: Number(e.target.value) })}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Durée"
                value={route.duration}
                onChange={(e) => onUpdate({ duration: e.target.value })}
                placeholder="ex: 45 min"
                sx={{ flex: 1 }}
              />
            </Stack>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}
