import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * Scroll inbox style WhatsApp Desktop : message le plus récent en bas, visible à l'ouverture.
 */
export function useInboxMessageScroll(
  threadId: string | number,
  messageCount: number,
  loadingMessages: boolean,
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

  useLayoutEffect(() => {
    isFirstLoadRef.current = true;
    prevCountRef.current = 0;
  }, [threadId]);

  useLayoutEffect(() => {
    if (loadingMessages || messageCount === 0) return;

    if (isFirstLoadRef.current) {
      scrollToBottom('auto');
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
  }, [threadId, messageCount, loadingMessages, scrollToBottom]);

  return { containerRef, endRef, scrollToBottom };
}
