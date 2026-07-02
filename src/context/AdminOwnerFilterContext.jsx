import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isPmBusinessPath } from '../config/routeAccessPolicy';
import { canSelectOwnerInAdminFilter, getRequestOwnerIdParam } from 'utils/taskScope.utils';
import { usePmSimulation } from './PmSimulationContext';
import { getOwnersAllPages } from '../services/teamDashboardApi';
import { useAuth } from '../hooks/useAuth';
import { toLegacyAuthUser } from '../utils/legacyAuthUser';

const AdminOwnerFilterContext = createContext(null);

export { AdminOwnerFilterContext };

const noop = () => {};
/** Stable empty array for useAdminOwnerFilter fallback (avoid new [] each render → effect loops). */
const EMPTY_OWNER_IDS = Object.freeze([]);

/** Admin métier : unset = écran vide jusqu’au choix explicite ; all = plateforme ; owner = un PM. */
export const ADMIN_SCOPE_UNSET = 'unset';
export const ADMIN_SCOPE_ALL = 'all';
export const ADMIN_SCOPE_OWNER = 'owner';

/**
 * Propriétaire filter for users who can work across owners (see canSelectOwnerInAdminFilter).
 * Property Owner accounts: no filter, scoped data only.
 * Pas de persistance sessionStorage — resélection obligatoire à chaque chargement de page.
 */
export function AdminOwnerFilterProvider({ children }) {
  const { user: authUser } = useAuth();
  const user = useMemo(() => toLegacyAuthUser(authUser), [authUser]);
  const location = useLocation();
  const prevPmPathRef = useRef('');
  const [selectedOwnerId, setSelectedOwnerIdState] = useState('');
  const [adminScopeMode, setAdminScopeMode] = useState(ADMIN_SCOPE_UNSET);
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
    setSelectedOwnerIdState(id ? String(id).trim() : '');
  }, []);

  const setScopeAll = useCallback(() => {
    setAdminScopeMode(ADMIN_SCOPE_ALL);
    setSelectedOwnerIdState('');
  }, []);

  const setScopeOwner = useCallback((id) => {
    const trimmed = id ? String(id).trim() : '';
    if (!trimmed) return;
    setAdminScopeMode(ADMIN_SCOPE_OWNER);
    setSelectedOwnerIdState(trimmed);
  }, []);

  const resetAdminScope = useCallback(() => {
    setAdminScopeMode(ADMIN_SCOPE_UNSET);
    setSelectedOwnerIdState('');
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

  const clearSelection = useCallback(() => resetAdminScope(), [resetAdminScope]);

  useEffect(() => {
    try {
      sessionStorage.removeItem('sojori.adminOwnerFilter.selectedOwnerId');
    } catch {
      /* ignore */
    }
  }, []);

  /** Chaque entrée sur une URL métier PM : écran vide jusqu’au choix explicite (Tous ou un PM). */
  useEffect(() => {
    if (!showOwnerFilter || simulatedOwnerId) return;
    if (!isPmBusinessPath(location.pathname)) {
      prevPmPathRef.current = location.pathname;
      return;
    }
    if (prevPmPathRef.current !== location.pathname) {
      resetAdminScope();
    }
    prevPmPathRef.current = location.pathname;
  }, [location.pathname, showOwnerFilter, simulatedOwnerId, resetAdminScope]);

  useEffect(() => {
    if (!showOwnerFilter) return;
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
  }, [showOwnerFilter]);

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
