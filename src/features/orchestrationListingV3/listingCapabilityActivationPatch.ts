import type { ServiceActivationStatusEntry, ListingServiceActivationPatch } from './listingCapabilityActivationTypes';

export type { ServiceActivationStatusEntry, ListingServiceActivationPatch };

function rowForKey(
  services: ServiceActivationStatusEntry[] | undefined,
  key: string,
): ServiceActivationStatusEntry | undefined {
  return services?.find((s) => s.serviceId === key);
}

export function overridePatchForToggle(
  services: ServiceActivationStatusEntry[],
  key: string,
  checked: boolean,
): ListingServiceActivationPatch {
  const row = rowForKey(services, key);
  const owner = row?.ownerEnabled === true;
  if (checked === owner) {
    return row?.source === 'listing' ? { unset: [key] } : {};
  }
  return { overrides: { [key]: checked } };
}

/**
 * Listing ON/OFF patch that also unsticks the UI when decisions.managed is ON
 * but activation status already looks “aligned” with owner OFF (empty patch).
 * Affects every capability row (mini-bar, pack bienvenue, ménage, …).
 */
export function resolveListingTogglePatch(
  services: ServiceActivationStatusEntry[],
  key: string,
  checked: boolean,
  currentlyOn: boolean,
): ListingServiceActivationPatch {
  const patch = overridePatchForToggle(services, key, checked);
  if (patch.overrides || patch.unset?.length) return patch;

  // Want OFF while the switch still shows ON → force a listing override OFF.
  if (!checked && currentlyOn) {
    return { overrides: { [key]: false } };
  }
  return {};
}
