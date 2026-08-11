import React, { useContext } from 'react';
import {
  AdminOwnerFilterContext,
  AdminOwnerFilterProvider,
} from 'context/AdminOwnerFilterContext';
import OwnerFilterBar from 'components/OwnerFilterBar/OwnerFilterBar';

/**
 * Propriétaire filter (admins / cross-tenant users) for any dashboard section.
 * If already under AdminOwnerFilterProvider (DashboardShell), reuse it — do not nest
 * a second provider (sessionStorage syncs but React state does not).
 * @param {boolean} [inlineBar] - compact toolbar (default true); set false for full-width strip
 * @param {boolean} [showTopBar] - if false, only wrap with provider when missing
 */
export default function AdminOwnerScopeLayout({ children, inlineBar = true, showTopBar = true }) {
  const existing = useContext(AdminOwnerFilterContext);
  const body = (
    <>
      {showTopBar ? <OwnerFilterBar inline={inlineBar} /> : null}
      {children}
    </>
  );
  if (existing) return body;
  return <AdminOwnerFilterProvider>{body}</AdminOwnerFilterProvider>;
}
