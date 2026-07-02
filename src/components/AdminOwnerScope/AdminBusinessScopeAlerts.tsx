import { Alert, Typography } from '@mui/material';

export function AdminBusinessScopeUnsetAlert() {
  return (
    <Alert severity="info" sx={{ m: 2 }}>
      <Typography variant="body2">
        Choisissez <strong>Tous (plateforme)</strong> pour voir les données agrégées, ou sélectionnez un property
        manager dans la barre ci-dessus.
      </Typography>
    </Alert>
  );
}

export function AdminBusinessScopeAllAlert() {
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      <Typography variant="body2">
        Vue plateforme — indicateurs agrégés sur tous les PM (peut être lent ; certains KPIs sont moins pertinents
        qu’en vue par PM).
      </Typography>
    </Alert>
  );
}
