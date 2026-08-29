import { useEffect, useState } from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { fetchReservationRevenue, type ReservationRevenue } from '../../services/revenueApi';

/**
 * Extras d'un séjour, groupés par département USALI.
 *
 * Agrège deux provenances dans une seule vue : les consommations saisies
 * dans le PMS (room service, excursions, blanchisserie) et celles créées
 * par Sojori (mini-bar déclaré au WhatsApp staff). Le lecteur voit d'où
 * vient chaque ligne.
 *
 * Le bloc se masque quand il n'y a aucun extra — la majorité des
 * réservations courte durée n'en ont pas.
 */

const T = {
  primaryDeep: '#876119',
  bg1: '#ffffff',
  bg2: '#fafaf7',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  border: 'rgba(20,17,10,0.08)',
  sojoriTint: 'rgba(184,133,26,0.12)',
};

function money(n: number, currency = 'MAD'): string {
  return `${Math.round(n).toLocaleString('fr-FR')} ${currency}`;
}

/** Provenance affichée : distingue une saisie Sojori d'une ligne du PMS. */
function sourceLabel(source: string): string | null {
  if (source === 'minibar') return 'Sojori';
  if (!source || source === 'mews') return null;
  return source;
}

export function ReservationExtrasPanel({ reservationId }: { reservationId?: string }) {
  const [data, setData] = useState<ReservationRevenue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reservationId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchReservationRevenue(reservationId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reservationId]);

  // Rien à montrer tant qu'on charge, ou si le séjour n'a aucun extra.
  if (loading || !data || !data.groups?.length || data.extrasTotal <= 0) return null;

  return (
    <Paper
      sx={{
        border: `1px solid ${T.border}`,
        borderRadius: 1.75,
        bgcolor: T.bg1,
        overflow: 'hidden',
        mb: 1.5,
      }}
    >
      <Stack
        direction="row"
        sx={{
          px: 2,
          py: 1.25,
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: T.bg2,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 800,
            color: T.text2,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          🧾 Extras du séjour
        </Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.primaryDeep }}>
          {money(data.extrasTotal, data.currency)}
        </Typography>
      </Stack>

      <Box sx={{ p: 2 }}>
        {data.groups.map((group) => (
          <Box key={group.department} sx={{ mb: 1.75, '&:last-of-type': { mb: 0 } }}>
            <Stack
              direction="row"
              sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 0.5 }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text }}>
                {group.label}
              </Typography>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text2 }}>
                {money(group.total, data.currency)}
              </Typography>
            </Stack>

            {group.lines.map((line) => {
              const origin = sourceLabel(line.source);
              return (
                <Stack
                  key={line.id}
                  direction="row"
                  sx={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 0.4,
                    pl: 1.25,
                    gap: 1,
                  }}
                >
                  <Stack
                    direction="row"
                    sx={{ alignItems: 'center', gap: 0.75, minWidth: 0, flex: 1 }}
                  >
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: T.text3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={line.name}
                    >
                      {line.name}
                    </Typography>
                    {origin ? (
                      <Chip
                        size="small"
                        label={origin}
                        sx={{
                          height: 16,
                          fontSize: 9,
                          fontWeight: 700,
                          bgcolor: T.sojoriTint,
                          color: T.primaryDeep,
                          '& .MuiChip-label': { px: 0.75 },
                        }}
                      />
                    ) : null}
                  </Stack>
                  <Typography
                    sx={{ fontSize: 12, color: T.text2, whiteSpace: 'nowrap', fontWeight: 600 }}
                  >
                    {money(line.gross, line.currency)}
                  </Typography>
                </Stack>
              );
            })}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
