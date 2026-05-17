import { useRef, useLayoutEffect } from 'react';
import { Box, Stack, Typography, Avatar, TextField, IconButton, Chip } from '@mui/material';
import { Send, AttachFile, AutoAwesome } from '@mui/icons-material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import type { Thread, Message, QuickTemplate } from '../../types/unifiedInbox.types';

interface ConversationThreadProps {
  thread: Thread;
  messages: Message[];
  quickTemplates: QuickTemplate[];
  onSendMessage: (text: string) => void;
  onSelectTemplate: (template: QuickTemplate) => void;
  onAISuggestion?: () => void;
}

/**
 * ConversationThread - Thread de conversation avec messages (col 3)
 * Design: Unified Inbox - Claude Design
 * Avec fix scroll: scrollTop direct, pas scrollIntoView
 */
export default function ConversationThread({
  thread,
  messages,
  quickTemplates,
  onSendMessage,
  onSelectTemplate,
  onAISuggestion,
}: ConversationThreadProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousMessageCountRef = useRef<number>(0);
  const isFirstLoadRef = useRef<boolean>(true);

  // ✅ FIX SCROLL: Scroll en bas au PREMIER chargement, puis seulement si déjà en bas
  useLayoutEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) {
      console.log('📜 [ConversationThread] Scroll: pas de ref');
      return;
    }

    console.log('📜 [ConversationThread] Scroll check:', {
      messagesCount: messages.length,
      previousCount: previousMessageCountRef.current,
      isFirstLoad: isFirstLoadRef.current,
      scrollHeight: el.scrollHeight,
      scrollTop: el.scrollTop,
      clientHeight: el.clientHeight,
    });

    // Premier chargement d'une conversation → scroll en bas IMMÉDIATEMENT
    if (isFirstLoadRef.current && messages.length > 0) {
      console.log('📜 [ConversationThread] ✅ PREMIER CHARGEMENT → Scroll en bas');
      el.scrollTop = el.scrollHeight;
      isFirstLoadRef.current = false;
      previousMessageCountRef.current = messages.length;
      return;
    }

    // Nouveau message ajouté → scroll seulement si on était déjà en bas
    if (messages.length > previousMessageCountRef.current) {
      const wasAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      console.log('📜 [ConversationThread] Nouveau message:', { wasAtBottom });
      if (wasAtBottom) {
        console.log('📜 [ConversationThread] ✅ Scroll en bas (était déjà en bas)');
        el.scrollTop = el.scrollHeight;
      }
    }

    previousMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Reset isFirstLoad quand on change de conversation (thread.id change)
  useLayoutEffect(() => {
    console.log('📜 [ConversationThread] Nouvelle conversation:', thread.id);
    isFirstLoadRef.current = true;
    previousMessageCountRef.current = 0;
  }, [thread.id]);

  const handleSend = () => {
    if (!inputRef.current?.value.trim()) return;
    onSendMessage(inputRef.current.value);
    inputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,  // ← Fix scroll
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: '14px 22px',
          borderBottom: `1px solid ${t.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,  // Ne jamais rétrécir
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              fontSize: 13,
              fontWeight: 700,
              background: thread.avatarColor,
            }}
          >
            {thread.name.split(' ').map((p) => p[0]).join('')}
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
              {thread.name}
            </Typography>
            <Typography sx={{ fontSize: 11, color: t.text3 }}>
              {thread.channel === 'wa' && 'WhatsApp'}
              {thread.channel === 'ab' && 'Airbnb'}
              {thread.channel === 'bk' && 'Booking'}
              {thread.channel === 'em' && 'Email'}
              {thread.listingName && ` · ${thread.listingName}`}
              {thread.checkInDate && ` · check-in ${thread.checkInDate}`}
            </Typography>
          </Box>
        </Stack>
        {/* Actions header - Profil guest uniquement */}
        <Box
          component="button"
          sx={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${t.border}`,
            color: t.text,
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: 11,
            cursor: 'pointer',
            transition: 'all 0.15s',
            '&:hover': {
              background: t.bg2,
            },
          }}
        >
          Profil guest
        </Box>
      </Box>

      {/* Messages - SEULS ils scrollent */}
      <Box
        ref={messagesContainerRef}
        sx={{
          flex: 1,
          minHeight: 0,                    // ← Fix scroll OBLIGATOIRE
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',   // ← Empêche cascade
          p: '22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
        }}
      >
        {messages.map((message) => {
          const isGuest = message.from === 'guest';
          const isSojori = message.from === 'sojori';

          return (
            <Box
              key={message.id}
              sx={{
                alignSelf: isGuest ? 'flex-start' : 'flex-end',
                maxWidth: '70%',
              }}
            >
              <Box
                sx={{
                  background: isGuest
                    ? 'rgba(255,255,255,0.06)'
                    : isSojori
                    ? `linear-gradient(135deg, ${t.primaryTint}, rgba(244,207,94,0.08))`
                    : t.bg2,
                  border: `1px solid ${isSojori ? t.primary : t.border}`,
                  borderRadius: isGuest
                    ? '12px 12px 12px 2px'
                    : '12px 12px 2px 12px',
                  padding: '10px 14px',
                  fontSize: 13,
                  color: t.text,
                  lineHeight: 1.45,
                }}
              >
                {message.isAI && (
                  <Typography
                    sx={{
                      fontSize: 9,
                      color: t.primary,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      mb: 0.5,
                      fontFamily: 'Geist Mono',
                    }}
                  >
                    ✨ SOJORI AI · auto-réponse
                  </Typography>
                )}
                {message.text}
                <Typography
                  sx={{
                    fontSize: 9,
                    color: t.text3,
                    mt: 0.5,
                    textAlign: 'right',
                    fontFamily: 'Geist Mono',
                  }}
                >
                  {message.time}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Input zone */}
      <Box
        sx={{
          p: '12px 22px',
          borderTop: `1px solid ${t.border}`,
          flexShrink: 0,  // Ne jamais rétrécir
        }}
      >
        {/* Quick templates */}
        {quickTemplates.length > 0 && (
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ mb: 1.25, flexWrap: 'wrap', rowGap: 0.75 }}
          >
            {quickTemplates.map((template) => (
              <Chip
                key={template.id}
                label={template.label}
                size="small"
                onClick={() => onSelectTemplate(template)}
                sx={{
                  background: t.primaryTint,
                  border: `1px solid ${t.primary}`,
                  color: t.primary,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  '&:hover': {
                    background: t.primary,
                    color: t.text,
                  },
                }}
              />
            ))}
          </Stack>
        )}

        {/* Input bar - ✅ RÈGLE 3: AI + Upload + Send */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${t.border}`,
            borderRadius: '10px',
            p: '10px 14px',
          }}
        >
          {/* Icône AI Suggestion */}
          <IconButton
            size="small"
            onClick={onAISuggestion}
            sx={{
              color: t.primary,
              '&:hover': { bgcolor: t.primaryTint },
            }}
            title="Suggestion IA"
          >
            <AutoAwesome fontSize="small" />
          </IconButton>

          {/* Icône Upload */}
          <IconButton
            size="small"
            sx={{
              color: t.text3,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
            }}
            title="Joindre un fichier"
          >
            <AttachFile fontSize="small" />
          </IconButton>

          {/* Input texte */}
          <TextField
            inputRef={inputRef}
            placeholder="Tapez votre message…"
            fullWidth
            variant="standard"
            onKeyDown={handleKeyDown}
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: 13,
                color: t.text,
              },
            }}
            sx={{
              '& .MuiInputBase-root': {
                background: 'transparent',
              },
            }}
          />

          {/* Bouton Send */}
          <IconButton
            onClick={handleSend}
            sx={{
              background: t.primary,
              color: t.text,
              width: 32,
              height: 32,
              '&:hover': {
                background: t.primaryDeep,
              },
            }}
          >
            <Send fontSize="small" />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );
}
