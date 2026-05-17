import { Box, Typography, TextField } from '@mui/material';
import { T } from './_tokens';
import type { Thread } from '../../types/unifiedInbox.types';
import type { InboxReservationData } from '../../types/inboxReservation.types';

interface ReviewCenterPanelProps {
  thread: Thread;
  reservation?: InboxReservationData;
  reviewText?: string;
  replyText: string;
  onReplyChange: (text: string) => void;
  onPublish: () => void;
  onAISuggestion?: () => void;
  sending?: boolean;
  otaPlatform?: string;
}

export default function ReviewCenterPanel({
  thread,
  reservation,
  reviewText,
  replyText,
  onReplyChange,
  onPublish,
  onAISuggestion,
  sending,
  otaPlatform = 'Airbnb',
}: ReviewCenterPanelProps) {
  const rating = reservation?.reviewRating ?? 5;
  const replied = reservation?.reviewReplied;

  const stars = Array.from({ length: 5 }, (_, i) => (
    <span key={i} style={{ fontSize: 20, color: i < Math.round(rating) ? '#FFD700' : '#E0E0E0' }}>
      {i < Math.round(rating) ? '⭐' : '☆'}
    </span>
  ));

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, bgcolor: T.bg1 }}>
      <Box
        sx={{
          px: '18px',
          py: '7px',
          fontSize: 10,
          fontFamily: '"Geist Mono", monospace',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          borderBottom: `1px solid ${T.border}`,
          bgcolor: T.airbnbBg,
          color: '#c0353a',
          flexShrink: 0,
        }}
      >
        ⭐ Avis {otaPlatform} · réponse publique
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          px: '24px',
          py: '18px',
          background: `linear-gradient(180deg, ${T.airbnbBg} 0%, ${T.bg0} 40%)`,
        }}
      >
        <Box
          sx={{
            bgcolor: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: '11px',
            p: 2.5,
            textAlign: 'center',
            mb: 2,
          }}
        >
          <Typography sx={{ fontSize: 40, fontWeight: 800, color: '#FFD700', lineHeight: 1 }}>
            {rating.toFixed(1)}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, my: 1 }}>{stars}</Box>
          <Typography sx={{ fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
            Note globale · {thread.name}
          </Typography>
        </Box>

        {reviewText && (
          <Box
            sx={{
              bgcolor: T.bg1,
              border: `1px solid ${T.border}`,
              borderRadius: '14px 14px 14px 6px',
              p: 2,
              mb: 2,
              fontSize: 13,
              lineHeight: 1.55,
              boxShadow: '0 1px 2px rgba(20,17,10,0.06)',
            }}
          >
            <Typography sx={{ fontSize: 10, color: T.text4, fontFamily: '"Geist Mono", monospace', mb: 1 }}>
              Commentaire client
            </Typography>
            {reviewText}
          </Box>
        )}

        {replied && reservation?.reviewResponse ? (
          <Box
            sx={{
              bgcolor: T.successTint,
              border: '1px solid rgba(10,143,94,0.25)',
              borderRadius: '14px 14px 6px 14px',
              p: 2,
              fontSize: 13,
              color: '#0a5c3d',
            }}
          >
            <Typography sx={{ fontSize: 10, fontWeight: 700, mb: 1 }}>✅ Votre réponse publiée</Typography>
            {reservation.reviewResponse}
          </Box>
        ) : (
          <Box
            sx={{
              bgcolor: T.bg1,
              border: `2px solid rgba(255,90,95,0.35)`,
              borderRadius: '11px',
              p: 2,
            }}
          >
            <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1.5 }}>📝 Répondre publiquement</Typography>
            <TextField
              fullWidth
              multiline
              minRows={5}
              value={replyText}
              onChange={(e) => onReplyChange(e.target.value)}
              placeholder="Remerciements, clarifications, engagement…"
              sx={{
                mb: 1.5,
                '& .MuiOutlinedInput-root': { bgcolor: T.bg2, fontSize: 13 },
              }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Box
                component="button"
                onClick={onPublish}
                disabled={!replyText.trim() || sending}
                sx={{
                  flex: 1,
                  py: 1.25,
                  borderRadius: '10px',
                  border: 0,
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 12.5,
                  color: '#fff',
                  background: 'linear-gradient(135deg,#ff8a8e,#FF5A5F)',
                  opacity: !replyText.trim() || sending ? 0.5 : 1,
                }}
              >
                {sending ? 'Envoi…' : 'Publier la réponse'}
              </Box>
              {onAISuggestion && (
                <Box
                  component="button"
                  onClick={onAISuggestion}
                  sx={{
                    width: 40,
                    borderRadius: '9px',
                    border: 0,
                    cursor: 'pointer',
                    background: `linear-gradient(135deg,#9669f7,${T.ai})`,
                    color: '#fff',
                  }}
                >
                  ✨
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          px: '18px',
          py: '7px',
          bgcolor: T.airbnbBg,
          borderTop: `1px solid ${T.border}`,
          fontSize: 10.5,
          color: '#7a1a1d',
          fontFamily: '"Geist Mono", monospace',
          flexShrink: 0,
        }}
      >
        🏠 <b>{otaPlatform} sync</b> · réponse visible sur la plateforme
      </Box>
    </Box>
  );
}
