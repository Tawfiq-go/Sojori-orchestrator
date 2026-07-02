export interface OwnerCreateReadiness {
  ready: boolean;
  missing: string[];
}

type OwnerFormValues = {
  firstName?: string;
  lastName?: string;
  email?: string;
  ruEmail?: string;
  phone?: string;
  channelManager?: string;
  cityId?: string;
  settings?: { language?: string; currency?: string };
};

const LABELS: Record<string, string> = {
  firstName: 'Prénom',
  lastName: 'Nom',
  email: 'Email dashboard',
  ruEmail: 'Email R.U.',
  phone: 'Téléphone',
  channelManager: 'Channel manager',
  cityId: 'Ville',
  'settings.language': 'Langue',
  'settings.currency': 'Devise',
};

function isBlank(v: unknown): boolean {
  return !String(v ?? '').trim();
}

/** Champs minimum pour activer « Créer » sur un nouveau PM. */
export function computeOwnerCreateReadiness(values: OwnerFormValues): OwnerCreateReadiness {
  const missing: string[] = [];

  const checks: Array<[keyof typeof LABELS, unknown]> = [
    ['firstName', values.firstName],
    ['lastName', values.lastName],
    ['email', values.email],
    ['ruEmail', values.ruEmail],
    ['phone', values.phone],
    ['channelManager', values.channelManager],
    ['cityId', values.cityId],
    ['settings.language', values.settings?.language],
    ['settings.currency', values.settings?.currency],
  ];

  for (const [key, val] of checks) {
    if (isBlank(val)) missing.push(LABELS[key] || key);
  }

  return { ready: missing.length === 0, missing };
}
