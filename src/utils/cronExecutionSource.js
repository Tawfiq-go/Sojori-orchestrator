/**
 * Détection exécutions manuelles / forcées depuis le dashboard orchestration.
 */

export function getTriggeredBy(event) {
  return (
    event?.triggeredBy ||
    event?.metadata?.triggeredBy ||
    event?.executionResult?.triggeredBy ||
    ''
  );
}

export function isManualExecution(event) {
  const tb = String(getTriggeredBy(event)).toUpperCase();
  if (!tb && event?.metadata?.manualExecution === true) return true;
  return tb.includes('MANUAL') || tb.includes('FORCE') || tb === 'DASHBOARD';
}

export function getExecutionSourceLabel(event) {
  const tb = String(getTriggeredBy(event)).toUpperCase();
  if (!tb && !event?.metadata?.manualExecution) return 'Cron';
  if (tb.includes('OFF_SCHEDULE') || tb === 'MANUAL_SEND_OFF_SCHEDULE') {
    return 'Dashboard · hors planning';
  }
  if (tb.includes('FROM_SCHEDULED')) return 'Dashboard · créneau';
  if (tb.includes('FORCE')) return 'Dashboard · forcé';
  if (tb.includes('MANUAL')) return 'Dashboard · manuel';
  if (tb === 'CRON' || tb.includes('ORCHESTRATOR_CRON')) return 'Cron';
  return tb ? tb.replace(/_/g, ' ') : 'Cron';
}

export function getExecutionSourceVariant(event) {
  return isManualExecution(event) ? 'manual' : 'cron';
}
