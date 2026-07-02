import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');

  const { resetPassword, loading, error } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');
    setMessage('');

    if (!/\S+@\S+\.\S+/.test(email)) {
      setLocalError('Veuillez entrer un email valide.');
      return;
    }

    try {
      const result = await resetPassword(email);
      setMessage(
        result.message ||
          'Si un compte existe avec cet email, un lien a été envoyé (valable 24h). Vérifiez votre boîte mail.',
      );
    } catch (resetError) {
      setLocalError(resetError?.message || 'Impossible d’envoyer le lien.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={6} sx={{ p: 4, borderRadius: 4 }}>
          <Stack spacing={1} sx={{ mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Mot de passe oublié
            </Typography>
            <Typography color="text.secondary">
              Saisissez l’email de votre compte Sojori. Nous vous enverrons un lien pour choisir un
              nouveau mot de passe (valable 24 heures).
            </Typography>
          </Stack>

          {(error || localError) && <Alert severity="error" sx={{ mb: 3 }}>{error || localError}</Alert>}
          {message && <Alert severity="success" sx={{ mb: 3 }}>{message}</Alert>}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
              />
              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? 'Envoi…' : 'Envoyer le lien'}
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
