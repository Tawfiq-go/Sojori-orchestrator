import listingsService from '../../services/listingsService';

/** Nombre d'annonces mises à jour après sync owner → listings. */
export async function syncAllListingsFromOwnerOrchestration(ownerKey: string): Promise<number> {
  if (!ownerKey || ownerKey === 'global') return 0;
  const res = await listingsService.applyOwnerOrchestrationToAllListings(ownerKey);
  const body = res as {
    data?: {
      modified?: number;
      orchestration?: { modified?: number; matched?: number };
    };
  };
  return (
    body?.data?.orchestration?.modified ??
    body?.data?.modified ??
    body?.data?.orchestration?.matched ??
    0
  );
}

export function shouldAutoSyncListingsAfterOwnerSave(
  ownerKey: string,
  isAdminTemplate: boolean,
): boolean {
  return Boolean(ownerKey && ownerKey !== 'global' && !isAdminTemplate);
}
