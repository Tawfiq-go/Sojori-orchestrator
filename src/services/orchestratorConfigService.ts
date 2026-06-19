// ════════════════════════════════════════════════════════════════════
// Sojori — orchestratorConfigService 🟣 SERVICE LAYER
// API client pour la configuration orchestrator (templates & messages)
// ════════════════════════════════════════════════════════════════════

import { isLocalViteDevHost } from '../config/resolveDevApiOrigin';
import { SOJORI_API_ORIGIN } from '../config/sojoriApiOrigins';
import { getToken } from '../utils/authUtils';

const API_BASE =
  import.meta.env.VITE_API_URL?.trim() ||
  (isLocalViteDevHost() ? '' : SOJORI_API_ORIGIN);
// srv-orchestrator routes : /api/v1/orchestrator/*
const ORCHESTRATOR_BASE = `${API_BASE}/api/v1/orchestrator`;

/**
 * Create headers with auth token
 */
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// ════════════════════════════════════════════════════════════════════
// TASK TEMPLATES (Modèles d'orchestration)
// ════════════════════════════════════════════════════════════════════

export interface TaskTemplate {
  _id?: string;
  ownerId?: string;
  categoryName: string;
  enabled: boolean;
  mode: 'ORCHESTRATION' | 'NOTIFICATION_ONLY' | 'MANUAL';
  orchestration: any; // Complex nested object
  aiOrchestration?: any;
  clientReminders?: any;
  updatedAt?: string;
  createdAt?: string;
}

/**
 * Get orchestrator task template for owner
 * GET /api/v1/orchestrator/config/task-template/:ownerId
 */
export async function getOrchestratorTaskTemplate(
  ownerId?: string
): Promise<{ success: boolean; notFound?: boolean; data: { categories: TaskTemplate[] } }> {
  // Default owner ID si non fourni
  const targetOwnerId = ownerId || 'default';
  const url = `${ORCHESTRATOR_BASE}/config/task-template/${targetOwnerId}`;

  const response = await fetch(url, {
    headers: getHeaders(),
  });

  // 404 = pas encore de template (normal)
  if (response.status === 404) {
    return {
      success: true,
      notFound: true,
      data: {
        categories: [],
      },
    };
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * Update orchestrator task template
 * PUT /api/v1/orchestrator/config/task-template/:ownerId
 */
export async function updateOrchestratorTaskTemplate(
  ownerId: string,
  categories: TaskTemplate[]
): Promise<{ success: boolean; data: any }> {
  const url = `${ORCHESTRATOR_BASE}/config/task-template/${ownerId}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ categories }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

// ════════════════════════════════════════════════════════════════════
// MAIL/MESSAGE TEMPLATES
// ════════════════════════════════════════════════════════════════════

export interface MailTemplate {
  _id?: string;
  ownerId?: string;
  messageName: string;
  displayLabel?: string;
  description?: string;
  enabled: boolean;
  messageEnabled?: boolean;
  whatsappEnabled?: boolean;
  whatsappType?: string;
  subject?: string;
  body?: string;
  htmlBody?: string;
  variables?: string[];
  category?: string;
  updatedAt?: string;
  createdAt?: string;
}

/**
 * Get all orchestrator mail templates
 * GET /api/v1/orchestrator/config/message-templates
 */
export async function getOrchestratorMailTemplates(): Promise<{
  success: boolean;
  data: MailTemplate[];
}> {
  const response = await fetch(`${ORCHESTRATOR_BASE}/config/message-templates`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * Update orchestrator mail template
 * PUT /api/v1/orchestrator/config/message-template/:id
 */
export async function updateOrchestratorMailTemplate(
  id: string,
  template: Partial<MailTemplate>
): Promise<{ success: boolean; data: MailTemplate }> {
  const response = await fetch(`${ORCHESTRATOR_BASE}/config/message-template/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(template),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * Create orchestrator mail template
 * POST /api/v1/orchestrator/config/message-template
 */
export async function createOrchestratorMailTemplate(
  template: Partial<MailTemplate>
): Promise<{ success: boolean; data: MailTemplate }> {
  const response = await fetch(`${ORCHESTRATOR_BASE}/config/message-template`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(template),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * Delete orchestrator mail template
 * DELETE /api/v1/orchestrator/config/message-template/:id
 */
export async function deleteOrchestratorMailTemplate(
  id: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${ORCHESTRATOR_BASE}/config/message-template/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return await response.json();
}

export default {
  // Task Templates
  getOrchestratorTaskTemplate,
  updateOrchestratorTaskTemplate,

  // Mail Templates
  getOrchestratorMailTemplates,
  updateOrchestratorMailTemplate,
  createOrchestratorMailTemplate,
  deleteOrchestratorMailTemplate,
};
