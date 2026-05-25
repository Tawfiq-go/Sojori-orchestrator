export type ServiceClientSubject = {
  id: string;
  labelFr: string;
  enabled: boolean;
};

export const DEFAULT_SLA_HOURS = 24;

export const DEFAULT_SLA_MESSAGE_FR =
  'Nous répondons sous {{hours}}h. Si vous souhaitez un délai différent, nous ferons notre possible.';

export function formatSlaGuestMessage(templateFr: string, hours: number): string {
  return templateFr.replace(/\{\{hours\}\}/g, String(hours));
}

export const DEFAULT_SERVICE_CLIENT_SUBJECTS: ServiceClientSubject[] = [
  { id: 'complaint', labelFr: 'Réclamation', enabled: true },
  { id: 'billing', labelFr: 'Question facturation', enabled: true },
  { id: 'invoice_request', labelFr: 'Besoin de facture / reçu', enabled: true },
  { id: 'cancellation', labelFr: "Demande d'annulation", enabled: true },
  { id: 'extension', labelFr: 'Prolonger le séjour', enabled: true },
  { id: 'new_booking', labelFr: 'Nouvelle réservation', enabled: true },
  { id: 'refund', labelFr: 'Demande de remboursement', enabled: true },
  { id: 'checkin_access', labelFr: 'Problème arrivée / accès', enabled: true },
  { id: 'checkout', labelFr: 'Question départ', enabled: true },
  { id: 'damage', labelFr: 'Dégât ou casse', enabled: true },
  { id: 'special_request', labelFr: 'Demande spéciale', enabled: true },
  { id: 'information', labelFr: 'Question / information', enabled: true },
  { id: 'other', labelFr: 'Autre', enabled: true },
];

export function mapApiSubjectsToUi(
  apiSubjects: Array<{ id?: string; enabled?: boolean; displayOrder?: number; label?: { fr?: string } }>,
): ServiceClientSubject[] {
  if (!Array.isArray(apiSubjects) || apiSubjects.length === 0) {
    return DEFAULT_SERVICE_CLIENT_SUBJECTS;
  }
  return [...apiSubjects]
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .map((s, i) => ({
      id: String(s.id || `subject_${i}`),
      labelFr: s.label?.fr || 'Catégorie',
      enabled: s.enabled !== false,
    }));
}

export function mapUiSubjectsToApi(subjects: ServiceClientSubject[]) {
  return subjects.map((s, i) => ({
    id: s.id,
    enabled: s.enabled,
    displayOrder: i,
    label: { fr: s.labelFr, en: s.labelFr, ar: '' },
  }));
}
