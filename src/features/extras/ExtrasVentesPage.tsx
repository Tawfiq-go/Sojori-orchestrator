import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { DashboardWrapper } from '../../components/DashboardWrapper';
import GlobalPaginationCompact from '../../components/GlobalPaginationCompact/GlobalPaginationCompact';
import {
  fetchBillLines,
  fetchRevenueBills,
  fetchRevenueLines,
  fetchRevenueSummary,
  type RevenueBillRow,
  type RevenueBillsPage,
  type RevenueLineRow,
  type RevenueLinesPage,
  type RevenueSummary,
} from '../../services/revenueApi';

/**
 * Ventes d'extras — totaux par type, puis détail ligne par ligne.
 *
 * Le mini-bar n'est qu'un type parmi d'autres : il est ici un filtre, pas
 * une page. Sur 30 jours de production il pèse 12 % des extras ; le reste
 * (restauration, prestations, ajustements) n'apparaissait nulle part.
 *
 * Le suivi de stock a sa propre entrée : c'est un métier différent, et il
 * couvrira d'autres consommables que le mini-bar.
 */

const T = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  bg1: '#ffffff',
  bg2: '#fafaf7',
  bg3: '#f0eee8',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  border: 'rgba(20,17,10,0.08)',
  success: '#0a8f5e',
  info: '#0673b3',
};

/** Couleur par département — reprise des accents du suivi mini-bar. */
const DEPT_COLOR: Record<string, string> = {
  '': T.primary,
  fnb: T.success,
  other_operated: T.info,
  misc: T.text3,
};

/**
 * Vignette chiffrée, reprise du suivi mini-bar : même hauteur, même
 * typographie, même comportement au survol quand elle est cliquable.
 */
const Kpi = ({
  label,
  value,
  accent,
  active,
  onClick,
}: {
  label: string;
  value: number | string;
  accent: string;
  active?: boolean;
  onClick?: () => void;
}) => (
  <Paper
    onClick={onClick}
    sx={{
      px: 1.25,
      py: 0.75,
      minWidth: 96,
      border: `1px solid ${active ? accent : T.border}`,
      borderRadius: 1,
      bgcolor: active ? `${accent}14` : T.bg1,
      cursor: onClick ? 'pointer' : 'default',
      '&:hover': onClick ? { bgcolor: T.bg2, borderColor: accent } : {},
    }}
  >
    <Typography
      sx={{
        fontSize: 9.5,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: T.text3,
      }}
    >
      {label}
    </Typography>
    <Typography sx={{ fontSize: 18, fontWeight: 700, color: accent, lineHeight: 1.15 }}>
      {value}
    </Typography>
  </Paper>
);

/** Pastille de filtre — même forme que celles du suivi mini-bar. */
const Pill = ({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  count: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) => (
  <Button
    size="small"
    onClick={onClick}
    sx={{
      textTransform: 'none',
      fontSize: 12,
      fontWeight: 600,
      px: 1.25,
      py: 0.5,
      minHeight: 28,
      borderRadius: 999,
      border: '1px solid',
      borderColor: active ? color : T.border,
      bgcolor: active ? `${color}18` : T.bg1,
      color: active ? color : T.text2,
    }}
  >
    {label}
    <Box
      component="span"
      sx={{
        ml: 0.75,
        fontSize: 10.5,
        fontWeight: 700,
        bgcolor: active ? `${color}28` : T.bg3,
        color: active ? color : T.text3,
        borderRadius: 999,
        px: 0.75,
        py: 0.25,
      }}
    >
      {count}
    </Box>
  </Button>
);

/** L'hébergement n'est pas un extra : il a ses propres écrans. */
const DEPARTMENTS = [
  { id: '', label: 'Tous' },
  { id: 'fnb', label: 'Restauration' },
  { id: 'other_operated', label: 'Prestations' },
  { id: 'misc', label: 'Divers' },
];

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

/**
 * Périodes de consultation.
 *
 * Les périodes *closes* (hier, semaine dernière, mois dernier) comparent des
 * intervalles terminés : « hier » n'est pas « les 24 dernières heures ».
 * Toutes les bornes hautes sont exclusives, comme l'attend l'API.
 */
type Period = { id: string; label: string; range: () => { from: Date; to: Date } };

const PERIODS: Period[] = [
  {
    id: 'today',
    label: "Aujourd'hui",
    range: () => {
      const from = startOfDay(new Date());
      return { from, to: new Date(from.getTime() + 24 * 3600e3) };
    },
  },
  {
    id: 'yesterday',
    label: 'Hier',
    range: () => {
      const to = startOfDay(new Date());
      return { from: new Date(to.getTime() - 24 * 3600e3), to };
    },
  },
  {
    id: 'last7',
    label: '7 derniers jours',
    range: () => {
      const to = new Date(startOfDay(new Date()).getTime() + 24 * 3600e3);
      return { from: new Date(to.getTime() - 8 * 24 * 3600e3), to };
    },
  },
  {
    id: 'lastWeek',
    label: 'Semaine dernière',
    range: () => {
      // Semaine ISO close : du lundi au dimanche précédents.
      const today = startOfDay(new Date());
      const dow = (today.getUTCDay() + 6) % 7;
      const thisMonday = new Date(today.getTime() - dow * 24 * 3600e3);
      return { from: new Date(thisMonday.getTime() - 7 * 24 * 3600e3), to: thisMonday };
    },
  },
  {
    id: 'thisMonth',
    label: 'Ce mois-ci',
    range: () => {
      const now = new Date();
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
        to: new Date(startOfDay(now).getTime() + 24 * 3600e3),
      };
    },
  },
  {
    id: 'lastMonth',
    label: 'Mois dernier',
    range: () => {
      const now = new Date();
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
        to: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      };
    },
  },
  {
    id: 'thisYear',
    label: 'Cette année',
    range: () => {
      const now = new Date();
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
        to: new Date(startOfDay(now).getTime() + 24 * 3600e3),
      };
    },
  },
  {
    id: 'lastYear',
    label: 'Année dernière',
    range: () => {
      const y = new Date().getUTCFullYear();
      return { from: new Date(Date.UTC(y - 1, 0, 1)), to: new Date(Date.UTC(y, 0, 1)) };
    },
  },
];

function money(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} MAD`;
}

function shortDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function ExtrasVentesPage() {
  const [periodId, setPeriodId] = useState('last7');
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');
  /** Vue facture par défaut : une note porte en moyenne 5,8 articles. */
  const [view, setView] = useState<'bills' | 'lines'>('bills');
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(100);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [bills, setBills] = useState<RevenueBillsPage | null>(null);
  const [lines, setLines] = useState<RevenueLinesPage | null>(null);
  const [loading, setLoading] = useState(true);

  /** Note ouverte dans le panneau latéral, avec ses articles. */
  const [openBill, setOpenBill] = useState<RevenueBillRow | null>(null);
  const [billLines, setBillLines] = useState<RevenueLineRow[]>([]);
  const [billLoading, setBillLoading] = useState(false);

  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[2];

  // Un changement de filtre remet en première page : rester en page 5 d'un
  // résultat qui n'en a plus que 2 afficherait un tableau vide.
  useEffect(() => {
    setPage(0);
  }, [periodId, department, search, view]);
  const range = useMemo(() => {
    const { from, to } = period.range();
    return { from: ymd(from), to: ymd(to) };
  }, [periodId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const common = { ...range, department, search };

    Promise.all([
      fetchRevenueSummary(range),
      view === 'bills'
        ? fetchRevenueBills({ ...common, page, limit: perPage })
        : Promise.resolve(null),
      view === 'lines'
        ? fetchRevenueLines({ ...common, page, limit: perPage })
        : Promise.resolve(null),
    ])
      .then(([s, b, l]) => {
        if (cancelled) return;
        setSummary(s);
        setBills(b);
        setLines(l);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, department, search, view, page, perPage]);

  /** Charge les articles à l'ouverture d'une note. */
  useEffect(() => {
    if (!openBill?.billRef) {
      setBillLines([]);
      return;
    }
    let cancelled = false;
    setBillLoading(true);
    fetchBillLines({ ...range, billRef: openBill.billRef })
      .then((rows) => {
        if (!cancelled) setBillLines(rows);
      })
      .finally(() => {
        if (!cancelled) setBillLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [openBill, range]);

  /** Montant par type — affiché sur chaque pastille pour situer les parts. */
  const totalsByDepartment = useMemo(() => {
    const by = summary?.byDepartment ?? {};
    const out: Record<string, number> = { '': 0 };
    for (const d of DEPARTMENTS.slice(1)) {
      const gross = Number(by[d.id]?.gross) || 0;
      out[d.id] = gross;
      out[''] += gross;
    }
    return out;
  }, [summary]);

  const active = view === 'bills' ? bills : lines;
  const totalGross = active?.totalGross ?? 0;
  const totalNet = active?.totalNet ?? 0;
  const count = active?.total ?? 0;

  return (
    <DashboardWrapper breadcrumb={['Extra', 'Ventes']}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1 }} />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={periodId}
          onChange={(_e, v: string | null) => v && setPeriodId(v)}
          sx={{ flexWrap: 'wrap' }}
        >
          {PERIODS.map((p) => (
            <ToggleButton key={p.id} value={p.id} sx={{ px: 1.5, fontSize: 12 }}>
              {p.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>

      <Stack direction="row" sx={{ gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Kpi label="Total TTC" value={money(totalGross)} accent={T.primary} />
        <Kpi label="Total HT" value={money(totalNet)} accent={T.text2} />
        <Kpi
          label={view === 'bills' ? 'Factures' : 'Articles'}
          value={count}
          accent={T.info}
        />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_e, v: 'bills' | 'lines' | null) => v && setView(v)}
          sx={{ ml: 'auto' }}
        >
          <ToggleButton value="bills" sx={{ px: 1.5, fontSize: 12 }}>
            Factures
          </ToggleButton>
          <ToggleButton value="lines" sx={{ px: 1.5, fontSize: 12 }}>
            Articles
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Stack direction="row" sx={{ gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {DEPARTMENTS.map((d) => (
          <Pill
            key={d.id || 'all'}
            label={d.label}
            count={money(totalsByDepartment[d.id] ?? 0)}
            active={department === d.id}
            color={DEPT_COLOR[d.id] ?? T.primary}
            onClick={() => setDepartment(d.id)}
          />
        ))}
        <TextField
          size="small"
          placeholder="Rechercher un produit…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ ml: 'auto', minWidth: 220 }}
        />
      </Stack>

      <Paper sx={{ border: `1px solid ${T.border}`, borderRadius: 1.75, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2">Chargement…</Typography>
          </Box>
        ) : view === 'bills' ? (
          <BillsTable rows={bills?.data ?? []} onOpen={setOpenBill} />
        ) : (
          <LinesTable rows={lines?.data ?? []} />
        )}
      </Paper>

      <Box sx={{ mt: 1.5 }}>
        <GlobalPaginationCompact
          currentPage={page + 1}
          totalItems={count}
          itemsPerPage={perPage}
          onPageChange={(p: number) => setPage(Math.max(0, p - 1))}
          onItemsPerPageChange={(n: number) => {
            setPerPage(n);
            setPage(0);
          }}
          loading={loading}
          itemType={view === 'bills' ? 'factures' : 'articles'}
        />
      </Box>

      <Drawer anchor="right" open={!!openBill} onClose={() => setOpenBill(null)}>
        {openBill ? (
          <Box sx={{ width: { xs: 340, sm: 460 }, p: 2.5 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: T.text }}>
              Facture · {openBill.items} article{openBill.items > 1 ? 's' : ''}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.25 }}>
              {shortDate(openBill.lastAt)} ·{' '}
              {openBill.isClosed ? 'Clôturée' : 'Ouverte'}
              {openBill.reservationId ? ' · rattachée à un séjour' : ' · sans séjour'}
            </Typography>

            <Stack direction="row" sx={{ gap: 1, my: 2 }}>
              <Kpi label="TTC" value={money(openBill.gross)} accent={T.primary} />
              <Kpi label="HT" value={money(openBill.net)} accent={T.text2} />
              <Kpi label="TVA" value={money(openBill.tax)} accent={T.text3} />
            </Stack>

            <Divider sx={{ mb: 1.5 }} />

            {billLoading ? (
              <Typography variant="body2">Chargement des articles…</Typography>
            ) : billLines.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucun article sur cette période.
              </Typography>
            ) : (
              billLines.map((l) => (
                <Stack
                  key={l.id}
                  direction="row"
                  sx={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 0.6,
                    gap: 1,
                    borderBottom: `1px solid ${T.border}`,
                    '&:last-of-type': { borderBottom: 0 },
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: 12.5, color: T.text }}>
                      {l.name}
                      {l.source === 'minibar' ? (
                        <Chip
                          size="small"
                          label="Sojori"
                          sx={{
                            ml: 0.75,
                            height: 16,
                            fontSize: 9,
                            fontWeight: 700,
                            bgcolor: `${T.primary}20`,
                            color: T.primaryDeep,
                            '& .MuiChip-label': { px: 0.75 },
                          }}
                        />
                      ) : null}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: T.text3 }}>
                      {shortDate(l.consumedAt)} · {l.departmentLabel}
                      {l.categoryName ? ` · ${l.categoryName}` : ''}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {money(l.gross)}
                  </Typography>
                </Stack>
              ))
            )}
          </Box>
        ) : null}
      </Drawer>
    </DashboardWrapper>
  );
}

const DEPT_LABEL: Record<string, string> = {
  fnb: 'Restauration',
  other_operated: 'Prestations',
  misc: 'Divers',
};

/** Vue par note — le regroupement que voit le client. */
function BillsTable({
  rows,
  onOpen,
}: {
  rows: RevenueBillRow[];
  onOpen: (b: RevenueBillRow) => void;
}) {
  if (!rows.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Aucune vente sur cette période.
        </Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: T.bg2 }}>
            <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>Facture</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>État</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11.5 }}>
              Articles
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11.5 }}>
              HT
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11.5 }}>
              TVA
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11.5 }}>
              TTC
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((b) => (
            <TableRow
              key={b.billRef ?? 'none'}
              hover
              onClick={() => onOpen(b)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell sx={{ fontSize: 12, color: T.text3, whiteSpace: 'nowrap' }}>
                {shortDate(b.lastAt)}
              </TableCell>
              <TableCell sx={{ fontSize: 12, color: T.text2, fontFamily: 'monospace' }}>
                {b.billCode ?? (b.billRef ? b.billRef.slice(0, 8) : '—')}
                {b.billNumber ? (
                  <Typography component="span" sx={{ ml: 0.75, fontSize: 10.5, color: T.text3 }}>
                    n° {b.billNumber}
                  </Typography>
                ) : null}
                {b.sources.includes('minibar') ? (
                  <Chip
                    size="small"
                    label="Sojori"
                    sx={{
                      ml: 0.75,
                      height: 16,
                      fontSize: 9,
                      fontWeight: 700,
                      bgcolor: `${T.primary}20`,
                      color: T.primaryDeep,
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                ) : null}
              </TableCell>
              <TableCell>
                <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
                  {b.departments.map((d) => (
                    <Chip
                      key={d}
                      size="small"
                      label={DEPT_LABEL[d] ?? d}
                      sx={{
                        height: 20,
                        fontSize: 10.5,
                        fontWeight: 600,
                        bgcolor: `${DEPT_COLOR[d] ?? T.text3}18`,
                        color: DEPT_COLOR[d] ?? T.text3,
                      }}
                    />
                  ))}
                </Stack>
              </TableCell>
              <TableCell>
                <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center' }}>
                  <Chip
                    size="small"
                    label={b.isClosed ? 'Clôturée' : 'Ouverte'}
                    sx={{
                      height: 20,
                      fontSize: 10.5,
                      fontWeight: 600,
                      bgcolor: b.isClosed ? T.bg3 : `${T.success}18`,
                      color: b.isClosed ? T.text3 : T.success,
                    }}
                  />
                  {/*
                    Le type dit l'état de paiement à la clôture : « Reçu »
                    = soldé, « Facture » = reste dû. Seul le second mérite
                    d'attirer l'œil.
                  */}
                  {b.billType === 'invoice' ? (
                    <Chip
                      size="small"
                      label="Facture · reste dû"
                      sx={{
                        height: 20,
                        fontSize: 10.5,
                        fontWeight: 700,
                        bgcolor: 'rgba(200,30,30,0.12)',
                        color: '#c81e1e',
                      }}
                    />
                  ) : null}
                </Stack>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: 12.5, fontWeight: 600 }}>
                {b.items}
              </TableCell>
              <TableCell align="right" sx={{ fontSize: 12, color: T.text3 }}>
                {money(b.net)}
              </TableCell>
              <TableCell align="right" sx={{ fontSize: 12, color: T.text3 }}>
                {money(b.tax)}
              </TableCell>
              <TableCell align="right" sx={{ fontSize: 12.5, fontWeight: 700 }}>
                {money(b.gross)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

/** Vue à plat — utile pour chercher un produit précis. */
function LinesTable({ rows }: { rows: RevenueLineRow[] }) {
  if (!rows.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Aucune vente sur cette période.
        </Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: T.bg2 }}>
            <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>Produit</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: 11.5 }}>Catégorie</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11.5 }}>
              TTC
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11.5 }}>
              HT
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} hover>
              <TableCell sx={{ fontSize: 12, color: T.text3, whiteSpace: 'nowrap' }}>
                {shortDate(r.consumedAt)}
              </TableCell>
              <TableCell sx={{ fontSize: 12.5, color: T.text }}>
                {r.name}
                {r.source === 'minibar' ? (
                  <Chip
                    size="small"
                    label="Sojori"
                    sx={{
                      ml: 0.75,
                      height: 16,
                      fontSize: 9,
                      fontWeight: 700,
                      bgcolor: `${T.primary}20`,
                      color: T.primaryDeep,
                      '& .MuiChip-label': { px: 0.75 },
                    }}
                  />
                ) : null}
              </TableCell>
              <TableCell sx={{ fontSize: 12, color: T.text2 }}>{r.departmentLabel}</TableCell>
              <TableCell sx={{ fontSize: 12, color: T.text3 }}>{r.categoryName || '—'}</TableCell>
              <TableCell align="right" sx={{ fontSize: 12.5, fontWeight: 600 }}>
                {money(r.gross)}
              </TableCell>
              <TableCell align="right" sx={{ fontSize: 12, color: T.text3 }}>
                {money(r.net)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
