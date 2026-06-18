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
}

const CHANNEL_TABS: Array<{ id: WaChannelFilter; label: string; emoji?: string }> = [
  { id: 'ab', label: 'Airbnb', emoji: '🏠' },
  { id: 'bk', label: 'Book.' },
  { id: 'no_resa', label: 'Sans résa', emoji: '◎' },
];

const STAY_QUICK_TABS: Array<{ id: Exclude<WaStayQuickFilter, 'none'>; label: string }> = [
  { id: 'arr_today', label: 'Arr auj' },
  { id: 'arr_tomorrow', label: 'Arr dem' },
  { id: 'dep_today', label: 'Dép auj' },
  { id: 'dep_tomorrow', label: 'Dép dem' },
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
}: WaInboxFiltersProps) {
  const toutActive =
    channelFilter === 'all' && !unreadOnly && stayQuickFilter === 'none' && !filtersActive;

  return (
    <Box sx={{ flexShrink: 0, borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2 }}>
      <Box sx={{ px: '10px', pt: '8px', pb: '4px' }}>
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

      <Box sx={{ px: '10px', pb: '4px' }}>
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

      {onStayQuickFilterChange && stayQuickCounts && (
        <Box sx={{ px: '10px', pb: '8px' }}>
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
