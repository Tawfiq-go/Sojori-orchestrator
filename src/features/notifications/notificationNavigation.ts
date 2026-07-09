import { NAV_TO_ROUTE } from '../../config/navRoutes';
import type { NotificationItem } from './types';

/** Convertit les anciens chemins `/comms/*` et normalise les liens notifications. */
export function resolveNotificationNavigatePath(
  linkPath: string | undefined,
  notification?: Pick<NotificationItem, 'eventKey' | 'payload'>,
): string | null {
  if (!linkPath?.trim()) {
    return fallbackPathFromEvent(notification);
  }

  const raw = linkPath.trim();

  if (raw.startsWith('/communications?')) {
    return raw;
  }

  if (raw.startsWith('/comms/')) {
    const [pathPart, query = ''] = raw.split('?');
    const pathKey = pathPart.replace(/^\//, '');
    const base = NAV_TO_ROUTE[pathKey];
    if (base) {
      const params = new URLSearchParams(query);
      const merged = new URLSearchParams(base.includes('?') ? base.split('?')[1] : '');
      params.forEach((v, k) => merged.set(k, v));
      const pathOnly = base.split('?')[0];
      const qs = merged.toString();
      return qs ? `${pathOnly}?${qs}` : pathOnly;
    }
  }

  if (raw.startsWith('/tasks/list')) {
    return raw.replace('/tasks/list', '/tasks');
  }

  return raw;
}

function fallbackPathFromEvent(
  notification?: Pick<NotificationItem, 'eventKey' | 'payload'>,
): string | null {
  if (!notification?.eventKey) return null;
  const p = notification.payload || {};
  switch (notification.eventKey) {
    case 'message:ota_received':
      return p.threadId != null
        ? `/communications?section=guest&tab=ota&thread=${encodeURIComponent(String(p.threadId))}`
        : '/communications?section=guest&tab=ota';
    case 'message:whatsapp_received':
      return p.guestPhone
        ? `/communications?section=guest&tab=whatsapp&phone=${encodeURIComponent(String(p.guestPhone))}`
        : '/communications?section=guest&tab=whatsapp';
    case 'review:new':
      return '/communications?section=guest&tab=reviews';
    case 'lead:new':
      return '/communications?section=guest&tab=leads';
    case 'reservation:new':
    case 'reservation:cancelled':
    case 'reservation:modified':
      return p.reservationNumber
        ? `/reservations?search=${encodeURIComponent(String(p.reservationNumber))}`
        : '/reservations';
    default:
      return null;
  }
}
