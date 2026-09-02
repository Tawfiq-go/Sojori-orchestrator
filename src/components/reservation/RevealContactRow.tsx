import { CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import apiClient from '../../services/apiClient';

interface Props {
  label: string;
  reservationId: string;
  field: 'phone' | 'guestEmail';
}

/**
 * Ligne « Email » / « Téléphone » avec révélation à la demande.
 *
 * Le dashboard ne reçoit plus les coordonnées : elles sont demandées une par
 * une, et chaque consultation est journalisée côté serveur (qui, quelle
 * réservation, quand). C'est la trace qui manquait lors de l'incident du
 * 2026-09-01, où l'on n'a pas pu établir qui avait accédé aux coordonnées des
 * voyageurs démarchés.
 *
 * Une valeur révélée n'est gardée qu'en mémoire du composant : elle disparaît
 * au changement de vue, et une nouvelle consultation laisse une nouvelle trace.
 */
export default function RevealContactRow({ label, reservationId, field }: Props) {
  const [value, setValue] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reveal = async () => {
    if (busy || value) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await apiClient.post(
        `/api/v1/reservations/${reservationId}/reveal-contact`,
        { field },
      );
      setValue(data?.value || null);
      if (!data?.value) setError('Non renseigné');
    } catch (e: any) {
      const code = e?.response?.data?.error;
      // Le serveur exige un second facteur récent : le dire clairement plutôt
      // que d'afficher une erreur technique.
      setError(
        code === 'mfa_required'
          ? 'Reconnectez-vous pour afficher'
          : code === 'no_value'
            ? 'Non renseigné'
            : 'Indisponible',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', py: 0.6 }}>
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{label}</Typography>

      {value ? (
        <Typography sx={{ fontSize: 12.75, fontWeight: 500, textAlign: 'right' }}>
          {value}
        </Typography>
      ) : busy ? (
        <CircularProgress size={13} />
      ) : error ? (
        <Typography sx={{ fontSize: 12, color: 'text.disabled', fontStyle: 'italic' }}>
          {error}
        </Typography>
      ) : (
        <Tooltip title="Cet accès est enregistré">
          <Typography
            component="button"
            type="button"
            onClick={reveal}
            sx={{
              fontSize: 12.5, fontWeight: 600, border: 0, bgcolor: 'transparent',
              cursor: 'pointer', color: 'primary.main', p: 0,
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Afficher
          </Typography>
        </Tooltip>
      )}
    </Stack>
  );
}
