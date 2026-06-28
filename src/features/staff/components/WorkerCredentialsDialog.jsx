import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { WF } from './workerFormDesign';

function copyText(value, setCopiedKey, key) {
  if (!value) return;
  navigator.clipboard?.writeText(String(value)).then(() => {
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  });
}

export default function WorkerCredentialsDialog({
  open,
  onClose,
  email,
  temporaryPassword,
  loginUrl,
  emailSent,
  emailError,
  title = 'Identifiants du worker',
  onDefinePassword,
  definePasswordLabel = 'Définir un autre mot de passe',
}) {
  const [copiedKey, setCopiedKey] = useState(null);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: WF.text }}>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {emailSent ? (
            <Alert severity="success">
              Un email a été envoyé à <strong>{email}</strong> avec ces identifiants.
            </Alert>
          ) : (
            <Alert severity="warning">
              L&apos;email n&apos;a pas pu être envoyé
              {emailError ? ` (${emailError})` : ''}. Copiez le mot de passe ci-dessous et transmettez-le au worker.
            </Alert>
          )}
          <Typography variant="body2" sx={{ color: WF.text2 }}>
            Ce mot de passe n&apos;est affiché qu&apos;une fois.
            {onDefinePassword
              ? ' Utilisez le bouton ci-dessous pour en choisir un autre avant de fermer.'
              : ' En cas de perte, utilisez « Mot de passe / identifiants » sur la fiche du compte.'}
          </Typography>
          <TextField
            label="Email"
            value={email || ''}
            fullWidth
            InputProps={{
              readOnly: true,
              endAdornment: (
                <IconButton size="small" onClick={() => copyText(email, setCopiedKey, 'email')} aria-label="Copier email">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              ),
            }}
            helperText={copiedKey === 'email' ? 'Copié' : ' '}
          />
          <TextField
            label="Mot de passe temporaire"
            value={temporaryPassword || ''}
            fullWidth
            InputProps={{
              readOnly: true,
              endAdornment: (
                <IconButton
                  size="small"
                  onClick={() => copyText(temporaryPassword, setCopiedKey, 'password')}
                  aria-label="Copier mot de passe"
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              ),
            }}
            helperText={copiedKey === 'password' ? 'Copié' : ' '}
          />
          {loginUrl ? (
            <Box>
              <Typography variant="caption" sx={{ color: WF.text3, display: 'block', mb: 0.5 }}>
                Lien de connexion
              </Typography>
              <Button
                size="small"
                variant="outlined"
                href={loginUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ textTransform: 'none' }}
              >
                {loginUrl}
              </Button>
            </Box>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1, flexWrap: 'wrap' }}>
        {onDefinePassword ? (
          <Button onClick={onDefinePassword} sx={{ textTransform: 'none', mr: 'auto' }}>
            {definePasswordLabel}
          </Button>
        ) : null}
        <Button onClick={onClose} variant="contained" sx={{ bgcolor: WF.primaryDeep, '&:hover': { bgcolor: WF.primary } }}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
