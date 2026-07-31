/** LogApiMews — filtres journal + catégories Connector. */
import type {
  LogApiMewsCategory,
  LogApiMewsDirFilter,
  LogApiMewsStatusFilter,
} from '../../services/logApiMewsApi';

export interface LogApiMewsFilters {
  status: LogApiMewsStatusFilter;
  dir: LogApiMewsDirFilter;
  category: LogApiMewsCategory | '';
  action: string;
  ownerId: string;
  minDur: string;
  q: string;
  correlationId: string;
}

export const EMPTY_FILTERS: LogApiMewsFilters = {
  status: '',
  dir: '',
  category: '',
  action: '',
  ownerId: '',
  minDur: '',
  q: '',
  correlationId: '',
};

const CATEGORY_ACTIONS: Record<Exclude<LogApiMewsCategory, 'other'>, string[]> = {
  configuration: ['/configuration/get'],
  listing: [
    '/resources/getAll',
    '/images/getUrls',
    '/services/getAll',
  ],
  availability: ['/services/getAvailability', '/restrictions/getAll'],
  reservation: [
    '/reservations/getAll',
    '/reservations/getAll/2023-06-06',
    '/customers/getAll',
    '/reservations/add',
    '/reservations/update',
    '/reservations/cancel',
  ],
  webhook: ['/webhook/mews/general', '/webhook/mews/integration'],
};

export function categorizeAction(action: string): LogApiMewsCategory {
  const a = String(action || '').toLowerCase();
  if (a.includes('webhook')) return 'webhook';
  if (a.includes('configuration')) return 'configuration';
  if (a.includes('availability') || a.includes('restriction')) return 'availability';
  if (a.includes('reservation') || a.includes('customer')) return 'reservation';
  if (a.includes('resource') || a.includes('image') || a.includes('feature') || a.includes('service')) {
    return 'listing';
  }
  for (const [cat, actions] of Object.entries(CATEGORY_ACTIONS)) {
    if (actions.some((x) => x.toLowerCase() === a || a.includes(x.toLowerCase()))) {
      return cat as LogApiMewsCategory;
    }
  }
  return 'other';
}

/** Alias composants clonés LogApiRU */
export const categoryOfAction = categorizeAction;

export function knownActions(category?: LogApiMewsCategory | ''): string[] {
  if (!category || category === 'other') {
    return Object.values(CATEGORY_ACTIONS).flat();
  }
  return CATEGORY_ACTIONS[category] || [];
}
