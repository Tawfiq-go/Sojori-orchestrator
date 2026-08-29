import { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Stack, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { DashboardWrapper } from '../../components/DashboardWrapper';
import { fetchRevenueSummary, type RevenueSummary } from '../../services/revenueApi';

/**
 * Ventes d'extras — vue par département USALI.
 *
 * Le mini-bar n'est qu'un extra parmi d'autres : restauration, prestations,
 * ajustements de séjour. Cette page les rassemble ; la page Mini-bar ne
 * traite que ce qui lui est propre, le suivi de stock par villa.
 */

const T = {
  primaryDeep: '#876119',
  bg1: '#ffffff',
  bg2: '#fafaf7',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  border: 'rgba(20,17,10,0.08)',
};

/** L'hébergement n'est pas un extra : il a ses propres écrans. */
const EXTRA_DEPARTMENTS = ['fnb', 'other_operated', 'misc'];

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
 * Deux natures distinctes : les périodes *closes* (hier, semaine dernière,
 * mois dernier) comparent des intervalles terminés, ce que les glissantes
 * ne permettent pas — « hier » n'est pas « les 24 dernières heures ».
 */
type Period = {
  id: string
  label: string
  /** `to` est exclusif : la borne haute n'est jamais comptée. */
  range: () => { from: Date; to: Date }
};

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
      const from = new Date(to.getTime() - 24 * 3600e3);
      return { from, to };
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
      const dow = (today.getUTCDay() + 6) % 7; // lundi = 0
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

export function ExtrasVentesPage() {
  const [periodId, setPeriodId] = useState('last7');
  const [data, setData] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const period = PERIODS.find((p) => p.id === periodId) ?? PERIODS[2];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Les bornes sont déjà exclusives côté période, comme l'attend l'API.
    const { from, to } = period.range();
    fetchRevenueSummary({ from: ymd(from), to: ymd(to) })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [periodId]);

  const rows = useMemo(() => {
    if (!data?.byDepartment) return [];
    return EXTRA_DEPARTMENTS.map((dept) => ({ dept, ...data.byDepartment[dept] })).filter(
      (r) => r.gross != null,
    );
  }, [data]);

  const total = rows.reduce((sum, r) => sum + (Number(r.gross) || 0), 0);

  return (
    <DashboardWrapper breadcrumb={['Extra', 'Ventes']}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, flex: 1 }}>
          Tout ce qui est vendu en dehors de l’hébergement : restauration, prestations,
          ajustements de séjour. Le mini-bar y figure comme les autres.
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

      {loading ? (
        <Typography variant="body2">Chargement…</Typography>
      ) : rows.length === 0 ? (
        <Paper sx={{ p: 3, border: `1px solid ${T.border}`, borderRadius: 1.75 }}>
          <Typography variant="body2" color="text.secondary">
            Aucune vente d’extra sur cette période.
          </Typography>
        </Paper>
      ) : (
        <>
          <Paper
            sx={{
              p: 2.5,
              mb: 2,
              border: `1px solid ${T.border}`,
              borderRadius: 1.75,
              bgcolor: T.bg2,
            }}
          >
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: T.text3, letterSpacing: '0.06em' }}>
              TOTAL EXTRAS · {period.label.toUpperCase()}
            </Typography>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: T.primaryDeep, mt: 0.5 }}>
              {money(total)}
            </Typography>
          </Paper>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
            {rows.map((r) => (
              <Paper
                key={r.dept}
                sx={{ p: 2, border: `1px solid ${T.border}`, borderRadius: 1.75, bgcolor: T.bg1 }}
              >
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text }}>
                  {r.label}
                </Typography>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: T.text, mt: 0.75 }}>
                  {money(Number(r.gross) || 0)}
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.5 }}>
                  {r.lines} ligne{Number(r.lines) > 1 ? 's' : ''} · HT{' '}
                  {money(Number(r.net) || 0)}
                </Typography>
              </Paper>
            ))}
          </Box>
        </>
      )}
    </DashboardWrapper>
  );
}
