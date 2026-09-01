import { Alert, Box, Button, Link, TextField, Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';

interface Props {
  method: 'totp' | 'whatsapp';
  onSubmit: (code: string) => Promise<void>;
  onCancel: () => void;
  error?: string | null;
}

/**
 * Deuxième étape du login : saisie du code.
 *
 * Le mot de passe est déjà validé — seul le second facteur manque. La consigne
 * dépend de la méthode imposée par le serveur : application d'authentification
 * pour les admins, code demandé au bot WhatsApp pour les PM.
 */
export default function MfaCodeStep({ method, onSubmit, onCancel, error }: Props) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await onSubmit(code.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box component="form" onSubmit={submit}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Vérification en deux étapes
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {method === 'whatsapp' ? (
          <>
            Envoyez <strong>code</strong> au bot Sojori sur WhatsApp, puis recopiez les 6 chiffres
            reçus.
          </>
        ) : (
          <>Saisissez le code à 6 chiffres affiché par votre application d'authentification.</>
        )}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        inputRef={inputRef}
        fullWidth
        variant="outlined"
        label="Code"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
        // `one-time-code` laisse iOS et Android proposer le code automatiquement.
        autoComplete="one-time-code"
        slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 12 } }}
        placeholder="123456"
        sx={{ mb: 2 }}
      />

      <Button type="submit" variant="contained" fullWidth disabled={busy || code.length < 6}>
        {busy ? 'Vérification…' : 'Valider'}
      </Button>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        Vous pouvez aussi utiliser l'un de vos codes de secours.{' '}
        <Link component="button" type="button" onClick={onCancel} underline="hover">
          Revenir à la connexion
        </Link>
      </Typography>
    </Box>
  );
}
