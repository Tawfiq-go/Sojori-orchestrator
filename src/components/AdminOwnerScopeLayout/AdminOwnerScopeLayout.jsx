import React from 'react';
import { AdminOwnerFilterProvider } from 'context/AdminOwnerFilterContext';
import OwnerFilterBar from 'components/OwnerFilterBar/OwnerFilterBar';

/**
 * Propriétaire filter (admins / cross-tenant users) for any dashboard section.
 * @param {boolean} [inlineBar] - compact toolbar (default true); set false for full-width strip
 * @param {boolean} [showTopBar] - if false, only the provider; put OwnerFilterField in the local filter row
 */
export default function AdminOwnerScopeLayout({ children, inlineBar = true, showTopBar = true }) {
  return (
    <AdminOwnerFilterProvider>
      {showTopBar ? <OwnerFilterBar inline={inlineBar} /> : null}
      {children}
    </AdminOwnerFilterProvider>
  );
}
