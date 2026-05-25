import React from 'react';
import { Alert, Box } from '@mui/material';
import { getUnpersistedFieldLabels } from './pmConfigSchemaRegistry';

/** Conteneur Config Orch. NEW — alerte si des champs UI ne sont pas encore persistés en base. */
export default function PmConfigTabFrame({ tabKey, children }) {
  const pending = getUnpersistedFieldLabels(tabKey);

  return (
    <Box sx={{ maxWidth: 1100 }}>
      {pending.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Non enregistré en base pour l’instant : {pending.join(' · ')}.
        </Alert>
      )}
      {children}
    </Box>
  );
}
