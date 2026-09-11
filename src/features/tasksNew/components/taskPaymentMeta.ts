import { T } from '../../../components/calendar-v3/_shared';
import type { TaskOrder, TaskPaymentMethod } from '../../../types/tasks.types';

export const PAYMENT_METHOD_OPTIONS: Array<{ value: TaskPaymentMethod; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'card_tpe', label: 'Carte TPE' },
  { value: 'card', label: 'Carte en ligne' },
  { value: 'room_charge', label: 'Sur la note' },
  { value: 'transfer', label: 'Virement' },
];

/** Couleur du statut de paiement — la même dans la liste et la modale. */
export function paymentStatusTone(status?: TaskOrder['payment']['status'] | null): {
  bg: string;
  color: string;
} {
  if (status === 'paid') return { bg: 'rgba(10,143,94,0.14)', color: T.success };
  if (status === 'partial') return { bg: 'rgba(196,101,6,0.16)', color: T.warning };
  if (status === 'pending_online') return { bg: 'rgba(59,130,246,0.12)', color: '#1d4ed8' };
  if (status === 'on_site') return { bg: 'rgba(196,101,6,0.12)', color: T.warning };
  return { bg: 'rgba(20,17,10,0.06)', color: T.text3 };
}
