import { useState, useCallback } from 'react';
import axios from 'axios';
import { getOrchestratorApiBaseUrl } from 'config/backendServer.config';
const ORCHESTRATOR_BASE = getOrchestratorApiBaseUrl();

/**
 * Hook pour l'exécution d'actions orchestrateur avec dialog de vérification.
 *
 * Usage:
 * ```jsx
 * const { execute, dialogProps, loadingActionId, error, success } = useExecuteSendActionWithDialog()
 *
 * <ConditionCheckDialog {...dialogProps} />
 *
 * <button onClick={() => execute({
 *   actionId: 'ACT-XXXXXXXX',
 *   reservationNumber: 'SJ-XXXXXXXX',
 *   actionLabel: 'Envoyer relance',
 *   actionType: 'send_message',            // ← facultatif ('send_message' | 'assignStaff')
 *   scheduledExecutions: action.scheduledExecutions, // ← facultatif, liste des relances/assignations
 *   fetchWorkflowPlan: () => refetch(),
 *   onFeedback: (msg) => {},
 * })}>
 *   Envoyer
 * </button>
 * ```
 */
export function useExecuteSendActionWithDialog() {
  const [loadingActionId, setLoadingActionId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentExecution, setCurrentExecution] = useState(null);

  // ── execute brut (sans dialog) ──────────────────────────────────────────

  const directExecute = useCallback(async ({
    actionId,
    reservationNumber,
    fetchWorkflowPlan,
    onLastExecution,
    onFeedback,
    forceExecute = false,
    executionId = null // ← ID précis d'une scheduledExecution
  }) => {
    if (!actionId || !reservationNumber) {
      return false;
    }
    setLoadingActionId(actionId);
    setError(null);
    setSuccess(null);
    try {
      const execUrl = `${ORCHESTRATOR_BASE}/actions/${actionId}/execute`;
      const body = {
        reservationNumber
      };
      if (forceExecute) body.forceExecute = true;
      if (executionId) body.executionId = executionId; // ← cibler une relance précise

      const res = await axios.post(execUrl, body, {
        timeout: 15000
      });
      const ok = res.data?.success;
      if (ok) {
        const msg = 'Exécution réussie';
        setSuccess(msg);
        onFeedback?.({
          type: 'success',
          message: msg,
          actionId,
          reservationNumber
        });
        await fetchWorkflowPlan?.();
        if (onLastExecution) {
          try {
            const logRes = await axios.get(`${ORCHESTRATOR_BASE}/message-logs/action/${actionId}`);
            if (logRes.data?.success && logRes.data?.data?.hasExecution && logRes.data.data.lastExecution) {
              onLastExecution(logRes.data.data.lastExecution);
            } else {
              onLastExecution(null);
            }
          } catch (_) {}
        }
        return true;
      } else {
        const errMsg = res.data?.error || res.data?.message || "Erreur lors de l'exécution";
        setError(errMsg);
        onFeedback?.({
          type: 'error',
          message: errMsg,
          actionId,
          reservationNumber
        });
        return false;
      }
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.message || "Erreur lors de l'exécution";
      setError(errMsg);
      onFeedback?.({
        type: 'error',
        message: errMsg,
        actionId,
        reservationNumber
      });
      return false;
    } finally {
      setLoadingActionId(null);
    }
  }, []);

  // ── ouvre le dialog ─────────────────────────────────────────────────────

  const execute = useCallback(({
    actionId,
    reservationNumber,
    fetchWorkflowPlan,
    onLastExecution,
    onFeedback,
    actionLabel = 'Envoyer',
    actionType = 'send_message',
    scheduledExecutions = []
  }) => {
    if (!actionId || !reservationNumber) {
      return false;
    }
    setError(null);
    setSuccess(null);
    setCurrentExecution({
      actionId,
      reservationNumber,
      fetchWorkflowPlan,
      onLastExecution,
      onFeedback,
      actionLabel,
      actionType,
      scheduledExecutions
    });
    setDialogOpen(true);
  }, []);

  // ── callback dialog → exécuter (forceExecute, executionId?) ────────────

  const handleConfirmExecute = useCallback(async (forceExecute, executionId = null) => {
    if (!currentExecution) return;
    const {
      actionId,
      reservationNumber,
      fetchWorkflowPlan,
      onLastExecution,
      onFeedback
    } = currentExecution;
    const result = await directExecute({
      actionId,
      reservationNumber,
      fetchWorkflowPlan,
      onLastExecution,
      onFeedback,
      forceExecute,
      executionId
    });

    // Fermer uniquement si pas d'executionId ciblé (exécution ligne = pas de fermeture auto)
    if (result && !executionId) {
      setDialogOpen(false);
      setCurrentExecution(null);
    }
    return result;
  }, [currentExecution, directExecute]);
  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setCurrentExecution(null);
  }, []);
  return {
    execute,
    directExecute,
    loadingActionId,
    error,
    success,
    dialogProps: {
      open: dialogOpen,
      onClose: handleCloseDialog,
      actionId: currentExecution?.actionId,
      reservationNumber: currentExecution?.reservationNumber,
      onConfirmExecute: handleConfirmExecute,
      actionLabel: currentExecution?.actionLabel || 'Envoyer',
      actionType: currentExecution?.actionType || 'send_message',
      scheduledExecutions: currentExecution?.scheduledExecutions || []
    }
  };
}
export default useExecuteSendActionWithDialog;
