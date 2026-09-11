import { useEffect, useState } from 'react';
import { Alert, Box, Chip, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import messagesService, { type RoomServiceCartRow } from '../services/messagesService';

const T = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  bg1: '#ffffff',
  bg3: '#f0eee8',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  border: 'rgba(20,17,10,0.07)',
};

function formatRelative(dateIso: string): string {
  const diffMs = Date.now() - new Date(dateIso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  return `il y a ${hours} h`;
}

export function RoomServiceCartsPage() {
  const [carts, setCarts] = useState<RoomServiceCartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    messagesService
      .getRoomServiceCarts()
      .then((rows) => {
        if (!cancelled) setCarts(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardWrapper hidePageHeader disableScopeGate>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
        Paniers room service en attente
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: T.text3, mb: 1.5 }}>
        Articles ajoutés côté voyageur, pas encore commandés — aucune tâche créée pour ces
        lignes. Un panier abandonné disparaît de lui-même après 24 h.
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={32} />
        </Box>
      ) : carts.length === 0 ? (
        <Paper
          sx={{
            p: 2.5,
            textAlign: 'center',
            border: `1px dashed ${T.border}`,
            borderRadius: 1.25,
            bgcolor: T.bg1,
          }}
        >
          <Typography sx={{ fontSize: 13, color: T.text3 }}>
            Aucun panier en attente pour le moment.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1}>
          {carts.map((cart) => (
            <Paper
              key={cart.reservationId}
              sx={{
                p: 1.5,
                border: `1px solid ${T.border}`,
                borderRadius: 1.25,
                bgcolor: T.bg1,
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 1, mb: 1 }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                    {cart.guestName || 'Voyageur'}
                  </Typography>
                  {cart.reservationCode ? (
                    <Chip
                      size="small"
                      label={cart.reservationCode}
                      sx={{ height: 20, fontSize: 10.5, bgcolor: T.bg3, color: T.text2 }}
                    />
                  ) : null}
                  <Typography sx={{ fontSize: 11, color: T.text3 }}>
                    maj {formatRelative(cart.updatedAt)}
                  </Typography>
                </Stack>
                <Typography
                  sx={{
                    fontFamily: 'ui-monospace, "SF Mono", monospace',
                    fontWeight: 800,
                    fontSize: 14,
                    color: T.primaryDeep,
                  }}
                >
                  {cart.totalMad} MAD
                </Typography>
              </Stack>
              <Stack spacing={0.5}>
                {cart.items.map((item, idx) => (
                  <Typography key={idx} sx={{ fontSize: 12.5, color: T.text }}>
                    {item.qty}× {item.dish}
                    {item.options.length ? ` — ${item.options.join(', ')}` : ''}
                    {item.note ? ` (${item.note})` : ''}
                    <Typography component="span" sx={{ fontSize: 11.5, color: T.text3 }}>
                      {' '}
                      · {item.unitPriceMad} MAD/u
                    </Typography>
                  </Typography>
                ))}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </DashboardWrapper>
  );
}

export default RoomServiceCartsPage;
