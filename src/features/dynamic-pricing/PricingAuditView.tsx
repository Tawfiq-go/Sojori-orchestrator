import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Box,
  Stack,
  Typography,
  Button,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
} from '@mui/material';
import { T, DP_LAYOUT_SX } from './_tokens';
import {
  fetchPortfolioEstimateDiff,
  fetchPortfolioAudits,
  fetchPricingAuditDetail,
  fetchPricingAuditsCompare,
  type ListingEstimateDiffDto,
  type PortfolioEstimateDiffDto,
  type PricingAuditRowDto,
  type PricingAuditDetailDto,
  type PricingAuditCompareDto,
} from '../../services/dynamicPricingApi';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import { usePortfolio } from './hooks/usePortfolio';
import { DashboardWrapper } from '../../components/DashboardWrapper';

const MAX_DAYS_PREVIEW = 60;
const PAGE_SIZE = 40;

function fmt(iso: string | undefined | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function fmtMad(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${Math.round(n)} MAD`;
}

function deltaColor(n: number | null | undefined) {
  if (n == null || n === 0) return T.text3;
  return n > 0 ? T.success : T.error;
}

type TabId = 'ledger' | 'estimates';

export function PricingAuditView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const portfolio = usePortfolio(requestOwnerId || undefined, undefined, {
    enabled: scopeFetchReady,
  });

  const tab = (searchParams.get('tab') === 'estimates' ? 'estimates' : 'ledger') as TabId;
  const auditIdParam = searchParams.get('auditId');

  const listingIds = useMemo(() => {
    const q = searchParams.get('listingIds');
    if (q) {
      return q.split(',').map((s) => s.trim()).filter((id) => id && id !== 'undefined');
    }
    return portfolio.rows
      .map((r) => r.listing._id)
      .filter((id): id is string => Boolean(id) && id !== 'undefined');
  }, [searchParams, portfolio.rows]);

  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    portfolio.rows.forEach((r) => {
      if (r.listing._id) m[r.listing._id] = r.listing.name;
    });
    return m;
  }, [portfolio.rows]);

  const setTab = (next: TabId) => {
    const p = new URLSearchParams(searchParams);
    if (next === 'ledger') p.delete('tab');
    else p.set('tab', next);
    setSearchParams(p, { replace: true });
  };

  const openAudit = (id: string | null) => {
    const p = new URLSearchParams(searchParams);
    if (id) p.set('auditId', id);
    else p.delete('auditId');
    p.delete('tab');
    setSearchParams(p, { replace: true });
  };

  return (
    <DashboardWrapper>
      <Box sx={{ ...DP_LAYOUT_SX, py: 2 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2, mb: 1.5, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: T.text }}>
            Audit Dynamic Pricing
          </Typography>
          <Button component={Link} to="/dynamic-pricing/portefeuille" size="small" variant="outlined">
            ← Portefeuille
          </Button>
          <Button component={Link} to="/calendar" size="small" variant="outlined">
            Calendrier
          </Button>
        </Stack>

        <Typography sx={{ fontSize: 12, color: T.text3, mb: 2, lineHeight: 1.5, maxWidth: 820 }}>
          Ledger des <strong>MAJ calendrier</strong> (apply) : qui / quand / Δ jours / narrative / compare.
          Le calendrier ne garde que le dernier « pourquoi ce prix » — l’historique des décisions est ici
          (rétention 180 j).
        </Typography>

        <ToggleButtonGroup
          exclusive
          size="small"
          value={tab}
          onChange={(_, v) => v && setTab(v)}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="ledger" sx={{ textTransform: 'none', fontWeight: 700, px: 2 }}>
            Ledger apply
          </ToggleButton>
          <ToggleButton value="estimates" sx={{ textTransform: 'none', fontWeight: 700, px: 2 }}>
            Estimations G7
          </ToggleButton>
        </ToggleButtonGroup>

        {tab === 'ledger' ? (
          <LedgerTab
            listingIds={listingIds}
            nameById={nameById}
            portfolioLoading={portfolio.loading}
            auditIdParam={auditIdParam}
            onOpenAudit={openAudit}
          />
        ) : (
          <EstimatesTab
            listingIds={listingIds}
            nameById={nameById}
            portfolioLoading={portfolio.loading}
          />
        )}
      </Box>
    </DashboardWrapper>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * TAB LEDGER
 * ═══════════════════════════════════════════════════════════════════ */

function LedgerTab({
  listingIds,
  nameById,
  portfolioLoading,
  auditIdParam,
  onOpenAudit,
}: {
  listingIds: string[];
  nameById: Record<string, string>;
  portfolioLoading: boolean;
  auditIdParam: string | null;
  onOpenAudit: (id: string | null) => void;
}) {
  const [audits, setAudits] = useState<PricingAuditRowDto[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterBy, setFilterBy] = useState<'all' | 'manual' | 'cron'>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<PricingAuditDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [compare, setCompare] = useState<PricingAuditCompareDto | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [showAllDays, setShowAllDays] = useState(false);

  const load = useCallback(async () => {
    if (portfolioLoading) return;
    setLoading(true);
    try {
      const res = await fetchPortfolioAudits({
        listingIds,
        limit: PAGE_SIZE,
        skip,
        appliedBy: filterBy === 'all' ? '' : filterBy,
      });
      if (res.data?.success) {
        setAudits(res.data.audits);
        setTotal(res.data.total);
      } else {
        setAudits([]);
        setTotal(0);
      }
    } catch (e) {
      console.error('[PricingAudit ledger]', e);
      setAudits([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [listingIds.join(','), skip, filterBy, portfolioLoading]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!auditIdParam) {
      setDetail(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const res = await fetchPricingAuditDetail(auditIdParam);
        if (!cancelled && res.data?.success) setDetail(res.data.audit);
      } catch (e) {
        console.error('[PricingAudit detail]', e);
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auditIdParam]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const runCompare = async () => {
    if (selected.length !== 2) return;
    setCompareLoading(true);
    setCompare(null);
    try {
      const res = await fetchPricingAuditsCompare(selected[0], selected[1]);
      if (res.data?.success) setCompare(res.data);
    } catch (e) {
      console.error('[PricingAudit compare]', e);
    } finally {
      setCompareLoading(false);
    }
  };

  const dayRows = showAllDays ? detail?.dayDiffs : detail?.changedDayDiffs;

  return (
    <Box>
      <Stack direction="row" sx={{ gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['all', 'manual', 'cron'] as const).map((f) => (
          <Chip
            key={f}
            size="small"
            label={f === 'all' ? 'Tous' : f === 'manual' ? 'Manuel' : 'Cron'}
            onClick={() => {
              setFilterBy(f);
              setSkip(0);
            }}
            sx={{
              fontWeight: 700,
              bgcolor: filterBy === f ? T.aiTint : T.bg2,
              color: filterBy === f ? T.ai : T.text2,
              border: `1px solid ${filterBy === f ? T.ai : T.border}`,
            }}
          />
        ))}
        <Typography sx={{ fontSize: 12, color: T.text3, ml: 1 }}>
          {total} événement{total !== 1 ? 's' : ''}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          variant="contained"
          disabled={selected.length !== 2 || compareLoading}
          onClick={() => void runCompare()}
          sx={{ bgcolor: T.ai, textTransform: 'none', fontWeight: 700 }}
        >
          {compareLoading ? 'Compare…' : `Comparer (${selected.length}/2)`}
        </Button>
        {selected.length > 0 && (
          <Button size="small" onClick={() => setSelected([])} sx={{ textTransform: 'none' }}>
            Vider
          </Button>
        )}
      </Stack>

      {loading && <Typography sx={{ fontSize: 12, color: T.text3, mb: 2 }}>Chargement ledger…</Typography>}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: detail || compare ? 'minmax(320px, 1fr) minmax(360px, 1.2fr)' : '1fr',
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Box
          component="table"
          sx={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12,
            bgcolor: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: 1.5,
            overflow: 'hidden',
          }}
        >
          <Box component="thead" sx={{ bgcolor: T.bg2 }}>
            <Box component="tr">
              {['', 'Date', 'Bien', 'Trigger', 'J. cal.', 'RU', ''].map((h) => (
                <Box
                  component="th"
                  key={h || 'chk'}
                  sx={{ textAlign: 'left', p: 1.1, fontWeight: 800, color: T.text3, fontSize: 10.5 }}
                >
                  {h}
                </Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {!loading && audits.length === 0 && (
              <Box component="tr">
                <Box component="td" colSpan={7} sx={{ p: 2, color: T.text3 }}>
                  Aucun apply enregistré pour ces biens. Lancez une MAJ calendrier depuis un bien.
                </Box>
              </Box>
            )}
            {audits.map((row) => {
              const open = auditIdParam === row._id;
              const checked = selected.includes(row._id);
              const name = nameById[row.listingId || ''] || row.listingId || '—';
              return (
                <Box
                  component="tr"
                  key={row._id}
                  sx={{
                    borderTop: `1px solid ${T.border}`,
                    bgcolor: open ? T.aiTint : checked ? 'rgba(124,58,237,0.04)' : 'transparent',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: T.bg2 },
                  }}
                  onClick={() => onOpenAudit(row._id)}
                >
                  <Box component="td" sx={{ p: 0.5, width: 36 }} onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      size="small"
                      checked={checked}
                      onChange={() => toggleSelect(row._id)}
                    />
                  </Box>
                  <Box component="td" sx={{ p: 1.1, fontFamily: '"Geist Mono", monospace', whiteSpace: 'nowrap' }}>
                    {fmt(row.appliedAt)}
                  </Box>
                  <Box component="td" sx={{ p: 1.1, fontWeight: 700, maxWidth: 160 }}>
                    <Typography noWrap sx={{ fontSize: 12, fontWeight: 700 }}>
                      {name}
                    </Typography>
                  </Box>
                  <Box component="td" sx={{ p: 1.1 }}>
                    <Chip
                      size="small"
                      label={row.appliedBy === 'cron' ? 'cron' : 'manuel'}
                      sx={{
                        height: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        bgcolor: row.appliedBy === 'cron' ? T.infoTint : T.goldTint,
                        color: row.appliedBy === 'cron' ? T.info : T.goldDeep,
                      }}
                    />
                    <Typography sx={{ fontSize: 10, color: T.text3, mt: 0.3 }}>
                      {row.triggerSource}
                    </Typography>
                  </Box>
                  <Box component="td" sx={{ p: 1.1, fontFamily: '"Geist Mono", monospace', fontWeight: 700 }}>
                    {row.daysCalendarUpdated ?? row.daysChanged}
                  </Box>
                  <Box component="td" sx={{ p: 1.1, fontSize: 11, color: T.text2 }}>
                    {row.ruPublishStatus}
                  </Box>
                  <Box component="td" sx={{ p: 1.1 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.ai }}>
                      {open ? 'Ouvert' : 'Voir →'}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        <Stack spacing={2}>
          {compare && (
            <Box
              sx={{
                p: 2,
                borderRadius: 1.5,
                border: `1px solid ${T.borderStrong}`,
                bgcolor: T.bg1,
              }}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 800 }}>Compare apply</Typography>
                <Button size="small" onClick={() => setCompare(null)} sx={{ textTransform: 'none' }}>
                  Fermer
                </Button>
              </Stack>
              {!compare.sameListing && (
                <Typography sx={{ fontSize: 11, color: T.warning, mb: 1 }}>
                  ⚠ Biens différents — lecture indicative.
                </Typography>
              )}
              <Typography sx={{ fontSize: 12, color: T.text2, mb: 1 }}>
                {fmt(compare.older.appliedAt)} → {fmt(compare.newer.appliedAt)} ·{' '}
                <b>{compare.summary.daysWithDelta}</b> j. Δ · moy. |Δ|{' '}
                {compare.summary.avgAbsDeltaMad} MAD
              </Typography>
              <DayTable
                headers={['Date', 'Après A', 'Après B', 'Δ']}
                rows={(compare.changedDays ?? []).slice(0, MAX_DAYS_PREVIEW).map((d) => [
                  d.date,
                  fmtMad(d.priceA),
                  fmtMad(d.priceB),
                  d.deltaMad == null ? '—' : `${d.deltaMad > 0 ? '+' : ''}${Math.round(d.deltaMad)}`,
                ])}
                deltaCol={3}
              />
              {(compare.changedDays?.length ?? 0) > MAX_DAYS_PREVIEW && (
                <Typography sx={{ fontSize: 11, color: T.text3, mt: 1 }}>
                  +{(compare.changedDays?.length ?? 0) - MAX_DAYS_PREVIEW} jours…
                </Typography>
              )}
            </Box>
          )}

          {(detailLoading || detail) && (
            <Box
              sx={{
                p: 2,
                borderRadius: 1.5,
                border: `1px solid ${T.ai}44`,
                bgcolor: T.bg1,
                boxShadow: '0 8px 24px rgba(20,17,10,0.06)',
              }}
            >
              {detailLoading && !detail && (
                <Typography sx={{ fontSize: 12, color: T.text3 }}>Chargement détail…</Typography>
              )}
              {detail && (
                <>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: T.ai }}>
                      Apply · {fmt(detail.appliedAt)}
                    </Typography>
                    <Button size="small" onClick={() => onOpenAudit(null)} sx={{ textTransform: 'none' }}>
                      Fermer
                    </Button>
                  </Stack>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5 }}>
                    {nameById[detail.listingId] || detail.listingId}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: T.text3, mb: 1.5, fontFamily: '"Geist Mono", monospace' }}>
                    {detail.appliedBy} · {detail.triggerSource} · RU {detail.ruPublishStatus}
                  </Typography>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    {[
                      ['J. payload', detail.stats.daysInPayload],
                      ['J. Δ prix', detail.stats.daysPriceDelta],
                      ['Moy |Δ|', `${detail.stats.avgAbsDeltaMad} MAD`],
                      ['Max |Δ|', `${detail.stats.maxAbsDeltaMad} MAD`],
                      ['Skip', detail.daysSkipped],
                    ].map(([k, v]) => (
                      <Box key={String(k)} sx={{ p: 1, bgcolor: T.bg2, borderRadius: 1 }}>
                        <Typography sx={{ fontSize: 9, fontWeight: 700, color: T.text3, textTransform: 'uppercase' }}>
                          {k}
                        </Typography>
                        <Typography sx={{ fontSize: 14, fontWeight: 800, fontFamily: '"Geist Mono", monospace' }}>
                          {v}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {detail.applyReportSummary?.narrative && (
                    <Box sx={{ mb: 2, p: 1.5, bgcolor: T.aiTint, borderRadius: 1.5 }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 800, color: T.ai, mb: 1 }}>
                        Narrative apply
                      </Typography>
                      {detail.applyReportSummary.narrative.steps.map((s) => (
                        <Typography key={s.n} sx={{ fontSize: 12, color: T.text2, mb: 0.6, lineHeight: 1.4 }}>
                          <b style={{ color: T.text }}>{s.n}. {s.title}</b> — {s.detail}
                        </Typography>
                      ))}
                    </Box>
                  )}

                  <Stack direction="row" sx={{ gap: 1, mb: 1, alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 800 }}>
                      Diff calendrier (avant → après)
                    </Typography>
                    <Chip
                      size="small"
                      label={showAllDays ? 'Tous les jours' : 'Changés seulement'}
                      onClick={() => setShowAllDays((v) => !v)}
                      sx={{ height: 22, fontSize: 10, fontWeight: 700 }}
                    />
                    <Button
                      component={Link}
                      to={`/dynamic-pricing/bien/${detail.listingId}`}
                      size="small"
                      sx={{ textTransform: 'none', ml: 'auto' }}
                    >
                      Ouvrir bien →
                    </Button>
                  </Stack>

                  <DayTable
                    headers={['Date', 'Avant', 'Après', 'Δ']}
                    rows={(dayRows ?? []).slice(0, MAX_DAYS_PREVIEW).map((d) => [
                      d.date,
                      fmtMad(d.beforeCalculatedPrice),
                      fmtMad(d.afterCalculatedPrice),
                      d.deltaMad == null ? '—' : `${d.deltaMad > 0 ? '+' : ''}${Math.round(d.deltaMad)}`,
                    ])}
                    deltaCol={3}
                  />
                  {(dayRows?.length ?? 0) > MAX_DAYS_PREVIEW && (
                    <Typography sx={{ fontSize: 11, color: T.text3, mt: 1 }}>
                      +{(dayRows?.length ?? 0) - MAX_DAYS_PREVIEW} jours non affichés
                    </Typography>
                  )}
                </>
              )}
            </Box>
          )}
        </Stack>
      </Box>

      {total > PAGE_SIZE && (
        <Stack direction="row" sx={{ gap: 1, mt: 2, alignItems: 'center' }}>
          <Button
            size="small"
            disabled={skip <= 0}
            onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
            sx={{ textTransform: 'none' }}
          >
            ← Préc.
          </Button>
          <Typography sx={{ fontSize: 12, color: T.text3 }}>
            {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} / {total}
          </Typography>
          <Button
            size="small"
            disabled={skip + PAGE_SIZE >= total}
            onClick={() => setSkip((s) => s + PAGE_SIZE)}
            sx={{ textTransform: 'none' }}
          >
            Suiv. →
          </Button>
        </Stack>
      )}
    </Box>
  );
}

function DayTable({
  headers,
  rows,
  deltaCol,
}: {
  headers: string[];
  rows: string[][];
  deltaCol?: number;
}) {
  return (
    <Box
      component="table"
      sx={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 11,
        fontFamily: '"Geist Mono", monospace',
      }}
    >
      <Box component="thead">
        <Box component="tr">
          {headers.map((h) => (
            <Box
              component="th"
              key={h}
              sx={{ textAlign: 'left', p: 0.75, color: T.text3, fontWeight: 800, fontSize: 10 }}
            >
              {h}
            </Box>
          ))}
        </Box>
      </Box>
      <Box component="tbody">
        {rows.length === 0 && (
          <Box component="tr">
            <Box component="td" colSpan={headers.length} sx={{ p: 1, color: T.text3 }}>
              Aucun jour modifié
            </Box>
          </Box>
        )}
        {rows.map((r) => (
          <Box component="tr" key={r[0]} sx={{ borderTop: `1px solid ${T.border}` }}>
            {r.map((cell, i) => {
              const isDelta = deltaCol === i;
              const n = isDelta ? Number(String(cell).replace('+', '')) : NaN;
              return (
                <Box
                  component="td"
                  key={`${r[0]}-${i}`}
                  sx={{
                    p: 0.75,
                    fontWeight: i === 0 || isDelta ? 700 : 500,
                    color: isDelta && Number.isFinite(n) ? deltaColor(n) : T.text,
                  }}
                >
                  {cell}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * TAB ESTIMATES (ancien outil)
 * ═══════════════════════════════════════════════════════════════════ */

function EstimatesTab({
  listingIds,
  nameById,
  portfolioLoading,
}: {
  listingIds: string[];
  nameById: Record<string, string>;
  portfolioLoading: boolean;
}) {
  const [diffData, setDiffData] = useState<PortfolioEstimateDiffDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (portfolioLoading) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchPortfolioEstimateDiff(listingIds);
        if (!cancelled && res.data?.success) setDiffData(res.data);
      } catch (e) {
        console.error('[PricingAudit estimates]', e);
        if (!cancelled) setDiffData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingIds.join(','), portfolioLoading]);

  const rows = useMemo(() => {
    const fromApi = diffData?.byListing ?? [];
    if (fromApi.length) return fromApi;
    return listingIds.map(
      (id): ListingEstimateDiffDto => ({
        listingId: id,
        hasPrevious: false,
        currentComputedAt: null,
        previousComputedAt: null,
        changedDays: [],
        totalChanged: 0,
      }),
    );
  }, [diffData, listingIds]);

  const totalChangedAll = rows.reduce((s, r) => s + r.totalChanged, 0);

  return (
    <Box>
      <Typography sx={{ fontSize: 12, color: T.text3, mb: 2, lineHeight: 1.5 }}>
        Diff du <strong>prix estimé G7</strong> entre le snapshot cache actuel et le précédent (1 hop).
        Ce n’est pas le prix calendrier / canaux — voir onglet Ledger pour les MAJ inventaire.
      </Typography>

      {loading && <Typography sx={{ fontSize: 12, color: T.text3 }}>Chargement…</Typography>}

      {!loading && (
        <Box sx={{ p: 2, mb: 2, borderRadius: 1.5, bgcolor: T.goldTint, border: `1px solid ${T.gold}` }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.text, mb: 0.5 }}>
            {totalChangedAll} jour{totalChangedAll !== 1 ? 's' : ''} avec estimation modifiée
          </Typography>
        </Box>
      )}

      <Box
        component="table"
        sx={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12,
          bgcolor: T.bg1,
          border: `1px solid ${T.border}`,
          borderRadius: 1.5,
        }}
      >
        <Box component="thead" sx={{ bgcolor: T.bg2 }}>
          <Box component="tr">
            {['Bien', 'Jours estim. modifiés', 'Snapshot actuel', 'Snapshot précédent', ''].map((h) => (
              <Box
                component="th"
                key={h}
                sx={{ textAlign: 'left', p: 1.25, fontWeight: 800, color: T.text3, fontSize: 10.5 }}
              >
                {h}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {rows.map((row) => {
            const open = expandedId === row.listingId;
            return (
              <Box component="tr" key={`${row.listingId}-row`} sx={{ borderTop: `1px solid ${T.border}` }}>
                <Box component="td" sx={{ p: 1.25, fontWeight: 700 }}>
                  {nameById[row.listingId] || row.listingId}
                </Box>
                <Box component="td" sx={{ p: 1.25, fontFamily: '"Geist Mono", monospace', fontWeight: 800 }}>
                  {row.totalChanged}
                </Box>
                <Box component="td" sx={{ p: 1.25 }}>{fmt(row.currentComputedAt)}</Box>
                <Box component="td" sx={{ p: 1.25 }}>
                  {row.hasPrevious ? fmt(row.previousComputedAt) : '— (1er snapshot)'}
                </Box>
                <Box component="td" sx={{ p: 1.25 }}>
                  <Button
                    size="small"
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                    onClick={() => setExpandedId(open ? null : row.listingId)}
                  >
                    {open ? 'Masquer' : 'Détail'}
                  </Button>
                </Box>
              </Box>
            );
          })}
          {rows.map((row) => {
            const open = expandedId === row.listingId;
            if (!open) return null;
            return (
              <Box component="tr" key={`${row.listingId}-detail`}>
                <Box component="td" colSpan={5} sx={{ p: 0 }}>
                  <Box sx={{ px: 2, py: 1.5, bgcolor: T.bg2 }}>
                    {(row.changedDays ?? []).slice(0, MAX_DAYS_PREVIEW).map((d) => (
                      <Stack
                        key={d.date}
                        direction="row"
                        sx={{ gap: 2, fontSize: 11, fontFamily: '"Geist Mono", monospace', py: 0.35 }}
                      >
                        <span style={{ width: 90 }}>{d.date}</span>
                        <span>{fmtMad(d.previousMad)}</span>
                        <span>→</span>
                        <span style={{ fontWeight: 800 }}>{fmtMad(d.currentMad)}</span>
                        <span style={{ color: deltaColor(d.deltaMad), fontWeight: 700 }}>
                          {d.deltaMad > 0 ? '+' : ''}
                          {Math.round(d.deltaMad)}
                        </span>
                      </Stack>
                    ))}
                    {(row.changedDays?.length ?? 0) === 0 && (
                      <Typography sx={{ fontSize: 11, color: T.text3 }}>Aucun jour modifié</Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
