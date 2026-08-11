import { useRef, useState } from 'react';
import { useInboxMessageScroll } from './useInboxMessageScroll';
import { highlightInboxKeyword, messageMatchesKeyword } from './highlightInboxKeyword';
import { Box, Stack, Typography, CircularProgress, Tooltip, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import { DoneAll, Close } from '@mui/icons-material';
import { T } from './_tokens';
import { flagFromPhone } from './inboxFormat';
import { getOtaTheme, isOtaChannelType } from './otaPlatformTheme';
import type { Thread, Message, QuickTemplate, QuickAction, GuestMenuDispatchOption } from '../../types/unifiedInbox.types';
import { formatWhatsAppDeliveryError } from './formatWhatsAppDeliveryError';
import { extractHttpErrorMessage } from '../../utils/extractHttpErrorMessage';
import { useAuth } from '../../hooks/useAuth';
import { useWriteAccess } from '../../hooks/useWriteAccess';
import { Roles } from '../../constants/roles';
import { formatOtaOriginalLanguageBadge } from './otaOriginalLanguage';

function interactiveContentBadge(
  contentType?: Message['contentType'] | null,
  isOutbound?: boolean,
): string | null {
  if (contentType === 'flow') return isOutbound ? '🧩 FLOW ENVOYÉ' : '🧩 FLOW REPLY';
  if (contentType === 'buttons') return isOutbound ? '🔘 BOUTONS ENVOYÉS' : '🔘 BUTTON REPLY';
  if (contentType === 'list') return isOutbound ? '📋 LISTE ENVOYÉE' : '📋 LIST REPLY';
  if (contentType === 'interactive') return isOutbound ? '📲 INTERACTIF ENVOYÉ' : '↩️ INTERACTIVE REPLY';
  if (contentType === 'template') return '📨 TEMPLATE';
  if (contentType === 'audio') return '🎤 AUDIO';
  return null;
}

function hasFailedTraceStep(message: Message): boolean {
  return Boolean(message.processingTrace?.steps?.some((step) => step.status === 'failed'));
}

/**
 * Bulle OTA : FR principal + darija discret + original au clic.
 * Badge langue d'origine en bas à droite (en / fr / ar…).
 * (WhatsApp n'utilise pas ces champs — auto-piloté IA.)
 */
function OtaTranslatedBody({
  text,
  translatedFr,
  translatedAry,
  originalText,
  originalLanguage,
  keyword,
}: {
  text: string;
  translatedFr?: string | null;
  translatedAry?: string | null;
  originalText?: string | null;
  originalLanguage?: string | null;
  keyword?: string;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const hasTranslation = Boolean(translatedFr || translatedAry);
  const mainText = translatedFr || text;
  const original = originalText || text;
  const originalDiffers =
    hasTranslation && original.trim() !== String(mainText || '').trim();
  const kw = keyword?.trim() || '';
  const langBadge = formatOtaOriginalLanguageBadge(originalLanguage);

  return (
    <Box>
      <Typography
        component="div"
        dir="auto"
        sx={{
          fontSize: 'inherit',
          color: 'inherit',
          lineHeight: 'inherit',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}
      >
        {kw ? highlightInboxKeyword(mainText, kw) : mainText}
      </Typography>

      {translatedAry ? (
        <Box
          dir="auto"
          sx={{
            mt: 0.75,
            pt: 0.75,
            borderTop: `1px dashed ${T.border}`,
            fontSize: 11.5,
            lineHeight: 1.6,
            color: T.text3,
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}
        >
          {translatedAry}
        </Box>
      ) : null}

      {originalDiffers ? (
        <Box sx={{ mt: 0.75 }}>
          <Box
            component="button"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowOriginal((v) => !v);
            }}
            sx={{
              p: 0,
              border: 0,
              background: 'none',
              cursor: 'pointer',
              fontFamily: '"Geist Mono", monospace',
              fontSize: 9.5,
              letterSpacing: 0.3,
              color: T.text4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              '&:hover': { color: T.text3, textDecoration: 'underline' },
            }}
          >
            🌐 {showOriginal ? 'masquer l’original' : 'voir l’original'}
          </Box>
          {showOriginal ? (
            <Box
              dir="auto"
              sx={{
                mt: 0.5,
                p: '6px 8px',
                borderRadius: '6px',
                bgcolor: T.bg2,
                fontSize: 11.5,
                lineHeight: 1.55,
                color: T.text3,
                fontStyle: 'italic',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >
              {original}
            </Box>
          ) : null}
        </Box>
      ) : null}

      {langBadge ? (
        <Box
          sx={{
            mt: 0.6,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Box
            component="span"
            title={`Langue d’origine du voyageur : ${String(originalLanguage || '').toUpperCase()}`}
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.04em',
              lineHeight: 1.2,
              px: 0.55,
              py: '2px',
              borderRadius: '4px',
              border: `1px solid ${T.border}`,
              color: T.text3,
              bgcolor: T.bg2,
              userSelect: 'none',
            }}
          >
            {langBadge}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}

interface ConversationThreadProps {
  thread: Thread;
  messages: Message[];
  quickTemplates: QuickTemplate[];
  /** Réponses rapides OTA (pilules, entre messages et templates) */
  quickReplies?: QuickTemplate[];
  quickActions?: QuickAction[];
  /** Menu codes C/D/E… — envoi flow ou réponse backend (admin inbox guest WA) */
  guestMenuDispatch?: GuestMenuDispatchOption[];
  onSendGuestMenu?: (menuCode: string) => Promise<void>;
  sendingGuestMenuCode?: string | null;
  onSendMessage: (text: string) => void | Promise<void>;
  onSelectTemplate: (template: QuickTemplate) => void;
  onAISuggestion?: (draft: string) => void;
  /** Analyse IA de la conversation (diagnostic + plan d'action) — bouton affiché seulement si fourni */
  onAIAnalysis?: () => void;
  /** Inbox Resa — enregistrer une note vocale */
  onRecordVoice?: () => void;
  recordingVoice?: boolean;
  /** Envoi audio en cours */
  sendingVoice?: boolean;
  /** Inbox Resa — cliquer un message ouvre le détail (filtres / transcript) */
  onSelectMessage?: (message: Message) => void;
  selectedMessageId?: string | null;
  composerValue?: string;
  onComposerValueChange?: (value: string) => void;
  otaPlatform?: string;
  loadingMessages?: boolean;
  messagesLoadError?: string | null;
  messagesTotal?: number;
  /** OTA recherche avancée : surligner + scroll vers la 1ʳᵉ occurrence */
  highlightKeyword?: string;
  /**
   * Force le mode de rendu du fil.
   * - whatsapp: toujours wording/actions WhatsApp (même si channel=ab|bk)
   * - ota: toujours wording/actions OTA
   * - auto: déduit depuis thread.channel
   */
  threadMode?: 'auto' | 'whatsapp' | 'ota';
  /** OTA : statut WhatsApp guest + ouverture du fil */
  whatsappGuestKind?: 'loading' | 'actif' | 'jamais' | 'nonum' | null;
  onOpenWhatsApp?: () => void;
  /** OTA : cycle messageStatus (created / received / responded / ignored) */
  otaMessageStatus?: string | null;
  /** OTA : marquer le fil répondu ou ignoré (sans envoyer) */
  onMarkOtaThreadStatus?: (status: 'responded' | 'ignored') => void | Promise<void>;
  markingOtaThreadStatus?: boolean;
}

export default function ConversationThread({
  thread,
  messages,
  quickTemplates,
  quickActions = [],
  guestMenuDispatch = [],
  onSendGuestMenu,
  sendingGuestMenuCode = null,
  onSendMessage,
  onSelectTemplate,
  onAISuggestion,
  onAIAnalysis,
  onRecordVoice,
  recordingVoice = false,
  sendingVoice = false,
  onSelectMessage,
  selectedMessageId = null,
  composerValue,
  onComposerValueChange,
  otaPlatform = 'Airbnb',
  quickReplies = [],
  loadingMessages = false,
  messagesLoadError = null,
  messagesTotal = 0,
  highlightKeyword = '',
  threadMode = 'auto',
  whatsappGuestKind = null,
  onOpenWhatsApp,
  otaMessageStatus = null,
  onMarkOtaThreadStatus,
  markingOtaThreadStatus = false,
}: ConversationThreadProps) {

  const { user } = useAuth();
  const { readOnly } = useWriteAccess();
  const normalizedRole = String(user?.role || '').toLowerCase();
  const canInspectAi =
    user?.role === Roles.Admin ||
    user?.role === Roles.SuperAdmin ||
    normalizedRole === 'admin' ||
    normalizedRole === 'superadmin';
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [internalComposerValue, setInternalComposerValue] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [inspectedMessage, setInspectedMessage] = useState<Message | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [expandedTraceSteps, setExpandedTraceSteps] = useState<Record<string, boolean>>({});
  const [inspectTab, setInspectTab] = useState<'process' | 'prompt' | 'cost'>('process');
  const [expandedPromptParts, setExpandedPromptParts] = useState<Record<string, boolean>>({});
  const [flowMenuOpen, setFlowMenuOpen] = useState(false);
  const hasRenderableMessages =
    messages.filter((m) => m.type !== 'day-separator').length > 0;

  const { containerRef: messagesContainerRef, endRef: messagesEndRef } = useInboxMessageScroll(
    thread.id,
    messages.length,
    loadingMessages,
    highlightKeyword,
    messages,
  );

  const kw = highlightKeyword?.trim() ?? '';
  void quickActions;
  const otaStatusRaw = String(otaMessageStatus || '').toLowerCase().trim();
  const otaStatusNorm =
    otaStatusRaw === 'replied'
      ? 'responded'
      : otaStatusRaw === 'pending'
        ? 'received'
        : otaStatusRaw;

  const guestMenuKindStyle = (kind: GuestMenuDispatchOption['kind']) => {
    if (kind === 'flow') {
      return {
        bg: 'rgba(124,58,237,0.08)',
        border: 'rgba(124,58,237,0.35)',
        hoverBg: 'rgba(124,58,237,0.14)',
        hoverBorder: '#7c3aed',
        color: '#5b21b6',
      };
    }
    if (kind === 'interactive') {
      return {
        bg: 'rgba(37,99,235,0.08)',
        border: 'rgba(37,99,235,0.35)',
        hoverBg: 'rgba(37,99,235,0.14)',
        hoverBorder: '#2563eb',
        color: '#1d4ed8',
      };
    }
    return {
      bg: T.bg1,
      border: T.border,
      hoverBg: T.primaryTint,
      hoverBorder: T.primary,
      color: T.text2,
    };
  };

  const handleGuestMenuSend = async (code: string) => {
    if (!onSendGuestMenu || sendingGuestMenuCode) return;
    setSendError(null);
    try {
      await onSendGuestMenu(code);
      setFlowMenuOpen(false);
    } catch (err: unknown) {
      setSendError(extractHttpErrorMessage(err, 'Échec envoi flow / menu WhatsApp'));
    }
  };
  const inspectedSteps = inspectedMessage?.processingTrace?.steps ?? [];
  const routingDetails = inspectedSteps.find((step) => step.key === 'routing')?.details;
  const planDetails = inspectedSteps.find((step) => step.key === 'response_plan')?.details;
  const inspectedCategories =
    (planDetails?.categories as string[] | undefined) ??
    (routingDetails?.selectedCategories as string[] | undefined) ??
    [];
  const isInspectableMessage = (message: Message) => {
    if (!canInspectAi) return false;
    if (message.type === 'day-separator' || message.type === 'system-note') return false;
    // WhatsApp bot answers
    if (message.isAI && !message.isAdmin) return true;
    // OTA AI-generated / AI-assisted outgoing (staff-authored but inspectable)
    if (message.generationId || message.replyMode === 'ai_assisted' || message.replyMode === 'ai_generated') {
      return message.from === 'you' || message.from === 'sojori' || Boolean(message.isAI);
    }
    return Boolean(message.processingTrace || message.aiPrompt);
  };

  const openTrace = async (message: Message) => {
    if (onSelectMessage) {
      onSelectMessage(message);
      return;
    }
    if (!isInspectableMessage(message)) return;
    setExpandedTraceSteps({});
    setExpandedPromptParts({});
    // OTA AI audit is prompt/cost only — WhatsApp keeps Process tab.
    const isOtaAiAudit = Boolean(
      message.generationId ||
        message.replyMode === 'ai_assisted' ||
        message.replyMode === 'ai_generated',
    );
    setInspectTab(isOtaAiAudit ? 'prompt' : 'process');

    const hasEmbeddedAudit = Boolean(message.processingTrace || message.aiPrompt || message.aiUsage);
    if (hasEmbeddedAudit) {
      setInspectedMessage(message);
      return;
    }
    if (!message.generationId) {
      setInspectedMessage({
        ...message,
        // Marker for precise OTA missing-link copy (not WhatsApp deterministic).
        aiUsage: message.aiUsage ?? null,
        aiPrompt: message.aiPrompt ?? null,
      });
      return;
    }

    setInspectLoading(true);
    setInspectedMessage(message);
    try {
      const { fetchOtaAiGenerationAudit } = await import('../../services/communicationsAiService');
      const data = await fetchOtaAiGenerationAudit(message.generationId);
      if (data.success && data.generation) {
        setInspectedMessage({
          ...message,
          isAI: true,
          processingTrace: data.generation.processingTrace ?? undefined,
          aiPrompt: data.generation.aiPrompt ?? null,
          aiUsage: data.generation.aiUsage ?? null,
          aiModel: data.generation.aiUsage?.model,
          tokensUsed: data.generation.aiUsage?.tokensUsed,
        });
      } else {
        setInspectedMessage({
          ...message,
          // Keep generationId so UI can show audit-link error (not deterministic WA copy).
        });
      }
    } catch (err) {
      console.warn('[AI inspector] OTA audit fetch failed', err);
      setInspectedMessage({ ...message });
    } finally {
      setInspectLoading(false);
    }
  };

  const isOta =
    threadMode === 'ota'
      ? true
      : threadMode === 'whatsapp'
        ? false
        : isOtaChannelType(thread.channel);
  const otaTheme = getOtaTheme(thread.channel, otaPlatform);
  const flag = thread.guestFlag || flagFromPhone(thread.phone);
  const platformLabel = otaPlatform || otaTheme.label;
  const inputValue = composerValue ?? internalComposerValue;
  const setInputValue = (value: string) => {
    onComposerValueChange?.(value);
    if (composerValue === undefined) {
      setInternalComposerValue(value);
    }
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (readOnly || !text || sending) return;
    setSending(true);
    setSendError(null);
    try {
      await onSendMessage(text);
      setInputValue('');
    } catch (err: unknown) {
      setSendError(extractHttpErrorMessage(err, 'Échec envoi WhatsApp'));
    } finally {
      setSending(false);
    }
  };

  const bubbleStyles = (from: Message['from']) => {
    const isGuest = from === 'guest';
    const isOut = from === 'you' || from === 'sojori';

    if (isOta) {
      if (isGuest) {
        return {
          bg: T.bg1,
          border: `1px solid ${T.border}`,
          radius: '18px 18px 18px 6px',
          color: T.text,
        };
      }
      return {
        bg: otaTheme.bgTint,
        border: `1px solid ${otaTheme.borderTint}`,
        radius: '18px 18px 6px 18px',
        color: otaTheme.textAccent,
      };
    }

    if (isGuest) {
      return {
        bg: T.bg1,
        border: `1px solid ${T.border}`,
        radius: '14px 14px 14px 4px',
        color: T.text,
      };
    }
    if (isOut) {
      return {
        bg: 'linear-gradient(135deg,#dcf8c6,#c5e8b3)',
        border: '1px solid rgba(37,211,102,0.30)',
        radius: '14px 14px 4px 14px',
        color: '#0a3a17',
      };
    }
    return { bg: T.bg2, border: `1px solid ${T.border}`, radius: '14px', color: T.text };
  };

  const initials = thread.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2);

  const avatarBg = isOta ? otaTheme.avatarGradient : thread.avatarColor || T.green;

  const presenceLabel = thread.presenceLabel;
  const guestsCompact = thread.guestsCompact || thread.guestsLabel;
  const regTotal = thread.registrationTotal;
  const regDone = thread.registrationRegistered;
  const hasReg =
    typeof regTotal === 'number' && regTotal > 0 && typeof regDone === 'number';
  const regComplete = hasReg && regDone >= regTotal;
  const showStayStrip = Boolean(
    presenceLabel ||
      guestsCompact ||
      hasReg ||
      thread.arrivalTimeLabel ||
      thread.arrivalTimeChosen ||
      typeof thread.arrivalDeclared === 'boolean' ||
      typeof thread.departureDeclared === 'boolean' ||
      thread.reservationNumber,
  );

  const stayChipSx = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    px: '6px',
    py: '1px',
    borderRadius: '4px',
    fontSize: 10,
    fontWeight: 700,
    fontFamily: '"Geist Mono", monospace',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap' as const,
    lineHeight: 1.35,
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
        bgcolor: T.bg1,
      }}
    >
      <Box
        sx={{
          px: isOta ? '12px' : '18px',
          py: isOta ? '8px' : '11px',
          borderBottom: `1px solid ${T.border}`,
          bgcolor: T.bg2,
          display: 'flex',
          alignItems: 'center',
          gap: isOta ? 1 : 1.5,
          flexShrink: 0,
        }}
      >
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <Box
            sx={{
              width: isOta ? 28 : 42,
              height: isOta ? 28 : 42,
              borderRadius: '50%',
              background: avatarBg,
              fontSize: isOta ? 11 : 14,
              fontWeight: 700,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {initials}
          </Box>
          {!isOta && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 1,
                right: 1,
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: T.success,
                border: `2px solid ${T.bg2}`,
              }}
            />
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            sx={{ gap: 0.75, alignItems: 'center', mb: '2px' }}
          >
            <Typography
              sx={{
                fontSize: isOta ? 13 : 14.5,
                fontWeight: 700,
                letterSpacing: '-0.015em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {isOta ? `${otaTheme.headerIcon} ${thread.name}` : thread.name}
            </Typography>
            {flag && (
              <Typography sx={{ fontSize: 14, lineHeight: 1 }}>{flag}</Typography>
            )}
            {thread.isVip && (
              <Box
                sx={{
                  background: `linear-gradient(135deg, ${T.primarySoft}, ${T.primaryDeep})`,
                  color: '#1a1408',
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: 9,
                  fontWeight: 800,
                  px: '6px',
                  py: '1px',
                  borderRadius: '4px',
                  letterSpacing: '0.04em',
                }}
              >
                ⭐ VIP
              </Box>
            )}
          </Stack>

          <Box
            sx={{
              fontSize: 10.5,
              color: T.text3,
              fontFamily: '"Geist Mono", monospace',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              alignItems: 'center',
            }}
          >
            {thread.phone && <span>📱 {thread.phone}</span>}
            {!isOta && thread.guestPresence && (
              <>
                {thread.phone ? <span style={{ color: T.text4 }}>·</span> : null}
                <span style={{ color: T.success, fontWeight: 700 }}>🟢 {thread.guestPresence}</span>
              </>
            )}
            {thread.reservationNumber && (
              <>
                {(thread.phone || (!isOta && thread.guestPresence)) ? (
                  <span style={{ color: T.text4 }}>·</span>
                ) : null}
                <span>{thread.reservationNumber}</span>
              </>
            )}
          </Box>

          {showStayStrip ? (
            <Box
              sx={{
                mt: 0.625,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
                alignItems: 'center',
              }}
            >
              {presenceLabel ? (
                <Box
                  sx={{
                    ...stayChipSx,
                    bgcolor:
                      presenceLabel === 'Présent' || presenceLabel === 'En cours'
                        ? 'rgba(10,143,94,0.12)'
                        : presenceLabel === 'Attendu' || presenceLabel === "Aujourd'hui"
                          ? 'rgba(6,115,179,0.12)'
                          : presenceLabel === 'Départ auj.'
                            ? 'rgba(196,101,6,0.12)'
                            : 'rgba(20,17,10,0.06)',
                    color:
                      presenceLabel === 'Présent' || presenceLabel === 'En cours'
                        ? T.success
                        : presenceLabel === 'Attendu' || presenceLabel === "Aujourd'hui"
                          ? T.info
                          : presenceLabel === 'Départ auj.'
                            ? T.warning
                            : T.text2,
                  }}
                  title="Présence séjour"
                >
                  {presenceLabel}
                </Box>
              ) : null}
              {guestsCompact ? (
                <Box
                  sx={{
                    ...stayChipSx,
                    bgcolor: T.bg1,
                    color: T.text,
                    border: `1px solid ${T.border}`,
                  }}
                  title="Composition voyageurs"
                >
                  {guestsCompact}
                </Box>
              ) : null}
              {hasReg ? (
                <Box
                  sx={{
                    ...stayChipSx,
                    bgcolor: regComplete ? 'rgba(10,143,94,0.12)' : 'rgba(196,101,6,0.12)',
                    color: regComplete ? T.success : T.warning,
                  }}
                  title="Enregistrement police"
                >
                  📋 {regDone}/{regTotal}
                </Box>
              ) : null}
              {thread.arrivalTimeChosen || thread.arrivalTimeLabel ? (
                <Box
                  sx={{
                    ...stayChipSx,
                    bgcolor: thread.arrivalTimeChosen
                      ? 'rgba(124,58,237,0.10)'
                      : 'rgba(20,17,10,0.05)',
                    color: thread.arrivalTimeChosen ? '#6d28d9' : T.text3,
                  }}
                  title={
                    thread.arrivalTimeChosen
                      ? 'Heure d’arrivée choisie par le client'
                      : 'Heure d’arrivée (listing / défaut)'
                  }
                >
                  Arr. {thread.arrivalTimeLabel || '—'}
                  {thread.arrivalTimeChosen ? ' ✓' : ''}
                </Box>
              ) : null}
              {typeof thread.arrivalDeclared === 'boolean' ? (
                <Box
                  sx={{
                    ...stayChipSx,
                    bgcolor: thread.arrivalDeclared
                      ? 'rgba(10,143,94,0.12)'
                      : 'rgba(20,17,10,0.05)',
                    color: thread.arrivalDeclared ? T.success : T.text3,
                  }}
                  title="Arrivée déclarée (sur place)"
                >
                  {thread.arrivalDeclared ? 'Arr. déclaré' : 'Arr. non décl.'}
                </Box>
              ) : null}
              {typeof thread.departureDeclared === 'boolean' ? (
                <Box
                  sx={{
                    ...stayChipSx,
                    bgcolor: thread.departureDeclared
                      ? 'rgba(10,143,94,0.12)'
                      : 'rgba(20,17,10,0.05)',
                    color: thread.departureDeclared ? T.success : T.text3,
                  }}
                  title="Départ déclaré"
                >
                  {thread.departureDeclared ? 'Dép. déclaré' : 'Dép. non décl.'}
                </Box>
              ) : null}
            </Box>
          ) : null}
        </Box>

        <Stack direction="row" sx={{ gap: 0.5, flexShrink: 0, alignItems: 'center' }}>
          {isOta && onMarkOtaThreadStatus ? (
            <>
              <Box
                component="button"
                type="button"
                disabled={readOnly || markingOtaThreadStatus || otaStatusNorm === 'responded'}
                onClick={() => {
                  setSendError(null);
                  void Promise.resolve(onMarkOtaThreadStatus('responded')).catch((err) => {
                    setSendError(extractHttpErrorMessage(err, 'Impossible de marquer comme répondu'));
                  });
                }}
                sx={{
                  ...headerActionBtnSx,
                  width: 'auto',
                  height: 28,
                  px: 0.875,
                  fontSize: 10.5,
                  fontWeight: 700,
                  border: '1px solid',
                  ...(otaStatusNorm === 'responded'
                    ? {
                        bgcolor: 'rgba(16,185,129,0.14)',
                        color: '#047857',
                        borderColor: 'rgba(16,185,129,0.4)',
                        cursor: 'default',
                      }
                    : {
                        bgcolor: 'rgba(16,185,129,0.06)',
                        color: '#059669',
                        borderColor: 'rgba(16,185,129,0.28)',
                        '&:hover': {
                          bgcolor: 'rgba(16,185,129,0.14)',
                          borderColor: '#10b981',
                        },
                        '&:disabled': { opacity: 0.45, cursor: 'not-allowed' },
                      }),
                }}
                title="Marquer comme répondu (sans envoyer de message)"
              >
                ✓ Répondu
              </Box>
              <Box
                component="button"
                type="button"
                disabled={readOnly || markingOtaThreadStatus || otaStatusNorm === 'ignored'}
                onClick={() => {
                  setSendError(null);
                  void Promise.resolve(onMarkOtaThreadStatus('ignored')).catch((err) => {
                    setSendError(extractHttpErrorMessage(err, 'Impossible d’ignorer le fil'));
                  });
                }}
                sx={{
                  ...headerActionBtnSx,
                  width: 'auto',
                  height: 28,
                  px: 0.875,
                  fontSize: 10.5,
                  fontWeight: 700,
                  border: '1px solid',
                  ...(otaStatusNorm === 'ignored'
                    ? {
                        bgcolor: 'rgba(100,116,139,0.16)',
                        color: '#475569',
                        borderColor: 'rgba(100,116,139,0.4)',
                        cursor: 'default',
                      }
                    : {
                        bgcolor: 'rgba(100,116,139,0.06)',
                        color: '#64748b',
                        borderColor: 'rgba(100,116,139,0.28)',
                        '&:hover': {
                          bgcolor: 'rgba(100,116,139,0.14)',
                          borderColor: '#94a3b8',
                        },
                        '&:disabled': { opacity: 0.45, cursor: 'not-allowed' },
                      }),
                }}
                title="Ignorer ce fil (ne plus le traiter comme non répondu)"
              >
                Ignorer
              </Box>
            </>
          ) : null}
          {isOta && whatsappGuestKind ? (
            <Box
              component="button"
              type="button"
              onClick={onOpenWhatsApp}
              sx={{
                ...headerActionBtnSx,
                width: 'auto',
                height: 28,
                px: 0.875,
                gap: 0.5,
                fontSize: 10.5,
                fontWeight: 700,
                ...(whatsappGuestKind === 'actif'
                  ? {
                      bgcolor: 'rgba(18,140,75,0.16)',
                      color: '#0a8f5e',
                      border: '1px solid rgba(18,140,75,0.35)',
                    }
                  : whatsappGuestKind === 'jamais'
                    ? {
                        bgcolor: 'rgba(234,88,12,0.12)',
                        color: '#c2410c',
                        border: '1px solid rgba(234,88,12,0.4)',
                      }
                    : { color: T.text3 }),
              }}
              title={
                whatsappGuestKind === 'actif'
                  ? 'Déjà communiqué sur WhatsApp — ouvrir le fil'
                  : whatsappGuestKind === 'jamais'
                    ? 'Jamais de communication WhatsApp — ouvrir / initier'
                    : whatsappGuestKind === 'nonum'
                      ? 'Pas de numéro WhatsApp'
                      : 'Vérification WhatsApp…'
              }
            >
              💬{' '}
              {whatsappGuestKind === 'loading'
                ? '…'
                : whatsappGuestKind === 'actif'
                  ? 'WA ✓'
                  : whatsappGuestKind === 'jamais'
                    ? 'WA'
                    : 'WA ⚠'}
            </Box>
          ) : null}
          {!isOta &&
            ['📞', '🎥', '⋮'].map((icon) => (
              <Box key={icon} component="button" sx={headerActionBtnSx} title={icon}>
                {icon}
              </Box>
            ))}
          {/* Analyse IA : en-tête (toujours visible) — le 🔍 décoratif sans action a été retiré. */}
          {!isOta && onAIAnalysis && (
            <Box
              component="button"
              type="button"
              onClick={onAIAnalysis}
              sx={{
                ...headerActionBtnSx,
                width: 'auto',
                minWidth: 28,
                height: 28,
                px: 0.875,
                gap: 0.4,
                fontSize: 11,
                fontWeight: 700,
                bgcolor: T.aiTint,
                color: T.ai,
                border: '1px solid rgba(124,58,237,0.35)',
                '&:hover': { bgcolor: 'rgba(124,58,237,0.18)', color: T.ai },
              }}
              title="Analyse IA de la conversation"
            >
              🔍 Analyse
            </Box>
          )}
        </Stack>
      </Box>

      <Box
        ref={messagesContainerRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          background: isOta
            ? `linear-gradient(180deg, ${otaTheme.bgTint} 0%, ${T.bg0} 40%)`
            : `linear-gradient(180deg, ${T.bg2} 0%, ${T.bg0} 100%)`,
        }}
      >
        {loadingMessages && !hasRenderableMessages && (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.25,
              py: 6,
              color: T.text3,
            }}
          >
            <CircularProgress size={26} thickness={4} sx={{ color: isOta ? otaTheme.primary : T.primary }} />
            <Typography sx={{ fontSize: 12, fontWeight: 500, color: T.text3 }}>
              Chargement des messages…
            </Typography>
          </Box>
        )}
        {loadingMessages && hasRenderableMessages && (
          <Box
            sx={{
              height: 2,
              flexShrink: 0,
              background: isOta
                ? `linear-gradient(90deg, ${otaTheme.primary}00, ${otaTheme.primary}, ${otaTheme.primary}00)`
                : `linear-gradient(90deg, ${T.primary}00, ${T.primary}, ${T.primary}00)`,
              backgroundSize: '200% 100%',
              animation: 'inboxMsgShimmer 1.1s linear infinite',
              '@keyframes inboxMsgShimmer': {
                '0%': { backgroundPosition: '100% 0' },
                '100%': { backgroundPosition: '-100% 0' },
              },
            }}
          />
        )}

        {!loadingMessages && messagesLoadError && (
          <Box
            sx={{
              alignSelf: 'center',
              maxWidth: '90%',
              px: 1.5,
              py: 1,
              m: 1.5,
              borderRadius: 1,
              bgcolor: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.35)',
              fontSize: 11,
              color: '#92400e',
              lineHeight: 1.45,
            }}
          >
            {messagesLoadError}
          </Box>
        )}

        {!loadingMessages &&
          messages.filter((m) => m.type !== 'day-separator').length === 0 && (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                py: 4,
                color: T.text3,
                textAlign: 'center',
                px: 3,
              }}
            >
              <Typography sx={{ fontSize: 32 }}>📭</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.text2 }}>
                Aucun message dans la base Sojori
              </Typography>
              <Typography sx={{ fontSize: 11.5, lineHeight: 1.5, maxWidth: 320 }}>
                {thread.isStaff
                  ? thread.preview
                    ? `Dernier message : « ${thread.preview} » — recharge le fil ou vérifie le numéro (+212 / 212).`
                    : 'Aucun message enregistré pour ce contact staff.'
                  : thread.preview
                    ? `Aperçu Rental United : « ${thread.preview} »`
                    : 'Le fil peut apparaître en tête à cause de lastMessageAt (sync RU) sans messages importés.'}
                {!thread.isStaff && messagesTotal > 0
                  ? ` (${messagesTotal} en base — vérifie le mapping)`
                  : !thread.isStaff
                    ? ' Lance une sync messages RU pour ce compte.'
                    : ''}
              </Typography>
            </Box>
          )}

        {hasRenderableMessages && (
          <Box
            sx={{
              /* mt:auto = collé en bas si peu de msgs ; hauteur naturelle = scroll OK */
              mt: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
              px: '24px',
              py: '18px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
        {messages.map((message) => {
          if (message.type === 'system-note') {
            return (
              <Box
                key={message.id}
                sx={{
                  alignSelf: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: '5px',
                  bgcolor: T.aiTint,
                  border: '1px solid rgba(124,58,237,0.25)',
                  borderRadius: 999,
                  fontSize: 10.5,
                  color: '#5b21b6',
                  fontFamily: '"Geist Mono", monospace',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  my: 0.75,
                }}
              >
                <Typography
                  component="div"
                  sx={{
                    fontSize: 'inherit',
                    color: 'inherit',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {message.text}
                </Typography>
              </Box>
            );
          }

          if (message.type === 'day-separator') {
            return (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  my: 1,
                  '&::before, &::after': {
                    content: '""',
                    flex: 1,
                    height: '1px',
                    bgcolor: T.border,
                  },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: 9.5,
                    color: T.text3,
                    bgcolor: T.bg1,
                    px: 1.125,
                    py: '2px',
                    borderRadius: 999,
                    border: `1px solid ${T.border}`,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {message.text}
                </Typography>
              </Box>
            );
          }

          const isOut = message.from === 'you' || message.from === 'sojori';
          const isGuest = message.from === 'guest';
          const waFailed = isOut && message.whatsappDelivery === 'failed';
          const traceFailed = message.isAI && hasFailedTraceStep(message);
          const styles = bubbleStyles(message.from);
          const isKeywordHit = kw && messageMatchesKeyword(message.text, kw);
          const contentBadge = interactiveContentBadge(message.contentType, isOut);

          return (
            <Box
              key={message.id}
              id={`inbox-msg-${thread.id}-${message.id}`}
              sx={{
                alignSelf: isOut ? 'flex-end' : 'flex-start',
                maxWidth: isOta ? '78%' : '84%',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                ...(isKeywordHit
                  ? {
                      outline: '2px solid #eab308',
                      outlineOffset: 2,
                      borderRadius: '12px',
                    }
                  : {}),
              }}
            >
              <Box
                onClick={() => openTrace(message)}
                sx={{
                  background: traceFailed
                    ? 'linear-gradient(0deg, rgba(254,226,226,0.72), rgba(254,242,242,0.72)), #fff'
                    : styles.bg,
                  border: waFailed || traceFailed ? '1px solid rgba(220,38,38,0.45)' : styles.border,
                  borderRadius: styles.radius,
                  px: isOta ? '16px' : '15px',
                  py: isOta ? '12px' : '11px',
                  fontSize: 13,
                  color: styles.color,
                  lineHeight: 1.7,
                  boxShadow: '0 1px 2px rgba(20,17,10,0.06)',
                  cursor:
                    onSelectMessage || isInspectableMessage(message)
                      ? 'pointer'
                      : 'default',
                  transition: 'box-shadow 120ms ease',
                  outline:
                    selectedMessageId && selectedMessageId === message.id
                      ? '2px solid rgba(13,148,136,0.55)'
                      : undefined,
                  outlineOffset: 2,
                  '&:hover':
                    onSelectMessage || isInspectableMessage(message)
                      ? { boxShadow: '0 0 0 2px rgba(13,148,136,0.22)' }
                      : undefined,
                }}
              >
                {message.isAdmin &&
                  !message.tags?.some(
                    (t) => t === 'AD' || t === 'WA' || t === 'AI' || t === 'OT' || t === 'AU',
                  ) && (
                  <Typography
                    sx={{
                      fontSize: 9.5,
                      color: '#1d4ed8',
                      fontWeight: 700,
                      fontFamily: '"Geist Mono", monospace',
                      mb: 0.5,
                    }}
                  >
                    👤 Admin · envoi manuel
                  </Typography>
                )}
                {message.isAI &&
                  !message.tags?.some(
                    (t) => t === 'AD' || t === 'WA' || t === 'AI' || t === 'OT' || t === 'AU',
                  ) && (
                  <Typography
                    sx={{
                      fontSize: 9.5,
                      color: T.ai,
                      fontWeight: 700,
                      fontFamily: '"Geist Mono", monospace',
                      mb: 0.5,
                    }}
                  >
                    ✨ SOJORI AI
                  </Typography>
                )}
                {!!message.ownerSummary && (
                  <Typography
                    component="span"
                    title={message.ownerSummary}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      alignSelf: 'flex-start',
                      mb: 0.75,
                      px: 0.85,
                      py: 0.3,
                      borderRadius: '6px',
                      bgcolor: isOut ? 'rgba(184,133,26,0.12)' : 'rgba(13,148,136,0.12)',
                      color: isOut ? '#876119' : '#0f766e',
                      border: `1px solid ${isOut ? 'rgba(184,133,26,0.28)' : 'rgba(13,148,136,0.28)'}`,
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.25,
                      maxWidth: '100%',
                    }}
                  >
                    {message.ownerSummary}
                  </Typography>
                )}
                {contentBadge && !message.ownerSummary && (
                  <Typography
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      mb: 0.75,
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 999,
                      bgcolor: 'rgba(124,58,237,0.10)',
                      color: traceFailed ? '#dc2626' : T.ai,
                      fontSize: 9,
                      fontWeight: 800,
                      fontFamily: '"Geist Mono", monospace',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {contentBadge}
                  </Typography>
                )}
                {!!message.tags?.length &&
                  !(
                    isOta &&
                    message.tags.every(
                      (t) => t === 'WA' || t === 'AI' || t === 'AD' || t === 'OT' || t === 'AU',
                    )
                  ) && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
                    {message.tags
                      .filter(
                        (t) =>
                          !(
                            isOta &&
                            (t === 'WA' || t === 'AI' || t === 'AD' || t === 'OT' || t === 'AU')
                          ),
                      )
                      .map((tag) => {
                      const otaTag = { bg: 'rgba(13,148,136,0.12)', color: '#0f766e' };
                      return (
                        <Typography
                          key={tag}
                          component="span"
                          sx={{
                            fontSize: 9,
                            fontWeight: 700,
                            px: 0.75,
                            py: 0.2,
                            borderRadius: 999,
                            bgcolor: otaTag.bg,
                            color: otaTag.color,
                            fontFamily: '"Geist Mono", monospace',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {tag}
                        </Typography>
                      );
                    })}
                  </Box>
                )}
                {message.audioUrl && (
                  <Box sx={{ mb: 0.75 }}>
                    <Box
                      component="audio"
                      controls
                      preload="metadata"
                      src={message.audioUrl}
                      sx={{ width: '100%', maxWidth: 280, height: 32 }}
                    />
                    {message.audioCaption ? (
                      <Typography sx={{ fontSize: 11, mt: 0.5, opacity: 0.85, whiteSpace: 'pre-wrap' }}>
                        {message.audioCaption}
                      </Typography>
                    ) : null}
                  </Box>
                )}
                {!message.audioUrl && message.contentType === 'audio' && (
                  <Typography
                    sx={{
                      fontSize: 11,
                      mb: 0.75,
                      opacity: 0.75,
                      fontStyle: 'italic',
                    }}
                  >
                    🎧 Audio indisponible (expiré) — transcript ci-dessous
                  </Typography>
                )}
                {isGuest && (message.translatedFr || message.translatedAry) ? (
                  <OtaTranslatedBody
                    text={message.text}
                    translatedFr={message.translatedFr}
                    translatedAry={message.translatedAry}
                    originalText={message.originalText}
                    originalLanguage={message.originalLanguage}
                    keyword={kw}
                  />
                ) : (
                  <Typography
                    component="div"
                    sx={{
                      fontSize: 'inherit',
                      color: 'inherit',
                      lineHeight: 'inherit',
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                    }}
                  >
                    {kw ? highlightInboxKeyword(message.text, kw) : message.text}
                  </Typography>
                )}
              </Box>
              <Stack
                direction="row"
                spacing={0.625}
                sx={{
                  alignSelf: isOut ? 'flex-end' : 'flex-start',
                  fontSize: 10,
                  color: T.text4,
                  fontFamily: '"Geist Mono", monospace',
                  px: 0.5,
                }}
              >
                <span>{message.time}</span>
                {isOta &&
                  isOut &&
                  message.tags?.some((t) =>
                    t === 'WA' || t === 'AI' || t === 'AD' || t === 'OT' || t === 'AU',
                  ) && (
                  <Box
                    component="span"
                    title={
                      message.tags.includes('WA')
                        ? 'WhatsApp staff'
                        : message.tags.includes('AI')
                          ? 'Assisté IA'
                          : message.tags.includes('AD')
                            ? 'Dashboard'
                            : message.tags.includes('AU')
                              ? 'Automatisation Sojori'
                              : 'Booking / Airbnb (hors Sojori)'
                    }
                    sx={{
                      fontWeight: 700,
                      fontSize: 9,
                      letterSpacing: '0.04em',
                      px: 0.55,
                      py: '1px',
                      borderRadius: 999,
                      bgcolor:
                        message.tags.includes('WA')
                          ? 'rgba(37,211,102,0.15)'
                          : message.tags.includes('AI')
                            ? 'rgba(139,92,246,0.12)'
                            : message.tags.includes('AD')
                              ? 'rgba(29,78,216,0.12)'
                              : message.tags.includes('AU')
                                ? 'rgba(124,58,237,0.12)'
                                : 'rgba(234,88,12,0.12)',
                      color:
                        message.tags.includes('WA')
                          ? '#128C7E'
                          : message.tags.includes('AI')
                            ? '#6d28d9'
                            : message.tags.includes('AD')
                              ? '#1d4ed8'
                              : message.tags.includes('AU')
                                ? '#5b21b6'
                                : '#c2410c',
                    }}
                  >
                    {message.tags.find(
                      (t) => t === 'WA' || t === 'AI' || t === 'AD' || t === 'OT' || t === 'AU',
                    )}
                  </Box>
                )}
                {isOut && message.whatsappDelivery === 'failed' && (
                  <Tooltip
                    title={formatWhatsAppDeliveryError(message.whatsappDeliveryError)}
                    arrow
                    placement="top"
                    slotProps={{
                      tooltip: {
                        sx: {
                          maxWidth: 360,
                          whiteSpace: 'pre-line',
                          fontSize: 11,
                          lineHeight: 1.45,
                        },
                      },
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        color: '#dc2626',
                        fontWeight: 700,
                        fontSize: 9.5,
                        letterSpacing: '0.02em',
                        cursor: 'help',
                        borderBottom: '1px dashed rgba(220,38,38,0.55)',
                      }}
                    >
                      Non envoyé
                    </Box>
                  </Tooltip>
                )}
                {isOut && message.whatsappDelivery === 'pending' && (
                  <Tooltip title="Envoi WhatsApp en cours…" arrow placement="top">
                    <Box component="span" sx={{ color: T.text3, fontWeight: 600, cursor: 'help' }}>
                      En attente
                    </Box>
                  </Tooltip>
                )}
                {isOut && message.whatsappDelivery !== 'failed' && message.status === 'read' && (
                  <DoneAll sx={{ fontSize: 14, color: '#0084FF' }} />
                )}
                {isOut &&
                  message.whatsappDelivery !== 'failed' &&
                  message.status === 'delivered' && (
                  <DoneAll sx={{ fontSize: 14, color: T.text4 }} />
                )}
              </Stack>
              {(waFailed || traceFailed) && (
                <Typography
                  sx={{
                    alignSelf: 'flex-end',
                    fontSize: 10,
                    lineHeight: 1.4,
                    color: '#b91c1c',
                    maxWidth: '100%',
                    px: 0.5,
                  }}
                >
                  {waFailed
                    ? formatWhatsAppDeliveryError(message.whatsappDeliveryError).split('\n')[0]
                    : 'Action automatique échouée · cliquez pour voir le trace'}
                </Typography>
              )}
            </Box>
          );
        })}

        {isOta &&
          quickReplies.length > 0 &&
          messages.some((m) => m.from === 'guest' && m.type !== 'day-separator' && m.type !== 'system-note') && (
            <Box
              sx={{
                alignSelf: 'flex-start',
                display: 'flex',
                gap: 0.75,
                flexWrap: 'wrap',
                mt: 0.5,
                maxWidth: '80%',
              }}
            >
              {quickReplies.map((qr) => (
                <Box
                  key={qr.id}
                  component="button"
                  onClick={() => qr.text && onSendMessage(qr.text)}
                  sx={{
                    px: 1.5,
                    py: '6px',
                    bgcolor: T.bg1,
                    border: `1px solid ${otaTheme.borderTint}`,
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: otaTheme.textAccent,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: otaTheme.bgTint, borderColor: otaTheme.primary },
                  }}
                >
                  {qr.label}
                </Box>
              ))}
            </Box>
          )}
            <Box ref={messagesEndRef} sx={{ height: 0, flexShrink: 0 }} aria-hidden />
          </Box>
        )}
      </Box>

      {(quickTemplates.length > 0 || (!isOta && guestMenuDispatch.length > 0)) && (
        <Box
          sx={{
            px: '18px',
            py: 1,
            display: 'flex',
            gap: 0.75,
            flexWrap: 'wrap',
            alignItems: 'center',
            bgcolor: T.bg2,
            borderTop: `1px solid ${T.border}`,
            flexShrink: 0,
          }}
        >
          {quickTemplates.map((item) => (
            <Box
              key={item.id}
              component="button"
              onClick={() => item.text ? onSelectTemplate(item) : undefined}
              sx={{
                px: '11px',
                py: '6px',
                bgcolor: T.bg1,
                border: `1px solid ${T.border}`,
                borderRadius: '8px',
                fontSize: 11.5,
                fontWeight: 600,
                color: T.text2,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.625,
                transition: 'all 0.12s',
                '&:hover': {
                  bgcolor: T.primaryTint,
                  borderColor: T.primary,
                  color: T.primaryDeep,
                  transform: 'translateY(-1px)',
                },
              }}
            >
              {item.icon} {item.label}
            </Box>
          ))}
          {!isOta && guestMenuDispatch.length > 0 && (
            <Box
              component="button"
              type="button"
              onClick={() => setFlowMenuOpen(true)}
              disabled={Boolean(sendingGuestMenuCode)}
              sx={{
                px: '11px',
                py: '6px',
                bgcolor: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.35)',
                borderRadius: '8px',
                fontSize: 11.5,
                fontWeight: 700,
                color: '#5b21b6',
                cursor: sendingGuestMenuCode ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.625,
                transition: 'all 0.12s',
                '&:hover': sendingGuestMenuCode
                  ? {}
                  : {
                      bgcolor: 'rgba(124,58,237,0.14)',
                      borderColor: '#7c3aed',
                      transform: 'translateY(-1px)',
                    },
              }}
              title="Envoyer un menu ou flow WhatsApp (E, D, C…)"
            >
              {sendingGuestMenuCode ? (
                <CircularProgress size={14} sx={{ color: '#5b21b6' }} />
              ) : (
                <>🧩 Menu / Flow</>
              )}
            </Box>
          )}
        </Box>
      )}

      <Dialog
        open={flowMenuOpen}
        onClose={() => !sendingGuestMenuCode && setFlowMenuOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, maxHeight: '80vh' } }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 1.5,
            px: 2,
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          Envoyer menu / flow
          <IconButton
            size="small"
            onClick={() => setFlowMenuOpen(false)}
            disabled={Boolean(sendingGuestMenuCode)}
            aria-label="Fermer"
          >
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontSize: 11.5, color: T.text3, mb: 1.5, lineHeight: 1.45 }}>
            Comme si le guest tapait la lettre sur WhatsApp — intro + formulaire quand applicable.
          </Typography>
          {(['flow', 'interactive', 'text'] as const).map((kind) => {
            const items = guestMenuDispatch.filter((item) => item.kind === kind);
            if (!items.length) return null;
            const sectionLabel =
              kind === 'flow' ? 'Flows WhatsApp' : kind === 'interactive' ? 'Messages interactifs' : 'Réponses texte';
            return (
              <Box key={kind} sx={{ mb: 1.5 }}>
                <Typography
                  sx={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: T.text3,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                    mb: 0.75,
                  }}
                >
                  {sectionLabel}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {items.map((item) => {
                    const style = guestMenuKindStyle(item.kind);
                    const busy = sendingGuestMenuCode === item.code;
                    return (
                      <Box
                        key={item.code}
                        component="button"
                        type="button"
                        disabled={Boolean(sendingGuestMenuCode)}
                        onClick={() => void handleGuestMenuSend(item.code)}
                        sx={{
                          px: '10px',
                          py: '6px',
                          bgcolor: style.bg,
                          border: `1px solid ${style.border}`,
                          borderRadius: '8px',
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: style.color,
                          cursor: sendingGuestMenuCode ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 0.5,
                          opacity: sendingGuestMenuCode && !busy ? 0.5 : 1,
                          '&:hover': sendingGuestMenuCode
                            ? {}
                            : { bgcolor: style.hoverBg, borderColor: style.hoverBorder },
                        }}
                      >
                        {busy ? (
                          <CircularProgress size={12} sx={{ color: style.color }} />
                        ) : (
                          <Box component="span" sx={{ fontSize: 10, fontWeight: 800 }}>
                            {item.code}
                          </Box>
                        )}
                        {item.icon} {item.label}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </DialogContent>
      </Dialog>

      {sendError && !isOta && (
        <Box
          sx={{
            mx: '18px',
            mb: 0.5,
            px: 1.25,
            py: 1,
            borderRadius: 1,
            bgcolor: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.35)',
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#b91c1c', mb: 0.25 }}>
            WhatsApp — envoi impossible
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#7f1d1d', lineHeight: 1.45, whiteSpace: 'pre-line' }}>
            {sendError}
          </Typography>
        </Box>
      )}

      {(recordingVoice || sendingVoice) && (
        <Box
          sx={{
            mx: '18px',
            mb: 0.5,
            px: 1.25,
            py: 1,
            borderRadius: 1,
            bgcolor: recordingVoice ? 'rgba(220,38,38,0.08)' : 'rgba(13,148,136,0.1)',
            border: recordingVoice
              ? '1px solid rgba(220,38,38,0.35)'
              : '1px solid rgba(13,148,136,0.35)',
            flexShrink: 0,
            fontSize: 12,
            fontWeight: 600,
            color: recordingVoice ? '#b91c1c' : '#0f766e',
          }}
        >
          {recordingVoice
            ? '🎙️ Enregistrement… cliquez ⏹ pour envoyer la note vocale'
            : '⏳ Envoi de la note vocale…'}
        </Box>
      )}

      {readOnly ? (
        <Box
          sx={{
            px: '18px',
            py: '12px',
            borderTop: `1px solid ${T.border}`,
            bgcolor: T.bg2,
            flexShrink: 0,
            fontSize: 12,
            color: T.text3,
            fontWeight: 600,
          }}
        >
          Lecture seule — envoi de messages désactivé pour le compte propriétaire.
        </Box>
      ) : (
      <Box
        sx={{
          px: '18px',
          py: '11px',
          borderTop: `1px solid ${T.border}`,
          bgcolor: T.bg1,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          flexShrink: 0,
          opacity: sending || sendingVoice ? 0.72 : 1,
        }}
      >
        {onRecordVoice ? (
          <Box
            component="button"
            type="button"
            disabled={sendingVoice}
            onClick={() => onRecordVoice()}
            sx={{
              ...iconBtnSx,
              ...(recordingVoice
                ? {
                    bgcolor: 'rgba(220,38,38,0.15)',
                    color: '#b91c1c',
                    border: '1px solid rgba(220,38,38,0.4)',
                  }
                : {}),
            }}
            title={recordingVoice ? 'Arrêter et envoyer' : 'Enregistrer une note vocale'}
          >
            {recordingVoice ? '⏹' : '🎙️'}
          </Box>
        ) : null}
        <Box component="button" type="button" sx={iconBtnSx} title="Joindre">
          📎
        </Box>
        <Box component="button" type="button" sx={iconBtnSx} title={isOta ? 'Traduction' : 'Emoji'}>
          {isOta ? '🌐' : '😊'}
        </Box>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'stretch',
            px: '13px',
            py: 1,
            bgcolor: T.bg2,
            border: `1px solid ${T.border}`,
            borderRadius: '12px',
            '&:focus-within': {
              borderColor: isOta ? otaTheme.focusBorder : T.primary,
              boxShadow: isOta
                ? `0 0 0 3px ${otaTheme.focusRing}`
                : `0 0 0 3px ${T.primaryTint}`,
              bgcolor: T.bg1,
            },
          }}
        >
          <Box
            component="textarea"
            ref={inputRef}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder={isOta ? `Reply via ${platformLabel}…` : 'Écrire un message WhatsApp…'}
            sx={{
              flex: 1,
              border: 0,
              outline: 0,
              font: 'inherit',
              fontSize: 13,
              lineHeight: 1.5,
              color: T.text,
              bgcolor: 'transparent',
              resize: 'vertical',
              minHeight: 68,
              maxHeight: 220,
              overflowY: 'auto',
              py: 0.5,
              '&::placeholder': { color: T.text4 },
            }}
          />
        </Box>
        <Box
          component="button"
          onClick={() => onAISuggestion?.(inputValue)}
          sx={{
            ...iconBtnSx,
            width: 34,
            height: 34,
            borderRadius: '9px',
            background: `linear-gradient(135deg,#9669f7,${T.ai})`,
            color: '#fff',
            boxShadow: '0 2px 8px rgba(124,58,237,0.30)',
          }}
          title="Suggestion IA"
        >
          ✨
        </Box>
        {onAIAnalysis && (
          <Box
            component="button"
            type="button"
            onClick={onAIAnalysis}
            sx={{
              ...iconBtnSx,
              width: 34,
              height: 34,
              borderRadius: '9px',
              border: '1px solid rgba(124,58,237,0.35)',
              bgcolor: T.aiTint,
              color: T.ai,
              flexShrink: 0,
              '&:hover': { bgcolor: 'rgba(124,58,237,0.18)', color: T.ai },
            }}
            title="Analyse IA de la conversation"
          >
            🔍
          </Box>
        )}
        <Box
          component="button"
          onClick={() => void handleSend()}
          disabled={sending}
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            border: 0,
            cursor: sending ? 'wait' : 'pointer',
            fontSize: 15,
            fontWeight: 800,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isOta ? otaTheme.sendGradient : 'linear-gradient(135deg,#34e07a,#25D366)',
            boxShadow: isOta ? otaTheme.sendShadow : '0 2px 10px rgba(37,211,102,0.40)',
          }}
          title="Envoyer"
        >
          ➤
        </Box>
      </Box>
      )}

      {canInspectAi && inspectedMessage && (
        <>
          <Box
            onClick={() => setInspectedMessage(null)}
            sx={{
              position: 'fixed',
              inset: 0,
              bgcolor: 'rgba(15,23,42,0.22)',
              zIndex: 1299,
            }}
          />
          <Box
            role="dialog"
            aria-label="AI response trace"
            sx={{
              position: 'fixed',
              zIndex: 1300,
              top: 0,
              right: 0,
              bottom: 0,
              width: { xs: '100%', sm: 420 },
              bgcolor: '#fff',
              borderLeft: `1px solid ${T.border}`,
              boxShadow: '-12px 0 36px rgba(15,23,42,0.16)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ p: 2.5, borderBottom: `1px solid ${T.border}` }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                  <Typography sx={{ fontSize: 16, fontWeight: 800 }}>How this answer was made</Typography>
                  <Typography sx={{ mt: 0.5, fontSize: 11, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
                    {inspectLoading
                      ? 'Loading audit…'
                      : inspectedMessage.processingTrace
                        ? `${inspectedMessage.processingTrace.route || 'response'} · ${inspectedMessage.processingTrace.durationMs} ms`
                        : inspectedMessage.generationId
                          ? 'OTA AI · loading audit by generationId'
                          : inspectedMessage.replyMode === 'ai_assisted' ||
                              inspectedMessage.replyMode === 'ai_generated'
                            ? 'OTA AI · generationId missing on message'
                            : 'Trace unavailable for this response'}
                  </Typography>
                </Box>
                <Box component="button" onClick={() => setInspectedMessage(null)} sx={iconBtnSx} aria-label="Close">
                  ✕
                </Box>
              </Box>
              {(inspectedMessage.aiModel ||
                inspectedMessage.tokensUsed != null ||
                inspectedMessage.processingTrace ||
                inspectedMessage.messageSource) && (
                <Typography sx={{ mt: 1.5, fontSize: 11, color: T.text3 }}>
                  {inspectedMessage.isAI || inspectedMessage.messageSource === 'ai'
                    ? inspectedMessage.aiModel || 'LLM reply'
                    : 'No LLM call · cost $0'}
                  {inspectedMessage.isAI && inspectedMessage.tokensUsed != null
                    ? ` · ${inspectedMessage.tokensUsed} tokens`
                    : ''}
                  {inspectedMessage.messageSource
                    ? ` · source ${inspectedMessage.messageSource}`
                    : ''}
                </Typography>
              )}
              {inspectedMessage.processingTrace && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
                  {[
                    `Route: ${inspectedMessage.processingTrace.route || 'unknown'}`,
                    `Categories: ${inspectedCategories.length ? inspectedCategories.join(', ') : 'none'}`,
                    `Tokens: ${
                      inspectedMessage.isAI || inspectedMessage.messageSource === 'ai'
                        ? inspectedMessage.aiUsage?.promptTokens != null ||
                          inspectedMessage.aiUsage?.completionTokens != null
                          ? `${
                              inspectedMessage.aiUsage.processedInputTokens ??
                              (inspectedMessage.aiUsage.promptTokens != null
                                ? (inspectedMessage.aiUsage.promptTokens ?? 0) +
                                  (inspectedMessage.aiUsage.cacheReadTokens ?? 0) +
                                  (inspectedMessage.aiUsage.cacheWriteTokens ?? 0)
                                : '—')
                            } in / ${inspectedMessage.aiUsage.completionTokens ?? '—'} out`
                          : inspectedMessage.tokensUsed ?? 'n/a'
                        : 'No LLM · $0'
                    }`,
                  ].map((label) => (
                    <Box
                      key={label}
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 999,
                        bgcolor: T.bg2,
                        border: `1px solid ${T.border}`,
                        fontSize: 9.5,
                        color: T.text3,
                        fontFamily: '"Geist Mono", monospace',
                      }}
                    >
                      {label}
                    </Box>
                  ))}
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 0.5, mt: 1.75 }}>
                {(
                  inspectedMessage.generationId ||
                  inspectedMessage.replyMode === 'ai_assisted' ||
                  inspectedMessage.replyMode === 'ai_generated'
                    ? ([
                        { id: 'prompt' as const, label: 'AI Prompt' },
                        { id: 'cost' as const, label: 'AI Cost' },
                      ] as const)
                    : ([
                        { id: 'process' as const, label: 'Process' },
                        { id: 'prompt' as const, label: 'AI Prompt' },
                        { id: 'cost' as const, label: 'AI Cost' },
                      ] as const)
                ).map((tab) => (
                  <Box
                    key={tab.id}
                    component="button"
                    type="button"
                    onClick={() => setInspectTab(tab.id)}
                    sx={{
                      flex: 1,
                      py: 0.85,
                      px: 1,
                      borderRadius: '8px',
                      border: `1px solid ${inspectTab === tab.id ? T.ai : T.border}`,
                      bgcolor: inspectTab === tab.id ? 'rgba(99,102,241,0.08)' : T.bg2,
                      color: inspectTab === tab.id ? T.ai : T.text3,
                      fontSize: 11,
                      fontWeight: 750,
                      cursor: 'pointer',
                    }}
                  >
                    {tab.label}
                  </Box>
                ))}
              </Box>
            </Box>
            <Stack spacing={1.25} sx={{ p: 2.5, overflowY: 'auto' }}>
              {inspectTab === 'process' && (
                <>
              {!inspectedMessage.processingTrace && (
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#fff7ed', border: '1px solid #fed7aa' }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#9a3412' }}>
                    No processing trace was returned by srv-fullchatbot.
                  </Typography>
                  <Typography sx={{ mt: 0.75, fontSize: 12, lineHeight: 1.55, color: '#7c2d12' }}>
                    This is usually an older response, or the backend pod handling this message is still running a build without trace persistence.
                  </Typography>
                </Box>
              )}
              {inspectedMessage.processingTrace?.steps.map((step, index) => (
                <Box
                  key={`${step.key}-${index}`}
                  sx={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 1.25 }}
                >
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: step.status === 'completed' ? '#ecfdf5' : '#fef2f2',
                      color: step.status === 'completed' ? '#059669' : '#dc2626',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {step.status === 'completed' ? '✓' : '!'}
                  </Box>
                  <Box sx={{ pb: 1.5, borderBottom: `1px solid ${T.border}` }}>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => {
                        const key = `${step.key}-${index}`;
                        setExpandedTraceSteps((current) => ({ ...current, [key]: !current[key] }));
                      }}
                      aria-expanded={Boolean(expandedTraceSteps[`${step.key}-${index}`])}
                      sx={{
                        width: '100%',
                        p: 0,
                        border: 0,
                        bgcolor: 'transparent',
                        color: 'inherit',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 750 }}>{step.label}</Typography>
                        <Typography sx={{ fontSize: 9.5, color: T.text4, fontFamily: '"Geist Mono", monospace' }}>
                          {step.durationMs ?? 0} ms
                        </Typography>
                      </Box>
                      {step.summary && (
                        <Typography sx={{ mt: 0.5, fontSize: 12, color: T.text3, lineHeight: 1.5 }}>
                          {step.summary}
                        </Typography>
                      )}
                      <Typography sx={{ mt: 0.75, fontSize: 9.5, color: T.ai, fontWeight: 700 }}>
                        {expandedTraceSteps[`${step.key}-${index}`] ? '▾ Hide details' : '› Show details'}
                      </Typography>
                    </Box>
                    {expandedTraceSteps[`${step.key}-${index}`] &&
                      step.details &&
                      Object.keys(step.details).length > 0 && (
                      <Box
                        component="pre"
                        sx={{
                          mt: 1,
                          mb: 0,
                          p: 1.25,
                          borderRadius: 1.5,
                          bgcolor: T.bg2,
                          color: T.text3,
                          fontSize: 10,
                          lineHeight: 1.55,
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {JSON.stringify(step.details, null, 2)}
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}
                </>
              )}

              {inspectTab === 'prompt' && (
                <>
                  {!inspectedMessage.aiPrompt?.parts?.length ? (
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: T.bg2, border: `1px solid ${T.border}` }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                        {inspectedMessage.generationId ||
                        inspectedMessage.replyMode === 'ai_assisted' ||
                        inspectedMessage.replyMode === 'ai_generated'
                          ? 'OTA AI audit unavailable'
                          : 'No AI prompt for this reply'}
                      </Typography>
                      <Typography sx={{ mt: 0.75, fontSize: 12, color: T.text3, lineHeight: 1.55 }}>
                        {inspectedMessage.generationId
                          ? `generationId ${inspectedMessage.generationId} is on the message, but the stored prompt/cost audit could not be loaded (missing record, permissions, or srv-fulltask mismatch).`
                          : inspectedMessage.replyMode === 'ai_assisted' ||
                              inspectedMessage.replyMode === 'ai_generated'
                            ? `This OTA reply is marked ${inspectedMessage.replyMode}, but generationId was not persisted on the message — the AI Prompt/Cost audit cannot be linked. Re-generate with AI and send again after the latest srv-reservations + orchestrator deploy.`
                            : 'Deterministic menu/flow routes do not call the LLM. Prompt sections are saved only on conversational AI replies (new messages after this deploy).'}
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Box
                        sx={{
                          p: 1.25,
                          borderRadius: 1.5,
                          bgcolor: T.bg2,
                          border: `1px solid ${T.border}`,
                          fontSize: 11,
                          color: T.text3,
                          fontFamily: '"Geist Mono", monospace',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.5,
                        }}
                      >
                        <Box>
                          Total input ≈ {inspectedMessage.aiPrompt.totalEstimatedInputTokens.toLocaleString()} tokens
                          {inspectedMessage.aiPrompt.scaledToProvider
                            ? ' (proportional attribution to provider usage)'
                            : ' (char estimate ~4 chars/token)'}
                        </Box>
                        {inspectedMessage.aiPrompt.measurementNote && (
                          <Box sx={{ fontSize: 10, opacity: 0.9 }}>{inspectedMessage.aiPrompt.measurementNote}</Box>
                        )}
                        {inspectedMessage.aiPrompt.summary && (
                          <Box sx={{ mt: 0.5, fontSize: 10, lineHeight: 1.5 }}>
                            relevant {inspectedMessage.aiPrompt.summary.relevantContextTokens?.toLocaleString() ?? '—'}
                            {' · '}stable {inspectedMessage.aiPrompt.summary.stableRuleTokens?.toLocaleString() ?? '—'}
                            {' · '}history {inspectedMessage.aiPrompt.summary.historyTokens?.toLocaleString() ?? '—'}
                            {' · '}overhead {inspectedMessage.aiPrompt.summary.providerOverheadTokens?.toLocaleString() ?? '—'}
                            {(inspectedMessage.aiPrompt.summary.cacheReadTokens ||
                              inspectedMessage.aiPrompt.summary.cacheWriteTokens) && (
                              <>
                                {' · '}cache r/w {inspectedMessage.aiPrompt.summary.cacheReadTokens ?? 0}/
                                {inspectedMessage.aiPrompt.summary.cacheWriteTokens ?? 0}
                              </>
                            )}
                            {inspectedMessage.aiPrompt.summary.omittedSectionKeys?.length ? (
                              <>
                                {' · '}omitted {inspectedMessage.aiPrompt.summary.omittedSectionKeys.length}
                              </>
                            ) : null}
                            {(inspectedMessage.aiPrompt.summary.duplicatedTokensDetected ?? 0) > 0 && (
                              <>
                                {' · '}dup≈{inspectedMessage.aiPrompt.summary.duplicatedTokensDetected}
                              </>
                            )}
                            {inspectedMessage.aiPrompt.summary.approximateCostUsd != null && (
                              <>
                                {' · '}≈${inspectedMessage.aiPrompt.summary.approximateCostUsd.toFixed(6)}
                              </>
                            )}
                          </Box>
                        )}
                      </Box>
                      {inspectedMessage.aiPrompt.parts.map((part) => {
                        const omitted = part.included === false
                        const body =
                          (part as { content?: string; text?: string }).content ??
                          (part as { text?: string }).text ??
                          ''
                        return (
                        <Box
                          key={part.key}
                          sx={{ borderBottom: `1px solid ${T.border}`, pb: 1.25, opacity: omitted ? 0.72 : 1 }}
                        >
                          <Box
                            component="button"
                            type="button"
                            onClick={() =>
                              setExpandedPromptParts((c) => ({ ...c, [part.key]: !c[part.key] }))
                            }
                            sx={{
                              width: '100%',
                              p: 0,
                              border: 0,
                              bgcolor: 'transparent',
                              cursor: 'pointer',
                              textAlign: 'left',
                              color: 'inherit',
                            }}
                          >
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'baseline' }}>
                              <Typography sx={{ fontSize: 12.5, fontWeight: 750 }}>
                                {part.label}
                                <Box
                                  component="span"
                                  sx={{
                                    ml: 1,
                                    fontSize: 9,
                                    fontWeight: 700,
                                    color: omitted ? T.text4 : '#047857',
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.3,
                                  }}
                                >
                                  {omitted ? 'omitted' : 'included'}
                                </Box>
                              </Typography>
                              <Typography
                                sx={{ fontSize: 9.5, color: T.text4, fontFamily: '"Geist Mono", monospace' }}
                              >
                                {(part.attributedInputTokens ?? part.estimatedTokens).toLocaleString()} tok
                                {part.inputSharePercent != null ? ` · ${part.inputSharePercent}%` : ''}
                              </Typography>
                            </Box>
                            {(part.selectionReason || part.source || part.truncated || part.stale) && (
                              <Typography sx={{ mt: 0.35, fontSize: 10, color: T.text3, lineHeight: 1.4 }}>
                                {part.selectionReason}
                                {part.source ? ` · src: ${part.source}` : ''}
                                {part.sourceUpdatedAt ? ` · @ ${part.sourceUpdatedAt}` : ''}
                                {part.truncated ? ' · truncated' : ''}
                                {part.stale ? ' · stale' : ''}
                                {part.tokenBudget != null ? ` · budget ${part.tokenBudget}` : ''}
                              </Typography>
                            )}
                            {!omitted && (
                              <Typography sx={{ mt: 0.5, fontSize: 9.5, color: T.ai, fontWeight: 700 }}>
                                {expandedPromptParts[part.key] ? '▾ Hide content' : '› Show content'}
                              </Typography>
                            )}
                          </Box>
                          {!omitted && expandedPromptParts[part.key] && (
                            <Box
                              component="pre"
                              sx={{
                                mt: 1,
                                mb: 0,
                                p: 1.25,
                                borderRadius: 1.5,
                                bgcolor: T.bg2,
                                color: T.text3,
                                fontSize: 10,
                                lineHeight: 1.55,
                                whiteSpace: 'pre-wrap',
                                overflowWrap: 'anywhere',
                                maxHeight: 320,
                                overflowY: 'auto',
                              }}
                            >
                              {body || '(empty)'}
                            </Box>
                          )}
                        </Box>
                        )
                      })}
                    </>
                  )}
                </>
              )}

              {inspectTab === 'cost' && (
                <>
                  {!inspectedMessage.aiUsage && inspectedMessage.tokensUsed == null ? (
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: T.bg2, border: `1px solid ${T.border}` }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                        {inspectedMessage.generationId ||
                        inspectedMessage.replyMode === 'ai_assisted' ||
                        inspectedMessage.replyMode === 'ai_generated'
                          ? 'OTA AI cost audit unavailable'
                          : 'No LLM call · cost $0'}
                      </Typography>
                      <Typography sx={{ mt: 0.75, fontSize: 12, color: T.text3, lineHeight: 1.55 }}>
                        {inspectedMessage.generationId
                          ? `generationId ${inspectedMessage.generationId} is on the message, but the stored prompt/cost audit could not be loaded (missing record, permissions, or srv-fulltask mismatch).`
                          : inspectedMessage.replyMode === 'ai_assisted' ||
                              inspectedMessage.replyMode === 'ai_generated'
                            ? `This OTA reply is marked ${inspectedMessage.replyMode}, but generationId was not persisted on the message — the AI Cost audit cannot be linked. Re-generate with AI and send again after the latest srv-reservations + orchestrator deploy.`
                            : `Deterministic menu/flow/backend routes do not call the LLM. Meta WhatsApp messaging fees are tracked separately.${
                                inspectedMessage.processingTrace?.route
                                  ? ` Route: ${inspectedMessage.processingTrace.route}.`
                                  : ''
                              }${
                                inspectedMessage.whatsappDeliveryError
                                  ? ` Failure: ${inspectedMessage.whatsappDeliveryError}`
                                  : ''
                              }`}
                      </Typography>
                    </Box>
                  ) : inspectedMessage.aiUsage?.costEquation === 'No LLM call · cost $0' ||
                    (inspectedMessage.aiUsage?.costUsd === 0 &&
                      !inspectedMessage.aiUsage?.model &&
                      (inspectedMessage.aiUsage?.tokensUsed ?? 0) === 0) ? (
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: T.bg2, border: `1px solid ${T.border}` }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>No LLM call · cost $0</Typography>
                      <Typography sx={{ mt: 0.75, fontSize: 12, color: T.text3, lineHeight: 1.55 }}>
                        Deterministic route — no conversational model was billed.
                        {inspectedMessage.processingTrace?.route
                          ? ` Route: ${inspectedMessage.processingTrace.route}.`
                          : ''}
                        {inspectedMessage.whatsappDeliveryError
                          ? ` Failure reason: ${inspectedMessage.whatsappDeliveryError}`
                          : ''}
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                      <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: T.bg2, border: `1px solid ${T.border}` }}>
                        <Typography sx={{ fontSize: 11, color: T.text3, fontWeight: 700 }}>Provider / model</Typography>
                        <Typography sx={{ mt: 0.5, fontSize: 13, fontFamily: '"Geist Mono", monospace' }}>
                          {inspectedMessage.aiUsage?.provider ?? '—'} ·{' '}
                          {inspectedMessage.aiUsage?.model ?? inspectedMessage.aiModel ?? '—'}
                        </Typography>
                      </Box>

                      {(() => {
                        const u = inspectedMessage.aiUsage
                        const uncached = u?.promptTokens ?? 0
                        const cacheRead = u?.cacheReadTokens ?? 0
                        const cacheWrite = u?.cacheWriteTokens ?? 0
                        const processed =
                          u?.processedInputTokens ??
                          (u?.promptTokens != null
                            ? uncached + cacheRead + cacheWrite
                            : null)
                        const row = (label: string, value: number | null | undefined, hint?: string) => (
                          <Box
                            key={label}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 1,
                              alignItems: 'baseline',
                            }}
                          >
                            <Typography sx={{ fontSize: 12, color: T.text2 }}>
                              {label}
                              {hint ? (
                                <Typography component="span" sx={{ ml: 0.5, fontSize: 10, color: T.text3 }}>
                                  {hint}
                                </Typography>
                              ) : null}
                            </Typography>
                            <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: '"Geist Mono", monospace' }}>
                              {value != null ? value.toLocaleString() : 'n/a'}
                            </Typography>
                          </Box>
                        )
                        return (
                          <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: T.bg2, border: `1px solid ${T.border}` }}>
                            <Typography sx={{ fontSize: 11, color: T.text3, fontWeight: 700, mb: 1 }}>
                              Processed input (provider)
                            </Typography>
                            {row('Uncached input', u?.promptTokens)}
                            {row('Cache read input', cacheRead)}
                            {row('Cache write input', cacheWrite)}
                            <Box sx={{ my: 0.75, borderTop: `1px solid ${T.border}` }} />
                            {row(
                              'Total processed input',
                              processed,
                              '= uncached + cache read + cache write',
                            )}
                            {(u?.cacheAwarePricing || u?.usedDefaultPricing) && (
                              <Typography sx={{ mt: 0.75, fontSize: 10, color: T.text3 }}>
                                {u.cacheAwarePricing ? 'Cache-aware pricing' : ''}
                                {u.cacheAwarePricing && u.usedDefaultPricing ? ' · ' : ''}
                                {u.usedDefaultPricing ? 'Default rates' : ''}
                              </Typography>
                            )}
                            <Typography sx={{ mt: 0.75, fontSize: 10, color: T.text3, lineHeight: 1.45 }}>
                              Do not treat uncached-only as total input when cache read/write tokens were also processed.
                            </Typography>
                          </Box>
                        )
                      })()}

                      <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: T.bg2, border: `1px solid ${T.border}` }}>
                        <Typography sx={{ fontSize: 11, color: T.text3, fontWeight: 700 }}>Output tokens</Typography>
                        <Typography sx={{ mt: 0.5, fontSize: 18, fontWeight: 800, fontFamily: '"Geist Mono", monospace' }}>
                          {inspectedMessage.aiUsage?.completionTokens?.toLocaleString() ?? 'n/a'}
                        </Typography>
                        <Typography sx={{ mt: 0.5, fontSize: 10, color: T.text3, lineHeight: 1.45 }}>
                          Provider output includes guest-visible WhatsApp text plus hidden structured metadata
                          (LLM_LANGUAGE, topic, owner summary, FR/ARY translations) stripped before delivery.
                        </Typography>
                        {(inspectedMessage.aiUsage?.guestVisibleOutputTokensEstimate != null ||
                          inspectedMessage.aiUsage?.hiddenOutputTokensEstimate != null) && (
                          <Typography sx={{ mt: 0.75, fontSize: 10, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
                            local est. guest-visible{' '}
                            {inspectedMessage.aiUsage.guestVisibleOutputTokensEstimate ?? '—'} · hidden metadata{' '}
                            {inspectedMessage.aiUsage.hiddenOutputTokensEstimate ?? '—'}
                          </Typography>
                        )}
                      </Box>

                      {inspectedMessage.aiUsage?.tokensUsed != null && (
                        <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: T.bg2, border: `1px solid ${T.border}` }}>
                          <Typography sx={{ fontSize: 11, color: T.text3, fontWeight: 700 }}>
                            Total processed tokens
                          </Typography>
                          <Typography sx={{ mt: 0.5, fontSize: 16, fontWeight: 800, fontFamily: '"Geist Mono", monospace' }}>
                            {inspectedMessage.aiUsage.tokensUsed.toLocaleString()}
                          </Typography>
                          <Typography sx={{ mt: 0.35, fontSize: 10, color: T.text3 }}>
                            Input (processed) + output
                          </Typography>
                        </Box>
                      )}

                      <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                        <Typography sx={{ fontSize: 11, color: '#047857', fontWeight: 700 }}>Approx. cost</Typography>
                        {inspectedMessage.aiUsage?.costEquation ? (
                          <Typography
                            sx={{
                              mt: 0.75,
                              fontSize: 11,
                              lineHeight: 1.55,
                              color: '#065f46',
                              fontFamily: '"Geist Mono", monospace',
                              whiteSpace: 'pre-wrap',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {inspectedMessage.aiUsage.costEquation}
                          </Typography>
                        ) : (
                          <Typography sx={{ mt: 0.75, fontSize: 12, color: '#065f46' }}>
                            {inspectedMessage.tokensUsed != null
                              ? `Total tokens recorded: ${inspectedMessage.tokensUsed} (no split / equation for this older message)`
                              : 'Cost equation unavailable'}
                          </Typography>
                        )}
                        {inspectedMessage.aiUsage?.costUsd != null && (
                          <Typography sx={{ mt: 1, fontSize: 20, fontWeight: 800, color: '#047857' }}>
                            ${inspectedMessage.aiUsage.costUsd.toFixed(6)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}
                </>
              )}
            </Stack>
          </Box>
        </>
      )}
    </Box>
  );
}

const iconBtnSx = {
  width: 32,
  height: 32,
  borderRadius: '8px',
  border: 0,
  cursor: 'pointer',
  fontSize: 15,
  color: T.text3,
  bgcolor: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': { bgcolor: T.bg3, color: T.text },
} as const;

const headerActionBtnSx = {
  width: 32,
  height: 32,
  borderRadius: '8px',
  border: 0,
  cursor: 'pointer',
  fontSize: 14,
  color: T.text3,
  bgcolor: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '&:hover': { bgcolor: T.bg3, color: T.text },
} as const;
