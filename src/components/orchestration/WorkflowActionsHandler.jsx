// ════════════════════════════════════════════════════════════════════
// Sojori · Orchestration — WorkflowActionsHandler
// Gère l'exécution des actions sur les workflows (force-send, resend, reassign, extend, etc.)
// ════════════════════════════════════════════════════════════════════
import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL as API_URL } from '../../config/backendServer.config';
import { toast } from 'react-toastify';

const ACTION_ERROR_HINTS = {
  STAFF_ASSIGN_PENDING_TIMESLOT:
    'Le client n’a pas encore choisi son créneau, ou « Création tâche » n’a pas été exécutée.',
  STAFF_ASSIGN_TASK_NOT_FOUND:
    'Le code créneau doit être SM-… (tâche existante dans srv-task), pas PENDING-…',
  MESSAGE_TEMPLATE_MISSING:
    'Ajoutez un modèle dans OwnerTaskTemplate (onglet Orchestration) pour cette catégorie.',
  WHATSAPP_WINDOW_CHECK_FAILED:
    'Vérifiez que le numéro de la résa correspond au WhatsApp du client (format 33…).',
  WHATSAPP_SEND_FAILED: 'Échec d’envoi WhatsApp — voir les logs serveur.',
};

function formatExecuteError(data) {
  const msg = data?.error || 'Erreur lors de l\'exécution';
  const code = data?.errorCode;
  const hint = code && ACTION_ERROR_HINTS[code];
  return hint ? `${msg}\n${hint}` : msg;
}

/**
 * Hook pour gérer les actions de workflow
 * @param {Function} onRefresh - Callback pour rafraîchir les données après une action
 * @returns {Object} - { executeAction, isExecuting }
 */
export const useWorkflowActions = (reservationNumber, onRefresh) => {
  const [isExecuting, setIsExecuting] = useState(false);

  const executeAction = useCallback(async (actionId, actionType) => {
    if (!actionId || !reservationNumber) {
      console.error('[WorkflowActionsHandler] Missing actionId or reservationNumber');
      return;
    }

    setIsExecuting(true);

    try {
      // Appel à l'API d'exécution
      const response = await axios.post(
        `${API_URL}/api/v1/orchestrator/actions/${actionId}/execute`,
        { reservationNumber },
        { timeout: 20000 }
      );

      if (response.data?.success) {
        const channel = response.data?.data?.channelUsed;
        const windowStatus = response.data?.data?.whatsappWindowStatus;
        let message = response.data?.message || 'Action exécutée avec succès';
        if (channel === 'email' && windowStatus && windowStatus !== 'within_72h') {
          message += ` (fenêtre WhatsApp: ${windowStatus} → email)`;
        }

        // Afficher notification de succès
        toast.success(message, {
          position: 'bottom-right',
          autoClose: 3000,
        });

        // Rafraîchir les données
        if (onRefresh) {
          await onRefresh();
        }

        return { success: true, data: response.data };
      } else {
        const errorMsg = formatExecuteError(response.data);
        toast.error(errorMsg, {
          position: 'bottom-right',
          autoClose: 8000,
        });

        return { success: false, error: errorMsg, errorCode: response.data?.errorCode };
      }
    } catch (error) {
      console.error('[WorkflowActionsHandler] Error executing action:', error);
      const errorMsg = formatExecuteError(error.response?.data) || error.message || 'Erreur réseau';

      toast.error(`Échec: ${errorMsg}`, {
        position: 'bottom-right',
        autoClose: 5000,
      });

      return { success: false, error: errorMsg };
    } finally {
      setIsExecuting(false);
    }
  }, [reservationNumber, onRefresh]);

  return { executeAction, isExecuting };
};

/**
 * Handler pour "force-send" - Envoyer hors date
 */
export const handleForceSend = async (actionId, reservationNumber, onRefresh) => {
  const confirmed = window.confirm(
    'Voulez-vous vraiment forcer l\'envoi de ce message maintenant (hors délai normal) ?'
  );

  if (!confirmed) return;

  try {
    const response = await axios.post(
      `${API_URL}/api/v1/orchestrator/actions/${actionId}/execute`,
      { reservationNumber },
      { timeout: 15000 }
    );

    if (response.data?.success) {
      toast.success('Message envoyé avec succès', {
        position: 'bottom-right',
        autoClose: 3000,
      });

      if (onRefresh) await onRefresh();
      return { success: true };
    } else {
      toast.error(response.data?.error || 'Erreur lors de l\'envoi', {
        position: 'bottom-right',
      });
      return { success: false };
    }
  } catch (error) {
    console.error('[WorkflowActionsHandler] Force send error:', error);
    toast.error(`Échec: ${error.message}`, {
      position: 'bottom-right',
    });
    return { success: false };
  }
};

/**
 * Handler pour "resend" - Renvoyer manuellement
 */
export const handleResend = async (actionId, reservationNumber, onRefresh) => {
  const confirmed = window.confirm(
    'Voulez-vous renvoyer ce message manuellement au client ?'
  );

  if (!confirmed) return;

  try {
    const response = await axios.post(
      `${API_URL}/api/v1/orchestrator/actions/${actionId}/execute`,
      { reservationNumber },
      { timeout: 15000 }
    );

    if (response.data?.success) {
      toast.success('Message renvoyé avec succès', {
        position: 'bottom-right',
        autoClose: 3000,
      });

      if (onRefresh) await onRefresh();
      return { success: true };
    } else {
      toast.error(response.data?.error || 'Erreur lors du renvoi', {
        position: 'bottom-right',
      });
      return { success: false };
    }
  } catch (error) {
    console.error('[WorkflowActionsHandler] Resend error:', error);
    toast.error(`Échec: ${error.message}`, {
      position: 'bottom-right',
    });
    return { success: false };
  }
};

/**
 * Handler pour "extend" - Prolonger la deadline
 */
export const handleExtendDeadline = async (actionId, reservationNumber, hours, onRefresh) => {
  if (!hours || hours <= 0) {
    toast.error('Veuillez spécifier une durée valide', {
      position: 'bottom-right',
    });
    return;
  }

  try {
    const response = await axios.post(
      `${API_URL}/api/v1/orchestrator/actions/${actionId}/extend-deadline`,
      {
        reservationNumber,
        hours: Number(hours)
      },
      { timeout: 10000 }
    );

    if (response.data?.success) {
      toast.success(`Deadline reportée de ${hours}h`, {
        position: 'bottom-right',
        autoClose: 3000,
      });

      if (onRefresh) await onRefresh();
      return { success: true };
    } else {
      toast.error(response.data?.error || 'Erreur lors du report', {
        position: 'bottom-right',
      });
      return { success: false };
    }
  } catch (error) {
    console.error('[WorkflowActionsHandler] Extend deadline error:', error);
    toast.error(`Échec: ${error.message}`, {
      position: 'bottom-right',
    });
    return { success: false };
  }
};

/**
 * Handler pour "view-messages" - Voir l'historique des messages
 * Retourne un objet indiquant qu'une modale doit être ouverte
 */
export const handleViewMessages = (actionId, reservationNumber) => {
  console.log('[WorkflowActionsHandler] View messages for action:', actionId);
  return {
    success: true,
    openModal: 'view-messages',
    actionId,
    reservationNumber,
  };
};

/**
 * Handler pour "reassign-auto" - Réassigner automatiquement le staff
 */
export const handleReassignAuto = async (actionId, reservationNumber, onRefresh) => {
  const confirmed = window.confirm(
    'Voulez-vous réassigner automatiquement un nouveau staff ?'
  );

  if (!confirmed) return;

  try {
    // Prefer dedicated route; fallback to execute (assignStaff) if orchestrator not deployed yet
    let response;
    try {
      response = await axios.post(
        `${API_URL}/api/v1/orchestrator/actions/${actionId}/reassign-auto`,
        { reservationNumber },
        { timeout: 15000 }
      );
    } catch (reassignErr) {
      if (reassignErr.response?.status !== 404) throw reassignErr;
      response = await axios.post(
        `${API_URL}/api/v1/orchestrator/actions/${actionId}/execute`,
        { reservationNumber, offSchedule: true },
        { timeout: 15000 }
      );
    }

    if (response.data?.success) {
      const staffName =
        response.data?.data?.staffName ||
        response.data?.data?.assignedStaff?.staffName ||
        'Staff';
      toast.success(`Réassigné à ${staffName}`, {
        position: 'bottom-right',
        autoClose: 3000,
      });

      if (onRefresh) await onRefresh();
      return { success: true };
    } else {
      toast.error(response.data?.error || 'Erreur lors de la réassignation', {
        position: 'bottom-right',
      });
      return { success: false };
    }
  } catch (error) {
    console.error('[WorkflowActionsHandler] Reassign auto error:', error);
    toast.error(`Échec: ${error.message}`, {
      position: 'bottom-right',
    });
    return { success: false };
  }
};

/**
 * Handler pour "reassign-manual" - Réassigner manuellement le staff
 * Retourne un objet indiquant qu'une modale doit être ouverte
 */
export const handleReassignManual = (actionId, reservationNumber, onRefresh) => {
  console.log('[WorkflowActionsHandler] Reassign manual for action:', actionId);
  return {
    success: true,
    openModal: 'reassign-staff',
    actionId,
    reservationNumber,
    onRefresh,
  };
};

/**
 * Router principal pour dispatcher les actions
 */
export const dispatchWorkflowAction = async (actionType, actionId, reservationNumber, onRefresh, options = {}) => {
  console.log('[WorkflowActionsHandler] Dispatching action:', actionType, actionId);

  switch (actionType) {
    case 'force-send':
      return handleForceSend(actionId, reservationNumber, onRefresh);

    case 'resend':
      return handleResend(actionId, reservationNumber, onRefresh);

    case 'extend':
      return handleExtendDeadline(actionId, reservationNumber, options.hours, onRefresh);

    case 'view-messages':
      return handleViewMessages(actionId, reservationNumber);

    case 'reassign-auto':
      return handleReassignAuto(actionId, reservationNumber, onRefresh);

    case 'reassign-manual':
      return handleReassignManual(actionId, reservationNumber, onRefresh);

    default:
      console.warn('[WorkflowActionsHandler] Unknown action type:', actionType);
      return { success: false, error: 'Unknown action type' };
  }
};
