import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField } from '@mui/material';
import axios from 'axios';

export default function MessagesConfigTab({ listingId, ownerId }: any) {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    fetchConfig();
  }, [listingId]);

  const fetchConfig = async () => {
    try {
      const res = await axios.get(`/api/v1/listing/internal/${listingId}/messages`);
      setConfig(res.data.data);
    } catch (error) {
    }
  };

  const saveConfig = async () => {
    try {
      await axios.post(`/api/v1/listing/internal/${listingId}/messages`, config);
      alert('✅ Sauvegardé');
    } catch (error) {
      alert('❌ Erreur');
    }
  };

  if (!config) return <div>Chargement...</div>;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>📜 Messages Départ</Typography>
      <TextField
        fullWidth
        multiline
        rows={4}
        label="Instructions départ (FR)"
        value={config.departureInstructions?.fr}
        onChange={(e) => setConfig({
          ...config,
          departureInstructions: { ...config.departureInstructions, fr: e.target.value }
        })}
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        multiline
        rows={4}
        label="Departure instructions (EN)"
        value={config.departureInstructions?.en}
        onChange={(e) => setConfig({
          ...config,
          departureInstructions: { ...config.departureInstructions, en: e.target.value }
        })}
      />
      <Button variant="contained" onClick={saveConfig} sx={{ mt: 2 }}>Sauvegarder</Button>
    </Box>
  );
}
