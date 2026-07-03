import listingsService from '../../../services/listingsService';

/** Copie reminders / staffAssignment / escalade depuis srv-fulltask → owner_orchestrations. */
export async function syncOwnerExecutionFromFulltask(ownerId: string): Promise<number> {
  const res = await listingsService.syncOwnerOrchestrationExecutionFromFulltask(ownerId);
  const data = (res as { data?: { patched?: number } })?.data ?? res;
  return Number((data as { patched?: number })?.patched ?? 0);
}
