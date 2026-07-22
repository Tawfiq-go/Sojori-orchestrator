export type ProfitColumnType = 'text' | 'number' | 'date' | 'money' | 'percent';

export type ProfitReportColumnDef = {
  key: string;
  label: string;
  type: ProfitColumnType;
  default: boolean;
  group: 'reservation' | 'ledger';
  /** Texte d’aide (tooltip « i » dans la config colonnes). */
  hint: string;
};

/**
 * Ordre PM lisible :
 * identité → séjour → canal → paiement → composition revenu → commission/net
 *
 * Défaut = détail compact (~14 colonnes) : sans extras / déjà encaissé / sur place
 * (souvent redondants avec Total canal + Net).
 */
export const PROFIT_REPORT_RESERVATION_COLUMNS: ProfitReportColumnDef[] = [
  {
    key: 'reservationNumber',
    label: 'Réf. résa',
    type: 'text',
    default: true,
    group: 'reservation',
    hint: 'Code Sojori de la réservation (ex. SJ-…).',
  },
  {
    key: 'guestName',
    label: 'Voyageur',
    type: 'text',
    default: true,
    group: 'reservation',
    hint: 'Nom du client tel que synchro depuis le canal (Booking, Airbnb…).',
  },
  {
    key: 'listingName',
    label: 'Listing',
    type: 'text',
    default: true,
    group: 'reservation',
    hint: 'Annonce / bien concerné par le séjour.',
  },
  {
    key: 'arrivalDate',
    label: 'Arrivée',
    type: 'date',
    default: true,
    group: 'reservation',
    hint: 'Date de check-in du séjour.',
  },
  {
    key: 'departureDate',
    label: 'Départ',
    type: 'date',
    default: false,
    group: 'reservation',
    hint: 'Date de check-out du séjour.',
  },
  {
    key: 'nights',
    label: 'Nuits',
    type: 'number',
    default: true,
    group: 'reservation',
    hint: 'Nombre de nuits facturées.',
  },
  {
    key: 'channelName',
    label: 'Canal / OTA',
    type: 'text',
    default: true,
    group: 'reservation',
    hint: 'Plateforme d’origine : BookingCom, AirBNB, direct…',
  },
  {
    key: 'paymentStatus',
    label: 'Paiement',
    type: 'text',
    default: true,
    group: 'reservation',
    hint: 'Statut de paiement OTA (Payé, Partiel…). Pastille verte / rouge dans le tableau.',
  },
  {
    key: 'status',
    label: 'Statut résa',
    type: 'text',
    default: false,
    group: 'reservation',
    hint: 'Statut opérationnel Sojori (Confirmed, Completed…).',
  },
  {
    key: 'adults',
    label: 'Adultes',
    type: 'number',
    default: false,
    group: 'reservation',
    hint: 'Nombre d’adultes déclarés sur la résa.',
  },
  {
    key: 'children',
    label: 'Enfants',
    type: 'number',
    default: false,
    group: 'reservation',
    hint: 'Nombre d’enfants déclarés sur la résa.',
  },
  {
    key: 'grossRevenue',
    label: 'Revenu brut',
    type: 'money',
    default: true,
    group: 'reservation',
    hint: 'Revenu hébergement Sojori (souvent loyer TTC canal, hors frais sur place). Base pour le % commission.',
  },
  {
    key: 'accommodationAmount',
    label: 'Loyer',
    type: 'money',
    default: true,
    group: 'reservation',
    hint: 'Part hébergement du breakdown OTA (ChannelRent / roomRate). Peut différer légèrement du brut selon le canal.',
  },
  {
    key: 'cleaningFee',
    label: 'Ménage OTA',
    type: 'money',
    default: true,
    group: 'reservation',
    hint: 'Frais de ménage facturé par l’OTA. Vert = inclus canal / rouge = à collecter sur place.',
  },
  {
    key: 'cityTax',
    label: 'Taxe de séjour',
    type: 'money',
    default: true,
    group: 'reservation',
    hint: 'Taxe de séjour / city tax. Souvent à collecter sur place (rouge) si non incluse dans le total canal.',
  },
  {
    key: 'ledgerExtras',
    label: 'Extras Sojori',
    type: 'money',
    default: false,
    group: 'reservation',
    hint: 'Somme des extras journal Sojori liés à cette résa (navette, lit bébé…). Pas un montant OTA.',
  },
  {
    key: 'otherTaxes',
    label: 'Autres taxes',
    type: 'money',
    default: false,
    group: 'reservation',
    hint: 'Taxes OTA hors taxe de séjour. La TVA Booking et la taxe gouvernementale sont ignorées (déjà dans le loyer / non collectées).',
  },
  {
    key: 'taxesTotal',
    label: 'Taxes totales',
    type: 'money',
    default: false,
    group: 'reservation',
    hint: 'Somme taxe de séjour + autres taxes (hors TVA / taxe gouv. ignorées).',
  },
  {
    key: 'otherFees',
    label: 'Autres frais OTA',
    type: 'money',
    default: false,
    group: 'reservation',
    hint: 'Frais canal hors ménage (resort fee, etc.). Rare sur Booking/Airbnb Maroc.',
  },
  {
    key: 'feesTotal',
    label: 'Frais OTA totaux',
    type: 'money',
    default: false,
    group: 'reservation',
    hint: 'Ménage OTA + autres frais OTA. Redondant si seul le ménage existe.',
  },
  {
    key: 'channelTotal',
    label: 'Total canal (client)',
    type: 'money',
    default: true,
    group: 'reservation',
    hint: 'Total payé / dû côté canal (ChannelTotal), ex. loyer + ménage inclus. Souvent proche de « Déjà encaissé ».',
  },
  {
    key: 'otaCommission',
    label: 'Commission OTA',
    type: 'money',
    default: true,
    group: 'reservation',
    hint: 'Commission retenue par Booking/Airbnb. Le % sous la cellule = commission ÷ revenu brut.',
  },
  {
    key: 'otaCommissionPercent',
    label: '% Commission OTA',
    type: 'percent',
    default: false,
    group: 'reservation',
    hint: 'Colonne séparée du %. En pratique le % est déjà affiché sous « Commission OTA » — inutile en défaut.',
  },
  {
    key: 'netRevenue',
    label: 'Net après OTA',
    type: 'money',
    default: true,
    group: 'reservation',
    hint: 'Revenu brut − commission OTA. Avant dépenses journal (ménage Sojori, internet…).',
  },
  {
    key: 'alreadyPaid',
    label: 'Déjà encaissé',
    type: 'money',
    default: false,
    group: 'reservation',
    hint: 'Montant déjà payé via l’OTA (alreadyPaid). Souvent = Total canal si tout est prépayé.',
  },
  {
    key: 'paidAtArrival',
    label: 'Sur place (à collecter)',
    type: 'money',
    default: false,
    group: 'reservation',
    hint: 'Somme des lignes OTA non incluses dans le total canal (souvent taxe de séjour). À encaisser à l’arrivée.',
  },
  {
    key: 'balanceDue',
    label: 'Solde résa',
    type: 'money',
    default: false,
    group: 'reservation',
    hint: 'Reste dû côté résa Sojori (total − déjà payé). 0 si tout est soldé.',
  },
  {
    key: 'currency',
    label: 'Devise',
    type: 'text',
    default: false,
    group: 'reservation',
    hint: 'Devise de la réservation (MAD, EUR…).',
  },
  {
    key: 'listingId',
    label: 'Listing (ID technique)',
    type: 'text',
    default: false,
    group: 'reservation',
    hint: 'Identifiant Mongo du listing — debug / export technique.',
  },
];

/** Ordre canonique : quand → quoi → où → lien résa → qui paie → montant → technique */
export const PROFIT_REPORT_LEDGER_COLUMNS: ProfitReportColumnDef[] = [
  {
    key: 'date',
    label: 'Date',
    type: 'date',
    default: true,
    group: 'ledger',
    hint: 'Date d’imputation de la ligne journal (souvent date de checkout pour ménage par séjour).',
  },
  {
    key: 'name',
    label: 'Libellé',
    type: 'text',
    default: true,
    group: 'ledger',
    hint: 'Nom de la dépense ou de l’extra (ex. Menage checkout, Fibre Orange).',
  },
  {
    key: 'category',
    label: 'Catégorie',
    type: 'text',
    default: true,
    group: 'ledger',
    hint: 'Catégorie comptable Sojori (Ménage, Internet…).',
  },
  {
    key: 'listingName',
    label: 'Listing',
    type: 'text',
    default: true,
    group: 'ledger',
    hint: 'Bien auquel la ligne est rattachée.',
  },
  {
    key: 'reservationNumber',
    label: 'Résa.',
    type: 'text',
    default: true,
    group: 'ledger',
    hint: 'Réservation liée si la ligne est « par séjour » (sinon —).',
  },
  {
    key: 'paidBy',
    label: 'Payé par',
    type: 'text',
    default: true,
    group: 'ledger',
    hint: 'Qui supporte le coût : PM, Propriétaire ou Client.',
  },
  {
    key: 'amount',
    label: 'Montant',
    type: 'money',
    default: true,
    group: 'ledger',
    hint: 'Montant de la ligne. Dépenses en négatif / extras en positif dans le tableau.',
  },
  {
    key: 'type',
    label: 'Type',
    type: 'text',
    default: false,
    group: 'ledger',
    hint: 'Dépense ou Extra (cashflow journal).',
  },
  {
    key: 'listingId',
    label: 'Listing (ID technique)',
    type: 'text',
    default: false,
    group: 'ledger',
    hint: 'Identifiant Mongo du listing — debug.',
  },
  {
    key: 'reservationId',
    label: 'Résa. (ID technique)',
    type: 'text',
    default: false,
    group: 'ledger',
    hint: 'Identifiant Mongo de la réservation — debug.',
  },
];

export type ProfitReportColumnConfig = {
  reservations: string[];
  ledger: string[];
};

export function sortColumnKeys(keys: string[], catalog: ProfitReportColumnDef[]): string[] {
  const order = new Map(catalog.map((c, i) => [c.key, i]));
  return [...keys].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999));
}

export function defaultProfitReportColumnConfig(): ProfitReportColumnConfig {
  return {
    reservations: PROFIT_REPORT_RESERVATION_COLUMNS.filter((c) => c.default).map((c) => c.key),
    ledger: PROFIT_REPORT_LEDGER_COLUMNS.filter((c) => c.default).map((c) => c.key),
  };
}

export function normalizeColumnConfig(
  input?: Partial<ProfitReportColumnConfig> | null,
): ProfitReportColumnConfig {
  const defaults = defaultProfitReportColumnConfig();
  const allowedResa = new Set(PROFIT_REPORT_RESERVATION_COLUMNS.map((c) => c.key));
  const allowedLedger = new Set(PROFIT_REPORT_LEDGER_COLUMNS.map((c) => c.key));
  const reservations = sortColumnKeys(
    migrateReservationColumnKeys(
      (input?.reservations || defaults.reservations).filter((k) => allowedResa.has(k)),
    ),
    PROFIT_REPORT_RESERVATION_COLUMNS,
  );
  const ledger = sortColumnKeys(
    migrateLedgerColumnKeys((input?.ledger || defaults.ledger).filter((k) => allowedLedger.has(k))),
    PROFIT_REPORT_LEDGER_COLUMNS,
  );
  return {
    reservations: reservations.length ? reservations : defaults.reservations,
    ledger: ledger.length ? ledger : defaults.ledger,
  };
}

/** Colonnes affichées dépenses / extras — « Montant » toujours visible. */
export function ledgerDisplayColumnKeys(ledgerKeys: string[]): string[] {
  const keys = [...ledgerKeys];
  if (!keys.includes('amount')) keys.push('amount');
  return sortColumnKeys(keys, PROFIT_REPORT_LEDGER_COLUMNS);
}

function migrateLedgerColumnKeys(keys: string[]): string[] {
  const out: string[] = [];
  for (const k of keys) {
    let next = k;
    if (k === 'listingId') next = 'listingName';
    if (k === 'reservationId') next = 'reservationNumber';
    if (!out.includes(next)) out.push(next);
  }
  return out.filter((k) => {
    if (k === 'listingId' && out.includes('listingName')) return false;
    if (k === 'reservationId' && out.includes('reservationNumber')) return false;
    return true;
  });
}

function migrateReservationColumnKeys(keys: string[]): string[] {
  const out: string[] = [];
  for (const k of keys) {
    const next = k === 'listingId' ? 'listingName' : k;
    if (!out.includes(next)) out.push(next);
  }
  const base = out.includes('listingName') ? out.filter((k) => k !== 'listingId') : out;
  return ensurePmFinanceColumns(base);
}

function ensurePmFinanceColumns(keys: string[]): string[] {
  const markers = ['cleaningFee', 'cityTax', 'paidAtArrival', 'accommodationAmount', 'channelTotal'];
  if (keys.some((k) => markers.includes(k))) {
    return keys.filter((k) => k !== 'otaCommissionPercent');
  }
  const inject = PROFIT_REPORT_RESERVATION_COLUMNS.filter((c) => c.default).map((c) => c.key);
  const set = new Set(keys.filter((k) => k !== 'otaCommissionPercent' && k !== 'balanceDue'));
  for (const k of inject) set.add(k);
  return [...set];
}

export function formatProfitReportCell(
  type: ProfitColumnType,
  value: unknown,
  currency: string,
): string {
  if (value == null || value === '') return '—';
  if (type === 'date') {
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('fr-FR');
  }
  if (type === 'money') {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return `${n.toLocaleString('fr-FR')} ${currency}`;
  }
  if (type === 'percent') {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`;
  }
  if (type === 'number') return String(value);
  return String(value);
}

export function ledgerCellValue(
  key: string,
  line: Record<string, unknown>,
  currency: string,
): string {
  if (key === 'type') {
    return line.type === 'extra' ? 'Extra' : 'Dépense';
  }
  if (key === 'paidBy') {
    const pb = String(line.paidBy || '');
    if (pb === 'landlord') return 'Propriétaire';
    if (pb === 'guest') return 'Client';
    return 'PM';
  }
  if (key === 'listingName') {
    return String(line.listingName || '').trim() || '—';
  }
  if (key === 'listingId' || key === 'reservationId') return '—';
  if (key === 'reservationNumber') {
    return String(line.reservationNumber || '').trim() || '—';
  }
  const def = PROFIT_REPORT_LEDGER_COLUMNS.find((c) => c.key === key);
  return formatProfitReportCell(def?.type || 'text', line[key], currency);
}
