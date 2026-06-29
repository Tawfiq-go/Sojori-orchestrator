import apiClient from './apiClient';
import { AUTH_CONFIG } from '../config/authConfig';

export type PmSimulationAuditEvent =
  | 'start'
  | 'stop'
  | 'heartbeat'
  | 'page_view';

export type PmSimulationAuditPayload = {
  event: PmSimulationAuditEvent;
  sessionId: string;
  simulatedOwnerId: string;
  simulatedOwnerLabel?: string;
  simulatedOwnerEmail?: string;
  path?: string;
  meta?: Record<string, unknown>;
};

export async function postPmSimulationAudit(
  payload: PmSimulationAuditPayload,
): Promise<void> {
  try {
    await apiClient.post(`${AUTH_CONFIG.API_URL}/pm-simulation-audit`, payload);
  } catch (err) {
    console.warn('[pm-simulation-audit] failed', err);
  }
}
