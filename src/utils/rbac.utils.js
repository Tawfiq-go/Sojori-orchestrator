export const ROLES = {
    SUPER_ADMIN: 'SuperAdmin',
    ADMIN: 'Admin',
    OWNER: 'Owner',
    WORKER: 'Worker'
};

export const hasSuperAdminAccess = (role) => {
    if (role == null) return false;
    const r = String(role).trim();
    return r === ROLES.SUPER_ADMIN || r.toLowerCase() === 'superadmin';
};

export const hasAdminAccess = (role) => {
    if (role == null) return false;
    const r = String(role).trim();
    return (
        r === ROLES.SUPER_ADMIN ||
        r === ROLES.ADMIN ||
        r.toLowerCase() === 'superadmin' ||
        r.toLowerCase() === 'admin'
    );
};

export const hasOwnerAccess = (role) => {
    if (role == null) return false;
    const r = String(role).trim();
    return (
        hasAdminAccess(r) ||
        r === ROLES.OWNER ||
        r.toLowerCase() === 'owner'
    );
};

export const hasWorkerAccess = (role) => {
    if (role == null) return false;
    const r = String(role).trim();
    return (
        hasOwnerAccess(r) ||
        r === ROLES.WORKER ||
        r.toLowerCase() === 'worker'
    );
};