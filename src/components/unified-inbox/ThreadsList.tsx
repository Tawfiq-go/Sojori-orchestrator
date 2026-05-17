import { Box, Stack, TextField, InputAdornment, Typography } from '@mui/material';
import { Search } from '@mui/icons-material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import type { Thread, Channel } from '../../types/unifiedInbox.types';

interface ThreadsListProps {
  threads: Thread[];
  channels: Channel[];
  activeThreadId: string | number | null;
  searchTerm: string;
  onSelectThread: (thread: Thread) => void;
  onSearchChange: (term: string) => void;
}

/**
 * ThreadsList - Liste des conversations (col 2)
 * Design: Unified Inbox - Claude Design
 * Avec fix scroll: minHeight: 0, overscrollBehavior: 'contain'
 */
export default function ThreadsList({
  threads,
  channels,
  activeThreadId,
  searchTerm,
  onSelectThread,
  onSearchChange,
}: ThreadsListProps) {
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase();
  };

  const getChannelIcon = (channelId: string): string => {
    const channel = channels.find((c) => c.id === channelId);
    return channel?.icon || '?';
  };

  return (
    <Box
      sx={{
        width: 320,
        minWidth: 320,
        borderRight: `1px solid ${t.border}`,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,  // ← Fix scroll
        overflow: 'hidden',
      }}
    >
      {/* Header avec search */}
      <Box
        sx={{
          p: '14px 16px',
          borderBottom: `1px solid ${t.border}`,
          flexShrink: 0,  // Ne jamais rétrécir
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
          Inbox unifiée
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="Rechercher…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 16, color: t.text3 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              background: 'rgba(255,255,255,0.04)',
              fontSize: 12,
              color: t.text1,
              '& fieldset': {
                borderColor: t.border,
              },
            },
          }}
        />
      </Box>

      {/* Liste scrollable */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,                    // ← Fix scroll OBLIGATOIRE
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',   // ← Empêche cascade au parent
        }}
      >
        {threads.map((thread) => {
          const isActive = activeThreadId === thread.id;
          return (
            <Box
              key={thread.id}
              onClick={() => onSelectThread(thread)}
              sx={{
                p: '12px 16px',
                display: 'flex',
                gap: 1.5,
                cursor: 'pointer',
                background: isActive ? t.primaryTint : 'transparent',
                borderLeft: `2px solid ${isActive ? t.primary : 'transparent'}`,
                borderBottom: `1px solid ${t.border}`,
                transition: 'background 0.12s',
                '&:hover': {
                  background: isActive ? t.primaryTint : t.bg2,
                },
              }}
            >
              {/* Avatar avec badge canal */}
              <Box sx={{ position: 'relative', flexShrink: 0 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: thread.avatarColor,
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {getInitials(thread.name)}
                </Box>
                {/* Badge canal en bas à droite */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 16,
                    height: 16,
                    borderRadius: '4px',
                    background: thread.channelColor,
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${t.bg1}`,
                  }}
                >
                  {getChannelIcon(thread.channel)}
                </Box>
              </Box>

              {/* Texte */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 0.375,
                    minWidth: 0,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: t.text,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {thread.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 10,
                      color: t.text3,
                      fontFamily: 'Geist Mono',
                      flexShrink: 0,
                    }}
                  >
                    {thread.time}
                  </Typography>
                </Stack>
                <Typography
                  sx={{
                    fontSize: 12,
                    color: thread.unread > 0 ? t.text : t.text3,
                    fontWeight: thread.unread > 0 ? 500 : 400,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {thread.preview}
                </Typography>
              </Box>

              {/* Badge unread */}
              {thread.unread > 0 && (
                <Box
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: '9px',
                    background: t.primary,
                    color: t.text,
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: 'Geist Mono',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    alignSelf: 'center',
                  }}
                >
                  {thread.unread}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
