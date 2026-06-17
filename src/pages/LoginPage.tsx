import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  FormControlLabel,
  InputAdornment,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { AUTH_CONFIG } from '../config/authConfig';
import { isMockAuthEnabled } from '../services/authService';
import { logAuth } from '../utils/dashboardDebug';

interface LoginFormState {
  email: string;
  password: string;
  rememberMe: boolean;
}

export const LoginPage: React.FC = () => {
  const [form, setForm] = useState<LoginFormState>({
    email: '',
    password: '',
    rememberMe: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginFormState, string>>>({});

  const navigate = useNavigate();
  const { login, isAuthenticated, loading, error } = useAuth();
  const mockAuth = isMockAuthEnabled();

  useEffect(() => {
    logAuth('LoginPage mount', { isAuthenticated, loading, error: error ?? null });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      logAuth('LoginPage → dashboard (déjà connecté)');
      navigate(AUTH_CONFIG.LOGIN_REDIRECT);
    }
  }, [isAuthenticated, navigate]);

  const demoCredentials = useMemo(
    () =>
      mockAuth
        ? [
            { label: 'Admin demo', email: 'admin@sojori.com', password: 'admin123' },
            { label: 'Owner demo', email: 'owner@riviera-collection.com', password: 'owner123' },
          ]
        : [],
    [mockAuth],
  );

  const validate = () => {
    const nextErrors: Partial<Record<keyof LoginFormState, string>> = {};

    if (!form.email.trim()) {
      nextErrors.email = 'Email requis.';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      nextErrors.email = 'Format email invalide.';
    }

    if (!form.password.trim()) {
      nextErrors.password = 'Mot de passe requis.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!validate()) {
      return;
    }

    try {
      await login(form);
    } catch (err: any) {
      setLocalError(err?.message || err?.error || 'Connexion impossible. Vérifiez vos identifiants.');
    }
  };

  const updateForm = (field: keyof LoginFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={10}
          sx={{
            p: 4,
            borderRadius: 3,
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
              Welcome to Sojori
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {mockAuth
                ? 'Mode démo mock (VITE_USE_MOCK_AUTH).'
                : 'Connexion via dev.sojori.com (proxy local Vite, comptes réels).'}
            </Typography>
          </Box>

          <Typography variant="h5" component="h2" sx={{ mb: 1, fontWeight: 600 }}>
            Sign in
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {mockAuth
              ? 'Comptes démo ou tout email valide avec mot de passe ≥ 3 caractères.'
              : 'Utilisez l’email et le mot de passe de votre compte admin ou owner.'}
          </Typography>

          {(error || localError) && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error || localError}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                fullWidth
                type="email"
                label="Email"
                variant="outlined"
                value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
                required
                error={!!fieldErrors.email}
                helperText={fieldErrors.email || 'Ex: gouachadmin@sojori.com'}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: '#667eea' }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                    }
                  }
                }}
              />

              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                label="Password"
                variant="outlined"
                value={form.password}
                onChange={(e) => updateForm('password', e.target.value)}
                required
                error={!!fieldErrors.password}
                helperText={fieldErrors.password}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: '#667eea' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#667eea',
                    }
                  }
                }}
              />

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.rememberMe}
                      onChange={(e) => updateForm('rememberMe', e.target.checked)}
                    />
                  }
                  label="Remember me"
                />
                <Button component={RouterLink} to="/forgot-password" sx={{ textTransform: 'none' }}>
                  Forgot password?
                </Button>
              </Stack>

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  }
                }}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>

              {demoCredentials.length > 0 && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                  {demoCredentials.map((account) => (
                    <Button
                      key={account.label}
                      variant="outlined"
                      fullWidth
                      onClick={() =>
                        setForm({
                          email: account.email,
                          password: account.password,
                          rememberMe: true,
                        })
                      }
                      sx={{ textTransform: 'none', borderRadius: 2 }}
                    >
                      {account.label}
                    </Button>
                  ))}
                </Stack>
              )}

              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                No account yet?{' '}
                <Box component={RouterLink} to="/register" sx={{ color: '#667eea', fontWeight: 600 }}>
                  Create one
                </Box>
              </Typography>
            </Box>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
