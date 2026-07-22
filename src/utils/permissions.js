import store from '../redux/store';
import { Roles } from '../constants/roles';


let ROUTE_INDEX = [];

export const registerRoutesForPermissions = (routes = []) => {
    ROUTE_INDEX = [];
    const walk = (arr = []) => {
        for (const r of arr) {
            if (r?.route) ROUTE_INDEX.push(r);
            if (Array.isArray(r?.subRoutes)) walk(r.subRoutes);
        }
    };
    walk(routes);
};


const normalize = (s = '') => String(s).replace(/^\//, '').replace(/\/+$/, '');
const isPathMatch = (tpl, path) => {
    const A = normalize(tpl).split('/');
    const B = normalize(path).split('/');
    if (A.length !== B.length) return false;
    for (let i = 0; i < A.length; i++) {
        if (A[i].startsWith(':')) continue;
        if (A[i] !== B[i]) return false;
    }
    return true;
};
const findRouteByPath = (path) => {
    const normalized = normalize(path);
    // Hub Équipe (URLs migrées) → routes legacy permissions
    if (normalized === 'admin/equipe/owners' || normalized.startsWith('admin/equipe/owners/')) {
        return ROUTE_INDEX.find((r) => r.route === 'admin/User/owner');
    }
    if (normalized === 'admin/equipe') {
        const tab = new URLSearchParams(window.location.search || '').get('tab') || 'worker';
        const keyByTab = {
            list: 'admin/User/register-owner',
            worker: 'admin/User/worker',
            groups: 'admin/User/groups',
        };
        const key = keyByTab[String(tab).toLowerCase()] || 'admin/User/worker';
        return ROUTE_INDEX.find((r) => r.key === key) || ROUTE_INDEX.find((r) => r.route === 'admin/User/team');
    }
    // Hub CRM : une seule route pathname, droits selon ?tab=
    if (normalized === 'admin/crm') {
        const tab = new URLSearchParams(window.location.search || '').get('tab') || 'demandes';
        const t = String(tab).toLowerCase();
        const keyByTab = {
            demandes: 'crm/demandes',
            leads: 'crm/leads',
            staff: 'crm/staff',
        };
        const key = keyByTab[t] || 'crm/demandes';
        return ROUTE_INDEX.find((r) => r.key === key) || ROUTE_INDEX.find((r) => r.key === 'crm/demandes');
    }
    return ROUTE_INDEX.find((r) => r.route && isPathMatch(r.route, path));
};
const featureKeyOf = (r) => (r?.featureKey || r?.key || r?.route || '');


export const can = (action = 'get', keyOverride = null) => {
    const user = store.getState?.().auth?.user;
    if (!user) return false;

    if ([Roles.SuperAdmin, Roles.Admin, Roles.Owner].includes(user.role)) return true;

    // Landlord = lecture seule stricte
    if (user.role === Roles.Landlord && action !== 'get') return false;

    const path = normalize(window.location?.pathname || '');
    const matched = findRouteByPath(path);
    const featureKey = keyOverride || featureKeyOf(matched) || path;

    if (matched?.Scope && Array.isArray(matched.Scope)) {
        if (!matched.Scope.includes(user.role)) return false;
    }

    const grants = Array.isArray(user.featureGrants) ? user.featureGrants : [];

    // Admin worker = actions:'*' uniquement (pas feature:'*' + get)
    if (grants.some((g) => (g?.actions || []).includes('*'))) return true;

    return grants.some(
        (g) =>
            (g?.feature === featureKey || g?.feature === '*') &&
            ((g?.actions || []).includes(action) || (g?.actions || []).includes('*')),
    );
};

export const getCurrentFeatureKey = () => {
    const path = normalize(window.location?.pathname || '');
    const matched = findRouteByPath(path);
    return featureKeyOf(matched) || path;
};
