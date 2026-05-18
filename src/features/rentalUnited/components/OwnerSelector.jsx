import React from 'react';
import { Box, Select, MenuItem, FormControl, InputLabel, Typography, Paper } from '@mui/material';
import { useTranslation } from 'react-i18next';

const OwnerSelector = ({ 
  owners, 
  selectedOwnerId, 
  onOwnerChange, 
  title = "select_owner_for_rental_united",
  subtitle = "please_select_owner"
}) => {
  const { t } = useTranslation('common');
  return (
    <Box>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 0 }}>
        <Typography variant="h6" gutterBottom>
          {t(title)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t(subtitle)}
        </Typography>

        <FormControl fullWidth>
          <InputLabel>{t('select_owner')}</InputLabel>
          <Select
            value={selectedOwnerId}
            label={t('select_owner')}
            onChange={onOwnerChange}
          >
            {owners.map((owner) => (
              <MenuItem key={owner._id} value={owner._id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">
                    {owner.firstName} {owner.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({owner.email})
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>
    </Box>
  );
};

export default OwnerSelector;