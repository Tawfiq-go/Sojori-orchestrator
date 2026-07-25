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

/**
 * Dialog mot de passe PM — un scope à la fois pour éviter l'autofill croisé dashboard ↔ RU.
 * @param {'dashboard' | 'ru'} mode
 */
export default function OwnerPasswordDialog({
  open,
  onClose,
  ownerLabel,
  sojoriEmail,
  ruEmail,
  loading,
  onSubmit,
  mode = 'dashboard',
}) {
  const isRu = mode === 'ru';
  const [password, setPassword] = useState('');

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  const handleSubmit = () => {
    const value = password.trim();
    if (value.length < 6) return;
    if (isRu) {
      void onSubmit({ ruExtranetPassword: value });
    } else {
      // ⚠️ CRITICAL: ne jamais envoyer ruExtranetPassword ici
      void onSubmit({ sojoriPassword: value });
    }
  };

  const canSubmit = password.trim().length >= 6;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isRu
          ? `Mot de passe extranet R.U. — ${ownerLabel || 'PM'}`
          : `Mot de passe dashboard Sojori — ${ownerLabel || 'PM'}`}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity={isRu ? 'warning' : 'info'} sx={{ fontSize: 13 }}>
            {isRu
              ? 'Modifie UNIQUEMENT le password extranet Rental United (API calendrier / prix). Ne change pas le login dashboard.'
              : 'Modifie UNIQUEMENT le password dashboard Sojori. Le password R.U. n’est jamais touché.'}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            {isRu ? `Extranet R.U. : ${ruEmail || '—'}` : `Dashboard : ${sojoriEmail || '—'}`}
          </Typography>
          <TextField
            label={isRu ? 'Nouveau mot de passe extranet R.U.' : 'Nouveau mot de passe dashboard'}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            autoComplete="new-password"
            inputProps={{
              'data-lpignore': 'true',
              'data-1p-ignore': 'true',
              autoCorrect: 'off',
              spellCheck: false,
            }}
            name={isRu ? 'sojori-ru-extranet-password-only' : 'sojori-dashboard-password-only'}
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
