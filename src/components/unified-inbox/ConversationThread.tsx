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
import { Roles } from '../../constants/roles';

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
  whatsappBusinessLine?: string;
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
  onRecordVoice,
  recordingVoice = false,
  sendingVoice = false,
  onSelectMessage,
  selectedMessageId = null,
  composerValue,
  onComposerValueChange,
  otaPlatform = 'Airbnb',
  quickReplies = [],
  whatsappBusinessLine = import.meta.env.VITE_WHATSAPP_BUSINESS_DISPLAY || '+33 7 56 84 21 09',
  loadingMessages = false,
  messagesLoadError = null,
  messagesTotal = 0,
  highlightKeyword = '',
  threadMode = 'auto',
}: ConversationThreadProps) {
  const { user } = useAuth();
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
  const [expandedTraceSteps, setExpandedTraceSteps] = useState<Record<string, boolean>>({});
  const [flowMenuOpen, setFlowMenuOpen] = useState(false);
  const hasRenderableMessages =
    !loadingMessages && messages.filter((m) => m.type !== 'day-separator').length > 0;

  const { containerRef: messagesContainerRef, endRef: messagesEndRef } = useInboxMessageScroll(
    thread.id,
    messages.length,
    loadingMessages,
    highlightKeyword,
    messages,
  );

  const kw = highlightKeyword?.trim() ?? '';
  void quickActions;

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
  const openTrace = (message: Message) => {
    if (onSelectMessage) {
      onSelectMessage(message);
      return;
    }
    if (!canInspectAi || !message.isAI || message.isAdmin) return;
    setExpandedTraceSteps({});
    setInspectedMessage(message);
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
    if (!text || sending) return;
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

  const checkInSub =
    thread.checkInBadge && thread.checkInDate
      ? `Check-in ${thread.checkInBadge} · ${formatStayDateShort(thread.checkInDate)}`
      : thread.checkInBadge
        ? `Check-in ${thread.checkInBadge}`
        : undefined;

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
      {isOta ? (
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
            bgcolor: otaTheme.bgTint,
            color: otaTheme.textAccent,
            flexShrink: 0,
          }}
        >
          {otaTheme.headerIcon} {platformLabel} · Hosting reply window 24h
        </Box>
      ) : (
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
            bgcolor: T.greenBg,
            color: '#0e8c4d',
            flexShrink: 0,
          }}
        >
          💬 WhatsApp Business · {whatsappBusinessLine}
        </Box>
      )}

      <Box
        sx={{
          px: '18px',
          py: '11px',
          borderBottom: `1px solid ${T.border}`,
          bgcolor: T.bg2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexShrink: 0,
        }}
      >
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: avatarBg,
              fontSize: 14,
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
          <Stack direction="row" sx={{ gap: 0.875, alignItems: 'center', mb: '2px' }}>
            <Typography sx={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.015em' }}>
              {thread.name}
            </Typography>
            {flag && <Typography sx={{ fontSize: 14, lineHeight: 1 }}>{flag}</Typography>}
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
            {isOta ? (
              <>
                {thread.listingName && thread.listingName !== '—' && (
                  <span style={{ color: T.text2, fontWeight: 600, maxWidth: '100%' }}>
                    {thread.listingName}
                  </span>
                )}
                {thread.listingName && thread.listingName !== '—' && thread.reservationNumber && (
                  <span style={{ color: T.text4 }}>·</span>
                )}
                {thread.reservationNumber && <span>{thread.reservationNumber}</span>}
                {thread.reservationCreatedDisplay && (
                  <>
                    <span style={{ color: T.text4 }}>·</span>
                    <span>Créée {thread.reservationCreatedDisplay}</span>
                  </>
                )}
                {checkInSub && (
                  <>
                    <span style={{ color: T.text4 }}>·</span>
                    <span>{checkInSub}</span>
                  </>
                )}
                {thread.guestsLabel && (
                  <>
                    <span style={{ color: T.text4 }}>·</span>
                    <span>{thread.guestsLabel}</span>
                  </>
                )}
                {thread.phone && (
                  <>
                    <span style={{ color: T.text4 }}>·</span>
                    <a
                      href={`tel:${thread.phone.replace(/\s/g, '')}`}
                      style={{ color: T.primaryDeep, fontWeight: 700, textDecoration: 'none' }}
                      title="Appeler"
                    >
                      📱 {thread.phone}
                    </a>
                  </>
                )}
              </>
            ) : (
              <>
                {thread.phone && <span>📱 {thread.phone}</span>}
                {thread.guestPresence && (
                  <>
                    <span style={{ color: T.text4 }}>·</span>
                    <span style={{ color: T.success, fontWeight: 700 }}>🟢 {thread.guestPresence}</span>
                  </>
                )}
                {thread.reservationNumber && (
                  <>
                    <span style={{ color: T.text4 }}>·</span>
                    <span>{thread.reservationNumber}</span>
                  </>
                )}
              </>
            )}
          </Box>
        </Box>

        <Stack direction="row" sx={{ gap: 0.5, flexShrink: 0 }}>
          {(isOta ? ['🔗', '🌐', '⋮'] : ['📞', '🎥', '🔍', '⋮']).map((icon) => (
            <Box key={icon} component="button" sx={headerActionBtnSx} title={icon}>
              {icon}
            </Box>
          ))}
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
        {loadingMessages && (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} sx={{ color: isOta ? otaTheme.primary : T.primary }} />
          </Box>
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
              mt: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.75,
              px: '24px',
              py: '18px',
              width: '100%',
            }}
          >
        {!loadingMessages &&
          messages.map((message) => {
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
                    onSelectMessage || (canInspectAi && message.isAI && !message.isAdmin)
                      ? 'pointer'
                      : 'default',
                  transition: 'box-shadow 120ms ease',
                  outline:
                    selectedMessageId && selectedMessageId === message.id
                      ? '2px solid rgba(13,148,136,0.55)'
                      : undefined,
                  outlineOffset: 2,
                  '&:hover':
                    onSelectMessage || (canInspectAi && message.isAI && !message.isAdmin)
                      ? { boxShadow: '0 0 0 2px rgba(13,148,136,0.22)' }
                      : undefined,
                }}
              >
                {message.isAdmin && (
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
                {message.isAI && (
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
                {contentBadge && (
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
                {!!message.tags?.length && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
                    {message.tags.map((tag) => (
                      <Typography
                        key={tag}
                        component="span"
                        sx={{
                          fontSize: 9,
                          fontWeight: 700,
                          px: 0.75,
                          py: 0.2,
                          borderRadius: 999,
                          bgcolor: 'rgba(13,148,136,0.12)',
                          color: '#0f766e',
                          fontFamily: '"Geist Mono", monospace',
                          textTransform: 'uppercase',
                        }}
                      >
                        {tag}
                      </Typography>
                    ))}
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
              {isOta && isGuest && (
                <Typography
                  sx={{
                    fontSize: 9.5,
                    color: T.text4,
                    fontFamily: '"Geist Mono", monospace',
                    px: 0.5,
                    letterSpacing: '0.02em',
                    '& b': { color: otaTheme.textAccent, fontWeight: 700 },
                  }}
                >
                  via <b>{platformLabel}</b> · auto-translate available
                </Typography>
              )}
              {isOta && isOut && (
                <Typography
                  sx={{
                    fontSize: 9.5,
                    color: T.text4,
                    fontFamily: '"Geist Mono", monospace',
                    px: 0.5,
                    textAlign: 'right',
                    '& b': { color: otaTheme.textAccent, fontWeight: 700 },
                  }}
                >
                  sent via <b>{platformLabel}</b>
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

      <Box
        sx={{
          px: '18px',
          pb: 0.75,
          pt: 0.25,
          bgcolor: T.bg1,
          borderTop: `1px solid ${T.border}`,
          fontSize: 10.5,
          color: T.text4,
          fontFamily: '"Geist Mono", monospace',
          flexShrink: 0,
        }}
      >
        Entrée = nouvelle ligne · Envoi uniquement via le bouton ➤ · glissez le coin pour agrandir
      </Box>

      {isOta ? (
        <Box
          sx={{
            px: '18px',
            py: '7px',
            bgcolor: otaTheme.bgTint,
            borderTop: `1px solid ${T.border}`,
            fontSize: 10.5,
            color: otaTheme.textAccent,
            fontFamily: '"Geist Mono", monospace',
            flexShrink: 0,
            '& b': { fontWeight: 800 },
          }}
        >
          {otaTheme.headerIcon} <b>{platformLabel} sync</b> · message envoyé via API · impact response time ⚡
        </Box>
      ) : (
        <Box
          sx={{
            px: '18px',
            py: '6px',
            bgcolor: T.aiTint,
            borderTop: `1px solid ${T.border}`,
            fontSize: 10.5,
            color: '#5b21b6',
            fontFamily: '"Geist Mono", monospace',
            flexShrink: 0,
          }}
        >
          ⚠ Fenêtre 24h ouverte — réponses libres autorisées
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
                    {inspectedMessage.processingTrace
                      ? `${inspectedMessage.processingTrace.route || 'response'} · ${inspectedMessage.processingTrace.durationMs} ms`
                      : 'Trace unavailable for this response'}
                  </Typography>
                </Box>
                <Box component="button" onClick={() => setInspectedMessage(null)} sx={iconBtnSx} aria-label="Close">
                  ✕
                </Box>
              </Box>
              {(inspectedMessage.aiModel || inspectedMessage.tokensUsed != null) && (
                <Typography sx={{ mt: 1.5, fontSize: 11, color: T.text3 }}>
                  {inspectedMessage.aiModel || 'No AI model'}
                  {inspectedMessage.tokensUsed != null ? ` · ${inspectedMessage.tokensUsed} tokens` : ''}
                </Typography>
              )}
              {inspectedMessage.processingTrace && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
                  {[
                    `Route: ${inspectedMessage.processingTrace.route || 'unknown'}`,
                    `Categories: ${inspectedCategories.length ? inspectedCategories.join(', ') : 'none'}`,
                    `Tokens: ${inspectedMessage.tokensUsed ?? 'n/a'}`,
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
            </Box>
            <Stack spacing={1.25} sx={{ p: 2.5, overflowY: 'auto' }}>
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
            </Stack>
          </Box>
        </>
      )}
    </Box>
  );
}

function formatStayDateShort(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
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
