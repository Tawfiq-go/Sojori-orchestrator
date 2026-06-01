/**
 * Types pour Unified Inbox - Communications Hub
 * Design source: Claude Design - Unified Inbox.html
 */

import type { ReservationTask } from './reservationTask.types';

export type ChannelType = 'all' | 'wa' | 'ab' | 'bk' | 'em' | 'vrbo';

export interface Channel {
  id: ChannelType;
  label: string;
  icon: string;
  color?: string;
  count: number;
}

export interface Thread {
  id: string | number;
  name: string;
  phone?: string;
  channel: ChannelType;
  channelColor: string;
  preview: string;
  time: string;
  unread: number;
  avatarColor: string;
  active?: boolean;
  listingName?: string;
  reservationNumber?: string;
  /** Ex. « 26 mai 2025 » — création résa (header OTA) */
  reservationCreatedDisplay?: string;
  checkInDate?: string;
  checkOutDate?: string;
  /** Présence guest (WhatsApp header) ex. En ligne */
  guestPresence?: string;
  guestFlag?: string;
  isVip?: boolean;
  nightsCount?: number;
  guestsLabel?: string;
  /** Badges liste threads */
  checkInBadge?: string;
  taskCount?: number;
  stayBadge?: string;
  isStaff?: boolean;
  isAuto?: boolean;
  tasks?: ReservationTask[];
  tasksLoading?: boolean;
}

export interface Message {
  id: string | number;
  from: 'guest' | 'sojori' | 'you';
  text: string;
  time: string;
  isAI?: boolean;
  type?: 'message' | 'day-separator' | 'system-note';
  // Message status (sent/delivered/read) - displayed for outgoing messages only
  status?: 'sent' | 'delivered' | 'read';
}

export interface QuickTemplate {
  id: string;
  label: string;
  icon: string;
  text: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: () => void;
}

export interface UnifiedInboxState {
  activeChannel: ChannelType;
  activeThread: Thread | null;
  threads: Thread[];
  messages: Message[];
  searchTerm: string;
  loading: boolean;
  loadingMessages: boolean;
}
