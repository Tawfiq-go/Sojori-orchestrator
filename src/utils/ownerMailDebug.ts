/**
 * Diagnostic logs for PM dashboard invite / password-link flows.
 * Enabled in dev / localhost, or with localStorage SOJORI_PM_MAIL_DEBUG=1.
 */
import { runtimeLog } from './runtimeLog';

function enabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return true;
  try {
    return window.localStorage.getItem('SOJORI_PM_MAIL_DEBUG') === '1';
  } catch {
    return false;
  }
}

function redactPayload(payload: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!payload) return payload;
  const out = { ...payload };
  if (typeof out.password === 'string') out.password = '***';
  if (typeof out.token === 'string') out.token = '***';
  if (typeof out.inviteUrl === 'string') out.inviteUrl = '(present)';
  if (typeof out.resetUrl === 'string') out.resetUrl = '(present)';
  return out;
}

function safeDetail(detail?: unknown): unknown {
  return detail && typeof detail === 'object' && !Array.isArray(detail)
    ? redactPayload(detail as Record<string, unknown>)
    : detail;
}

export function logPmMail(step: string, detail?: unknown): void {
  if (!enabled()) return;
  const safe = safeDetail(detail);
  console.log(`[pm-mail] ${step}`, safe ?? '');
  runtimeLog('info', 'PmMail', step, safe);
}

export function warnPmMail(step: string, detail?: unknown): void {
  if (!enabled()) return;
  const safe = safeDetail(detail);
  console.warn(`[pm-mail] ${step}`, safe ?? '');
  runtimeLog('warn', 'PmMail', step, safe);
}

export function errorPmMail(step: string, detail?: unknown): void {
  if (!enabled()) return;
  const safe = safeDetail(detail);
  console.error(`[pm-mail] ${step}`, safe ?? '');
  runtimeLog('error', 'PmMail', step, safe);
}
