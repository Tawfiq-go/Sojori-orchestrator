import { useEffect, useRef } from 'react';
import {
  type InboxRealtimeChannel,
  type InboxRealtimeDetail,
  inboxChannelEventName,
} from '../utils/inboxRealtime';

type RefreshFn = () => void | Promise<void>;

/**
 * Écoute les events socket routés par CommunicationsHubPage pour un onglet inbox.
 * @param channel — whatsapp | staff | ota | leads | reviews
 * @param onRefreshList — recharge la liste des threads
 * @param onRefreshThread — recharge le fil ouvert (optionnel)
 */
export function useInboxRealtimeRefresh(
  channel: InboxRealtimeChannel,
  onRefreshList: RefreshFn,
  onRefreshThread?: RefreshFn,
): void {
  const listRef = useRef(onRefreshList);
  listRef.current = onRefreshList;
  const threadRef = useRef(onRefreshThread);
  threadRef.current = onRefreshThread;

  useEffect(() => {
    const eventName = inboxChannelEventName(channel);

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<InboxRealtimeDetail>).detail;
      if (detail?.channels && !detail.channels.includes(channel)) return;

      void listRef.current();
      if (threadRef.current) void threadRef.current();
    };

    window.addEventListener(eventName, handler);

    return () => {
      window.removeEventListener(eventName, handler);
    };
  }, [channel]);
}
