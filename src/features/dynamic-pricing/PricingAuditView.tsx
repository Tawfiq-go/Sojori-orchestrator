import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Box, Stack, Typography, Button, Collapse } from '@mui/material';
import { T } from './_tokens';
import {
  fetchPortfolioEstimateDiff,
  type ListingEstimateDiffDto,
  type PortfolioEstimateDiffDto,
} from '../../services/dynamicPricingApi';
import { usePortfolio } from './hooks/usePortfolio';
import { DashboardWrapper } from '../../components/DashboardWrapper';

const MAX_DAYS_PREVIEW = 40;

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

export function PricingAuditView() {
  const [searchParams] = useSearchParams();
  const portfolio = usePortfolio();
  const [diffData, setDiffData] = useState<PortfolioEstimateDiffDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const diffByListing = useMemo(() => {
    const m = new Map<string, ListingEstimateDiffDto>();
    for (const row of diffData?.byListing ?? []) {
      m.set(row.listingId, row);
    }
    return m;
  }, [diffData]);

  useEffect(() => {
    if (portfolio.loading) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchPortfolioEstimateDiff(listingIds);
        if (!cancelled && res.data?.success) setDiffData(res.data);
      } catch (e) {
        console.error('[PricingAudit]', e);
        if (!cancelled) setDiffData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingIds.join(','), portfolio.loading]);

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
    <DashboardWrapper>
      <Box sx={{ maxWidth: 1100, mx: 'auto', py: 2, px: { xs: 2, md: 3 } }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: T.text }}>
            Audit estimations Dynamic Pricing
          </Typography>
          <Button component={Link} to="/dynamic-pricing/portefeuille" size="small" variant="outlined">
            ← Portefeuille
          </Button>
          <Button component={Link} to="/calendar" size="small" variant="outlined">
            Calendrier
          </Button>
        </Stack>

        <Typography sx={{ fontSize: 12, color: T.text3, mb: 2, lineHeight: 1.5 }}>
          Jours où le <strong>prix estimé G7</strong> (mix engine) a changé entre le snapshot actuel et le
          snapshot précédent (avant la dernière synchro). Ce ne sont pas les prix envoyés au calendrier /
          canaux de diffusion.
        </Typography>

        {loading && <Typography sx={{ fontSize: 12, color: T.text3 }}>Chargement…</Typography>}

        {!loading && (
          <Box
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 1.5,
              bgcolor: T.goldTint,
              border: `1px solid ${T.gold}`,
            }}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.text, mb: 0.5 }}>
              {totalChangedAll} jour{totalChangedAll !== 1 ? 's' : ''} avec estimation modifiée
            </Typography>
            <Typography sx={{ fontSize: 12, color: T.text2 }}>
              {rows.filter((r) => !r.hasPrevious).length > 0
                ? `${rows.filter((r) => !r.hasPrevious).length} bien(s) sans snapshot précédent — relancer une 2e synchro pour voir le diff.`
                : 'Cliquez sur un bien pour le détail date par date.'}
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
            overflow: 'hidden',
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
              const diff = diffByListing.get(row.listingId) ?? row;
              const open = expandedId === row.listingId;
              return (
                <>
                  <Box component="tr" key={row.listingId} sx={{ borderTop: `1px solid ${T.border}` }}>
                    <Box component="td" sx={{ p: 1.25, fontWeight: 700 }}>
                      {nameById[row.listingId] || row.listingId}
                    </Box>
                    <Box component="td" sx={{ p: 1.25, fontWeight: 700, color: T.gold }}>
                      {!diff.hasPrevious ? '—' : diff.totalChanged}
                    </Box>
                    <Box
                      component="td"
                      sx={{ p: 1.25, fontFamily: '"Geist Mono", monospace', fontSize: 11 }}
                    >
                      {fmt(diff.currentComputedAt)}
                    </Box>
                    <Box
                      component="td"
                      sx={{ p: 1.25, fontFamily: '"Geist Mono", monospace', fontSize: 11 }}
                    >
                      {diff.hasPrevious ? fmt(diff.previousComputedAt) : '1re synchro'}
                    </Box>
                    <Box component="td" sx={{ p: 1.25 }}>
                      <Button
                        size="small"
                        disabled={!diff.hasPrevious || diff.totalChanged === 0}
                        onClick={() =>
                          setExpandedId(open ? null : row.listingId)
                        }
                      >
                        {open ? 'Masquer' : 'Détail'}
                      </Button>
                      <Button
                        component={Link}
                        to={`/dynamic-pricing/bien/${row.listingId}`}
                        size="small"
                        sx={{ ml: 0.5 }}
                      >
                        Fiche
                      </Button>
                    </Box>
                  </Box>
                  <Box component="tr" key={`${row.listingId}-detail`}>
                    <Box component="td" colSpan={5} sx={{ p: 0, border: 0 }}>
                      <Collapse in={open}>
                        <DayChangePanel diff={diff} />
                      </Collapse>
                    </Box>
                  </Box>
                </>
              );
            })}
          </Box>
        </Box>
      </Box>
    </DashboardWrapper>
  );
}

function DayChangePanel({ diff }: { diff: ListingEstimateDiffDto }) {
  const days = diff.changedDays;
  const preview = days.slice(0, MAX_DAYS_PREVIEW);
  const rest = days.length - preview.length;

  if (!diff.hasPrevious) {
    return (
      <Box sx={{ p: 2, bgcolor: T.bg2, fontSize: 11, color: T.text3 }}>
        Aucun snapshot précédent enregistré. Lancez une nouvelle synchronisation pour comparer les
        estimations.
      </Box>
    );
  }

  if (days.length === 0) {
    return (
      <Box sx={{ p: 2, bgcolor: T.bg2, fontSize: 11, color: T.text3 }}>
        Aucun changement d&apos;estimation G7 depuis la dernière synchro.
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1.5, bgcolor: T.bg2, maxHeight: 320, overflow: 'auto' }}>
      <Box
        component="table"
        sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}
      >
        <Box component="thead">
          <Box component="tr">
            {['Date', 'Estim. avant', 'Estim. maintenant', 'Δ'].map((h) => (
              <Box
                component="th"
                key={h}
                sx={{ textAlign: 'left', p: 0.75, color: T.text3, fontWeight: 700 }}
              >
                {h}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {preview.map((d) => (
            <Box component="tr" key={d.date} sx={{ borderTop: `1px solid ${T.border}` }}>
              <Box component="td" sx={{ p: 0.75, fontFamily: '"Geist Mono", monospace' }}>
                {d.date}
              </Box>
              <Box component="td" sx={{ p: 0.75 }}>
                {d.previousMad != null ? fmtMad(d.previousMad) : '—'}
              </Box>
              <Box component="td" sx={{ p: 0.75, fontWeight: 700 }}>
                {fmtMad(d.currentMad)}
              </Box>
              <Box
                component="td"
                sx={{
                  p: 0.75,
                  color: d.deltaMad > 0 ? T.success : d.deltaMad < 0 ? T.error : T.text3,
                  fontWeight: 700,
                }}
              >
                {d.deltaMad > 0 ? '+' : ''}
                {d.deltaMad} MAD
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
      {rest > 0 && (
        <Typography sx={{ fontSize: 10.5, color: T.text3, mt: 1 }}>
          … et {rest} autre{rest > 1 ? 's' : ''} jour{rest > 1 ? 's' : ''}
        </Typography>
      )}
    </Box>
  );
}
