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
  MenuItem,
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
  onSendSuggestion?: (text: string) => Promise<void> | void;
  context: {
    conversationHistory?: unknown[];
    guestName?: string;
    reservationNumber?: string;
    channelName?: string;
    type: 'whatsapp' | 'staff' | 'ota' | 'leads' | 'reviews';
    /** Fil OTA / WhatsApp deja formate pour l'IA */
    threadContext?: string;
    /** Dernier message client affiche en haut du popup */
    lastGuestMessage?: string;
    draft?: string;
    reviewContent?: string;
    isRatingOnly?: boolean;
    rating?: number;
  };
}

const LANGUAGE_OPTIONS = [
  { value: 'fr', label: 'Francais' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Espanol' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'ar', label: 'Arabic' },
];

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
  onSendSuggestion,
  context,
}: AISuggestionModalProps) {
  const [suggestion, setSuggestion] = useState('');
  const [staffPreview, setStaffPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [sendingSuggestion, setSendingSuggestion] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('fr');

  const handleGenerate = useCallback(
    async (mode: 'improve' | 'regenerate' = 'improve') => {
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
        const draftToImprove =
          mode === 'improve'
            ? suggestion.trim() || context.draft?.trim() || ''
            : undefined;

        const data = await generateCommunicationsAiDraft({
          kind,
          threadContext,
          draft: draftToImprove,
          targetLanguage,
          guestLanguage: targetLanguage,
          dashboardLanguage: i18nLanguageToApiCode(
            typeof navigator !== 'undefined' ? navigator.language : 'fr',
          ),
          reservationId: context.reservationNumber || '',
          channelName: context.channelName,
          guestName: context.guestName,
          reviewContent: context.reviewContent,
          isRatingOnly: context.isRatingOnly,
          rating: context.rating,
          regenerate: mode === 'regenerate',
        });

        if (!data.success || !data.responseClient?.trim()) {
          throw new Error(data.message || 'Impossible de generer la suggestion.');
        }

        setSuggestion(data.responseClient.trim());
        setStaffPreview(data.responseAdmin?.trim() || '');
        setProvider(data.provider || 'claude');
      } catch (err: unknown) {
        console.error('Erreur generation suggestion:', err);
        const msg =
          (err as { response?: { data?: { message?: string } }; message?: string })?.response
            ?.data?.message ||
          (err as Error)?.message ||
          'Erreur lors de la generation de la suggestion';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [context, suggestion, targetLanguage],
  );

  const handleUse = () => {
    if (suggestion.trim()) {
      onUseSuggestion(suggestion.trim());
      handleClose();
    }
  };

  const handleSendSuggestion = async () => {
    const text = suggestion.trim();
    if (!text || !onSendSuggestion || sendingSuggestion) return;
    try {
      setSendingSuggestion(true);
      setError(null);
      await onSendSuggestion(text);
      handleClose();
    } catch (err: unknown) {
      console.error('Erreur envoi suggestion IA:', err);
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response
          ?.data?.message ||
        (err as Error)?.message ||
        'Erreur lors de l\'envoi de la suggestion';
      setError(msg);
    } finally {
      setSendingSuggestion(false);
    }
  };

  const handleClose = () => {
    if (sendingSuggestion) return;
    setSuggestion('');
    setStaffPreview('');
    setError(null);
    setProvider(null);
    setSendingSuggestion(false);
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    setSuggestion(context.draft?.trim() || '');
    setStaffPreview('');
    setError(null);
    setProvider(null);
    setSendingSuggestion(false);
  }, [open, context.draft]);

  const lastGuest = context.lastGuestMessage?.trim();
  const reviewText = context.reviewContent?.trim();
  const selectedLanguageLabel =
    LANGUAGE_OPTIONS.find((option) => option.value === targetLanguage)?.label || 'Francais';

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '12px',
            bgcolor: t.bg1,
          },
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
        Suggestion IA - Message client
        {provider && (
          <Chip
            size="small"
            label={provider === 'openai' ? 'OpenAI' : 'Claude'}
            sx={{ height: 22, fontSize: 10, fontWeight: 700 }}
          />
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: '15px !important', pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {lastGuest && (
          <Box
            sx={{
              mt: 1.5,
              mb: 3,
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

        {context.type === 'reviews' && (reviewText || context.rating != null) && (
          <Box
            sx={{
              mt: 1.5,
              mb: 3,
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
              Avis client a repondre
            </Typography>
            {context.rating != null && (
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.primary, mb: 0.75 }}>
                Note: {context.rating}/5
              </Typography>
            )}
            <Typography sx={{ fontSize: 13, lineHeight: 1.6, color: t.text1, whiteSpace: 'pre-wrap' }}>
              {reviewText || 'Avis sans commentaire texte.'}
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
              Generation IA en {selectedLanguageLabel}...
            </Typography>
          </Box>
        ) : (
          <>
            <TextField
              select
              size="small"
              label="Langue"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              sx={{
                width: 220,
                mt: 0.5,
                mb: 2.5,
                '& .MuiInputBase-root': {
                  fontSize: 13,
                  bgcolor: t.bg2,
                  borderRadius: '8px',
                },
              }}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 600,
                color: t.text2,
                mb: 1.5,
              }}
            >
              Message a envoyer au client
            </Typography>
            <TextField
              multiline
              rows={8}
              fullWidth
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="Ecrivez votre brouillon ici, puis cliquez sur Ameliorer avec AI."
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
              Ameliorer avec AI utilise le texte dans ce champ. Regenerer avec AI repart du contexte sans ce texte.
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
          flexWrap: 'wrap',
        }}
      >
        <Button
          onClick={handleClose}
          disabled={sendingSuggestion}
          sx={{
            textTransform: 'none',
            fontSize: 13,
            fontWeight: 600,
            color: t.text3,
          }}
        >
          Annuler
        </Button>
        <Button
          onClick={() => void handleGenerate('improve')}
          disabled={loading || sendingSuggestion}
          variant="outlined"
          sx={{
            textTransform: 'none',
            fontSize: 13,
            fontWeight: 600,
            borderColor: t.border,
            color: t.primary,
            '&:hover': {
              borderColor: t.primary,
              bgcolor: t.primaryTint,
            },
          }}
        >
          Ameliorer avec AI
        </Button>
        <Button
          onClick={() => void handleGenerate('regenerate')}
          disabled={loading || sendingSuggestion}
          variant="outlined"
          sx={{
            textTransform: 'none',
            fontSize: 13,
            fontWeight: 600,
            borderColor: t.border,
            color: t.primary,
            '&:hover': {
              borderColor: t.primary,
              bgcolor: t.primaryTint,
            },
          }}
        >
          Regenerer avec AI
        </Button>
        <Button
          onClick={handleUse}
          disabled={!suggestion.trim() || loading || sendingSuggestion}
          variant={onSendSuggestion ? 'outlined' : 'contained'}
          sx={{
            textTransform: 'none',
            fontSize: 13,
            fontWeight: 600,
            borderColor: t.border,
            bgcolor: onSendSuggestion ? 'transparent' : t.primary,
            color: onSendSuggestion ? t.text2 : '#fff',
            '&:hover': {
              borderColor: t.primary,
              bgcolor: onSendSuggestion ? t.primaryTint : t.primaryDeep,
            },
            '&:disabled': {
              bgcolor: onSendSuggestion ? 'transparent' : t.bg3,
              color: t.text4,
            },
          }}
        >
          Modifier avant envoi
        </Button>
        {onSendSuggestion && (
          <Button
            onClick={() => void handleSendSuggestion()}
            disabled={!suggestion.trim() || loading || sendingSuggestion}
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
            {sendingSuggestion ? 'Envoi...' : 'Envoyer sans modifier'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
