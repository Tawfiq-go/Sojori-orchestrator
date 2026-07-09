import axios from 'axios';

/** Prod actuelle : stub notification (seul /notification-events) → 404 sur unread-count avec JWT. */
export class NotificationApiNotDeployedError extends Error {
  constructor() {
    super('Notification API v2 not deployed');
    this.name = 'NotificationApiNotDeployedError';
  }
}

/** null = inconnu, false = stub prod (404), true = API v2 OK */
let notificationApiDeployed: boolean | null = null;

export function getNotificationApiDeployed(): boolean | null {
  return notificationApiDeployed;
}

export function markNotificationApiDeployed(deployed: boolean): void {
  notificationApiDeployed = deployed;
}

export function isNotificationApiNotDeployed(error: unknown): boolean {
  return (
    error instanceof NotificationApiNotDeployedError ||
    (axios.isAxiosError(error) && error.response?.status === 404)
  );
}

export function assertNotificationApiResponse(
  data: { success?: boolean; error?: string } | undefined,
  context: string,
): void {
  if (!data?.success) {
    throw new Error(data?.error || `${context} failed`);
  }
}
