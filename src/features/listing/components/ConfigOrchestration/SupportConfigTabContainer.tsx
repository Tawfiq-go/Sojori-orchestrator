// ════════════════════════════════════════════════════════════════════
// SupportConfigTabContainer.tsx
// Wrapper qui gère l'API et passe les données au composant Claude Desktop
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, CircularProgress, Typography } from '@mui/material';
import SupportConfigTab from './SupportConfigTab';
import type { SupportConfig } from './types';
import { DEFAULT_CATEGORIES } from './types';

interface Props {
  listingId: string;
  ownerId?: string;
}

export default function SupportConfigTabContainer({ listingId, ownerId }: Props) {
  const [config, setConfig] = useState<SupportConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial config
  useEffect(() => {
    fetchConfig();
  }, [listingId]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`/api/v1/listing/internal/${listingId}/support-config`);

      // Si pas de config, utiliser les catégories par défaut
      const initialConfig = res.data?.data || {
        enabled: true,
        categories: DEFAULT_CATEGORIES,
      };

      setConfig(initialConfig);
    } catch (err: any) {

      // En cas d'erreur 404, utiliser config par défaut
      if (err.response?.status === 404) {
        setConfig({
          enabled: true,
          categories: DEFAULT_CATEGORIES,
        });
      } else {
        setError(err.message || 'Erreur lors du chargement de la configuration');
      }
    } finally {
      setLoading(false);
    }
  };

  // Save config to API
  const handleSave = async (updatedConfig: SupportConfig) => {
    try {
      await axios.post(
        `/api/v1/listing/internal/${listingId}/support-config`,
        updatedConfig
      );
    } catch (err: any) {
      throw err; // Re-throw pour que le composant puisse gérer l'erreur
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Erreur : {error}</Typography>
      </Box>
    );
  }

  if (!config) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Aucune configuration disponible</Typography>
      </Box>
    );
  }

  return (
    <SupportConfigTab
      listingId={listingId}
      initial={config}
      onSave={handleSave}
    />
  );
}
