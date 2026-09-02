import { Alert, Box, Button, Chip, Paper, Typography } from '@mui/material';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import MfaEnrollDialog from './MfaEnrollDialog';

/**
 * Carte « double authentification » du profil.
 *
 * L'enrôlement proposé ici est TOTP : il ne dépend d'aucun canal de livraison,
 * ni e-mail (les comptes @sojori.com ne reçoivent rien) ni WhatsApp (pannes
 * Meta, SIM swap). C'est la seule méthode utilisable par un administrateur.
 *
 * Les PM passent par le bot WhatsApp et n'ont rien à activer ici.
 */
export default function MfaSecurityCard() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);

  const enabled = Boolean((user as { mfaEnabled?: boolean } | null)?.mfaEnabled) || justEnabled;

  return (
    <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Typography variant="h6">Double authentification</Typography>
        <Chip
          size="small"
          label={enabled ? 'Activée' : 'Désactivée'}
          color={enabled ? 'success' : 'default'}
        />
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Un code à usage unique est demandé en plus du mot de passe. Un identifiant volé ne
        suffit alors plus à ouvrir une session.
      </Typography>

      {enabled ? (
        <Alert severity="success">
          Votre compte est protégé. Un code vous sera demandé une fois par jour.
        </Alert>
      ) : (
        <>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Vous aurez besoin d'une application d'authentification : Google Authenticator, Authy,
            1Password ou équivalent.
          </Typography>
          <Button variant="contained" onClick={() => setOpen(true)}>
            Activer la double authentification
          </Button>
        </>
      )}

      <MfaEnrollDialog
        open={open}
        onClose={() => setOpen(false)}
        onDone={() => setJustEnabled(true)}
      />
    </Paper>
  );
}
