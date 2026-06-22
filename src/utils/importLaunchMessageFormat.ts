import type { ScheduledOrchestrationMessage } from '../features/taskHub/staff-design/types';

const REF_LABELS: Record<string, string> = {
  reservation_date: 'Réservation créée',
  check_in: 'Arrivée (check-in)',
  check_out: 'Départ (check-out)',
  task_created: 'Tâche créée',
  previous_step_done: 'Date tâche',
};

function sendModeLabel(ch: string): string {
  return ch === 'whatsapp' ? 'WhatsApp' : ch === 'email' ? 'Email' : 'OTA / Email';
}

/** Import RU : pas de date création fiable → ancre = lancement orchestration (now). */
export function formatImportLaunchMessageSubtitle(
  rule: ScheduledOrchestrationMessage,
  catalogLabel?: string,
): string {
  const isWelcomeAfterBooking =
    rule.catalogMessageId === 'welcome_sojori_v2' ||
    (rule.trigger.reference === 'reservation_date' &&
      rule.trigger.delay.unit === 'hours' &&
      rule.trigger.delay.value >= 1);

  if (isWelcomeAfterBooking) {
    return `${catalogLabel ?? rule.label ?? '—'} · +1h après lancement orchestration (ancre) · ${sendModeLabel(rule.deliveryChannel)}`;
  }

  const ref = REF_LABELS[rule.trigger.reference] ?? rule.trigger.reference;
  const abs = Math.abs(rule.trigger.delay.value);
  const sign = rule.trigger.delay.value >= 0 ? '+' : '−';
  const delay = rule.trigger.delay.unit === 'hours' ? `${sign}${abs}h` : `J${sign}${abs}`;
  const time =
    rule.trigger.delay.unit === 'days' && rule.trigger.time ? ` · ${rule.trigger.time}` : '';
  return `${catalogLabel ?? rule.label ?? '—'} · ${ref} ${delay}${time} · ${sendModeLabel(rule.deliveryChannel)}`;
}
