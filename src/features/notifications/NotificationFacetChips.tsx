import Box from '@mui/material/Box';
import { tokens as t } from '../../components/dashboard/dashboardTokens';
import { FACET_ORDER, NOTIF_FACETS } from './constants';
import type { NotificationFacet } from './types';

interface NotificationFacetChipsProps {
  selectedFacet: string;
  onSelectFacet: (facet: string) => void;
  byFacet?: Partial<Record<NotificationFacet, number>>;
}

export function NotificationFacetChips({
  selectedFacet,
  onSelectFacet,
  byFacet = {},
}: NotificationFacetChipsProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.5,
        px: 1.25,
        py: 0.75,
        borderTop: `1px solid ${t.border}`,
        maxHeight: 56,
        overflowY: 'auto',
        alignContent: 'flex-start',
        '&::-webkit-scrollbar': { width: 4, height: 4 },
      }}
    >
      <FacetChip
        label="Toutes"
        active={!selectedFacet}
        onClick={() => onSelectFacet('')}
      />
      {FACET_ORDER.map((facet) => {
        const meta = NOTIF_FACETS[facet];
        const count = byFacet[facet] ?? 0;
        return (
          <FacetChip
            key={facet}
            label={meta.label}
            color={meta.color}
            count={count}
            active={selectedFacet === facet}
            onClick={() => onSelectFacet(facet)}
          />
        );
      })}
    </Box>
  );
}

function FacetChip({
  label,
  color,
  count,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.35,
        border: `1px solid ${active ? t.primary : t.border}`,
        bgcolor: active ? t.primaryTint : t.bg2,
        color: active ? t.primaryDeep : t.text2,
        borderRadius: '999px',
        px: 0.75,
        py: 0.2,
        fontSize: 10,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        lineHeight: 1.3,
      }}
    >
      {color ? (
        <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
      ) : null}
      {label}
      {count ? (
        <Box
          component="span"
          sx={{
            fontSize: 9,
            fontWeight: 700,
            bgcolor: active ? t.primary : t.bg3,
            color: active ? t.primaryOnGold : t.text3,
            borderRadius: '999px',
            px: 0.5,
            py: 0,
            minWidth: 14,
            textAlign: 'center',
          }}
        >
          {count}
        </Box>
      ) : null}
    </Box>
  );
}
