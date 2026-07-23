/**
 * Checklist staff Accueil — miroir srv-fulltask receiveChecklistDefaults.
 */

export type ReceiveChecklistItem = {
  id: string;
  label: string;
  required: boolean;
  order: number;
};

export const DEFAULT_RECEIVE_ARRIVAL_CHECKLIST: ReceiveChecklistItem[] = [
  {
    id: 'rcv_reg',
    label: 'Vérifier enregistrement voyageurs (si pas encore fait)',
    required: true,
    order: 0,
  },
  {
    id: 'rcv_tax',
    label: 'Récupérer / encaisser la taxe de séjour',
    required: true,
    order: 1,
  },
  {
    id: 'rcv_keys',
    label: 'Remettre clés / codes d’accès',
    required: true,
    order: 2,
  },
  {
    id: 'rcv_wifi',
    label: 'Expliquer WiFi et consignes du logement',
    required: false,
    order: 3,
  },
  {
    id: 'rcv_declare',
    label: 'Confirmer l’arrivée réelle (déclarer si besoin)',
    required: false,
    order: 4,
  },
];

export const DEFAULT_RECEIVE_DEPARTURE_CHECKLIST: ReceiveChecklistItem[] = [
  {
    id: 'rcv_keys_back',
    label: 'Récupérer les clés',
    required: true,
    order: 0,
  },
  {
    id: 'rcv_quick',
    label: 'État des lieux rapide (dégâts / oubliés)',
    required: true,
    order: 1,
  },
  {
    id: 'rcv_tax_out',
    label: 'Vérifier taxe de séjour soldée',
    required: false,
    order: 2,
  },
  {
    id: 'rcv_declare_out',
    label: 'Confirmer le départ réel (déclarer si besoin)',
    required: false,
    order: 3,
  },
];

function newId(): string {
  return `rcv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function defaultReceiveChecklist(
  kind: 'arrival' | 'departure',
): ReceiveChecklistItem[] {
  const base =
    kind === 'arrival'
      ? DEFAULT_RECEIVE_ARRIVAL_CHECKLIST
      : DEFAULT_RECEIVE_DEPARTURE_CHECKLIST;
  return base.map((item, i) => ({ ...item, order: i }));
}

export function normalizeReceiveChecklist(
  raw: unknown,
  kind: 'arrival' | 'departure',
): ReceiveChecklistItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaultReceiveChecklist(kind);
  }
  return raw
    .map((row, i) => {
      const r = row as Record<string, unknown>;
      const label = String(r.label || '').trim();
      if (!label) return null;
      return {
        id: String(r.id || newId()),
        label,
        required: r.required !== false,
        order: typeof r.order === 'number' ? r.order : i,
      } satisfies ReceiveChecklistItem;
    })
    .filter((x): x is ReceiveChecklistItem => Boolean(x))
    .sort((a, b) => a.order - b.order)
    .map((item, i) => ({ ...item, order: i }));
}

export function defaultReceiveGestion(kind: 'arrival' | 'departure'): {
  durationMinutes: number;
  checklist: ReceiveChecklistItem[];
} {
  return {
    durationMinutes: 30,
    checklist: defaultReceiveChecklist(kind),
  };
}
