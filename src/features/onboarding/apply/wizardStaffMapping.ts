const TASK_TYPE_TO_CATEGORY: Record<string, string> = {
  arrival_choose: 'ARRIVAL',
  arrival_declare: 'ARRIVAL',
  departure_choose: 'DEPARTURE',
  departure_declare: 'DEPARTURE',
  cleaning_free: 'CLEANING',
  cleaning_paid: 'CLEANING',
  cleaning_sojori: 'CLEANING',
  checkout_cleaning: 'CLEANING',
  transport: 'TRANSPORT',
  groceries: 'GROCERIES',
  support: 'SUPPORT',
  service_client: 'SUPPORT',
  registration: 'REGISTRATION',
  concierge: 'CUSTOM',
};

export function wizardTaskTypesToCategories(allowedTaskTypes: string[]): string[] {
  const out = new Set<string>();
  for (const t of allowedTaskTypes) {
    const cat = TASK_TYPE_TO_CATEGORY[t];
    if (cat) out.add(cat);
  }
  return out.size ? [...out] : ['ALL'];
}

export function normalizePhone(val = ''): string {
  return (val || '').replace(/[^\d+]/g, '');
}
