import { useEffect, useRef } from 'react';
import { getSocket } from '../services/socketService';

interface UseSocketIOOptions {
  /** Rooms à rejoindre. Recalculées si la référence du tableau change. */
  rooms: string[];
  /** Appelé après chaque (re)connexion — pour rattrapage/refetch. */
  onReconnect?: () => void;
  /** handlers événement -> callback */
  handlers: Record<string, (payload: any) => void>;
  /** désactive tout (ex. scope pas encore prêt) */
  enabled?: boolean;
}

/**
 * Connexion socket.io partagée au niveau de l'onglet (voir socketService.getSocket).
 * Ne déconnecte jamais la socket au unmount : d'autres composants de la même page
 * peuvent encore l'utiliser. La connexion vit tant que l'onglet est ouvert.
 */
export function useSocketIO({ rooms, onReconnect, handlers, enabled = true }: UseSocketIOOptions) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  const roomsKey = rooms.join('|');

  useEffect(() => {
    if (!enabled || rooms.length === 0) return;

    const socket = getSocket();

    const joinRooms = () => rooms.forEach((room) => socket.emit('JOIN_ROOM', room));

    const boundHandlers: Array<[string, (payload: any) => void]> = Object.keys(
      handlersRef.current,
    ).map((event) => {
      const wrapped = (payload: any) => {
        if (import.meta.env.DEV) {
          console.warn('[socket] event', event, payload);
        }
        handlersRef.current[event]?.(payload);
      };
      socket.on(event, wrapped);
      return [event, wrapped];
    });

    const onConnect = () => joinRooms();
    const onReconnectEvt = () => {
      joinRooms();
      onReconnectRef.current?.();
    };

    socket.on('connect', onConnect);
    socket.io.on('reconnect', onReconnectEvt);

    if (socket.connected) joinRooms();

    return () => {
      socket.off('connect', onConnect);
      socket.io.off('reconnect', onReconnectEvt);
      boundHandlers.forEach(([event, wrapped]) => socket.off(event, wrapped));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, roomsKey]);
}
