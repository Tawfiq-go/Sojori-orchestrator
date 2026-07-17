import { useMemo, useState, type ReactNode } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import { ModalScrollColumn } from '../common/ModalScrollColumn';
import { T } from './_tokens';
import type { Thread, Channel } from '../../types/unifiedInbox.types';
import type { OtaAdvancedSearch, OtaChannelFilter, OtaFilterCounts, OtaStayQuickFilter, OtaStayQuickFilterCounts } from './otaThreadFilters';
import OtaInboxFilters from './OtaInboxFilters';
import WaInboxFilters, { countWaActiveFilters } from './WaInboxFilters';
import airbnbLogo from '../../assets/images/airbnb.png';
import bookingLogo from '../../assets/images/booking.png';
import type {
  WaChannelFilter,
  WaFilterCounts,
  WaStayQuickFilter,
  WaStayQuickFilterCounts,
} from './waThreadFilters';

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
  otaStayQuickFilter?: OtaStayQuickFilter;
  onOtaStayQuickFilterChange?: (filter: OtaStayQuickFilter) => void;
  otaStayQuickCounts?: OtaStayQuickFilterCounts;
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
  /** OTA : recherche serveur globale active (barre 🔍) — pas de filtre client à chaque frappe */
  otaGlobalSearchActive?: boolean;
  /** OTA : debounce en cours (pause de frappe avant appel API) */
  otaSearchPending?: boolean;
  /** OTA : mot-clé avancé actif (recherche dans messages) */
  otaActiveKeyword?: string;
  /** OTA : total occurrences mot-clé sur les fils trouvés */
  otaKeywordMatchTotal?: number | null;
  /** OTA : au moins un filtre / recherche active */
  otaFiltersActive?: boolean;
  /** OTA : réinitialiser barre 🔍 + avancé + canaux */
  onOtaResetAll?: () => void;
  /** OTA : charger la page suivante (scroll bas) */
  onOtaLoadMore?: () => void;
  otaHasMore?: boolean;
  otaLoadingMore?: boolean;
  /** WhatsApp guest : recherche serveur active (pas de filtre client à chaque frappe) */
  waGlobalSearchActive?: boolean;
  /** WhatsApp guest : debounce en cours */
  waSearchPending?: boolean;
  waChannelFilter?: WaChannelFilter;
  onWaChannelFilterChange?: (filter: WaChannelFilter) => void;
  waUnreadOnly?: boolean;
  onWaUnreadOnlyChange?: (on: boolean) => void;
  waFilterCounts?: WaFilterCounts;
  waStayQuickFilter?: WaStayQuickFilter;
  onWaStayQuickFilterChange?: (filter: WaStayQuickFilter) => void;
  waStayQuickCounts?: WaStayQuickFilterCounts;
  waListTotalCount?: number;
  onWaResetAll?: () => void;
  waFiltersActive?: boolean;
  /** Barre compacte : filtres canaux en modal, ligne rapide séjour */
  compactToolbar?: boolean;
  ultraCompact?: boolean;
  onEnterFullscreen?: () => void;
  showFullscreenEnter?: boolean;
}

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
  otaStayQuickFilter = 'none',
  onOtaStayQuickFilterChange,
  otaStayQuickCounts,
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
  otaGlobalSearchActive,
  otaSearchPending,
  otaActiveKeyword,
  otaKeywordMatchTotal,
  otaFiltersActive,
  onOtaResetAll,
  onOtaLoadMore,
  otaHasMore = false,
  otaLoadingMore = false,
  waGlobalSearchActive,
  waSearchPending,
  waChannelFilter = 'all',
  onWaChannelFilterChange,
  waUnreadOnly = false,
  onWaUnreadOnlyChange,
  waFilterCounts,
  waStayQuickFilter = 'none',
  onWaStayQuickFilterChange,
  waStayQuickCounts,
  waListTotalCount,
  onWaResetAll,
  waFiltersActive,
  compactToolbar = false,
  ultraCompact = false,
  onEnterFullscreen,
  showFullscreenEnter = false,
}: ThreadsListProps) {
  const channel = channels[0];
  const title = listTitle || channel?.label || 'Inbox';
  const icon = listIcon || channel?.icon || '💬';
  const accentColor = channel?.color || (mode === 'ota' ? '#FF5A5F' : T.green);
  const waFiltersEnabled = mode === 'whatsapp' && Boolean(onWaChannelFilterChange);
  const otaUsesServerSearch =
    mode === 'ota' &&
    (otaGlobalSearchActive ||
      otaServerSearchActive ||
      otaUnrepliedSearchActive ||
      Boolean(otaActiveKeyword?.trim()));

  const [internalAdvancedExpanded, setInternalAdvancedExpanded] = useState(false);
  const [waFiltersModalOpen, setWaFiltersModalOpen] = useState(false);
  const showOtaAdvanced = otaAdvancedExpanded ?? internalAdvancedExpanded;
  const setShowOtaAdvanced = onOtaAdvancedExpandedChange ?? setInternalAdvancedExpanded;

  const headerCount =
    mode === 'ota' && otaListTotalCount != null
      ? otaListTotalCount
      : mode === 'whatsapp' && waListTotalCount != null
        ? waListTotalCount
        : threads.length;

  const filtered = useMemo(() => {
    let list = threads;
    if (searchTerm.trim() && !otaUsesServerSearch && !waGlobalSearchActive && !waFiltersEnabled) {
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
  }, [threads, otaUsesServerSearch, searchTerm, waGlobalSearchActive, waFiltersEnabled]);

  const waCounts: WaFilterCounts = waFilterCounts ?? {
    all: threads.length,
    ab: 0,
    bk: 0,
    no_resa: 0,
    unreplied: threads.filter((t) => t.unread > 0).length,
  };

  const otaCounts: OtaFilterCounts = otaFilterCounts ?? {
    all: threads.length,
    ota: threads.filter((t) => t.channel === 'ab' || t.channel === 'bk' || t.channel === 'vrbo').length,
    ab: threads.filter((t) => t.channel === 'ab').length,
    bk: threads.filter((t) => t.channel === 'bk').length,
    direct: 0,
    unreplied: threads.filter((t) => t.needsReply).length,
  };

  const waActiveFilterCount = countWaActiveFilters(waChannelFilter, waStayQuickFilter, waUnreadOnly);

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

  const otaChannelLogo = (ch: string) => {
    if (ch === 'ab') return { src: airbnbLogo, alt: 'Airbnb' };
    if (ch === 'bk') return { src: bookingLogo, alt: 'Booking.com' };
    return null;
  };

  return (
    <Box
      sx={{
        width: { xs: '100%', lg: 360 },
        minWidth: { lg: 360 },
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
          px: compactToolbar ? '10px' : '14px',
          py: compactToolbar ? '8px' : mode === 'ota' ? '10px' : '12px',
          borderBottom: `1px solid ${T.border}`,
          bgcolor: T.bg2,
          flexShrink: 0,
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: compactToolbar ? 0.625 : 1 }}>
          <Box
            sx={{
              width: compactToolbar ? 20 : 24,
              height: compactToolbar ? 20 : 24,
              borderRadius: '6px',
              bgcolor: accentColor,
              color: '#fff',
              fontFamily: '"Geist Mono", monospace',
              fontSize: compactToolbar ? 11 : 13,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {mode === 'ota' ? 'A' : icon === '💬' ? 'W' : icon.charAt(0).toUpperCase()}
          </Box>
          <Typography sx={{ fontSize: compactToolbar ? 12 : 13.5, fontWeight: 700, flex: 1 }}>{title}</Typography>
          <Box
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: compactToolbar ? 9 : 10,
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
          {showFullscreenEnter && onEnterFullscreen && (
            <Box
              component="button"
              type="button"
              title="Inbox plein écran"
              aria-label="Inbox plein écran"
              onClick={onEnterFullscreen}
              sx={{
                all: 'unset',
                boxSizing: 'border-box',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 26,
                borderRadius: '6px',
                border: `1px solid ${T.borderStrong}`,
                bgcolor: T.bg1,
                color: T.text2,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                lineHeight: 1,
                boxShadow: '0 1px 2px rgba(20,17,10,0.06)',
                '&:hover': { bgcolor: T.bg2, borderColor: T.primary, color: T.primaryDeep },
              }}
            >
              ⛶
            </Box>
          )}
        </Stack>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: compactToolbar ? 0.5 : 1,
            px: compactToolbar ? '8px' : '11px',
            py: compactToolbar ? '5px' : '7px',
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
            placeholder={
              mode === 'ota'
                ? 'Résa, listing, voyageur, tél., owner…'
                : 'Résa, listing, voyageur, tél…'
            }
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
          {mode === 'ota' && otaFiltersActive && onOtaResetAll && (
            <Box
              component="button"
              type="button"
              onClick={onOtaResetAll}
              title="Réinitialiser tous les filtres"
              sx={{
                flexShrink: 0,
                border: `1px solid ${T.border}`,
                borderRadius: '6px',
                px: '7px',
                py: '3px',
                bgcolor: T.bg2,
                color: T.text3,
                fontFamily: 'inherit',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                lineHeight: 1.2,
                '&:hover': { bgcolor: T.errorTint, color: T.error, borderColor: T.error },
              }}
            >
              ✕
            </Box>
          )}
          {mode === 'whatsapp' && waFiltersActive && onWaResetAll && !compactToolbar && (
            <Box
              component="button"
              type="button"
              onClick={onWaResetAll}
              title="Réinitialiser tous les filtres"
              sx={{
                flexShrink: 0,
                border: `1px solid ${T.border}`,
                borderRadius: '6px',
                px: '7px',
                py: '3px',
                bgcolor: T.bg2,
                color: T.text3,
                fontFamily: 'inherit',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                lineHeight: 1.2,
                '&:hover': { bgcolor: T.errorTint, color: T.error, borderColor: T.error },
              }}
            >
              ✕
            </Box>
          )}
          {mode === 'whatsapp' && compactToolbar && waFiltersEnabled && (
            <Box
              component="button"
              type="button"
              onClick={() => setWaFiltersModalOpen(true)}
              title="Filtres canaux"
              sx={{
                flexShrink: 0,
                border: `1px solid ${waActiveFilterCount > 0 ? T.primary : T.border}`,
                borderRadius: '6px',
                px: '7px',
                py: '3px',
                bgcolor: waActiveFilterCount > 0 ? T.primaryTint : T.bg2,
                color: T.primaryDeep,
                fontFamily: 'inherit',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                lineHeight: 1.2,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.375,
                whiteSpace: 'nowrap',
                '&:hover': { borderColor: T.primary, bgcolor: T.primaryTint },
              }}
            >
              <FilterListIcon sx={{ fontSize: 13 }} />
              {waActiveFilterCount > 0 ? ` · ${waActiveFilterCount}` : ''}
            </Box>
          )}
          {mode === 'whatsapp' && compactToolbar && waFiltersActive && onWaResetAll && (
            <Box
              component="button"
              type="button"
              onClick={onWaResetAll}
              title="Réinitialiser tous les filtres"
              sx={{
                flexShrink: 0,
                border: `1px solid ${T.border}`,
                borderRadius: '6px',
                px: '7px',
                py: '3px',
                bgcolor: T.bg2,
                color: T.text3,
                fontFamily: 'inherit',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                lineHeight: 1.2,
                '&:hover': { bgcolor: T.errorTint, color: T.error, borderColor: T.error },
              }}
            >
              ✕
            </Box>
          )}
          {mode !== 'ota' && mode !== 'whatsapp' && (
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

        {compactToolbar && waFiltersEnabled && onWaStayQuickFilterChange && waStayQuickCounts && (
          <Box
            sx={{
              mt: 0.625,
              display: 'flex',
              flexWrap: 'nowrap',
              gap: '3px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              pb: 0.125,
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            <WaInboxFilters
              variant="quickInline"
              channelFilter={waChannelFilter}
              counts={waCounts}
              onChannelFilterChange={onWaChannelFilterChange ?? (() => {})}
              unreadOnly={waUnreadOnly}
              onUnreadOnlyChange={onWaUnreadOnlyChange ?? (() => {})}
              stayQuickFilter={waStayQuickFilter}
              onStayQuickFilterChange={onWaStayQuickFilterChange}
              stayQuickCounts={waStayQuickCounts}
              onResetAll={onWaResetAll}
              filtersActive={waFiltersActive}
            />
          </Box>
        )}
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
          keywordMatchTotal={otaKeywordMatchTotal}
          activeKeyword={otaActiveKeyword}
          stayQuickFilter={otaStayQuickFilter}
          onStayQuickFilterChange={onOtaStayQuickFilterChange}
          stayQuickCounts={otaStayQuickCounts}
        />
      )}

      {waFiltersEnabled && !compactToolbar && (
        <WaInboxFilters
          channelFilter={waChannelFilter}
          counts={waCounts}
          onChannelFilterChange={onWaChannelFilterChange ?? (() => {})}
          unreadOnly={waUnreadOnly}
          onUnreadOnlyChange={onWaUnreadOnlyChange ?? (() => {})}
          stayQuickFilter={waStayQuickFilter}
          onStayQuickFilterChange={onWaStayQuickFilterChange}
          stayQuickCounts={waStayQuickCounts}
          onResetAll={onWaResetAll}
          filtersActive={waFiltersActive}
        />
      )}

      {compactToolbar && waFiltersEnabled && (
        <Dialog open={waFiltersModalOpen} onClose={() => setWaFiltersModalOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ pb: 1, fontSize: 15 }}>Filtres canaux</DialogTitle>
          <DialogContent sx={{ pt: 0 }}>
            <WaInboxFilters
              variant="channels"
              channelFilter={waChannelFilter}
              counts={waCounts}
              onChannelFilterChange={onWaChannelFilterChange ?? (() => {})}
              unreadOnly={waUnreadOnly}
              onUnreadOnlyChange={onWaUnreadOnlyChange ?? (() => {})}
              onResetAll={onWaResetAll}
              filtersActive={waFiltersActive}
            />
          </DialogContent>
        </Dialog>
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

      <ModalScrollColumn
        active
        className="ota-inbox-threads-scroll"
        wrapperSx={{ flex: 1, minHeight: 0, bgcolor: T.bg1 }}
        innerSx={{ px: '8px', py: '6px' }}
        onScroll={
          mode === 'ota' &&
          onOtaLoadMore &&
          otaHasMore &&
          !otaGlobalSearchActive &&
          !otaServerSearchActive &&
          !otaUnrepliedSearchActive
            ? (e) => {
                const el = e.currentTarget;
                if (otaLoadingMore) return;
                if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) {
                  onOtaLoadMore();
                }
              }
            : undefined
        }
      >
        {((loading && filtered.length === 0) || (mode === 'ota' && otaSearchPending && filtered.length === 0)) && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 12, color: T.text4 }}>
              {mode === 'ota' && otaSearchPending && !loading ? 'Recherche…' : 'Chargement des fils OTA…'}
            </Typography>
          </Box>
        )}
        {!loading && !otaSearchPending && filtered.length === 0 && (
          <Box sx={{ py: 4, px: 2, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 28, mb: 1 }}>📭</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: T.text2, mb: 0.5 }}>
              {mode === 'ota' ? 'Aucun fil OTA' : 'Aucune conversation'}
            </Typography>
            <Typography sx={{ fontSize: 11, color: T.text4, lineHeight: 1.45 }}>
              {mode === 'ota'
                ? otaGlobalSearchActive
                  ? 'Aucun résultat pour cette recherche.'
                  : 'Élargissez les filtres ou lancez une recherche avancée.'
                : 'Aucun résultat pour cette recherche.'}
            </Typography>
          </Box>
        )}
        {filtered.map((thread) => {
          const isActive = activeThreadId === thread.id;
          const hasUnread = thread.unread > 0;
          const isAirbnb =
            mode === 'ota' ? thread.channel === 'ab' : thread.bookingPlatform === 'ab';
          const isBooking =
            mode === 'ota' ? thread.channel === 'bk' : thread.bookingPlatform === 'bk';
          const channelLogo = mode === 'ota' ? otaChannelLogo(thread.channel) : null;

          return (
            <Box
              key={thread.id}
              onClick={() => onSelectThread(thread)}
              sx={{
                p: ultraCompact ? '6px 8px' : '10px 12px',
                mb: ultraCompact ? '1px' : '2px',
                display: 'flex',
                gap: ultraCompact ? 1 : 1.375,
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
                    width: ultraCompact ? 32 : 38,
                    height: ultraCompact ? 32 : 38,
                    borderRadius: '50%',
                    background: channelLogo
                      ? '#fff'
                      : thread.isStaff
                        ? 'linear-gradient(135deg,#fcd34d,#b45309)'
                        : avatarGradient(thread.channel),
                    fontSize: ultraCompact ? 11 : 13,
                    fontWeight: 700,
                    color: channelLogo ? T.text : '#fff',
                    fontFamily: '"Geist Mono", monospace',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: channelLogo
                      ? '0 1px 4px rgba(20,17,10,0.14), inset 0 0 0 1px rgba(20,17,10,0.08)'
                      : '0 1px 3px rgba(20,17,10,0.10)',
                  }}
                >
                  {channelLogo ? (
                    <Box
                      title={channelLogo.alt}
                      sx={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        backgroundImage: `url(${channelLogo.src})`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                        backgroundSize: thread.channel === 'bk' ? '108%' : '70%',
                      }}
                      role="img"
                      aria-label={channelLogo.alt}
                    />
                  ) : (
                    getInitials(thread.name)
                  )}
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
                {!channelLogo && (
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
                )}
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                  <Typography
                    sx={{
                      fontSize: ultraCompact ? 11.5 : 12.5,
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
                {mode === 'whatsapp' && thread.phone && thread.phone !== thread.name && (
                  <Typography
                    sx={{
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: 10,
                      color: T.text4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      lineHeight: 1.25,
                      mb: 0.125,
                    }}
                    title={thread.phone}
                  >
                    📱 {thread.phone}
                  </Typography>
                )}
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
                  {mode === 'whatsapp' && isAirbnb && <ThreadBadge tone="airbnb">Airbnb</ThreadBadge>}
                  {mode === 'whatsapp' && isBooking && <ThreadBadge tone="booking">Booking</ThreadBadge>}
                  {mode === 'ota' && thread.needsReply && (
                    <ThreadBadge tone="unreplied">À répondre</ThreadBadge>
                  )}
                  {mode === 'ota' &&
                    otaActiveKeyword &&
                    thread.messageMatchCount != null &&
                    thread.messageMatchCount > 0 && (
                      <ThreadBadge tone="keyword">
                        🔎 {thread.messageMatchCount}×
                      </ThreadBadge>
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
        {mode === 'ota' && otaLoadingMore && (
          <Box sx={{ py: 1.5, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 11, color: T.text4 }}>Chargement…</Typography>
          </Box>
        )}
        {mode === 'ota' && otaHasMore && !otaLoadingMore && filtered.length > 0 && (
          <Box sx={{ py: 1, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 10, color: T.text4 }}>Faites défiler pour plus de fils</Typography>
          </Box>
        )}
      </ModalScrollColumn>
    </Box>
  );
}

function ThreadBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone:
    | 'resa'
    | 'checkin'
    | 'task'
    | 'stay'
    | 'airbnb'
    | 'booking'
    | 'staff'
    | 'auto'
    | 'unreplied'
    | 'keyword';
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
    keyword: { bg: '#fef9c3', color: '#854d0e' },
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
