import React from 'react';
import { useSelector } from 'react-redux';
import { hasAdminAccess } from '../../utils/rbac.utils';

const RoleBasedRenderer = ({ children, requiredRoles = [], adminOnly = false }) => {
  const { user } = useSelector((state) => state.auth);

  if (!user) return null;

  if (adminOnly && !hasAdminAccess(user.role)) {
    return null;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return null;
  }

  return children;
};

export default RoleBasedRenderer;
