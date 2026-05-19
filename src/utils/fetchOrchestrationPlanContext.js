// Fetch owner task template + listing orchestration flags for plan timeline enrichment.
import { getOrchestratorTaskTemplate } from '../services/orchestratorConfigService';
import listingsService from '../services/listingsService';

/**
 * @param {object} planData - GET /orchestration/plans/:code response.data
 * @returns {Promise<{ ownerTemplate: object|null, listingDoc: object|null }>}
 */
export async function fetchOrchestrationPlanContext(planData) {
  const ownerId = planData?.ownerId;
  const listingId = planData?.listingId;

  const [ownerTemplateResult, listingDoc] = await Promise.all([
    ownerId
      ? getOrchestratorTaskTemplate(String(ownerId)).catch(() => null)
      : Promise.resolve(null),
    listingId
      ? listingsService.getListingDocument(String(listingId)).catch(() => null)
      : Promise.resolve(null),
  ]);

  const ownerTemplate =
    ownerTemplateResult?.success && ownerTemplateResult?.data
      ? ownerTemplateResult.data
      : null;

  const planMeta = {
    checkInDate: planData?.checkInDate,
    checkOutDate: planData?.checkOutDate,
    otaSource: planData?.otaSource ?? planData?.source,
    atSojoriDirect: planData?.atSojoriDirect ?? planData?.isDirectBooking,
  };

  return { ownerTemplate, listingDoc, planMeta };
}
