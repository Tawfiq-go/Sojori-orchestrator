import { Box } from '@mui/material';
import { T } from './_tokens';
import { FilterChip } from './InboxFilterChips';
import type { WaChannelFilter, WaFilterCounts, WaStayQuickFilter, WaStayQuickFilterCounts } from './waThreadFilters';

interface WaInboxFiltersProps {
  channelFilter: WaChannelFilter;
  counts: WaFilterCounts;
  onChannelFilterChange: (f: WaChannelFilter) => void;
  unreadOnly: boolean;
  onUnreadOnlyChange: (on: boolean) => void;
  stayQuickFilter?: WaStayQuickFilter;
  onStayQuickFilterChange?: (f: WaStayQuickFilter) => void;
  stayQuickCounts?: WaStayQuickFilterCounts;
  onResetAll?: () => void;
  filtersActive?: boolean;
  /** full = tout ; quick = Tout/Non lus + séjour ; quickInline = une ligne ; channels = canaux uniquement */
  variant?: 'full' | 'quick' | 'quickInline' | 'channels';
}

const CHANNEL_TABS: Array<{ id: WaChannelFilter; label: string; emoji?: string }> = [
  { id: 'ab', label: 'Airbnb', emoji: '🏠' },
  { id: 'bk', label: 'Book.' },
  { id: 'no_resa', label: 'Sans résa', emoji: '◎' },
];

const STAY_QUICK_TABS: Array<{ id: Exclude<WaStayQuickFilter, 'none'>; label: string; shortLabel?: string }> = [
  { id: 'arr_today', label: 'Arr auj', shortLabel: 'Arr' },
  { id: 'arr_tomorrow', label: 'Arr dem', shortLabel: 'Arr+' },
  { id: 'dep_today', label: 'Dép auj', shortLabel: 'Dép' },
  { id: 'dep_tomorrow', label: 'Dép dem', shortLabel: 'Dép+' },
];

export default function WaInboxFilters({
  channelFilter,
  counts,
  onChannelFilterChange,
  unreadOnly,
  onUnreadOnlyChange,
  stayQuickFilter = 'none',
  onStayQuickFilterChange,
  stayQuickCounts,
  onResetAll,
  filtersActive,
  variant = 'full',
}: WaInboxFiltersProps) {
  const toutActive =
    channelFilter === 'all' && !unreadOnly && stayQuickFilter === 'none' && !filtersActive;
  const showQuick = variant === 'full' || variant === 'quick' || variant === 'quickInline';
  const showChannels = variant === 'full' || variant === 'channels';
  const showStay = showQuick && onStayQuickFilterChange && stayQuickCounts;
  const inline = variant === 'quickInline';

  if (inline && showStay) {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: '3px', minWidth: 'max-content' }}>
        <FilterChip
          label="Tout"
          count={counts.all}
          active={toutActive}
          compact
          countInline
          onClick={() => {
            if (onResetAll) onResetAll();
            else {
              onChannelFilterChange('all');
              onUnreadOnlyChange(false);
              onStayQuickFilterChange?.('none');
            }
          }}
        />
        <FilterChip
          label="NL"
          count={counts.unreplied}
          active={unreadOnly}
          urgent={counts.unreplied > 0}
          compact
          countInline
          onClick={() => onUnreadOnlyChange(!unreadOnly)}
        />
        {STAY_QUICK_TABS.map((tab) => (
          <FilterChip
            key={tab.id}
            label={tab.shortLabel || tab.label}
            count={stayQuickCounts[tab.id]}
            active={stayQuickFilter === tab.id}
            compact
            countInline
            onClick={() =>
              onStayQuickFilterChange!(stayQuickFilter === tab.id ? 'none' : tab.id)
            }
          />
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ flexShrink: 0, borderBottom: variant === 'full' ? `1px solid ${T.border}` : 'none', bgcolor: variant === 'full' ? T.bg2 : 'transparent' }}>
      {showQuick && (
      <Box sx={{ px: variant === 'full' ? '10px' : 0, pt: variant === 'full' ? '8px' : 0, pb: variant === 'full' ? '4px' : 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          <FilterChip
            label="Tout"
            count={counts.all}
            active={toutActive}
            compact
            countInline
            onClick={() => {
              if (onResetAll) onResetAll();
              else {
                onChannelFilterChange('all');
                onUnreadOnlyChange(false);
                onStayQuickFilterChange?.('none');
              }
            }}
          />
          <FilterChip
            label="Non lus"
            count={counts.unreplied}
            active={unreadOnly}
            urgent={counts.unreplied > 0}
            compact
            countInline
            onClick={() => onUnreadOnlyChange(!unreadOnly)}
          />
        </Box>
      </Box>
      )}

      {showChannels && (
      <Box sx={{ px: variant === 'full' ? '10px' : 0, pb: variant === 'full' ? '4px' : 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
          {CHANNEL_TABS.map((tab) => (
            <FilterChip
              key={tab.id}
              label={tab.label}
              emoji={tab.emoji}
              count={counts[tab.id]}
              active={channelFilter === tab.id && !unreadOnly}
              compact
              countInline
              onClick={() => {
                onUnreadOnlyChange(false);
                onChannelFilterChange(channelFilter === tab.id ? 'all' : tab.id);
              }}
            />
          ))}
        </Box>
      </Box>
      )}

      {showStay && (
        <Box sx={{ px: variant === 'full' ? '10px' : 0, pb: variant === 'full' ? '8px' : 0 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
            {STAY_QUICK_TABS.map((tab) => (
              <FilterChip
                key={tab.id}
                label={tab.label}
                count={stayQuickCounts[tab.id]}
                active={stayQuickFilter === tab.id}
                compact
                countInline
                onClick={() =>
                  onStayQuickFilterChange(stayQuickFilter === tab.id ? 'none' : tab.id)
                }
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export function countWaActiveFilters(
  channelFilter: WaChannelFilter,
  stayQuickFilter: WaStayQuickFilter,
  unreadOnly: boolean,
): number {
  let n = 0;
  if (channelFilter !== 'all') n += 1;
  if (stayQuickFilter !== 'none') n += 1;
  if (unreadOnly) n += 1;
  return n;
}
