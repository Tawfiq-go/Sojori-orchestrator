import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../../components/DashboardWrapper';
import { fetchOperationsReport, type OperationsReport } from '../../services/revenueApi';
import { useFinancesOwnerScope } from '../finances/useFinancesOwnerScope';

/**
 * Rapport d'exploitation — les chiffres de gestion, sans interprétation.
 *
 * Six blocs numérotés, quatre périodes comparées. Le parti pris est celui du
 * registre comptable : on affiche et on explique comment le chiffre est
 * calculé, on ne commente pas ce qu'il signifie.
 */

const T = {
  accent: '#2d4a6b',
  ink: '#191b18',
  ink2: '#4d5049',
  ink3: '#82867d',
  sheet: '#ffffff',
  sheetAlt: '#f4f4f0',
  rule: '#dcdcd4',
  ruleSoft: '#ebebe4',
};

const NF = new Intl.NumberFormat('fr-FR');
const n = (v: number | null | undefined) => (v == null ? '—' : NF.format(Math.round(v)));
const pct = (v: number | null | undefined) => (v == null ? '—' : `${v} %`);

const MONTH_LABEL = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

function periodLabel(p: { key: string; from: string }): string {
  if (p.key === 'currentMonth' || p.key === 'previousMonth') {
    const d = new Date(`${p.from}T00:00:00Z`);
    const s = MONTH_LABEL.format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  if (p.key === 'threeMonths') return '3 mois';
  return 'Année à date';
}

/* ── Fragments de présentation ─────────────────────────────── */

function Section({
  num,
  title,
  unit,
  children,
  note,
}: {
  num: number;
  title: string;
  unit: string;
  children: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 5 }}>
      <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1.5, mb: 1.5 }}>
        <Typography sx={{ fontSize: 13, color: T.ink3, minWidth: 18 }}>{num}</Typography>
        <Typography sx={{ fontSize: 19, fontWeight: 600, color: T.ink }}>{title}</Typography>
        <Typography
          sx={{
            fontSize: 11,
            color: T.ink3,
            letterSpacing: '.06em',
            textTransform: 'uppercase',
            ml: 'auto',
          }}
        >
          {unit}
        </Typography>
      </Stack>
      <Paper
        variant="outlined"
        sx={{ border: `1px solid ${T.rule}`, borderRadius: 0.5, overflowX: 'auto' }}
      >
        {children}
      </Paper>
      {note ? (
        <Typography
          sx={{ mt: 1.25, fontSize: 11.5, color: T.ink3, lineHeight: 1.6, maxWidth: '82ch' }}
        >
          {note}
        </Typography>
      ) : null}
    </Box>
  );
}

const thSx = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '.09em',
  textTransform: 'uppercase' as const,
  color: T.ink3,
  textAlign: 'right' as const,
  p: '11px 14px 9px',
  borderBottom: `1px solid ${T.rule}`,
  whiteSpace: 'nowrap' as const,
  bgcolor: T.sheetAlt,
};
const tdSx = {
  p: '9px 14px',
  textAlign: 'right' as const,
  borderBottom: `1px solid ${T.ruleSoft}`,
  whiteSpace: 'nowrap' as const,
  fontVariantNumeric: 'tabular-nums',
};

/** Une ligne de tableau : libellé à gauche, valeurs à droite. */
function Row({
  label,
  values,
  strong,
  indent,
}: {
  label: string;
  values: React.ReactNode[];
  strong?: boolean;
  indent?: boolean;
}) {
  const cell = {
    ...tdSx,
    ...(strong ? { fontWeight: 700, bgcolor: T.sheetAlt, borderTop: `1px solid ${T.rule}` } : {}),
  };
  return (
    <Box component="tr">
      <Box
        component="td"
        sx={{
          ...cell,
          textAlign: 'left',
          color: indent ? T.ink3 : T.ink2,
          pl: indent ? '30px' : undefined,
          fontSize: indent ? 12.5 : undefined,
        }}
      >
        {label}
      </Box>
      {values.map((v, i) => (
        <Box
          component="td"
          key={`${label}-${String(i)}`}
          sx={{ ...cell, fontWeight: i === 0 ? 700 : cell.fontWeight }}
        >
          {v}
        </Box>
      ))}
    </Box>
  );
}

export function OperationsReportPage() {
  const { ownerId, needsOwnerPick } = useFinancesOwnerScope();
  const [report, setReport] = useState<OperationsReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) {
      setReport(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchOperationsReport({ ownerId })
      .then((d) => {
        if (!cancelled) setReport(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  const cols = useMemo(() => report?.periods ?? [], [report]);

  /* Le graphe journalier : barres empilées disponible / vendu / hors réservé. */
  const chart = useMemo(() => {
    const days = report?.daily ?? [];
    if (!days.length) return null;
    const W = 940;
    const H = 220;
    const pl = 28;
    const pr = 8;
    const pt = 10;
    const pb = 26;
    const max = Math.max(...days.map((d) => d.availableUnits + d.blockedUnits), 1);
    const slot = (W - pl - pr) / days.length;
    const bw = Math.min(18, slot * 0.66);
    const y = (v: number) => pt + (H - pt - pb) - (v / max) * (H - pt - pb);
    return { days, W, H, pl, pr, pt, pb, max, slot, bw, y };
  }, [report]);

  if (needsOwnerPick) {
    return (
      <DashboardWrapper breadcrumb={['Rapports', 'Exploitation']}>
        <Alert severity="info">Choisissez un gestionnaire dans le filtre en haut de page.</Alert>
      </DashboardWrapper>
    );
  }

  if (loading) {
    return (
      <DashboardWrapper breadcrumb={['Rapports', 'Exploitation']}>
        <Stack sx={{ alignItems: 'center', py: 10 }}>
          <CircularProgress size={26} sx={{ color: T.accent }} />
        </Stack>
      </DashboardWrapper>
    );
  }

  if (!report || !cols.length) {
    return (
      <DashboardWrapper breadcrumb={['Rapports', 'Exploitation']}>
        <Paper variant="outlined" sx={{ p: 4, border: `1px solid ${T.rule}`, borderRadius: 0.5 }}>
          <Typography sx={{ fontSize: 14, color: T.ink2 }}>
            Aucune donnée d'exploitation pour la période. Les photographies quotidiennes du parc
            alimentent ce rapport ; elles sont écrites chaque nuit à 3 h.
          </Typography>
        </Paper>
      </DashboardWrapper>
    );
  }

  const cur = cols[0];
  const headers = cols.map(periodLabel);
  const val = (pick: (p: OperationsReport['periods'][number]) => React.ReactNode) =>
    cols.map(pick);

  return (
    <DashboardWrapper breadcrumb={['Rapports', 'Exploitation']}>
      <Stack
        direction="row"
        sx={{
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          pb: 2,
          mb: 3,
          borderBottom: `2px solid ${T.ink}`,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 26, fontWeight: 600, color: T.ink, lineHeight: 1.15 }}>
            Rapport d'exploitation
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.ink3, mt: 0.5 }}>
            Occupation, revenu et encaissements
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 11.5, color: T.ink3, textAlign: 'right', lineHeight: 1.75 }}>
          Arrêté au <b>{report.asOf}</b>
          <br />
          Montants en <b>MAD</b>, hors taxes de séjour
        </Typography>
      </Stack>

      {/* 1 · OCCUPATION */}
      <Section
        num={1}
        title="Occupation"
        unit="Nuitées"
        note={
          <>
            <code>disponible = parc théorique − retiré de la vente</code> ·{' '}
            <code>occupation = vendu ÷ disponible</code>. Les mois n'ayant pas le même nombre de
            jours, comparer les taux et non les volumes.
          </>
        }
      >
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <Box component="tr">
              <Box component="th" sx={{ ...thSx, textAlign: 'left' }}>
                Indicateur
              </Box>
              {headers.map((h, i) => (
                <Box component="th" key={h} sx={{ ...thSx, color: i === 0 ? T.accent : T.ink3 }}>
                  {h}
                </Box>
              ))}
            </Box>
          </thead>
          <tbody>
            <Row label="Parc théorique" values={val((p) => n(p.parcUnits))} />
            <Row label="Retiré de la vente" values={val((p) => n(p.blockedUnits))} />
            <Row label="Disponible à la vente" values={val((p) => n(p.availableUnits))} strong />
            <Row label="Vendu" values={val((p) => n(p.soldUnits))} />
            <Row label="Taux d'occupation" values={val((p) => pct(p.occupancyPct))} strong />
          </tbody>
        </Box>
      </Section>

      {/* 2 · RÉSERVÉ / HORS RÉSERVÉ */}
      <Section
        num={2}
        title="Réservé et hors réservé"
        unit="Nuitées"
        note={
          <>
            Une nuitée hors réservé est retirée du parc disponible : elle ne pèse ni au numérateur
            ni au dénominateur du taux. <b>Occupation non marchande</b> : villa occupée sans
            contrepartie financière. <b>Motif non saisi</b> : blocage sans libellé exploitable,
            reporté tel quel.
          </>
        }
      >
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <Box component="tr">
              <Box component="th" sx={{ ...thSx, textAlign: 'left' }}>
                Affectation de la nuitée
              </Box>
              {headers.map((h, i) => (
                <Box component="th" key={h} sx={{ ...thSx, color: i === 0 ? T.accent : T.ink3 }}>
                  {h}
                </Box>
              ))}
            </Box>
          </thead>
          <tbody>
            <Row label="Vendu" values={val((p) => n(p.soldUnits))} />
            <Row label="Invendu" values={val((p) => n(p.unsoldUnits))} indent />
            <Row
              label="Sous-total disponible"
              values={val((p) => n(p.availableUnits))}
              strong
            />
            <Row label="Hors réservé" values={val((p) => n(p.blockedUnits))} />
            <Row
              label="Occupation non marchande"
              values={val((p) => n(p.houseGuestUnits))}
              indent
            />
            <Row label="Hors service" values={val((p) => n(p.outOfServiceUnits))} indent />
            <Row label="Motif non saisi" values={val((p) => n(p.unclassifiedUnits))} indent />
            <Row label="Parc théorique" values={val((p) => n(p.parcUnits))} strong />
          </tbody>
        </Box>
      </Section>

      {/* 3 · REVENU */}
      <Section
        num={3}
        title="Revenu"
        unit="MAD, hors taxes de séjour"
        note={
          <>
            <code>prix moyen = hébergement ÷ vendu</code> ·{' '}
            <code>RevPAR = hébergement ÷ disponible</code> ·{' '}
            <code>TRevPAR = revenu total ÷ disponible</code>. Le TRevPAR intègre restauration et
            divers : il mesure le rendement complet d'une villa mise en vente. Taxes de séjour
            exclues, collectées pour le compte de l'État.
          </>
        }
      >
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <Box component="tr">
              <Box component="th" sx={{ ...thSx, textAlign: 'left' }}>
                Poste
              </Box>
              {headers.map((h, i) => (
                <Box component="th" key={h} sx={{ ...thSx, color: i === 0 ? T.accent : T.ink3 }}>
                  {h}
                </Box>
              ))}
            </Box>
          </thead>
          <tbody>
            <Row label="Hébergement" values={val((p) => n(p.revenue.rooms))} />
            <Row label="Restauration" values={val((p) => n(p.revenue.fnb))} />
            <Row label="Divers" values={val((p) => n(p.revenue.misc))} />
            <Row label="Revenu total" values={val((p) => n(p.revenue.total))} strong />
            <Row label="Prix moyen par nuitée vendue" values={val((p) => n(p.adr))} />
            <Row label="RevPAR" values={val((p) => n(p.revpar))} />
            <Row label="TRevPAR" values={val((p) => n(p.trevpar))} strong />
          </tbody>
        </Box>
      </Section>

      {/* 4 · JOURNALIER */}
      <Section
        num={4}
        title={`Détail journalier · ${periodLabel(cur).toLowerCase()}`}
        unit="Villas et MAD"
        note="Les journées où le vendu atteint le disponible correspondent à un parc entièrement écoulé ; le taux est plafonné à 100 %."
      >
        <Box sx={{ p: 2 }}>
          {chart ? (
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                component="svg"
                viewBox={`0 0 ${chart.W} ${chart.H}`}
                role="img"
                aria-label="Villas vendues et retirées de la vente, jour par jour"
                sx={{ display: 'block', width: '100%', minWidth: 640, height: 'auto' }}
              >
                <defs>
                  <pattern
                    id="opHatch"
                    width="5"
                    height="5"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <line x1="0" y1="0" x2="0" y2="5" stroke={T.ink3} strokeWidth="1.4" opacity=".5" />
                  </pattern>
                </defs>
                {[0, Math.round(chart.max / 2), chart.max].map((v) => (
                  <g key={v}>
                    <line
                      x1={chart.pl}
                      x2={chart.W - chart.pr}
                      y1={chart.y(v)}
                      y2={chart.y(v)}
                      stroke={T.ruleSoft}
                      strokeWidth="1"
                    />
                    <text
                      x={chart.pl - 7}
                      y={chart.y(v) + 4}
                      textAnchor="end"
                      fill={T.ink3}
                      fontSize="10"
                    >
                      {v}
                    </text>
                  </g>
                ))}
                {chart.days.map((d, i) => {
                  const cx = chart.pl + chart.slot * i + chart.slot / 2;
                  const sold = Math.min(d.soldUnits, d.availableUnits);
                  return (
                    <g key={d.day}>
                      {d.blockedUnits > 0 ? (
                        <rect
                          x={cx - chart.bw / 2}
                          y={chart.y(d.availableUnits + d.blockedUnits)}
                          width={chart.bw}
                          height={chart.y(0) - chart.y(d.blockedUnits)}
                          fill="url(#opHatch)"
                          stroke={T.rule}
                          strokeWidth=".8"
                        />
                      ) : null}
                      <rect
                        x={cx - chart.bw / 2}
                        y={chart.y(d.availableUnits)}
                        width={chart.bw}
                        height={chart.y(0) - chart.y(d.availableUnits)}
                        fill={T.sheetAlt}
                        stroke={T.rule}
                        strokeWidth="1"
                      />
                      <rect
                        x={cx - chart.bw / 2}
                        y={chart.y(sold)}
                        width={chart.bw}
                        height={chart.y(0) - chart.y(sold)}
                        fill={T.accent}
                      />
                      <title>
                        {`${d.day} · ${d.soldUnits} vendues / ${d.availableUnits} disponibles · ${NF.format(d.roomRevenue)} MAD`}
                      </title>
                      {i % 4 === 0 || i === chart.days.length - 1 ? (
                        <text
                          x={cx}
                          y={chart.H - 8}
                          textAnchor="middle"
                          fill={T.ink3}
                          fontSize="10"
                        >
                          {d.day.slice(8)}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </Box>
            </Box>
          ) : null}
          <Stack
            direction="row"
            sx={{
              gap: 2.5,
              flexWrap: 'wrap',
              mt: 1.5,
              pt: 1.5,
              borderTop: `1px solid ${T.ruleSoft}`,
              fontSize: 11.5,
              color: T.ink2,
            }}
          >
            <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 13, height: 8, bgcolor: T.accent, borderRadius: '1px' }} />
              Vendu
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 13,
                  height: 8,
                  bgcolor: T.sheetAlt,
                  border: `1px solid ${T.rule}`,
                  borderRadius: '1px',
                }}
              />
              Disponible non vendu
            </Stack>
            <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 13,
                  height: 8,
                  borderRadius: '1px',
                  backgroundImage: `repeating-linear-gradient(45deg, ${T.ink3}, ${T.ink3} 2px, transparent 2px, transparent 4px)`,
                }}
              />
              Hors réservé
            </Stack>
          </Stack>
        </Box>
      </Section>

      {/* 5 · EXTRAS */}
      {report.extras.length ? (
        <Section
          num={5}
          title="Extras par catégorie"
          unit="MAD et articles"
          note="Consommations hors hébergement, rattachées au séjour. Un article correspond à une ligne de facture, la quantité pouvant figurer dans le libellé saisi par la réception."
        >
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <Box component="tr">
                <Box component="th" sx={{ ...thSx, textAlign: 'left' }}>
                  Catégorie
                </Box>
                <Box component="th" sx={{ ...thSx, color: T.accent }}>
                  {periodLabel(cur)}
                </Box>
                <Box component="th" sx={{ ...thSx, color: T.accent }}>
                  Articles
                </Box>
                <Box component="th" sx={thSx}>
                  Année à date
                </Box>
                <Box component="th" sx={thSx}>
                  Articles
                </Box>
              </Box>
            </thead>
            <tbody>
              {report.extras.map((e) => (
                <Row
                  key={e.category}
                  label={e.category}
                  values={[
                    e.monthGross ? n(e.monthGross) : '—',
                    e.monthItems || '—',
                    n(e.yearGross),
                    e.yearItems,
                  ]}
                />
              ))}
              <Row
                label="Total extras"
                values={[
                  n(report.extras.reduce((s, e) => s + e.monthGross, 0)),
                  report.extras.reduce((s, e) => s + e.monthItems, 0),
                  n(report.extras.reduce((s, e) => s + e.yearGross, 0)),
                  report.extras.reduce((s, e) => s + e.yearItems, 0),
                ]}
                strong
              />
            </tbody>
          </Box>
        </Section>
      ) : null}

      {/* 6 · ENCAISSEMENTS */}
      <Section
        num={6}
        title="Encaissements"
        unit="MAD · année à date"
        note={
          <>
            Écart entre le dû et l'encaissé, soit <b>{report.settlement.gapPct} %</b> du total. Il
            recouvre les séjours en cours non soldés et les régularisations postérieures à
            l'arrêté.
          </>
        }
      >
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <Box component="tr">
              <Box component="th" sx={{ ...thSx, textAlign: 'left' }}>
                Poste
              </Box>
              <Box component="th" sx={{ ...thSx, color: T.accent }}>
                Montant
              </Box>
              <Box component="th" sx={thSx}>
                Lignes
              </Box>
            </Box>
          </thead>
          <tbody>
            <Row
              label="Revenu facturé"
              values={[n(report.settlement.billedGross), n(report.settlement.billedLines)]}
            />
            <Row
              label="Taxes de séjour collectées"
              values={[n(report.settlement.taxes), n(report.settlement.taxLines)]}
            />
            <Row
              label="Total dû"
              values={[
                n(report.settlement.due),
                n(report.settlement.billedLines + report.settlement.taxLines),
              ]}
              strong
            />
            <Row label="Encaissé" values={[n(report.settlement.collected), '—']} />
            <Row label="Écart" values={[n(report.settlement.gap), '—']} strong />
          </tbody>
        </Box>
      </Section>
    </DashboardWrapper>
  );
}
