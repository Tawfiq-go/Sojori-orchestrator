import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import apiClient from '../../services/apiClient';
import { AUTH_CONFIG } from '../../config/authConfig';
import type { AuthResponse } from '../../services/authService.real';
import { setTokens } from '../../utils/authUtils';

interface Props {
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
  /**
   * Enrôlement forcé au login : jeton d'enrôlement rendu par `/login`, seul
   * accepté sur setup/confirm-totp. Sans session, il n'y a pas de cookie à
   * injecter par l'intercepteur — l'en-tête explicite reste.
   */
  authToken?: string;
  /** Session rendue par confirm-totp (token + refreshToken + user). */
  onEnrolled?: (session: AuthResponse) => void;
}

/**
 * Activation de la double authentification (application d'authentification).
 *
 * Trois étapes, dans cet ordre pour une raison précise : le 2FA n'est activé
 * qu'après qu'un premier code a été validé. Activer dès le scan verrouillerait
 * un utilisateur dont l'application est mal enrôlée ou l'horloge décalée.
 */
export default function MfaEnrollDialog({ open, onClose, onDone, authToken, onEnrolled }: Props) {
  const authHeaders = authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : undefined;
  const [step, setStep] = useState(0);
  const [secret, setSecret] = useState('');
  const [qrSvg, setQrSvg] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setError(null);
    setCode('');
    setBackupCodes([]);

    (async () => {
      setBusy(true);
      try {
        const { data } = await apiClient.post(AUTH_CONFIG.API_URL + '/mfa/setup-totp', {}, authHeaders);
        setSecret(data.secret);
        setQrSvg(data.qrSvg || '');
      } catch (e: any) {
        setError(
          e?.response?.data?.error === 'mfa_already_enabled'
            ? 'La double authentification est déjà active sur ce compte.'
            : "Impossible de démarrer l'activation.",
        );
      } finally {
        setBusy(false);
      }
    })();
  }, [open]);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await apiClient.post(
        AUTH_CONFIG.API_URL + '/mfa/confirm-totp',
        { code: code.trim() },
        authHeaders,
      );
      setBackupCodes(data.backupCodes || []);
      // confirm-totp ouvre la session avec la preuve 2FA : la garder, sinon le
      // token courant (sans second facteur) resterait celui d'avant.
      if (data.token && data.refreshToken) {
        setTokens(data.token, data.refreshToken);
        if (data.user) {
          onEnrolled?.({ token: data.token, refreshToken: data.refreshToken, user: data.user });
        }
      }
      setStep(2);
    } catch (e: any) {
      setError(
        e?.response?.data?.error === 'invalid_code'
          ? "Code incorrect. Vérifiez l'heure de votre téléphone puis réessayez."
          : "Activation impossible.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={step === 2 ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Double authentification</DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          <Step><StepLabel>Scanner</StepLabel></Step>
          <Step><StepLabel>Confirmer</StepLabel></Step>
          <Step><StepLabel>Secours</StepLabel></Step>
        </Stepper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {step === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Scannez ce code avec Google Authenticator, Authy ou 1Password.
            </Typography>
            {qrSvg && (
              <Box
                sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            )}
            <Typography variant="caption" color="text.secondary">
              Impossible de scanner ? Saisissez cette clé manuellement :
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={secret}
              slotProps={{ htmlInput: { readOnly: true } }}
              sx={{ mt: 1, mb: 1 }}
            />
            <Button fullWidth variant="contained" disabled={busy || !secret} onClick={() => setStep(1)}>
              J'ai scanné
            </Button>
          </Box>
        )}

        {step === 1 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Saisissez le code à 6 chiffres affiché par votre application.
            </Typography>
            <TextField
              fullWidth
              autoFocus
              label="Code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }}
              placeholder="123456"
              sx={{ mb: 2 }}
            />
            <Button fullWidth variant="contained" disabled={busy || code.length !== 6} onClick={confirm}>
              {busy ? 'Vérification…' : 'Activer'}
            </Button>
          </Box>
        )}

        {step === 2 && (
          <Box>
            <Alert severity="success" sx={{ mb: 2 }}>
              Double authentification activée.
            </Alert>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Conservez ces codes de secours.</strong> Ils permettent de vous connecter si
              vous perdez votre téléphone — ils ne seront plus jamais affichés.
            </Typography>
            <Box
              sx={{
                fontFamily: 'monospace',
                fontSize: 14,
                bgcolor: 'grey.100',
                p: 2,
                borderRadius: 1,
                mb: 1,
              }}
            >
              {backupCodes.map((c) => (
                <div key={c}>{c}</div>
              ))}
            </Box>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => navigator.clipboard?.writeText(backupCodes.join('\n'))}
            >
              Copier les codes
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {step === 2 ? (
          <Button
            variant="contained"
            onClick={() => {
              onDone?.();
              onClose();
            }}
          >
            J'ai conservé mes codes
          </Button>
        ) : (
          <Button onClick={onClose}>Annuler</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
