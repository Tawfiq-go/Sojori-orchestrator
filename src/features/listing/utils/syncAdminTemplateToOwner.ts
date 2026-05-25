import listingsService from '../../../services/listingsService';

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

  return lines;
}

/**
 * Admin → PM : srv-listing global → template PM (orchestration + owner config).
 */
export async function syncAdminTemplateToOwnerSimple(targetOwnerId: string): Promise<SimpleSyncResult> {
  const lines: string[] = [];

  try {
    const res = await listingsService.syncOrchestrationTemplateToOwner(targetOwnerId);
    const reportLines = formatSyncReport(res);
    lines.push(...reportLines);
    const orchOk = (res as { data?: { orchestration?: { ok?: boolean } } })?.data?.orchestration?.ok;
    return { ok: Boolean(orchOk), lines };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    lines.push(`Sync API: ${msg}`);
    return { ok: false, lines };
  }
}
