import { enrichOwnerGestionFromTemplateDoc } from './enrichOwnerGestionFromTemplate';
import type { OwnerOrchestrationEffective } from './ownerOrchestrationApi';

/** Repli front si l’API compiled n’a pas encore le enrich backend. */
export async function enrichOwnerDocGestionFromTemplate(
  ownerKey: string,
  doc: OwnerOrchestrationEffective,
): Promise<OwnerOrchestrationEffective> {
  if (ownerKey === 'global') return doc;
  const capabilities = await enrichOwnerGestionFromTemplateDoc(ownerKey, doc.capabilities ?? {});
  return { ...doc, capabilities };
}
