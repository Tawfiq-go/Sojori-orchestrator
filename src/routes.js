/**
 * Métadonnées routes Équipe & Rôles (permissions matrix) — extrait legacy sojori-dashboard.
 * Pas de composants React : buildFeatureRows uniquement.
 */
import { Roles } from './constants/roles';

const ALL_ACTIONS = ['get', 'update', 'create', 'delete'];
const includesRole = (scope, role) => !Array.isArray(scope) || scope.includes(role);
const normActions = (a) => {
  const arr = Array.isArray(a) && a.length ? a : ALL_ACTIONS;
  return Array.from(new Set(arr.filter((x) => ALL_ACTIONS.includes(x))));
};

export const buildFeatureRows = (routesList, t, role = 'Owner') => {
  const rows = [];

  (routesList || [])
    .filter((r) => r.type === 'dropdown')
    .filter((r) => includesRole(r.Scope, role))
    .forEach((r) => {
      const allSubs = Array.isArray(r.subRoutes) ? r.subRoutes : [];
      const visibleSubs = allSubs.filter((c) => includesRole(c.Scope, role));

      if (allSubs.length === 0) {
        rows.push({
          kind: 'feature',
          label: t ? t(r.name) : r.name,
          featureKey: r.key,
          allowedActions: normActions(r.actions),
          indent: false,
        });
        return;
      }

      if (visibleSubs.length === 0) return;

      if (visibleSubs.length === 1) {
        const c = visibleSubs[0];
        rows.push({
          kind: 'feature',
          label: t ? t(r.name) : r.name,
          featureKey: c.key,
          allowedActions: normActions(c.actions || r.actions),
          indent: false,
        });
        return;
      }

      rows.push({ kind: 'section', label: t ? t(r.name) : r.name, key: r.key });
      visibleSubs.forEach((c) => {
        rows.push({
          kind: 'feature',
          label: t ? t(c.name) : c.name,
          featureKey: c.key,
          allowedActions: normActions(c.actions || r.actions),
          indent: true,
        });
      });
    });

  (routesList || [])
    .filter((r) => !r.type && r.key && r.route)
    .filter((r) => includesRole(r.Scope, role))
    .filter((r) => r.name && r.name.trim())
    .filter((r) => !r.route.includes(':'))
    .filter((r) => !r.featureKey || r.featureKey === r.key)
    .forEach((r) => {
      rows.push({
        kind: 'feature',
        label: t ? t(r.name) : r.name,
        featureKey: r.key,
        allowedActions: normActions(r.actions),
        indent: false,
      });
    });

  return rows;
};

const routes = [
  {
    type: 'dropdown',
    name: 'Team & Roles',
    key: 'User',
    Scope: [Roles.SuperAdmin, Roles.Admin, Roles.Owner, Roles.Worker],
    subRoutes: [
      {
        key: 'admin/User/register-owner',
        featureKey: 'admin/User/register-owner',
        name: 'Property manager',
        route: 'admin/User/owner',
        Scope: [Roles.SuperAdmin, Roles.Admin, Roles.Owner, Roles.Worker],
        actions: ['get', 'create', 'update', 'delete'],
      },
      {
        key: 'admin/User/staff-dashboard',
        name: 'Dashboard Staff',
        route: 'admin/User/team',
        Scope: [Roles.SuperAdmin, Roles.Admin, Roles.Owner, Roles.Worker],
        actions: ['get', 'create', 'update', 'delete'],
      },
      {
        key: 'admin/User/admin-whatsapp',
        name: 'WhatsApp Admin',
        route: 'admin/User/team',
        Scope: [Roles.SuperAdmin, Roles.Admin, Roles.Owner, Roles.Worker],
        actions: ['get', 'create', 'update', 'delete'],
      },
      {
        key: 'admin/User/worker',
        name: 'Roles & Permissions',
        route: 'admin/User/team',
        Scope: [Roles.SuperAdmin, Roles.Admin, Roles.Owner, Roles.Worker],
        actions: ['get', 'create', 'update', 'delete'],
      },
      {
        key: 'admin/User/groups',
        name: 'Groups',
        route: 'admin/User/team',
        Scope: [Roles.SuperAdmin, Roles.Admin, Roles.Owner, Roles.Worker],
        actions: ['get', 'create', 'update', 'delete'],
      },
    ],
  },
];

export default routes;
