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
import { useAuth } from '../hooks/useAuth';
import PasswordStrengthChecklist from '../components/PasswordStrengthChecklist';
import { isPasswordStrongEnough, passwordStrengthError } from '../utils/passwordPolicy';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');

  const navigate = useNavigate();
  const { completePasswordReset, loading, error } = useAuth();

  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const email = useMemo(() => searchParams.get('email') || '', [searchParams]);

  const handleSubmit = async (event) => {
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

    try {
      const result = await completePasswordReset({
        token,
        email: email || undefined,
        password,
      });
      setMessage(`${result.message} Redirection vers la connexion…`);
      setTimeout(() => navigate('/login'), 1200);
    } catch (resetError) {
      setLocalError(resetError?.message || 'Impossible de mettre à jour le mot de passe.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #fff7ed 0%, #fefce8 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={6} sx={{ p: 4, borderRadius: 4 }}>
          <Stack spacing={1} sx={{ mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Nouveau mot de passe
            </Typography>
            <Typography color="text.secondary">
              Choisissez un mot de passe pour votre compte Sojori
              {email ? ` (${email})` : ''}. Ce lien est valable 24 heures.
            </Typography>
          </Stack>

          {(error || localError) && <Alert severity="error" sx={{ mb: 3 }}>{error || localError}</Alert>}
          {message && <Alert severity="success" sx={{ mb: 3 }}>{message}</Alert>}

          {!token ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Ouvrez cette page depuis le lien reçu par email, ou demandez un nouveau lien depuis{' '}
              <RouterLink to="/forgot-password">mot de passe oublié</RouterLink>.
            </Alert>
          ) : null}

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
                {loading ? 'Mise à jour…' : 'Enregistrer le mot de passe'}
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
