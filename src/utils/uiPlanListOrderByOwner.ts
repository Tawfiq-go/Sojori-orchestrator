import * as fulltaskApi from '../services/fulltaskApi';
import { unwrapFulltaskData } from './unwrapFulltaskResponse';
import { toFulltaskOwnerKey } from './fulltaskOwnerKey';

export type UiPlanListOrderCache = Record<string, string[]>;

export async function loadUiPlanListOrdersByOwner(
  ownerIds: Iterable<string | undefined | null>,
): Promise<UiPlanListOrderCache> {
  const keys = [...new Set([...ownerIds].map(toFulltaskOwnerKey))];
  const out: UiPlanListOrderCache = {};

  await Promise.all(
    keys.map(async (key) => {
      try {
        const raw = await fulltaskApi.getOrchestrationConfig(key);
        const doc = unwrapFulltaskData<{ uiPlanListOrder?: string[] }>(raw);
        const order = doc?.uiPlanListOrder;
        out[key] = Array.isArray(order) ? order : [];
      } catch {
        out[key] = [];
      }
    }),
  );

  return out;
}

/** Ordre plan : snapshot API plan > cache owner > undefined (défaut front). */
export function uiPlanListOrderForPlan(
  planDoc: { ownerId?: string; uiPlanListOrder?: string[] },
  cache: UiPlanListOrderCache,
): string[] | undefined {
  if (Array.isArray(planDoc.uiPlanListOrder) && planDoc.uiPlanListOrder.length > 0) {
    return planDoc.uiPlanListOrder;
  }
  const cached = cache[toFulltaskOwnerKey(planDoc.ownerId)];
  return cached?.length ? cached : undefined;
}
