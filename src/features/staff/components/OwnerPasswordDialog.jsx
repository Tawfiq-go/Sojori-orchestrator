import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

export default function OwnerPasswordDialog({
  open,
  onClose,
  ownerLabel,
  sojoriEmail,
  ruEmail,
  loading,
  onSubmit,
}) {
  const [sojoriPassword, setSojoriPassword] = useState('');
  const [ruExtranetPassword, setRuExtranetPassword] = useState('');

  const handleClose = () => {
    setSojoriPassword('');
    setRuExtranetPassword('');
    onClose();
  };

  const handleSubmit = () => {
    const payload = {};
    if (sojoriPassword.trim().length >= 6) payload.sojoriPassword = sojoriPassword.trim();
    if (ruExtranetPassword.trim().length >= 6) payload.ruExtranetPassword = ruExtranetPassword.trim();
    if (!payload.sojoriPassword && !payload.ruExtranetPassword) return;
    void onSubmit(payload);
  };

  const canSubmit =
    sojoriPassword.trim().length >= 6 || ruExtranetPassword.trim().length >= 6;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Modifier les mots de passe — {ownerLabel || 'PM'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="info" sx={{ fontSize: 13 }}>
            Laissez un champ vide pour ne pas le modifier. Minimum 6 caractères par mot de passe
            renseigné.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Dashboard : {sojoriEmail || '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Extranet R.U. : {ruEmail || '—'}
          </Typography>
          <TextField
            label="Nouveau mot de passe dashboard Sojori"
            type="password"
            value={sojoriPassword}
            onChange={(e) => setSojoriPassword(e.target.value)}
            fullWidth
            autoComplete="new-password"
          />
          <TextField
            label="Nouveau mot de passe extranet R.U."
            type="password"
            value={ruExtranetPassword}
            onChange={(e) => setRuExtranetPassword(e.target.value)}
            fullWidth
            autoComplete="new-password"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit || loading}>
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
