export type ServiceActivationStatusEntry = {
  serviceId: string;
  label: string;
  ownerEnabled: boolean;
  listingOverride: boolean | null;
  listingEnabled: boolean | null;
  effectiveEnabled: boolean;
  source: 'owner' | 'listing';
  disabledReason: 'owner' | 'listing' | null;
};

export type ListingServiceActivationPatch = {
  overrides?: Record<string, boolean>;
  unset?: string[];
};
