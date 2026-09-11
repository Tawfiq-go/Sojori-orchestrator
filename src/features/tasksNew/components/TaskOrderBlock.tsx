import { useState } from 'react';
import { Box, Button, Chip, MenuItem, TextField, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { T } from '../../../components/calendar-v3/_shared';
import { PAYMENT_METHOD_OPTIONS, paymentStatusTone } from './taskPaymentMeta';
import tasksService from '../../../services/fulltaskTasksService';
import type { TaskListItem, TaskOrder, TaskPaymentMethod } from '../../../types/tasks.types';
import { extractHttpErrorMessage } from '../../../utils/extractHttpErrorMessage';

const KIND_TITLES: Record<TaskOrder['kind'], string> = {
  room_service: 'Commande room service',
  breakfast: 'Petit déjeuner inclus',
  transport: 'Navette',
  groceries: 'Courses',
  experience: 'Expérience',
  ambiance: 'Ambiance',
  cleaning: 'Ménage',
  support: 'Demande',
  other: 'Détail',
};

function money(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${Number(n).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ')} MAD`;
}

/**
 * Bloc « Commande » de la modale tâche : socle commun (articles, montant,
 * heure, paiement) puis les compléments du type (trajet, pax, vol, formule…).
 * Le staff enregistre ici payé / partiel / à régler sur place et le mode.
 */
export function TaskOrderBlock({
  task,
  onUpdated,
}: {
  task: TaskListItem;
  onUpdated?: () => void;
}) {
  const order = task.order;
  const [saving, setSaving] = useState(false);
  const [partialOpen, setPartialOpen] = useState(false);
  const [partialAmount, setPartialAmount] = useState('');
  const [method, setMethod] = useState<TaskPaymentMethod | ''>(order?.payment.method ?? '');

  if (!order) return null;
  const hasLines = order.items.length > 0;
  const hasMoney = order.payment.status !== 'none';
  if (!hasLines && !hasMoney && !order.detail && !order.startLabel) return null;

  const record = async (body: {
    status?: TaskOrder['payment']['status'];
    paidMad?: number | null;
    method?: TaskPaymentMethod | null;
  }) => {
    setSaving(true);
    try {
      await tasksService.updateTaskPayment(task._id, {
        ...body,
        ...(method && body.method === undefined ? { method } : {}),
      });
      toast.success('Paiement enregistré');
      setPartialOpen(false);
      onUpdated?.();
    } catch (e) {
      toast.error(extractHttpErrorMessage(e, 'Enregistrement impossible'));
    } finally {
      setSaving(false);
    }
  };

  const tone = paymentStatusTone(order.payment.status);

  return (
    <Box
      data-testid="task-order-block"
      sx={{
        border: `1px solid ${T.border}`,
        borderRadius: 1.5,
        p: 1.5,
        mb: 1.5,
        display: 'grid',
        gap: 1,
        bgcolor: T.bg1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.text }}>
          {KIND_TITLES[order.kind]}
        </Typography>
        {order.itemCount > 0 ? (
          <Typography sx={{ fontSize: 12, color: T.text3 }}>
            {order.itemCount} article{order.itemCount > 1 ? 's' : ''}
          </Typography>
        ) : null}
        {order.startLabel ? (
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text2, ml: 'auto' }}>
            ⏰ {order.startLabel}
          </Typography>
        ) : null}
      </Box>

      {order.detail ? (
        <Typography sx={{ fontSize: 12.5, color: T.text2 }}>{order.detail}</Typography>
      ) : null}

      {hasLines ? (
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.5 }}>
          {order.items.map((it, i) => (
            <Box
              component="li"
              key={`${it.label}-${i}`}
              sx={{ display: 'flex', gap: 1, alignItems: 'baseline', fontSize: 13 }}
            >
              <Typography sx={{ fontSize: 13, fontWeight: 700, minWidth: 28, color: T.text }}>
                {it.qty}×
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13, color: T.text }}>{it.label}</Typography>
                {it.options.length ? (
                  <Typography sx={{ fontSize: 11.5, color: T.text3 }}>
                    {it.options.join(' · ')}
                  </Typography>
                ) : null}
                {it.note ? (
                  <Typography sx={{ fontSize: 11.5, color: T.text3, fontStyle: 'italic' }}>
                    « {it.note} »
                  </Typography>
                ) : null}
              </Box>
              {it.unitPriceMad != null && it.unitPriceMad > 0 ? (
                <Typography sx={{ fontSize: 12.5, color: T.text2, whiteSpace: 'nowrap' }}>
                  {money(it.unitPriceMad * it.qty)}
                </Typography>
              ) : null}
            </Box>
          ))}
        </Box>
      ) : null}

      {hasMoney ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
            pt: 1,
            borderTop: `1px dashed ${T.border}`,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.text }}>
            Total {money(order.totalMad)}
          </Typography>
          <Chip
            size="small"
            label={order.payment.statusLabel}
            sx={{ bgcolor: tone.bg, color: tone.color, fontWeight: 700, height: 22 }}
          />
          <Chip
            size="small"
            variant="outlined"
            label={order.payment.methodLabel}
            sx={{ height: 22, fontWeight: 600 }}
          />
          {order.payment.dueMad != null && order.payment.dueMad > 0 ? (
            <Typography sx={{ fontSize: 12, color: T.warning, fontWeight: 700 }}>
              Reste {money(order.payment.dueMad)}
            </Typography>
          ) : null}
        </Box>
      ) : null}

      {hasMoney ? (
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            select
            size="small"
            label="Mode"
            value={method}
            onChange={(e) => setMethod(e.target.value as TaskPaymentMethod | '')}
            sx={{ minWidth: 150 }}
          >
            {PAYMENT_METHOD_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <Button
            size="small"
            variant="contained"
            color="success"
            disabled={saving || order.payment.status === 'paid'}
            onClick={() => void record({ status: 'paid', paidMad: order.totalMad ?? null })}
          >
            Payé
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={saving}
            onClick={() => setPartialOpen((v) => !v)}
          >
            Partiel…
          </Button>
          <Button
            size="small"
            variant="text"
            disabled={saving || order.payment.status === 'on_site'}
            onClick={() => void record({ status: 'on_site', paidMad: null })}
          >
            À régler sur place
          </Button>
          {partialOpen ? (
            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
              <TextField
                size="small"
                type="number"
                label="Encaissé (MAD)"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                slotProps={{ htmlInput: { min: 0, step: 10 } }}
                sx={{ width: 150 }}
                autoFocus
              />
              <Button
                size="small"
                variant="contained"
                disabled={saving || !(Number(partialAmount) > 0)}
                onClick={() => void record({ status: 'partial', paidMad: Number(partialAmount) })}
              >
                OK
              </Button>
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}
