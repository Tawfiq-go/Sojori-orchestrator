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

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState('');

  const navigate = useNavigate();
  const { completePasswordReset, loading, error } = useAuth();

  const email = useMemo(() => searchParams.get('email') || '', [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError('');
    setMessage('');

    if (password.length < 8) {
      setLocalError('Le nouveau mot de passe doit contenir au moins 8 caracteres.');
      return;
    }

    if (!/[A-Z]/.test(password) || !/\d/.test(password)) {
      setLocalError('Ajoutez au moins 1 majuscule et 1 chiffre.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Les mots de passe ne correspondent pas.');
      return;
    }

    try {
      const result = await completePasswordReset({ email, password });
      setMessage(`${result.message} Redirection vers la connexion...`);
      setTimeout(() => navigate('/login'), 900);
    } catch (resetError: any) {
      setLocalError(resetError?.message || 'Impossible de mettre a jour le mot de passe.');
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
              Reset password
            </Typography>
            <Typography color="text.secondary">
              Mock reset for {email || 'your selected account'}.
            </Typography>
          </Stack>

          {(error || localError) && <Alert severity="error" sx={{ mb: 3 }}>{error || localError}</Alert>}
          {message && <Alert severity="success" sx={{ mb: 3 }}>{message}</Alert>}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="New password"
                type="password"
                fullWidth
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                helperText="8+ caracteres, 1 majuscule, 1 chiffre"
              />
              <TextField
                label="Confirm password"
                type="password"
                fullWidth
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? 'Updating...' : 'Update password'}
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
