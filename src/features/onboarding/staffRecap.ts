import { staffDisplayName } from './staffNormalize';
import type { WizardStaffRow } from './types';

const ROLE_LABELS: Record<keyof WizardStaffRow['roles'], string> = {
  taskStaff: 'Staff tâches',
  adminWhatsapp: 'Admin WhatsApp',
  dashboardEmail: 'Dashboard',
};

/** Rôles actifs d'une même personne (une ligne wizard = une personne). */
export function staffRoleLabels(row: WizardStaffRow): string[] {
  const out: string[] = [];
  if (row.roles.taskStaff) out.push(ROLE_LABELS.taskStaff);
  if (row.roles.adminWhatsapp) out.push(ROLE_LABELS.adminWhatsapp);
  if (row.roles.dashboardEmail) out.push(ROLE_LABELS.dashboardEmail);
  return out;
}

export function formatStaffPersonRecap(row: WizardStaffRow): string {
  const name = staffDisplayName(row);
  const roles = staffRoleLabels(row);
  if (!roles.length) return name;
  return `${name} — ${roles.join(' + ')}`;
}

export function formatStaffTeamRecap(rows: WizardStaffRow[]): string {
  const people = rows.filter((r) => staffDisplayName(r));
  if (!people.length) return 'Aucune personne';
  const n = people.length;
  const head = `${n} personne${n > 1 ? 's' : ''}`;
  const detail = people.map(formatStaffPersonRecap).join(' · ');
  return `${head} : ${detail}`;
}

/** Comptes backend à créer à l'apply (≠ nombre de personnes). */
export function staffApplyAccountCounts(rows: WizardStaffRow[]) {
  const people = rows.filter((r) => staffDisplayName(r));
  return {
    people: people.length,
    staffSimplified: people.filter((r) => r.roles.taskStaff).length,
    adminWhatsapp: people.filter((r) => r.roles.adminWhatsapp).length,
    dashboardWorkers: people.filter((r) => r.roles.dashboardEmail).length,
  };
}
