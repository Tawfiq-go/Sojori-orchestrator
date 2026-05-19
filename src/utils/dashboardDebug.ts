export function logAuth(label: string, payload?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.info(`[auth] ${label}`, payload ?? '');
  }
}
