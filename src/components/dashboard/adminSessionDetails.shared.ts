import { formatBuildDeployedAt, getAppBuildInfo, getFrontRuntimeTag } from '../../utils/appBuildInfo';
import { normalizeUserRole } from '../../utils/taskScope.utils';
import type { User } from '../../contexts/AuthContext';

export const LANG_LABELS: Record<string, string> = {
  fr: 'Français',
  en: 'English',
};

export function scopeLabel(
  ownerScopeUnset: boolean,
  ownerScopeAll: boolean,
  requestOwnerId: string | null,
): string {
  if (ownerScopeUnset) return 'PM non sélectionné';
  if (ownerScopeAll) return 'Tous les PM (plateforme)';
  if (requestOwnerId) return `PM ${requestOwnerId.slice(-6)}`;
  return 'Scope actif';
}

export function buildAdminSessionViewModel(input: {
  user: User;
  langCode: string;
  ownerScopeUnset: boolean;
  ownerScopeAll: boolean;
  requestOwnerId: string | null;
  adminScopeMode: string;
}) {
  const { user, langCode, ownerScopeUnset, ownerScopeAll, requestOwnerId, adminScopeMode } = input;
  const build = getAppBuildInfo();
  const frontTag = getFrontRuntimeTag(build.host);
  const role = normalizeUserRole(user.role);
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'Admin';
  const langLabel = LANG_LABELS[langCode] ?? langCode.toUpperCase();
  const deployedAt = formatBuildDeployedAt(build.builtAtIso);
  const scope = scopeLabel(ownerScopeUnset, ownerScopeAll, requestOwnerId);

  return {
    build,
    frontTag,
    role,
    displayName,
    langCode,
    langLabel,
    deployedAt,
    scope,
    adminScopeMode,
    deployChip: deployedAt
      ? `${frontTag.shortLabel} · ${build.commitSha} · ${deployedAt}`
      : `${frontTag.shortLabel} · ${build.commitSha}`,
    tooltip: `${displayName} · ${user.email} · ${langLabel}`,
  };
}

export type AdminSessionViewModel = ReturnType<typeof buildAdminSessionViewModel>;
