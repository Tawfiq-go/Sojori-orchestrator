/** Capacités UI cron — aligné sur srv-logs-proxy cron-aggregator.service.ts */

export type CronJobLike = {
  cronId: string;
  service: string;
  readOnly?: boolean;
  canSchedule?: boolean;
  canToggle?: boolean;
  canRunNow?: boolean;
  scheduleUrl?: string;
  toggleUrl?: string;
  runNowUrl?: string;
};

const SCHEDULABLE_CRON_IDS = new Set([
  'inventory_rolling_archive',
  'dynamic_price_trigger',
  'auto_complete_reservations',
  'agent_availability_sync',
  'orchestrator_tick',
  'recurring_ledger',
  'archive_tasks',
  'market_refresh_marrakech',
  'recompute_all_listings',
  'auto_snapshot_listings',
  'pod_watcher',
  'unified_sync',
  'ru_unified_owner_pull',
  'ru_daily_backfill_7d',
]);

const TOGGLEABLE_CRON_IDS = new Set([
  'inventory_rolling_archive',
  'dynamic_price_trigger',
  'auto_complete_reservations',
  'agent_availability_sync',
  'orchestrator_tick',
  'recurring_ledger',
  'archive_tasks',
  'market_refresh_marrakech',
  'recompute_all_listings',
  'auto_snapshot_listings',
  'pod_watcher',
  'unified_sync',
  'ru_unified_owner_pull',
  'ru_daily_backfill_7d',
]);

/** Préfère les flags API ; repli client si absents (vieux proxy). */
export function resolveCronCapabilities(job: CronJobLike) {
  if (job.readOnly) {
    return { canSchedule: false, canToggle: false, canRunNow: false };
  }
  if (job.canSchedule != null || job.canToggle != null || job.canRunNow != null) {
    return {
      canSchedule: Boolean(job.canSchedule),
      canToggle: Boolean(job.canToggle),
      canRunNow: Boolean(job.canRunNow),
    };
  }
  const id = job.cronId;
  return {
    canSchedule: SCHEDULABLE_CRON_IDS.has(id) || Boolean(job.scheduleUrl),
    canToggle: TOGGLEABLE_CRON_IDS.has(id) || Boolean(job.toggleUrl),
    canRunNow: Boolean(job.runNowUrl) || SCHEDULABLE_CRON_IDS.has(id),
  };
}
