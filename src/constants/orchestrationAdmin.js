import { Roles } from './roles';

/** Admin “template” owner — must match srv-admin ADMIN_TEMPLATE_OWNER_ID / orchestrator env */
export const ORCHESTRATION_ADMIN_OWNER_ID =
  import.meta.env.VITE_ORCHESTRATION_ADMIN_OWNER_ID ||
  import.meta.env.VITE_ADMIN_TEMPLATE_OWNER_ID ||
  '67f5416ff145a6002e46c2f3';

export const ORCHESTRATION_ADMIN_EMAIL = 'admin@gmail.com';

/** Users who see Admin / Owner configuration tabs on the orchestration page */
export function isOrchestrationAdminUser(user) {
  if (!user) return false;
  const id = user._id || user.id;
  const email = (user.email || '').toLowerCase().trim();
  return (
    user.role === Roles.SuperAdmin ||
    user.role === Roles.Admin ||
    id === ORCHESTRATION_ADMIN_OWNER_ID ||
    email === ORCHESTRATION_ADMIN_EMAIL
  );
}
