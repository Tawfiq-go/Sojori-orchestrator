import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

/**
 * Propriétaire filter for users who can work across owners (see canSelectOwnerInAdminFilter).
 * Property Owner accounts: no filter, scoped data only.
 * Pas de persistance sessionStorage — resélection obligatoire à chaque chargement de page.
 */
export function AdminOwnerFilterProvider({ children }) {
  const { user: authUser } = useAuth();
  const user = useMemo(() => toLegacyAuthUser(authUser), [authUser]);
  const [selectedOwnerId, setSelectedOwnerIdState] = useState('');
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

  const setSelectedOwnerIds = useCallback(
    (ids) => {
      if (!Array.isArray(ids) || !ids.length) {
        setSelectedOwnerId('');
        return;
      }
      setSelectedOwnerId(String(ids[0]));
    },
    [setSelectedOwnerId],
  );

  const clearSelection = useCallback(() => setSelectedOwnerId(''), [setSelectedOwnerId]);

  useEffect(() => {
    try {
      sessionStorage.removeItem('sojori.adminOwnerFilter.selectedOwnerId');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!showOwnerFilter) return;
    let cancelled = false;
    setOwnersLoading(true);
    getOwnersAllPages({ search_text: '' })
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
      selectedOwnerId: effectiveSelectedOwnerId,
      setSelectedOwnerId,
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
      effectiveSelectedOwnerId,
      setSelectedOwnerId,
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
    selectedOwnerId: '',
    setSelectedOwnerId: noop,
    selectedOwnerIds: EMPTY_OWNER_IDS,
    setSelectedOwnerIds: noop,
    clearSelection: noop,
    requestOwnerId: getRequestOwnerIdParam(user, null),
    owners: [],
    ownersLoading: false,
  };
}
