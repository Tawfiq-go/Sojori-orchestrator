import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Chip, CircularProgress, Paper, Snackbar, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../../components/DashboardWrapper';
import {
  assignRoom,
  fetchReceptionRack,
  type RackRoom,
  type RackStay,
  type ReceptionRack,
} from '../../services/revenueApi';

/**
 * Rack d'affectation — l'écran du comptoir.
 *
 * Chambres en lignes, jours en colonnes, séjours posés dessus. Le geste
 * central est le déplacement : on choisit un séjour, on touche une chambre.
 * Tout le reste de l'écran existe pour rendre ce geste sûr — voir le trou,
 * voir le conflit avant de valider.
 *
 * Le régime d'écriture vient de l'établissement, pas de l'interface : quand
 * le PMS est maître, la route refuse l'affectation et l'écran l'annonce
 * plutôt que de laisser essayer.
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
  free: '#f7f8f5',
  warn: '#9a6a24',
  neg: '#9a3b2c',
};

const DAY_MS = 86_400_000;

/** Ce que le motif dit à la réception, en trois mots. */
const BLOCK_LABEL: Record<string, string> = {
  out_of_service: 'Hors service',
  house_guest: 'Invité maison',
  unclassified: 'Motif non saisi',
};
const NF = new Intl.NumberFormat('fr-FR');

const DOW = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
const DAY_LONG = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const parse = (s: string) => new Date(`${s}T00:00:00Z`);

/** Les jours de la fenêtre, pour l'en-tête et le calcul des positions. */
function buildDays(from: string, count: number): Date[] {
  const start = parse(from);
  return Array.from({ length: count }, (_, i) => new Date(start.getTime() + i * DAY_MS));
}

/** Position d'un séjour dans la grille, en index de colonnes. */
function span(stay: RackStay, days: Date[]): { start: number; width: number } | null {
  if (!stay.arrivalDate || !stay.departureDate || !days.length) return null;
  const a = parse(stay.arrivalDate).getTime();
  const d = parse(stay.departureDate).getTime();
  const first = days[0].getTime();
  const last = days[days.length - 1].getTime() + DAY_MS;
  if (d <= first || a >= last) return null;
  const start = Math.max(0, Math.round((a - first) / DAY_MS));
  // La nuit de départ n'est pas occupée : la barre s'arrête la veille.
  const endIdx = Math.min(days.length, Math.round((d - first) / DAY_MS));
  return { start, width: Math.max(1, endIdx - start) };
}

export function ReceptionRackPage() {
  const [rack, setRack] = useState<ReceptionRack | null>(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  // 30 jours par défaut : les séjours montent à 15 nuits, une fenêtre
  // de 7 les couperait en deux. C'est aussi le standard hôtelier.
  const [days, setDays] = useState(30);
  const [picked, setPicked] = useState<RackStay | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const from = useMemo(() => ymd(new Date(Date.now() + offset * DAY_MS)), [offset]);

  const load = useCallback(
    () => fetchReceptionRack({ from, days }).then((d) => setRack(d)),
    [from, days],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchReceptionRack({ from, days })
      .then((d) => {
        if (!cancelled) setRack(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, days]);

  const grid = useMemo(() => (rack ? buildDays(rack.from, rack.days) : []), [rack]);

  /** Pose le séjour choisi sur une chambre, en expliquant tout refus. */
  const place = useCallback(
    async (room: RackRoom, force = false): Promise<void> => {
      if (!picked || busy) return;
      setBusy(true);
      const r = await assignRoom({ reservationId: picked.id, roomId: room.id, force });
      setBusy(false);

      if (r.ok) {
        setToast(`${picked.guestName} → ${room.name}`);
        setPicked(null);
        void load();
        return;
      }

      if (r.error === 'pms_is_master') {
        setToast(r.message ?? 'Cet établissement est piloté par son PMS.');
        return;
      }
      if (r.error === 'room_occupied') {
        const c = r.conflicts?.[0];
        setToast(
          c
            ? `${room.name} est occupée : ${c.guestName} du ${c.from} au ${c.to}.`
            : `${room.name} est déjà occupée sur la période.`,
        );
        return;
      }
      if (r.error === 'capacity_exceeded' && r.forceable) {
        // La réception sait parfois mieux que la fiche technique : on
        // demande confirmation plutôt que d'interdire.
        const ok = window.confirm(
          `${r.guests} personnes pour une capacité de ${r.capacity}. Affecter quand même ?`,
        );
        if (ok) await place(room, true);
        return;
      }
      setToast(r.message ?? `Affectation refusée (${r.error}).`);
    },
    [picked, busy, load],
  );

  if (loading && !rack) {
    return (
      <DashboardWrapper breadcrumb={['Réception', 'Rack d’affectation']}>
        <Stack sx={{ alignItems: 'center', py: 10 }}>
          <CircularProgress size={26} sx={{ color: T.gold }} />
        </Stack>
      </DashboardWrapper>
    );
  }

  if (!rack) {
    return (
      <DashboardWrapper breadcrumb={['Réception', 'Rack d’affectation']}>
        <Paper variant="outlined" sx={{ p: 4, border: `1px solid ${T.rule}`, borderRadius: 0.5 }}>
          <Typography sx={{ fontSize: 14, color: T.ink2 }}>
            Rack indisponible. Vérifiez que l'établissement a des chambres déclarées.
          </Typography>
        </Paper>
      </DashboardWrapper>
    );
  }

  const { listing, unassigned, rooms } = rack;
  const colWidth = 46;

  return (
    <DashboardWrapper breadcrumb={['Réception', 'Rack d’affectation']}>
      <Stack
        direction="row"
        sx={{
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          pb: 1.5,
          mb: 2,
          borderBottom: `2px solid ${T.ink}`,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: T.ink3,
            }}
          >
            Réception
          </Typography>
          <Typography sx={{ fontSize: 24, fontWeight: 700, color: T.ink, lineHeight: 1.15 }}>
            Rack d’affectation
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.ink3, mt: 0.3 }}>
            {DAY_LONG.format(parse(rack.from))} → {DAY_LONG.format(parse(rack.to))} ·{' '}
            {listing.name}
          </Typography>
        </Box>
        <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
          <Chip
            label="◀"
            onClick={() => setOffset((o) => o - 7)}
            sx={{ height: 28, fontSize: 12, bgcolor: T.sheetAlt, border: `1px solid ${T.rule}` }}
          />
          <Chip
            label="Aujourd’hui"
            onClick={() => setOffset(0)}
            sx={{
              height: 28,
              fontSize: 12.5,
              fontWeight: offset === 0 ? 700 : 500,
              bgcolor: offset === 0 ? `${T.goldSoft}22` : T.sheetAlt,
              color: offset === 0 ? T.gold : T.ink2,
              border: `1px solid ${offset === 0 ? T.goldSoft : T.rule}`,
            }}
          />
          <Chip
            label="▶"
            onClick={() => setOffset((o) => o + 7)}
            sx={{ height: 28, fontSize: 12, bgcolor: T.sheetAlt, border: `1px solid ${T.rule}` }}
          />
          <Box sx={{ width: 8 }} />
          {[7, 14, 30, 60].map((d) => (
            <Chip
              key={d}
              label={`${d} j`}
              onClick={() => setDays(d)}
              sx={{
                height: 28,
                fontSize: 12.5,
                fontWeight: days === d ? 700 : 500,
                bgcolor: days === d ? `${T.goldSoft}22` : T.sheetAlt,
                color: days === d ? T.gold : T.ink2,
                border: `1px solid ${days === d ? T.goldSoft : T.rule}`,
              }}
            />
          ))}
        </Stack>
      </Stack>

      {/* Le régime : porté par l'établissement, annoncé sans détour */}
      <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.85, flexShrink: 0 }}>
          <Box
            sx={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              bgcolor: listing.pmsIsMaster ? T.accent : T.gold,
            }}
          />
          <Typography
            sx={{ fontSize: 13, fontWeight: 700, color: listing.pmsIsMaster ? T.accent : T.gold }}
          >
            {listing.pmsIsMaster ? 'Le PMS est maître' : 'Sojori est maître'}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: 12.5, color: T.ink2, maxWidth: '68ch', lineHeight: 1.55 }}>
          {listing.pmsIsMaster
            ? 'Le rack montre l’occupation. L’affectation se fait dans le PMS — elle est refusée ici pour éviter toute divergence.'
            : 'Le rack écrit. L’affectation part directement vers les canaux.'}
        </Typography>
      </Stack>

      {/* Les séjours en attente de chambre */}
      {unassigned.length ? (
        <Paper
          variant="outlined"
          sx={{
            border: `1px solid ${T.rule}`,
            borderLeft: `2px solid ${T.warn}`,
            borderRadius: 0.5,
            p: 2,
            mb: 2.5,
          }}
        >
          <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1.5, mb: 1.25 }}>
            <Typography
              sx={{
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: T.warn,
              }}
            >
              Sans chambre
            </Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: T.warn }}>
              {unassigned.length}
            </Typography>
            {!listing.pmsIsMaster ? (
              <Typography sx={{ fontSize: 11.5, color: T.ink3 }}>
                Choisissez un séjour, puis une chambre libre.
              </Typography>
            ) : null}
          </Stack>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            {unassigned.map((s) => {
              const on = picked?.id === s.id;
              return (
                <Box
                  key={s.id}
                  onClick={() => (listing.pmsIsMaster ? undefined : setPicked(on ? null : s))}
                  sx={{
                    p: '9px 12px',
                    borderRadius: 0.5,
                    border: `1px solid ${on ? T.gold : T.rule}`,
                    bgcolor: on ? `${T.goldSoft}18` : T.sheet,
                    cursor: listing.pmsIsMaster ? 'default' : 'pointer',
                    minWidth: 190,
                  }}
                >
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.ink }}>
                    {s.guestName}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: T.ink3, mt: 0.2 }}>
                    {s.arrivalDate} → {s.departureDate} · {s.nights} n · {s.guests} p
                  </Typography>
                  <Stack direction="row" sx={{ gap: 0.5, mt: 0.6, flexWrap: 'wrap' }}>
                    <Box sx={{ fontSize: 10, color: T.ink3 }}>{s.channel}</Box>
                    {!s.paid ? (
                      <Box sx={{ fontSize: 10, fontWeight: 600, color: T.neg }}>non soldé</Box>
                    ) : null}
                    {!s.registrationDone ? (
                      <Box sx={{ fontSize: 10, fontWeight: 600, color: T.warn }}>police ✕</Box>
                    ) : null}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Paper>
      ) : null}

      {/* La grille */}
      <Paper
        variant="outlined"
        sx={{ border: `1px solid ${T.rule}`, borderRadius: 0.5, overflowX: 'auto' }}
      >
        <Box sx={{ minWidth: 220 + grid.length * colWidth }}>
          <Stack direction="row" sx={{ bgcolor: T.sheetAlt, borderBottom: `1px solid ${T.rule}` }}>
            <Box
              sx={{
                width: 220,
                flexShrink: 0,
                p: '8px 12px',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '.09em',
                textTransform: 'uppercase',
                color: T.ink3,
              }}
            >
              {rooms.length} chambres
            </Box>
            {grid.map((d) => {
              const we = [0, 6].includes(d.getUTCDay());
              return (
                <Box
                  key={d.toISOString()}
                  sx={{
                    width: colWidth,
                    flexShrink: 0,
                    textAlign: 'center',
                    py: 0.75,
                    borderLeft: `1px solid ${T.ruleSoft}`,
                    bgcolor: we ? T.free : 'transparent',
                  }}
                >
                  <Typography sx={{ fontSize: 9.5, color: T.ink3, textTransform: 'uppercase' }}>
                    {DOW.format(d).replace('.', '')}
                  </Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: T.ink2 }}>
                    {d.getUTCDate()}
                  </Typography>
                </Box>
              );
            })}
          </Stack>

          {rooms.map((room) => {
            const selectable = Boolean(picked) && !listing.pmsIsMaster;
            return (
              <Stack
                key={room.id}
                direction="row"
                onClick={() => (selectable ? void place(room) : undefined)}
                sx={{
                  borderBottom: `1px solid ${T.ruleSoft}`,
                  cursor: selectable ? 'pointer' : 'default',
                  '&:hover': selectable ? { bgcolor: `${T.goldSoft}12` } : {},
                  '&:last-of-type': { borderBottom: 'none' },
                }}
              >
                <Box sx={{ width: 220, flexShrink: 0, p: '10px 12px' }}>
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
                    <Typography
                      sx={{ fontSize: 13, fontWeight: 600, color: room.enabled ? T.ink : T.ink3 }}
                    >
                      {room.name}
                    </Typography>
                    {!room.enabled ? (
                      <Box
                        sx={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: '.05em',
                          px: 0.5,
                          py: '1px',
                          borderRadius: '2px',
                          bgcolor: `${T.ink3}1e`,
                          color: T.ink3,
                        }}
                      >
                        OOO
                      </Box>
                    ) : null}
                  </Stack>
                  <Typography sx={{ fontSize: 10.5, color: T.ink3, mt: 0.15 }}>
                    {room.roomTypeName ?? '—'}
                    {room.capacity ? ` · ${room.capacity} couch.` : ''}
                  </Typography>
                </Box>

                <Box sx={{ position: 'relative', flex: 1, minHeight: 52 }}>
                  <Stack direction="row" sx={{ position: 'absolute', inset: 0 }}>
                    {grid.map((d) => (
                      <Box
                        key={d.toISOString()}
                        sx={{
                          width: colWidth,
                          flexShrink: 0,
                          borderLeft: `1px solid ${T.ruleSoft}`,
                          bgcolor: [0, 6].includes(d.getUTCDay()) ? T.free : 'transparent',
                        }}
                      />
                    ))}
                  </Stack>

                  {/* Immobilisations : une chambre retirée de la vente doit
                      se voir AVEC son motif. Une ligne vide se lit « libre »,
                      ce qui est exactement l'erreur à éviter. */}
                  {room.blocks.map((b) => {
                    const p = span(
                      { arrivalDate: b.from, departureDate: b.to } as RackStay,
                      grid,
                    );
                    if (!p) return null;
                    const oos = b.category === 'out_of_service';
                    const tint = oos ? T.ink3 : T.gold;
                    return (
                      <Box
                        key={`b-${b.from}-${b.reason}`}
                        title={`${BLOCK_LABEL[b.category] ?? b.category} · ${b.reason} · ${b.from} → ${b.to}`}
                        sx={{
                          position: 'absolute',
                          left: p.start * colWidth + 2,
                          width: p.width * colWidth - 4,
                          top: 8,
                          height: 36,
                          borderRadius: 0.5,
                          border: `1px dashed ${tint}`,
                          backgroundImage: `repeating-linear-gradient(45deg, ${tint}26, ${tint}26 4px, transparent 4px, transparent 8px)`,
                          px: 0.85,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          pointerEvents: 'none',
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: oos ? T.ink2 : T.gold,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {b.reason || BLOCK_LABEL[b.category]}
                        </Typography>
                        <Typography sx={{ fontSize: 9.5, color: T.ink3, whiteSpace: 'nowrap' }}>
                          {BLOCK_LABEL[b.category] ?? ''}
                        </Typography>
                      </Box>
                    );
                  })}

                  {room.stays.map((s) => {
                    const p = span(s, grid);
                    if (!p) return null;
                    const alert = !s.paid || !s.registrationDone;
                    return (
                      <Box
                        key={s.id}
                        title={`${s.guestName} · ${s.arrivalDate} → ${s.departureDate} · ${s.guests} pers.${s.amount ? ` · ${NF.format(s.amount)} MAD` : ''}`}
                        sx={{
                          position: 'absolute',
                          left: p.start * colWidth + 2,
                          width: p.width * colWidth - 4,
                          top: 8,
                          height: 36,
                          borderRadius: 0.5,
                          bgcolor: `${T.accent}1c`,
                          border: `1px solid ${alert ? T.warn : T.accent}`,
                          px: 0.85,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: T.ink,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {s.guestName}
                        </Typography>
                        <Typography sx={{ fontSize: 9.5, color: T.ink3, whiteSpace: 'nowrap' }}>
                          {s.nights} n · {s.guests} p{alert ? ' · ⚠' : ''}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Stack>
            );
          })}
        </Box>
      </Paper>

      {picked ? (
        <Typography sx={{ fontSize: 12.5, color: T.gold, mt: 1.5, fontWeight: 600 }}>
          {picked.guestName} sélectionné — touchez une chambre pour l’affecter.
        </Typography>
      ) : null}

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </DashboardWrapper>
  );
}
