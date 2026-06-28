import { useState } from 'react';
import { Box, Button } from '@mui/material';
import { OnboardingOwnerPicker } from './OnboardingOwnerPicker';
import { OnboardingCreateOwnerForm } from './OnboardingCreateOwnerForm';

type SetupMode = 'create' | 'pick';

/** Étape 0 admin : créer un PM (RU) ou en choisir un existant. */
export function OnboardingOwnerSetup() {
  const [mode, setMode] = useState<SetupMode>('pick');

  return (
    <Box className="ob-owner-setup">
      <Box className="ob-owner-setup-tabs" role="tablist" aria-label="Propriétaire onboarding">
        <Button
          role="tab"
          aria-selected={mode === 'create'}
          variant={mode === 'create' ? 'contained' : 'outlined'}
          onClick={() => setMode('create')}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: '10px 10px 0 0',
            bgcolor: mode === 'create' ? '#B8851A' : 'transparent',
            borderColor: 'rgba(184,133,26,0.45)',
            color: mode === 'create' ? '#fff' : '#7a5a12',
            '&:hover': { bgcolor: mode === 'create' ? '#9a6f15' : 'rgba(184,133,26,0.08)' },
          }}
        >
          1 · Créer un PM
        </Button>
        <Button
          role="tab"
          aria-selected={mode === 'pick'}
          variant={mode === 'pick' ? 'contained' : 'outlined'}
          onClick={() => setMode('pick')}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: '10px 10px 0 0',
            bgcolor: mode === 'pick' ? '#B8851A' : 'transparent',
            borderColor: 'rgba(184,133,26,0.45)',
            color: mode === 'pick' ? '#fff' : '#7a5a12',
            '&:hover': { bgcolor: mode === 'pick' ? '#9a6f15' : 'rgba(184,133,26,0.08)' },
          }}
        >
          2 · PM existant
        </Button>
      </Box>

      <Box className="ob-owner-setup-panel">
        {mode === 'create' ? (
          <OnboardingCreateOwnerForm />
        ) : (
          <OnboardingOwnerPicker />
        )}
      </Box>
    </Box>
  );
}

export default OnboardingOwnerSetup;
