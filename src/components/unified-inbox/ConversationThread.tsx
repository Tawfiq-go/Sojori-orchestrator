import { useRef, useState } from 'react';
import { useInboxMessageScroll } from './useInboxMessageScroll';
import { highlightInboxKeyword, messageMatchesKeyword } from './highlightInboxKeyword';
import { Box, Stack, Typography, CircularProgress, Tooltip } from '@mui/material';
import { DoneAll } from '@mui/icons-material';
import { T } from './_tokens';
import { flagFromPhone } from './inboxFormat';
import { getOtaTheme, isOtaChannelType } from './otaPlatformTheme';
import type { Thread, Message, QuickTemplate, QuickAction } from '../../types/unifiedInbox.types';
import { formatWhatsAppDeliveryError } from './formatWhatsAppDeliveryError';
import { extractHttpErrorMessage } from '../../utils/extractHttpErrorMessage';

interface ConversationThreadProps {
  thread: Thread;
  messages: Message[];
  quickTemplates: QuickTemplate[];
  /** Réponses rapides OTA (pilules, entre messages et templates) */
  quickReplies?: QuickTemplate[];
  quickActions?: QuickAction[];
  onSendMessage: (text: string) => void | Promise<void>;
  onSelectTemplate: (template: QuickTemplate) => void;
  onAISuggestion?: (draft: string) => void;
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
  onSendMessage,
  onSelectTemplate,
  onAISuggestion,
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [internalComposerValue, setInternalComposerValue] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
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
          <Stack direction="row" gap={0.875} sx={{ alignItems: 'center',  mb: '2px' }}>
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

        <Stack direction="row" gap={0.5} sx={{ flexShrink: 0 }}>
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
          const styles = bubbleStyles(message.from);
          const isKeywordHit = kw && messageMatchesKeyword(message.text, kw);

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
                sx={{
                  background: styles.bg,
                  border: waFailed ? '1px solid rgba(220,38,38,0.45)' : styles.border,
                  borderRadius: styles.radius,
                  px: isOta ? '16px' : '15px',
                  py: isOta ? '12px' : '11px',
                  fontSize: 13,
                  color: styles.color,
                  lineHeight: 1.7,
                  boxShadow: '0 1px 2px rgba(20,17,10,0.06)',
                }}
              >
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
              {waFailed && (
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
                  {formatWhatsAppDeliveryError(message.whatsappDeliveryError).split('\n')[0]}
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

      {quickTemplates.length > 0 && (
        <Box
          sx={{
            px: '18px',
            py: 1,
            display: 'flex',
            gap: 0.75,
            flexWrap: 'wrap',
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
        </Box>
      )}

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
          opacity: sending ? 0.72 : 1,
        }}
      >
        <Box component="button" sx={iconBtnSx} title="Joindre">
          📎
        </Box>
        <Box component="button" sx={iconBtnSx} title={isOta ? 'Traduction' : 'Emoji'}>
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
