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
import {
  nextCompsRun,
  nextMarketSnapshotRun,
  nextNightlyPropagationRun,
} from '../utils/nextCronRun';
import { usePricePreviewSelectionOptional } from './pricePreviewSelectionContext';

/**
 * Bandeau express fiche bien :
 * — Owner/PM : compact, sans jargon technique, pas de refresh manuel marché/comps
 * — Admin : AUTO + MANUEL (one-shot) + détail audits
 */
export interface BienExpressBarProps {
  view: BienViewProps;
  isPlatformAdmin?: boolean;
  hasMarketData: boolean;
  listingHasAirbnb?: boolean;
  snapshotAt?: string | null;
  /** Dernière apply calendrier (portfolio) — seed affichage haut de page. */
  calendarAppliedAt?: string | null;
  onFetchMarket: () => Promise<{ costUsd?: number } | void>;
  onFetchComps?: () => Promise<{ costUsd?: number } | void>;
  onFetchPerformance?: () => Promise<{ costUsd?: number } | void>;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
}

const fmtDate = (v?: string | null) =>
  v
    ? new Date(v).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
    : null;

const fmtDateShort = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—';

function latestIso(...vals: Array<string | null | undefined>): string | null {
  let best: string | null = null;
  let bestT = -1;
  for (const v of vals) {
    if (!v) continue;
    const t = new Date(v).getTime();
    if (!Number.isFinite(t) || t <= bestT) continue;
    bestT = t;
    best = v;
  }
  return best;
}

function isAutoAudit(a: PricingAuditRowDto): boolean {
  if (a.appliedBy === 'cron') return true;
  const t = (a.triggerSource || '').toLowerCase();
  return t.includes('recompute') || t.includes('nightly') || t.includes('cron');
}

/** Ligne haut de page : dernière MAJ calendrier + forcer (discret). */
function CalendarMajHeader({
  when,
  loading,
  disabled,
  onForce,
}: {
  when: string | null;
  loading?: boolean;
  disabled?: boolean;
  onForce: () => void;
}) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        flexWrap: 'wrap',
        mb: 1,
      }}
    >
      <Typography sx={{ fontSize: 12.5, color: T.text2, fontWeight: 600 }}>
        Dernière mise à jour calendrier ·{' '}
        <Box
          component="span"
          sx={{ fontWeight: 800, color: T.text, fontFamily: '"Geist Mono", monospace', fontSize: 12 }}
        >
          {fmtDate(when) ?? 'jamais'}
        </Box>
      </Typography>
      <Button
        size="small"
        variant="text"
        disabled={disabled || loading}
        onClick={onForce}
        sx={{
          textTransform: 'none',
          fontWeight: 600,
          fontSize: 11.5,
          color: T.text3,
          minWidth: 0,
          px: 0.5,
          py: 0.25,
          '&:hover': { color: T.goldDeep, bgcolor: 'transparent' },
        }}
      >
        {loading ? '…' : 'Forcer la mise à jour'}
      </Button>
    </Stack>
  );
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

function OwnerAutoSwitch({
  label,
  sub,
  checked,
  saving,
  onChange,
}: {
  label: string;
  sub: string;
  checked: boolean;
  saving: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 0.75,
        px: { xs: 1, sm: 1.25 },
        py: 0.875,
        minWidth: 0,
        flex: 1,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }} noWrap>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 10.5, color: T.text3, lineHeight: 1.2 }} noWrap>
          {sub}
        </Typography>
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
        <Typography sx={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.25 }}>{title}</Typography>
        <Typography sx={{ fontSize: 11.5, color: T.text3, lineHeight: 1.35 }}>{schedule}</Typography>
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
  next,
  chips,
}: {
  when: string | null;
  next?: string | null;
  chips: ReactNode;
}) {
  return (
    <Box sx={{ mt: 0.75 }}>
      <Typography sx={{ fontSize: 11.5, color: T.text3, mb: 0.25 }}>
        Dernière :{' '}
        <Box component="span" sx={{ fontWeight: 700, color: T.text2 }}>
          {when ?? 'jamais'}
        </Box>
      </Typography>
      {next ? (
        <Typography sx={{ fontSize: 11.5, color: T.text3, mb: 0.5 }}>
          Prochaine :{' '}
          <Box component="span" sx={{ fontWeight: 700, color: T.goldDeep }}>
            {next}
          </Box>
        </Typography>
      ) : (
        <Box sx={{ mb: 0.5 }} />
      )}
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>{chips}</Stack>
    </Box>
  );
}

export default function BienExpressBar(props: BienExpressBarProps) {
  if (props.isPlatformAdmin) {
    return <AdminExpressBar {...props} />;
  }
  return <OwnerExpressBar {...props} />;
}

function OwnerExpressBar({
  view,
  hasMarketData,
  snapshotAt,
  calendarAppliedAt = null,
  advancedOpen,
  onToggleAdvanced,
}: BienExpressBarProps) {
  const listingId = view.listing._id;
  const modeLabel = view.activeModeLabel ?? view.mode;
  const selection = usePricePreviewSelectionOptional();
  // Client : ni mode « vs marché » ni date d'estimation — juste sa fourchette
  const metaParts = [`${view.floor}–${view.ceiling} MAD`];

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [autoSnapshot, setAutoSnapshot] = useState(true);
  const [autoPropagation, setAutoPropagation] = useState(false);
  const [savingToggle, setSavingToggle] = useState<'snap' | 'prop' | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [lastAuditAt, setLastAuditAt] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    try {
      const cfg = await fetchPilotConfig(listingId);
      setAutoSnapshot(cfg.data?.config?.autoSnapshotEnabled !== false);
      setAutoPropagation(Boolean(cfg.data?.config?.enabled));
    } catch { /* config absente */ }
    try {
      const audits = await fetchListingPricingAudits(listingId, 20);
      const rows = audits.data?.audits ?? [];
      const latest = rows.reduce<string | null>((acc, a) => {
        if (!a.appliedAt) return acc;
        if (!acc) return a.appliedAt;
        return new Date(a.appliedAt).getTime() > new Date(acc).getTime() ? a.appliedAt : acc;
      }, null);
      setLastAuditAt(latest);
    } catch { /* pas d'audit */ }
  }, [listingId]);

  useEffect(() => { void loadState(); }, [loadState]);

  const lastCalendarAt = latestIso(
    selection?.lastCalendarUpdatedAt,
    lastAuditAt,
    calendarAppliedAt,
  );

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

  return (
    <Box
      sx={{
        mx: { xs: 2, md: 3 },
        mb: 1,
        px: { xs: 1.25, md: 1.5 },
        py: 0.875,
        borderRadius: 1.5,
        border: `1px solid ${T.border}`,
        bgcolor: T.bg1,
      }}
    >
      <CalendarMajHeader
        when={lastCalendarAt}
        loading={Boolean(view.pilotApplyLoading)}
        disabled={!view.onRunCalendarUpdate}
        onForce={() => setCalendarOpen(true)}
      />

      {metaParts.length ? (
        <Typography sx={{ fontSize: 11, color: T.text3, mb: 0.75 }} noWrap>
          {metaParts.join(' · ')}
        </Typography>
      ) : null}

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          border: `1px solid ${T.border}`,
          borderRadius: 1.25,
          overflow: 'hidden',
          bgcolor: T.bg0,
          '& > * + *': {
            borderTop: { xs: `1px solid ${T.border}`, md: 'none' },
            borderLeft: { xs: 'none', md: `1px solid ${T.border}` },
          },
        }}
      >
        <OwnerAutoSwitch
          label="🤖 Prix dynamique"
          sub={autoPropagation ? 'Sojori ajuste vos prix automatiquement' : 'désactivé — vos prix restent tels quels'}
          checked={autoPropagation}
          saving={savingToggle === 'prop'}
          onChange={(v) => void saveToggle('prop', v)}
        />
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          mt: 0.75,
          alignItems: { sm: 'center' },
          justifyContent: 'space-between',
          gap: 0.75,
        }}
      >
        <Typography sx={{ fontSize: 11, color: T.text3 }}>
          Plancher, plafond, périodes spéciales et options : dans les réglages ci-dessous.
        </Typography>
        <Button
          size="small"
          onClick={onToggleAdvanced}
          sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12, color: T.text3, minWidth: 0 }}
        >
          {advancedOpen ? 'Masquer ▲' : 'Réglages ▼'}
        </Button>
      </Stack>

      {(toggleError || view.pilotApplyError) && (
        <Typography sx={{ fontSize: 12, color: T.error, fontWeight: 600, mt: 0.75 }}>
          {toggleError || view.pilotApplyError}
        </Typography>
      )}

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
        onRun={async () => {
          if (!view.onRunCalendarUpdate) {
            throw new Error('Mise à jour calendrier indisponible');
          }
          const r = await view.onRunCalendarUpdate();
          selection?.touchCalendarUpdatedAt();
          return r;
        }}
      />
    </Box>
  );
}

function AdminExpressBar({
  view,
  isPlatformAdmin = false,
  hasMarketData,
  listingHasAirbnb = false,
  snapshotAt,
  calendarAppliedAt = null,
  onFetchMarket,
  onFetchComps,
  onFetchPerformance,
  advancedOpen,
  onToggleAdvanced,
}: BienExpressBarProps) {
  const listingId = view.listing._id;
  const selection = usePricePreviewSelectionOptional();

  const [fetching, setFetching] = useState(false);
  const [fetchingComps, setFetchingComps] = useState(false);
  const [fetchingPerf, setFetchingPerf] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchCompsError, setFetchCompsError] = useState<string | null>(null);
  const [fetchPerfError, setFetchPerfError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [autoSnapshot, setAutoSnapshot] = useState(false);
  const [autoComps, setAutoComps] = useState(false);
  const [autoPropagation, setAutoPropagation] = useState(false);
  const [lastAutoSnapshotAt, setLastAutoSnapshotAt] = useState<string | null>(null);
  const [lastCompsAt, setLastCompsAt] = useState<string | null>(null);
  const [savingToggle, setSavingToggle] = useState<'snap' | 'comps' | 'prop' | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const [lastAutoAudit, setLastAutoAudit] = useState<PricingAuditRowDto | null>(null);
  const [lastManualAudit, setLastManualAudit] = useState<PricingAuditRowDto | null>(null);
  const [estimateDiff, setEstimateDiff] = useState<ListingEstimateDiffDto | null>(null);

  const loadState = useCallback(async () => {
    try {
      const cfg = await fetchPilotConfig(listingId);
      setAutoSnapshot(Boolean(cfg.data?.config?.autoSnapshotEnabled));
      setAutoComps(Boolean(cfg.data?.config?.autoCompsEnabled));
      setAutoPropagation(Boolean(cfg.data?.config?.enabled));
      setLastAutoSnapshotAt(cfg.data?.config?.lastAutoSnapshotAt ?? null);
      setLastCompsAt(cfg.data?.config?.lastCompsAt ?? null);
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

  const saveToggle = async (kind: 'snap' | 'comps' | 'prop', value: boolean) => {
    setSavingToggle(kind);
    setToggleError(null);
    const prevSnap = autoSnapshot;
    const prevComps = autoComps;
    const prevProp = autoPropagation;
    if (kind === 'snap') setAutoSnapshot(value);
    else if (kind === 'comps') setAutoComps(value);
    else setAutoPropagation(value);
    try {
      await savePilotConfig(
        listingId,
        kind === 'snap'
          ? { autoSnapshotEnabled: value }
          : kind === 'comps'
            ? { autoCompsEnabled: value }
            : { enabled: value },
      );
    } catch (e) {
      setAutoSnapshot(prevSnap);
      setAutoComps(prevComps);
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

  const handleFetchComps = async () => {
    if (!onFetchComps) return;
    setFetchingComps(true);
    setFetchCompsError(null);
    try {
      await onFetchComps();
      await loadState();
    } catch (e) {
      setFetchCompsError(e instanceof Error ? e.message : 'Échec concurrence');
    } finally {
      setFetchingComps(false);
    }
  };

  const handleFetchPerformance = async () => {
    if (!onFetchPerformance) return;
    setFetchingPerf(true);
    setFetchPerfError(null);
    try {
      await onFetchPerformance();
      await loadState();
    } catch (e) {
      setFetchPerfError(e instanceof Error ? e.message : 'Échec refresh admin');
    } finally {
      setFetchingPerf(false);
    }
  };

  const modeLabel = view.activeModeLabel ?? view.mode;
  const autoImpact = auditImpact(lastAutoAudit);
  const manualImpact = auditImpact(lastManualAudit);
  const lastCalendarAt = latestIso(
    selection?.lastCalendarUpdatedAt,
    lastManualAudit?.appliedAt,
    lastAutoAudit?.appliedAt,
    calendarAppliedAt,
  );

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
    p: { xs: 1.5, md: 2 },
    borderRadius: 2,
    border: `1px solid ${T.border}`,
    bgcolor: T.bg1,
  } as const;

  return (
    <Box
      sx={{
        mx: { xs: 2, md: 3 },
        mb: 2.5,
        p: { xs: 2, md: 2.5 },
        borderRadius: 2.5,
        border: `1.5px solid ${T.gold}`,
        bgcolor: T.bg1,
        boxShadow: `0 8px 24px ${T.goldTint}`,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          alignItems: { xs: 'flex-start', sm: 'baseline' },
          justifyContent: 'space-between',
          gap: 1,
          mb: 2,
          pb: 1.5,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <Box>
          <Typography sx={{ m: 0, fontSize: { xs: 18, md: 22 }, fontWeight: 800, letterSpacing: '-0.02em' }}>
            {DP.estimationPrixMarche}
            <Box component="span" sx={{ ml: 1, fontSize: 12, fontWeight: 700, color: T.goldDeep }}>
              Admin
            </Box>
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 13, color: T.text2 }}>
            Estimation {fmtDate(snapshotAt) ?? '—'} · Concurrence {fmtDate(lastCompsAt) ?? '—'}
          </Typography>
        </Box>
      </Stack>

      <CalendarMajHeader
        when={lastCalendarAt}
        loading={Boolean(view.pilotApplyLoading)}
        disabled={!view.onRunCalendarUpdate}
        onForce={() => setCalendarOpen(true)}
      />
      {!hasMarketData ? (
        <Typography sx={{ mb: 1.5, fontSize: 11.5, color: T.text3 }}>
          Astuce : lancez d’abord une estimation si la prévisualisation est vide.
        </Typography>
      ) : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <Box sx={{ ...panelSx, borderColor: autoSnapshot || autoComps || autoPropagation ? T.gold : T.border }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: T.goldDeep, mb: 1.25 }}>
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
            next={autoSnapshot ? fmtDate(nextMarketSnapshotRun().toISOString()) : 'désactivée'}
            chips={estimateChips}
          />

          <Box sx={{ borderTop: `1px dashed ${T.border}`, my: 1.25 }} />

          <CompactToggle
            title={DP.autoCompsTitle}
            schedule={DP.autoCompsSubtitle}
            checked={autoComps}
            saving={savingToggle === 'comps'}
            onChange={(v) => void saveToggle('comps', v)}
          />
          <LastRunLine
            when={fmtDate(lastCompsAt)}
            next={autoComps ? fmtDate(nextCompsRun().toISOString()) : 'désactivée'}
            chips={
              <ImpactChip
                value={lastCompsAt ? 'OK' : '—'}
                label={lastCompsAt ? 'comps en base' : 'vide'}
                tone={lastCompsAt ? 'ok' : 'muted'}
              />
            }
          />

          <Box sx={{ borderTop: `1px dashed ${T.border}`, my: 1.25 }} />

          <CompactToggle
            title="Propagation nuit"
            schedule={DP.autoPropagationSubtitle}
            checked={autoPropagation}
            saving={savingToggle === 'prop'}
            onChange={(v) => void saveToggle('prop', v)}
          />
          <LastRunLine
            when={fmtDate(lastAutoAudit?.appliedAt)}
            next={autoPropagation ? fmtDate(nextNightlyPropagationRun().toISOString()) : 'désactivée'}
            chips={calendarChips(autoImpact)}
          />
        </Box>

        <Box sx={panelSx}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: T.text3, mb: 1.25 }}>
            MANUEL · ONE-SHOT
          </Typography>

          <Button
            fullWidth
            size="medium"
            variant="outlined"
            disabled={fetching}
            onClick={() => void handleFetch()}
            startIcon={fetching ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              fontSize: 13,
              py: 1,
              borderColor: T.gold,
              color: T.goldDeep,
              bgcolor: T.goldTint,
            }}
          >
            {fetching ? 'Actualisation…' : DP.fetchSnapshotNow}
          </Button>
          <LastRunLine when={fmtDate(snapshotAt)} chips={estimateChips} />

          <Box sx={{ borderTop: `1px dashed ${T.border}`, my: 1.25 }} />

          <Button
            fullWidth
            size="medium"
            variant="outlined"
            disabled={fetchingComps || !listingHasAirbnb || !onFetchComps}
            onClick={() => void handleFetchComps()}
            startIcon={fetchingComps ? <CircularProgress size={14} color="inherit" /> : undefined}
            sx={{ textTransform: 'none', fontWeight: 800, fontSize: 13, py: 1 }}
          >
            {fetchingComps ? 'Récupération…' : DP.fetchCompsNow}
          </Button>
          <LastRunLine when={fmtDate(lastCompsAt)} chips={<ImpactChip value="—" label="snapshot comps" tone="muted" />} />

          {isPlatformAdmin && onFetchPerformance ? (
            <>
              <Box sx={{ borderTop: `1px dashed ${T.border}`, my: 1.25 }} />
              <Button
                fullWidth
                size="medium"
                variant="outlined"
                disabled={fetchingPerf || !listingHasAirbnb}
                onClick={() => void handleFetchPerformance()}
                startIcon={fetchingPerf ? <CircularProgress size={14} color="inherit" /> : undefined}
                sx={{ textTransform: 'none', fontWeight: 800, fontSize: 12, py: 1 }}
              >
                {fetchingPerf ? '…' : 'Refresh Airbnb complet (~0,40 $)'}
              </Button>
            </>
          ) : null}

          <Box sx={{ borderTop: `1px dashed ${T.border}`, my: 1.25 }} />

          <Button
            fullWidth
            size="small"
            variant="text"
            disabled={!view.onRunCalendarUpdate || Boolean(view.pilotApplyLoading)}
            onClick={() => setCalendarOpen(true)}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 12,
              color: T.text3,
              justifyContent: 'flex-start',
              px: 0.5,
              '&:hover': { color: T.goldDeep, bgcolor: 'transparent' },
            }}
          >
            {view.pilotApplyLoading ? 'Propagation…' : 'Forcer la mise à jour'}
          </Button>
          <LastRunLine when={fmtDate(lastManualAudit?.appliedAt)} chips={calendarChips(manualImpact)} />
        </Box>
      </Stack>

      {(toggleError || fetchError || fetchCompsError || fetchPerfError || view.pilotApplyError) && (
        <Typography sx={{ fontSize: 12, color: T.error, fontWeight: 600, mt: 1 }}>
          {toggleError || fetchError || fetchCompsError || fetchPerfError || view.pilotApplyError}
        </Typography>
      )}

      <Stack
        direction="row"
        sx={{
          mt: 1.5,
          pt: 1.25,
          borderTop: `1px dashed ${T.border}`,
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 0.75,
        }}
      >
        <Typography sx={{ fontSize: 12.5, color: T.text2, fontWeight: 600 }}>
          {modeLabel} · {view.floor}–{view.ceiling} MAD
        </Typography>
        <Button
          size="small"
          onClick={onToggleAdvanced}
          sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12.5, color: T.text2, minWidth: 0 }}
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
        onRun={async () => {
          if (!view.onRunCalendarUpdate) {
            throw new Error('Mise à jour calendrier indisponible');
          }
          const r = await view.onRunCalendarUpdate();
          selection?.touchCalendarUpdatedAt();
          return r;
        }}
      />
    </Box>
  );
}
