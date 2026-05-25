// Wrapper API réelle listing-support-categories + design SupportConfigTab
import React, { useState, useEffect, useCallback } from 'react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import { listingsService } from '../../../../services/listingsService';
import SupportConfigTab from './SupportConfigTab';
import type { SupportConfig, SupportCategory, SupportPriority } from './types';
import { DEFAULT_CATEGORIES } from './types';
import {
  mergeSojoriMeta,
  readSojoriMeta,
  type SupportPriority as SP,
} from './supportPriority';

function normalizePriority(raw: string): SupportPriority {
  if (raw === 'urgent' || raw === 'CRITICAL') return 'urgent';
  if (raw === 'high' || raw === 'HIGH') return 'high';
  if (raw === 'normal' || raw === 'NORMAL') return 'normal';
  return 'normal';
}

function mapApiToDesign(apiDoc: { categories?: unknown[] } | null): SupportConfig {
  const cats = apiDoc?.categories;
  if (!Array.isArray(cats) || cats.length === 0) {
    return { enabled: true, categories: DEFAULT_CATEGORIES };
  }
  return {
    enabled: true,
    categories: cats.map((c: Record<string, unknown>, i: number) => {
      const name = (c.name as { fr?: string; en?: string; ar?: string }) || { fr: 'Catégorie' };
      const desc = c.description as { fr?: string; en?: string } | undefined;
      const fields = (c.fields as Record<string, unknown>) || {};
      const meta = readSojoriMeta(fields);
      const priority = normalizePriority(String(c.priority || 'normal'));
      return {
        id: String(c.id || `cat_${i}`),
        enabled: c.enabled !== false,
        label: {
          fr: name.fr || '',
          en: name.en || name.fr || '',
          ar: name.ar,
        },
        description: desc ? { fr: desc.fr || '', en: desc.en || '' } : { fr: '', en: '' },
        icon: String(c.icon || '💬'),
        defaultUrgency: priority,
        guestCanChoosePriority: meta.guestCanChoosePriority !== false,
        order: Number(c.displayOrder ?? i),
        _fields: fields,
      } as SupportCategory & { _fields?: Record<string, unknown> };
    }),
  };
}

function mapDesignToApi(config: SupportConfig) {
  return config.categories.map((cat, i) => {
    const ext = cat as SupportCategory & { _fields?: Record<string, unknown> };
    const baseFields = ext._fields || {};
    return {
      id: cat.id,
      enabled: true,
      category: String((ext as Record<string, unknown>).category || 'other'),
      name: {
        fr: cat.label.fr,
        en: cat.label.en || cat.label.fr,
        ar: cat.label.ar || '',
      },
      description: cat.description
        ? { fr: cat.description.fr, en: cat.description.en || cat.description.fr, ar: '' }
        : undefined,
      icon: cat.icon,
      displayOrder: cat.order ?? i,
      priority: cat.defaultUrgency as SP,
      requiresPhoto: false,
      requiresPMValidation: false,
      alertPM: cat.defaultUrgency === 'urgent',
      estimatedResponseTime: { fr: '24h', en: '24h', ar: '' },
      fields: mergeSojoriMeta(baseFields, {
        guestCanChoosePriority: cat.guestCanChoosePriority,
      }),
      relatedToAmenities: false,
    };
  });
}

interface Props {
  listingId?: string;
  ownerId?: string;
  templateOwnerKey?: string;
}

export default function SupportConfigTabContainer({ listingId, templateOwnerKey }: Props) {
  const isOwnerTemplate = Boolean(templateOwnerKey);
  const [config, setConfig] = useState<SupportConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provisionLoading, setProvisionLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (isOwnerTemplate && templateOwnerKey) {
      try {
        const res = await listingsService.getListingOwnerConfigTemplate(templateOwnerKey);
        const payload = (res as { data?: { support?: { categories?: unknown[] } } })?.data ?? res;
        const cats = (payload as { support?: { categories?: unknown[] } })?.support?.categories;
        setConfig(mapApiToDesign({ categories: cats }));
      } catch (e: unknown) {
        setConfig({ enabled: true, categories: DEFAULT_CATEGORIES });
        setError(e instanceof Error ? e.message : 'Chargement impossible');
      }
      setLoading(false);
      return;
    }
    if (!listingId) {
      setLoading(false);
      return;
    }
    let res = await listingsService.getListingSupportCategoriesConfig(listingId);
    if (res.error?.includes('404') || (!res.data && res.error)) {
      setProvisionLoading(true);
      await listingsService.createListingSupportCategories(listingId);
      setProvisionLoading(false);
      res = await listingsService.getListingSupportCategoriesConfig(listingId);
    }
    if (res.error && !res.data) {
      setConfig({ enabled: true, categories: DEFAULT_CATEGORIES });
      setError(res.error);
    } else {
      setConfig(mapApiToDesign(res.data as { categories?: unknown[] }));
    }
    setLoading(false);
  }, [listingId, isOwnerTemplate, templateOwnerKey]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async (updatedConfig: SupportConfig) => {
    const categories = mapDesignToApi(updatedConfig);
    if (isOwnerTemplate && templateOwnerKey) {
      await listingsService.putListingOwnerConfigTemplateSection(templateOwnerKey, 'support', {
        categories,
      });
      setConfig(updatedConfig);
      return;
    }
    if (!listingId) return;
    const res = await listingsService.updateListingSupportCategories(listingId, categories);
    if (res.error) throw new Error(res.error);
    setConfig(updatedConfig);
  };

  if (loading || provisionLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!config) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error || 'Configuration indisponible'}</Typography>
        <Button onClick={fetchConfig} sx={{ mt: 2 }}>
          Réessayer
        </Button>
      </Box>
    );
  }

  return (
    <SupportConfigTab
      listingId={listingId || templateOwnerKey || ''}
      initial={config}
      onSave={handleSave}
    />
  );
}
