import { useEffect, useMemo, useState } from 'react';
import { Box, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../../components/DashboardWrapper';
import { fetchProductsReport, type ProductsReport, type ProductRow } from '../../services/revenueApi';

/**
 * Rotation du catalogue — ce qui se vend, ce qui dort.
 *
 * L'écart entre le catalogue déclaré et les ventes réelles ouvre la page :
 * c'est lui l'information, pas le classement des meilleures ventes.
 */

const T = {
  accent: '#2d4a6b',
  gold: '#b8851a',
  goldSoft: '#E6B022',
  ink: '#191b18',
  ink2: '#4d5049',
  ink3: '#82867d',
  sheet: '#ffffff',
  sheetAlt: '#f4f4f0',
  rule: '#dcdcd4',
  ruleSoft: '#ebebe4',
  warn: '#9a6a24',
};

const NF = new Intl.NumberFormat('fr-FR');
const n = (v: number | null | undefined) => (v == null ? '—' : NF.format(Math.round(v)));

const DEPARTMENT_LABEL: Record<string, string> = {
  fnb: 'Restauration',
  misc: 'Divers',
  other_operated: 'Prestations',
};

export function ProductsPage() {
  const [report, setReport] = useState<ProductsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'sold' | 'dormant'>('sold');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProductsReport()
      .then((d) => {
        if (!cancelled) setReport(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(() => report?.items ?? [], [report]);
  const maxGross = items.length ? items[0].gross : 0;

  if (loading) {
    return (
      <DashboardWrapper breadcrumb={['Rapports', 'Produits']}>
        <Stack sx={{ alignItems: 'center', py: 10 }}>
          <CircularProgress size={26} sx={{ color: T.gold }} />
        </Stack>
      </DashboardWrapper>
    );
  }

  if (!report || !items.length) {
    return (
      <DashboardWrapper breadcrumb={['Rapports', 'Produits']}>
        <Paper variant="outlined" sx={{ p: 4, border: `1px solid ${T.rule}`, borderRadius: 0.5 }}>
          <Typography sx={{ fontSize: 14, color: T.ink2 }}>
            Aucune vente d'extra enregistrée.
          </Typography>
        </Paper>
      </DashboardWrapper>
    );
  }

  const { totals, dormant } = report;

  return (
    <DashboardWrapper breadcrumb={['Rapports', 'Produits']}>
      <Stack
        sx={{
          pb: 1.5,
          mb: 2.5,
          borderBottom: `2px solid ${T.ink}`,
        }}
      >
        <Typography sx={{ fontSize: 24, fontWeight: 700, color: T.ink, lineHeight: 1.15 }}>
          Produits
        </Typography>
        <Typography sx={{ fontSize: 12, color: T.ink3, mt: 0.4 }}>
          Ce qui se vend, ce qui dort — sur l'ensemble de l'historique
        </Typography>
      </Stack>

      {/* L'écart catalogue / ventes : le sujet de la page */}
      <Paper
        variant="outlined"
        sx={{
          border: `1px solid ${T.rule}`,
          borderLeft: `2px solid ${T.warn}`,
          borderRadius: 0.5,
          p: 2.5,
          mb: 3,
        }}
      >
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: T.ink, mb: 1.25 }}>
          Le catalogue ne décrit pas ce qui se vend
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2.5,
          }}
        >
          {[
            {
              v: n(totals.catalogueSize),
              l: 'articles au catalogue',
              s: `dont ${totals.dormantCount} jamais vendus`,
            },
            {
              v: n(totals.soldDistinct),
              l: 'libellés vendus',
              s: `dont ${totals.offCatalogueCount} hors catalogue`,
            },
            {
              v: `${totals.offCataloguePct} %`,
              l: 'du chiffre hors catalogue',
              s: `${n(totals.offCatalogueGross)} MAD`,
            },
          ].map((k) => (
            <Box key={k.l}>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: T.ink, lineHeight: 1 }}>
                {k.v}
              </Typography>
              <Typography sx={{ fontSize: 12, color: T.ink2, mt: 0.4 }}>{k.l}</Typography>
              <Typography sx={{ fontSize: 11, color: T.ink3, mt: 0.15 }}>{k.s}</Typography>
            </Box>
          ))}
        </Box>
        <Typography
          sx={{
            fontSize: 11.5,
            color: T.ink3,
            mt: 2,
            pt: 1.25,
            borderTop: `1px solid ${T.ruleSoft}`,
            lineHeight: 1.6,
            maxWidth: '86ch',
          }}
        >
          Un article « hors catalogue » est un libellé saisi à la vente qui ne correspond à aucune
          fiche produit. Tant que l'écart reste à ce niveau, le catalogue ne peut servir ni au
          réassort ni à la tarification.
        </Typography>
      </Paper>

      {/* Bascule entre les deux listes */}
      <Stack direction="row" sx={{ gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        {[
          { id: 'sold' as const, l: `Vendus (${totals.soldDistinct})` },
          { id: 'dormant' as const, l: `Jamais vendus (${totals.dormantCount})` },
        ].map((v) => (
          <Chip
            key={v.id}
            label={v.l}
            onClick={() => setView(v.id)}
            sx={{
              height: 28,
              fontSize: 12.5,
              fontWeight: view === v.id ? 700 : 500,
              bgcolor: view === v.id ? `${T.goldSoft}22` : T.sheetAlt,
              color: view === v.id ? T.gold : T.ink2,
              border: `1px solid ${view === v.id ? T.goldSoft : T.rule}`,
            }}
          />
        ))}
      </Stack>

      {view === 'sold' ? (
        <Paper
          variant="outlined"
          sx={{ border: `1px solid ${T.rule}`, borderRadius: 0.5, overflowX: 'auto' }}
        >
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <thead>
              <Box component="tr" sx={{ bgcolor: T.sheetAlt }}>
                {['Article', 'Poids', 'Ventes', 'Chiffre', 'Prix moyen', 'Type', 'Dernière vente'].map(
                  (h, i) => (
                    <Box
                      component="th"
                      key={h}
                      sx={{
                        p: '10px 13px',
                        textAlign: i === 0 || i === 1 || i === 5 ? 'left' : 'right',
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '.08em',
                        textTransform: 'uppercase',
                        color: T.ink3,
                        borderBottom: `1px solid ${T.rule}`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </Box>
                  ),
                )}
              </Box>
            </thead>
            <tbody>
              {items.slice(0, 120).map((p: ProductRow) => (
                <Box
                  component="tr"
                  key={p.name}
                  sx={{ '&:hover td': { bgcolor: T.sheetAlt } }}
                >
                  <Box
                    component="td"
                    sx={{
                      p: '9px 13px',
                      borderBottom: `1px solid ${T.ruleSoft}`,
                      fontWeight: 600,
                      color: T.ink,
                      maxWidth: 260,
                    }}
                  >
                    {p.name}
                    {!p.inCatalogue ? (
                      <Box
                        component="span"
                        sx={{
                          ml: 0.75,
                          fontSize: 9.5,
                          fontWeight: 700,
                          letterSpacing: '.05em',
                          px: 0.6,
                          py: '1px',
                          borderRadius: '2px',
                          bgcolor: `${T.warn}1a`,
                          color: T.warn,
                          verticalAlign: 1,
                        }}
                      >
                        HORS CATALOGUE
                      </Box>
                    ) : null}
                  </Box>
                  <Box
                    component="td"
                    sx={{ p: '9px 13px', borderBottom: `1px solid ${T.ruleSoft}`, width: 90 }}
                  >
                    <Box sx={{ height: 5, bgcolor: T.sheetAlt, borderRadius: 3 }}>
                      <Box
                        sx={{
                          width: `${maxGross > 0 ? Math.round((p.gross / maxGross) * 100) : 0}%`,
                          height: '100%',
                          bgcolor: T.gold,
                          borderRadius: 3,
                        }}
                      />
                    </Box>
                  </Box>
                  {[
                    n(p.lines),
                    n(p.gross),
                    n(p.averageLine),
                  ].map((v, i) => (
                    <Box
                      component="td"
                      key={`${p.name}-${String(i)}`}
                      sx={{
                        p: '9px 13px',
                        textAlign: 'right',
                        borderBottom: `1px solid ${T.ruleSoft}`,
                        whiteSpace: 'nowrap',
                        fontWeight: i === 1 ? 700 : 400,
                        color: i === 1 ? T.ink : T.ink2,
                      }}
                    >
                      {v}
                    </Box>
                  ))}
                  <Box
                    component="td"
                    sx={{
                      p: '9px 13px',
                      borderBottom: `1px solid ${T.ruleSoft}`,
                      color: T.ink3,
                      fontSize: 12,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.category ?? DEPARTMENT_LABEL[p.department] ?? p.department}
                  </Box>
                  <Box
                    component="td"
                    sx={{
                      p: '9px 13px',
                      textAlign: 'right',
                      borderBottom: `1px solid ${T.ruleSoft}`,
                      color: T.ink3,
                      fontSize: 12,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.lastAt ?? '—'}
                  </Box>
                </Box>
              ))}
            </tbody>
          </Box>
          {items.length > 120 ? (
            <Typography sx={{ fontSize: 11.5, color: T.ink3, p: '11px 13px' }}>
              120 premiers articles sur {items.length}, classés par chiffre.
            </Typography>
          ) : null}
        </Paper>
      ) : (
        <Paper
          variant="outlined"
          sx={{ border: `1px solid ${T.rule}`, borderRadius: 0.5, overflowX: 'auto' }}
        >
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <thead>
              <Box component="tr" sx={{ bgcolor: T.sheetAlt }}>
                {['Article', 'Prix catalogue', 'Service', 'Statut'].map((h, i) => (
                  <Box
                    component="th"
                    key={h}
                    sx={{
                      p: '10px 13px',
                      textAlign: i === 1 ? 'right' : 'left',
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      color: T.ink3,
                      borderBottom: `1px solid ${T.rule}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </Box>
                ))}
              </Box>
            </thead>
            <tbody>
              {dormant.map((d) => (
                <Box component="tr" key={d.name} sx={{ '&:hover td': { bgcolor: T.sheetAlt } }}>
                  <Box
                    component="td"
                    sx={{
                      p: '9px 13px',
                      borderBottom: `1px solid ${T.ruleSoft}`,
                      fontWeight: 600,
                      color: T.ink,
                    }}
                  >
                    {d.name}
                  </Box>
                  <Box
                    component="td"
                    sx={{
                      p: '9px 13px',
                      textAlign: 'right',
                      borderBottom: `1px solid ${T.ruleSoft}`,
                      color: T.ink2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {d.price ? n(d.price) : '—'}
                  </Box>
                  <Box
                    component="td"
                    sx={{
                      p: '9px 13px',
                      borderBottom: `1px solid ${T.ruleSoft}`,
                      color: T.ink3,
                      fontSize: 12,
                    }}
                  >
                    {d.service ?? (d.isMinibar ? 'Mini-bar' : '—')}
                  </Box>
                  <Box
                    component="td"
                    sx={{
                      p: '9px 13px',
                      borderBottom: `1px solid ${T.ruleSoft}`,
                      color: d.isActive ? T.ink3 : T.warn,
                      fontSize: 12,
                    }}
                  >
                    {d.isActive ? 'Actif' : 'Désactivé'}
                  </Box>
                </Box>
              ))}
            </tbody>
          </Box>
          <Typography sx={{ fontSize: 11.5, color: T.ink3, p: '11px 13px', lineHeight: 1.6 }}>
            Ces articles figurent au catalogue mais n'ont jamais été vendus. Un article actif et
            dormant occupe une ligne de carte sans rien rapporter — à retirer, ou à vendre.
          </Typography>
        </Paper>
      )}
    </DashboardWrapper>
  );
}
