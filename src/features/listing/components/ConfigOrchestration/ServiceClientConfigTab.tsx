import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, TextField } from '@mui/material';
import axios from 'axios';

export default function ServiceClientConfigTab({ listingId, ownerId }: any) {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    fetchConfig();
  }, [listingId]);

  const fetchConfig = async () => {
    try {
      const res = await axios.get(`/api/v1/listing/internal/${listingId}/service-client-config`);
      setConfig(res.data.data);
    } catch (error) {
    }
  };

  const saveConfig = async () => {
    try {
      await axios.post(`/api/v1/listing/internal/${listingId}/service-client-config`, config);
      alert('✅ Sauvegardé');
    } catch (error) {
      alert('❌ Erreur');
    }
  };

  if (!config) return <div>Chargement...</div>;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>💌 Service Client</Typography>
      <TextField
        fullWidth
        label="SLA (heures)"
        type="number"
        value={config.slaHours}
        onChange={(e) => setConfig({ ...config, slaHours: Number(e.target.value) })}
        sx={{ mb: 2 }}
      />
      <Button variant="contained" onClick={saveConfig}>Sauvegarder</Button>
    </Box>
  );
}
