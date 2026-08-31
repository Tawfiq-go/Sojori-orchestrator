import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import { useFinancesOwnerScope } from '../finances/useFinancesOwnerScope';
import { listLandlords } from '../finances/landlordApi';
import type { LandlordAccount } from '../finances/types';
import { fetchPerformanceReservations, type PerfListing, type PerfReservation } from './performanceApi';
import { byUnit, daysInMonth, monthlySeries, occupancy, type MonthCell } from './aggregate';

/**
 * Performance et projection — lecture location courte duree.
 *
 * Un seul ecran, trois profondeurs : portefeuille, proprietaire, bien. Les
 * memes colonnes partout, pour qu'on ne reapprenne rien en descendant.
 *
 * La ligne verticale du graphe separe ce qui est constate de ce qui est
 * seulement engage. C'est la seule information qu'aucun rapport existant ne
 * donne : la marge deja securisee par le carnet.
 */

const T = {
  gold: '#b8851a',
  goldSoft: '#e7d3a6',
  ink: '#191b18',
  ink2: '#4d5049',
  ink3: '#82867d',
  line: '#dcdcd4',
  bg: '#fbfaf7',
  card: '#ffffff',
  blue: '#2d4a6b',
  green: '#2f6b4a',
};

/** Plage : 10 mois ecoules + le mois courant + 3 mois de carnet. */
function range(today: Date) {
  const from = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 10, 1));
  const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 4, 0));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

const MONTHS = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

function labelOf(key: string): string {
  const [, m] = key.split('-').map(Number);
  return MONTHS[(m || 1) - 1] ?? key;
}

function money(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (Math.abs(v) >= 1000) return `${Math.round(v / 1000)} k`;
  return String(Math.round(v));
}

/**
 * RevPAR — revenu par bien disponible, sur le mois.
 *
 * Le chiffre dont parlent les gestionnaires : il reconcilie l'occupation et
 * le prix. Un parc a 90 %% brade peut rapporter moins qu'un parc a 60 %% bien
 * vendu — seul le RevPAR le montre.
 */
function revpar(revenue: number, monthKey: string | null, units: number): number | null {
  if (!monthKey || units <= 0) return null;
  const capacity = daysInMonth(monthKey) * units;
  return capacity > 0 ? revenue / capacity : null;
}

function pct(v: number | null): string {
  return v == null ? '—' : `${Math.round(v * 100)} %`;
}

export function PerformancePage() {
  const { ownerId, needsOwnerPick } = useFinancesOwnerScope();
  const [rows, setRows] = useState<PerfReservation[] | null>(null);
  const [parc, setParc] = useState<PerfListing[]>([]);
  /** Decalage en mois par rapport au dernier mois clos (0 = ce mois-la). */
  const [offset, setOffset] = useState(0);
  const [landlords, setLandlords] = useState<LandlordAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const today = useMemo(() => new Date(), []);
  const { from, to } = useMemo(() => range(today), [today]);

  useEffect(() => {
    if (!ownerId) return;
    let alive = true;
    setRows(null);
    setError(null);
    Promise.all([
      fetchPerformanceReservations({ ownerId, from, to }),
      listLandlords('', ownerId).catch(() => [] as LandlordAccount[]),
    ])
      .then(([res, lls]) => {
        if (!alive) return;
        setRows(res.reservations);
        setParc(res.listings);
        setLandlords(lls);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        // Affiche l'echec plutot qu'un zero : un ecran muet ne se distingue
        // pas d'une activite nulle.
        setError(e instanceof Error ? e.message : 'Chargement impossible');
      });
    return () => {
      alive = false;
    };
  }, [ownerId, from, to]);

  const series = useMemo<MonthCell[]>(
    () => (rows ? monthlySeries(rows, { from, to, today }) : []),
    [rows, from, to, today],
  );

  const past = useMemo(() => series.filter((c) => !c.future), [series]);
  const future = useMemo(() => series.filter((c) => c.future), [series]);

  /**
   * Mois affiche. Par defaut le dernier mois clos ; les fleches permettent
   * de remonter la saison, comme sur les rapports hoteliers.
   */
  const lastClosed = useMemo(() => {
    if (!past.length) return null;
    const idx = past.length - 1 + offset;
    return past[Math.min(past.length - 1, Math.max(0, idx))] ?? null;
  }, [past, offset]);

  const canPrev = past.length > 0 && past.length - 1 + offset > 0;
  const canNext = offset < 0;

  /** « août 2026 » — le mois lu par tout l'ecran, jamais implicite. */
  const monthLabel = lastClosed
    ? `${labelOf(lastClosed.key)} ${lastClosed.key.slice(0, 4)}`
    : 'aucun mois clos';

  /** Ce qui est deja engage sur les mois a venir. */
  const booked = useMemo(
    () => future.reduce((s, c) => s + c.revenue + c.cleaning - c.otaCommission, 0),
    [future],
  );

  const unitsByLandlord = useMemo(() => {
    if (!rows) return [];
    // Le tableau lit le MEME mois que le bandeau — sinon deux taux
    // d'occupation coexistent a l'ecran, et l'un des deux est faux.
    const closedKeys = new Set(lastClosed ? [lastClosed.key] : []);
    const units = byUnit(rows, closedKeys);
    const byId = new Map(units.map((u) => [u.listingId, u]));
    const monthKeys = lastClosed ? [lastClosed.key] : [];
    const parcById = new Map(parc.map((l) => [l.listingId, l.listingName]));

    return landlords
      .map((l) => {
        const ids = (l.listingIds || []).map(String);
        // Tous les biens du proprietaire, pas seulement ceux qui ont vendu :
        // un appartement a 0 % est justement ce qu'il faut voir.
        const mine = ids.map(
          (id) =>
            byId.get(id) ?? {
              listingId: id,
              listingName: parcById.get(id) || id,
              nights: 0,
              revenue: 0,
              cleaning: 0,
              otaCommission: 0,
              reservations: 0,
            },
        );
        const nights = mine.reduce((s, u) => s + u.nights, 0);
        const revenue = mine.reduce((s, u) => s + u.revenue, 0);
        const cleaning = mine.reduce((s, u) => s + u.cleaning, 0);
        return {
          id: l._id,
          name: `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Sans nom',
          contract: l.landlordContract,
          units: mine,
          listings: ids.length,
          nights,
          revenue,
          cleaning,
          // Capacite = nb de biens x jours des mois clos.
          occ: occupancy(nights, monthKeys, { units: ids.length }),
          revpar: revpar(revenue, lastClosed?.key ?? null, ids.length),
        };
      })
      .filter((g) => g.listings > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [rows, landlords, lastClosed, parc]);

  const totals = useMemo(() => {
    // Tout le bandeau et le tableau portent sur le dernier mois CLOS.
    const nights = lastClosed?.nights ?? 0;
    const revenue = lastClosed?.revenue ?? 0;
    const cleaning = lastClosed?.cleaning ?? 0;
    const listings = unitsByLandlord.reduce((s, g) => s + g.listings, 0);
    const monthKeys = lastClosed ? [lastClosed.key] : [];
    return {
      nights,
      revenue,
      cleaning,
      listings,
      occ: occupancy(nights, monthKeys, { units: listings }),
      revpar: revpar(revenue, lastClosed?.key ?? null, listings),
    };
  }, [lastClosed, unitsByLandlord]);

  if (needsOwnerPick) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">Choisissez un gestionnaire dans le filtre en haut de page.</Alert>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error} — aucun chiffre n’est affiché tant que la source n’a pas répondu.
        </Alert>
      </Box>
    );
  }

  if (!rows) {
    return (
      <Stack sx={{ p: 6, alignItems: 'center' }}>
        <CircularProgress size={28} sx={{ color: T.gold }} />
      </Stack>
    );
  }

  const maxBar = Math.max(1, ...series.map((c) => c.revenue));

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: T.bg, minHeight: '100%' }}>
      <Typography sx={{ fontSize: 20, fontWeight: 800, color: T.ink }}>
        Performance &amp; projection
      </Typography>
      <Typography sx={{ fontSize: 13, color: T.ink3, mb: 2.5 }}>
        Le réalisé, et ce qui est déjà au carnet — {totals.listings} bien
        {totals.listings > 1 ? 's' : ''} · {unitsByLandlord.length} propriétaire
        {unitsByLandlord.length > 1 ? 's' : ''}
      </Typography>

      {/* Bandeau : trois chiffres constates, un engage. */}
      {/* Navigation mensuelle — meme geste que les rapports hoteliers. */}
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1.5 }}>
        <IconButton
          size="small"
          disabled={!canPrev}
          onClick={() => setOffset((o) => o - 1)}
          sx={{ border: `1px solid ${T.line}`, borderRadius: 1, width: 30, height: 30 }}
        >
          <Typography sx={{ fontSize: 15, color: canPrev ? T.ink2 : T.line, lineHeight: 1 }}>‹</Typography>
        </IconButton>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: T.ink, minWidth: 120, textAlign: 'center' }}>
          {monthLabel}
        </Typography>
        <IconButton
          size="small"
          disabled={!canNext}
          onClick={() => setOffset((o) => o + 1)}
          sx={{ border: `1px solid ${T.line}`, borderRadius: 1, width: 30, height: 30 }}
        >
          <Typography sx={{ fontSize: 15, color: canNext ? T.ink2 : T.line, lineHeight: 1 }}>›</Typography>
        </IconButton>
        {offset !== 0 ? (
          <Typography
            onClick={() => setOffset(0)}
            sx={{ fontSize: 11.5, color: T.gold, cursor: 'pointer', fontWeight: 600, ml: 0.5 }}
          >
            revenir au dernier mois clos
          </Typography>
        ) : null}
      </Stack>

      <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap', mb: 2.5 }}>
        <Kpi label="Occupation" hint={monthLabel} value={pct(totals.occ)} />
        <Kpi label="Revenu" hint={monthLabel} value={`${money(lastClosed?.revenue ?? 0)} MAD`} />
        <Kpi
          label="RevPAR"
          hint={`${monthLabel} · par bien et par nuit`}
          value={totals.revpar != null ? `${Math.round(totals.revpar)} MAD` : '—'}
        />
        <Kpi label="Ménage OTA" hint={`encaissé · ${monthLabel}`} value={`${money(lastClosed?.cleaning ?? 0)} MAD`} />
        <Kpi
          label="Déjà au carnet"
          hint={`${future.length} mois à venir`}
          value={`${money(booked)} MAD`}
          accent
        />
      </Stack>

      {/* Graphe : une barre par mois, coupee par le trait du jour. */}
      <Box sx={{ bgcolor: T.card, border: `1px solid ${T.line}`, borderRadius: 2, p: 2, mb: 2.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.ink2, mb: 1.5 }}>
          Revenu et occupation, mois par mois
        </Typography>
        <Typography sx={{ fontSize: 11, color: T.ink3, mb: 1.5 }}>
          {`${labelOf(from.slice(0, 7))} ${from.slice(0, 4)} → ${labelOf(to.slice(0, 7))} ${to.slice(0, 4)} · le trait marque aujourd’hui`}
        </Typography>
        <Stack direction="row" sx={{ alignItems: 'flex-end', gap: 0.75, height: 210 }}>
          {series.map((c, i) => {
            const firstFuture = c.future && !series[i - 1]?.future;
            // L'annee n'apparait qu'a son premier mois : la repeter 14 fois
            // sature la ligne, l'omettre rend « jan » ambigu.
            const [y, m] = c.key.split('-');
            const showYear = i === 0 || m === '01';
            const occ = occupancy(c.nights, [c.key], { units: totals.listings });
            return (
              <Stack key={c.key} sx={{ flex: 1, alignItems: 'center', height: '100%', position: 'relative' }}>
                {firstFuture ? (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: -4,
                      top: 0,
                      bottom: 30,
                      borderLeft: `2px dashed ${T.gold}`,
                    }}
                  />
                ) : null}
                <Box
                  sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    width: '100%',
                  }}
                >
                  {/* Le chiffre sur la barre : sans lui, on compare des
                      hauteurs sans savoir ce qu'elles valent. */}
                  <Typography
                    sx={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      color: c.future ? T.ink3 : T.ink2,
                      mb: 0.25,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.revenue > 0 ? money(c.revenue) : ''}
                  </Typography>
                  <Box
                    title={`${labelOf(c.key)} ${y} — ${Math.round(c.revenue)} MAD · ${Math.round(c.nights)} nuitées · ${pct(occ)} d'occupation`}
                    sx={{
                      width: '100%',
                      height: `${Math.max(2, (c.revenue / maxBar) * 92)}%`,
                      borderRadius: '3px 3px 0 0',
                      bgcolor: c.future ? 'transparent' : T.gold,
                      border: c.future ? `1.5px dashed ${T.goldSoft}` : 'none',
                      backgroundImage: c.future
                        ? `repeating-linear-gradient(45deg, ${T.goldSoft}, ${T.goldSoft} 3px, transparent 3px, transparent 7px)`
                        : 'none',
                    }}
                  />
                </Box>
                <Typography sx={{ fontSize: 10, color: T.ink2, mt: 0.5, fontWeight: 600 }}>
                  {labelOf(c.key)}
                </Typography>
                <Typography sx={{ fontSize: 9, color: T.ink3, lineHeight: 1.2 }}>
                  {showYear ? y : ''}
                </Typography>
                {/* L'occupation sous la barre : le revenu dit combien, elle
                    dit si le parc a tourne. Les deux se lisent ensemble. */}
                <Typography
                  sx={{ fontSize: 9.5, color: occ != null && occ >= 0.6 ? T.green : T.ink3, fontWeight: 700 }}
                >
                  {occ != null && c.nights > 0 ? pct(occ) : ''}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
        <Stack direction="row" sx={{ gap: 2, mt: 1.5, alignItems: 'center' }}>
          <Legend color={T.gold} label="Réalisé" />
          <Legend color={T.goldSoft} label="Au carnet (à venir)" dashed />
        </Stack>
      </Box>

      {/* Tableau a trois niveaux. */}
      <Box sx={{ bgcolor: T.card, border: `1px solid ${T.line}`, borderRadius: 2, overflow: 'hidden' }}>
        <Row
          header
          cells={['Portefeuille', 'Biens', 'Occupation', 'RevPAR', 'Revenu', 'Ménage OTA', 'Contrat']}
        />
        <Row
          bold
          cells={[
            'Total',
            String(totals.listings),
            pct(totals.occ),
            totals.revpar != null ? `${Math.round(totals.revpar)} MAD` : '—',
            `${money(totals.revenue)} MAD`,
            `${money(totals.cleaning)} MAD`,
            '—',
          ]}
        />
        {unitsByLandlord.map((g) => {
          const isOpen = open.has(g.id);
          const c = g.contract;
          const contractLabel = !c?.type
            ? '⚠ aucun'
            : c.type === 'fixed'
              ? `fixe ${c.fixedAmount ?? '?'}`
              : `${c.commissionPercent ?? '?'} %`;
          return (
            <Box key={g.id}>
              <Row
                onClick={() =>
                  setOpen((s) => {
                    const n = new Set(s);
                    if (n.has(g.id)) n.delete(g.id);
                    else n.add(g.id);
                    return n;
                  })
                }
                cells={[
                  `${isOpen ? '▼' : '▶'}  ${g.name}`,
                  String(g.listings),
                  pct(g.occ),
                  g.revpar != null ? `${Math.round(g.revpar)} MAD` : '—',
                  `${money(g.revenue)} MAD`,
                  `${money(g.cleaning)} MAD`,
                  contractLabel,
                ]}
              />
              {isOpen
                ? g.units.map((u) => (
                    <Row
                      key={u.listingId}
                      indent
                      cells={[
                        u.listingName,
                        '1',
                        pct(occupancy(u.nights, lastClosed ? [lastClosed.key] : [], { units: 1 })),
                        (() => {
                          const r = revpar(u.revenue, lastClosed?.key ?? null, 1);
                          return r != null ? `${Math.round(r)} MAD` : '—';
                        })(),
                        `${money(u.revenue)} MAD`,
                        `${money(u.cleaning)} MAD`,
                        '',
                      ]}
                    />
                  ))
                : null}

            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <Box
      sx={{
        flex: '1 1 180px',
        bgcolor: T.card,
        border: `1px solid ${accent ? T.gold : T.line}`,
        borderRadius: 2,
        p: 1.75,
      }}
    >
      <Typography sx={{ fontSize: 11, color: T.ink3, fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontSize: 24, fontWeight: 800, color: accent ? T.gold : T.ink, mt: 0.25 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: 10.5, color: T.ink3 }}>{hint}</Typography>
    </Box>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center' }}>
      <Box
        sx={{
          width: 18,
          height: 9,
          borderRadius: 0.4,
          bgcolor: dashed ? 'transparent' : color,
          backgroundImage: dashed
            ? `repeating-linear-gradient(45deg, ${color}, ${color} 3px, transparent 3px, transparent 7px)`
            : 'none',
          border: dashed ? `1px dashed ${color}` : 'none',
        }}
      />
      <Typography sx={{ fontSize: 11, color: T.ink3 }}>{label}</Typography>
    </Stack>
  );
}

function Row({
  cells,
  header,
  bold,
  indent,
  muted,
  onClick,
}: {
  cells: string[];
  header?: boolean;
  bold?: boolean;
  indent?: boolean;
  muted?: boolean;
  onClick?: () => void;
}) {
  return (
    <Stack
      direction="row"
      onClick={onClick}
      sx={{
        px: 2,
        py: header ? 1 : 1.25,
        gap: 1,
        alignItems: 'center',
        borderBottom: `1px solid ${T.line}`,
        bgcolor: header ? T.bg : 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { bgcolor: T.bg } : undefined,
      }}
    >
      {cells.map((c, i) => (
        <Typography
          key={`${c}-${i}`}
          sx={{
            flex: i === 0 ? '2 1 200px' : '1 1 90px',
            pl: i === 0 && indent ? 3 : 0,
            fontSize: header ? 11 : 12.5,
            fontWeight: header ? 700 : bold ? 800 : 500,
            color: muted ? T.ink3 : header ? T.ink3 : bold ? T.ink : T.ink2,
            textAlign: i === 0 ? 'left' : 'right',
            fontStyle: muted ? 'italic' : 'normal',
          }}
        >
          {c}
        </Typography>
      ))}
    </Stack>
  );
}
