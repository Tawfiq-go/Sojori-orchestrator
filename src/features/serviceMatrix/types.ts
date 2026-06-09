/** État niveau 1 (listing / template PM) + exécution owner (5–8). */

export type CapabilityColumnMode = 'yes' | 'na';

export type CapabilityStatus = 'not_managed' | 'incomplete' | 'configured';

export type MatrixScopeMode = 'owner' | 'listing';

export type SyncSaveState = 'idle' | 'syncing' | 'ok' | 'error';

export interface CapabilityExecutionState {
  clientReminders: boolean;
  staffAssignment: boolean;
  staffReminders: boolean;
  pmEscalation: boolean;
}

export interface CapabilityRowState {
  key: string;
  managed: boolean;
  clientEnabled: boolean;
  orchestrated: boolean;
  taskEnabled: boolean;
  execution: CapabilityExecutionState;
  status: CapabilityStatus;
  /** Override listing vs hérité template owner */
  inherited?: boolean;
}

export interface CapabilityMatrixDocument {
  scope: MatrixScopeMode;
  ownerKey: string;
  listingId?: string;
  capabilities: CapabilityRowState[];
  updatedAt?: string;
}

export interface UnifiedSaveResult {
  listingOk: boolean;
  fulltaskOk: boolean;
  error?: string;
}
