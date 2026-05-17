import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';

interface AISuggestionModalProps {
  open: boolean;
  onClose: () => void;
  onUseSuggestion: (text: string) => void;
  context: {
    conversationHistory?: any[];
    guestName?: string;
    reservationNumber?: string;
    type: 'whatsapp' | 'staff' | 'ota' | 'leads' | 'reviews';
  };
}

/**
 * Modal de suggestion de message par IA
 * Génère une suggestion de réponse basée sur le contexte de la conversation
 */
export default function AISuggestionModal({
  open,
  onClose,
  onUseSuggestion,
  context,
}: AISuggestionModalProps) {
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  /**
   * Générer une suggestion via l'API
   */
  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Remplacer par l'API réelle
      // const response = await messagesService.generateAISuggestion(context);

      // Mock pour démonstration
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const mockSuggestion = context.type === 'reviews'
        ? 'Merci beaucoup pour votre avis ! Nous sommes ravis que votre séjour vous ait plu. Au plaisir de vous accueillir à nouveau !'
        : 'Aucun problème, prenez le temps qu\'il vous faut pour réfléchir. N\'hésitez pas à nous recontacter dès que vous aurez pris votre décision concernant les nouvelles dates.\n\nCordialement';

      setSuggestion(mockSuggestion);
      setHasGenerated(true);
    } catch (err: any) {
      console.error('❌ Erreur génération suggestion:', err);
      setError(err.message || 'Erreur lors de la génération de la suggestion');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Utiliser la suggestion (copier dans l'input principal)
   */
  const handleUse = () => {
    if (suggestion.trim()) {
      onUseSuggestion(suggestion.trim());
      handleClose();
    }
  };

  /**
   * Fermer et réinitialiser
   */
  const handleClose = () => {
    setSuggestion('');
    setHasGenerated(false);
    setError(null);
    onClose();
  };

  /**
   * Auto-générer à l'ouverture
   */
  useEffect(() => {
    if (open && !hasGenerated && !loading) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          bgcolor: t.bg1,
        },
      }}
    >
      <DialogTitle
        sx={{
          fontSize: 16,
          fontWeight: 700,
          borderBottom: `1px solid ${t.border}`,
          pb: 2,
        }}
      >
        💡 Suggestion IA — Message client
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
              gap: 2,
            }}
          >
            <CircularProgress size={40} sx={{ color: t.primary }} />
            <Typography sx={{ fontSize: 13, color: t.text3 }}>
              Génération de la suggestion avec Claude...
            </Typography>
          </Box>
        ) : (
          <>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 600,
                color: t.text3,
                mb: 1,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Claude (fallback)
            </Typography>
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 600,
                color: t.text2,
                mb: 1.5,
              }}
            >
              Message à envoyer au client (Français)
            </Typography>
            <TextField
              multiline
              rows={8}
              fullWidth
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="La suggestion apparaîtra ici..."
              sx={{
                '& .MuiInputBase-root': {
                  fontSize: 13,
                  lineHeight: 1.6,
                  bgcolor: t.bg2,
                  borderRadius: '8px',
                },
                '& .MuiInputBase-input': {
                  color: t.text1,
                },
              }}
            />
            <Typography
              sx={{
                fontSize: 11,
                color: t.text4,
                mt: 1.5,
                fontStyle: 'italic',
              }}
            >
              💡 Vous pouvez modifier la suggestion avant de l'utiliser
            </Typography>
          </>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          borderTop: `1px solid ${t.border}`,
          px: 3,
          py: 2,
          gap: 1,
        }}
      >
        <Button
          onClick={handleClose}
          sx={{
            textTransform: 'none',
            fontSize: 13,
            fontWeight: 600,
            color: t.text3,
          }}
        >
          Annuler
        </Button>
        {!loading && hasGenerated && (
          <Button
            onClick={handleGenerate}
            sx={{
              textTransform: 'none',
              fontSize: 13,
              fontWeight: 600,
              color: t.primary,
            }}
          >
            🔄 Régénérer
          </Button>
        )}
        <Button
          onClick={handleUse}
          disabled={!suggestion.trim() || loading}
          variant="contained"
          sx={{
            textTransform: 'none',
            fontSize: 13,
            fontWeight: 600,
            bgcolor: t.primary,
            color: '#fff',
            '&:hover': {
              bgcolor: t.primaryDeep,
            },
            '&:disabled': {
              bgcolor: t.bg3,
              color: t.text4,
            },
          }}
        >
          Utiliser cette suggestion
        </Button>
      </DialogActions>
    </Dialog>
  );
}
