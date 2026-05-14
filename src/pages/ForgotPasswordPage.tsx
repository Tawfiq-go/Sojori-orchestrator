import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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

  const navigate = useNavigate();
  const { resetPassword, loading, error } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError('');
    setMessage('');

    if (!/\S+@\S+\.\S+/.test(email)) {
      setLocalError('Veuillez entrer un email valide.');
      return;
    }

    try {
      const result = await resetPassword(email);
      setMessage(`${result.message} Redirection vers le formulaire de nouveau mot de passe...`);
      setTimeout(() => navigate(`/reset-password?email=${encodeURIComponent(email)}`), 900);
    } catch (resetError: any) {
      setLocalError(resetError?.message || 'Impossible d’envoyer le lien mock.');
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
              Forgot password
            </Typography>
            <Typography color="text.secondary">
              Mock flow: enter your email and we will prepare a reset link instantly.
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
                helperText="Ex: admin@sojori.com"
              />
              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>
              <Button component={RouterLink} to="/login" sx={{ textTransform: 'none' }}>
                Back to login
              </Button>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
