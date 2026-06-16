import { useCallback, useLayoutEffect, useRef } from 'react';
import type { Message } from '../../types/unifiedInbox.types';
import { messageMatchesKeyword } from './highlightInboxKeyword';

/**
 * Scroll inbox style WhatsApp Desktop : message le plus récent en bas, visible à l'ouverture.
 * Si `highlightKeyword` est défini, scroll vers la première occurrence à l'ouverture du fil.
 */
export function useInboxMessageScroll(
  threadId: string | number,
  messageCount: number,
  loadingMessages: boolean,
  highlightKeyword?: string,
  messages?: Message[],
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);
  const prevCountRef = useRef(0);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const run = () => {
      endRef.current?.scrollIntoView({ block: 'end', behavior });
      const el = containerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, []);

  const scrollToKeywordMatch = useCallback(() => {
    const kw = highlightKeyword?.trim();
    if (!kw || !messages?.length) return false;
    const hit = messages.find(
      (m) =>
        m.type !== 'day-separator' &&
        m.type !== 'system-note' &&
        messageMatchesKeyword(m.text, kw),
    );
    if (!hit) return false;
    const run = () => {
      const el = document.getElementById(`inbox-msg-${threadId}-${hit.id}`);
      el?.scrollIntoView({ block: 'center', behavior: 'auto' });
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
    return true;
  }, [highlightKeyword, messages, threadId]);

  useLayoutEffect(() => {
    isFirstLoadRef.current = true;
    prevCountRef.current = 0;
  }, [threadId, highlightKeyword]);

  useLayoutEffect(() => {
    if (loadingMessages || messageCount === 0) return;

    if (isFirstLoadRef.current) {
      if (!scrollToKeywordMatch()) {
        scrollToBottom('auto');
      }
      isFirstLoadRef.current = false;
      prevCountRef.current = messageCount;
      return;
    }

    if (messageCount > prevCountRef.current) {
      const el = containerRef.current;
      const wasAtBottom = el
        ? el.scrollHeight - el.scrollTop - el.clientHeight < 100
        : true;
      if (wasAtBottom) scrollToBottom('auto');
    }

    prevCountRef.current = messageCount;
  }, [
    threadId,
    messageCount,
    loadingMessages,
    scrollToBottom,
    scrollToKeywordMatch,
    highlightKeyword,
  ]);

  return { containerRef, endRef, scrollToBottom };
}
