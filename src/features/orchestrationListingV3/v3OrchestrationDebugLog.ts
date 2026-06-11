/** Logs V3 orchestration — actifs en dev ou si localStorage v3_orch_debug=1 */
export function isV3OrchDebug(): boolean {
  try {
    return import.meta.env.DEV || localStorage.getItem('v3_orch_debug') === '1';
  } catch {
    return import.meta.env.DEV;
  }
}

export function logV3Orch(event: string, data?: Record<string, unknown>): void {
  if (!isV3OrchDebug()) return;
  if (data) console.log(`[V3Orch] ${event}`, data);
  else console.log(`[V3Orch] ${event}`);
}
