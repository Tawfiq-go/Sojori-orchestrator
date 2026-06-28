export type ProfitColumnType = 'text' | 'number' | 'date' | 'money';

export type ProfitReportColumnDef = {
  key: string;
  label: string;
  type: ProfitColumnType;
  default: boolean;
  group: 'reservation' | 'ledger';
};

/** Ordre canonique : identité → séjour → voyageurs → canal → statut → finances → technique */
export const PROFIT_REPORT_RESERVATION_COLUMNS: ProfitReportColumnDef[] = [
  { key: 'reservationNumber', label: 'Réf. résa', type: 'text', default: true, group: 'reservation' },
  { key: 'guestName', label: 'Voyageur', type: 'text', default: true, group: 'reservation' },
  { key: 'listingName', label: 'Listing', type: 'text', default: true, group: 'reservation' },
  { key: 'arrivalDate', label: 'Arrivée', type: 'date', default: true, group: 'reservation' },
  { key: 'departureDate', label: 'Départ', type: 'date', default: false, group: 'reservation' },
  { key: 'nights', label: 'Nuits', type: 'number', default: true, group: 'reservation' },
  { key: 'adults', label: 'Adultes', type: 'number', default: false, group: 'reservation' },
  { key: 'children', label: 'Enfants', type: 'number', default: false, group: 'reservation' },
  { key: 'channelName', label: 'Canal / OTA', type: 'text', default: true, group: 'reservation' },
  { key: 'status', label: 'Statut résa', type: 'text', default: false, group: 'reservation' },
  { key: 'grossRevenue', label: 'Revenu brut', type: 'money', default: true, group: 'reservation' },
  { key: 'otaCommission', label: 'Commission OTA', type: 'money', default: true, group: 'reservation' },
  { key: 'netRevenue', label: 'Net après OTA', type: 'money', default: true, group: 'reservation' },
  { key: 'alreadyPaid', label: 'Déjà encaissé', type: 'money', default: false, group: 'reservation' },
  { key: 'paymentStatus', label: 'Statut paiement', type: 'text', default: false, group: 'reservation' },
  { key: 'currency', label: 'Devise', type: 'text', default: false, group: 'reservation' },
  { key: 'listingId', label: 'Listing (ID technique)', type: 'text', default: false, group: 'reservation' },
];

/** Ordre canonique : quand → quoi → où → lien résa → qui paie → montant → technique */
export const PROFIT_REPORT_LEDGER_COLUMNS: ProfitReportColumnDef[] = [
  { key: 'date', label: 'Date', type: 'date', default: true, group: 'ledger' },
  { key: 'name', label: 'Libellé', type: 'text', default: true, group: 'ledger' },
  { key: 'category', label: 'Catégorie', type: 'text', default: true, group: 'ledger' },
  { key: 'listingName', label: 'Listing', type: 'text', default: true, group: 'ledger' },
  { key: 'reservationNumber', label: 'Résa.', type: 'text', default: true, group: 'ledger' },
  { key: 'paidBy', label: 'Payé par', type: 'text', default: true, group: 'ledger' },
  { key: 'amount', label: 'Montant', type: 'money', default: true, group: 'ledger' },
  { key: 'type', label: 'Type', type: 'text', default: false, group: 'ledger' },
  { key: 'listingId', label: 'Listing (ID technique)', type: 'text', default: false, group: 'ledger' },
  { key: 'reservationId', label: 'Résa. (ID technique)', type: 'text', default: false, group: 'ledger' },
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
  if (out.includes('listingName')) {
    return out.filter((k) => k !== 'listingId');
  }
  return out;
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
