import { useMemo, useState, type ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { ModalScrollColumn } from '../common/ModalScrollColumn';
import { T } from './_tokens';
import type { Thread, Channel } from '../../types/unifiedInbox.types';
import type { OtaAdvancedSearch, OtaChannelFilter, OtaFilterCounts } from './otaThreadFilters';
import OtaInboxFilters from './OtaInboxFilters';

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
  otaChannelFilter?: OtaChannelFilter;
  onOtaChannelFilterChange?: (filter: OtaChannelFilter) => void;
  otaUnrepliedOnly?: boolean;
  onOtaUnrepliedOnlyChange?: (on: boolean) => void;
  otaFilterCounts?: OtaFilterCounts;
  otaAdvancedSearch?: OtaAdvancedSearch;
  onOtaAdvancedSearchChange?: (search: OtaAdvancedSearch) => void;
  onOtaAdvancedSearchSubmit?: () => void;
  onOtaAdvancedSearchReset?: () => void;
  otaServerSearchActive?: boolean;
  loading?: boolean;
  /** OTA : total threads chargés (badge header, avant filtre rapide local) */
  otaListTotalCount?: number;
  loadError?: string | null;
  onRetryLoad?: () => void;
  otaAdvancedExpanded?: boolean;
  onOtaAdvancedExpandedChange?: (expanded: boolean) => void;
  otaSearchResultCount?: number | null;
  onOtaToutReset?: () => void;
  otaUnrepliedSearchActive?: boolean;
}

type WaFilter = 'all' | 'unread' | 'guests' | 'staff';

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
  otaChannelFilter: otaChannelFilterProp = 'all',
  onOtaChannelFilterChange,
  otaUnrepliedOnly = false,
  onOtaUnrepliedOnlyChange,
  otaFilterCounts,
  otaAdvancedSearch,
  onOtaAdvancedSearchChange,
  onOtaAdvancedSearchSubmit,
  onOtaAdvancedSearchReset,
  otaServerSearchActive,
  loading,
  otaListTotalCount,
  loadError,
  onRetryLoad,
  otaAdvancedExpanded,
  onOtaAdvancedExpandedChange,
  otaSearchResultCount,
  onOtaToutReset,
  otaUnrepliedSearchActive,
}: ThreadsListProps) {
  const channel = channels[0];
  const title = listTitle || channel?.label || 'Inbox';
  const icon = listIcon || channel?.icon || '💬';
  const accentColor = channel?.color || (mode === 'ota' ? '#FF5A5F' : T.green);

  const [waFilter, setWaFilter] = useState<WaFilter>('all');
  const [internalAdvancedExpanded, setInternalAdvancedExpanded] = useState(false);
  const showOtaAdvanced = otaAdvancedExpanded ?? internalAdvancedExpanded;
  const setShowOtaAdvanced = onOtaAdvancedExpandedChange ?? setInternalAdvancedExpanded;

  const headerCount =
    mode === 'ota' && otaListTotalCount != null ? otaListTotalCount : threads.length;

  const waUnreadCount = useMemo(() => threads.filter((t) => t.unread > 0).length, [threads]);

  const filtered = useMemo(() => {
    let list = threads;
    if (mode === 'whatsapp') {
      if (waFilter === 'unread') list = list.filter((t) => t.unread > 0);
      else if (waFilter === 'guests') list = list.filter((t) => t.reservationNumber && !t.isStaff);
      else if (waFilter === 'staff') list = list.filter((t) => t.isStaff || !t.reservationNumber);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.phone?.toLowerCase().includes(q) ||
          t.reservationNumber?.toLowerCase().includes(q) ||
          t.listingName?.toLowerCase().includes(q) ||
          t.preview.toLowerCase().includes(q),
      );
    }
    return list;
  }, [threads, mode, waFilter, searchTerm]);

  const otaCounts: OtaFilterCounts = otaFilterCounts ?? {
    all: threads.length,
    ota: threads.filter((t) => t.channel === 'ab' || t.channel === 'bk' || t.channel === 'vrbo').length,
    ab: threads.filter((t) => t.channel === 'ab').length,
    bk: threads.filter((t) => t.channel === 'bk').length,
    direct: 0,
    unreplied: threads.filter((t) => t.needsReply).length,
  };

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
        width: { xs: '100%', lg: mode === 'ota' ? 360 : 320 },
        minWidth: { lg: mode === 'ota' ? 360 : 320 },
        borderRight: { lg: `1px solid ${T.border}` },
        borderBottom: { xs: `1px solid ${T.border}`, lg: 'none' },
        display: 'flex',
        flexDirection: 'column',
        height: { lg: '100%' },
        minHeight: 0,
        overflow: 'hidden',
        bgcolor: T.bg1,
      }}
    >
      <Box
        sx={{
          px: '14px',
          py: mode === 'ota' ? '10px' : '12px',
          borderBottom: `1px solid ${T.border}`,
          bgcolor: T.bg2,
          flexShrink: 0,
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1 }}>
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
            {loading ? '…' : headerCount}
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
            placeholder={mode === 'ota' ? 'Filtrer la liste affichée…' : 'Voyageur, téléphone, résa…'}
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
          {mode !== 'ota' && (
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
          )}
        </Box>
      </Box>

      {mode === 'ota' && onOtaAdvancedSearchChange && (
        <OtaInboxFilters
          channelFilter={otaChannelFilterProp}
          counts={otaCounts}
          onChannelFilterChange={onOtaChannelFilterChange ?? (() => {})}
          unrepliedOnly={otaUnrepliedOnly}
          onUnrepliedOnlyChange={onOtaUnrepliedOnlyChange ?? (() => {})}
          advanced={otaAdvancedSearch ?? {}}
          onAdvancedChange={onOtaAdvancedSearchChange}
          onAdvancedSubmit={() => onOtaAdvancedSearchSubmit?.()}
          onAdvancedReset={() => onOtaAdvancedSearchReset?.()}
          onToutReset={onOtaToutReset}
          serverSearchActive={otaServerSearchActive}
          unrepliedSearchActive={otaUnrepliedSearchActive}
          loading={loading}
          expanded={showOtaAdvanced}
          onToggleExpanded={() => setShowOtaAdvanced(!showOtaAdvanced)}
          searchResultCount={otaSearchResultCount}
        />
      )}

      {loadError && (
        <Box
          sx={{
            mx: '10px',
            mt: '8px',
            p: '10px 12px',
            borderRadius: '8px',
            bgcolor: T.errorTint,
            border: `1px solid ${T.error}`,
            flexShrink: 0,
          }}
        >
          <Typography sx={{ fontSize: 11, color: T.error, fontWeight: 600, mb: 0.5 }}>
            Impossible de charger les messages
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: T.text3, mb: 1 }}>{loadError}</Typography>
          {onRetryLoad && (
            <Box
              component="button"
              onClick={onRetryLoad}
              sx={{
                border: 0,
                borderRadius: '6px',
                px: '10px',
                py: '5px',
                bgcolor: T.error,
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Réessayer
            </Box>
          )}
        </Box>
      )}

      <Box
        sx={{
          display: mode === 'ota' ? 'none' : 'flex',
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
        ) : null}
      </Box>

      <ModalScrollColumn
        active
        className="ota-inbox-threads-scroll"
        wrapperSx={{ flex: 1, minHeight: 0, bgcolor: T.bg1 }}
        innerSx={{ px: '8px', py: '6px' }}
      >
        {loading && filtered.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 12, color: T.text4 }}>Chargement des fils OTA…</Typography>
          </Box>
        )}
        {!loading && filtered.length === 0 && (
          <Box sx={{ py: 4, px: 2, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 28, mb: 1 }}>📭</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: T.text2, mb: 0.5 }}>
              {mode === 'ota' ? 'Aucun fil OTA' : 'Aucune conversation'}
            </Typography>
            <Typography sx={{ fontSize: 11, color: T.text4, lineHeight: 1.45 }}>
              {mode === 'ota'
                ? 'Élargissez les filtres ou lancez une recherche avancée.'
                : 'Aucun résultat pour cette recherche.'}
            </Typography>
          </Box>
        )}
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
                <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, mb: 0.25 }}>
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
                {mode === 'ota' && thread.listingName && thread.listingName !== '—' && (
                  <Typography
                    sx={{
                      fontSize: 10.5,
                      color: T.text4,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.3,
                      mb: 0.25,
                      letterSpacing: '0.01em',
                    }}
                    title={thread.listingName}
                  >
                    {thread.listingName}
                  </Typography>
                )}
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
                <Stack direction="row" sx={{ gap: 0.5, mt: 0.375, flexWrap: 'wrap' }}>
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
                  {mode === 'ota' && thread.needsReply && (
                    <ThreadBadge tone="unreplied">À répondre</ThreadBadge>
                  )}
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
      </ModalScrollColumn>
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
  tone: 'resa' | 'checkin' | 'task' | 'stay' | 'airbnb' | 'booking' | 'staff' | 'auto' | 'unreplied';
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
    unreplied: { bg: T.errorTint, color: T.error },
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
