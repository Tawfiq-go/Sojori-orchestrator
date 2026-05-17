export const ROLES = {
    SUPER_ADMIN: 'SuperAdmin',
    ADMIN: 'Admin',
    OWNER: 'Owner',
    WORKER: 'Worker'
};

export const hasSuperAdminAccess = (role) => {
    return role === ROLES.SUPER_ADMIN;
};

export const hasAdminAccess = (role) => {
    return [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(role);
};

export const hasOwnerAccess = (role) => {
    return [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OWNER].includes(role);
};

export const hasWorkerAccess = (role) => {
    return [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.OWNER, ROLES.WORKER].includes(role);
};