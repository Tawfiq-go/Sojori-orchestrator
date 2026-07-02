/** Email R.U. (extranet) — distinct de l'email dashboard Sojori. */

function slugifyNamePart(value: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 40);
}

/** Format par défaut : nom.prenom@sojori.com (nom = lastName, prénom = firstName). */
export function buildDefaultRuEmail(firstName: string, lastName: string): string {
  const nom = slugifyNamePart(lastName) || 'owner';
  const prenom = slugifyNamePart(firstName) || 'pm';
  return `${nom}.${prenom}@sojori.com`;
}

export function resolveRuEmailDisplay(account: {
  ruEmail?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const explicit = (account.ruEmail || '').trim();
  if (explicit) return explicit;
  const fn = (account.firstName || '').trim();
  const ln = (account.lastName || '').trim();
  if (fn || ln) return buildDefaultRuEmail(fn, ln);
  return (account.email || '').trim();
}
