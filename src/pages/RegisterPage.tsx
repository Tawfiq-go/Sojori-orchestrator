import React, { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';

interface RegisterFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
  newsletter: boolean;
}

const initialState: RegisterFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  password: '',
  confirmPassword: '',
  termsAccepted: false,
  newsletter: true,
};

export default function RegisterPage() {
  const [form, setForm] = useState<RegisterFormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormState, string>>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [localError, setLocalError] = useState('');

  const navigate = useNavigate();
  const { register, loading, error } = useAuth();

  const passwordRules = useMemo(
    () => [
      '8+ caracteres',
      '1 majuscule',
      '1 chiffre',
    ],
    []
  );

  const updateField = (field: keyof RegisterFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof RegisterFormState, string>> = {};

    if (!form.firstName.trim()) nextErrors.firstName = 'Prenom requis.';
    if (!form.lastName.trim()) nextErrors.lastName = 'Nom requis.';
    if (!/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = 'Email invalide.';
    if (!form.phone.trim()) nextErrors.phone = 'Telephone requis.';
    if (!form.company.trim()) nextErrors.company = 'Entreprise ou property name requis.';

    const strongPassword =
      form.password.length >= 8 &&
      /[A-Z]/.test(form.password) &&
      /\d/.test(form.password);

    if (!strongPassword) {
      nextErrors.password = 'Utilisez 8+ caracteres, 1 majuscule et 1 chiffre.';
    }

    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = 'Les mots de passe ne correspondent pas.';
    }

    if (!form.termsAccepted) {
      nextErrors.termsAccepted = 'Vous devez accepter les CGU.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError('');
    setSuccessMessage('');

    if (!validate()) {
      return;
    }

    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        company: form.company,
        password: form.password,
        termsAccepted: form.termsAccepted,
        newsletter: form.newsletter,
      });
      setSuccessMessage('Compte mock cree avec succes. Redirection vers le dashboard...');
      setTimeout(() => navigate('/dashboard'), 900);
    } catch (registerError: any) {
      setLocalError(registerError?.message || 'Inscription impossible.');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        py: 5,
        background: 'linear-gradient(135deg, #faf5ff 0%, #eef2ff 100%)',
      }}
    >
      <Container maxWidth="md">
        <Paper elevation={8} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4 }}>
          <Stack spacing={1} sx={{ mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Create your Sojori account
            </Typography>
            <Typography color="text.secondary">
              Mock sign-up flow based on the legacy dashboard requirements.
            </Typography>
          </Stack>

          {(error || localError) && <Alert severity="error" sx={{ mb: 3 }}>{error || localError}</Alert>}
          {successMessage && <Alert severity="success" sx={{ mb: 3 }}>{successMessage}</Alert>}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Prenom"
                  fullWidth
                  value={form.firstName}
                  onChange={(event) => updateField('firstName', event.target.value)}
                  error={!!errors.firstName}
                  helperText={errors.firstName}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Nom"
                  fullWidth
                  value={form.lastName}
                  onChange={(event) => updateField('lastName', event.target.value)}
                  error={!!errors.lastName}
                  helperText={errors.lastName}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  error={!!errors.email}
                  helperText={errors.email}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Telephone"
                  fullWidth
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  error={!!errors.phone}
                  helperText={errors.phone}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Entreprise / property name"
                  fullWidth
                  value={form.company}
                  onChange={(event) => updateField('company', event.target.value)}
                  error={!!errors.company}
                  helperText={errors.company}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Password"
                  type="password"
                  fullWidth
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  error={!!errors.password}
                  helperText={errors.password || `Rules: ${passwordRules.join(' · ')}`}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  label="Confirm password"
                  type="password"
                  fullWidth
                  value={form.confirmPassword}
                  onChange={(event) => updateField('confirmPassword', event.target.value)}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.termsAccepted}
                      onChange={(event) => updateField('termsAccepted', event.target.checked)}
                    />
                  }
                  label="J’accepte les CGU et la politique de confidentialite."
                />
                {errors.termsAccepted && (
                  <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                    {errors.termsAccepted}
                  </Typography>
                )}
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.newsletter}
                      onChange={(event) => updateField('newsletter', event.target.checked)}
                    />
                  }
                  label="Recevoir les updates produit et insights revenue."
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 1 }}>
                  <Button type="submit" variant="contained" disabled={loading} sx={{ px: 4, py: 1.4 }}>
                    {loading ? 'Creating account...' : 'Create account'}
                  </Button>
                  <Button component={RouterLink} to="/login" variant="text" sx={{ textTransform: 'none' }}>
                    Already have an account? Sign in
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}
