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
      'city',
      'country',
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
export const DEFAULT_SHORT_TERM_RENTAL_CLOSING = `Fait à {{sign_place}}, le {{sign_date}}. Le Voyageur reconnaît avoir lu le contrat et le règlement intérieur, et les accepter pour lui-même et les occupants déclarés.
Signed in {{sign_place}} on {{sign_date}}. The Guest acknowledges having read the agreement and the house rules, and accepts them for themselves and the declared occupants.`;

/** Contrat LCD Maroc v2 (2026-09-05) — voir docs/produits/CONTRAT_LCD_MAROC.md. Aucun montant ni horaire en variable : ils viennent de la réservation. */
export const DEFAULT_SHORT_TERM_RENTAL_CLAUSES: GuestDocumentClause[] = [
  {
    id: 'cl_lcd_parties',
    title: 'Art. 1 — Parties et qualité',
    bodyFr:
      'Entre {{establishment_name}}, {{establishment_address}}, agissant en qualité de gestionnaire mandaté par le propriétaire du logement (ci-après « le Bailleur »), et {{full_name}}, titulaire de la pièce d’identité n° {{document_number}}, nationalité {{nationality}}, joignable au {{phone}} / {{email}} (ci-après « le Voyageur »), agissant pour lui-même et pour les personnes qu’il déclare à l’enregistrement.',
    bodyEn:
      'Between {{establishment_name}}, {{establishment_address}}, acting as manager mandated by the owner of the property (the “Host”), and {{full_name}}, holder of ID no. {{document_number}}, nationality {{nationality}}, reachable at {{phone}} / {{email}} (the “Guest”), acting for themselves and for the persons declared at check-in.',
  },
  {
    id: 'cl_lcd_objet',
    title: 'Art. 2 — Objet et nature du contrat',
    bodyFr:
      'Le Bailleur met à disposition du Voyageur le logement meublé « {{room_name}} » situé à {{establishment_address}}, pour un séjour touristique temporaire. Il s’agit d’un louage de choses au sens des articles 627 et suivants du Dahir des obligations et contrats, dans le cadre de la réglementation marocaine de l’hébergement touristique (loi n° 80-14). Ce contrat n’est pas un bail d’habitation au sens de la loi n° 67-12, ne confère aucun droit au maintien dans les lieux et ne vaut ni domicile ni titre de séjour.',
    bodyEn:
      'The Host provides the Guest with the furnished unit “{{room_name}}” at {{establishment_address}} for a temporary tourist stay. This is a lease of property under articles 627 et seq. of the Moroccan Code of Obligations and Contracts, within the Moroccan tourist accommodation rules (Law 80-14). It is not a residential lease under Law 67-12, grants no right to remain, and is neither a domicile nor a residence permit.',
  },
  {
    id: 'cl_lcd_duree',
    title: 'Art. 3 — Durée',
    bodyFr:
      'Séjour du {{arrival_date}} au {{departure_date}}, aux heures d’arrivée et de départ indiquées dans la réservation n° {{reservation_number}}. Le séjour prend fin de plein droit à la date et l’heure de départ, sans préavis ni formalité. Toute prolongation suppose l’accord écrit préalable du Bailleur et le paiement du complément ; à défaut, toute occupation au-delà du terme est sans droit et donne lieu à une indemnité égale à deux fois le tarif journalier par jour commencé, sans préjudice de toute action.',
    bodyEn:
      'Stay from {{arrival_date}} to {{departure_date}}, at the check-in and check-out times stated in booking no. {{reservation_number}}. The stay ends automatically at the departure date and time, without notice. Any extension requires the Host’s prior written consent and payment; otherwise any occupation beyond the term is unlawful and incurs an indemnity of twice the daily rate per day started, without prejudice to any legal action.',
  },
  {
    id: 'cl_lcd_occupants',
    title: 'Art. 4 — Occupants',
    bodyFr:
      'Le logement est loué pour le nombre de personnes indiqué dans la réservation, toutes déclarées à l’enregistrement. Aucune autre personne ne peut y séjourner, même de jour, sans accord écrit du Bailleur. Fêtes, événements, sous-location, cession du contrat et mise en ligne sur toute plateforme sont interdits. En cas de manquement, le Bailleur peut mettre fin au séjour immédiatement, sans remboursement, et retenir la caution.',
    bodyEn:
      'The unit is rented for the number of persons stated in the booking, all declared at check-in. No other person may stay, even during the day, without the Host’s written consent. Parties, events, subletting, assignment and re-listing on any platform are forbidden. In case of breach the Host may end the stay immediately, without refund, and keep the deposit.',
  },
  {
    id: 'cl_lcd_prix',
    title: 'Art. 5 — Prix, paiement, taxes',
    bodyFr:
      'Le prix total du séjour est celui accepté lors de la réservation, sur la plateforme ou en direct. Il comprend le logement, le mobilier, les équipements et le ménage de fin de séjour, et ne comprend pas la taxe de séjour et la taxe de promotion touristique, réglées sur place au tarif en vigueur sauf mention contraire sur la réservation. Le solde est dû au plus tard à l’arrivée, selon les modalités de paiement du canal de réservation.',
    bodyEn:
      'The total price of the stay is the one accepted at booking, on the platform or directly. It includes the unit, furniture, equipment and end-of-stay cleaning, and excludes the tourist tax and tourism promotion tax, paid on site at the applicable rate unless stated otherwise on the booking. The balance is due at check-in at the latest, under the payment terms of the booking channel.',
  },
  {
    id: 'cl_lcd_caution',
    title: 'Art. 6 — Dépôt de garantie',
    bodyFr:
      'Un dépôt de garantie peut être demandé par le Bailleur, au plus tard à l’arrivée, selon le montant et les modalités indiqués dans la réservation. Lorsqu’il est demandé, il garantit les dégradations, les manquants d’inventaire, les frais de remise en état ou de nettoyage anormal, les consommations non incluses et les pénalités prévues au présent contrat. Il est restitué dans les 7 jours suivant le départ, sous déduction des sommes justifiées par photos, factures ou devis. Si les dommages excèdent le dépôt, le Voyageur reste tenu du surplus.',
    bodyEn:
      'The Host may request a security deposit, at check-in at the latest, for the amount and under the terms stated in the booking. When requested, it covers damage, missing inventory, restoration or abnormal cleaning costs, non-included consumption and the penalties in this agreement. It is refunded within 7 days after departure, minus amounts substantiated by photos, invoices or quotes. If damage exceeds the deposit, the Guest remains liable for the balance.',
  },
  {
    id: 'cl_lcd_edl',
    title: 'Art. 7 — État des lieux et inventaire',
    bodyFr:
      'Un état des lieux et un inventaire photographiques sont établis par le Bailleur avant l’arrivée et mis à disposition du Voyageur. Le Voyageur signale par écrit (WhatsApp) tout défaut ou manquant dans les 24 heures suivant son arrivée ; passé ce délai, le logement est réputé conforme. Au départ, un état des lieux de sortie est réalisé ; en l’absence du Voyageur, il est établi par le Bailleur avec photos horodatées et lui est opposable.',
    bodyEn:
      'A photographic inventory and condition report are drawn up by the Host before arrival and made available to the Guest. The Guest reports any defect or missing item in writing (WhatsApp) within 24 hours of arrival; after that the unit is deemed compliant. At departure a check-out report is made; if the Guest is absent, the Host draws it up with time-stamped photos and it is binding on the Guest.',
  },
  {
    id: 'cl_lcd_usage',
    title: 'Art. 8 — Usage, règlement intérieur, voisinage',
    bodyFr:
      'Le Voyageur occupe les lieux en bon père de famille, respecte le règlement intérieur communiqué dans le chatbot WhatsApp et les règles de la résidence ou de la copropriété, et préserve la tranquillité du voisinage, notamment entre 22 h et 8 h. Il est interdit de fumer à l’intérieur, d’accueillir des animaux sans accord écrit, de modifier les serrures ou installations, et d’utiliser le logement à des fins professionnelles, commerciales ou contraires aux lois et bonnes mœurs marocaines.',
    bodyEn:
      'The Guest uses the premises with due care, follows the house rules provided in the WhatsApp chatbot and the residence or condominium rules, and respects neighbours’ quiet, especially between 10 pm and 8 am. Smoking indoors, pets without written consent, changing locks or installations, and any professional, commercial or unlawful use are forbidden.',
  },
  {
    id: 'cl_lcd_annulation',
    title: 'Art. 9 — Annulation, modification, non-présentation',
    bodyFr:
      'L’annulation, la modification des dates, la non-présentation et le départ anticipé sont régis exclusivement par les conditions du canal de réservation acceptées lors de la réservation, qu’il s’agisse d’une plateforme (Airbnb, Booking ou autre) ou d’une réservation directe. Le présent contrat n’y ajoute ni n’y retire rien.',
    bodyEn:
      'Cancellation, date changes, no-show and early departure are governed exclusively by the booking channel terms accepted at booking, whether a platform (Airbnb, Booking or other) or a direct booking. This agreement neither adds to nor removes anything from them.',
  },
  {
    id: 'cl_lcd_police',
    title: 'Art. 10 — Enregistrement et fiche de police',
    bodyFr:
      'Conformément à la réglementation marocaine sur l’hébergement des voyageurs, chaque occupant fournit avant l’arrivée une pièce d’identité en cours de validité et les informations nécessaires à la déclaration aux autorités (fiche individuelle). Le Voyageur garantit l’exactitude de ces informations et reconnaît que l’accès au logement peut être différé tant que l’enregistrement de tous les occupants n’est pas complet.',
    bodyEn:
      'In accordance with Moroccan rules on guest accommodation, each occupant provides a valid ID and the information required for the police declaration (individual form) before arrival. The Guest warrants the accuracy of this information and acknowledges that access may be withheld until every occupant’s registration is complete.',
  },
  {
    id: 'cl_lcd_responsabilite',
    title: 'Art. 11 — Responsabilité, sécurité, assurance',
    bodyFr:
      'Le Voyageur est responsable des dommages causés par lui-même, les personnes qu’il héberge et ses visiteurs. Les enfants restent sous la surveillance permanente des adultes, notamment à proximité d’une piscine, d’une terrasse ou d’un escalier. Les objets de valeur sont conservés sous la seule responsabilité du Voyageur. Le Bailleur n’est pas responsable des interruptions de services publics (eau, électricité, internet) indépendantes de sa volonté, ni des vols sans effraction. Il est recommandé au Voyageur de disposer d’une assurance voyage couvrant la responsabilité civile, les frais médicaux et l’annulation.',
    bodyEn:
      'The Guest is liable for damage caused by themselves, the persons they host and their visitors. Children remain under constant adult supervision, especially near a pool, terrace or stairs. Valuables are kept at the Guest’s sole risk. The Host is not liable for utility outages (water, power, internet) beyond its control, nor for theft without break-in. Travel insurance covering liability, medical costs and cancellation is recommended.',
  },
  {
    id: 'cl_lcd_acces',
    title: 'Art. 12 — Accès et clés',
    bodyFr:
      'Les codes, clés ou badges remis sont strictement personnels. Ils ne doivent être ni copiés ni communiqués. Toute perte est signalée immédiatement ; le remplacement des clés ou serrures est facturé au coût réel. Le Bailleur ou son représentant peut accéder au logement pour une intervention nécessaire à la sécurité ou à l’entretien, après en avoir informé le Voyageur par message.',
    bodyEn:
      'Codes, keys or badges are strictly personal and must not be copied or shared. Any loss must be reported immediately; replacing keys or locks is charged at actual cost. The Host or its representative may enter the unit for work required for safety or maintenance, after informing the Guest by message.',
  },
  {
    id: 'cl_lcd_resiliation',
    title: 'Art. 13 — Résiliation',
    bodyFr:
      'En cas de manquement grave (sur-occupation, fête, nuisances répétées, sous-location, dégradations volontaires, comportement dangereux ou illicite), le Bailleur peut mettre fin au séjour immédiatement par notification écrite adressée au Voyageur par message WhatsApp, par la messagerie de la plateforme de réservation ou par e-mail. Les nuits restantes sont traitées selon les conditions du canal de réservation, sans préjudice des dommages-intérêts. Le Voyageur libère alors les lieux dans les deux heures suivant la notification.',
    bodyEn:
      'In case of serious breach (over-occupancy, parties, repeated nuisance, subletting, deliberate damage, dangerous or unlawful behaviour), the Host may end the stay immediately by written notice sent to the Guest by WhatsApp message, through the booking platform’s messaging or by e-mail. Remaining nights are handled under the booking channel terms, without prejudice to damages. The Guest then vacates within two hours of the notice.',
  },
  {
    id: 'cl_lcd_force_majeure',
    title: 'Art. 14 — Force majeure',
    bodyFr:
      'Aucune des parties n’est responsable d’un manquement dû à un événement de force majeure au sens du droit marocain (catastrophe naturelle, décision des autorités, épidémie, fermeture des frontières). Le sort des nuits non consommées relève alors des conditions du canal de réservation, sans autre indemnité.',
    bodyEn:
      'Neither party is liable for a failure due to force majeure under Moroccan law (natural disaster, government decision, epidemic, border closure). Unused nights are then handled under the booking channel terms, without further compensation.',
  },
  {
    id: 'cl_lcd_donnees',
    title: 'Art. 15 — Données personnelles',
    bodyFr:
      'Les données du Voyageur et des occupants sont collectées pour la gestion de la réservation et l’exécution des obligations légales de déclaration des voyageurs (loi n° 09-08). Elles sont conservées le temps nécessaire à ces finalités et à la prescription applicable, et ne sont transmises qu’aux autorités habilitées et aux prestataires du Bailleur intervenant dans le séjour. Le Voyageur dispose d’un droit d’accès et de rectification auprès du Bailleur.',
    bodyEn:
      'Guest and occupant data are collected to manage the booking and to meet legal guest declaration duties (Law 09-08). They are kept as long as needed for these purposes and the applicable limitation period, and shared only with authorised authorities and the Host’s service providers involved in the stay. The Guest may access and correct their data through the Host.',
  },
  {
    id: 'cl_lcd_droit',
    title: 'Art. 16 — Droit applicable, litiges, langue',
    bodyFr:
      'Le présent contrat est soumis au droit marocain. Tout litige est soumis, après tentative de règlement amiable, aux tribunaux compétents du lieu de situation du logement. Le contrat est établi en français et en anglais ; en cas de divergence, la version française prévaut. La signature électronique apposée via le lien sécurisé transmis sur WhatsApp vaut signature des parties (loi n° 53-05).',
    bodyEn:
      'This agreement is governed by Moroccan law. Any dispute is submitted, after an attempt at amicable settlement, to the competent courts of the place where the unit is located. The agreement is drawn up in French and English; in case of discrepancy the French version prevails. The electronic signature applied through the secure link sent on WhatsApp constitutes the parties’ signature (Law 53-05).',
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
        'Contrat LCD Maroc v2 — relecture par votre conseil juridique recommandée. Signature électronique simple via le lien WhatsApp.',
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
      'Contrat LCD Maroc v2 — relecture par votre conseil juridique recommandée. Signature électronique simple via le lien WhatsApp.',
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
