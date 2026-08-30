export type GuestDocumentKind = 'police_form' | 'contract';
export type GuestDocumentFieldGroup = 'identity' | 'whatsapp' | 'reservation' | 'listing';
export type GuestDocumentFieldSource = GuestDocumentFieldGroup | 'both';
export type GuestDocumentSignerPolicy = 'primary_guest' | 'each_traveler';
export type FieldBadgeKind = 'ocr' | 'dual' | 'strict' | 'guest' | 'res' | 'listing' | 'system' | 'note';

export type GuestDocumentFieldDef = {
  key: string;
  label: string;
  /** Persistence / merge meaning. */
  source: GuestDocumentFieldSource;
  /** UI group in « Ce contrat récupère » — 4 blocs, jamais « both ». */
  group: GuestDocumentFieldGroup;
  badge: string;
  badgeKind: FieldBadgeKind;
};

export type GuestDocumentClause = {
  id: string;
  title: string;
  bodyFr: string;
  bodyEn: string;
};

export type GuestDocument = {
  id: string;
  kind: GuestDocumentKind;
  name: string;
  title: string;
  content: string;
  clauses: GuestDocumentClause[];
  closing: string;
  notice: string;
  enabled: boolean;
  requiresSignature: boolean;
  autoSendAfterRegistration: boolean;
  signerPolicy: GuestDocumentSignerPolicy;
  fieldKeys: string[];
};

export const POLICE_FORM_DOCUMENT_ID = 'doc_police_form';
export const DEFAULT_DISCLAIMER_DOCUMENT_ID = 'doc_stay_disclaimer';
export const MAX_GUEST_DOCUMENTS = 12;

export const SOURCE_GROUPS: {
  id: GuestDocumentFieldGroup;
  icon: string;
  short: string;
  name: string;
  hint: string;
  color: 'or' | 'ok' | 'info' | 'orch';
}[] = [
  {
    id: 'identity',
    icon: '🪪',
    short: 'Pièce',
    name: 'Pièce d’identité',
    hint: 'Lu automatiquement sur la photo du passeport ou de la CIN.',
    color: 'or',
  },
  {
    id: 'whatsapp',
    icon: '💬',
    short: 'WhatsApp',
    name: 'Formulaire WhatsApp',
    hint: 'Saisi par le voyageur, après la photo de sa pièce.',
    color: 'ok',
  },
  {
    id: 'reservation',
    icon: '📅',
    short: 'Résa',
    name: 'Réservation',
    hint: 'Vient de la réservation OTA ou directe.',
    color: 'info',
  },
  {
    id: 'listing',
    icon: '🏨',
    short: 'Listing',
    name: 'Listing',
    hint: 'Vos informations d’établissement, déjà enregistrées.',
    color: 'orch',
  },
];

export const DOCUMENT_FIELD_CATALOG: GuestDocumentFieldDef[] = [
  { key: 'first_name', label: 'Prénom', source: 'identity', group: 'identity', badge: 'OCR', badgeKind: 'ocr' },
  { key: 'last_name', label: 'Nom', source: 'both', group: 'identity', badge: 'OCR sinon résa', badgeKind: 'dual' },
  { key: 'full_name', label: 'Nom et prénom', source: 'both', group: 'identity', badge: 'OCR sinon résa', badgeKind: 'dual' },
  { key: 'birth_date', label: 'Date de naissance', source: 'identity', group: 'identity', badge: 'OCR', badgeKind: 'ocr' },
  { key: 'place_of_birth', label: 'Lieu de naissance', source: 'identity', group: 'identity', badge: 'OCR', badgeKind: 'ocr' },
  { key: 'nationality', label: 'Nationalité', source: 'both', group: 'identity', badge: 'OCR sinon résa', badgeKind: 'dual' },
  { key: 'document_number', label: 'N° CIN / passeport', source: 'identity', group: 'identity', badge: 'OCR · jamais saisi', badgeKind: 'strict' },
  { key: 'document_type', label: 'Type de pièce', source: 'identity', group: 'identity', badge: 'OCR', badgeKind: 'ocr' },
  { key: 'document_issued_at', label: 'Délivré à', source: 'identity', group: 'identity', badge: 'OCR', badgeKind: 'ocr' },
  { key: 'document_issued_on', label: 'Date de délivrance', source: 'identity', group: 'identity', badge: 'OCR', badgeKind: 'ocr' },
  { key: 'gender', label: 'Genre', source: 'identity', group: 'identity', badge: 'OCR', badgeKind: 'ocr' },
  { key: 'issuing_country', label: 'Pays émetteur', source: 'identity', group: 'identity', badge: 'OCR', badgeKind: 'ocr' },
  { key: 'profession', label: 'Profession', source: 'guest', group: 'whatsapp', badge: 'Voyageur', badgeKind: 'guest' },
  { key: 'domicile', label: 'Domicile habituel', source: 'guest', group: 'whatsapp', badge: 'Voyageur', badgeKind: 'guest' },
  { key: 'city', label: 'Ville', source: 'guest', group: 'whatsapp', badge: 'Voyageur', badgeKind: 'guest' },
  { key: 'country', label: 'Pays de résidence', source: 'guest', group: 'whatsapp', badge: 'Voyageur', badgeKind: 'guest' },
  { key: 'coming_from', label: 'Lieu de provenance', source: 'guest', group: 'whatsapp', badge: 'Voyageur', badgeKind: 'guest' },
  { key: 'going_to', label: 'Allant à', source: 'guest', group: 'whatsapp', badge: 'Voyageur', badgeKind: 'guest' },
  { key: 'entry_number_morocco', label: 'N° d’entrée au Maroc', source: 'guest', group: 'whatsapp', badge: 'Voyageur', badgeKind: 'guest' },
  { key: 'room_name', label: 'Villa / chambre', source: 'reservation', group: 'reservation', badge: 'Résa', badgeKind: 'res' },
  { key: 'stay_dates', label: 'Dates de séjour', source: 'reservation', group: 'reservation', badge: 'Résa', badgeKind: 'res' },
  { key: 'arrival_date', label: "Date d'arrivée", source: 'reservation', group: 'reservation', badge: 'Résa', badgeKind: 'res' },
  { key: 'departure_date', label: 'Date de départ', source: 'reservation', group: 'reservation', badge: 'Résa', badgeKind: 'res' },
  { key: 'reservation_number', label: 'N° de réservation', source: 'reservation', group: 'reservation', badge: 'Résa', badgeKind: 'res' },
  { key: 'agency', label: 'Agence', source: 'reservation', group: 'reservation', badge: 'Résa', badgeKind: 'res' },
  { key: 'deposit', label: 'Dépôt / régime', source: 'reservation', group: 'reservation', badge: 'Résa', badgeKind: 'res' },
  { key: 'email', label: 'E-mail', source: 'both', group: 'reservation', badge: 'OCR sinon résa', badgeKind: 'dual' },
  { key: 'phone', label: 'Téléphone', source: 'both', group: 'reservation', badge: 'OCR sinon résa', badgeKind: 'dual' },
  { key: 'arrival_time', label: "Heure d'arrivée", source: 'reservation', group: 'reservation', badge: 'Résa', badgeKind: 'res' },
  { key: 'departure_transfer', label: 'Heure de départ / transfert', source: 'reservation', group: 'reservation', badge: 'Résa', badgeKind: 'res' },
  { key: 'establishment_name', label: 'Nom établissement', source: 'listing', group: 'listing', badge: 'Listing', badgeKind: 'listing' },
  { key: 'establishment_address', label: 'Adresse', source: 'listing', group: 'listing', badge: 'Listing', badgeKind: 'listing' },
  { key: 'sign_date', label: 'Date de signature', source: 'listing', group: 'listing', badge: 'Système', badgeKind: 'system' },
  { key: 'sign_place', label: 'Lieu de signature', source: 'listing', group: 'listing', badge: 'Listing', badgeKind: 'listing' },
];

export const DOCUMENT_FIELD_KEYS = new Set(DOCUMENT_FIELD_CATALOG.map((f) => f.key));

export const SOURCE_LABEL: Record<GuestDocumentFieldSource, string> = {
  identity: 'Pièce d’identité',
  reservation: 'Réservation',
  both: 'OCR sinon résa',
  guest: 'Formulaire WhatsApp',
  listing: 'Listing',
};

export const SOURCE_HINT: Record<GuestDocumentFieldSource, string> = {
  identity: 'Lu automatiquement sur la photo du passeport ou de la CIN.',
  reservation: 'Vient de la réservation OTA ou directe.',
  both: 'OCR d’abord, sinon la réservation.',
  guest: 'Saisi par le voyageur, après la photo de sa pièce.',
  listing: 'Vos informations d’établissement, déjà enregistrées.',
};

export const POLICE_FORM_FIELD_KEYS = [
  'first_name',
  'last_name',
  'birth_date',
  'place_of_birth',
  'nationality',
  'document_number',
  'document_type',
  'document_issued_at',
  'profession',
  'domicile',
  'coming_from',
  'going_to',
  'entry_number_morocco',
  'room_name',
  'stay_dates',
  'establishment_name',
  'establishment_address',
  'sign_date',
];

export const DISCLAIMER_FIELD_KEYS = [
  'room_name',
  'first_name',
  'last_name',
  'stay_dates',
  'agency',
  'deposit',
  'email',
  'phone',
  'departure_transfer',
  'establishment_name',
  'sign_date',
];

export const DEFAULT_POLICE_NOTICE =
  "La direction n'est pas responsable des objets de valeur laissés dans les chambres.";

export const DEFAULT_POLICE_CLOSING = 'Fait à {{sign_place}}, le {{sign_date}}';

export const DEFAULT_DISCLAIMER_CLOSING = `Je confirme par ma signature avoir lu et compris les points susmentionnés.
I hereby confirm by my signature and accept the above-mentioned responsibilities as a guest.

Fait à {{sign_place}}, le {{sign_date}}`;

export const DEFAULT_DISCLAIMER_CLAUSES: GuestDocumentClause[] = [
  {
    id: 'cl_pool',
    title: 'Piscines et espaces communs',
    bodyFr:
      "L'utilisation de la piscine et des espaces communs de {{establishment_name}} est entièrement sous la responsabilité des utilisateurs. Les lieux ne sont pas surveillés en permanence. Le règlement affiché doit être strictement respecté.",
    bodyEn:
      "The pool and public areas of {{establishment_name}} are used entirely at guests' own risk and are not constantly monitored. Displayed rules must be followed at all times.",
  },
  {
    id: 'cl_safe',
    title: 'Coffre-fort',
    bodyFr:
      "Un coffre-fort est mis à disposition et doit être utilisé pour les objets de valeur. L'établissement décline toute responsabilité en cas de perte, dommage ou vol hors du coffre.",
    bodyEn:
      'A safe is available and should be used at all times. Management is not liable for valuables left unattended.',
  },
  {
    id: 'cl_parking',
    title: 'Parking',
    bodyFr:
      'Le parking est mis gracieusement à disposition. {{establishment_name}} décline toute responsabilité en cas de dommages causés par d’autres véhicules.',
    bodyEn:
      'Parking is complimentary. The establishment accepts no liability for damage caused by other drivers.',
  },
];

export function newClause(): GuestDocumentClause {
  return { id: `cl_${Date.now().toString(36)}`, title: '', bodyFr: '', bodyEn: '' };
}

export function assembleContent(doc: Pick<GuestDocument, 'title' | 'fieldKeys' | 'clauses' | 'notice' | 'closing'>): string {
  const header = doc.fieldKeys
    .map((key) => {
      const def = fieldDef(key);
      return def ? `${def.label} : {{${key}}}` : `{{${key}}}`;
    })
    .join('\n');
  const articles = doc.clauses
    .filter((c) => c.title.trim() || c.bodyFr.trim() || c.bodyEn.trim())
    .map((c) => [c.title.trim(), c.bodyFr.trim(), c.bodyEn.trim()].filter(Boolean).join('\n'))
    .join('\n\n');
  return [doc.title.trim(), header, articles, doc.notice.trim(), doc.closing.trim()].filter(Boolean).join('\n\n');
}

function withAssembled(doc: GuestDocument): GuestDocument {
  return { ...doc, content: assembleContent(doc) };
}

export function defaultGuestDocuments(): GuestDocument[] {
  return [
    withAssembled({
      id: POLICE_FORM_DOCUMENT_ID,
      kind: 'police_form',
      name: 'Fiche de police',
      title: 'Fiche de police',
      content: '',
      clauses: [],
      closing: DEFAULT_POLICE_CLOSING,
      notice: DEFAULT_POLICE_NOTICE,
      enabled: true,
      requiresSignature: true,
      autoSendAfterRegistration: false,
      signerPolicy: 'primary_guest',
      fieldKeys: [...POLICE_FORM_FIELD_KEYS],
    }),
    withAssembled({
      id: DEFAULT_DISCLAIMER_DOCUMENT_ID,
      kind: 'contract',
      name: 'Disclaimer villa',
      title: 'Guest Disclaimer',
      content: '',
      clauses: DEFAULT_DISCLAIMER_CLAUSES.map((c) => ({ ...c })),
      closing: DEFAULT_DISCLAIMER_CLOSING,
      notice: '',
      enabled: true,
      requiresSignature: true,
      autoSendAfterRegistration: false,
      signerPolicy: 'primary_guest',
      fieldKeys: [...DISCLAIMER_FIELD_KEYS],
    }),
  ];
}

/** Maps listing guestDocuments → Mouad GuestContract.documentType (max 1 police + 1 stay). */
export type GuestContractDocumentType = 'stay_contract' | 'moroccan_police_form';

export function documentTypeForGuestDocument(doc: Pick<GuestDocument, 'kind'>): GuestContractDocumentType {
  return doc.kind === 'police_form' ? 'moroccan_police_form' : 'stay_contract';
}

export function documentTypeLabel(documentType: string): string {
  if (documentType === 'moroccan_police_form') return 'Fiche de police';
  if (documentType === 'stay_contract') return 'Guest Disclaimer';
  return documentType;
}

export function blankContract(partial?: Partial<GuestDocument>): GuestDocument {
  const stamp = Date.now().toString(36);
  const base: GuestDocument = {
    id: `doc_contract_${stamp}`,
    kind: 'contract',
    name: '',
    title: '',
    content: '',
    clauses: [],
    closing: DEFAULT_DISCLAIMER_CLOSING,
    notice: '',
    enabled: true,
    requiresSignature: true,
    autoSendAfterRegistration: false,
    signerPolicy: 'primary_guest',
    fieldKeys: [],
    ...partial,
    kind: 'contract',
  };
  return withAssembled(base);
}

export function disclaimerContract(): GuestDocument {
  return blankContract({
    name: 'Disclaimer villa',
    title: 'Guest Disclaimer',
    clauses: DEFAULT_DISCLAIMER_CLAUSES.map((c) => ({ ...c })),
    closing: DEFAULT_DISCLAIMER_CLOSING,
    fieldKeys: [...DISCLAIMER_FIELD_KEYS],
    requiresSignature: true,
    autoSendAfterRegistration: true,
    enabled: true,
  });
}

export function fieldDef(key: string): GuestDocumentFieldDef | undefined {
  return DOCUMENT_FIELD_CATALOG.find((f) => f.key === key);
}

export function placeholderFor(key: string): string {
  return `{{${key}}}`;
}

export function groupsUsed(fieldKeys: string[]): GuestDocumentFieldGroup[] {
  const seen = new Set<GuestDocumentFieldGroup>();
  for (const key of fieldKeys) {
    const def = fieldDef(key);
    if (def) seen.add(def.group);
  }
  return SOURCE_GROUPS.map((g) => g.id).filter((id) => seen.has(id));
}

export function fieldsInGroup(group: GuestDocumentFieldGroup): GuestDocumentFieldDef[] {
  return DOCUMENT_FIELD_CATALOG.filter((f) => f.group === group);
}

export function insertPlaceholder(content: string, key: string, cursor?: number): string {
  const tag = placeholderFor(key);
  if (cursor == null || cursor < 0 || cursor > content.length) {
    return content.includes(tag) ? content : content.trim() ? `${content.trim()}\n${tag}` : tag;
  }
  return `${content.slice(0, cursor)}${tag}${content.slice(cursor)}`;
}
