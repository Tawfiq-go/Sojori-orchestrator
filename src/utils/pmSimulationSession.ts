const STORAGE_KEY = 'sojori.pmSimulation';

export type PmSimulationSnapshot = {
  ownerId: string;
  ownerLabel: string;
  ownerEmail?: string;
  startedAt: string;
  sessionId: string;
  /** Admin connecté au démarrage — évite de réutiliser la simulation après logout / autre compte. */
  startedByUserId?: string;
};

function readRaw(): PmSimulationSnapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PmSimulationSnapshot;
    if (!parsed?.ownerId || !parsed?.sessionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

let memorySnapshot: PmSimulationSnapshot | null = readRaw();

export function getPmSimulationSnapshot(): PmSimulationSnapshot | null {
  return memorySnapshot;
}

export function isPmSimulationActive(): boolean {
  return Boolean(memorySnapshot?.ownerId);
}

export function getPmSimulationOwnerId(): string | null {
  const id = memorySnapshot?.ownerId;
  return id && String(id).trim() ? String(id).trim() : null;
}

export function setPmSimulationSnapshot(snapshot: PmSimulationSnapshot | null): void {
  memorySnapshot = snapshot;
  try {
    if (!snapshot) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota */
  }
}

export function clearPmSimulationSnapshot(): void {
  setPmSimulationSnapshot(null);
}

export function createSimulationSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sim-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Mode de sidebar choisi par l'admin (2026-09-03) — indépendant de l'owner
 * sélectionné : on peut regarder la plateforme avec la sidebar admin seule,
 * ou un owner avec les deux sidebars.
 *   owner : exactement la sidebar d'un Owner
 *   admin : uniquement les groupes infra (Logs, Monitor, Cost, Administration…)
 *   both  : comportement historique (owner + infra)
 */
export type AdminSidebarMode = 'owner' | 'admin' | 'both';
const SIDEBAR_MODE_KEY = 'sojori.adminView.sidebarMode';

export function readAdminSidebarMode(): AdminSidebarMode | null {
  try {
    const raw = sessionStorage.getItem(SIDEBAR_MODE_KEY);
    return raw === 'owner' || raw === 'admin' || raw === 'both' ? raw : null;
  } catch {
    return null;
  }
}

export function persistAdminSidebarMode(mode: AdminSidebarMode | null): void {
  try {
    if (!mode) sessionStorage.removeItem(SIDEBAR_MODE_KEY);
    else sessionStorage.setItem(SIDEBAR_MODE_KEY, mode);
  } catch {
    /* ignore quota */
  }
}
