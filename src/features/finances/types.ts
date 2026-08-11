import type { FeatureGrant } from '../../utils/ownerRoutePermissions';

export type LandlordContractType = 'fixed' | 'percent_with_ota' | 'percent_without_ota';

export type LandlordContract = {
  type?: LandlordContractType;
  fixedAmount?: number;
  fixedPeriod?: 'per_month' | 'per_booking' | 'per_year';
  commissionPercent?: number;
  revenueBase?: 'gross' | 'net_after_ota';
  includesOtaCommission?: boolean;
  /** Ménage OTA 100 % PM */
  cleaningRetainedByPm?: boolean;
  currency?: string;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  notes?: string;
};

export type LandlordAccount = {
  _id: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  listingIds?: string[];
  listingCityIds?: string[];
  featureGrants?: FeatureGrant[];
  landlordContract?: LandlordContract;
  deleted?: boolean;
  banned?: boolean;
};

export type LedgerEntryType = 'expense' | 'extra';

export type LedgerSource = 'manual' | 'recurring' | 'import' | 'task' | 'whatsapp';

export type LedgerEntry = {
  _id: string;
  entryCode?: string;
  type: LedgerEntryType;
  name: string;
  description?: string;
  amount: number;
  currency?: string;
  date?: string;
  categoryId?: string;
  categoryLabel?: string;
  paidBy?: 'pm' | 'landlord' | 'guest';
  collectedBy?: 'pm' | 'landlord';
  listingId?: string;
  reservationId?: string;
  transactionGroupId?: string;
  transactionRole?: string;
  status?: string;
  supplier?: string;
  invoiceUrls?: string[];
  source?: LedgerSource;
  recurringTemplateId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ExpenseCategory = {
  _id: string;
  name: string;
  kind?: string;
};

export type RecurringTemplate = {
  _id: string;
  name: string;
  type?: LedgerEntryType;
  amount: number;
  currency?: string;
  categoryId?: string;
  scopeType?: 'listing' | 'pm' | 'landlord';
  listingIds?: string[];
  landlordId?: string;
  paidBy?: 'pm' | 'landlord' | 'guest';
  frequency?: string;
  dayOfMonth?: number;
  lastDayOfMonth?: boolean;
  dayOfWeek?: number;
  enabled?: boolean;
  nextRunAt?: string;
  /** Présent uniquement dans la réponse de création (lignes de rattrapage). */
  catchUpCreated?: number;
};

export type ProfitReportStatus = 'draft' | 'published' | 'archived';

/** En-tête PDF/HTML figé dans snapshot.header */
export type ProfitReportHeader = {
  companyName?: string;
  publicName?: string;
  tagline?: string;
  logoText?: string;
  logoUrl?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
};

export type ProfitMetric = {
  key: string;
  label: string;
  value: number;
  hint?: string;
};

export type ProfitListingBilan = {
  listingId: string;
  listingName: string;
  landlordId?: string;
  landlordName?: string;
  reservations: number;
  nights: number;
  grossRevenue: number;
  /** Somme loyers (hébergement) */
  accommodationTotal?: number;
  /** Somme extras Sojori */
  extrasTotal?: number;
  otaCommission: number;
  cleaningRetained: number;
  cityTaxCollected: number;
  pmCommission: number;
  checkoutCleaningCost: number;
  otherPmExpenses: number;
  fixedRent?: number;
  fixedWifi?: number;
  fixedElectricity?: number;
  staffSalaryShare?: number;
  netPmContribution: number;
  avgAccommodationPerNight: number | null;
};

export type ProfitLandlordBilan = {
  landlordId: string;
  landlordName: string;
  listings: number;
  reservations: number;
  nights: number;
  grossRevenue: number;
  accommodationTotal?: number;
  extrasTotal?: number;
  otaCommission: number;
  cleaningRetained: number;
  cityTaxCollected: number;
  pmCommission: number;
  checkoutCleaningCost: number;
  otherPmExpenses: number;
  netPmContribution: number;
};

export type ProfitReport = {
  _id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  landlordId?: string;
  listingIds?: string[];
  status: ProfitReportStatus;
  publishedAt?: string;
  currency?: string;
  snapshot?: {
    metrics?: ProfitMetric[];
    reservations?: Array<Record<string, unknown>>;
    expenses?: Array<Record<string, unknown>>;
    extras?: Array<Record<string, unknown>>;
    grandTotal?: number;
    currency?: string;
    contract?: LandlordContract;
    columnConfig?: {
      reservations: string[];
      ledger: string[];
    };
    header?: ProfitReportHeader;
    reportKind?: 'pm_business' | 'landlord';
    businessModel?: 'gestion' | 'sous_location';
    /** État (période) vs Projection — le cash flow « réel » arrivera plus tard. */
    periodNature?: 'etat' | 'projection';
    listingBilans?: ProfitListingBilan[];
    landlordBilans?: ProfitLandlordBilan[];
    topListing?: ProfitListingBilan | null;
    topLandlord?: ProfitLandlordBilan | null;
  };
  updatedAt?: string;
  createdAt?: string;
};
