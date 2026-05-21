import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, FormControlLabel, Switch } from '@mui/material';
import axios from 'axios';

export default function OrchestrationConfigTab({ listingId, ownerId }: any) {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    fetchConfig();
  }, [listingId]);

  const fetchConfig = async () => {
    try {
      const res = await axios.get(`/api/v1/listing/internal/${listingId}/orchestration-config`);
      setConfig(res.data.data);
    } catch (error) {
    }
  };

  const saveConfig = async () => {
    try {
      await axios.post(`/api/v1/listing/internal/${listingId}/orchestration-config`, config);
      alert('✅ Sauvegardé');
    } catch (error) {
      alert('❌ Erreur');
    }
  };

  if (!config) return <div>Chargement...</div>;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>🧼 Automatisations</Typography>
      <FormControlLabel
        control={
          <Switch
            checked={config.autoCleaningAfterCheckout}
            onChange={(e) => setConfig({ ...config, autoCleaningAfterCheckout: e.target.checked })}
          />
        }
        label="Ménage automatique après checkout"
      />
      <Typography sx={{ mt: 2 }}>Créneaux arrivée: {config.arrivalTimeSlots?.join(', ')}</Typography>
      <Typography>Créneaux départ: {config.departureTimeSlots?.join(', ')}</Typography>
      <Button variant="contained" onClick={saveConfig} sx={{ mt: 2 }}>Sauvegarder</Button>
    </Box>
  );
}
