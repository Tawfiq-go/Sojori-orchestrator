import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { canSelectOwnerInAdminFilter, getRequestOwnerIdParam } from 'utils/taskScope.utils';
import { getOwnersAllPages } from 'features/staff/services/serverApi.task';
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
 */
export function AdminOwnerFilterProvider({ children }) {
  const { user: authUser } = useAuth();
  const user = useMemo(() => toLegacyAuthUser(authUser), [authUser]);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [owners, setOwners] = useState([]);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const showOwnerFilter = canSelectOwnerInAdminFilter(user);
  const requestOwnerId = useMemo(
    () => getRequestOwnerIdParam(user, selectedOwnerId),
    [user, selectedOwnerId],
  );

  /** @type {string[]} for APIs that take filterOwnerId[]; mirrors single selection. */
  const selectedOwnerIds = useMemo(
    () => (selectedOwnerId && String(selectedOwnerId).trim() ? [String(selectedOwnerId).trim()] : []),
    [selectedOwnerId],
  );

  const setSelectedOwnerIds = useCallback((ids) => {
    if (!Array.isArray(ids) || !ids.length) {
      setSelectedOwnerId('');
      return;
    }
    setSelectedOwnerId(String(ids[0]));
  }, []);

  const clearSelection = useCallback(() => setSelectedOwnerId(''), []);

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
      selectedOwnerId,
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
      selectedOwnerId,
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
