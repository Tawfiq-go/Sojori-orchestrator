import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { WF, workerTextFieldSx } from './workerFormDesign';

const fieldSx = workerTextFieldSx();

function logWorkerPassword(step, data = {}) {
  if (typeof console !== 'undefined' && console.info) {
    console.info(`[worker-password] ${step}`, data);
  }
}

function copyText(value, setCopiedKey, key) {
  if (!value) return;
  navigator.clipboard?.writeText(String(value)).then(() => {
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  });
}

export default function WorkerPasswordDialog({
  open,
  onClose,
  workerEmail,
  loading = false,
  onSubmit,
  result = null,
  onEditAgain,
  dialogTitle = 'Mot de passe du worker',
  resultTitle = 'Mot de passe enregistré',
  sendEmailLabel = 'Envoyer les identifiants par email au worker',
  initialSendEmail = true,
}) {
  const [tab, setTab] = useState(0);
  const [passwordLen, setPasswordLen] = useState(0);
  const [confirmLen, setConfirmLen] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [localError, setLocalError] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setTab(0);
    setPasswordLen(0);
    setConfirmLen(0);
    setShowPassword(false);
    setSendEmail(initialSendEmail);
    setLocalError('');
    setCopiedKey(null);
    setFormKey((k) => k + 1);
    logWorkerPassword('dialog:open', { workerEmail });
  }, [open, workerEmail, initialSendEmail]);

  const syncLen = (ref, setter) => {
    const len = ref?.current?.value?.length ?? 0;
    setter(len);
  };

  const handleManualSubmit = () => {
    setLocalError('');
    const pwd = (passwordRef.current?.value ?? '').trim();
    const conf = (confirmRef.current?.value ?? '').trim();

    logWorkerPassword('validate:manual', {
      refPasswordLen: passwordRef.current?.value?.length ?? 0,
      refConfirmLen: confirmRef.current?.value?.length ?? 0,
      trimmedPasswordLen: pwd.length,
      trimmedConfirmLen: conf.length,
      tab,
      sendEmail,
    });

    if (!pwd) {
      setLocalError('Saisissez le nouveau mot de passe dans le premier champ (pas seulement la confirmation).');
      return;
    }
    if (pwd.length < 8) {
      setLocalError(`Le mot de passe doit contenir au moins 8 caractères (actuellement ${pwd.length}).`);
      return;
    }
    if (!conf) {
      setLocalError('Confirmez le mot de passe dans le second champ.');
      return;
    }
    if (pwd !== conf) {
      setLocalError('Les mots de passe ne correspondent pas.');
      return;
    }
    onSubmit?.({ password: pwd, sendEmail });
  };

  const handleGenerateSubmit = () => {
    setLocalError('');
    logWorkerPassword('validate:generate', { tab, sendEmail });
    onSubmit?.({ sendEmail });
  };

  if (result) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: WF.text }}>{resultTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {result.emailSent ? (
              <Alert severity="success">
                Email envoyé à <strong>{result.email}</strong>.
              </Alert>
            ) : (
              <Alert severity="warning">
                Mot de passe mis à jour.
                {result.emailError ? ` Email non envoyé (${result.emailError}).` : ' Email non envoyé.'}
                {' '}Transmettez-le manuellement.
              </Alert>
            )}
            <TextField
              label="Email"
              value={result.email || ''}
              fullWidth
              slotProps={{
                input: {
                  readOnly: true,
                  endAdornment: (
                    <IconButton size="small" onClick={() => copyText(result.email, setCopiedKey, 'email')}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  ),
                },
              }}
              helperText={copiedKey === 'email' ? 'Copié' : ' '}
            />
            <TextField
              label="Mot de passe"
              value={result.temporaryPassword || ''}
              fullWidth
              slotProps={{
                input: {
                  readOnly: true,
                  endAdornment: (
                    <IconButton size="small" onClick={() => copyText(result.temporaryPassword, setCopiedKey, 'pwd')}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  ),
                },
              }}
              helperText={copiedKey === 'pwd' ? 'Copié' : ' '}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          {onEditAgain ? (
            <Button onClick={onEditAgain} sx={{ textTransform: 'none', mr: 'auto' }}>
              Définir un autre mot de passe
            </Button>
          ) : null}
          <Button onClick={onClose} variant="contained" sx={{ bgcolor: WF.primaryDeep, '&:hover': { bgcolor: WF.primary } }}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: WF.text }}>{dialogTitle}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: WF.text2, mb: 2 }}>
          Compte : <strong>{workerEmail}</strong>
        </Typography>
        <Tabs
          value={tab}
          onChange={(_, v) => {
            setTab(v);
            setLocalError('');
          }}
          sx={{ mb: 2, borderBottom: `1px solid ${WF.border}` }}
        >
          <Tab label="Définir manuellement" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Générer automatiquement" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>

        {localError ? <Alert severity="error" sx={{ mb: 2 }}>{localError}</Alert> : null}

        {tab === 0 ? (
          <Stack spacing={2} key={formKey}>
            <TextField
              sx={fieldSx}
              label="Nouveau mot de passe"
              type={showPassword ? 'text' : 'password'}
              inputRef={passwordRef}
              onChange={() => syncLen(passwordRef, setPasswordLen)}
              onInput={() => syncLen(passwordRef, setPasswordLen)}
              fullWidth
              autoComplete="new-password"
              name="worker-new-password"
              slotProps={{
                input: {
                  endAdornment: (
                    <IconButton size="small" onClick={() => setShowPassword((v) => !v)} edge="end">
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  ),
                },
              }}
              helperText={
                passwordLen > 0
                  ? `${passwordLen} caractère(s) — minimum 8`
                  : 'Saisissez ici le mot de passe (champ du haut)'
              }
            />
            <TextField
              sx={fieldSx}
              label="Confirmer le mot de passe"
              type={showPassword ? 'text' : 'password'}
              inputRef={confirmRef}
              onChange={() => syncLen(confirmRef, setConfirmLen)}
              onInput={() => syncLen(confirmRef, setConfirmLen)}
              fullWidth
              autoComplete="new-password"
              name="worker-confirm-password"
              helperText={confirmLen > 0 ? `${confirmLen} caractère(s)` : 'Retapez le même mot de passe'}
            />
          </Stack>
        ) : (
          <Alert severity="info" sx={{ mb: 1 }}>
            Un mot de passe aléatoire sécurisé (14 caractères) sera généré et enregistré.
          </Alert>
        )}

        <FormControlLabel
          sx={{ mt: 2 }}
          control={
            <Checkbox
              checked={sendEmail}
              onChange={(_, v) => setSendEmail(v)}
              sx={{ color: WF.primaryDeep, '&.Mui-checked': { color: WF.primaryDeep } }}
            />
          }
          label={sendEmailLabel}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={loading} sx={{ textTransform: 'none' }}>
          Annuler
        </Button>
        <Button
          variant="contained"
          disabled={loading}
          onClick={tab === 0 ? handleManualSubmit : handleGenerateSubmit}
          sx={{ bgcolor: WF.primaryDeep, '&:hover': { bgcolor: WF.primary }, textTransform: 'none', fontWeight: 700 }}
        >
          {loading ? 'Enregistrement…' : tab === 0 ? 'Enregistrer le mot de passe' : 'Générer et enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
