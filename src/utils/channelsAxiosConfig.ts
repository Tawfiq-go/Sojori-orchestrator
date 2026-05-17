/** Timeouts alignés legacy channels-dashboard (pas de baseURL localhost forcée). */
export function channelsDashboardAxiosConfig() {
  return { timeout: 120_000 };
}

export function monitoringAxiosConfig() {
  return { timeout: 120_000 };
}
