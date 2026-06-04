/**
 * Bases API — srv-task / srv-orchestrator / srv-chatbot retirés.
 * Tâches + orchestration → srv-fulltask (proxy admin en dev).
 * Voyageur WhatsApp → srv-fullchatbot (proxy admin).
 */
import { isLocalViteDevHost, resolveDevApiOrigin } from './resolveDevApiOrigin';

const API_BASE_URL = resolveDevApiOrigin();

const useLocalMicroservicePorts =
  !import.meta.env.PROD &&
  !import.meta.env.VITE_API_URL &&
  !import.meta.env.VITE_API_BASE_URL &&
  !isLocalViteDevHost();

function isDirectLocalService(url: string, port: number): boolean {
  try {
    const u = new URL(url);
    return ['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname) && u.port === String(port);
  } catch {
    return false;
  }
}

function resolveFulltaskAdminBase(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined' && isLocalViteDevHost()) {
    return '/api/v1/admin/fulltask';
  }
  const direct = import.meta.env.VITE_FULLTASK_URL?.trim();
  if (direct && isDirectLocalService(direct, 4015)) {
    return `${direct.replace(/\/$/, '')}/api`;
  }
  return `${API_BASE_URL}/api/v1/admin/fulltask`;
}

function resolveFullchatbotAdminBase(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined' && isLocalViteDevHost()) {
    return '/api/v1/admin/fullchatbot';
  }
  const direct = import.meta.env.VITE_FULLCHATBOT_URL?.trim();
  if (direct && isDirectLocalService(direct, 4016)) {
    return `${direct.replace(/\/$/, '')}/api`;
  }
  return `${API_BASE_URL}/api/v1/admin/fullchatbot`;
}

/** Routes équipe / staffbot (ingress public → srv-fulltask). */
function resolveFulltaskPublicBase(): string {
  if (useLocalMicroservicePorts) {
    return `${API_BASE_URL}:4015/api/v1/fulltask`;
  }
  return `${API_BASE_URL}/api/v1/fulltask`;
}

export const FULLTASK_ADMIN_BASE = resolveFulltaskAdminBase();
export const FULLCHATBOT_ADMIN_BASE = resolveFullchatbotAdminBase();
export const FULLTASK_PUBLIC_BASE = resolveFulltaskPublicBase();

export { API_BASE_URL, useLocalMicroservicePorts };
