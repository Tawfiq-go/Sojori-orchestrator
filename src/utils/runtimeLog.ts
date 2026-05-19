export function runtimeLog(
  level: 'info' | 'warn' | 'error',
  scope: string,
  message: string,
  payload?: Record<string, unknown>,
): void {
  if (!import.meta.env.DEV) return;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  fn(`[${scope}] ${message}`, payload ?? '');
}
