import { useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { T } from '../../../components/calendar-v3/_shared';
import { useAuth } from '../../../hooks/useAuth';
import tasksService from '../../../services/fulltaskTasksService';
import type { TaskListItem, TaskOrder } from '../../../types/tasks.types';
import { extractHttpErrorMessage } from '../../../utils/extractHttpErrorMessage';

function money(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${Number(n).toLocaleString('fr-FR').replace(/[  ]/g, ' ')} MAD`;
}

function shortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Ce que le client recevra quand le staff clique Accepter. */
export function partnerAcceptOutcomeHint(order: TaskOrder): string {
  const pay = order.payment;
  if (order.totalMad == null || order.totalMad <= 0) return 'le client reçoit la confirmation';
  if (pay.status === 'paid' || pay.status === 'none') return 'le client reçoit la confirmation (déjà réglé)';
  if (pay.split?.onlinePaid) return `le client reçoit la confirmation · reste ${money(pay.split.remainderMad)} sur place`;
  if (pay.method === 'card' || pay.method === 'transfer') {
    const amount = pay.split ? pay.split.onlineMad : order.totalMad;
    return pay.split
      ? `le client reçoit le lien de paiement (acompte ${money(amount)}) · reste ${money(pay.split.remainderMad)} sur place`
      : `le client reçoit le lien de paiement (${money(amount)})`;
  }
  return `le client reçoit la confirmation · ${money(pay.dueMad ?? order.totalMad)} à régler sur place`;
}

function userDisplayName(user: unknown): string {
  const u = (user ?? {}) as Record<string, unknown>;
  const full = [u.firstName, u.lastName].filter((v) => typeof v === 'string' && v).join(' ');
  return full || (typeof u.name === 'string' ? u.name : '') || (typeof u.email === 'string' ? u.email : '');
}

/**
 * Bloc « Partenaire » de la modale : le staff a appelé le chauffeur ou le
 * prestataire et enregistre sa réponse. Accepter → la tâche passe confirmée
 * et le client reçoit le lien de paiement (carte) ou la confirmation
 * « à régler sur place ». Refuser → annulation + message au client.
 */
export function TaskPartnerBlock({
  task,
  onUpdated,
}: {
  task: TaskListItem;
  onUpdated?: () => void;
}) {
  const { user } = useAuth();
  const order = task.order;
  const partner = order?.partner;
  const [busy, setBusy] = useState<'accept' | 'refuse' | null>(null);
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [price, setPrice] = useState('');

  if (!order || !partner || partner.status === 'none') return null;

  const needsPrice = order.totalMad == null || order.totalMad <= 0;
  const byName = userDisplayName(user);

  const accept = async () => {
    const quoted = needsPrice ? Number(price.replace(',', '.')) : undefined;
    if (needsPrice && !(quoted && quoted > 0)) {
      toast.error('Indiquez le prix confirmé par le partenaire');
      return;
    }
    setBusy('accept');
    try {
      const guest = await tasksService.partnerAccept(task._id, {
        ...(quoted ? { quotedPriceMad: Math.round(quoted) } : {}),
        byName,
      });
      const what =
        guest?.plan === 'link'
          ? guest.paymentLinkSent
            ? `lien de paiement envoyé au client${guest.amountMad ? ` (${money(guest.amountMad)})` : ''}`
            : 'client prévenu, lien de paiement non envoyé (voir Runtime logs)'
          : guest?.confirmationSent
            ? 'confirmation envoyée au client'
            : 'client non prévenu';
      toast.success(`Partenaire OK · ${what}`);
      onUpdated?.();
    } catch (e) {
      toast.error(extractHttpErrorMessage(e, 'Acceptation impossible'));
    } finally {
      setBusy(null);
    }
  };

  const refuse = async () => {
    setBusy('refuse');
    try {
      await tasksService.partnerRefuse(task._id, { reason: reason.trim(), byName });
      toast.success('Refus enregistré · client prévenu, commande annulée');
      setRefuseOpen(false);
      onUpdated?.();
    } catch (e) {
      toast.error(extractHttpErrorMessage(e, 'Refus impossible'));
    } finally {
      setBusy(null);
    }
  };

  const tone =
    partner.status === 'accepted'
      ? { bg: 'rgba(34,197,94,0.10)', color: '#15803d', border: 'rgba(34,197,94,0.35)' }
      : partner.status === 'refused'
        ? { bg: 'rgba(239,68,68,0.10)', color: '#b91c1c', border: 'rgba(239,68,68,0.35)' }
        : { bg: 'rgba(245,158,11,0.10)', color: '#b45309', border: 'rgba(245,158,11,0.40)' };

  return (
    <Box
      data-testid="task-partner-block"
      sx={{
        border: `1px solid ${tone.border}`,
        background: tone.bg,
        borderRadius: 1.5,
        p: 1.5,
        mb: 1.5,
        display: 'grid',
        gap: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: tone.color }}>
          🤝 {partner.label}
        </Typography>
        {partner.status === 'accepted' && partner.acceptedAt ? (
          <Typography sx={{ fontSize: 12, color: T.textMuted }}>
            le {shortDate(partner.acceptedAt)}
            {partner.guestNotifiedAt ? ' · client prévenu' : ' · client non prévenu'}
          </Typography>
        ) : null}
        {partner.status === 'refused' && partner.refusedAt ? (
          <Typography sx={{ fontSize: 12, color: T.textMuted }}>le {shortDate(partner.refusedAt)}</Typography>
        ) : null}
      </Box>

      {partner.status === 'pending' ? (
        <>
          <Typography sx={{ fontSize: 12.5, color: T.text }}>
            Appelez le partenaire, puis confirmez : {partnerAcceptOutcomeHint(order)}.
            {partner.providerMode ? ' Le partenaire peut aussi répondre sur WhatsApp.' : ''}
          </Typography>
          {needsPrice ? (
            <TextField
              size="small"
              label="Prix confirmé par le partenaire (MAD)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              inputProps={{ inputMode: 'decimal', 'data-testid': 'partner-price' }}
              sx={{ maxWidth: 260 }}
            />
          ) : null}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              size="small"
              variant="contained"
              color="success"
              disabled={busy !== null}
              onClick={accept}
              data-testid="partner-accept"
            >
              ✅ Accepter
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={busy !== null}
              onClick={() => setRefuseOpen((v) => !v)}
              data-testid="partner-refuse"
            >
              Refuser…
            </Button>
          </Box>
          {refuseOpen ? (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                size="small"
                label="Motif (interne)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                sx={{ minWidth: 220 }}
              />
              <Button size="small" variant="contained" color="error" disabled={busy !== null} onClick={refuse}>
                Confirmer le refus
              </Button>
            </Box>
          ) : null}
        </>
      ) : null}
    </Box>
  );
}
