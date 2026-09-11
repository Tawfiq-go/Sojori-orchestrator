import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  overridePatchForToggle,
  resolveListingTogglePatch,
} from './listingCapabilityActivationPatch';
import type { ServiceActivationStatusEntry } from './listingCapabilityActivationTypes';

function row(
  partial: Partial<ServiceActivationStatusEntry> & Pick<ServiceActivationStatusEntry, 'serviceId'>,
): ServiceActivationStatusEntry {
  return {
    label: partial.serviceId,
    ownerEnabled: false,
    listingOverride: null,
    listingEnabled: null,
    effectiveEnabled: false,
    source: 'owner',
    disabledReason: null,
    ...partial,
  };
}

describe('listing capability activation toggle', () => {
  it('overridePatchForToggle unsets when turning OFF to match owner OFF with a listing override', () => {
    const services = [
      row({
        serviceId: 'minibar_check',
        ownerEnabled: false,
        source: 'listing',
        listingOverride: true,
        listingEnabled: true,
        effectiveEnabled: true,
      }),
    ];
    assert.deepEqual(overridePatchForToggle(services, 'minibar_check', false), {
      unset: ['minibar_check'],
    });
  });

  it('overridePatchForToggle returns empty when already aligned (stuck OFF path)', () => {
    const services = [
      row({
        serviceId: 'welcome_package',
        ownerEnabled: false,
        source: 'owner',
        effectiveEnabled: false,
      }),
    ];
    assert.deepEqual(overridePatchForToggle(services, 'welcome_package', false), {});
  });

  it('resolveListingTogglePatch forces override OFF when UI still shows ON', () => {
    const services = [
      row({
        serviceId: 'welcome_package',
        ownerEnabled: false,
        source: 'owner',
        effectiveEnabled: false,
      }),
    ];
    assert.deepEqual(
      resolveListingTogglePatch(services, 'welcome_package', false, true),
      { overrides: { welcome_package: false } },
    );
    assert.deepEqual(
      resolveListingTogglePatch(services, 'minibar_check', false, true),
      { overrides: { minibar_check: false } },
    );
  });

  it('resolveListingTogglePatch keeps empty when already OFF visually', () => {
    const services = [
      row({
        serviceId: 'minibar_check',
        ownerEnabled: false,
        source: 'owner',
        effectiveEnabled: false,
      }),
    ];
    assert.deepEqual(resolveListingTogglePatch(services, 'minibar_check', false, false), {});
  });

  it('resolveListingTogglePatch turns OFF when owner is ON (listing override false)', () => {
    const services = [
      row({
        serviceId: 'welcome_package',
        ownerEnabled: true,
        source: 'owner',
        effectiveEnabled: true,
      }),
    ];
    assert.deepEqual(resolveListingTogglePatch(services, 'welcome_package', false, true), {
      overrides: { welcome_package: false },
    });
  });
});
