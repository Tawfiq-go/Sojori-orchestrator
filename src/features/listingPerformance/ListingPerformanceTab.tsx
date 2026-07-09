// ════════════════════════════════════════════════════════════════════
// ListingPerformanceTab — onglet Dashboard « Performance par bien »
// Deux vues sur la même matrice bien × mois (endpoint srv-calendar) :
//   · Mois  : tableau KPI détaillé d'un mois (occupation, revenus, ADR,
//             RevPAR, lead time, séjour moyen, canaux, Δ vs mois précédent)
//   · Année : 24 mois (12 réalisés + 12 déjà réservés), pastilles vs N-1
// Style Atelier (tokens dynamic-pricing). Maquette validée v3.
// ════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import { T } from '../dynamic-pricing/_tokens';
import { calendarService } from '../../services/calendarService';
import { fetchReviewsByListing } from '../../services/reservationsService';
import type { ListingReviewsRow } from '../../services/reservationsService';
import type {
  ListingPerformanceMonth,
  ListingPerformanceRow,
  PerformanceReservationDetail,
} from '../../services/calendarService';

const MONO = 'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace';
const MONTH_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTH_LETTER = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_SHORT[m - 1]} ${y}`;
}
function monthLetter(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return m === 1 ? `J${String(y).slice(2)}` : MONTH_LETTER[m - 1];
}
function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}
function nowMonth(): string {
  return new Date().toISOString().slice(0, 7);
}
const fmtMad = (v: number) => Math.round(v).toLocaleString('fr-FR');
const fmtK = (v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}k` : String(Math.round(v)));
const fmtPct = (v: number | null) => (v == null ? '—' : `${Math.round(v * 100)} %`);

const CHANNEL_COLORS: Record<string, string> = {
  AirBNB: '#e5484d', Airbnb: '#e5484d', BookingCom: '#2f6fd6', Booking: '#2f6fd6',
};
const channelColor = (name: string) => CHANNEL_COLORS[name] ?? T.goldDeep;

type PerfView = 'mois' | 'annee' | 'avis';

/* ─── Petits composants ─── */

function DeltaChip({ delta, unit, invert = false }: { delta: number | null; unit: string; invert?: boolean }) {
  if (delta == null) return <Box component="span" sx={{ fontFamily: MONO, fontSize: 10.5, color: T.text4 }}>—</Box>;
  const up = delta > 0;
  const flat = Math.round(Math.abs(delta)) === 0;
  const good = invert ? !up : up;
  return (
    <Box component="span" sx={{
      fontFamily: MONO, fontSize: 10.5, fontWeight: 700, borderRadius: '99px', px: 1, py: 0.25,
      color: flat ? T.text3 : good ? T.success : T.error,
      bgcolor: flat ? T.bg3 : good ? T.successTint : T.errorTint,
    }}>
      {flat ? '= stable' : `${up ? '▲ +' : '▼ −'}${Math.abs(Math.round(delta))}${unit}`}
    </Box>
  );
}

function OccBar({ value }: { value: number | null }) {
  const pct = value == null ? 0 : Math.min(100, Math.round(value * 100));
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Box sx={{ width: 74, height: 7, borderRadius: '99px', bgcolor: T.bg3, overflow: 'hidden', flexShrink: 0 }}>
        <Box sx={{ width: `${pct}%`, height: '100%', borderRadius: '99px', background: `linear-gradient(90deg, ${T.gold}, ${T.goldDeep})` }} />
      </Box>
      <Typography component="span" sx={{ fontFamily: MONO, fontSize: 12 }}>{fmtPct(value)}</Typography>
    </Stack>
  );
}

function ChannelMix({ channels }: { channels: Record<string, number> }) {
  const entries = Object.entries(channels).filter(([, n]) => n > 0);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  if (!total) return <Typography component="span" sx={{ color: T.text4, fontSize: 12 }}>—</Typography>;
  return (
    <Box title={entries.map(([k, n]) => `${k} ${Math.round((n / total) * 100)} %`).join(' · ')}
      sx={{ display: 'flex', height: 8, width: 84, borderRadius: '99px', overflow: 'hidden' }}>
      {entries.map(([k, n]) => (
        <Box key={k} sx={{ width: `${(n / total) * 100}%`, bgcolor: channelColor(k) }} />
      ))}
    </Box>
  );
}

/* ─── Cellule mois (vue Année) ─── */

function occTint(v: number | null): string {
  if (v == null || v <= 0) return 'rgba(244,207,94,0.06)';
  if (v < 0.15) return 'rgba(244,207,94,0.10)';
  if (v < 0.3) return 'rgba(244,207,94,0.28)';
  if (v < 0.5) return 'rgba(244,207,94,0.52)';
  return 'rgba(199,155,34,0.55)';
}

function YearCell({ m, prevYear, onClick }: { m: ListingPerformanceMonth; prevYear?: ListingPerformanceMonth; onClick?: () => void }) {
  const yoy =
    m.isFuture && prevYear?.hasInventory && prevYear.occupancy != null && m.occupancy != null && m.hasInventory
      ? Math.round((m.occupancy - prevYear.occupancy) * 100)
      : null;
  const empty = !m.hasInventory;
  const totalDays = m.openNights + m.blockedNights;
  const openRatio = totalDays > 0 ? m.openNights / totalDays : 1;
  const partiallyBlocked = !empty && m.blockedNights > 0;
  const title = empty
    ? `${monthLabel(m.month)} — pas de données (bien pas encore actif)`
    : `${monthLabel(m.month)} · occupation ${fmtPct(m.occupancy)} · ${fmtMad(m.revenue)} MAD · ${m.nightsSold} nuit(s)` +
      (m.adr != null ? ` · ADR ${fmtMad(m.adr)}` : '') +
      (partiallyBlocked ? ` · ⚠ seulement ${m.openNights} j ouverts / ${totalDays} (${m.blockedNights} bloqués)` : '') +
      (m.isFuture ? ' · déjà réservé à date' : '');
  return (
    <Box title={title} onClick={onClick} sx={{
      position: 'relative', borderRadius: '6px', height: 48, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '1px', minWidth: 0,
      cursor: onClick ? 'pointer' : 'default',
      '&:hover': onClick ? { outline: `1.5px solid ${T.gold}`, outlineOffset: '1px' } : undefined,
      ...(m.isFuture
        ? { bgcolor: T.bg1, border: `1.5px dashed ${empty || (m.occupancy ?? 0) === 0 ? T.borderStrong : T.goldDeep}` }
        : { bgcolor: occTint(m.occupancy) }),
      ...(m.isCurrent ? { outline: `2px solid ${T.text}`, outlineOffset: '1px' } : {}),
      ...(empty ? { opacity: 0.5 } : {}),
    }}>
      {yoy != null && yoy !== 0 ? (
        <Box sx={{
          position: 'absolute', top: -7, right: -2, fontFamily: MONO, fontSize: 8, fontWeight: 800,
          borderRadius: '99px', px: 0.625, py: '1px',
          color: yoy > 0 ? T.success : T.error, bgcolor: yoy > 0 ? T.successTint : T.errorTint,
        }}>
          {yoy > 0 ? `▲+${yoy}` : `▼−${Math.abs(yoy)}`}
        </Box>
      ) : null}
      <Typography component="b" sx={{ fontSize: 10.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: empty ? T.text4 : T.text }}>
        {empty ? '·' : fmtPct(m.occupancy)}
      </Typography>
      <Typography component="span" sx={{ fontFamily: MONO, fontSize: 8.5, color: T.text3 }} noWrap>
        {empty ? monthLetter(m.month) : `${fmtK(m.revenue)} · ${monthLetter(m.month)}`}
      </Typography>
      {partiallyBlocked ? (
        // Jauge d'ouverture : part du mois réellement en vente (le reste est bloqué)
        <Box sx={{ position: 'absolute', left: 4, right: 4, bottom: 2, height: 3, borderRadius: '99px', bgcolor: T.errorTint, overflow: 'hidden' }}>
          <Box sx={{ width: `${Math.round(openRatio * 100)}%`, height: '100%', bgcolor: openRatio < 0.5 ? T.error : T.goldDeep, borderRadius: '99px' }} />
        </Box>
      ) : null}
    </Box>
  );
}

/* ─── Composant principal ─── */

export default function ListingPerformanceTab({ ownerId }: { ownerId?: string }) {
  const [view, setView] = useState<PerfView>('annee');
  const [selectedMonth, setSelectedMonth] = useState<string>(nowMonth());
  const [rows, setRows] = useState<ListingPerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drill, setDrill] = useState<{
    listingId: string; name: string; month: string;
    monthData?: ListingPerformanceMonth | null;
  } | null>(null);

  // Fenêtre −24 → +12 : les 12 mois « année » + le N-1 nécessaire aux pastilles.
  const from = useMemo(() => shiftMonth(nowMonth(), -24), []);
  const to = useMemo(() => shiftMonth(nowMonth(), 12), []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await calendarService.getPerformanceByListing({ from, to, ownerId });
      setRows(res.listings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [from, to, ownerId]);

  useEffect(() => { void load(); }, [load]);

  // Index mois → position (la fenêtre est identique pour tous les biens)
  const monthKeys = rows[0]?.months.map((m) => m.month) ?? [];
  const displayKeys = useMemo(() => monthKeys.filter((k) => k >= shiftMonth(nowMonth(), -11)), [monthKeys]);

  /* Agrégat portefeuille par mois */
  const portfolio = useMemo(() => {
    const map = new Map<string, { revenue: number; nightsSold: number; openNights: number }>();
    for (const key of monthKeys) map.set(key, { revenue: 0, nightsSold: 0, openNights: 0 });
    for (const row of rows) {
      for (const m of row.months) {
        const agg = map.get(m.month);
        if (!agg) continue;
        agg.revenue += m.revenue;
        agg.nightsSold += m.nightsSold;
        agg.openNights += m.openNights;
      }
    }
    return map;
  }, [rows, monthKeys]);

  const maxPortfolioRevenue = useMemo(
    () => Math.max(1, ...displayKeys.map((k) => portfolio.get(k)?.revenue ?? 0)),
    [displayKeys, portfolio],
  );

  const futureTotals = useMemo(() => {
    let nights = 0; let revenue = 0;
    const now = nowMonth();
    for (const key of monthKeys) {
      if (key <= now) continue;
      const agg = portfolio.get(key);
      if (agg) { nights += agg.nightsSold; revenue += agg.revenue; }
    }
    return { nights, revenue };
  }, [monthKeys, portfolio]);

  /* ─── rendu ─── */

  const segBtn = (key: PerfView, label: string) => (
    <Box component="button" onClick={() => setView(key)} sx={{
      all: 'unset', cursor: 'pointer', px: 2, py: 0.875, fontSize: 12, fontWeight: 800,
      color: view === key ? T.goldDeep : T.text3, bgcolor: view === key ? T.goldTint2 : T.bg1,
    }}>
      {label}
    </Box>
  );

  if (error) {
    return (
      <Box sx={{ p: 3, border: `1px solid ${T.border}`, borderRadius: 3, bgcolor: T.bg1 }}>
        <Typography sx={{ color: T.error, fontWeight: 700, mb: 1 }}>{error}</Typography>
        <Button size="small" onClick={() => void load()} sx={{ textTransform: 'none', fontWeight: 700 }}>Réessayer</Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* barre de vue */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
        <Box sx={{ display: 'flex', border: `1.5px solid ${T.borderStrong}`, borderRadius: '11px', overflow: 'hidden' }}>
          {segBtn('mois', 'Mois')}
          {segBtn('annee', 'Année')}
          {segBtn('avis', 'Avis')}
        </Box>
        {view === 'mois' ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: '12px', px: 1.5, py: 0.75 }}>
            <Box component="button" onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))} sx={{ all: 'unset', cursor: 'pointer', color: T.text3, px: 0.5, fontSize: 15 }}>‹</Box>
            <Typography sx={{ fontSize: 13.5, fontWeight: 800, minWidth: 96, textAlign: 'center', textTransform: 'capitalize' }}>{monthLabel(selectedMonth)}</Typography>
            <Box component="button" onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))} sx={{ all: 'unset', cursor: 'pointer', color: T.text3, px: 0.5, fontSize: 15 }}>›</Box>
          </Stack>
        ) : view === 'annee' ? (
          <Typography sx={{ fontFamily: MONO, fontSize: 11, color: T.text3 }}>
            12 mois réalisés + 12 mois déjà réservés · ▲▼ vs même mois an dernier
          </Typography>
        ) : (
          <Typography sx={{ fontFamily: MONO, fontSize: 11, color: T.text3 }}>
            Avis importés d'Airbnb/Booking · sync quotidien
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontFamily: MONO, fontSize: 11, color: T.text3 }}>
          {loading ? 'Chargement…' : `${rows.length} bien(s) · MAD`}
        </Typography>
      </Stack>

      {loading ? (
        <Box sx={{ p: 4, textAlign: 'center', color: T.text3, fontSize: 13 }}>Calcul des performances…</Box>
      ) : rows.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center', color: T.text3, fontSize: 13 }}>Aucun bien actif sur ce périmètre.</Box>
      ) : view === 'annee' ? (
        <AnneeView
          rows={rows}
          displayKeys={displayKeys}
          portfolio={portfolio}
          maxPortfolioRevenue={maxPortfolioRevenue}
          futureTotals={futureTotals}
          onDrill={(listingId, name, month) => {
            const row = rows.find((r) => r.listingId === listingId);
            setDrill({ listingId, name, month, monthData: row?.months.find((x) => x.month === month) ?? null });
          }}
        />
      ) : view === 'avis' ? (
        <AvisView ownerId={ownerId} />
      ) : (
        <MoisView rows={rows} month={selectedMonth} onDrill={(listingId, name) => {
          const row = rows.find((r) => r.listingId === listingId);
          setDrill({ listingId, name, month: selectedMonth, monthData: row?.months.find((x) => x.month === selectedMonth) ?? null });
        }} />
      )}

      <ReservationsDrillModal drill={drill} onClose={() => setDrill(null)} />
    </Box>
  );
}

/* ─── Vue Année ─── */

function AnneeView({ rows, displayKeys, portfolio, maxPortfolioRevenue, futureTotals, onDrill }: {
  rows: ListingPerformanceRow[];
  displayKeys: string[];
  portfolio: Map<string, { revenue: number; nightsSold: number; openNights: number }>;
  maxPortfolioRevenue: number;
  futureTotals: { nights: number; revenue: number };
  onDrill: (listingId: string, name: string, month: string) => void;
}) {
  const now = nowMonth();
  return (
    <Box>
      {/* Portefeuille 24 mois */}
      <Box sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: '16px', p: 2.25, mb: 2 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>Portefeuille · 24 mois</Typography>
        <Typography sx={{ fontSize: 11.5, color: T.text3, mb: 1.5 }}>
          Hauteur des barres = revenus MAD · % = occupation · hachuré = à venir (déjà réservé)
        </Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-end', height: 150, minWidth: 760, pt: 2 }}>
            {displayKeys.map((key) => {
              const agg = portfolio.get(key)!;
              const occ = agg.openNights > 0 ? agg.nightsSold / agg.openNights : null;
              const h = Math.max(3, Math.round((agg.revenue / maxPortfolioRevenue) * 100));
              const fut = key > now;
              return (
                <Stack key={key} spacing={0.5} sx={{ flex: 1, alignItems: 'center', minWidth: 0 }}
                  title={`${monthLabel(key)} · ${fmtMad(agg.revenue)} MAD · occupation ${fmtPct(occ)}`}>
                  <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: T.text2 }}>{fmtPct(occ)}</Typography>
                  <Box sx={{
                    width: '100%', maxWidth: 30, height: `${h}px`, borderRadius: '4px 4px 2px 2px',
                    ...(fut
                      ? { background: `repeating-linear-gradient(135deg, ${T.goldTint2} 0 4px, ${T.bg1} 4px 8px)`, border: `1.5px solid ${T.goldDeep}` }
                      : { bgcolor: T.gold }),
                    ...(key === now ? { outline: `2px solid ${T.text}`, outlineOffset: '1px' } : {}),
                  }} />
                  <Typography sx={{ fontFamily: MONO, fontSize: 9, color: T.text3 }}>{monthLetter(key)}</Typography>
                </Stack>
              );
            })}
          </Stack>
        </Box>
        <Typography sx={{ fontFamily: MONO, fontSize: 10.5, color: T.text3, mt: 1 }}>
          À venir (déjà réservé) : <b style={{ color: T.text2 }}>{futureTotals.nights} nuits · {fmtMad(futureTotals.revenue)} MAD</b>
        </Typography>
      </Box>

      {/* Par bien */}
      {rows.map((row) => {
        const byMonth = new Map(row.months.map((m) => [m.month, m]));
        const past = row.months.filter((m) => m.month <= now && m.month > shiftMonth(now, -12));
        const future = row.months.filter((m) => m.month > now);
        const pastNights = past.reduce((s, m) => s + m.nightsSold, 0);
        const pastOpen = past.reduce((s, m) => s + m.openNights, 0);
        const pastRevenue = past.reduce((s, m) => s + m.revenue, 0);
        const futNights = future.reduce((s, m) => s + m.nightsSold, 0);
        const futOpen = future.reduce((s, m) => s + m.openNights, 0);
        const futRevenue = future.reduce((s, m) => s + m.revenue, 0);
        return (
          <Box key={row.listingId} sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: '14px', p: 2, mb: 1.5 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline', flexWrap: 'wrap', rowGap: 0.75, mb: 1.25 }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>{row.name}</Typography>
              {row.city ? <Typography sx={{ fontFamily: MONO, fontSize: 10.5, color: T.text3 }}>{row.city}</Typography> : null}
              <Box sx={{ flex: 1 }} />
              <Typography sx={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, color: T.text2, bgcolor: T.bg3, borderRadius: '99px', px: 1.25, py: 0.375 }}>
                12 mois passés · {fmtPct(pastOpen > 0 ? pastNights / pastOpen : null)} · {fmtMad(pastRevenue)} MAD
              </Typography>
              <Typography sx={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, color: T.goldDeep, bgcolor: T.goldTint, borderRadius: '99px', px: 1.25, py: 0.375 }}>
                12 mois à venir · {fmtPct(futOpen > 0 ? futNights / futOpen : null)} déjà réservé · {fmtMad(futRevenue)} MAD
              </Typography>
            </Stack>
            <Box sx={{ overflowX: 'auto' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${displayKeys.length}, minmax(36px, 1fr))`, gap: '4px', minWidth: 860 }}>
                {displayKeys.map((key) => {
                  const m = byMonth.get(key);
                  if (!m) return <Box key={key} />;
                  return (
                    <YearCell
                      key={key}
                      m={m}
                      prevYear={byMonth.get(shiftMonth(key, -12))}
                      onClick={m.hasInventory ? () => onDrill(row.listingId, row.name, key) : undefined}
                    />
                  );
                })}
              </Box>
            </Box>
          </Box>
        );
      })}

      <Typography sx={{ fontSize: 11.5, color: T.text3, lineHeight: 1.6, mt: 1 }}>
        Les mois à venir montrent le <b>déjà réservé à date</b> (pas une prédiction — ça se remplit encore).
        Pastille ▲▼ = écart d'occupation vs le même mois l'an dernier. « · » = bien pas encore actif ce mois-là.
        Trait rouge sous une cellule = mois partiellement fermé à la vente (l'occupation ne porte que sur les jours ouverts — cliquez pour le détail).
        Survolez une cellule pour le détail (ADR compris) · cliquez pour voir les réservations du mois.
      </Typography>
    </Box>
  );
}

/* ─── Vue Mois ─── */

const thSx = {
  fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
  color: T.text3, textAlign: 'left' as const, p: '9px 12px', borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap' as const,
};
const tdSx = {
  p: '12px', borderBottom: `1px solid ${T.border}`, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' as const, fontSize: 12.5,
};

function MoisView({ rows, month, onDrill }: { rows: ListingPerformanceRow[]; month: string; onDrill: (listingId: string, name: string) => void }) {
  const prevMonth = shiftMonth(month, -1);
  const items = rows
    .map((row) => ({
      row,
      m: row.months.find((x) => x.month === month) ?? null,
      prev: row.months.find((x) => x.month === prevMonth) ?? null,
    }))
    .sort((a, b) => (b.m?.revenue ?? 0) - (a.m?.revenue ?? 0));

  const tot = items.reduce(
    (acc, { m }) => {
      if (!m) return acc;
      acc.revenue += m.revenue; acc.nights += m.nightsSold; acc.open += m.openNights;
      return acc;
    },
    { revenue: 0, nights: 0, open: 0 },
  );

  return (
    <Box>
      {/* KPI portefeuille du mois */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1.25, mb: 2 }}>
        {[
          { lbl: 'Revenus', val: `${fmtMad(tot.revenue)}`, unit: 'MAD' },
          { lbl: 'Occupation', val: fmtPct(tot.open > 0 ? tot.nights / tot.open : null), unit: '' },
          { lbl: 'ADR', val: tot.nights > 0 ? fmtMad(tot.revenue / tot.nights) : '—', unit: 'MAD/nuit' },
          { lbl: 'RevPAR', val: tot.open > 0 ? fmtMad(tot.revenue / tot.open) : '—', unit: 'MAD' },
          { lbl: 'Nuits vendues', val: String(tot.nights), unit: '' },
        ].map((k) => (
          <Box key={k.lbl} sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: '14px', p: '13px 16px' }}>
            <Typography sx={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.text3 }}>{k.lbl}</Typography>
            <Typography sx={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
              {k.val} {k.unit ? <Typography component="small" sx={{ fontSize: 12, fontWeight: 600, color: T.text3 }}>{k.unit}</Typography> : null}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Tableau par bien */}
      <Box sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: '16px', overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
            <Box component="thead">
              <Box component="tr">
                {['Bien', 'Occupation', 'Nuits', 'Revenus', 'ADR', 'RevPAR', 'Lead time', 'Séjour moy.', 'Canaux', 'Δ revenus'].map((h) => (
                  <Box key={h} component="th" sx={thSx}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {items.map(({ row, m, prev }) => {
                const deltaRev =
                  m && prev && prev.revenue > 0 ? ((m.revenue - prev.revenue) / prev.revenue) * 100 : null;
                return (
                  <Box component="tr" key={row.listingId} onClick={() => onDrill(row.listingId, row.name)}
                    sx={{ cursor: 'pointer', '&:hover td': { bgcolor: T.bg2 } }}>
                    <Box component="td" sx={{ ...tdSx, minWidth: 170 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>{row.name}</Typography>
                      <Typography sx={{ fontFamily: MONO, fontSize: 10.5, color: T.text3 }}>{row.city ?? '—'}</Typography>
                    </Box>
                    {!m || !m.hasInventory ? (
                      <Box component="td" colSpan={9} sx={{ ...tdSx, color: T.text4 }}>
                        Pas de données pour ce mois (bien pas encore actif).
                      </Box>
                    ) : (
                      <>
                        <Box component="td" sx={tdSx}>
                          <OccBar value={m.occupancy} />
                          {m.blockedNights > 0 ? (
                            <Typography sx={{ fontFamily: MONO, fontSize: 9.5, color: T.error, mt: 0.25 }}>
                              ⚠ {m.openNights} j ouverts / {m.openNights + m.blockedNights}
                            </Typography>
                          ) : null}
                        </Box>
                        <Box component="td" sx={{ ...tdSx, fontFamily: MONO }}>{m.nightsSold}</Box>
                        <Box component="td" sx={{ ...tdSx, fontWeight: 800 }}>{fmtMad(m.revenue)} MAD</Box>
                        <Box component="td" sx={{ ...tdSx, fontFamily: MONO }}>{m.adr != null ? fmtMad(m.adr) : '—'}</Box>
                        <Box component="td" sx={{ ...tdSx, fontFamily: MONO }}>{m.revpar != null ? fmtMad(m.revpar) : '—'}</Box>
                        <Box component="td" sx={{ ...tdSx, fontFamily: MONO }}>{m.leadTimeMedianDays != null ? `${Math.round(m.leadTimeMedianDays)} j` : '—'}</Box>
                        <Box component="td" sx={{ ...tdSx, fontFamily: MONO }}>{m.avgStayNights != null ? `${m.avgStayNights.toLocaleString('fr-FR')} n` : '—'}</Box>
                        <Box component="td" sx={tdSx}><ChannelMix channels={m.channels} /></Box>
                        <Box component="td" sx={tdSx}><DeltaChip delta={deltaRev} unit=" %" /></Box>
                      </>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Box>

      <Typography sx={{ fontSize: 11.5, color: T.text3, lineHeight: 1.6, mt: 1.5 }}>
        <b>Occupation</b> : nuits occupées ÷ nuits ouvertes (vos jours bloqués sont exclus). ·
        <b> RevPAR</b> : revenus ÷ nuits ouvertes — combine prix et remplissage. ·
        <b> Lead time</b> : délai médian réservation → arrivée (résas arrivant ce mois). ·
        Revenus attribués par nuit occupée : un séjour à cheval sur deux mois est réparti. ·
        Cliquez sur une ligne pour voir les réservations du mois.
      </Typography>
    </Box>
  );
}


/* ─── Modal réservations du mois (justification des KPI) ─── */

function ReservationsDrillModal({ drill, onClose }: {
  drill: { listingId: string; name: string; month: string; monthData?: ListingPerformanceMonth | null } | null;
  onClose: () => void;
}) {
  const [items, setItems] = useState<PerformanceReservationDetail[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!drill) { setItems(null); setError(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await calendarService.getPerformanceReservations(drill.listingId, drill.month);
        if (!cancelled) setItems(res.reservations ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur de chargement');
      }
    })();
    return () => { cancelled = true; };
  }, [drill]);

  const active = (items ?? []).filter((r) => r.countsInKpis);
  const totalMonth = active.reduce((s, r) => s + r.revenueInMonth, 0);
  const nightsMonth = active.reduce((s, r) => s + r.nightsInMonth, 0);

  return (
    <Dialog open={Boolean(drill)} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography component="span" sx={{ fontSize: 15.5, fontWeight: 800, textTransform: 'capitalize' }}>
            {drill ? monthLabel(drill.month) : ''}
          </Typography>
          <Typography component="span" sx={{ fontSize: 12.5, color: T.text3 }}>{drill?.name}</Typography>
          <Box sx={{ flex: 1 }} />
          <IconButton size="small" onClick={onClose} aria-label="Fermer">✕</IconButton>
        </Stack>
        <Typography sx={{ fontFamily: MONO, fontSize: 11, color: T.text2, mt: 0.5 }}>
          {items ? `${active.length} résa(s) comptée(s) · ${nightsMonth} nuit(s) · ${fmtMad(totalMonth)} MAD sur ce mois` : 'Chargement…'}
        </Typography>
        {drill?.monthData && drill.monthData.blockedNights > 0 ? (
          <Typography sx={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: T.error, mt: 0.25 }}>
            ⚠ Mois partiellement fermé : {drill.monthData.openNights} j ouverts sur{' '}
            {drill.monthData.openNights + drill.monthData.blockedNights} — {drill.monthData.blockedNights} j bloqués
            (l'occupation de {fmtPct(drill.monthData.occupancy)} est calculée sur les jours ouverts uniquement).
          </Typography>
        ) : null}
      </DialogTitle>
      <DialogContent>
        {error ? (
          <Typography sx={{ color: T.error, fontSize: 13, py: 2 }}>{error}</Typography>
        ) : !items ? (
          <Typography sx={{ color: T.text3, fontSize: 13, py: 2 }}>Chargement…</Typography>
        ) : items.length === 0 ? (
          <Typography sx={{ color: T.text3, fontSize: 13, py: 2 }}>Aucune réservation sur ce mois.</Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 720, fontSize: 12.5 }}>
              <Box component="thead">
                <Box component="tr">
                  {['Résa', 'Voyageur', 'Canal', 'Check-in', 'Check-out', 'Nuits (mois)', 'Montant (mois)', 'Total séjour', 'Réservé le', 'Statut'].map((h) => (
                    <Box key={h} component="th" sx={thSx}>{h}</Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {items.map((r) => (
                  <Box component="tr" key={r.reservationNumber} sx={{ opacity: r.countsInKpis ? 1 : 0.5 }}>
                    <Box component="td" sx={{ ...tdSx, fontFamily: MONO, fontWeight: 700 }}>{r.reservationNumber}</Box>
                    <Box component="td" sx={tdSx}>{r.guestName ?? '—'}{r.numberOfGuests ? ` · ${r.numberOfGuests}p` : ''}</Box>
                    <Box component="td" sx={tdSx}>
                      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: channelColor(String(r.channelName)) }} />
                        {r.channelName ?? '—'}
                      </Box>
                    </Box>
                    <Box component="td" sx={{ ...tdSx, fontFamily: MONO }}>{r.checkIn}</Box>
                    <Box component="td" sx={{ ...tdSx, fontFamily: MONO }}>{r.checkOut}</Box>
                    <Box component="td" sx={{ ...tdSx, fontFamily: MONO }}>{r.nightsInMonth}/{r.totalNights}</Box>
                    <Box component="td" sx={{ ...tdSx, fontWeight: 800 }}>{fmtMad(r.revenueInMonth)} MAD</Box>
                    <Box component="td" sx={{ ...tdSx, fontFamily: MONO }}>{fmtMad(r.totalPrice)}</Box>
                    <Box component="td" sx={{ ...tdSx, fontFamily: MONO }}>{r.bookedAt ?? '—'}</Box>
                    <Box component="td" sx={tdSx}>
                      <Box component="span" sx={{
                        fontFamily: MONO, fontSize: 10.5, fontWeight: 700, borderRadius: '99px', px: 1, py: 0.25,
                        color: r.countsInKpis ? T.success : T.error,
                        bgcolor: r.countsInKpis ? T.successTint : T.errorTint,
                      }}>
                        {r.countsInKpis ? r.status : `${r.status} (exclue)`}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}
        <Typography sx={{ fontSize: 11, color: T.text3, mt: 1.5 }}>
          « Nuits (mois) » et « Montant (mois) » = la part de ce mois pour les séjours à cheval.
          Les réservations annulées sont affichées mais exclues des KPI.
        </Typography>
      </DialogContent>
    </Dialog>
  );
}


/* ─── Vue Avis ─── */

const CATEGORY_LABELS: Record<string, string> = {
  clean: 'Propreté',
  accuracy: 'Exactitude',
  checkin: 'Arrivée',
  communication: 'Communication',
  location: 'Localisation',
  value: 'Qualité-prix',
};
const CATEGORY_HINTS: Record<string, string> = {
  checkin: 'Vérifier le flow « Accès & codes » et les instructions d\u2019arrivée de ce bien.',
  clean: 'Renforcer le ménage : consignes staff, contrôle photo après tâche.',
  communication: 'Vérifier les messages planifiés et le délai de réponse chatbot/staff.',
  accuracy: 'Relire l\u2019annonce : photos et description doivent coller à la réalité.',
  value: 'Revoir le pricing (pilote) ou ajouter de la valeur (équipements).',
  location: 'Non actionnable — compenser en soignant le reste.',
};
const on5 = (v: number | null) => (v == null ? null : Math.round((v / 2) * 10) / 10);
const fmt5 = (v: number | null) => (v == null ? '—' : on5(v)!.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
const cleanTag = (t: string) =>
  t.replace(/^guest_review_host_(positive|negative)_/, '').replace(/_/g, ' ');
const tagIsNegative = (t: string) => /negative/.test(t);

function Stars({ score10 }: { score10: number | null }) {
  if (score10 == null) return null;
  const n = Math.round(score10 / 2);
  return (
    <Typography component="span" sx={{ color: T.goldDeep, fontSize: 12, letterSpacing: '1px' }}>
      {'★'.repeat(n)}{'☆'.repeat(Math.max(0, 5 - n))}
    </Typography>
  );
}

function AvisView({ ownerId }: { ownerId?: string }) {
  const [data, setData] = useState<ListingReviewsRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchReviewsByListing({ ownerId });
        if (!cancelled) setData(res.listings ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur de chargement');
      }
    })();
    return () => { cancelled = true; };
  }, [ownerId]);

  if (error) return <Typography sx={{ color: T.error, fontSize: 13, p: 3 }}>{error}</Typography>;
  if (!data) return <Box sx={{ p: 4, textAlign: 'center', color: T.text3, fontSize: 13 }}>Chargement des avis…</Box>;

  // Bandeau portefeuille
  const withReviews = data.filter((l) => l.count > 0);
  const totalCount = withReviews.reduce((s, l) => s + l.count, 0);
  const avgPortfolio = totalCount
    ? withReviews.reduce((s, l) => s + (l.avgOverall ?? 0) * l.count, 0) / totalCount
    : null;
  const unreplied = data.reduce((s, l) => s + l.unreplied, 0);
  const repliedTotal = data.reduce((s, l) => s + l.replied, 0);
  const responseRate = repliedTotal + unreplied > 0 ? repliedTotal / (repliedTotal + unreplied) : null;
  // Point faible du parc : catégorie moyenne la plus basse (pondérée par volume)
  const catAgg = new Map<string, { sum: number; n: number }>();
  for (const l of withReviews) {
    for (const [cat, avg] of Object.entries(l.categories)) {
      const agg = catAgg.get(cat) ?? { sum: 0, n: 0 };
      agg.sum += avg * l.count;
      agg.n += l.count;
      catAgg.set(cat, agg);
    }
  }
  let weakest: { cat: string; avg: number } | null = null;
  for (const [cat, agg] of catAgg) {
    const avg = agg.sum / agg.n;
    if (!weakest || avg < weakest.avg) weakest = { cat, avg };
  }

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 1.25, mb: 2 }}>
        {[
          { lbl: 'Note portefeuille', val: fmt5(avgPortfolio), suffix: `/ 5 · ${totalCount} avis` },
          { lbl: 'À répondre', val: String(unreplied), suffix: unreplied > 0 ? '⚠ avis sans réponse' : 'tout est répondu ✓', warn: unreplied > 0 },
          { lbl: 'Taux de réponse', val: responseRate != null ? `${Math.round(responseRate * 100)} %` : '—', suffix: 'pèse sur le classement Airbnb' },
          { lbl: 'Point faible du parc', val: weakest ? (CATEGORY_LABELS[weakest.cat] ?? weakest.cat) : '—', suffix: weakest ? `${fmt5(weakest.avg)}/5` : '', small: true },
        ].map((k) => (
          <Box key={k.lbl} sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: '14px', p: '13px 16px' }}>
            <Typography sx={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.text3 }}>{k.lbl}</Typography>
            <Typography sx={{ fontSize: k.small ? 15 : 21, fontWeight: 800, letterSpacing: '-0.02em', mt: 0.5 }}>{k.val}</Typography>
            <Typography sx={{ fontSize: 11, color: k.warn ? T.warning : T.text3, mt: 0.25, fontWeight: k.warn ? 700 : 400 }}>{k.suffix}</Typography>
          </Box>
        ))}
      </Box>

      {data.map((l) => (
        <Box key={l.listingId} sx={{ bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: '16px', p: 2.25, mb: 1.75 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline', flexWrap: 'wrap', rowGap: 0.75, mb: l.count ? 1.5 : 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{l.name}</Typography>
            {l.city ? <Typography sx={{ fontFamily: MONO, fontSize: 10.5, color: T.text3 }}>{l.city}</Typography> : null}
            <Box sx={{ flex: 1 }} />
            {l.count ? (
              <>
                <Typography sx={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{fmt5(l.avgOverall)}</Typography>
                <Typography sx={{ fontSize: 11.5, color: T.text3 }}>/ 5 · {l.count} avis</Typography>
                {l.trendDelta != null ? (
                  <Typography sx={{
                    fontFamily: MONO, fontSize: 10.5, fontWeight: 700, borderRadius: '99px', px: 1, py: 0.25,
                    color: l.trendDelta >= 0 ? T.success : T.error,
                    bgcolor: l.trendDelta >= 0 ? T.successTint : T.errorTint,
                  }}>
                    {l.trendDelta >= 0 ? '▲ +' : '▼ −'}{Math.abs(on5(l.trendDelta) ?? 0).toLocaleString('fr-FR')} sur 90 j
                  </Typography>
                ) : null}
              </>
            ) : (
              <Typography sx={{ fontSize: 12.5, color: T.text3 }}>pas encore d'avis</Typography>
            )}
          </Stack>

          {l.count === 0 ? (
            <Typography sx={{ fontSize: 12, color: T.text3 }}>
              Les avis arriveront après les premiers séjours — le sync quotidien les importe automatiquement.
            </Typography>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '340px 1fr' }, gap: 3 }}>
              {/* Sous-notes */}
              <Box>
                {Object.entries(l.categories).map(([cat, avg]) => {
                  const low = avg < 9; // < 4,5/5
                  return (
                    <Box key={cat} sx={{ display: 'grid', gridTemplateColumns: '116px 1fr 36px', gap: 1.25, alignItems: 'center', mb: 1 }}>
                      <Typography sx={{ fontSize: 12, color: T.text2, fontWeight: 600 }}>{CATEGORY_LABELS[cat] ?? cat}</Typography>
                      <Box sx={{ height: 7, borderRadius: '99px', bgcolor: T.bg3, overflow: 'hidden' }}>
                        <Box sx={{
                          width: `${Math.min(100, (avg / 10) * 100)}%`, height: '100%', borderRadius: '99px',
                          background: low ? T.error : `linear-gradient(90deg, ${T.gold}, ${T.goldDeep})`,
                        }} />
                      </Box>
                      <Typography sx={{ fontFamily: MONO, fontSize: 11.5, fontWeight: 700, textAlign: 'right', color: low ? T.error : T.text }}>
                        {fmt5(avg)}
                      </Typography>
                    </Box>
                  );
                })}
                {/* Tags */}
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75, mt: 1.5 }}>
                  {[...new Set(l.reviews.flatMap((r) => r.tags))].slice(0, 8).map((t) => (
                    <Typography key={t} component="span" sx={{
                      fontFamily: MONO, fontSize: 10, fontWeight: 700, borderRadius: '99px', px: 1.125, py: 0.375,
                      color: tagIsNegative(t) ? T.error : T.success,
                      bgcolor: tagIsNegative(t) ? T.errorTint : T.successTint,
                    }}>
                      {tagIsNegative(t) ? '✗' : '✓'} {cleanTag(t)}
                    </Typography>
                  ))}
                </Stack>
                {/* Encart actionnable */}
                {(() => {
                  const entries = Object.entries(l.categories).filter(([, avg]) => avg < 9);
                  if (!entries.length || l.count < 3) return null;
                  const [cat, avg] = entries.sort((a, b) => a[1] - b[1])[0];
                  return (
                    <Box sx={{ mt: 1.5, fontSize: 11.5, color: T.text2, bgcolor: T.goldTint, border: `1px dashed ${T.gold}`, borderRadius: '10px', p: '8px 12px' }}>
                      💡 <b>{CATEGORY_LABELS[cat] ?? cat} {fmt5(avg)}/5</b> — {CATEGORY_HINTS[cat] ?? 'Point à surveiller.'}
                    </Box>
                  );
                })()}
              </Box>

              {/* Fil des avis */}
              <Box>
                {(expanded[l.listingId] ? l.reviews : l.reviews.slice(0, 3)).map((r) => (
                  <Box key={r.id} sx={{ border: `1px solid ${T.border}`, borderRadius: '12px', p: '11px 14px', mb: 1.25 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                      <Stars score10={r.overallScore} />
                      <Typography sx={{ fontFamily: MONO, fontSize: 10, color: T.text3 }}>
                        {r.overallScore != null ? `${fmt5(r.overallScore)}/5 · ` : ''}
                        <Box component="span" sx={{ color: channelColor(r.ota), fontWeight: 700 }}>{r.ota}</Box>
                        {r.guestName ? ` · ${r.guestName}` : ''} · {new Date(r.receivedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Typography>
                    </Stack>
                    {r.content ? (
                      <Typography sx={{ fontSize: 12.5, color: T.text2, lineHeight: 1.55, whiteSpace: 'pre-line' }}>{r.content}</Typography>
                    ) : (
                      <Typography sx={{ fontSize: 12, color: T.text4, fontStyle: 'italic' }}>Note sans commentaire</Typography>
                    )}
                    {r.reply ? (
                      <Box sx={{ mt: 1, borderLeft: `3px solid ${T.gold}`, pl: 1.25, py: 0.5, bgcolor: T.goldTint, borderRadius: '0 8px 8px 0' }}>
                        <Typography sx={{ fontSize: 12, color: T.text2 }}><b>Votre réponse</b> — {r.reply}</Typography>
                      </Box>
                    ) : !r.isReplied ? (
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1 }}>
                        <Typography component="span" sx={{
                          fontFamily: MONO, fontSize: 10, fontWeight: 800, color: T.warning,
                          bgcolor: T.warningTint, borderRadius: '99px', px: 1.125, py: 0.25,
                        }}>
                          {r.isExpired ? 'FENÊTRE DE RÉPONSE EXPIRÉE' : '⚠ SANS RÉPONSE'}
                        </Typography>
                        {!r.isExpired ? (
                          <Button
                            size="small"
                            href="https://www.airbnb.com/hosting/reviews"
                            target="_blank"
                            rel="noopener"
                            sx={{
                              textTransform: 'none', fontWeight: 800, fontSize: 11.5, py: 0.25,
                              color: T.goldDeep, border: `1px solid ${T.gold}`, bgcolor: T.goldTint,
                            }}
                          >
                            Répondre sur {r.ota}
                          </Button>
                        ) : null}
                      </Stack>
                    ) : null}
                  </Box>
                ))}
                {l.reviews.length > 3 ? (
                  <Button size="small" onClick={() => setExpanded((e) => ({ ...e, [l.listingId]: !e[l.listingId] }))}
                    sx={{ textTransform: 'none', fontWeight: 700, fontSize: 12, color: T.goldDeep }}>
                    {expanded[l.listingId] ? 'Réduire ▲' : `Voir les ${l.reviews.length} avis →`}
                  </Button>
                ) : null}
              </Box>
            </Box>
          )}
        </Box>
      ))}

      <Typography sx={{ fontSize: 11.5, color: T.text3, lineHeight: 1.6, mt: 1 }}>
        Avis importés d'Airbnb/Booking (sync quotidien). Notes stockées sur 10, affichées sur 5.
        Répondre vite aux avis pèse sur le classement Airbnb — la réponse directe depuis Sojori arrive
        (le canal existe déjà côté WhatsApp staff).
      </Typography>
    </Box>
  );
}
