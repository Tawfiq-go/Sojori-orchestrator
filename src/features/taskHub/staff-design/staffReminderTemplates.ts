/** Slugs templates WhatsApp staff (alignés srv-fulltask staffReminderTemplates.ts). */
export const STAFF_REMINDER_TEMPLATE_OPTIONS: { id: string; label: string }[] = [
  { id: 'staff_reminder_transport', label: 'Rappel · Transport' },
  { id: 'staff_reminder_groceries', label: 'Rappel · Courses' },
  { id: 'staff_reminder_concierge', label: 'Rappel · Conciergerie' },
  { id: 'staff_reminder_cleaning', label: 'Rappel · Ménage' },
  { id: 'staff_reminder_arrival', label: 'Rappel · Arrivée' },
  { id: 'staff_reminder_departure', label: 'Rappel · Départ' },
  { id: 'staff_reminder_support', label: 'Rappel · Support' },
  { id: 'staff_reminder_service_client', label: 'Rappel · Service client' },
  { id: 'staff_reminder_generic', label: 'Rappel · Générique' },
];

export const DEFAULT_STAFF_REMINDER_MESSAGE_ID: Record<string, string> = {
  arrival_choose: 'staff_reminder_arrival',
  departure_choose: 'staff_reminder_departure',
  cleaning_free: 'staff_reminder_cleaning',
  cleaning_paid: 'staff_reminder_cleaning',
  checkout_cleaning: 'staff_reminder_cleaning',
  transport: 'staff_reminder_transport',
  groceries: 'staff_reminder_groceries',
  concierge: 'staff_reminder_concierge',
  support: 'staff_reminder_support',
  service_client: 'staff_reminder_service_client',
};

export function defaultStaffReminderMessageId(taskTypeId: string): string {
  return DEFAULT_STAFF_REMINDER_MESSAGE_ID[taskTypeId] ?? 'staff_reminder_generic';
}
