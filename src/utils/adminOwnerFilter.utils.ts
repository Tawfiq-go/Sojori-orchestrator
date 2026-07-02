/** Admin PM scope → query string (`filterOwnerId` repeated), aligned with srv-listing / srv-reservations. */
export function appendFilterOwnerIdsToSearchParams(
  params: URLSearchParams,
  ownerIds: string[],
): void {
  ownerIds
    .map((id) => String(id).trim())
    .filter(Boolean)
    .forEach((id) => params.append('filterOwnerId', id));
}

export const ADMIN_SCOPE_STORAGE_KEY = 'sojori.adminOwnerFilter.scope';

export type PersistedAdminScopeMode = 'all' | 'owner' | 'unset';

export interface PersistedAdminScope {
  mode: PersistedAdminScopeMode;
  ownerId: string;
}

/** Restore admin PM scope from session (default: Tous / plateforme). */
export function readPersistedAdminScope(): PersistedAdminScope {
  try {
    const raw = sessionStorage.getItem(ADMIN_SCOPE_STORAGE_KEY);
    if (!raw) return { mode: 'all', ownerId: '' };
    const parsed = JSON.parse(raw) as Partial<PersistedAdminScope>;
    if (parsed.mode === 'owner' && parsed.ownerId) {
      return { mode: 'owner', ownerId: String(parsed.ownerId).trim() };
    }
    if (parsed.mode === 'all') return { mode: 'all', ownerId: '' };
    // Legacy "unset" or unknown → platform-wide default
    return { mode: 'all', ownerId: '' };
  } catch {
    return { mode: 'all', ownerId: '' };
  }
}

export function persistAdminScope(mode: PersistedAdminScopeMode, ownerId = ''): void {
  try {
    sessionStorage.setItem(
      ADMIN_SCOPE_STORAGE_KEY,
      JSON.stringify({ mode, ownerId: ownerId ? String(ownerId).trim() : '' }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}
