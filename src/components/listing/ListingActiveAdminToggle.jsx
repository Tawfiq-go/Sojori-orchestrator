import { useState } from 'react';
import { Box, CircularProgress, FormControlLabel, Switch, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import listingsService from '../../services/listingsService';

/**
 * Admin plateforme uniquement — activer / désactiver un listing Sojori (hors simulation PM).
 */
export default function ListingActiveAdminToggle({ listingId, active, onActiveChange }) {
  const [saving, setSaving] = useState(false);

  const handleToggle = async (_event, nextActive) => {
    if (!listingId || saving) return;
    setSaving(true);
    try {
      const response = await listingsService.updateListingQuickEdit(listingId, { active: nextActive });
      if (response.success) {
        onActiveChange?.(nextActive);
        toast.success(nextActive ? 'Listing activé' : 'Listing désactivé');
      } else {
        toast.error(response.message || 'Mise à jour impossible');
      }
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Mise à jour impossible';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        mt: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 1.25,
        py: 0.75,
        borderRadius: 1,
        border: '1px solid rgba(20,17,10,0.10)',
        bgcolor: 'rgba(255,255,255,0.85)',
      }}
    >
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#55504a', letterSpacing: '0.02em' }}>
        Statut Sojori
      </Typography>
      <FormControlLabel
        sx={{ m: 0, gap: 0.5 }}
        control={
          <Switch
            size="small"
            checked={active !== false}
            onChange={handleToggle}
            disabled={saving || !listingId}
            color="primary"
          />
        }
        label={
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: active !== false ? '#0a8f5e' : '#7a756c' }}>
            {active !== false ? 'Actif' : 'Inactif'}
          </Typography>
        }
      />
      {saving ? <CircularProgress size={14} sx={{ color: '#b8851a' }} /> : null}
    </Box>
  );
}
