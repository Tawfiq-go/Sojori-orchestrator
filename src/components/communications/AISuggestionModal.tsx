import { useState, useEffect, useCallback } from 'react';
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
  Chip,
} from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import {
  generateCommunicationsAiDraft,
  type CommunicationsAiKind,
} from '../../services/communicationsAiService';
import { i18nLanguageToApiCode } from '../../services/communicationsAi.helpers';

interface AISuggestionModalProps {
  open: boolean;
  onClose: () => void;
  onUseSuggestion: (text: string) => void;
  context: {
    conversationHistory?: unknown[];
    guestName?: string;
    reservationNumber?: string;
    channelName?: string;
    type: 'whatsapp' | 'staff' | 'ota' | 'leads' | 'reviews';
    /** Fil OTA / WhatsApp déjà formaté pour l'IA */
    threadContext?: string;
    /** Dernier message client (affiché en haut du popup) */
    lastGuestMessage?: string;
    draft?: string;
    reviewContent?: string;
    isRatingOnly?: boolean;
    rating?: number;
  };
}

function mapContextKind(type: AISuggestionModalProps['context']['type']): CommunicationsAiKind {
  if (type === 'ota') return 'ota_message';
  if (type === 'reviews') return 'review';
  if (type === 'leads') return 'lead';
  return 'whatsapp';
}

export default function AISuggestionModal({
  open,
  onClose,
  onUseSuggestion,
  context,
}: AISuggestionModalProps) {
  const [suggestion, setSuggestion] = useState('');
  const [staffPreview, setStaffPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = useCallback(
    async (regenerate = false) => {
      try {
        setLoading(true);
        setError(null);

        const kind = mapContextKind(context.type);
        const threadContext =
          context.threadContext ||
          (Array.isArray(context.conversationHistory)
            ? context.conversationHistory
                .map((line) => String(line || '').trim())
                .filter(Boolean)
                .join('\n')
            : '');

        const data = await generateCommunicationsAiDraft({
          kind,
          threadContext,
          draft: context.draft,
          targetLanguage: 'fr',
          guestLanguage: 'fr',
          dashboardLanguage: i18nLanguageToApiCode(
            typeof navigator !== 'undefined' ? navigator.language : 'fr',
          ),
          reservationId: context.reservationNumber || '',
          channelName: context.channelName,
          guestName: context.guestName,
          reviewContent: context.reviewContent,
          isRatingOnly: context.isRatingOnly,
          rating: context.rating,
          regenerate,
        });

        if (!data.success || !data.responseClient?.trim()) {
          throw new Error(data.message || 'Impossible de générer la suggestion.');
        }

        setSuggestion(data.responseClient.trim());
        setStaffPreview(data.responseAdmin?.trim() || '');
        setProvider(data.provider || 'claude');
        setHasGenerated(true);
      } catch (err: unknown) {
        console.error('❌ Erreur génération suggestion:', err);
        const msg =
          (err as { response?: { data?: { message?: string } }; message?: string })?.response
            ?.data?.message ||
          (err as Error)?.message ||
          'Erreur lors de la génération de la suggestion';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [context],
  );

  const handleUse = () => {
    if (suggestion.trim()) {
      onUseSuggestion(suggestion.trim());
      handleClose();
    }
  };

  const handleClose = () => {
    setSuggestion('');
    setStaffPreview('');
    setHasGenerated(false);
    setError(null);
    setProvider(null);
    onClose();
  };

  useEffect(() => {
    if (open && !hasGenerated && !loading) {
      void handleGenerate(false);
    }
  }, [open, hasGenerated, loading, handleGenerate]);

  const lastGuest = context.lastGuestMessage?.trim();

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
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        💡 Suggestion IA — Message client
        {provider && (
          <Chip
            size="small"
            label={provider === 'openai' ? 'OpenAI' : 'Claude'}
            sx={{ height: 22, fontSize: 10, fontWeight: 700 }}
          />
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {lastGuest && (
          <Box
            sx={{
              mb: 2.5,
              p: 2,
              borderRadius: '10px',
              bgcolor: t.bg2,
              border: `1px solid ${t.border}`,
            }}
          >
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: t.text3,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 1,
              }}
            >
              Dernier message du client
            </Typography>
            <Typography sx={{ fontSize: 13, lineHeight: 1.6, color: t.text1, whiteSpace: 'pre-wrap' }}>
              {lastGuest}
            </Typography>
          </Box>
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
            {staffPreview && staffPreview !== suggestion && (
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: t.text3, mb: 0.75 }}>
                  Traduction tableau de bord
                </Typography>
                <Typography sx={{ fontSize: 12, color: t.text2, whiteSpace: 'pre-wrap' }}>
                  {staffPreview}
                </Typography>
              </Box>
            )}
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
            onClick={() => void handleGenerate(true)}
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
