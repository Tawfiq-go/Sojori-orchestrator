import listingsService from '../../services/listingsService';
import * as fulltaskApi from '../../services/fulltaskApi';
import {
  apiOrchestrationToDesign,
  designOrchestrationToApi,
} from '../../utils/fulltaskMappers';
import { unwrapFulltaskData } from '../../utils/unwrapFulltaskResponse';
import type { CatalogMessage, ScheduledOrchestrationMessage } from '../taskHub/staff-design/types';
import { mergeCatalogWithClaudeDefaults } from '../taskHub/staff-design/defaultMessageCatalog';
import type { ListingOrchestrationDoc } from './listingOrchestrationApi';

function unwrapData<T>(res: unknown): T | null {
  if (!res || typeof res !== 'object') return null;
  const r = res as { data?: T; success?: boolean };
  if (r.data !== undefined) return r.data;
  return res as T;
}

function mapScheduledRules(raw: unknown[]): ScheduledOrchestrationMessage[] {
  return apiOrchestrationToDesign({ scheduledMessages: raw }).scheduledRules as ScheduledOrchestrationMessage[];
}

export async function loadListingScheduledMessagesContext(
  listingId: string,
  ownerKey: string,
): Promise<{
  rules: ScheduledOrchestrationMessage[];
  catalog: CatalogMessage[];
  doc: ListingOrchestrationDoc;
  rulesSource: 'listing' | 'owner' | 'fulltask';
}> {
  const [orchRes, ftRaw, ownerOrchRes] = await Promise.all([
    listingsService.getListingOrchestrationCompiled(listingId),
    fulltaskApi.getOrchestrationConfig(ownerKey === 'global' ? 'global' : ownerKey).catch(() => null),
    listingsService.getOwnerOrchestrationCompiled(ownerKey).catch(() => null),
  ]);

  const doc = unwrapData<ListingOrchestrationDoc>(orchRes);
  if (!doc?.listingId) {
    throw new Error('Orchestration listing introuvable');
  }

  const ftDoc = ftRaw ? unwrapFulltaskData<Record<string, unknown>>(ftRaw) : null;
  const ftMapped = ftDoc ? apiOrchestrationToDesign(ftDoc) : { catalog: [], scheduledRules: [] };

  const fromListing = Array.isArray(doc.scheduledMessages) ? doc.scheduledMessages : [];
  let rulesSource: 'listing' | 'owner' | 'fulltask' = 'listing';
  let rules: ScheduledOrchestrationMessage[] = [];

  if (fromListing.length > 0) {
    rules = mapScheduledRules(fromListing);
  } else {
    const ownerDoc = unwrapData<{ scheduledMessages?: unknown[] }>(ownerOrchRes);
    const fromOwner = Array.isArray(ownerDoc?.scheduledMessages) ? ownerDoc.scheduledMessages : [];
    if (fromOwner.length > 0) {
      rules = mapScheduledRules(fromOwner);
      rulesSource = 'owner';
    } else if ((ftMapped.scheduledRules ?? []).length > 0) {
      rules = ftMapped.scheduledRules as ScheduledOrchestrationMessage[];
      rulesSource = 'fulltask';
    }
  }

  const catalog = mergeCatalogWithClaudeDefaults(
    (ftMapped.catalog ?? []) as CatalogMessage[],
  );

  return { rules, catalog, doc, rulesSource };
}

export async function saveListingScheduledMessages(
  listingId: string,
  rules: ScheduledOrchestrationMessage[],
  catalog: CatalogMessage[],
): Promise<void> {
  const { scheduledMessages } = designOrchestrationToApi([], catalog, rules as Record<string, unknown>[]);
  await listingsService.putListingOrchestration(listingId, { scheduledMessages });
}
