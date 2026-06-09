/** Ménage Sojori — cleaningOrchestration sur le listing (srv-listing). */

export type CleaningChecklistItem = {
  id: string;
  label: string;
  required: boolean;
  photoRequired: boolean;
  order: number;
};

export type CleaningSojoriConfig = {
  enabled: boolean;
  preferredDayAfterCheckout: number;
  safetyMaxDirtyDays: number;
  checklist: CleaningChecklistItem[];
};

export const DEFAULT_CLEANING_CHECKLIST: CleaningChecklistItem[] = [
  { id: 'chk_aspirer', label: 'Aspirer toutes les pièces', required: true, photoRequired: true, order: 0 },
  { id: 'chk_sdb', label: 'Nettoyer SDB (douche + WC)', required: true, photoRequired: true, order: 1 },
  { id: 'chk_draps', label: 'Changer draps + housses', required: true, photoRequired: false, order: 2 },
  { id: 'chk_frigo', label: 'Vérifier Frigo', required: true, photoRequired: false, order: 3 },
];

function newChecklistId(): string {
  return `chk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeChecklist(raw: unknown): CleaningChecklistItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_CLEANING_CHECKLIST.map((item, i) => ({ ...item, order: i }));
  }
  return raw
    .map((row, i) => {
      const r = row as Record<string, unknown>;
      return {
        id: String(r.id || newChecklistId()),
        label: String(r.label || '').trim() || 'Item',
        required: r.required !== false,
        photoRequired: r.photoRequired === true,
        order: typeof r.order === 'number' ? r.order : i,
      };
    })
    .sort((a, b) => a.order - b.order)
    .map((item, i) => ({ ...item, order: i }));
}

export function mapListingToCleaningSojoriConfig(raw: Record<string, unknown>): CleaningSojoriConfig {
  const orch = (raw.cleaningOrchestration as Record<string, unknown>) || {};
  const enabled = orch.enabled === true || raw.orchestration_cleaning_sojori === true;
  const preferred = typeof orch.preferredDayAfterCheckout === 'number' ? orch.preferredDayAfterCheckout : 0;
  const safety =
    typeof orch.safetyMaxDirtyDays === 'number'
      ? Math.min(4, Math.max(1, orch.safetyMaxDirtyDays))
      : 4;

  return {
    enabled,
    preferredDayAfterCheckout: Math.min(3, Math.max(0, preferred)),
    safetyMaxDirtyDays: safety,
    checklist: normalizeChecklist(orch.checklist),
  };
}

function existingCleaningOrch(raw?: Record<string, unknown>): Record<string, unknown> {
  const orch = raw?.cleaningOrchestration;
  return orch && typeof orch === 'object' && !Array.isArray(orch)
    ? { ...(orch as Record<string, unknown>) }
    : {};
}

function serializeChecklist(checklist: CleaningChecklistItem[]) {
  return checklist.map((item, i) => ({
    id: item.id,
    label: item.label,
    required: item.required,
    photoRequired: item.photoRequired,
    order: i,
  }));
}

/** Patch complet (legacy — préférer triggers ou checklist seuls). */
export function mapCleaningSojoriToListingPatch(
  cfg: CleaningSojoriConfig,
  listingValues?: Record<string, unknown>,
): Record<string, unknown> {
  const existing = existingCleaningOrch(listingValues);
  return {
    orchestration_cleaning_sojori: cfg.enabled,
    cleaningOrchestration: {
      ...existing,
      enabled: cfg.enabled,
      preferredDayAfterCheckout: cfg.preferredDayAfterCheckout,
      safetyMaxDirtyDays: cfg.safetyMaxDirtyDays,
      checklist: serializeChecklist(cfg.checklist),
    },
  };
}

/** Ménage Sojori : déclenchement + filet (sans écraser la checklist). */
export function mapCleaningSojoriTriggersPatch(
  cfg: Pick<CleaningSojoriConfig, 'enabled' | 'preferredDayAfterCheckout' | 'safetyMaxDirtyDays'>,
  listingValues?: Record<string, unknown>,
): Record<string, unknown> {
  const existing = existingCleaningOrch(listingValues);
  return {
    orchestration_cleaning_sojori: cfg.enabled,
    cleaningOrchestration: {
      ...existing,
      enabled: cfg.enabled,
      preferredDayAfterCheckout: cfg.preferredDayAfterCheckout,
      safetyMaxDirtyDays: cfg.safetyMaxDirtyDays,
    },
  };
}

/** Checklist globale (sans écraser le déclenchement Sojori). */
export function mapCleaningChecklistPatch(
  checklist: CleaningChecklistItem[],
  listingValues?: Record<string, unknown>,
): Record<string, unknown> {
  const existing = existingCleaningOrch(listingValues);
  return {
    cleaningOrchestration: {
      ...existing,
      checklist: serializeChecklist(checklist),
    },
  };
}

export function canPersistListingConfig(listingId: string, templateMode: boolean): boolean {
  return templateMode || Boolean(String(listingId || '').trim());
}

export function createEmptyChecklistItem(order: number): CleaningChecklistItem {
  return {
    id: newChecklistId(),
    label: '',
    required: true,
    photoRequired: false,
    order,
  };
}
