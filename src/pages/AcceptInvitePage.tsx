import React, { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import apiClient from '../services/apiClient';
import { AUTH_CONFIG } from '../config/authConfig';
import PasswordStrengthChecklist from '../components/PasswordStrengthChecklist';
import { isPasswordStrongEnough, passwordStrengthError } from '../utils/passwordPolicy';
import { setTokens } from '../utils/authUtils';
import { persistUser } from '../data/mockAuth';
import { apiUserToMockUser } from '../utils/apiUserToMockUser';

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError('');
    setMessage('');

    if (!token) {
      setLocalError('Lien invalide : token manquant. Utilisez le lien reçu par email.');
      return;
    }

    if (!isPasswordStrongEnough(password)) {
      setLocalError(passwordStrengthError(password) || 'Mot de passe trop faible.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await apiClient.post(`${AUTH_CONFIG.API_URL}/accept-owner-invite`, {
        token: token.trim(),
        password: password.trim(),
      });

      if (!data?.token || !data?.user) {
        throw new Error(data?.message || 'Réponse serveur incomplète.');
      }

      setTokens(data.token, data.refreshToken || '');
      persistUser(apiUserToMockUser(data.user, null));
      setMessage(data.message || 'Compte activé — connexion réussie.');
      navigate('/', { replace: true });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      setLocalError(
        err?.response?.data?.message || err?.message || 'Impossible d’activer le compte.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', bgcolor: '#f8fafc', py: 4 }}>
      <Container maxWidth="sm">
        <Paper sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
            Activer votre compte Sojori
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choisissez un mot de passe pour accéder au dashboard property manager.
          </Typography>

          {localError ? <Alert severity="error" sx={{ mb: 2 }}>{localError}</Alert> : null}
          {message ? <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert> : null}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Nouveau mot de passe"
                type="password"
                fullWidth
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
              <PasswordStrengthChecklist password={password} />
              <TextField
                label="Confirmer le mot de passe"
                type="password"
                fullWidth
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
              <Button type="submit" variant="contained" size="large" disabled={loading || !token}>
                {loading ? 'Activation…' : 'Activer mon compte'}
              </Button>
              <Button component={RouterLink} to="/login" sx={{ textTransform: 'none' }}>
                Retour à la connexion
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
