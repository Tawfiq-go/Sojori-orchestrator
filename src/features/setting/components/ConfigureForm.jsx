import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, TextField, Typography, Paper, Alert } from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';

const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryPale: '#FFF3E0',
};

const ConfigureForm = ({ initialData, currentTemplate, onSubmit, onBack, updateFormData }) => {
  const { t } = useTranslation('common');
  const isInitialMount = useRef(true);
  const [config, setConfig] = useState({
    description: '',
  });

  useEffect(() => {
    const templateData = currentTemplate || initialData;
    if (templateData && (isInitialMount.current || currentTemplate)) {
      setConfig({
        description: templateData?.description || '',
      });
      isInitialMount.current = false;
    }
  }, [currentTemplate?._id, initialData?.messageName]);

  useEffect(() => {
    if (!isInitialMount.current) {
      updateFormData({
        description: config.description,
        // Les champs de timing ne sont plus nécessaires - géré par l'Orchestrateur
      });
    }
  }, [config, updateFormData]);

  return (
    <Box className="!px-6 !py-6">
      {/* Description Field */}
      <Paper
        variant="outlined"
        sx={{
          p: 4,
          borderColor: SOJORI_COLORS.primary,
          borderWidth: 2,
          borderRadius: '12px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          '&:hover': {
            boxShadow: `0 4px 20px rgba(255, 107, 53, 0.2)`,
            borderColor: SOJORI_COLORS.primaryDark
          },
          transition: 'all 0.3s ease'
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: SOJORI_COLORS.primary,
            fontWeight: 700,
            mb: 3,
            fontSize: '1.1rem'
          }}
        >
          📝 {t('Description')}
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={6}
          placeholder={t('Entrez une description claire pour ce template de message. Ex: "Message envoyé pour rappeler au client de choisir son heure d\'arrivée"')}
          value={config.description}
          onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              fontSize: '0.95rem',
              lineHeight: '1.6',
              '& fieldset': {
                borderWidth: 2,
                borderColor: '#e0e0e0'
              },
              '&:hover fieldset': {
                borderColor: SOJORI_COLORS.primary,
                borderWidth: 2
              },
              '&.Mui-focused fieldset': {
                borderColor: SOJORI_COLORS.primary,
                borderWidth: 2,
                boxShadow: `0 0 0 3px rgba(255, 107, 53, 0.1)`
              },
            },
          }}
        />
        <Typography
          variant="body2"
          sx={{
            mt: 2,
            display: 'block',
            color: 'text.secondary',
            fontStyle: 'italic',
            fontSize: '0.875rem'
          }}
        >
          ℹ️ {t('Cette description aide à identifier rapidement l\'objectif de ce message dans la liste et dans l\'Orchestrator.')}
        </Typography>
      </Paper>
    </Box>
  );
};

export default ConfigureForm;
