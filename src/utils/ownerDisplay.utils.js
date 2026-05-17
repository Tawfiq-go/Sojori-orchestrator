/**
 * Display label for an owner object from getOwners (aligned with staff pickers / whitelist).
 * @param {object} o
 * @returns {string}
 */
export function getOwnerListLabel(o) {
  if (!o) return '';
  const name = [o.firstName, o.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  const email = o?.email_addresses?.[0]?.email_address;
  if (email) return email;
  if (o.email) return o.email;
  if (o.username) return o.username;
  if (o.companyName) return o.companyName;
  return '—';
}
