import listingsService from '../../../services/listingsService';
import * as fulltaskApi from '../../../services/fulltaskApi';
import { ORCHESTRATION_ADMIN_OWNER_ID } from '../../../constants/orchestrationAdmin';
import { getOwnersAllPages } from '../../staff/services/serverApi.task';

export type SimpleSyncResult = {
  ok: boolean;
  lines: string[];
};

function formatSyncReport(data: unknown): string[] {
  const lines: string[] = [];
  const body = data as {
    success?: boolean;
    data?: {
      orchestration?: { ok?: boolean; version?: number; error?: string };
      ownerConfig?: {
        access?: { ok?: boolean; hasData?: boolean; error?: string };
        support?: { ok?: boolean; categoriesCount?: number; error?: string };
        concierge?: { ok?: boolean; error?: string };
        chatbot?: { ok?: boolean; menuOptionsCount?: number; error?: string };
        listingApplied?: number;
        listings?: number;
        chatbotApplied?: number;
      };
    };
  };
  const report = body?.data;
  if (!report) {
    lines.push('Réponse sync vide ou invalide');
    return lines;
  }

  const orch = report.orchestration;
  if (orch?.ok) {
    lines.push(`Orchestration → PM OK (v${orch.version ?? '?'})`);
  } else {
    lines.push(`Orchestration: ${orch?.error || 'échec'}`);
  }

  const cfg = report.ownerConfig;
  if (cfg?.access?.ok) {
    lines.push(cfg.access.hasData ? 'Accès template → PM OK' : 'Accès template → PM (vide)');
  } else if (cfg?.access) {
    lines.push(`Accès: ${cfg.access.error || 'échec'}`);
  }
  if (cfg?.support?.ok) {
    lines.push(`Support → PM OK (${cfg.support.categoriesCount ?? 0} cat.)`);
  } else if (cfg?.support) {
    lines.push(`Support: ${cfg.support.error || 'échec'}`);
  }
  if (cfg?.concierge?.ok) {
    lines.push('Conciergerie → PM OK');
  } else if (cfg?.concierge) {
    lines.push(`Conciergerie: ${cfg.concierge.error || 'vide'}`);
  }
  if (cfg?.chatbot?.ok) {
    lines.push(`Menu WhatsApp → PM OK (${cfg.chatbot.menuOptionsCount ?? 0} options)`);
  } else if (cfg?.chatbot) {
    lines.push(`Menu WhatsApp: ${cfg.chatbot.error || 'échec'}`);
  }
  if (cfg?.access?.ok || cfg?.support?.ok || cfg?.concierge?.ok || cfg?.chatbot?.ok) {
    lines.push('Template PM (accès, support, conciergerie, menu WhatsApp, ménage, créneaux) copié');
  }

  return lines;
}

async function copyFulltaskOrchestrationToOwner(targetOwnerId: string, lines: string[]): Promise<void> {
  try {
    await fulltaskApi.copyOrchestrationConfigToOwner('global', targetOwnerId);
    lines.push('Fulltask workflows → PM OK');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    lines.push(`Fulltask: ${msg}`);
  }
}

/**
 * Admin → PM : owner_orchestrations global + template PM (listing-owner-config-template).
 */
export async function syncAdminTemplateToOwnerSimple(targetOwnerId: string): Promise<SimpleSyncResult> {
  const lines: string[] = [];

  try {
    const res = await listingsService.syncOwnerOrchestrationFromAdminToOwner(targetOwnerId);
    const reportLines = formatSyncReport(res);
    lines.push(...reportLines);
    await copyFulltaskOrchestrationToOwner(targetOwnerId, lines);
    const orchOk = (res as { data?: { orchestration?: { ok?: boolean } } })?.data?.orchestration?.ok;
    return { ok: Boolean(orchOk), lines };
  } catch (e: unknown) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    if (status !== 404) {
      const msg = e instanceof Error ? e.message : String(e);
      lines.push(`Sync API: ${msg}`);
      return { ok: false, lines };
    }
  }

  try {
    const res = await listingsService.syncOrchestrationTemplateToOwner(targetOwnerId);
    const reportLines = formatSyncReport(res);
    lines.push(...reportLines);
    await copyFulltaskOrchestrationToOwner(targetOwnerId, lines);
    const orchOk = (res as { data?: { orchestration?: { ok?: boolean } } })?.data?.orchestration?.ok;
    return { ok: Boolean(orchOk), lines };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    lines.push(`Sync API: ${msg}`);
    return { ok: false, lines };
  }
}

/**
 * À la création d’un PM : récupère le Template Admin (listing + fulltask).
 */
export async function seedOwnerFromAdminTemplate(ownerId: string): Promise<SimpleSyncResult> {
  return syncAdminTemplateToOwnerSimple(ownerId);
}

/**
 * Template Admin → tous les PMs (listing bulk + fulltask + repli par owner).
 */
export async function syncAdminTemplateToAllOwners(): Promise<{
  ok: boolean;
  synced: number;
  failed: number;
  lines: string[];
}> {
  const lines: string[] = [];
  let synced = 0;
  let failed = 0;

  try {
    const res = await listingsService.syncOwnerOrchestrationFromAdminToAllOwners();
    const body = res as { data?: { synced?: number; failed?: number; total?: number } };
    synced = body?.data?.synced ?? 0;
    failed = body?.data?.failed ?? 0;
    lines.push(`Listing orchestration → ${synced} PM(s) OK${failed > 0 ? ` · ${failed} échec(s)` : ''}`);
  } catch {
    const rows = await getOwnersAllPages({ search_text: '' });
    for (const o of rows) {
      const id = String(o?._id ?? o?.id ?? '');
      if (!id || id === ORCHESTRATION_ADMIN_OWNER_ID) continue;
      try {
        const result = await syncAdminTemplateToOwnerSimple(id);
        if (result.ok) synced += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
    lines.push(`Repli owner-by-owner → ${synced} PM(s) OK${failed > 0 ? ` · ${failed} échec(s)` : ''}`);
  }

  try {
    await fulltaskApi.copyOrchestrationConfigToAllOwners(ORCHESTRATION_ADMIN_OWNER_ID);
    lines.push('Fulltask workflows → tous les PMs OK');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    lines.push(`Fulltask copy-to-all: ${msg}`);
  }

  return { ok: synced > 0 || failed === 0, synced, failed, lines };
}
