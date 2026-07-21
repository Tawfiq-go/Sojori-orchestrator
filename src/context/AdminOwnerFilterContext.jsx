import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { canSelectOwnerInAdminFilter, getRequestOwnerIdParam } from 'utils/taskScope.utils';
import { usePmSimulation } from './PmSimulationContext';
import { getOwnersAllPages } from '../services/teamDashboardApi';
import { useAuth } from '../hooks/useAuth';
import { toLegacyAuthUser } from '../utils/legacyAuthUser';
import {
  persistAdminScope,
  readPersistedAdminScope,
} from '../utils/adminOwnerFilter.utils';

const AdminOwnerFilterContext = createContext(null);

export { AdminOwnerFilterContext };

const noop = () => {};
/** Stable empty array for useAdminOwnerFilter fallback (avoid new [] each render → effect loops). */
const EMPTY_OWNER_IDS = Object.freeze([]);

/** Admin métier : unset = écran vide (legacy) ; all = plateforme ; owner = un PM. */
export const ADMIN_SCOPE_UNSET = 'unset';
export const ADMIN_SCOPE_ALL = 'all';
export const ADMIN_SCOPE_OWNER = 'owner';

function scopeModeFromPersisted(mode) {
  if (mode === 'owner') return ADMIN_SCOPE_OWNER;
  if (mode === 'all') return ADMIN_SCOPE_ALL;
  return ADMIN_SCOPE_ALL;
}

/**
 * Propriétaire filter for users who can work across owners (see canSelectOwnerInAdminFilter).
 * Property Owner accounts: no filter, scoped data only.
 * Admin default: Tous (plateforme). Persists in sessionStorage across pages until changed.
 */
export function AdminOwnerFilterProvider({ children }) {
  const { user: authUser } = useAuth();
  const user = useMemo(() => toLegacyAuthUser(authUser), [authUser]);
  const [initialScope] = useState(() => readPersistedAdminScope());
  const [selectedOwnerId, setSelectedOwnerIdState] = useState(
    initialScope.mode === 'owner' ? initialScope.ownerId : '',
  );
  const [adminScopeMode, setAdminScopeMode] = useState(() =>
    scopeModeFromPersisted(initialScope.mode),
  );
  const [owners, setOwners] = useState([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const { simulatedOwnerId: simulatedOwnerIdFromCtx } = usePmSimulation();
  const simulatedOwnerId = simulatedOwnerIdFromCtx || '';
  const showOwnerFilter = canSelectOwnerInAdminFilter(user) && !simulatedOwnerId;
  const effectiveSelectedOwnerId = simulatedOwnerId || selectedOwnerId;
  const requestOwnerId = useMemo(
    () => getRequestOwnerIdParam(user, effectiveSelectedOwnerId),
    [user, effectiveSelectedOwnerId],
  );
  const ownerScopeUnset =
    showOwnerFilter && !simulatedOwnerId && adminScopeMode === ADMIN_SCOPE_UNSET;
  const ownerScopeAll =
    showOwnerFilter && !simulatedOwnerId && adminScopeMode === ADMIN_SCOPE_ALL;

  /** @type {string[]} for APIs that take filterOwnerId[]; mirrors single selection. */
  const selectedOwnerIds = useMemo(
    () =>
      effectiveSelectedOwnerId && String(effectiveSelectedOwnerId).trim()
        ? [String(effectiveSelectedOwnerId).trim()]
        : [],
    [effectiveSelectedOwnerId],
  );

  const setSelectedOwnerId = useCallback((id) => {
    const trimmed = id ? String(id).trim() : '';
    if (!trimmed) {
      setAdminScopeMode(ADMIN_SCOPE_ALL);
      setSelectedOwnerIdState('');
      persistAdminScope('all', '');
      return;
    }
    setAdminScopeMode(ADMIN_SCOPE_OWNER);
    setSelectedOwnerIdState(trimmed);
    persistAdminScope('owner', trimmed);
  }, []);

  const setScopeAll = useCallback(() => {
    setAdminScopeMode(ADMIN_SCOPE_ALL);
    setSelectedOwnerIdState('');
    persistAdminScope('all', '');
  }, []);

  const setScopeOwner = useCallback((id) => {
    const trimmed = id ? String(id).trim() : '';
    if (!trimmed) return;
    setAdminScopeMode(ADMIN_SCOPE_OWNER);
    setSelectedOwnerIdState(trimmed);
    persistAdminScope('owner', trimmed);
  }, []);

  const resetAdminScope = useCallback(() => {
    setAdminScopeMode(ADMIN_SCOPE_ALL);
    setSelectedOwnerIdState('');
    persistAdminScope('all', '');
  }, []);

  const setSelectedOwnerIds = useCallback(
    (ids) => {
      if (!Array.isArray(ids) || !ids.length) {
        setScopeAll();
        return;
      }
      setScopeOwner(String(ids[0]));
    },
    [setScopeAll, setScopeOwner],
  );

  const clearSelection = useCallback(() => setScopeAll(), [setScopeAll]);

  useEffect(() => {
    if (!showOwnerFilter && !simulatedOwnerId) return;
    let cancelled = false;
    setOwnersLoading(true);
    getOwnersAllPages({ search_text: '', accountStatus: 'live' })
      .then((rows) => {
        if (cancelled) return;
        setOwners(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setOwners([]);
      })
      .finally(() => {
        if (!cancelled) setOwnersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showOwnerFilter, simulatedOwnerId]);

  const value = useMemo(
    () => ({
      showOwnerFilter,
      simulatedOwnerId,
      adminScopeMode,
      ownerScopeUnset,
      ownerScopeAll,
      selectedOwnerId: effectiveSelectedOwnerId,
      setSelectedOwnerId,
      setScopeAll,
      setScopeOwner,
      resetAdminScope,
      selectedOwnerIds,
      setSelectedOwnerIds,
      clearSelection,
      requestOwnerId,
      owners,
      ownersLoading,
    }),
    [
      showOwnerFilter,
      simulatedOwnerId,
      adminScopeMode,
      ownerScopeUnset,
      ownerScopeAll,
      effectiveSelectedOwnerId,
      setSelectedOwnerId,
      setScopeAll,
      setScopeOwner,
      resetAdminScope,
      selectedOwnerIds,
      setSelectedOwnerIds,
      clearSelection,
      requestOwnerId,
      owners,
      ownersLoading,
    ],
  );

  return <AdminOwnerFilterContext.Provider value={value}>{children}</AdminOwnerFilterContext.Provider>;
}

export function useAdminOwnerFilter() {
  const { user: authUser } = useAuth();
  const user = useMemo(() => toLegacyAuthUser(authUser), [authUser]);
  const ctx = useContext(AdminOwnerFilterContext);
  if (ctx) return ctx;
  return {
    showOwnerFilter: false,
    simulatedOwnerId: '',
    adminScopeMode: ADMIN_SCOPE_OWNER,
    ownerScopeUnset: false,
    ownerScopeAll: false,
    selectedOwnerId: '',
    setSelectedOwnerId: noop,
    setScopeAll: noop,
    setScopeOwner: noop,
    resetAdminScope: noop,
    selectedOwnerIds: EMPTY_OWNER_IDS,
    setSelectedOwnerIds: noop,
    clearSelection: noop,
    requestOwnerId: getRequestOwnerIdParam(user, null),
    owners: [],
    ownersLoading: false,
  };
}
