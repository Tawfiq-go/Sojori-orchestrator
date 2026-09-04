/** Fixed catalog — PM cannot invent free-form types. */
export type GuestDocumentKind = 'police_form' | 'contract' | 'short_term_rental';
export type GuestDocumentFieldGroup = 'identity' | 'whatsapp' | 'reservation' | 'listing';
export type GuestDocumentFieldSource = GuestDocumentFieldGroup | 'both';
export type GuestDocumentSignerPolicy = 'primary_guest' | 'each_traveler';
export type FieldBadgeKind = 'ocr' | 'dual' | 'strict' | 'guest' | 'res' | 'listing' | 'system' | 'note';
/** Business signing presets (stored on gestion.signingFormat). */
export type SigningFormat = 'airbnb' | 'hotel' | 'hotel_light';

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
  /** Counts toward Enregistrement x/y when enabled. */
  requiredBeforeArrival: boolean;
  /** Locks menu F / access until this document is fully signed (implies required + signature). */
  blocksAccess: boolean;
  /**
   * Police sheet only: include the formulaire block (profession, domicile, provenance…)
   * in the contract / signed PDF. Off = identity + stay only (Airbnb / LCD).
   */
  includeFormulaire: boolean;
  autoSendAfterRegistration: boolean;
  signerPolicy: GuestDocumentSignerPolicy;
  fieldKeys: string[];
};

export const POLICE_FORM_DOCUMENT_ID = 'doc_police_form';
export const DEFAULT_DISCLAIMER_DOCUMENT_ID = 'doc_stay_disclaimer';
export const DEFAULT_SHORT_TERM_RENTAL_DOCUMENT_ID = 'doc_short_term_rental';
/** Police + disclaimer + contrat LCD — un de chaque max. */
export const MAX_GUEST_DOCUMENTS = 3;
export const SIGNING_FORMATS: SigningFormat[] = ['airbnb', 'hotel', 'hotel_light'];

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
    short: 'Police',
    name: 'Formulaire police',
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
  guest: 'Formulaire police',
  listing: 'Listing',
};

export const SOURCE_HINT: Record<GuestDocumentFieldSource, string> = {
  identity: 'Lu automatiquement sur la photo du passeport ou de la CIN.',
  reservation: 'Vient de la réservation OTA ou directe.',
  both: 'OCR d’abord, sinon la réservation.',
  guest: 'Saisi par le voyageur, après la photo de sa pièce.',
  listing: 'Vos informations d’établissement, déjà enregistrées.',
};

/** WhatsApp formulaire fields shown on the police contract when includeFormulaire is on. */
export const POLICE_FORMULAIRE_FIELD_KEYS = [
  'profession',
  'domicile',
  'city',
  'country',
  'coming_from',
  'going_to',
  'entry_number_morocco',
] as const;

export function defaultIncludeFormulaire(kind: GuestDocumentKind): boolean {
  return kind === 'police_form';
}

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

/** Champs typiques d’un contrat de location courte durée (Maroc). */
export const SHORT_TERM_RENTAL_FIELD_KEYS = [
  'establishment_name',
  'establishment_address',
  'full_name',
  'first_name',
  'last_name',
  'document_number',
  'nationality',
  'email',
  'phone',
  'room_name',
  'arrival_date',
  'departure_date',
  'stay_dates',
  'reservation_number',
  'deposit',
  'agency',
  'sign_place',
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

/**
 * Modèle type — contrat de location meublée de courte durée au Maroc
 * (hébergement touristique / chez l’habitant, cadre Loi n° 80-14).
 * Texte éditable par le PM ; ce n’est pas un acte notarié.
 */
export const DEFAULT_SHORT_TERM_RENTAL_CLOSING = `Le Locataire reconnaît avoir pris connaissance du présent contrat et du règlement intérieur, et s’engage à les respecter pendant toute la durée du séjour.
The Guest acknowledges having read this agreement and the house rules, and agrees to comply for the entire stay.

Fait à {{sign_place}}, le {{sign_date}}`;

export const DEFAULT_SHORT_TERM_RENTAL_CLAUSES: GuestDocumentClause[] = [
  {
    id: 'cl_rental_cadre',
    title: 'Cadre juridique',
    bodyFr:
      'Le présent contrat régit une location meublée de courte durée à caractère touristique au Maroc, dans le cadre de la Loi n° 80-14 relative aux établissements touristiques et formes d’hébergement assimilées, et non un bail d’habitation longue durée (Loi 67-12). Il ne constitue pas un titre de séjour.',
    bodyEn:
      'This agreement covers short-term furnished tourist accommodation in Morocco under Law no. 80-14 on tourist establishments (not a long-term residential lease under Law 67-12). It is not a residence permit.',
  },
  {
    id: 'cl_rental_parties',
    title: 'Parties',
    bodyFr:
      'Bailleur / exploitant : {{establishment_name}}, {{establishment_address}}. Locataire / voyageur principal : {{full_name}} (pièce {{document_number}}, nationalité {{nationality}}). Contact : {{email}} / {{phone}}.',
    bodyEn:
      'Host / operator: {{establishment_name}}, {{establishment_address}}. Primary guest: {{full_name}} (ID {{document_number}}, nationality {{nationality}}). Contact: {{email}} / {{phone}}.',
  },
  {
    id: 'cl_rental_bien',
    title: 'Bien loué',
    bodyFr:
      'Le Bailleur met à disposition le logement meublé désigné « {{room_name}} » situé à {{establishment_address}}, pour un usage exclusif d’habitation temporaire / tourisme, avec le mobilier et équipements inventoriés.',
    bodyEn:
      'The Host provides the furnished unit “{{room_name}}” at {{establishment_address}} for temporary / tourist residential use only, with the inventoried furniture and equipment.',
  },
  {
    id: 'cl_rental_duree',
    title: 'Durée du séjour',
    bodyFr:
      'Arrivée le {{arrival_date}}, départ le {{departure_date}} ({{stay_dates}}). Réservation n° {{reservation_number}}. Toute prolongation nécessite l’accord écrit du Bailleur et peut entraîner un complément de loyer.',
    bodyEn:
      'Check-in {{arrival_date}}, check-out {{departure_date}} ({{stay_dates}}). Reservation no. {{reservation_number}}. Any extension requires the Host’s written approval and may incur extra rent.',
  },
  {
    id: 'cl_rental_prix',
    title: 'Loyer et modalités',
    bodyFr:
      'Le prix du séjour et les frais annexes sont ceux acceptés lors de la réservation (OTA, directe ou agence {{agency}}). Sauf accord contraire, le solde est dû avant ou à l’arrivée. Les taxes de séjour applicables restent à la charge du Locataire lorsqu’elles ne sont pas incluses.',
    bodyEn:
      'Stay price and extras are those accepted at booking (OTA, direct, or agency {{agency}}). Unless otherwise agreed, the balance is due before or at check-in. Applicable tourist taxes remain the Guest’s responsibility when not included.',
  },
  {
    id: 'cl_rental_caution',
    title: 'Caution / dépôt de garantie',
    bodyFr:
      'Une caution peut être demandée ({{deposit}}). Elle garantit les dégradations, manquants d’inventaire, frais de remise en état et pénalités (fêtes, sur-occupation, départ anticipé non autorisé). Restitution sous réserve d’état des lieux de sortie conforme, sous déduction des sommes dues.',
    bodyEn:
      'A security deposit may be required ({{deposit}}). It covers damage, inventory shortages, restoration costs and penalties (parties, over-occupancy, unauthorized early departure). Refund subject to a compliant check-out inventory, minus amounts owed.',
  },
  {
    id: 'cl_rental_occupation',
    title: 'Occupation et règlement intérieur',
    bodyFr:
      'Seules les personnes déclarées à l’enregistrement peuvent occuper le logement. Fêtes, nuisances sonores excessives et sous-location sont interdites. Le Locataire respecte le règlement intérieur affiché ou communiqué, les règles de la résidence / copropriété, et la tranquillité du voisinage.',
    bodyEn:
      'Only guests declared at check-in may occupy the unit. Parties, excessive noise and subletting are forbidden. The Guest must follow house rules, residence / condo rules, and neighbour quiet hours.',
  },
  {
    id: 'cl_rental_police',
    title: 'Fiche de police',
    bodyFr:
      'Conformément aux obligations d’hébergement au Maroc, chaque occupant majeur fournit une pièce d’identité valide et les informations nécessaires à la fiche de police. Le Locataire garantit l’exactitude des déclarations.',
    bodyEn:
      'Under Moroccan lodging rules, each adult occupant provides a valid ID and the data required for the police registration form. The Guest warrants that declarations are accurate.',
  },
  {
    id: 'cl_rental_responsabilite',
    title: 'Responsabilité et assurance',
    bodyFr:
      'Le Locataire use du bien en bon père de famille. Il répond des dégradations causées par lui-même, ses accompagnants ou invités. Les objets de valeur doivent être placés en lieu sûr. Le Bailleur recommande une assurance voyage couvrant responsabilité civile et annulation.',
    bodyEn:
      'The Guest shall use the property carefully and is liable for damage caused by themselves, companions or visitors. Valuables should be kept secure. The Host recommends travel insurance covering liability and cancellation.',
  },
  {
    id: 'cl_rental_depart',
    title: 'Départ et restitution',
    bodyFr:
      'Au départ, le logement est rendu dans l’état d’arrivée (hors usure normale), clés et accès restitués. Tout manquement peut être imputé sur la caution. Le présent document vaut engagement du voyageur principal pour le groupe déclaré.',
    bodyEn:
      'At check-out the unit is returned as received (normal wear excepted), with keys/access. Shortfalls may be charged to the deposit. This document binds the primary guest for the declared party.',
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

/**
 * Templates shown when no guestDocuments are stored.
 * All inactive — nothing is silently persisted as active.
 */
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
      enabled: false,
      requiresSignature: true,
      requiredBeforeArrival: true,
      blocksAccess: false,
      includeFormulaire: true,
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
      enabled: false,
      requiresSignature: true,
      requiredBeforeArrival: true,
      blocksAccess: false,
      includeFormulaire: false,
      autoSendAfterRegistration: false,
      signerPolicy: 'primary_guest',
      fieldKeys: [...DISCLAIMER_FIELD_KEYS],
    }),
    withAssembled({
      id: DEFAULT_SHORT_TERM_RENTAL_DOCUMENT_ID,
      kind: 'short_term_rental',
      name: 'Contrat location courte durée',
      title: 'Contrat de location meublée de courte durée',
      content: '',
      clauses: DEFAULT_SHORT_TERM_RENTAL_CLAUSES.map((c) => ({ ...c })),
      closing: DEFAULT_SHORT_TERM_RENTAL_CLOSING,
      notice:
        'Modèle type Maroc (Loi 80-14) — à adapter avec votre conseil juridique. Signature électronique simple.',
      enabled: false,
      requiresSignature: true,
      requiredBeforeArrival: true,
      blocksAccess: false,
      includeFormulaire: false,
      autoSendAfterRegistration: false,
      signerPolicy: 'primary_guest',
      fieldKeys: [...SHORT_TERM_RENTAL_FIELD_KEYS],
    }),
  ];
}

/** Maps listing guestDocuments → GuestContract.documentType (max 1 of each). */
export type GuestContractDocumentType =
  | 'stay_contract'
  | 'moroccan_police_form'
  | 'short_term_rental';

export function documentTypeForGuestDocument(
  doc: Pick<GuestDocument, 'kind'>,
): GuestContractDocumentType {
  if (doc.kind === 'police_form') return 'moroccan_police_form';
  if (doc.kind === 'short_term_rental') return 'short_term_rental';
  return 'stay_contract';
}

export function documentTypeLabel(documentType: string): string {
  if (documentType === 'moroccan_police_form') return 'Fiche de police';
  if (documentType === 'short_term_rental') return 'Contrat location courte durée';
  if (documentType === 'stay_contract') return 'Guest Disclaimer';
  return documentType;
}

export function blankContract(partial?: Partial<GuestDocument>): GuestDocument {
  const stamp = Date.now().toString(36);
  const kind = partial?.kind ?? 'contract';
  const policies =
    kind === 'contract'
      ? { requiredBeforeArrival: true, blocksAccess: false }
      : { requiredBeforeArrival: true, blocksAccess: true };
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
    requiredBeforeArrival: policies.requiredBeforeArrival,
    blocksAccess: policies.blocksAccess,
    includeFormulaire: defaultIncludeFormulaire(kind),
    autoSendAfterRegistration: false,
    signerPolicy: 'primary_guest',
    fieldKeys: [],
    ...partial,
  };
  return withAssembled({ ...base, kind });
}

export function disclaimerContract(): GuestDocument {
  return blankContract({
    id: DEFAULT_DISCLAIMER_DOCUMENT_ID,
    kind: 'contract',
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

export function shortTermRentalContract(): GuestDocument {
  return blankContract({
    id: DEFAULT_SHORT_TERM_RENTAL_DOCUMENT_ID,
    kind: 'short_term_rental',
    name: 'Contrat location courte durée',
    title: 'Contrat de location meublée de courte durée',
    clauses: DEFAULT_SHORT_TERM_RENTAL_CLAUSES.map((c) => ({ ...c })),
    closing: DEFAULT_SHORT_TERM_RENTAL_CLOSING,
    notice:
      'Modèle type Maroc (Loi 80-14) — à adapter avec votre conseil juridique. Signature électronique simple.',
    fieldKeys: [...SHORT_TERM_RENTAL_FIELD_KEYS],
    requiresSignature: true,
    autoSendAfterRegistration: false,
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
