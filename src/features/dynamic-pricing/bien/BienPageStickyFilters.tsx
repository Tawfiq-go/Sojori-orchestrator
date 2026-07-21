import { useMemo, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import type { PortfolioRow } from '../_tokens';
import { T, DP_LAYOUT_SX } from '../_tokens';
import {
  buildCityScopeOptions,
  listingMatchesCityScope,
} from '../cityScope';
import BienListingSwitcher from './BienListingSwitcher';
import DynamicPricingBreadcrumb from '../DynamicPricingBreadcrumb';
import { usePricePreviewSelectionOptional } from './pricePreviewSelectionContext';
import PreviewDaysSimpleModal from './PreviewDaysSimpleModal';

/** Hauteur approx. bandeau sticky (BienView admin bandeau en dessous). */
export const BIEN_STICKY_FILTER_TOP_OFFSET = 132;

export interface BienPageStickyFiltersProps {
  rows: PortfolioRow[];
  cityScope: string | null;
  onCityScopeChange: (scope: string | null) => void;
  currentListingId: string;
  loading?: boolean;
  onSelectListing: (listingId: string) => void;
  onNavigatePortfolio: () => void;
  onNavigateCityPortfolio: (city: string) => void;
  bienCityLabel: string | null;
}

function sojoriMinStayForRow(applied?: { gapMinStay?: { to?: number } }) {
  const gap = applied?.gapMinStay?.to;
  return typeof gap === 'number' && gap > 0 ? gap : undefined;
}

export default function BienPageStickyFilters({
  rows,
  cityScope,
  onCityScopeChange,
  currentListingId,
  loading = false,
  onSelectListing,
  onNavigatePortfolio,
  onNavigateCityPortfolio,
  bienCityLabel,
}: BienPageStickyFiltersProps) {
  const selection = usePricePreviewSelectionOptional();
  const [editModalOpen, setEditModalOpen] = useState(false);

  const activeRows = useMemo(
    () => rows.filter((r) => r.listingActive !== false),
    [rows],
  );

  const cityOptions = useMemo(() => buildCityScopeOptions(activeRows), [activeRows]);

  const scopedCount = useMemo(
    () => activeRows.filter((r) => listingMatchesCityScope(r.listing.city, cityScope)).length,
    [activeRows, cityScope],
  );

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
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        bgcolor: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(14px) saturate(180%)',
        borderBottom: `1px solid ${T.borderStrong}`,
        boxShadow: '0 4px 18px rgba(15,23,42,0.06)',
        ...DP_LAYOUT_SX,
        pt: 1,
        pb: 1.25,
      }}
    >
      <DynamicPricingBreadcrumb
        embedded
        crumbs={[
          { label: 'Pricing', onClick: onNavigatePortfolio },
          ...(bienCityLabel
            ? [{ label: bienCityLabel, onClick: () => onNavigateCityPortfolio(bienCityLabel) }]
            : []),
        ]}
      />

      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        sx={{ gap: 1.25, mt: 1, alignItems: { xs: 'stretch', lg: 'flex-end' } }}
      >
        <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
          <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center', mb: 0.625, flexWrap: 'wrap' }}>
            <Typography
              sx={{
                fontSize: 10,
                fontFamily: '"Geist Mono", monospace',
                fontWeight: 800,
                color: T.text3,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Ville
            </Typography>
            <Typography sx={{ fontSize: 10, color: T.text4, fontFamily: '"Geist Mono", monospace' }}>
              {scopedCount} bien{scopedCount > 1 ? 's' : ''} dans la liste
            </Typography>
          </Stack>
          <Stack direction="row" sx={{ gap: 0.625, flexWrap: 'wrap' }}>
            {cityOptions.map((opt) => {
              const active = opt.id === '__all__' ? !cityScope : opt.id === cityScope;
              return (
                <Box
                  key={opt.id}
                  component="button"
                  type="button"
                  disabled={loading}
                  onClick={() => onCityScopeChange(opt.id === '__all__' ? null : opt.id)}
                  sx={{
                    all: 'unset',
                    cursor: loading ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.625,
                    px: 1.125,
                    py: 0.625,
                    borderRadius: 999,
                    border: `1px solid ${active ? T.goldDeep : T.border}`,
                    bgcolor: active ? T.goldTint : T.bg1,
                    opacity: loading ? 0.75 : 1,
                    '&:hover': { borderColor: T.goldDeep, bgcolor: active ? T.goldTint : T.bg2 },
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: active ? 800 : 600,
                      color: active ? T.text : T.text2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {opt.id === '__all__' ? 'Toutes villes' : opt.label}
                  </Typography>
                  <Box
                    sx={{
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: 9.5,
                      fontWeight: 800,
                      px: 0.625,
                      py: 0.125,
                      borderRadius: 999,
                      bgcolor: active ? 'rgba(199,155,34,0.22)' : T.bg3,
                      color: active ? T.goldDeep : T.text3,
                      minWidth: 18,
                      textAlign: 'center',
                    }}
                  >
                    {opt.count}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>

        <BienListingSwitcher
          rows={rows}
          currentListingId={currentListingId}
          cityScope={cityScope}
          loading={loading}
          onSelect={(id) => onSelectListing(id)}
        />
      </Stack>

      {selection && selectedCount > 0 ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{
            mt: 1.25,
            pt: 1.25,
            borderTop: `1px dashed ${T.border}`,
            gap: 1,
            alignItems: { sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: T.goldDeep }}>
            {selectedCount} jour{selectedCount > 1 ? 's' : ''} coché{selectedCount > 1 ? 's' : ''} dans l’aperçu
          </Typography>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              onClick={() => selection.clearSelection()}
              sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12, color: T.text3 }}
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
                fontSize: 12,
                borderColor: T.goldDeep,
                color: T.goldDeep,
              }}
            >
              Modifier ({selectedCount} j)
            </Button>
          </Stack>
        </Stack>
      ) : null}

      {selection && currentListingId ? (
        <PreviewDaysSimpleModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          listingId={currentListingId}
          selectedDates={selectedDatesList}
          sojoriMinStayByDate={sojoriMinStayByDate}
          onSaved={() => {
            selection.clearSelection();
            selection.onPreviewReload?.();
          }}
        />
      ) : null}
    </Box>
  );
}
