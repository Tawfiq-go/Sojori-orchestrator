import { io, type Socket } from 'socket.io-client';
import { getToken } from '../utils/authUtils';
import { resolveDevApiOrigin } from '../config/resolveDevApiOrigin';

const SOCKET_PATH = '/api/v1/sockets/connect';

let socket: Socket | null = null;

/**
 * Origine socket.io : relatif en local (proxy Vite → dev.sojori.com), absolu en prod
 * (app.sojori.com ne peut pas servir de WebSocket — Vercel renvoie index.html → HTTP 200).
 */
function resolveSocketOrigin(): string | undefined {
  const origin = resolveDevApiOrigin();
  return origin || undefined;
}

/**
 * Singleton par onglet navigateur : une seule connexion socket.io partagée
 * entre tous les composants de la page (chaque onglet a son propre contexte JS).
 */
export function getSocket(): Socket {
  if (socket) return socket;

  socket = io(resolveSocketOrigin(), {
    path: SOCKET_PATH,
    auth: (cb) => cb({ token: getToken() }),
    // Polling d'abord en local : évite la rafale ws 503 quand le proxy Vite / ingress socket est indispo
    transports: import.meta.env.DEV ? ['polling', 'websocket'] : ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    reconnectionAttempts: import.meta.env.DEV ? 8 : Infinity,
  });

  socket.on('connect_error', (err) => {
    console.warn('[socket] connect_error', err.message);
  });

  // TODO(diagnostic temporaire): retirer une fois la cause des transport close identifiée
  socket.on('connect', () => console.warn('[socket] connect', socket?.id));
  socket.on('disconnect', (reason, details) => console.warn('[socket] disconnect', reason, details));
  socket.io.on('reconnect_attempt', (n) => console.warn('[socket] reconnect_attempt', n));
  socket.io.on('reconnect_error', (err) => console.warn('[socket] reconnect_error', err.message));

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
