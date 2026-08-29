import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Chip,
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
import {
  fetchRevenueLines,
  fetchRevenueSummary,
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
  primaryDeep: '#876119',
  primaryTint: 'rgba(184,133,26,0.12)',
  bg2: '#fafaf7',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  border: 'rgba(20,17,10,0.08)',
};

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
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [lines, setLines] = useState<RevenueLinesPage | null>(null);
  const [loading, setLoading] = useState(true);

  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[2];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const { from, to } = period.range();
    const range = { from: ymd(from), to: ymd(to) };

    Promise.all([
      fetchRevenueSummary(range),
      fetchRevenueLines({ ...range, department, search, limit: 200 }),
    ])
      .then(([s, l]) => {
        if (cancelled) return;
        setSummary(s);
        setLines(l);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [periodId, department, search]);

  /** Montant par type — affiché sur chaque filtre pour situer les parts. */
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

  const headline = department
    ? `${DEPARTMENTS.find((d) => d.id === department)?.label.toUpperCase()} · ${period.label.toUpperCase()}`
    : `TOTAL EXTRAS · ${period.label.toUpperCase()}`;

  return (
    <DashboardWrapper breadcrumb={['Extra', 'Ventes']}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, flex: 1 }}>
          Tout ce qui est vendu en dehors de l’hébergement. Le mini-bar y figure comme les
          autres — son suivi de stock est dans l’onglet Stock.
        </Typography>
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

      <Paper
        sx={{ p: 2.5, mb: 2, border: `1px solid ${T.border}`, borderRadius: 1.75, bgcolor: T.bg2 }}
      >
        <Typography sx={{ fontSize: 11, fontWeight: 800, color: T.text3, letterSpacing: '0.06em' }}>
          {headline}
        </Typography>
        <Typography sx={{ fontSize: 28, fontWeight: 800, color: T.primaryDeep, mt: 0.5 }}>
          {money(lines?.totalGross ?? 0)}
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.5 }}>
          {lines?.total ?? 0} ligne{(lines?.total ?? 0) > 1 ? 's' : ''} · HT{' '}
          {money(lines?.totalNet ?? 0)}
        </Typography>
      </Paper>

      <Stack direction="row" sx={{ gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        {DEPARTMENTS.map((d) => (
          <Chip
            key={d.id || 'all'}
            label={`${d.label} · ${money(totalsByDepartment[d.id] ?? 0)}`}
            onClick={() => setDepartment(d.id)}
            variant={department === d.id ? 'filled' : 'outlined'}
            sx={{
              fontWeight: department === d.id ? 700 : 500,
              bgcolor: department === d.id ? T.primaryTint : undefined,
              color: department === d.id ? T.primaryDeep : T.text2,
              borderColor: T.border,
            }}
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
        ) : !lines?.data?.length ? (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Aucune vente sur cette période.
            </Typography>
          </Box>
        ) : (
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
                {lines.data.map((r) => (
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
                            bgcolor: T.primaryTint,
                            color: T.primaryDeep,
                            '& .MuiChip-label': { px: 0.75 },
                          }}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, color: T.text2 }}>{r.departmentLabel}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: T.text3 }}>
                      {r.categoryName || '—'}
                    </TableCell>
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
            {lines.total > lines.data.length ? (
              <Box sx={{ p: 1.5, borderTop: `1px solid ${T.border}`, bgcolor: T.bg2 }}>
                <Typography sx={{ fontSize: 11.5, color: T.text3 }}>
                  {lines.data.length} lignes affichées sur {lines.total} — affinez la période ou
                  la recherche.
                </Typography>
              </Box>
            ) : null}
          </Box>
        )}
      </Paper>
    </DashboardWrapper>
  );
}
