import type { LandlordAccount } from '../types';
import { personName } from './format';

export type ListingRow = { _id?: string; id?: string; name?: string; title?: string };

export type RecurringScopeType = 'listing' | 'pm' | 'landlord';

export const RECURRING_SCOPE_OPTIONS: { value: RecurringScopeType; label: string; hint: string }[] = [
  { value: 'listing', label: 'Listing(s)', hint: 'Une ligne par annonce sélectionnée' },
  { value: 'pm', label: 'PM', hint: 'Charge globale gestionnaire (sans listing)' },
  { value: 'landlord', label: 'Propriétaire', hint: 'Propriétaire immobilier (page Propriétaires) — annonces ou charge globale' },
];

export function describeRecurringScope(input: {
  scopeType?: RecurringScopeType | string;
  listingIds?: string[];
  landlordId?: string;
  landlords?: LandlordAccount[];
}): string {
  const scope = (input.scopeType || 'listing') as RecurringScopeType;
  if (scope === 'pm') return 'Portefeuille PM';
  if (scope === 'landlord') {
    const ll = input.landlords?.find((l) => l._id === input.landlordId);
    const name = ll ? personName(ll.firstName, ll.lastName, ll.email) : '';
    const n = input.listingIds?.length ?? 0;
    if (name && n > 0) return `${name} · ${n} listing(s)`;
    if (name) return name;
    return 'Propriétaire';
  }
  const n = input.listingIds?.length ?? 0;
  return n === 1 ? '1 listing' : `${n} listings`;
}

export function landlordListingIds(landlord: LandlordAccount): string[] {
  return (landlord.listingIds || []).map(String).filter(Boolean);
}

export function listingsForLandlord(all: ListingRow[], landlord: LandlordAccount | undefined): ListingRow[] {
  if (!landlord) return [];
  const ids = new Set(landlordListingIds(landlord));
  if (!ids.size) return [];
  return all.filter((l) => ids.has(String(l._id || l.id)));
}

export function buildRecurringScopeBody(input: {
  scopeType: RecurringScopeType;
  listingIds: string[];
  landlordId: string;
}): Record<string, unknown> {
  const body: Record<string, unknown> = { scopeType: input.scopeType };
  if (input.scopeType === 'listing') {
    body.listingIds = input.listingIds;
  } else if (input.scopeType === 'pm') {
    body.listingIds = [];
  } else {
    body.landlordId = input.landlordId;
    body.listingIds = input.listingIds;
  }
  return body;
}
