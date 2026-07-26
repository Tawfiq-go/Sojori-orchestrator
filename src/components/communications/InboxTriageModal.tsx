import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Snackbar,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { T } from '../unified-inbox/_tokens';
import { otaInboxUrl, waInboxUrl } from '../../utils/commsDeepLinks';
import {
  triageInbox,
  type InboxTriageCounts,
  type InboxTriageResult,
  type InboxTriageRow,
} from '../../services/communicationsAiService';

interface InboxTriageModalProps {
  open: boolean;
  onClose: () => void;
  targetLanguage?: string;
}

/** Étapes de chargement pilotées côté front (120 s de timeout — pas de spinner muet). */
const LOADING_STEPS: Array<{ atMs: number; label: string }> = [
  { atMs: 0, label: 'Collecte des conversations…' },
  { atMs: 5_000, label: 'Analyse IA des conversations prioritaires…' },
];

type TriageSectionId =
  | 'unanswered'
  | 'frustrated'
  | 'problem'
  | 'awaiting'
  | 'awaiting_guest'
  | 'ok';

const SECTION_META: Record<
  TriageSectionId,
  { emoji: string; label: string; color: string; tint: string }
> = {
  unanswered: { emoji: '🔴', label: 'Pas répondu', color: T.error, tint: T.errorTint },
  frustrated: { emoji: '😡', label: 'Frustré / pas content', color: T.error, tint: T.errorTint },
  problem: { emoji: '⚠️', label: 'Problème détecté', color: T.warning, tint: T.warningTint },
  awaiting: { emoji: '🟠', label: 'En attente de réponse', color: T.warning, tint: T.warningTint },
  awaiting_guest: { emoji: '⏳', label: 'En attente du guest', color: T.info, tint: T.infoTint },
  ok: { emoji: '🙂', label: 'RAS', color: T.success, tint: T.successTint },
};

const SECTION_ORDER: TriageSectionId[] = [
  'unanswered',
  'frustrated',
  'problem',
  'awaiting',
  'awaiting_guest',
  'ok',
];

/** Une ligne apparaît dans la PREMIÈRE section qui la concerne (jamais dupliquée). */
function sectionForRow(row: InboxTriageRow): TriageSectionId {
  if (row.status === 'unanswered') return 'unanswered';
  if (row.ai?.sentiment === 'frustrated' || row.ai?.sentiment === 'unhappy') return 'frustrated';
  if (row.ai?.problem) return 'problem';
  if (row.status === 'awaiting') return 'awaiting';
  if (row.status === 'awaiting_guest') return 'awaiting_guest';
  return 'ok';
}

/** « il y a 6 h » depuis hoursSinceLastGuestMessage (délais calculés serveur en UTC). */
function relativeDelay(hours?: number): string | null {
  if (typeof hours !== 'number' || !Number.isFinite(hours) || hours < 0) return null;
  if (hours < 1) return "il y a moins d'1 h";
  if (hours < 48) return `il y a ${Math.round(hours)} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}

function truncate(text: string, max = 110): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

const COUNT_CHIPS: Array<{
  key: keyof InboxTriageCounts;
  emoji: string;
  label: string;
  color: string;
  tint: string;
}> = [
  { key: 'unanswered', emoji: '🔴', label: 'Pas répondu', color: T.error, tint: T.errorTint },
  { key: 'frustrated', emoji: '😡', label: 'Frustrés', color: T.error, tint: T.errorTint },
  { key: 'problems', emoji: '⚠️', label: 'Problèmes', color: T.warning, tint: T.warningTint },
  { key: 'awaiting', emoji: '🟠', label: 'En attente', color: T.warning, tint: T.warningTint },
  { key: 'awaitingGuest', emoji: '⏳', label: 'Attente guest', color: T.info, tint: T.infoTint },
  { key: 'ok', emoji: '🙂', label: 'RAS', color: T.success, tint: T.successTint },
];

export default function InboxTriageModal({
  open,
  onClose,
  targetLanguage,
}: InboxTriageModalProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(LOADING_STEPS[0].label);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InboxTriageResult | null>(null);
  const [copiedToastOpen, setCopiedToastOpen] = useState(false);
  const stepTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const requestIdRef = useRef(0);

  const clearStepTimers = useCallback(() => {
    for (const timer of stepTimersRef.current) clearTimeout(timer);
    stepTimersRef.current = [];
  }, []);

  const startStepTimers = useCallback(() => {
    clearStepTimers();
    setLoadingStep(LOADING_STEPS[0].label);
    stepTimersRef.current = LOADING_STEPS.slice(1).map((step) =>
      setTimeout(() => setLoadingStep(step.label), step.atMs),
    );
  }, [clearStepTimers]);

  const runTriage = useCallback(
    async (regenerate: boolean) => {
      const requestId = ++requestIdRef.current;
      try {
        setLoading(true);
        setError(null);
        setResult(null);
        startStepTimers();

        const data = await triageInbox({
          regenerate: regenerate || undefined,
          targetLanguage: targetLanguage || undefined,
        });

        if (requestId !== requestIdRef.current) return;
        if (!data.success) {
          throw new Error(
            data.message ||
              (data as { error?: string }).error ||
              'Le triage a échoué, réessayez.',
          );
        }
        setResult(data);
      } catch (err: unknown) {
        if (requestId !== requestIdRef.current) return;
        console.error('Erreur triage IA inbox:', err);
        const status = (err as { response?: { status?: number } })?.response?.status;
        const apiError = (
          err as { response?: { data?: { error?: string; message?: string } }; message?: string }
        )?.response?.data;
        let msg: string;
        if (status === 503 || apiError?.error === 'analysis_not_configured') {
          msg = 'IA non configurée';
        } else if (status === 403 || apiError?.error === 'owner_forbidden') {
          msg = 'Accès refusé';
        } else if (status === 422) {
          msg = 'Le triage a échoué, réessayez';
        } else {
          msg =
            apiError?.message ||
            apiError?.error ||
            (err as Error)?.message ||
            "Erreur lors du triage de l'inbox";
        }
        setError(msg);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          clearStepTimers();
        }
      }
    },
    [targetLanguage, startStepTimers, clearStepTimers],
  );

  const handleClose = useCallback(() => {
    requestIdRef.current += 1; // invalide toute requête en vol
    clearStepTimers();
    setLoading(false);
    setError(null);
    setResult(null);
    onClose();
  }, [clearStepTimers, onClose]);

  const openConversation = useCallback(
    (row: InboxTriageRow) => {
      const url =
        row.channel === 'ota'
          ? otaInboxUrl({ threadId: row.threadId, reservationNumber: row.reservationNumber })
          : waInboxUrl({ phone: row.phone, reservationNumber: row.reservationNumber });
      handleClose();
      navigate(url);
    },
    [navigate, handleClose],
  );

  const handleUseReply = useCallback(
    (row: InboxTriageRow) => {
      const reply = row.ai?.suggestedReply?.trim();
      if (reply) {
        // Presse-papier : le deep-link ne permet pas de pré-remplir le composer.
        void navigator.clipboard?.writeText(reply).catch(() => undefined);
        setCopiedToastOpen(true);
      }
      openConversation(row);
    },
    [openConversation],
  );

  useEffect(() => {
    if (!open) return;
    // Déclenchement différé (microtâche) — pas de setState synchrone dans l'effet.
    const kickoff = setTimeout(() => void runTriage(false), 0);
    return () => clearTimeout(kickoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cleanup des timers à l'unmount.
  useEffect(() => clearStepTimers, [clearStepTimers]);

  const rows = useMemo(() => result?.rows || [], [result]);
  const counts = result?.counts;

  const sections = useMemo(() => {
    const grouped = new Map<TriageSectionId, InboxTriageRow[]>();
    for (const row of rows) {
      const section = sectionForRow(row);
      const list = grouped.get(section);
      if (list) list.push(row);
      else grouped.set(section, [row]);
    }
    return SECTION_ORDER.filter((id) => (grouped.get(id) || []).length > 0).map((id) => ({
      id,
      meta: SECTION_META[id],
      rows: grouped.get(id) as InboxTriageRow[],
    }));
  }, [rows]);

  const renderRow = (row: InboxTriageRow, accent: string) => {
    const delay = relativeDelay(row.hoursSinceLastGuestMessage);
    return (
      <Box
        key={row.id}
        onClick={() => openConversation(row)}
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
          px: 1.25,
          py: 1,
          borderRadius: '8px',
          border: `1px solid ${T.border}`,
          borderLeft: `3px solid ${accent}`,
          bgcolor: T.bg1,
          cursor: 'pointer',
          transition: 'background-color 120ms ease',
          '&:hover': { bgcolor: T.bg2 },
        }}
      >
        <Box sx={{ fontSize: 15, lineHeight: '20px', flexShrink: 0 }} title={row.channel === 'ota' ? 'OTA' : 'WhatsApp'}>
          {row.channel === 'ota' ? '🏨' : '💬'}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.text }}>
              {row.guestName || 'Guest'}
            </Typography>
            {row.listingName && (
              <Typography
                sx={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: T.text3,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.listingName}
              </Typography>
            )}
            {row.reservationNumber && (
              <Typography
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: T.text4,
                }}
              >
                {row.reservationNumber}
              </Typography>
            )}
            {delay && (
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: T.text3, ml: 'auto' }}>
                {delay}
              </Typography>
            )}
          </Box>
          {row.lastMessagePreview && (
            <Typography
              sx={{
                fontSize: 12,
                color: T.text2,
                mt: 0.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {truncate(row.lastMessagePreview)}
            </Typography>
          )}
          {row.ai?.action && (
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: T.ai, mt: 0.25 }}>
              → {row.ai.action}
            </Typography>
          )}
        </Box>
        {row.ai?.suggestedReply && (
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => {
              e.stopPropagation();
              handleUseReply(row);
            }}
            sx={{
              flexShrink: 0,
              alignSelf: 'center',
              textTransform: 'none',
              fontSize: 11.5,
              fontWeight: 600,
              py: '1px',
              px: 1,
              minWidth: 0,
              borderColor: T.borderStrong,
              color: T.ai,
              '&:hover': { borderColor: T.ai, bgcolor: T.aiTint },
            }}
          >
            Utiliser
          </Button>
        )}
      </Box>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '12px',
              bgcolor: T.bg1,
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            fontSize: 16,
            fontWeight: 700,
            color: T.text,
            borderBottom: `1px solid ${T.border}`,
            pb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>
            🌅
          </Box>
          Triage IA de l'inbox
          {counts && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', ml: 'auto' }}>
              {COUNT_CHIPS.filter((c) => (counts[c.key] || 0) > 0).map((c) => (
                <Chip
                  key={c.key}
                  size="small"
                  label={`${c.emoji} ${c.label} · ${counts[c.key]}`}
                  sx={{
                    height: 22,
                    fontSize: 10,
                    fontWeight: 700,
                    bgcolor: c.tint,
                    color: c.color,
                  }}
                />
              ))}
            </Box>
          )}
        </DialogTitle>

        <DialogContent sx={{ pt: '15px !important', pb: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {result?.aiError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Statuts factuels seuls — l'analyse IA a échoué
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
              <CircularProgress size={40} sx={{ color: T.ai }} />
              <Typography sx={{ fontSize: 13, color: T.text3 }}>{loadingStep}</Typography>
            </Box>
          ) : result ? (
            sections.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
                {sections.map((section) => (
                  <Box key={section.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: T.text3,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {section.meta.emoji} {section.meta.label}
                      </Typography>
                      <Box
                        sx={{
                          fontFamily: '"Geist Mono", monospace',
                          fontSize: 10,
                          fontWeight: 800,
                          px: 0.75,
                          py: '1px',
                          borderRadius: 999,
                          bgcolor: section.meta.tint,
                          color: section.meta.color,
                        }}
                      >
                        {section.rows.length}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      {section.rows.map((row) => renderRow(row, section.meta.color))}
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography sx={{ fontSize: 13, color: T.text3, textAlign: 'center', py: 4 }}>
                Aucune conversation active à trier.
              </Typography>
            )
          ) : !error ? (
            <Typography sx={{ fontSize: 13, color: T.text3, textAlign: 'center', py: 4 }}>
              Aucun triage disponible.
            </Typography>
          ) : null}
        </DialogContent>

        <DialogActions
          sx={{
            borderTop: `1px solid ${T.border}`,
            px: 3,
            py: 2,
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          {result?.model && (
            <Chip
              size="small"
              label={result.cached ? `${result.model} · cache` : result.model}
              sx={{
                height: 22,
                fontSize: 10,
                fontWeight: 700,
                bgcolor: T.aiTint,
                color: T.ai,
              }}
            />
          )}
          {result && (
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: T.text3, mr: 'auto' }}>
              {result.aiAnalyzed ?? 0} analysée{(result.aiAnalyzed ?? 0) > 1 ? 's' : ''} par IA
              {counts ? ` / ${counts.total} conversation${counts.total > 1 ? 's' : ''}` : ''}
            </Typography>
          )}
          <Button
            onClick={handleClose}
            sx={{
              textTransform: 'none',
              fontSize: 13,
              fontWeight: 600,
              color: T.text3,
            }}
          >
            Fermer
          </Button>
          <Button
            onClick={() => void runTriage(true)}
            disabled={loading}
            variant="outlined"
            sx={{
              textTransform: 'none',
              fontSize: 13,
              fontWeight: 600,
              borderColor: T.borderStrong,
              color: T.ai,
              '&:hover': {
                borderColor: T.ai,
                bgcolor: T.aiTint,
              },
            }}
          >
            ↻ Régénérer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={copiedToastOpen}
        autoHideDuration={4000}
        onClose={() => setCopiedToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message="Réponse copiée — collez-la dans le composer"
      />
    </>
  );
}
