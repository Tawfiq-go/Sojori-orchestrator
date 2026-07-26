import { useCallback, useEffect, useRef, useState } from 'react';
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
} from '@mui/material';
import { T } from '../unified-inbox/_tokens';
import {
  analyzeConversation,
  type ConversationAnalysisResult,
  type ConversationAnalysisSeverity,
} from '../../services/communicationsAiService';

interface ConversationAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  phone: string;
  reservationId?: string;
  reservationNumber?: string;
  guestName?: string;
  targetLanguage?: string;
  onUseReply: (text: string) => void;
}

const SEVERITY_META: Record<
  ConversationAnalysisSeverity,
  { label: string; color: string; tint: string }
> = {
  critical: { label: 'Critique', color: T.error, tint: T.errorTint },
  important: { label: 'Important', color: T.warning, tint: T.warningTint },
  info: { label: 'Info', color: T.info, tint: T.infoTint },
};

/** Étapes de chargement pilotées côté front (120 s de timeout — pas de spinner muet). */
const LOADING_STEPS: Array<{ atMs: number; label: string }> = [
  { atMs: 0, label: "Récupération de l'historique…" },
  { atMs: 4_000, label: 'Analyse de la conversation…' },
  { atMs: 15_000, label: 'Rédaction des recommandations…' },
];

function severityMeta(severity?: string) {
  if (severity === 'critical' || severity === 'important' || severity === 'info') {
    return SEVERITY_META[severity];
  }
  return SEVERITY_META.info;
}

export default function ConversationAnalysisModal({
  open,
  onClose,
  phone,
  reservationId,
  reservationNumber,
  guestName,
  targetLanguage,
  onUseReply,
}: ConversationAnalysisModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(LOADING_STEPS[0].label);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConversationAnalysisResult | null>(null);
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

  const runAnalysis = useCallback(
    async (regenerate: boolean) => {
      const requestId = ++requestIdRef.current;
      try {
        setLoading(true);
        setError(null);
        setResult(null);
        startStepTimers();

        const data = await analyzeConversation({
          phone,
          reservationId: reservationId || undefined,
          reservationNumber: reservationNumber || undefined,
          targetLanguage: targetLanguage || undefined,
          regenerate: regenerate || undefined,
        });

        if (requestId !== requestIdRef.current) return;
        if (!data.success) {
          throw new Error(data.message || "L'analyse a échoué, réessayez.");
        }
        setResult(data);
      } catch (err: unknown) {
        if (requestId !== requestIdRef.current) return;
        console.error('Erreur analyse IA conversation:', err);
        const status = (err as { response?: { status?: number } })?.response?.status;
        let msg: string;
        if (status === 503) {
          msg = 'IA non configurée';
        } else if (status === 422) {
          msg = "L'analyse a échoué, réessayez";
        } else {
          msg =
            (err as { response?: { data?: { message?: string } }; message?: string })?.response
              ?.data?.message ||
            (err as Error)?.message ||
            "Erreur lors de l'analyse de la conversation";
        }
        setError(msg);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          clearStepTimers();
        }
      }
    },
    [phone, reservationId, reservationNumber, targetLanguage, startStepTimers, clearStepTimers],
  );

  const handleClose = useCallback(() => {
    requestIdRef.current += 1; // invalide toute requête en vol
    clearStepTimers();
    setLoading(false);
    setError(null);
    setResult(null);
    onClose();
  }, [clearStepTimers, onClose]);

  const handleUseReply = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      onUseReply(trimmed);
      handleClose();
    },
    [onUseReply, handleClose],
  );

  useEffect(() => {
    if (!open) return;
    // Déclenchement différé (microtâche) — pas de setState synchrone dans l'effet.
    const kickoff = setTimeout(() => void runAnalysis(false), 0);
    return () => clearTimeout(kickoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Cleanup des timers à l'unmount.
  useEffect(() => clearStepTimers, [clearStepTimers]);

  const problems = result?.problems || [];
  const actions = result?.actions || [];
  const replies = result?.suggestedReplies || [];
  const channels = result?.channelsAnalyzed;

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
        }}
      >
        <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>
          🔍
        </Box>
        Analyse IA de la conversation
        {guestName && (
          <Chip
            size="small"
            label={guestName}
            sx={{ height: 22, fontSize: 10, fontWeight: 700, bgcolor: T.aiTint, color: T.ai }}
          />
        )}
        {channels && (
          <Typography
            component="span"
            sx={{ fontSize: 11, fontWeight: 600, color: T.text3, ml: 'auto' }}
          >
            {channels.whatsapp} msg WhatsApp
            {channels.ota > 0 ? ` · ${channels.ota} msg OTA` : ''}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: '15px !important', pb: 2 }}>
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
            <CircularProgress size={40} sx={{ color: T.ai }} />
            <Typography sx={{ fontSize: 13, color: T.text3 }}>{loadingStep}</Typography>
          </Box>
        ) : result ? (
          <>
            {result.summary && (
              <Typography
                sx={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: T.text,
                  mb: 2.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {result.summary}
              </Typography>
            )}

            {problems.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    mb: 1,
                  }}
                >
                  Problèmes détectés
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {problems.map((problem, index) => {
                    const meta = severityMeta(problem.severity);
                    return (
                      <Box
                        key={`${problem.title}-${index}`}
                        sx={{
                          borderLeft: `3px solid ${meta.color}`,
                          bgcolor: meta.tint,
                          borderRadius: '0 8px 8px 0',
                          px: 1.5,
                          py: 1.25,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                            {problem.title}
                          </Typography>
                          <Chip
                            size="small"
                            label={meta.label}
                            sx={{
                              height: 18,
                              fontSize: 9.5,
                              fontWeight: 700,
                              bgcolor: 'transparent',
                              border: `1px solid ${meta.color}`,
                              color: meta.color,
                            }}
                          />
                        </Box>
                        {problem.consequence && (
                          <Typography sx={{ fontSize: 12.5, lineHeight: 1.5, color: T.text2 }}>
                            {problem.consequence}
                          </Typography>
                        )}
                        {problem.evidence && (
                          <Typography
                            sx={{
                              fontSize: 11.5,
                              fontStyle: 'italic',
                              color: T.text3,
                              mt: 0.5,
                            }}
                          >
                            « {problem.evidence} »
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {actions.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    mb: 1,
                  }}
                >
                  Actions à prendre
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {actions.map((action, index) => (
                    <Box
                      key={`${action.title}-${index}`}
                      sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}
                    >
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '6px',
                          bgcolor: T.aiTint,
                          color: T.ai,
                          fontSize: 11,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          mt: '1px',
                        }}
                      >
                        {index + 1}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                            {action.title}
                          </Typography>
                          {action.deadline && (
                            <Chip
                              size="small"
                              label={`⏱ ${action.deadline}`}
                              sx={{
                                height: 18,
                                fontSize: 9.5,
                                fontWeight: 700,
                                bgcolor: T.warningTint,
                                color: T.warning,
                              }}
                            />
                          )}
                        </Box>
                        <Typography sx={{ fontSize: 12.5, lineHeight: 1.5, color: T.text2 }}>
                          {action.recommendation}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {replies.length > 0 && (
              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    mb: 1,
                  }}
                >
                  Réponses suggérées
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {replies.map((reply, index) => (
                    <Box
                      key={`${reply.label}-${index}`}
                      sx={{
                        p: 1.5,
                        borderRadius: '10px',
                        bgcolor: T.bg2,
                        border: `1px solid ${T.border}`,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          mb: 0.75,
                        }}
                      >
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3 }}>
                          {reply.label}
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleUseReply(reply.responseClient)}
                          sx={{
                            ml: 'auto',
                            textTransform: 'none',
                            fontSize: 12,
                            fontWeight: 600,
                            py: '2px',
                            px: 1.25,
                            minWidth: 0,
                            borderColor: T.borderStrong,
                            color: T.ai,
                            '&:hover': {
                              borderColor: T.ai,
                              bgcolor: T.aiTint,
                            },
                          }}
                        >
                          Utiliser
                        </Button>
                      </Box>
                      <Typography
                        sx={{ fontSize: 13, lineHeight: 1.6, color: T.text, whiteSpace: 'pre-wrap' }}
                      >
                        {reply.responseClient}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {!result.summary && !problems.length && !actions.length && !replies.length && (
              <Typography sx={{ fontSize: 13, color: T.text3, textAlign: 'center', py: 4 }}>
                Aucun élément notable détecté dans cette conversation.
              </Typography>
            )}
          </>
        ) : !error ? (
          <Typography sx={{ fontSize: 13, color: T.text3, textAlign: 'center', py: 4 }}>
            Aucune analyse disponible.
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
              mr: 'auto',
            }}
          />
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
          Annuler
        </Button>
        <Button
          onClick={() => void runAnalysis(true)}
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
  );
}
