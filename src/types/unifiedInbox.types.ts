/**
 * Types pour Unified Inbox - Communications Hub
 * Design source: Claude Design - Unified Inbox.html
 */

import type { ReservationTask } from './reservationTask.types';
import type { ReservationSourceKind } from '../components/reservations/ReservationSourceIcon';
import type { ProcessingTrace, AiPromptAudit, AiUsageAudit, MessageContentType } from './messages.types';

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
  /** Liste : Q = question voyageur, R = réponse manuelle (hors plan). */
  lastMessageKind?: 'Q' | 'R';
  /**
   * Ligne A — envoi programmé plan, seulement s’il est le dernier msg du fil.
   * `label` = nom du flow (ex. Feedback · après départ).
   */
  programmedAuto?: {
    label: string;
    catalogKey: string;
    time: string;
    sentAt?: string;
  };
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
  /** Composition compacte 2A · 1E */
  guestsCompact?: string;
  /** Badges liste threads */
  checkInBadge?: string;
  taskCount?: number;
  stayBadge?: string;
  /** Statut séjour (Séjour / Confirmé / …) — bandeau chat */
  presenceLabel?: string;
  registrationRegistered?: number;
  registrationTotal?: number;
  arrivalTimeChosen?: boolean;
  arrivalTimeLabel?: string;
  departureTimeChosen?: boolean;
  departureTimeLabel?: string;
  arrivalDeclared?: boolean;
  departureDeclared?: boolean;
  /** OTA : fil en attente de réponse hôte */
  needsReply?: boolean;
  /** OTA recherche mot-clé : occurrences dans ce fil */
  messageMatchCount?: number;
  isStaff?: boolean;
  isAuto?: boolean;
  /** Source réservation (liste WA — distinct du canal messagerie WhatsApp). */
  bookingSourceKind?: ReservationSourceKind;
  bookingPlatform?: 'ab' | 'bk' | 'direct' | null;
  tasks?: ReservationTask[];
  tasksLoading?: boolean;
}

export interface Message {
  id: string | number;
  from: 'guest' | 'sojori' | 'you';
  text: string;
  time: string;
  isAI?: boolean;
  /** Envoi manuel inbox admin (menu / flow / texte) */
  isAdmin?: boolean;
  type?: 'message' | 'day-separator' | 'system-note';
  // Message status (sent/delivered/read) - displayed for outgoing messages only
  status?: 'sent' | 'delivered' | 'read';
  /** WhatsApp Cloud API delivery — distinct from thread read receipts. */
  whatsappDelivery?: 'pending' | 'sent' | 'failed';
  whatsappDeliveryError?: string | null;
  processingTrace?: ProcessingTrace;
  aiModel?: string;
  tokensUsed?: number;
  aiPrompt?: AiPromptAudit | null;
  aiUsage?: AiUsageAudit | null;
  contentType?: MessageContentType | null;
  /** Résumé PM (ownerSummary) — libellé non technique. */
  ownerSummary?: string | null;
  /** backend | menu | ai | orchestrator — drives SOJORI AI badge. */
  messageSource?: string | null;
  /** Inbox Resa — tags (audio, demande, confirmation…) */
  tags?: string[];
  /** Inbox Resa — URL blob locale pour lecture audio */
  audioUrl?: string | null;
  /** Inbox Resa — Transcript / résumé affiché sous le player */
  audioCaption?: string | null;
  /** Index exchange Inbox Resa (pour panneau détail) */
  bookingExchangeIndex?: number;
  /**
   * Traduction opérateur (inbox OTA uniquement — WhatsApp est auto-piloté par l'IA).
   * Produite côté backend, stockée en base, jamais recalculée à l'affichage.
   * `translatedAry` = darija en script arabe.
   * Optionnels : un message sans traduction s'affiche exactement comme avant.
   */
  translatedFr?: string | null;
  translatedAry?: string | null;
  /**
   * Langue d'origine du message voyageur (ISO 639-1 : en, fr, ar…).
   * Détectée à la traduction — pas la langue réservation / pays.
   */
  originalLanguage?: string | null;
  /** Texte d'origine, conservé quand une traduction prend sa place dans la bulle. */
  originalText?: string | null;
  /** Lien audit génération OTA (dashboard / WhatsApp Flow). */
  generationId?: string | null;
  replyMode?: 'manual' | 'ai_generated' | 'ai_assisted' | 'automation' | string | null;
  replyOrigin?: string | null;
}

export interface QuickTemplate {
  id: string;
  label: string;
  icon: string;
  text: string;
}

export interface GuestMenuDispatchOption {
  code: string;
  label: string;
  icon: string;
  kind: 'flow' | 'interactive' | 'text';
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
