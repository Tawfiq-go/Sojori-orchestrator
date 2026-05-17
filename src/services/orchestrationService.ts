// ════════════════════════════════════════════════════════════════════
// Sojori — orchestrationService 🟣 SERVICE LAYER
// API client pour srv-orchestrator (port 4008)
// ════════════════════════════════════════════════════════════════════
import type {
  OrchestrationPlan,
  OrchestrationPlanDetail,
  OrchestrationStats,
  GetPlansParams,
  GetPlansResponse,
  CancelPlanParams,
} from '../types/orchestration.types';

// ✅ CORRECTION: srv-orchestrator est sur port 4010 (pas 4008)
// Production: https://dev.sojori.com/api/v1/orchestrator (via ingress)
// Local: http://localhost:4010/api/v1/orchestrator
const API_BASE = import.meta.env.VITE_SRV_ORCHESTRATOR_URL || 'https://dev.sojori.com';
const API_PREFIX = '/api/v1/orchestrator';

import { getToken } from '../utils/authUtils';

/**
 * JWT aligné sur le reste de l’app (cookie sojori_token + fallback localStorage legacy).
 */
function getAuthToken(): string | null {
  return getToken() ?? null;
}

/**
 * Create headers with auth token
 */
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Fetch all orchestration plans with filters
 * GET /api/v1/orchestrator/reservations
 */
export async function getOrchestrationPlans(
  params: GetPlansParams = {}
): Promise<GetPlansResponse> {
  const {
    limit = 50,
    offset = 0,
    listingId,
    reservationStatus = 'ACTIVE',
    sortBy = 'recent',
  } = params;

  const queryParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    reservationStatus,
    sortBy,
  });

  if (listingId) {
    queryParams.append('listingId', listingId);
  }

  const response = await fetch(`${API_BASE}${API_PREFIX}/reservations?${queryParams}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const json = await response.json();
  return json;
}

/**
 * Fetch detailed orchestration plan for a specific reservation
 * GET /api/v1/orchestrator/reservations/:reservationNumber
 */
export async function getOrchestrationPlanDetail(
  reservationNumber: string
): Promise<OrchestrationPlanDetail> {
  const response = await fetch(
    `${API_BASE}${API_PREFIX}/reservations/${reservationNumber}`,
    {
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const json = await response.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch plan detail');
  }

  return json.data;
}

/**
 * Cancel an orchestration plan (sets status to CANCELLED)
 * POST /api/v1/orchestrator/reservations/:reservationNumber/cancel
 */
export async function cancelOrchestrationPlan(
  params: CancelPlanParams
): Promise<{ success: boolean; message: string }> {
  const { reservationNumber, reason = 'Manually cancelled by admin' } = params;

  const response = await fetch(
    `${API_BASE}${API_PREFIX}/reservations/${reservationNumber}/cancel`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const json = await response.json();
  return json;
}

/**
 * Get orchestration global stats
 * GET /api/v1/orchestrator/orchestration/stats
 */
export async function getOrchestrationStats(): Promise<OrchestrationStats> {
  const response = await fetch(`${API_BASE}${API_PREFIX}/orchestration/stats`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const json = await response.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch stats');
  }

  return json.data;
}

/**
 * Alias route for plans list
 * GET /api/v1/orchestrator/orchestration/plans
 */
export async function getOrchestrationPlansList(
  limit: number = 50
): Promise<{ plans: OrchestrationPlan[] }> {
  const response = await fetch(
    `${API_BASE}${API_PREFIX}/orchestration/plans?limit=${limit}`,
    {
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const json = await response.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch plans list');
  }

  return json.data;
}

/**
 * Alias route for plan detail
 * GET /api/v1/orchestrator/orchestration/plans/:reservationCode
 */
export async function getOrchestrationPlanByCode(
  reservationCode: string
): Promise<OrchestrationPlanDetail> {
  const response = await fetch(
    `${API_BASE}${API_PREFIX}/orchestration/plans/${reservationCode}`,
    {
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const json = await response.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch plan');
  }

  return json.data;
}

export default {
  getOrchestrationPlans,
  getOrchestrationPlanDetail,
  cancelOrchestrationPlan,
  getOrchestrationStats,
  getOrchestrationPlansList,
  getOrchestrationPlanByCode,
};
