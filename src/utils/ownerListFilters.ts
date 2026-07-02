/** Client-side guard when get-account ignores accountStatus or returns duplicates. */

export type OwnerListRow = {
  _id?: string;
  id?: string;
  status?: string;
  deleted?: boolean;
  banned?: boolean;
  email?: string;
};

export type OwnerListFilterOpts = {
  accountStatus?: string;
  deleted?: boolean | string;
  banned?: boolean | string;
};

function asBool(v: boolean | string | undefined): boolean {
  return v === true || v === 'true';
}

function matchesAccountStatus(owner: OwnerListRow, accountStatus: string): boolean {
  const status = String(owner.status ?? '').trim().toLowerCase();
  const key = String(accountStatus || 'live').trim().toLowerCase();

  if (key === 'inactive') return status === 'inactive';
  if (key === 'live') return status === 'active' || status === 'pending';
  if (key === 'pending') return status === 'pending';
  if (key === 'active') return status === 'active';
  if (!key) return status !== 'inactive';
  return status !== 'inactive';
}

export function filterOwnersForPmTab(
  owners: OwnerListRow[],
  opts: OwnerListFilterOpts = {},
): OwnerListRow[] {
  const accountStatus = String(opts.accountStatus ?? 'live');
  const deleted = asBool(opts.deleted);
  const banned = asBool(opts.banned);
  const seen = new Set<string>();
  const rows: OwnerListRow[] = [];

  for (const owner of owners || []) {
    if (!owner) continue;
    const id = String(owner._id ?? owner.id ?? '').trim();
    const email = String(owner.email ?? '').trim().toLowerCase();
    const dedupeKey = id || email;
    if (dedupeKey && seen.has(dedupeKey)) continue;
    if (asBool(owner.deleted) !== deleted) continue;
    if (asBool(owner.banned) !== banned) continue;
    if (!matchesAccountStatus(owner, accountStatus)) continue;
    if (dedupeKey) seen.add(dedupeKey);
    rows.push(owner);
  }

  return rows;
}
