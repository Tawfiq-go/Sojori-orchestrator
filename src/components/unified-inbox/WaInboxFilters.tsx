import { Box } from '@mui/material';
import { T } from './_tokens';
import type { WaChannelFilter, WaFilterCounts, WaInboxView } from './waThreadFilters';

interface WaInboxFiltersProps {
  view: WaInboxView;
  onViewChange: (v: WaInboxView) => void;
  counts: WaFilterCounts;
  channelFilter?: WaChannelFilter;
  onChannelFilterChange?: (f: WaChannelFilter) => void;
  onResetAll?: () => void;
  /** views = grille 2×4 (défaut inbox) ; channels = modal canaux ; hub = barre haute (à côté des onglets) */
  variant?: 'views' | 'channels' | 'hub';
}

type CountKey = keyof WaFilterCounts;

const ROW1: Array<{ id: WaInboxView; label: string; countKey: CountKey; urgent?: boolean; title?: string }> = [
  { id: 'exchanges', label: 'Échanges', countKey: 'exchanges' },
  { id: 'unreplied', label: 'Non rép.', countKey: 'unreplied', urgent: true },
  { id: 'created_today', label: 'Créé auj', countKey: 'created_today' },
  {
    id: 'stay',
    label: 'Séjour',
    countKey: 'stay',
    title: 'Par phase de séjour : En cours → À venir → Terminées récemment',
  },
];

const ROW2: Array<{ id: WaInboxView; label: string; countKey: CountKey }> = [
  { id: 'arr_today', label: 'Arr auj', countKey: 'arr_today' },
  { id: 'dep_today', label: 'Dép auj', countKey: 'dep_today' },
  { id: 'arr_tomorrow', label: 'Arr dem', countKey: 'arr_tomorrow' },
  { id: 'dep_tomorrow', label: 'Dép dem', countKey: 'dep_tomorrow' },
];

const CHANNEL_TABS: Array<{ id: WaChannelFilter; label: string }> = [
  { id: 'ab', label: 'Airbnb' },
  { id: 'bk', label: 'Booking' },
  { id: 'no_resa', label: 'Sans résa' },
];

/** Grille de vues WA — 2 lignes × 4, compacte. */
export default function WaInboxFilters({
  view,
  onViewChange,
  counts,
  channelFilter = 'all',
  onChannelFilterChange,
  onResetAll,
  variant = 'views',
}: WaInboxFiltersProps) {
  const hub = variant === 'hub';

  if (variant === 'channels' && onChannelFilterChange) {
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
        {CHANNEL_TABS.map((tab) => (
          <ViewBox
            key={tab.id}
            label={tab.label}
            count={counts[tab.id]}
            active={channelFilter === tab.id}
            onClick={() => onChannelFilterChange(channelFilter === tab.id ? 'all' : tab.id)}
          />
        ))}
      </Box>
    );
  }

  const renderRow = (
    tabs: Array<{ id: WaInboxView; label: string; countKey: CountKey; urgent?: boolean; title?: string }>,
  ) =>
    tabs.map((tab) => {
      const count = counts[tab.countKey] ?? 0;
      const active = view === tab.id;
      return (
        <ViewBox
          key={tab.id}
          label={tab.label}
          count={count}
          active={active}
          urgent={tab.urgent && count > 0}
          title={tab.title}
          onClick={() => {
            if (active && tab.id !== 'exchanges') {
              onViewChange('exchanges');
              return;
            }
            if (active && tab.id === 'exchanges' && onResetAll) {
              onResetAll();
              return;
            }
            onViewChange(tab.id);
          }}
        />
      );
    });

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: hub ? '3px' : '5px',
        px: hub ? 0 : '8px',
        pb: hub ? 0 : '6px',
        pt: hub ? 0 : '2px',
        width: '100%',
        maxWidth: hub ? 520 : undefined,
      }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: hub ? '3px' : '4px' }}>
        {renderRow(ROW1)}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: hub ? '3px' : '4px' }}>
        {renderRow(ROW2)}
      </Box>
    </Box>
  );
}

function ViewBox({
  label,
  count,
  active,
  urgent,
  title,
  onClick,
}: {
  label: string;
  count: number;
  active?: boolean;
  urgent?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      title={title || label}
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1px',
        minHeight: 32,
        minWidth: 0,
        px: '2px',
        py: '4px',
        border: `1.5px solid ${active ? T.primary : T.border}`,
        borderRadius: '7px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        bgcolor: active ? T.primaryTint : T.bg1,
        transition: 'all 0.12s',
        '&:hover': { bgcolor: active ? T.primaryTint : T.bg2 },
      }}
    >
      <Box
        component="span"
        sx={{
          fontSize: 9.5,
          fontWeight: active ? 800 : 650,
          color: active ? T.primaryDeep : urgent ? T.error : T.text2,
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}
      >
        {label}
      </Box>
      <Box
        component="span"
        sx={{
          fontFamily: '"Geist Mono", monospace',
          fontSize: 13,
          fontWeight: 800,
          lineHeight: 1,
          color: active
            ? T.primaryDeep
            : urgent
              ? T.error
              : count > 0
                ? T.text
                : T.text4,
          opacity: count > 0 || active ? 1 : 0.5,
        }}
      >
        {count}
      </Box>
    </Box>
  );
}

/** @deprecated — compat ThreadsList */
export function countWaActiveFilters(
  channelFilter: WaChannelFilter,
  _stayQuickFilter: unknown,
  _unreadOnly: boolean,
  view?: WaInboxView,
): number {
  let n = 0;
  if (channelFilter !== 'all') n += 1;
  if (view && view !== 'exchanges') n += 1;
  return n;
}
