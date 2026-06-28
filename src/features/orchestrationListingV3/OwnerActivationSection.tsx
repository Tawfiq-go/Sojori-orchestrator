import { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import type { CapabilityRowState } from '../serviceMatrix/types';
import { applyDependencyRules } from '../serviceMatrix/matrixStateUtils';
import { getCapabilityDefinition } from '../serviceMatrix/capabilityRegistry';
import OwnerCapabilitiesActivationPanel from './OwnerCapabilitiesActivationPanel';
import { isCapabilityActivated } from './ownerCapabilityActivation';
import { loadOwnerOrchestrationMatrix, type OwnerOrchestrationDoc } from './ownerOrchestrationApi';

import {
  shouldAutoSyncListingsAfterOwnerSave,
  syncAllListingsFromOwnerOrchestration,
} from './ownerOrchestrationListingSync';

type Props = {
  ownerKey: string;
  onMetaChange?: (meta: { anyActive: boolean }) => void;
  isAdminTemplate?: boolean;
};

export default function OwnerActivationSection({
  ownerKey,
  onMetaChange,
  isAdminTemplate = false,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CapabilityRowState[]>([]);
  const [orchestrationDoc, setOrchestrationDoc] = useState<OwnerOrchestrationDoc | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await loadOwnerOrchestrationMatrix(ownerKey);
      setRows(loaded.rows);
      setOrchestrationDoc(loaded.doc);
      onMetaChange?.({
        anyActive: loaded.rows.some(r => isCapabilityActivated(r)),
      });
    } finally {
      setLoading(false);
    }
  }, [ownerKey, onMetaChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyActivationsLocally = useCallback(
    (activations: Record<string, boolean>) => {
      setRows(prev =>
        prev.map(row => {
          const def = getCapabilityDefinition(row.key);
          if (!def) return row;
          const active = activations[row.key] === true;
          return applyDependencyRules(row, {
            managed: active,
            inherited: false,
            ...(active
              ? {}
              : {
                  clientEnabled: false,
                  orchestrated: false,
                  taskEnabled: false,
                }),
          });
        }),
      );
      setOrchestrationDoc(prev => {
        if (!prev) return prev;
        const capabilities = { ...prev.capabilities };
        for (const [key, active] of Object.entries(activations)) {
          const cap = capabilities[key];
          if (!cap) continue;
          capabilities[key] = {
            ...cap,
            decisions: {
              ...cap.decisions,
              managed: active === true,
              ...(active
                ? {}
                : {
                    clientEnabled: false,
                    orchestrated: false,
                    taskEnabled: false,
                  }),
            },
          };
        }
        return {
          ...prev,
          orchestrationEnabled: Object.values(activations).some(Boolean),
          capabilities,
        };
      });
      onMetaChange?.({
        anyActive: Object.values(activations).some(Boolean),
      });
    },
    [onMetaChange],
  );

  if (loading) {
    return (
      <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <OwnerCapabilitiesActivationPanel
      variant="tab"
      ownerKey={ownerKey}
      rows={rows}
      orchestrationDoc={orchestrationDoc}
      onSaved={applyActivationsLocally}
      autoSyncListings
      isAdminTemplate={isAdminTemplate}
    />
  );
}
