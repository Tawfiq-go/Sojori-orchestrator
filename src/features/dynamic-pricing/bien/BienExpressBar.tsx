import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { T } from '../_tokens';
import { DP } from '../clientLabels';
import CalendarUpdateModal from './CalendarUpdateModal';
import type { BienViewProps } from '../BienView';
import {
  fetchListingEstimateDiff,
  fetchListingPricingAudits,
  fetchPilotConfig,
  savePilotConfig,
  type ApplyReportSummaryDto,
  type ListingEstimateDiffDto,
  type PricingAuditRowDto,
} from '../../../services/dynamicPricingApi';

/**
 * Parcours Express :
 * — colonne AUTO (cron) vs colonne MANUEL (one-shot)
 * — chaque action a sa dernière exécution + impact résumé
 */
export interface BienExpressBarProps {
  view: BienViewProps;
  hasMarketData: boolean;
  snapshotAt?: string | null;
  onFetchMarket: () => Promise<{ costUsd?: number } | void>;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
}

const fmtDate = (v?: string | null) =>
  v
    ? new Date(v).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
    : null;

function isAutoAudit(a: PricingAuditRowDto): boolean {
  if (a.appliedBy === 'cron') return true;
  const t = (a.triggerSource || '').toLowerCase();
  return t.includes('recompute') || t.includes('nightly') || t.includes('cron');
}

function ImpactChip({
  label,
  value,
  tone = 'muted',
}: {
  label: string;
  value: number | string;
  tone?: 'ok' | 'warn' | 'muted' | 'impact';
}) {
  const color =
    tone === 'ok'
      ? T.success
      : tone === 'warn'
        ? T.goldDeep
        : tone === 'impact'
          ? T.goldDeep
          : T.text2;
  const bg =
    tone === 'ok'
      ? T.successTint
      : tone === 'warn' || tone === 'impact'
        ? T.goldTint
        : T.bg2;
  return (
    <Chip
      size="small"
      label={
        <Box component="span" sx={{ display: 'inline-flex', gap: 0.5, alignItems: 'baseline' }}>
          <Box component="span" sx={{ fontWeight: 800, fontFamily: '"Geist Mono", monospace' }}>
            {value}
          </Box>
          <Box component="span" sx={{ fontWeight: 600 }}>{label}</Box>
        </Box>
      }
      sx={{
        height: 22,
        fontSize: 10.5,
        color,
        bgcolor: bg,
        border: `1px solid ${tone === 'impact' ? T.gold : T.border}`,
        '& .MuiChip-label': { px: 0.75 },
      }}
    />
  );
}

function auditImpact(a: PricingAuditRowDto | null): {
  cal: number;
  computed: number;
  protectedN: number;
  aligned: boolean;
  push: boolean | null;
} | null {
  if (!a) return null;
  const s: ApplyReportSummaryDto | undefined = a.applyReportSummary;
  const cal = s?.daysCalendarDatesUpdated ?? s?.daysChanged ?? a.daysChanged ?? 0;
  const computed = s?.daysPayloadPriceDays ?? 0;
  const protectedN = (s?.daysSkippedManual ?? 0) + (s?.daysSkippedReserved ?? 0);
  const aligned = cal === 0 && computed > 0;
  const push = s ? Boolean(s.ruPublishQueued) : a.ruPublishStatus === 'success' ? true : null;
  return { cal, computed, protectedN, aligned, push };
}

function CompactToggle({
  title,
  schedule,
  checked,
  saving,
  onChange,
}: {
  title: string;
  schedule: string;
  checked: boolean;
  saving: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, minWidth: 0 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.25 }}>{title}</Typography>
        <Typography sx={{ fontSize: 10.5, color: T.text3, lineHeight: 1.3 }}>{schedule}</Typography>
      </Box>
      <Switch
        size="small"
        checked={checked}
        disabled={saving}
        onChange={(e) => onChange(e.target.checked)}
        sx={{
          flexShrink: 0,
          '& .MuiSwitch-switchBase.Mui-checked': { color: T.goldDeep },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: T.gold },
        }}
      />
    </Stack>
  );
}

function LastRunLine({
  when,
  chips,
}: {
  when: string | null;
  chips: ReactNode;
}) {
  return (
    <Box sx={{ mt: 0.75 }}>
      <Typography sx={{ fontSize: 10.5, color: T.text3, mb: 0.4 }}>
        Dernière : <Box component="span" sx={{ fontWeight: 700, color: T.text2 }}>{when ?? 'jamais'}</Box>
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>{chips}</Stack>
    </Box>
  );
}

export default function BienExpressBar({
  view,
  hasMarketData,
  snapshotAt,
  onFetchMarket,
  advancedOpen,
  onToggleAdvanced,
}: BienExpressBarProps) {
  const listingId = view.listing._id;

  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [autoSnapshot, setAutoSnapshot] = useState(false);
  const [autoPropagation, setAutoPropagation] = useState(false);
  const [lastAutoSnapshotAt, setLastAutoSnapshotAt] = useState<string | null>(null);
  const [savingToggle, setSavingToggle] = useState<'snap' | 'prop' | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const [lastAutoAudit, setLastAutoAudit] = useState<PricingAuditRowDto | null>(null);
  const [lastManualAudit, setLastManualAudit] = useState<PricingAuditRowDto | null>(null);
  const [estimateDiff, setEstimateDiff] = useState<ListingEstimateDiffDto | null>(null);

  const loadState = useCallback(async () => {
    try {
      const cfg = await fetchPilotConfig(listingId);
      setAutoSnapshot(Boolean(cfg.data?.config?.autoSnapshotEnabled));
      setAutoPropagation(Boolean(cfg.data?.config?.enabled));
      setLastAutoSnapshotAt(cfg.data?.config?.lastAutoSnapshotAt ?? null);
    } catch { /* config absente */ }
    try {
      const audits = await fetchListingPricingAudits(listingId, 20);
      const rows = audits.data?.audits ?? [];
      setLastAutoAudit(rows.find(isAutoAudit) ?? null);
      setLastManualAudit(rows.find((a) => !isAutoAudit(a)) ?? null);
    } catch { /* pas d'audit */ }
    try {
      const diffRes = await fetchListingEstimateDiff(listingId);
      setEstimateDiff(diffRes.data?.diff ?? null);
    } catch {
      setEstimateDiff(null);
    }
  }, [listingId]);

  useEffect(() => { void loadState(); }, [loadState]);

  const saveToggle = async (kind: 'snap' | 'prop', value: boolean) => {
    setSavingToggle(kind);
    setToggleError(null);
    const prevSnap = autoSnapshot;
    const prevProp = autoPropagation;
    if (kind === 'snap') setAutoSnapshot(value);
    else setAutoPropagation(value);
    try {
      await savePilotConfig(
        listingId,
        kind === 'snap' ? { autoSnapshotEnabled: value } : { enabled: value },
      );
    } catch (e) {
      setAutoSnapshot(prevSnap);
      setAutoPropagation(prevProp);
      setToggleError(e instanceof Error ? e.message : 'Échec de la sauvegarde');
    } finally {
      setSavingToggle(null);
    }
  };

  const handleFetch = async () => {
    setFetching(true);
    setFetchError(null);
    try {
      await onFetchMarket();
      await loadState();
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Échec de la récupération');
    } finally {
      setFetching(false);
    }
  };

  const modeLabel = view.activeModeLabel ?? view.mode;
  const autoImpact = auditImpact(lastAutoAudit);
  const manualImpact = auditImpact(lastManualAudit);

  const estimateChips = (
    <>
      {estimateDiff?.hasPrevious ? (
        <ImpactChip
          value={estimateDiff.totalChanged}
          label={estimateDiff.totalChanged === 0 ? 'j = snapshot préc.' : 'j ≠ snapshot préc.'}
          tone={estimateDiff.totalChanged > 0 ? 'impact' : 'ok'}
        />
      ) : estimateDiff == null && snapshotAt ? (
        <ImpactChip value="—" label="diff indisponible" tone="muted" />
      ) : snapshotAt ? (
        <ImpactChip value="—" label="1er snapshot" tone="muted" />
      ) : (
        <ImpactChip value="—" label="pas d’estimation" tone="muted" />
      )}
    </>
  );

  const calendarChips = (imp: ReturnType<typeof auditImpact>) => {
    if (!imp) return <ImpactChip value="—" label="jamais propagé" tone="muted" />;
    return (
      <>
        <ImpactChip
          value={imp.cal}
          label={imp.aligned ? 'j déjà alignés' : 'j calendrier ≠'}
          tone={imp.cal > 0 ? 'impact' : 'ok'}
        />
        {imp.computed > 0 ? (
          <ImpactChip value={imp.computed} label="j calculés" tone="muted" />
        ) : null}
        {imp.protectedN > 0 ? (
          <ImpactChip value={imp.protectedN} label="protégés" tone="warn" />
        ) : null}
        {imp.push != null ? (
          <ImpactChip
            value={imp.push ? '✓' : '—'}
            label="push canaux"
            tone={imp.push ? 'ok' : 'muted'}
          />
        ) : null}
      </>
    );
  };

  const panelSx = {
    flex: 1,
    minWidth: 0,
    p: 1.25,
    borderRadius: 1.5,
    border: `1px solid ${T.border}`,
    bgcolor: T.bg1,
  } as const;

  return (
    <Box
      sx={{
        mx: { xs: 2, md: 3 },
        mb: 2,
        p: { xs: 1.5, md: 1.75 },
        borderRadius: 2,
        border: `1px solid ${T.gold}`,
        bgcolor: T.bg1,
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
        {/* ── AUTO ── */}
        <Box sx={{ ...panelSx, borderColor: autoSnapshot || autoPropagation ? T.gold : T.border }}>
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: T.goldDeep,
              mb: 1,
            }}
          >
            AUTO
          </Typography>

          <CompactToggle
            title={DP.autoSnapshotTitle}
            schedule={DP.autoSnapshotSubtitle}
            checked={autoSnapshot}
            saving={savingToggle === 'snap'}
            onChange={(v) => void saveToggle('snap', v)}
          />
          <LastRunLine
            when={fmtDate(lastAutoSnapshotAt)}
            chips={estimateChips}
          />

          <Box sx={{ borderTop: `1px dashed ${T.border}`, my: 1.1 }} />

          <CompactToggle
            title="Propagation nuit"
            schedule={DP.autoPropagationSubtitle}
            checked={autoPropagation}
            saving={savingToggle === 'prop'}
            onChange={(v) => void saveToggle('prop', v)}
          />
          <LastRunLine
            when={fmtDate(lastAutoAudit?.appliedAt)}
            chips={calendarChips(autoImpact)}
          />
        </Box>

        {/* ── MANUEL ── */}
        <Box sx={panelSx}>
          <Typography
            sx={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: T.text3,
              mb: 1,
            }}
          >
            MANUEL · ONE-SHOT
          </Typography>

          <Button
            fullWidth
            size="small"
            variant="outlined"
            disabled={fetching}
            onClick={() => void handleFetch()}
            startIcon={fetching ? <CircularProgress size={12} color="inherit" /> : undefined}
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              fontSize: 12,
              py: 0.6,
              borderColor: T.gold,
              color: T.goldDeep,
              bgcolor: T.goldTint,
              '&:hover': { borderColor: T.goldDeep, bgcolor: T.goldTint2 },
            }}
          >
            {fetching ? 'Actualisation…' : DP.fetchSnapshotNow}
          </Button>
          <LastRunLine
            when={
              // dernière estimation manuelle ≈ snapshot courant si ≠ auto
              snapshotAt && snapshotAt !== lastAutoSnapshotAt
                ? fmtDate(snapshotAt)
                : snapshotAt && !lastAutoSnapshotAt
                  ? fmtDate(snapshotAt)
                  : snapshotAt
                    ? fmtDate(snapshotAt)
                    : null
            }
            chips={estimateChips}
          />

          <Box sx={{ borderTop: `1px dashed ${T.border}`, my: 1.1 }} />

          <Button
            fullWidth
            size="small"
            variant="contained"
            disabled={!hasMarketData || !view.onRunCalendarUpdate || Boolean(view.pilotApplyLoading)}
            onClick={() => setCalendarOpen(true)}
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              fontSize: 12,
              py: 0.6,
              bgcolor: T.goldDeep,
              '&:hover': { bgcolor: T.gold },
            }}
          >
            {view.pilotApplyLoading ? 'Propagation…' : 'Propager au calendrier'}
          </Button>
          <LastRunLine
            when={fmtDate(lastManualAudit?.appliedAt)}
            chips={calendarChips(manualImpact)}
          />
        </Box>
      </Stack>

      {(toggleError || fetchError || view.pilotApplyError) && (
        <Typography sx={{ fontSize: 11, color: T.error, fontWeight: 600, mt: 0.75 }}>
          {toggleError || fetchError || view.pilotApplyError}
        </Typography>
      )}

      <Stack
        direction="row"
        sx={{
          mt: 1,
          pt: 1,
          borderTop: `1px dashed ${T.border}`,
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 0.75,
        }}
      >
        <Typography sx={{ fontSize: 11, color: T.text3 }}>
          {modeLabel} · {view.floor}–{view.ceiling} MAD
          {snapshotAt ? ` · estim. ${fmtDate(snapshotAt)}` : ''}
        </Typography>
        <Button
          size="small"
          onClick={onToggleAdvanced}
          sx={{ textTransform: 'none', fontWeight: 700, fontSize: 11.5, color: T.text2, minWidth: 0 }}
        >
          {advancedOpen ? 'Masquer avancé ▲' : 'Réglages & étude ▼'}
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
        modeEnabled={view.modeEnabled}
        occupancyBandsEnabled={view.occupancyBandsEnabled}
        occupancyLowMax={view.occupancyLowMax}
        occupancyLowAdj={view.occupancyLowAdj}
        occupancyHighMin={view.occupancyHighMin}
        occupancyHighAdj={view.occupancyHighAdj}
        lastMinuteEnabled={view.lastMinuteEnabled}
        lastMinuteFromDays={view.lastMinuteFromDays}
        lastMinuteToDays={view.lastMinuteToDays}
        lastMinuteWindowDays={view.lastMinuteToDays ?? view.lastMinuteWindowDays}
        lastMinuteDiscountPct={view.lastMinuteDiscountPct}
        onClose={() => {
          setCalendarOpen(false);
          void loadState();
        }}
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
