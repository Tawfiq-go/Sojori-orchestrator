export type NotificationFacet =
  | 'reservation'
  | 'guest_journey'
  | 'orchestration'
  | 'message'
  | 'task'
  | 'concierge'
  | 'finance'
  | 'review'
  | 'lead';

export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low';

/** 1 = cloche urgente · 2 = cloche secondaire */
export type NotificationImportance = 1 | 2;

export type NotificationStatus =
  | 'created'
  | 'pending'
  | 'handled'
  | 'done'
  | 'dismissed'
  | 'expired';

export interface NotificationPayload {
  reservationId?: string;
  reservationNumber?: string;
  listingId?: string;
  listingName?: string;
  threadId?: string | number;
  taskId?: string;
  planId?: string;
  guestName?: string;
  guestPhone?: string;
  [key: string]: unknown;
}

export interface NotificationItem {
  _id: string;
  eventKey: string;
  facet: NotificationFacet;
  priority: NotificationPriority;
  title: string;
  body: string;
  linkPath: string;
  status: NotificationStatus;
  readAt?: string | null;
  expiresAt?: string;
  aggregatedCount?: number;
  payload?: NotificationPayload;
  createdAt: string;
}

export interface UnreadCountData {
  total: number;
  /** Aligné panneau cloche « En cours » (hors traitées / ignorées / expirées). */
  activeCount?: number;
  actionRequired: number;
  /** Actives priorité 1 (critical|high). */
  importantActiveCount?: number;
  /** Actives priorité 2 (normal|low). */
  secondaryActiveCount?: number;
  byFacet: Partial<Record<NotificationFacet, number>>;
  byEventKey?: Partial<Record<string, number>>;
  /** Compteurs « en cours » pour badges sidebar (même logique que activeCount). */
  byFacetActive?: Partial<Record<NotificationFacet, number>>;
  byEventKeyActive?: Partial<Record<string, number>>;
}

export interface NotificationListResponse {
  success: boolean;
  items: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type NotificationPanelTab = 'action' | 'all';

export type NotificationBellTier = 'important' | 'secondary';

export interface EventChannelPreference {
  dashboard?: boolean;
  importance?: NotificationImportance;
}

export interface PreferenceCatalogEntry {
  eventKey: string;
  facet: NotificationFacet;
  labelFr: string;
  priority: NotificationPriority;
  importance: NotificationImportance;
  ttlDays: number;
  critical: boolean;
  channels: {
    dashboard: boolean;
  };
}

export interface NotificationPreferencesData {
  preferences: Record<string, EventChannelPreference>;
  catalog: PreferenceCatalogEntry[];
  userId?: string;
}

export interface NotificationEventDefinition {
  eventKey: string;
  facet: NotificationFacet;
  labelFr: string;
  priority: NotificationPriority;
  ttlDays: number;
  defaultChannels: { dashboard: boolean };
  ownerScope: boolean;
  linkPathTemplate?: string;
  critical?: boolean;
}
