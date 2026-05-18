/** Rafraîchissement global hub Channels (toolbar legacy). */
export const CHANNELS_REFRESH_EVENT = 'sojori:channels-refresh';

export function dispatchChannelsRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANNELS_REFRESH_EVENT));
  }
}

export function onChannelsRefresh(handler: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANNELS_REFRESH_EVENT, handler);
  return () => window.removeEventListener(CHANNELS_REFRESH_EVENT, handler);
}
