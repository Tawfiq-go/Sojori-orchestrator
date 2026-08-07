// ════════════════════════════════════════════════════════════════════════════
// PUBLICATION VERS LE CALENDRIER — le seul bloc de l'UI à effet RÉEL
// ────────────────────────────────────────────────────────────────────────────
// Tout le reste du module calcule et affiche. Ici, on change les prix que
// voient les voyageurs sur Airbnb et Booking.
//
// DEUX ÉTATS DISTINCTS, volontairement pas fusionnés :
//   - « Calcul nocturne » (shadowEnabled) : on calcule et on garde.
//   - « Publication »     (publishEnabled) : on envoie vraiment.
// Les fusionner rendrait l'activation réelle trop facile à déclencher par
// inadvertance — ce sont deux décisions de nature différente.
//
// Le bloc n'apparaît PAS si le propriétaire n'est pas autorisé : inutile de
// montrer une commande qu'on ne peut pas utiliser. Le backend refuse de toute
// façon (403) — l'UI ne fait que ne pas tenter.
// ════════════════════════════════════════════════════════════════════════════
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  type PricingV2PushEligibility,
  fetchPricingV2PushEligibility,
  pushPricingV2ToCalendar,
} from './api';
import { T, cardSx, kickerSx } from './tokens';

export default function PublishPanel({
  listingId,
  publishEnabled,
  onTogglePublish,
  busy,
}: {
  listingId: string;
  publishEnabled: boolean;
  onTogglePublish: (next: boolean) => void;
  busy?: boolean;
}) {
  const [elig, setElig] = useState<PricingV2PushEligibility | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchPricingV2PushEligibility(listingId)
      .then((r) => {
        if (alive) setElig(r.data);
      })
      .catch(() => {
        // Éligibilité indisponible → on considère NON autorisé. Échouer en
        // fermant : mieux vaut masquer la commande que la proposer à tort.
        if (alive) setElig(null);
      });
    return () => {
      alive = false;
    };
  }, [listingId]);

  // Propriétaire non autorisé (ou éligibilité inconnue) → aucun bloc.
  if (!elig?.allowed) return null;

  const doPush = async () => {
    setConfirm(false);
    setPushing(true);
    setError(null);
    setOutcome(null);
    try {
      const r = await pushPricingV2ToCalendar(listingId);
      if (!r.data.success) {
        setError(r.data.error ?? 'publication refusée');
        return;
      }
      const skipped = r.data.skippedBooked ?? 0;
      setOutcome(
        `${r.data.pushed ?? 0} nuits publiées` +
          (skipped > 0 ? ` · ${skipped} intouchées (vendues ou fermées)` : ''),
      );
    } catch (e) {
      const msg =
        (e as { response?: { data?: { error?: string } } }).response?.data?.error ??
        (e instanceof Error ? e.message : String(e));
      setError(msg);
    } finally {
      setPushing(false);
    }
  };

  return (
    <Box sx={{ ...cardSx, borderColor: publishEnabled ? T.goldPure : T.line }}>
      <Typography sx={{ ...kickerSx, mb: 1, color: publishEnabled ? T.gold : T.mut }}>
        PUBLICATION VERS VOS CANAUX
      </Typography>

      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: 13.5, color: T.ink }}>
          {publishEnabled ? 'Activée' : 'Désactivée'}
        </Typography>
        <Switch
          checked={publishEnabled}
          disabled={busy || pushing}
          onChange={(e) => onTogglePublish(e.target.checked)}
        />
      </Stack>

      {publishEnabled ? (
        <Button
          size="small"
          variant="outlined"
          disabled={busy || pushing}
          onClick={() => setConfirm(true)}
          sx={{
            mt: 1,
            borderColor: T.line,
            color: T.ink,
            '&:hover': { borderColor: T.ink, bgcolor: 'transparent' },
          }}
        >
          {pushing ? 'Publication en cours…' : 'Publier maintenant'}
        </Button>
      ) : null}

      {outcome ? (
        <Alert severity="success" sx={{ mt: 1.5, fontSize: 12.5 }}>
          {outcome}
        </Alert>
      ) : null}
      {error ? (
        <Alert severity="error" sx={{ mt: 1.5, fontSize: 12.5 }}>
          {error}
        </Alert>
      ) : null}

      {/* ── Confirmation ── L'action est réversible (on peut repasser en manuel)
          mais entre-temps les prix auront changé sur Airbnb et Booking. On dit
          ce qui va se passer, et ce qui ne bougera PAS. */}
      <Dialog open={confirm} onClose={() => setConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 750, fontSize: 16, color: T.ink }}>
          Publier vers vos canaux de vente ?
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: T.ink, lineHeight: 1.6 }}>
            Les prix des <b>{elig.horizonDays} prochains jours</b> vont être envoyés au calendrier,
            puis propagés à Airbnb, Booking et vos autres canaux.
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: T.ink2, mt: 1.5, lineHeight: 1.6 }}>
            Les nuits déjà <b>vendues</b> ou <b>fermées</b> reçoivent aussi le nouveau prix (utile en
            cas d'annulation), mais leur <b>disponibilité ne change jamais</b>. Les nuits dont vous
            avez <b>fixé le prix à la main</b> ne sont pas touchées.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirm(false)} sx={{ color: T.mut }}>
            Annuler
          </Button>
          <Button
            onClick={() => void doPush()}
            variant="contained"
            sx={{
              bgcolor: T.gold,
              color: '#FFF',
              '&:hover': { bgcolor: T.goldPure },
            }}
          >
            Publier
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
