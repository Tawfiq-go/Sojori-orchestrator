import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useState } from 'react';
import { toast } from 'react-toastify';

export default function OwnerPasswordLinkDialog({
  open,
  onClose,
  email,
  linkUrl,
  emailSent,
  emailError,
  linkType,
  expiresAt,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!linkUrl) return;
    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopied(true);
      toast.success('Lien copié');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  const title =
    linkType === 'reset' ? 'Lien de réinitialisation mot de passe' : 'Lien d’activation PM';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {emailSent ? (
            <Alert severity="success">
              Email envoyé à <strong>{email || '—'}</strong>
            </Alert>
          ) : (
            <Alert severity="warning">
              Email non envoyé{emailError ? ` : ${emailError}` : ''}. Copiez le lien ci-dessous.
            </Alert>
          )}

          {email && (
            <Typography variant="body2" color="text.secondary">
              Destinataire : {email}
            </Typography>
          )}

          {expiresAt && (
            <Typography variant="body2" color="text.secondary">
              Expire le : {new Date(expiresAt).toLocaleString('fr-FR')}
            </Typography>
          )}

          {linkUrl && (
            <Box>
              <TextField
                fullWidth
                size="small"
                label="Lien (24h)"
                value={linkUrl}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <IconButton onClick={() => void handleCopy()} size="small" aria-label="Copier">
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  ),
                }}
              />
              {copied && (
                <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                  Copié dans le presse-papiers
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        {linkUrl && (
          <Button variant="contained" onClick={() => void handleCopy()}>
            Copier le lien
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
