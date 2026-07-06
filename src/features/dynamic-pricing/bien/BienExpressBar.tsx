import { useCallback, useEffect, useState } from 'react';
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
import CalendarUpdateModal from './CalendarUpdateModal';
import type { BienViewProps } from '../BienView';
import {
  fetchListingPricingAudits,
  fetchPilotConfig,
  savePilotConfig,
  type PricingAuditRowDto,
} from '../../../services/dynamicPricingApi';

/**
 * Parcours Express du pricing par bien :
 * 1. deux interrupteurs d'automatisation (snapshot hebdo · propagation nuit)
 * 2. deux actions manuelles one-shot (snapshot · propagation)
 * 3. visuel « dernière mise à jour » (jours écrits / protégés / indispo / push)
 * L'étude de marché complète reste repliée derrière le toggle avancé.
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

function AutoRow({
  emoji,
  title,
  subtitle,
  statusLine,
  checked,
  saving,
  onChange,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  statusLine?: string | null;
  checked: boolean;
  saving: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{
        alignItems: 'center',
        p: 1.5,
        borderRadius: 2,
        border: `1px solid ${checked ? T.gold : T.border}`,
        bgcolor: checked ? T.goldTint : T.bg1,
        flex: 1,
        minWidth: 0,
      }}
    >
      <Typography sx={{ fontSize: 22, flexShrink: 0 }}>{emoji}</Typography>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>{title}</Typography>
        <Typography sx={{ fontSize: 11.5, color: T.text3 }}>{subtitle}</Typography>
        {statusLine ? (
          <Typography sx={{ fontSize: 11, color: T.text2, fontWeight: 600 }}>
            {statusLine}
          </Typography>
        ) : null}
      </Box>
      <Stack sx={{ alignItems: 'center', flexShrink: 0 }}>
        <Switch
          checked={checked}
          disabled={saving}
          onChange={(e) => onChange(e.target.checked)}
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': { color: T.goldDeep },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: T.gold },
          }}
        />
        <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: checked ? T.goldDeep : T.text3 }}>
          {saving ? '…' : checked ? 'ACTIVÉ' : 'DÉSACTIVÉ'}
        </Typography>
      </Stack>
    </Stack>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number | string; tone?: 'ok' | 'warn' | 'muted' }) {
  const color = tone === 'ok' ? T.success : tone === 'warn' ? T.goldDeep : T.text2;
  return (
    <Chip
      size="small"
      label={`${value} ${label}`}
      sx={{
        fontWeight: 700,
        fontSize: 11.5,
        color,
        bgcolor: tone === 'ok' ? T.successTint : tone === 'warn' ? T.goldTint : T.bg2,
        border: `1px solid ${T.border}`,
      }}
    />
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
  const [fetchCost, setFetchCost] = useState<number | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Interrupteurs d'automatisation (config pilote)
  const [autoSnapshot, setAutoSnapshot] = useState(false);
  const [autoPropagation, setAutoPropagation] = useState(false);
  const [lastAutoSnapshotAt, setLastAutoSnapshotAt] = useState<string | null>(null);
  const [savingToggle, setSavingToggle] = useState<'snap' | 'prop' | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // Visuel dernière mise à jour (audit d'application)
  const [lastAudit, setLastAudit] = useState<PricingAuditRowDto | null>(null);

  const loadState = useCallback(async () => {
    try {
      const cfg = await fetchPilotConfig(listingId);
      setAutoSnapshot(Boolean(cfg.data?.config?.autoSnapshotEnabled));
      setAutoPropagation(Boolean(cfg.data?.config?.enabled));
      setLastAutoSnapshotAt(cfg.data?.config?.lastAutoSnapshotAt ?? null);
    } catch { /* config absente = tout OFF */ }
    try {
      const audits = await fetchListingPricingAudits(listingId, 1);
      setLastAudit(audits.data?.audits?.[0] ?? null);
    } catch { /* pas d'audit encore */ }
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
      const r = await onFetchMarket();
      if (r && typeof r.costUsd === 'number') setFetchCost(r.costUsd);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Échec de la récupération');
    } finally {
      setFetching(false);
    }
  };

  const modeLabel = view.activeModeLabel ?? view.mode;
  const summary = lastAudit?.applyReportSummary ?? null;
  const protectedDays = (summary?.daysSkippedManual ?? 0) + (summary?.daysSkippedReserved ?? 0);

  return (
    <Box
      sx={{
        mx: { xs: 2, md: 3 },
        mb: 2,
        p: { xs: 2, md: 2.5 },
        borderRadius: 2.5,
        border: `1.5px solid ${T.gold}`,
        bgcolor: T.bg1,
      }}
    >
      {/* ── 1 · Automatisation ── */}
      <Typography sx={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.08em', color: T.text3, mb: 1 }}>
        ⚡ AUTOMATISATION
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        <AutoRow
          emoji="🔄"
          title="Snapshot automatique — chaque lundi"
          subtitle="Récupère les prix estimés AirROI du bien (~0,40 $/semaine, plafonné)"
          statusLine={
            lastAutoSnapshotAt
              ? `Dernier auto : ${fmtDate(lastAutoSnapshotAt)}`
              : snapshotAt
                ? `Dernier snapshot (manuel) : ${fmtDate(snapshotAt)}`
                : 'Jamais exécuté'
          }
          checked={autoSnapshot}
          saving={savingToggle === 'snap'}
          onChange={(v) => void saveToggle('snap', v)}
        />
        <AutoRow
          emoji="🌙"
          title="Propagation automatique — chaque nuit à 4h30"
          subtitle="Applique le snapshot au calendrier + push Airbnb (gratuit, 0 appel AirROI)"
          statusLine={
            lastAudit
              ? `Dernière : ${fmtDate(lastAudit.appliedAt)} · ${lastAudit.triggerSource === 'recompute-listing' ? 'auto (nuit)' : 'manuelle'}`
              : 'Jamais exécutée'
          }
          checked={autoPropagation}
          saving={savingToggle === 'prop'}
          onChange={(v) => void saveToggle('prop', v)}
        />
      </Stack>
      {toggleError ? (
        <Typography sx={{ fontSize: 11.5, color: T.error, fontWeight: 600, mt: 0.5 }}>
          {toggleError}
        </Typography>
      ) : null}

      {/* ── 2 · Actions manuelles ── */}
      <Typography sx={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.08em', color: T.text3, mt: 2, mb: 1 }}>
        🕹 ACTIONS MANUELLES (ONE-SHOT)
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
        <Button
          variant="outlined"
          disabled={fetching}
          onClick={() => void handleFetch()}
          startIcon={fetching ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{
            textTransform: 'none', fontWeight: 800, fontSize: 12.5,
            borderColor: T.gold, color: T.goldDeep, bgcolor: T.goldTint,
            '&:hover': { borderColor: T.goldDeep, bgcolor: T.goldTint2 },
          }}
        >
          {fetching ? 'Récupération…' : '① Récupérer le snapshot maintenant'}
          {fetchCost != null && !fetching ? ` · $${fetchCost.toFixed(2)}` : ''}
        </Button>
        <Button
          variant="contained"
          disabled={!hasMarketData || !view.onRunCalendarUpdate || Boolean(view.pilotApplyLoading)}
          onClick={() => setCalendarOpen(true)}
          sx={{
            textTransform: 'none', fontWeight: 800, fontSize: 12.5,
            bgcolor: T.goldDeep, '&:hover': { bgcolor: T.gold },
          }}
        >
          {view.pilotApplyLoading ? 'Propagation…' : '② Propager vers le calendrier maintenant'}
        </Button>
        <Typography sx={{ fontSize: 11.5, color: T.text3 }}>
          Mode {modeLabel} · {view.floor}–{view.ceiling} MAD
          {snapshotAt ? ` · snapshot du ${fmtDate(snapshotAt)}` : ' · aucun snapshot'}
        </Typography>
      </Stack>
      {fetchError ? (
        <Typography sx={{ fontSize: 11.5, color: T.error, fontWeight: 600, mt: 0.5 }}>
          {fetchError}
        </Typography>
      ) : null}
      {view.pilotApplyError ? (
        <Typography sx={{ fontSize: 11.5, color: T.error, fontWeight: 600, mt: 0.5 }}>
          {view.pilotApplyError}
        </Typography>
      ) : null}

      {/* ── 3 · Dernière mise à jour du calendrier ── */}
      <Typography sx={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.08em', color: T.text3, mt: 2, mb: 1 }}>
        📊 DERNIÈRE MISE À JOUR DU CALENDRIER
      </Typography>
      {lastAudit && summary ? (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1, alignItems: 'center' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text2 }}>
            {fmtDate(lastAudit.appliedAt)}
          </Typography>
          <StatChip label="jours mis à jour" value={summary.daysCalendarDatesUpdated ?? summary.daysChanged} tone="ok" />
          {protectedDays > 0 ? (
            <StatChip label="protégés (prix manuel / résa)" value={protectedDays} tone="warn" />
          ) : null}
          {(summary.daysSkippedUnavailable ?? 0) > 0 ? (
            <StatChip label="indispo" value={summary.daysSkippedUnavailable ?? 0} tone="muted" />
          ) : null}
          <StatChip
            label={summary.ruPublishQueued ? 'push Airbnb envoyé' : 'push Airbnb non déclenché'}
            value={summary.ruPublishQueued ? '✓' : '✗'}
            tone={summary.ruPublishQueued ? 'ok' : 'muted'}
          />
        </Stack>
      ) : (
        <Typography sx={{ fontSize: 12, color: T.text3 }}>
          Aucune propagation encore — utilisez le bouton ② ou activez la propagation automatique.
        </Typography>
      )}

      {/* ── Toggle étude de marché ── */}
      <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px dashed ${T.border}` }}>
        <Button
          size="small"
          onClick={onToggleAdvanced}
          sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12, color: T.text2 }}
        >
          {advancedOpen ? 'Masquer l’étude de marché ▲' : '🔬 Étude de marché & réglages avancés ▼'}
        </Button>
      </Box>

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
