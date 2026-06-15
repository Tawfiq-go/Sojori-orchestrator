import listingsService from '../../services/listingsService';
import * as fulltaskApi from '../../services/fulltaskApi';
import {
  apiOrchestrationToDesign,
  designOrchestrationToApi,
} from '../../utils/fulltaskMappers';
import { unwrapFulltaskData } from '../../utils/unwrapFulltaskResponse';
import type { CatalogMessage, ScheduledOrchestrationMessage } from '../taskHub/staff-design/types';
import { mergeCatalogWithClaudeDefaults } from '../taskHub/staff-design/defaultMessageCatalog';
import type { OwnerOrchestrationDoc } from './ownerOrchestrationApi';

function unwrapData<T>(res: unknown): T | null {
  if (!res || typeof res !== 'object') return null;
  const r = res as { data?: T; success?: boolean };
  if (r.data !== undefined) return r.data;
  return res as T;
}

export async function loadOwnerScheduledMessagesContext(ownerKey: string): Promise<{
  rules: ScheduledOrchestrationMessage[];
  catalog: CatalogMessage[];
  doc: OwnerOrchestrationDoc;
}> {
  const [orchRes, ftRaw] = await Promise.all([
    listingsService.getOwnerOrchestrationCompiled(ownerKey),
    fulltaskApi.getOrchestrationConfig(ownerKey === 'global' ? 'global' : ownerKey).catch(() => null),
  ]);

  const doc = unwrapData<OwnerOrchestrationDoc>(orchRes);
  if (!doc?.ownerId) {
    throw new Error('Modèle orchestration introuvable');
  }

  const ftDoc = ftRaw ? unwrapFulltaskData<Record<string, unknown>>(ftRaw) : null;
  const ftMapped = ftDoc ? apiOrchestrationToDesign(ftDoc) : { catalog: [], scheduledRules: [] };

  let rules = (ftMapped.scheduledRules ?? []) as ScheduledOrchestrationMessage[];
  const fromOwner = Array.isArray(doc.scheduledMessages) ? doc.scheduledMessages : [];
  if (fromOwner.length > 0) {
    rules = apiOrchestrationToDesign({ scheduledMessages: fromOwner }).scheduledRules as ScheduledOrchestrationMessage[];
  }

  const catalog = mergeCatalogWithClaudeDefaults(
    (ftMapped.catalog ?? []) as CatalogMessage[],
  );

  return { rules, catalog, doc };
}

export async function saveOwnerScheduledMessages(
  ownerKey: string,
  rules: ScheduledOrchestrationMessage[],
  catalog: CatalogMessage[],
): Promise<void> {
  const { scheduledMessages } = designOrchestrationToApi([], catalog, rules as Record<string, unknown>[]);
  await listingsService.putOwnerOrchestration(ownerKey, { scheduledMessages });
}

export function newScheduledRuleId(): string {
  return `sched_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyScheduledRule(catalog: CatalogMessage[]): ScheduledOrchestrationMessage {
  const first = catalog.find(c => !c.id.startsWith('msg_relance_')) ?? catalog[0];
  return {
    _id: newScheduledRuleId(),
    label: first?.label ?? 'Nouveau message',
    enabled: true,
    catalogMessageId: first?.id ?? '',
    trigger: {
      reference: 'check_in',
      delay: { value: -1, unit: 'days' },
      time: '10:00',
    },
    deliveryChannel: 'whatsapp',
  };
}
