import type { WizardDraft } from '../types';
import { applyOnboardingDashboardGuests } from './applyOnboardingDashboardGuests';
import { applyOnboardingOrchestration, type ApplyOrchestrationResult } from './applyOnboardingOrchestration';
import { applyOnboardingStaff, type ApplyStaffResult } from './applyOnboardingStaff';

export type WizardApplyLog = {
  orchestrationAt?: string;
  staffAt?: string;
  guestsAt?: string;
  orchestration?: ApplyOrchestrationResult;
  staff?: ApplyStaffResult;
  guests?: Awaited<ReturnType<typeof applyOnboardingDashboardGuests>>;
};

export type ApplyOnboardingConfigResult = {
  orchestration: ApplyOrchestrationResult;
  staff?: ApplyStaffResult;
  guests?: Awaited<ReturnType<typeof applyOnboardingDashboardGuests>>;
};

export async function applyOnboardingConfig(
  ownerId: string,
  draft: WizardDraft,
  options?: {
    orchestration?: boolean;
    staff?: boolean;
    guests?: boolean;
    propagateToListings?: boolean;
  },
): Promise<ApplyOnboardingConfigResult> {
  const opts = {
    orchestration: options?.orchestration !== false,
    staff: options?.staff === true,
    guests: options?.guests === true,
    propagateToListings: options?.propagateToListings !== false,
  };

  let orchestration: ApplyOrchestrationResult = {
    capabilitiesApplied: 0,
    jxPatched: 0,
    conditionsApplied: false,
    deadlinesPatched: 0,
    listingsUpdated: 0,
    warnings: [],
  };

  if (opts.orchestration) {
    orchestration = await applyOnboardingOrchestration(ownerId, draft, {
      propagateToListings: opts.propagateToListings,
    });
  }

  let staff: ApplyStaffResult | undefined;
  if (opts.staff) {
    staff = await applyOnboardingStaff(ownerId, draft);
  }

  let guests: Awaited<ReturnType<typeof applyOnboardingDashboardGuests>> | undefined;
  if (opts.guests) {
    guests = await applyOnboardingDashboardGuests(ownerId, draft);
  }

  return { orchestration, staff, guests };
}
