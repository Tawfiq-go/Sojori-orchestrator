// ════════════════════════════════════════════════════════════════════
// GroceryConfigTab.tsx
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

interface GroceryProduct {
  id: string;
  label: LocalizedString;
  description?: LocalizedString;
  icon: string;
  price: number;
  unit: string;
  enabled: boolean;
  order: number;
}

interface GroceryConfig {
  enabled: boolean;
  products: GroceryProduct[];
}

const DEFAULT_PRODUCTS: GroceryProduct[] = [
  {
    id: 'eau',
    label: { fr: 'Eau minérale', en: 'Mineral water', ar: 'ماء معدني' },
    description: { fr: 'Pack de 6 bouteilles', en: 'Pack of 6 bottles', ar: 'عبوة من 6 قوارير' },
    icon: '💧',
    price: 30,
    unit: 'pack',
    enabled: true,
    order: 0,
  },
  {
    id: 'pain',
    label: { fr: 'Pain', en: 'Bread', ar: 'خبز' },
    description: { fr: 'Pain frais du jour', en: 'Fresh daily bread', ar: 'خبز طازج يومي' },
    icon: '🥖',
    price: 5,
    unit: 'pièce',
    enabled: true,
    order: 1,
  },
  {
    id: 'fruits',
    label: { fr: 'Corbeille de fruits', en: 'Fruit basket', ar: 'سلة فواكه' },
    description: { fr: 'Fruits de saison variés', en: 'Assorted seasonal fruits', ar: 'فواكه موسمية متنوعة' },
    icon: '🍎',
    price: 60,
    unit: 'corbeille',
    enabled: true,
    order: 2,
  },
];

interface Props {
  listingId: string;
  ownerId?: string;
}

export default function GroceryConfigTab({ listingId }: Props) {
  const [config, setConfig] = useState<GroceryConfig>({ enabled: true, products: DEFAULT_PRODUCTS });
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
      const res = await axios.get(`/api/v1/listing/internal/${listingId}/grocery-config`);
      const data = res.data?.data;
      if (data && data.products && data.products.length > 0) {
        setConfig(data);
      } else {
        setConfig({ enabled: true, products: DEFAULT_PRODUCTS });
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setConfig({ enabled: true, products: DEFAULT_PRODUCTS });
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
        await axios.post(`/api/v1/listing/internal/${listingId}/grocery-config`, config);
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
        const oldIndex = prev.products.findIndex((s) => s.id === active.id);
        const newIndex = prev.products.findIndex((s) => s.id === over.id);
        const reordered = arrayMove(prev.products, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }));
        return { ...prev, products: reordered };
      });
    }
  };

  const addProduct = () => {
    const newProduct: GroceryProduct = {
      id: `product-${Date.now()}`,
      label: { fr: 'Nouveau produit', en: 'New product', ar: 'منتج جديد' },
      description: { fr: '', en: '', ar: '' },
      icon: '🛒',
      price: 0,
      unit: '',
      enabled: true,
      order: config.products.length,
    };
    setConfig((prev) => ({ ...prev, products: [...prev.products, newProduct] }));
  };

  const deleteProduct = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      products: prev.products.filter((s) => s.id !== id),
    }));
  };

  const updateProduct = (id: string, updates: Partial<GroceryProduct>) => {
    setConfig((prev) => ({
      ...prev,
      products: prev.products.map((s) => (s.id === id ? { ...s, ...updates } : s)),
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
            🛒 Courses
          </Typography>
          <Typography sx={{ fontSize: 13, color: T.text3, mt: 0.5 }}>
            Produits de courses proposés aux voyageurs via WhatsApp.
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            Activer courses
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
        🥗 Produits ({config.products.length} / 15 max)
      </Typography>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={config.products.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <Stack spacing={1.5}>
            {config.products.map((product) => (
              <SortableProduct
                key={product.id}
                product={product}
                onUpdate={(updates) => updateProduct(product.id, updates)}
                onDelete={() => deleteProduct(product.id)}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>

      {/* Add button */}
      {config.products.length < 20 && (
        <Button
          variant="outlined"
          onClick={addProduct}
          sx={{
            mt: 2,
            borderColor: T.border,
            color: T.text2,
            '&:hover': { borderColor: T.primary, bgcolor: T.bg2 },
          }}
        >
          + Ajouter un produit
        </Button>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// SortableProduct
// ════════════════════════════════════════════════════════════════════
function SortableProduct({
  product,
  onUpdate,
  onDelete,
}: {
  product: GroceryProduct;
  onUpdate: (updates: Partial<GroceryProduct>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Safety check: ensure product has valid structure
  if (!product.label || !product.label.fr) {
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
          checked={product.enabled}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
          size="small"
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': { color: T.primary },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: T.primary },
          }}
        />

        <Box sx={{ fontSize: 20, flexShrink: 0 }}>{product.icon}</Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{product.label.fr}</Typography>
          {product.description && (
            <Typography sx={{ fontSize: 12, color: T.text3 }}>{product.description.fr}</Typography>
          )}
        </Box>

        <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.primary }}>{product.price} MAD/{product.unit}</Typography>

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
              value={product.icon}
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
                  value={product.label.fr}
                  onChange={(e) => onUpdate({ label: { ...product.label, fr: e.target.value } })}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="EN"
                  value={product.label.en}
                  onChange={(e) => onUpdate({ label: { ...product.label, en: e.target.value } })}
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
                  value={product.description?.fr || ''}
                  onChange={(e) => onUpdate({ description: { ...product.description, fr: e.target.value } as LocalizedString })}
                  fullWidth
                />
                <TextField
                  size="small"
                  label="EN"
                  value={product.description?.en || ''}
                  onChange={(e) => onUpdate({ description: { ...product.description, en: e.target.value } as LocalizedString })}
                  fullWidth
                />
              </Stack>
            </Box>

            {/* Prix et unité */}
            <Stack direction="row" spacing={2}>
              <TextField
                size="small"
                label="Prix (MAD)"
                type="number"
                value={product.price}
                onChange={(e) => onUpdate({ price: Number(e.target.value) })}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Unité"
                value={product.unit}
                onChange={(e) => onUpdate({ unit: e.target.value })}
                placeholder="ex: pack, pièce, kg"
                sx={{ flex: 1 }}
              />
            </Stack>
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}
