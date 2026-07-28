import React, { useMemo, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import type { PortfolioRow } from '../_tokens';
import { T, DP_LAYOUT_SX } from '../_tokens';
import BienListingSwitcher from './BienListingSwitcher';
import { usePricePreviewSelectionOptional } from './pricePreviewSelectionContext';
import PreviewDaysSimpleModal from './PreviewDaysSimpleModal';

/** Hauteur approx. bandeau sticky (compact) — mis à jour en runtime via ResizeObserver. */
export const BIEN_STICKY_FILTER_TOP_OFFSET = 56;
export const BIEN_STICKY_TOP_CSS_VAR = '--dp-bien-sticky-top';

export interface BienPageStickyFiltersProps {
  rows: PortfolioRow[];
  currentListingId: string;
  loading?: boolean;
  onSelectListing: (listingId: string) => void;
  onNavigatePortfolio: () => void;
}

function sojoriMinStayForRow(applied?: { gapMinStay?: { to?: number } }) {
  const gap = applied?.gapMinStay?.to;
  return typeof gap === 'number' && gap > 0 ? gap : undefined;
}

export default function BienPageStickyFilters({
  rows,
  currentListingId,
  loading = false,
  onSelectListing,
  onNavigatePortfolio,
}: BienPageStickyFiltersProps) {
  const selection = usePricePreviewSelectionOptional();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const barRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const publish = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty(BIEN_STICKY_TOP_CSS_VAR, `${h}px`);
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty(BIEN_STICKY_TOP_CSS_VAR);
    };
  }, []);

  const selectedCount = selection?.selectedDates.size ?? 0;
  const selectedDatesList = useMemo(
    () => (selection ? [...selection.selectedDates].sort() : []),
    [selection?.selectedDates],
  );

  const sojoriMinStayByDate = useMemo(() => {
    const out: Record<string, number> = {};
    if (!selection) return out;
    for (const r of selection.previewRows) {
      const ms = sojoriMinStayForRow(r.applied);
      if (ms != null) out[r.date] = ms;
    }
    return out;
  }, [selection?.previewRows]);

  return (
    <Box
      ref={barRef}
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        bgcolor: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(12px) saturate(160%)',
        borderBottom: `1px solid ${T.borderStrong}`,
        boxShadow: '0 2px 10px rgba(15,23,42,0.05)',
        ...DP_LAYOUT_SX,
        py: 0.75,
      }}
    >
      <Stack
        direction="row"
        sx={{
          gap: 1,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={onNavigatePortfolio}
          sx={{
            all: 'unset',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 800,
            color: T.goldDeep,
            fontFamily: '"Geist Mono", monospace',
            '&:hover': { textDecoration: 'underline' },
            flexShrink: 0,
          }}
        >
          ← Pricing
        </Box>

        <Box sx={{ flex: '1 1 220px', minWidth: 0, maxWidth: 560 }}>
          <BienListingSwitcher
            rows={rows}
            currentListingId={currentListingId}
            loading={loading}
            onSelect={(id) => onSelectListing(id)}
          />
        </Box>

        {selection && selectedCount > 0 ? (
          <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center', flexShrink: 0, ml: 'auto' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: T.goldDeep }}>
              {selectedCount} j
            </Typography>
            <Button
              size="small"
              onClick={() => selection.clearSelection()}
              sx={{ textTransform: 'none', fontWeight: 700, fontSize: 11, color: T.text3, minWidth: 0, px: 1 }}
            >
              Annuler
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setEditModalOpen(true)}
              sx={{
                textTransform: 'none',
                fontWeight: 800,
                fontSize: 11,
                borderColor: T.goldDeep,
                color: T.goldDeep,
                py: 0.25,
              }}
            >
              Modifier
            </Button>
          </Stack>
        ) : null}
      </Stack>

      {selection && currentListingId ? (
        <PreviewDaysSimpleModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          listingId={currentListingId}
          selectedDates={selectedDatesList}
          sojoriMinStayByDate={sojoriMinStayByDate}
          onSaved={() => {
            selection.clearSelection();
            selection.touchCalendarUpdatedAt();
            selection.onPreviewReload?.();
          }}
        />
      ) : null}
    </Box>
  );
}
