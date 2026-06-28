import { inviteWorker } from '../../../services/teamDashboardApi';
import type { WizardDraft } from '../types';

export type GuestApplyResult = { email: string; ok: boolean; error?: string; skipped?: boolean };

/** Panel 2 — invités dashboard (hors lignes équipe panel 1). */
export async function applyOnboardingDashboardGuests(
  ownerId: string,
  draft: WizardDraft,
): Promise<GuestApplyResult[]> {
  const guests = draft.panels['2']?.guests ?? [];
  const menuAccess = draft.panels['2']?.menuAccess;
  const grants = menuAccess
    ? Object.entries(menuAccess)
        .filter(([, on]) => on)
        .map(([feature]) => ({ feature, actions: ['get'] }))
    : [];

  const results: GuestApplyResult[] = [];
  for (const g of guests) {
    const email = g.email?.trim();
    if (!email) continue;
    const parts = (g.name || '').trim().split(/\s+/);
    const firstName = parts[0] || 'Invité';
    const lastName = parts.slice(1).join(' ') || 'Dashboard';
    try {
      await inviteWorker({
        email,
        firstName,
        lastName,
        workerTypeOwner: true,
        ownerId,
        ownerAccess: false,
        featureGrants: grants,
        listingIds: [],
        listingCityIds: [],
      });
      results.push({ email, ok: true });
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Invitation échouée';
      if (/already in use|déjà/i.test(err)) {
        results.push({ email, ok: true, skipped: true });
      } else {
        results.push({ email, ok: false, error: err });
      }
    }
  }
  return results;
}
