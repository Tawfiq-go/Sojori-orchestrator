import { useMemo, useState, type ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { T } from './_tokens';
import type { Thread, Channel } from '../../types/unifiedInbox.types';

export type ThreadsListMode = 'whatsapp' | 'ota';

interface ThreadsListProps {
  threads: Thread[];
  channels: Channel[];
  activeThreadId: string | number | null;
  searchTerm: string;
  onSelectThread: (thread: Thread) => void;
  onSearchChange: (term: string) => void;
  listTitle?: string;
  listIcon?: string;
  mode?: ThreadsListMode;
}

type WaFilter = 'all' | 'unread' | 'guests' | 'staff';
type OtaFilter = 'all' | 'ab' | 'bk' | 'vrbo';

export default function ThreadsList({
  threads,
  channels,
  activeThreadId,
  searchTerm,
  onSelectThread,
  onSearchChange,
  listTitle,
  listIcon,
  mode = 'whatsapp',
}: ThreadsListProps) {
  const channel = channels[0];
  const title = listTitle || channel?.label || 'Inbox';
  const icon = listIcon || channel?.icon || '💬';
  const accentColor = channel?.color || (mode === 'ota' ? '#FF5A5F' : T.green);

  const [waFilter, setWaFilter] = useState<WaFilter>('all');
  const [otaFilter, setOtaFilter] = useState<OtaFilter>('all');

  const waUnreadCount = useMemo(() => threads.filter((t) => t.unread > 0).length, [threads]);

  const filtered = useMemo(() => {
    let list = threads;
    if (mode === 'whatsapp') {
      if (waFilter === 'unread') list = list.filter((t) => t.unread > 0);
      else if (waFilter === 'guests') list = list.filter((t) => t.reservationNumber && !t.isStaff);
      else if (waFilter === 'staff') list = list.filter((t) => t.isStaff || !t.reservationNumber);
    } else if (otaFilter !== 'all') {
      if (otaFilter === 'ab') list = list.filter((t) => t.channel === 'ab');
      else if (otaFilter === 'bk') list = list.filter((t) => t.channel === 'bk');
      else list = list.filter((t) => (t.channel as string) === 'vrbo');
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.phone?.toLowerCase().includes(q) ||
          t.reservationNumber?.toLowerCase().includes(q) ||
          t.preview.toLowerCase().includes(q),
      );
    }
    return list;
  }, [threads, mode, waFilter, otaFilter, searchTerm]);

  const otaCounts = useMemo(
    () => ({
      ab: threads.filter((t) => t.channel === 'ab').length,
      bk: threads.filter((t) => t.channel === 'bk').length,
      vrbo: threads.filter((t) => (t.channel as string) === 'vrbo').length,
    }),
    [threads],
  );

  const getInitials = (name: string): string =>
    name
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const avatarGradient = (ch: string) => {
    if (ch === 'wa') return 'linear-gradient(135deg,#34e07a,#25D366)';
    if (ch === 'ab') return 'linear-gradient(135deg,#ff8a8e,#FF5A5F)';
    if (ch === 'bk') return 'linear-gradient(135deg,#4a7eb8,#003580)';
    return 'linear-gradient(135deg,#fcd34d,#b45309)';
  };

  const channelMini = (ch: string) => {
    if (ch === 'wa') return 'W';
    if (ch === 'ab') return 'A';
    if (ch === 'bk') return 'B';
    return 'V';
  };

  return (
    <Box
      sx={{
        width: { xs: '100%', lg: 320 },
        minWidth: { lg: 320 },
        borderRight: { lg: `1px solid ${T.border}` },
        borderBottom: { xs: `1px solid ${T.border}`, lg: 'none' },
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
        bgcolor: T.bg1,
      }}
    >
      <Box
        sx={{
          px: '14px',
          py: '12px',
          borderBottom: `1px solid ${T.border}`,
          bgcolor: T.bg2,
          flexShrink: 0,
        }}
      >
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '6px',
              bgcolor: accentColor,
              color: '#fff',
              fontFamily: '"Geist Mono", monospace',
              fontSize: 13,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {mode === 'ota' ? 'A' : icon === '💬' ? 'W' : icon.charAt(0).toUpperCase()}
          </Box>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>{title}</Typography>
          <Box
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: 10,
              color: T.text3,
              bgcolor: T.bg1,
              border: `1px solid ${T.border}`,
              px: 1,
              py: '2px',
              borderRadius: 999,
              fontWeight: 700,
            }}
          >
            {threads.length}
          </Box>
        </Stack>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: '11px',
            py: '7px',
            bgcolor: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: '8px',
            transition: 'all 0.15s',
            '&:focus-within': {
              borderColor: T.primary,
              boxShadow: `0 0 0 3px ${T.primaryTint}`,
            },
          }}
        >
          <Box sx={{ fontSize: 14, color: T.text3 }}>🔍</Box>
          <Box
            component="input"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={mode === 'ota' ? 'Voyageur, résa, plateforme…' : 'Voyageur, téléphone, résa…'}
            sx={{
              flex: 1,
              border: 0,
              outline: 0,
              font: 'inherit',
              fontSize: 12.5,
              color: T.text,
              bgcolor: 'transparent',
              '&::placeholder': { color: T.text4 },
            }}
          />
          <Box
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: 9.5,
              bgcolor: T.bg2,
              border: `1px solid ${T.border}`,
              borderRadius: '4px',
              px: 0.625,
              color: T.text3,
            }}
          >
            ⌘K
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: '3px',
          px: '10px',
          py: 1,
          borderBottom: `1px solid ${T.border}`,
          bgcolor: T.bg2,
          flexShrink: 0,
          overflowX: 'auto',
        }}
      >
        {mode === 'whatsapp' ? (
          (
            [
              { id: 'all' as const, label: 'Tout', count: threads.length },
              { id: 'unread' as const, label: 'Non lus', count: waUnreadCount, urgent: true },
              { id: 'guests' as const, label: 'Guests', count: threads.filter((t) => t.reservationNumber && !t.isStaff).length },
              { id: 'staff' as const, label: 'Staff', count: threads.filter((t) => t.isStaff || !t.reservationNumber).length },
            ] as const
          ).map((tab) => (
            <SubTab
              key={tab.id}
              active={waFilter === tab.id}
              onClick={() => setWaFilter(tab.id)}
              label={tab.label}
              count={tab.count}
              urgent={tab.urgent}
            />
          ))
        ) : (
          (
            [
              { id: 'all' as const, label: 'Tout', count: threads.length },
              { id: 'ab' as const, label: '🏠 Airbnb', count: otaCounts.ab },
              { id: 'bk' as const, label: '🏨 Booking', count: otaCounts.bk },
              { id: 'vrbo' as const, label: '🌐 Vrbo', count: otaCounts.vrbo },
            ] as const
          ).map((tab) => (
            <SubTab
              key={tab.id}
              active={otaFilter === tab.id}
              onClick={() => setOtaFilter(tab.id)}
              label={tab.label}
              count={tab.count}
            />
          ))
        )}
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          px: '8px',
          py: '6px',
          bgcolor: T.bg1,
        }}
      >
        {filtered.map((thread) => {
          const isActive = activeThreadId === thread.id;
          const hasUnread = thread.unread > 0;
          const isAirbnb = thread.channel === 'ab';
          const isBooking = thread.channel === 'bk';

          return (
            <Box
              key={thread.id}
              onClick={() => onSelectThread(thread)}
              sx={{
                p: '10px 12px',
                mb: '2px',
                display: 'flex',
                gap: 1.375,
                cursor: 'pointer',
                borderRadius: '9px',
                position: 'relative',
                bgcolor: isActive ? T.primaryTint : 'transparent',
                boxShadow: isActive ? `inset 2px 0 0 ${T.primary}` : 'none',
                transition: 'all 0.15s',
                '&:hover': { bgcolor: isActive ? T.primaryTint : T.bg2 },
                ...(hasUnread && !isActive
                  ? {
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: 14,
                        right: 10,
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        bgcolor: T.primary,
                        boxShadow: '0 0 8px rgba(184,133,26,0.5)',
                      },
                    }
                  : {}),
              }}
            >
              <Box sx={{ position: 'relative', flexShrink: 0 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: thread.isStaff
                      ? 'linear-gradient(135deg,#fcd34d,#b45309)'
                      : avatarGradient(thread.channel),
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#fff',
                    fontFamily: '"Geist Mono", monospace',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 3px rgba(20,17,10,0.10)',
                  }}
                >
                  {getInitials(thread.name)}
                </Box>
                {mode === 'whatsapp' && !thread.isStaff && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      bgcolor: T.success,
                      border: `2px solid ${T.bg1}`,
                      animation: 'sojori-pulse-success 2.4s infinite',
                    }}
                  />
                )}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: thread.channelColor,
                    fontSize: 8,
                    fontWeight: 800,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${T.bg1}`,
                  }}
                >
                  {channelMini(thread.channel)}
                </Box>
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" gap={0.75} sx={{ mb: 0.25 }}>
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: T.text,
                    }}
                  >
                    {thread.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: 9.5,
                      color: hasUnread ? T.primaryDeep : T.text4,
                      fontWeight: hasUnread ? 700 : 600,
                      flexShrink: 0,
                    }}
                  >
                    {thread.time}
                  </Typography>
                </Stack>
                <Typography
                  sx={{
                    fontSize: 11.5,
                    color: hasUnread ? T.text2 : T.text3,
                    fontWeight: hasUnread ? 500 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.35,
                  }}
                >
                  {thread.preview}
                </Typography>
                <Stack direction="row" gap={0.5} sx={{ mt: 0.375, flexWrap: 'wrap' }}>
                  {thread.reservationNumber && (
                    <ThreadBadge tone="resa">{thread.reservationNumber}</ThreadBadge>
                  )}
                  {mode === 'whatsapp' && thread.checkInBadge && (
                    <ThreadBadge tone="checkin">{thread.checkInBadge}</ThreadBadge>
                  )}
                  {thread.taskCount != null && thread.taskCount > 0 && (
                    <ThreadBadge tone="task">📋 {thread.taskCount}</ThreadBadge>
                  )}
                  {mode === 'ota' && isAirbnb && <ThreadBadge tone="airbnb">Airbnb</ThreadBadge>}
                  {mode === 'ota' && isBooking && <ThreadBadge tone="booking">Booking</ThreadBadge>}
                  {thread.stayBadge && (
                    <ThreadBadge tone="stay">{thread.stayBadge}</ThreadBadge>
                  )}
                  {thread.isStaff && (
                    <ThreadBadge tone="staff">STAFF</ThreadBadge>
                  )}
                  {thread.isAuto && <ThreadBadge tone="auto">AUTO</ThreadBadge>}
                </Stack>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function SubTab({
  label,
  active,
  onClick,
  count,
  urgent,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
  urgent?: boolean;
}) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        px: '9px',
        py: '5px',
        borderRadius: '6px',
        border: 0,
        cursor: 'pointer',
        fontSize: 10.5,
        fontWeight: active ? 700 : 600,
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
        bgcolor: active ? T.bg1 : 'transparent',
        color: urgent && !active ? T.error : active ? T.text : T.text3,
        boxShadow: active ? '0 1px 2px rgba(20,17,10,0.06)' : 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.625,
      }}
    >
      {label}
      {count != null && (
        <Box
          component="span"
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 9,
            fontWeight: 700,
            bgcolor: active && urgent ? T.error : active ? T.bg3 : T.bg3,
            color: active && urgent ? '#fff' : active ? T.primaryDeep : T.text4,
            px: 0.625,
            py: '1px',
            borderRadius: 999,
            animation: urgent && !active && count > 0 ? 'sojori-pulse-error 1.8s infinite' : 'none',
          }}
        >
          {count}
        </Box>
      )}
    </Box>
  );
}

function ThreadBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'resa' | 'checkin' | 'task' | 'stay' | 'airbnb' | 'booking' | 'staff' | 'auto';
}) {
  const styles = {
    resa: { bg: T.primaryTint, color: T.primaryDeep },
    checkin: { bg: T.infoTint, color: T.info },
    task: { bg: T.primaryTint, color: T.primaryDeep },
    stay: { bg: T.successTint, color: T.success },
    airbnb: { bg: T.airbnbBg, color: '#c0353a' },
    booking: { bg: T.bookingBg, color: '#003580' },
    staff: { bg: T.warningTint, color: T.warning },
    auto: { bg: T.aiTint, color: '#5b21b6' },
  }[tone];

  return (
    <Box
      sx={{
        fontFamily: '"Geist Mono", monospace',
        fontSize: 9,
        fontWeight: 700,
        px: 0.75,
        py: '1px',
        borderRadius: '4px',
        bgcolor: styles.bg,
        color: styles.color,
      }}
    >
      {children}
    </Box>
  );
}
