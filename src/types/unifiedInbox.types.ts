/**
 * Types pour Unified Inbox - Communications Hub
 * Design source: Claude Design - Unified Inbox.html
 */

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
  // Métadonnées additionnelles
  listingName?: string;
  reservationNumber?: string;
  checkInDate?: string;
  status?: string;
}

export interface Message {
  id: string | number;
  from: 'guest' | 'sojori' | 'you';
  text: string;
  time: string;
  isAI?: boolean;
  type?: 'message' | 'day-separator';
}

export interface QuickTemplate {
  id: string;
  label: string;
  icon: string;
  text: string;
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
