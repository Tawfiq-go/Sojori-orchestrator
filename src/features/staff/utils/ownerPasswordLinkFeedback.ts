export interface OwnerPasswordLinkResult {
  ok: boolean;
  email?: string;
  url?: string;
  emailSent?: boolean;
  emailError?: string | null;
  linkType?: 'invite' | 'reset' | string;
  expiresAt?: string;
}

/** Normalise la réponse POST /auth/send-owner-password-link/:ownerId */
export function parseOwnerPasswordLinkResponse(res: unknown): OwnerPasswordLinkResult {
  const body = (res ?? {}) as Record<string, unknown>;
  const data = (body.data ?? {}) as Record<string, unknown>;
  const ok = body.success === true;

  const url = String(data.inviteUrl || data.resetUrl || '').trim() || undefined;
  const expiresAt = String(
    data.inviteExpiresAt || data.resetExpiresAt || data.expiresAt || '',
  ).trim() || undefined;

  return {
    ok,
    email: data.email ? String(data.email) : undefined,
    url,
    emailSent: data.emailSent === true,
    emailError: data.emailError != null ? String(data.emailError) : null,
    linkType: data.linkType ? String(data.linkType) : undefined,
    expiresAt,
  };
}
