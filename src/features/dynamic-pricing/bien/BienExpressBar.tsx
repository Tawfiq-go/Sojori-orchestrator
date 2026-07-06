import { useState } from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { T } from '../_tokens';
import CalendarUpdateModal from './CalendarUpdateModal';
import type { BienViewProps } from '../BienView';

/**
 * Parcours Express du pricing par bien — même philosophie que l'onboarding :
 * deux actions simples en haut (① récupérer les prix du marché · ② mettre à
 * jour le calendrier), l'étude de marché complète repliée derrière un toggle.
 */
export interface BienExpressBarProps {
  view: BienViewProps;
  /** Données marché AirROI présentes pour ce bien (estimation de revenus). */
  hasMarketData: boolean;
  /** Date du dernier snapshot marché du bien. */
  snapshotAt?: string | null;
  /** Récupération AirROI pour CE bien (payant, coût retourné). */
  onFetchMarket: () => Promise<{ costUsd?: number } | void>;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
}

const stepNumberSx = {
  width: 26,
  height: 26,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 13,
  fontWeight: 800,
  flexShrink: 0,
} as const;

export default function BienExpressBar({
  view,
  hasMarketData,
  snapshotAt,
  onFetchMarket,
  advancedOpen,
  onToggleAdvanced,
}: BienExpressBarProps) {
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchCost, setFetchCost] = useState<number | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const modeLabel = view.activeModeLabel ?? view.mode;

  const handleFetch = async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const r = await onFetchMarket();
      if (r && typeof r.costUsd === 'number') setFetchCost(r.costUsd);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Échec de la récupération');
    } finally {
      setFetching(false);
    }
  };

  return (
    <Box
      sx={{
        mx: { xs: 2, md: 3 },
        mb: 2,
        p: { xs: 2, md: 2.5 },
        borderRadius: 2.5,
        border: `1.5px solid ${T.gold}`,
        bgcolor: T.goldTint,
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 2, md: 3 }}
        sx={{ alignItems: { md: 'center' } }}
      >
        {/* ① Prix du marché */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              ...stepNumberSx,
              bgcolor: hasMarketData ? T.success : T.goldDeep,
              color: '#fff',
            }}
          >
            {hasMarketData ? '✓' : '1'}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>
              Snapshot prix AirROI
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: T.text3 }} noWrap>
              {hasMarketData
                ? snapshotAt
                  ? `Snapshot du ${new Date(snapshotAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`
                  : 'Snapshot présent'
                : 'Aucun snapshot — récupérez les prix estimés du marché'}
              {fetchCost != null ? ` · coût $${fetchCost.toFixed(3)}` : ''}
            </Typography>
            {fetchError ? (
              <Typography sx={{ fontSize: 11.5, color: T.error, fontWeight: 600 }}>
                {fetchError}
              </Typography>
            ) : null}
          </Box>
          <Button
            variant={hasMarketData ? 'text' : 'contained'}
            size="small"
            disabled={fetching}
            onClick={() => void handleFetch()}
            startIcon={fetching ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              fontSize: 12,
              flexShrink: 0,
              ...(hasMarketData
                ? { color: T.goldDeep }
                : { bgcolor: T.goldDeep, '&:hover': { bgcolor: T.gold } }),
            }}
          >
            {fetching ? 'Mise à jour…' : hasMarketData ? 'Mettre à jour le snapshot' : 'Récupérer le snapshot'}
          </Button>
        </Stack>

        {/* ② Calendrier */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              ...stepNumberSx,
              bgcolor: hasMarketData ? T.goldDeep : T.border,
              color: hasMarketData ? '#fff' : T.text3,
            }}
          >
            2
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>
              Snapshot → calendrier
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: T.text3 }} noWrap>
              Mode {modeLabel} · plancher {view.floor} · plafond {view.ceiling} MAD
            </Typography>
            {view.pilotApplySummary ? (
              <Typography sx={{ fontSize: 11.5, color: T.success, fontWeight: 700 }} noWrap>
                {view.pilotApplySummary}
              </Typography>
            ) : null}
            {view.pilotApplyError ? (
              <Typography sx={{ fontSize: 11.5, color: T.error, fontWeight: 600 }} noWrap>
                {view.pilotApplyError}
              </Typography>
            ) : null}
          </Box>
          <Button
            variant="contained"
            size="small"
            disabled={!hasMarketData || !view.onRunCalendarUpdate || Boolean(view.pilotApplyLoading)}
            onClick={() => setCalendarOpen(true)}
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              fontSize: 12,
              flexShrink: 0,
              bgcolor: T.goldDeep,
              '&:hover': { bgcolor: T.gold },
            }}
          >
            {view.pilotApplyLoading ? 'Propagation…' : 'Propager vers le calendrier'}
          </Button>
        </Stack>

        {/* Toggle avancé */}
        <Button
          size="small"
          onClick={onToggleAdvanced}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            fontSize: 12,
            color: T.text2,
            flexShrink: 0,
            alignSelf: { xs: 'flex-start', md: 'center' },
          }}
        >
          {advancedOpen ? 'Masquer l’étude de marché ▲' : 'Étude de marché & réglages ▼'}
        </Button>
      </Stack>

      <CalendarUpdateModal
        open={calendarOpen && Boolean(view.onRunCalendarUpdate)}
        listingName={view.listing.name}
        hasEstimate={hasMarketData}
        estimateSnapshotAt={view.provenance.snapshotAt}
        applyPrice={view.applyPrice}
        applyMinStay={view.applyMinStay}
        floor={view.floor}
        ceiling={view.ceiling}
        gapBlockEnabled={view.gapBlockEnabled}
        gapBlockMinNights={view.gapBlockMinNights}
        eventsCount={view.eventsCount ?? view.events.length}
        activeModeLabel={modeLabel}
        onClose={() => setCalendarOpen(false)}
        onRun={
          view.onRunCalendarUpdate ??
          (async () => {
            throw new Error('Mise à jour calendrier indisponible');
          })
        }
      />
    </Box>
  );
}
