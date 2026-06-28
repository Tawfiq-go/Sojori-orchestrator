import type { FeatureGrant } from '../../utils/ownerRoutePermissions';

export type LandlordContractType = 'fixed' | 'percent_with_ota' | 'percent_without_ota';

export type LandlordContract = {
  type?: LandlordContractType;
  fixedAmount?: number;
  fixedPeriod?: 'per_month' | 'per_booking' | 'per_year';
  commissionPercent?: number;
  revenueBase?: 'gross' | 'net_after_ota';
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

export type LedgerEntry = {
  _id: string;
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
  listingIds?: string[];
  frequency?: string;
  dayOfMonth?: number;
  lastDayOfMonth?: boolean;
  dayOfWeek?: number;
  enabled?: boolean;
  nextRunAt?: string;
};

export type ProfitReportStatus = 'draft' | 'published' | 'archived';

export type ProfitMetric = {
  key: string;
  label: string;
  value: number;
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
  };
  updatedAt?: string;
  createdAt?: string;
};
