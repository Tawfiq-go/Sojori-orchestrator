import { Roles } from './roles';

/** Admin “template” owner — must match srv-admin ADMIN_TEMPLATE_OWNER_ID / orchestrator env */
export const ORCHESTRATION_ADMIN_OWNER_ID =
  import.meta.env.VITE_ORCHESTRATION_ADMIN_OWNER_ID ||
  import.meta.env.VITE_ADMIN_TEMPLATE_OWNER_ID ||
  '67f5416ff145a6002e46c2f3';

/** Compte template actuel (login demo / prod). */
export const ORCHESTRATION_ADMIN_EMAIL = 'admin@sojori.com';

/** Emails historiques encore présents en base sur certains envs. */
export const ORCHESTRATION_ADMIN_EMAILS = [
  ORCHESTRATION_ADMIN_EMAIL,
  'admin@gmail.com',
];

export function isOrchestrationAdminOwnerEmail(email) {
  const e = String(email || '')
    .toLowerCase()
    .trim();
  return Boolean(e) && ORCHESTRATION_ADMIN_EMAILS.includes(e);
}

/** Ligne getOwners = compte template admin (à afficher « Template Admin », pas un PM). */
export function isOrchestrationAdminOwnerRow(owner) {
  if (!owner) return false;
  const id = String(owner._id ?? owner.id ?? '').trim();
  if (id && id === ORCHESTRATION_ADMIN_OWNER_ID) return true;
  return isOrchestrationAdminOwnerEmail(owner.email);
}

/** Users who see Admin / Owner configuration tabs on the orchestration page */
export function isOrchestrationAdminUser(user) {
  if (!user) return false;
  const id = user._id || user.id;
  return (
    user.role === Roles.SuperAdmin ||
    user.role === Roles.Admin ||
    id === ORCHESTRATION_ADMIN_OWNER_ID ||
    isOrchestrationAdminOwnerEmail(user.email)
  );
}
