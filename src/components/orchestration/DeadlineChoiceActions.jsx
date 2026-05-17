import React, { useState, useCallback, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_BASE_URL as API_URL, MICROSERVICE_BASE_URL } from 'config/backendServer.config';
import { whatsappApi, otaMessagesApi } from 'features/communications/services/communicationsApi';
import { whatsappApiOptimized } from 'features/communications/services/whatsappApiOptimized';
import AssignStaffDialog from 'features/tasksNew/components/AssignStaffDialog';

/**
 * Modal pour reporter une deadline avec plusieurs options
 */
const ExtendDeadlineModal = ({
  show,
  onClose,
  onExtend,
  isExecuting
}) => {
  const [customHours, setCustomHours] = useState('');
  if (!show) return null;
  const presetOptions = [{
    hours: 6,
    label: '6 heures',
    icon: '⏱️'
  }, {
    hours: 12,
    label: '12 heures',
    icon: '🕐'
  }, {
    hours: 24,
    label: '1 jour',
    icon: '📅'
  }, {
    hours: 48,
    label: '2 jours',
    icon: '📆'
  }];
  const handleCustomExtend = () => {
    const hours = Number(customHours);
    if (hours > 0) {
      onExtend(hours);
      onClose();
    }
  };
  return <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-5 max-w-sm w-full shadow-xl">
        <h3 className="text-sm font-semibold mb-4 text-gray-900">Reporter la deadline</h3>

        <div className="space-y-2 mb-4">
          {presetOptions.map(option => <button key={option.hours} onClick={() => {
          onExtend(option.hours);
          onClose();
        }} disabled={isExecuting} className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded text-xs font-medium text-gray-700 flex items-center gap-2 disabled:opacity-50">
              <span>{option.icon}</span>
              <span>{option.label}</span>
            </button>)}
        </div>

        <div className="border-t pt-3">
          <label className="text-xs text-gray-700 font-medium block mb-2">Durée personnalisée (heures)</label>
          <div className="flex gap-2">
            <input type="number" min="1" value={customHours} onChange={e => setCustomHours(e.target.value)} placeholder="Ex: 36" className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs" />
            <button onClick={handleCustomExtend} disabled={isExecuting || !customHours || Number(customHours) <= 0} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded disabled:bg-gray-300">
              Appliquer
            </button>
          </div>
        </div>

        <button onClick={onClose} className="mt-4 w-full px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded">
          Annuler
        </button>
      </div>
    </div>;
};

// StaffSelectionModal supprimé - on utilise AssignStaffDialog de tasksNew

/**
 * Modal pour messages (WhatsApp Sojori ou OTA) avec historique
 */
const MessageModal = ({
  show,
  onClose,
  type,
  onSend,
  reservation,
  isExecuting,
  guestPhone
}) => {
  const [message, setMessage] = useState('');
  const [recentMessages, setRecentMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Récupérer l'historique des messages lors de l'ouverture
  useEffect(() => {
    if (!show) return;
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        if (type === 'whatsapp') {
          if (!guestPhone) {} else {}
        }
        if (type === 'whatsapp' && guestPhone) {
          // Nettoyer le numéro de téléphone
          const cleanPhone = String(guestPhone).replace(/\D/g, '');
          // Récupérer les messages WhatsApp directement par téléphone
          const response = await whatsappApiOptimized.getMessages(cleanPhone, 10);
          if (response?.exchanges) {
            // Formatter les messages pour l'affichage
            const formattedMessages = [];
            response.exchanges.forEach(exchange => {
              exchange.messages?.forEach(msg => {
                formattedMessages.push({
                  id: msg.message_id || msg._id,
                  content: msg.content || msg.body || msg.text || '',
                  timestamp: msg.timestamp || msg.created_at,
                  isFromUser: msg.direction === 'incoming' || msg.from_me === false,
                  isFromAdmin: msg.direction === 'outgoing' || msg.from_me === true,
                  status: msg.status || 'sent'
                });
              });
            });
            setRecentMessages(formattedMessages.slice(-8)); // Prendre les 8 derniers messages
          } else {
            // Si pas de messages directs, essayer par réservation
            if (reservation?.reservationNumber) {
              const searchResponse = await whatsappApiOptimized.searchByReservation(reservation.reservationNumber);
              if (searchResponse?.conversations?.length > 0) {
                const conv = searchResponse.conversations[0];
                if (conv.phone) {
                  const msgResponse = await whatsappApiOptimized.getMessages(conv.phone, 10);
                  if (msgResponse?.exchanges) {
                    const formattedMessages = [];
                    msgResponse.exchanges.forEach(exchange => {
                      exchange.messages?.forEach(msg => {
                        formattedMessages.push({
                          id: msg.message_id || msg._id,
                          content: msg.content || msg.body || msg.text || '',
                          timestamp: msg.timestamp || msg.created_at,
                          isFromUser: msg.direction === 'incoming' || msg.from_me === false,
                          isFromAdmin: msg.direction === 'outgoing' || msg.from_me === true,
                          status: msg.status || 'sent'
                        });
                      });
                    });
                    setRecentMessages(formattedMessages.slice(-8));
                  }
                }
              }
            }
          }
        } else if (type === 'ota' && reservation?.reservationNumber) {
          // Récupérer les messages OTA
          const response = await otaMessagesApi.getByReservation(reservation.reservationNumber);
          if (response?.data?.length > 0) {
            const thread = response.data[0];
            // Récupérer les messages du thread
            if (thread.threadId || thread._id) {
              const messagesResponse = await otaMessagesApi.getMessages(thread.threadId || thread._id);
              const messages = messagesResponse?.messages || messagesResponse?.data || [];
              setRecentMessages(messages.slice(-8).map(msg => ({
                id: msg.id || msg._id,
                content: msg.message || msg.content || msg.body || '',
                timestamp: msg.sentAt || msg.createdAt || msg.created_at,
                isFromUser: msg.sender === 'guest' || msg.senderType === 'guest' || msg.from_me === false,
                isFromAdmin: msg.sender === 'host' || msg.senderType === 'host' || msg.from_me === true,
                status: 'sent'
              })));
            }
          }
        }
      } catch (error) {} finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [show, type, reservation?.reservationNumber, guestPhone]);
  if (!show) return null;
  const title = type === 'whatsapp' ? 'Message WhatsApp (Sojori)' : 'Message OTA';
  const historyUrl = `/admin/Communications?tab=${type === 'whatsapp' ? 'whatsapp' : 'ota'}&reservation=${reservation?.reservationNumber || ''}`;
  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      onClose();
    }
  };

  // Formater la date pour l'affichage
  const formatMessageTime = timestamp => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Obtenir l'icône de statut pour WhatsApp
  const getStatusIcon = status => {
    switch (status) {
      case 'read':
        return '✓✓';
      case 'delivered':
        return '✓✓';
      case 'sent':
        return '✓';
      default:
        return '';
    }
  };
  return <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-5 max-w-lg w-full shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {reservation?.reservationNumber && <a href={historyUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 underline">
              Voir tout l&apos;historique →
            </a>}
        </div>

        {/* Historique des messages récents */}
        {loadingHistory ? <div className="mb-3 text-xs text-gray-500 text-center p-4">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            <div className="mt-2">Chargement de l&apos;historique...</div>
          </div> : recentMessages.length > 0 ? <div className="mb-3 border border-gray-200 rounded-lg bg-gradient-to-b from-gray-50 to-white max-h-64 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-3 py-2">
              <div className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                <span className="text-lg">💬</span>
                Conversation récente
              </div>
            </div>
            <div className="p-3 space-y-2">
              {recentMessages.map((msg, idx) => <div key={msg.id || idx} className={`flex ${msg.isFromAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${msg.isFromAdmin ? 'order-1' : ''}`}>
                    <div className={`px-3 py-2 rounded-lg ${msg.isFromAdmin ? 'bg-green-500 text-white rounded-br-none' : 'bg-white border border-gray-200 rounded-bl-none'}`}>
                      <div className="text-sm whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                      <div className={`flex items-center gap-1 mt-1 text-[10px] ${msg.isFromAdmin ? 'text-green-100' : 'text-gray-400'}`}>
                        <span>{formatMessageTime(msg.timestamp)}</span>
                        {msg.isFromAdmin && type === 'whatsapp' && <span className="ml-1">{getStatusIcon(msg.status)}</span>}
                      </div>
                    </div>
                  </div>
                </div>)}
            </div>
          </div> : <div className="mb-3 p-8 text-center bg-gray-50 rounded-lg">
            <div className="text-gray-400 mb-2">
              <span className="text-2xl">📭</span>
            </div>
            <div className="text-xs text-gray-500">Aucun message récent trouvé</div>
            {type === 'whatsapp' && <div className="text-xs text-gray-400 mt-1">
                {guestPhone ? `Pour ${guestPhone}` : 'Numéro de téléphone non disponible'}
              </div>}
          </div>}

        <div className="mb-3">
          <a href={historyUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1">
            <span>📜</span>
            <span>Voir l&apos;historique complet</span>
          </a>
        </div>

        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={`Tapez votre nouveau message ${type === 'whatsapp' ? 'WhatsApp' : 'OTA'}...`} className="w-full h-32 px-3 py-2 border border-gray-300 rounded text-xs resize-none" autoFocus />

        <div className="text-xs text-gray-500 mb-3">
          {type === 'whatsapp' ? 'Message envoyé via API Sojori' : `Message pour ${reservation?.source || 'OTA'}`}
        </div>

        <div className="flex gap-2">
          <button onClick={handleSend} disabled={isExecuting || !message.trim()} className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded disabled:bg-gray-300">
            Envoyer
          </button>
          <button onClick={onClose} className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded">
            Annuler
          </button>
        </div>
      </div>
    </div>;
};

const RESOLVED_TS_PREFIX = ['SM-', 'SC-', 'SR-'];
function taskTimeslotCodeForTask(workflow, actions, requestTimeslotProp) {
  const w = workflow || {};
  const rt = requestTimeslotProp || actions?.requestTimeslot || w.actions?.requestTimeslot;
  const candidates = [w.whatsappInfo?.timeslotCode, rt?.execution?.response?.timeslotCode, rt?.response?.timeslotCode, w.timeslotCode];
  const resolved = candidates.find((c) => typeof c === 'string' && RESOLVED_TS_PREFIX.some((p) => c.startsWith(p)));
  if (resolved) return resolved;
  return candidates.find((c) => typeof c === 'string' && c.length > 0) || null;
}

/**
 * Actions admin pour deadlines CHOICE (arrival_choose / departure_choose).
 * URL deadline : `${planMongoId}__${workflow.category}` (aligné srv-orchestrator).
 */
const DeadlineChoiceActions = ({
  requestTimeslot,
  actions,
  workflow,
  reservation,
  planMongoId,
  handleEnvoyerRelance,
  handleCreerTimeslot,
  selectedHour,
  setSelectedHour,
  onActionSuccess,
  onActionError
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(null); // 'whatsapp' ou 'ota'
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Déterminer l'heure par défaut intelligemment
  const defaultHour = useMemo(() => {
    // Si on a déjà une heure choisie dans le workflow
    if (workflow?.timeslotCode) {
      const match = workflow.timeslotCode.match(/(\d{1,2})h/);
      if (match) return Number(match[1]);
    }

    // Sinon, utiliser l'heure de check-in/check-out selon le type
    const isArrival = workflow?.category?.includes('arrival');
    const checkTime = isArrival ? reservation?.checkInDate : reservation?.checkOutDate;
    if (checkTime) {
      const date = new Date(checkTime);
      const hour = date.getHours();
      if (hour >= 0 && hour < 24) return hour;
    }

    // Par défaut : 14h pour arrivée, 10h pour départ
    return isArrival ? 14 : 10;
  }, [workflow, reservation]);

  // Mettre à jour l'heure sélectionnée quand on détecte un changement
  useEffect(() => {
    if (selectedHour === undefined || selectedHour === 14) {
      setSelectedHour(defaultHour);
    }
  }, [defaultHour]);
  const workflowType = workflow?.category;
  const guestPhone = reservation?.guestPhone || reservation?.phone || reservation?.mobilePhone || reservation?.mobile || reservation?.guest?.phone || reservation?.guest?.mobile || reservation?.guestDetails?.phone || reservation?.contactPhone || reservation?.phoneNumber;

  // Debug log pour voir la structure de reservation

  const deadlineRouteId = planMongoId && workflowType ? `${planMongoId}__${workflowType}` : null;
  const channel = reservation?.source || reservation?.channelName || reservation?.channel || 'OTA';
  const postDeadlineAction = useCallback(async body => {
    if (!deadlineRouteId) {
      // Pas d'ID plan → on ne bloque pas l'action

      return {
        data: {
          success: true,
          _noTrace: true
        }
      };
    }
    const url = `${API_URL}/api/v1/orchestrator/deadline/${encodeURIComponent(deadlineRouteId)}/action`;
    return axios.post(url, body, {
      timeout: 20000
    });
  }, [deadlineRouteId]);
  const basePayload = useCallback(() => ({
    workflowType,
    reservationCode: reservation?.reservationNumber || reservation?.reservationCode,
    adminId: 'admin',
    adminName: 'Admin'
  }), [workflowType, reservation?.reservationNumber, reservation?.reservationCode]);

  /**
   * Choisir créneau - Utilise la même API que "Choisir arrivée" dans les cartes
   */
  const handleChooseTimeslot = async () => {
    if (!reservation?.reservationNumber) {
      onActionError?.('Numéro de réservation manquant');
      return;
    }
    setIsExecuting(true);
    try {
      // Utiliser la même logique que handleCreerTimeslot existant
      const isArrivalOnly = workflow?.category === 'arrival_choose';
      const endpoint = isArrivalOnly ? `${API_URL}/api/v1/orchestrator/reservations/${reservation.reservationNumber}/timeslot/update-arrival-hour` : `${API_URL}/api/v1/orchestrator/reservations/${reservation.reservationNumber}/timeslot/update-hour`;
      const timeslotCode = taskTimeslotCodeForTask(workflow, actions, requestTimeslot);
      const payload = isArrivalOnly ? {
        timeslotCode,
        workflowId: workflow?.workflowId,
        categoryType: workflow?.categoryType,
        selected_hour: selectedHour
      } : {
        timeslotCode,
        workflowId: workflow?.workflowId,
        categoryType: workflow?.categoryType,
        selected_hour: selectedHour,
        category: workflow?.category
      };
      const res = await axios.post(endpoint, payload, {
        timeout: 10000
      });
      if (res.data?.success) {
        onActionSuccess?.(`Créneau ${selectedHour}h enregistré`);
        // Si handleCreerTimeslot est fourni par le parent, l'appeler pour rafraîchir
        if (typeof handleCreerTimeslot === 'function') {
          await handleCreerTimeslot();
        }
      } else {
        throw new Error(res.data?.message || 'Erreur lors de la mise à jour du créneau');
      }
    } catch (error) {
      onActionError?.(error.response?.data?.message || error.message);
    } finally {
      setIsExecuting(false);
    }
  };

  /**
   * Appel vocal (tel:) + trace backend
   */
  const handleCallClient = async () => {
    if (!guestPhone) {
      onActionError?.('Numéro de téléphone non disponible');
      return;
    }
    window.location.href = `tel:${guestPhone}`;
    if (!deadlineRouteId) {
      onActionSuccess?.(`Appel lancé : ${guestPhone} (trace API indisponible sans plan _id)`);
      return;
    }
    setIsExecuting(true);
    try {
      await postDeadlineAction({
        actionId: 'CALL_CLIENT',
        ...basePayload(),
        payload: {
          phone: guestPhone,
          adminNote: `Appel client ${guestPhone}`
        }
      });
      onActionSuccess?.(`Appel lancé / tracé : ${guestPhone}`);
    } catch (error) {
      onActionError?.(error.response?.data?.message || error.message);
    } finally {
      setIsExecuting(false);
    }
  };

  /**
   * Relance WhatsApp (template / flux existant)
   */
  const handleSendWhatsApp = async () => {
    setIsExecuting(true);
    try {
      await handleEnvoyerRelance();
      onActionSuccess?.('Relance WhatsApp envoyée');
    } catch (error) {
      onActionError?.(error.message);
    } finally {
      setIsExecuting(false);
    }
  };

  /** Message libre via canal Sojori (API chatbot) */
  const handleWhatsAppSojoriFreeText = async message => {
    if (!guestPhone) {
      onActionError?.('Numéro invité manquant pour WhatsApp Sojori');
      return;
    }
    setIsExecuting(true);
    try {
      await postDeadlineAction({
        actionId: 'SEND_WHATSAPP_MANUAL',
        ...basePayload(),
        payload: {
          recipientPhone: guestPhone,
          message,
          adminNote: 'Message manuel admin (Sojori)'
        }
      });
      onActionSuccess?.('Message WhatsApp (Sojori) envoyé');
    } catch (error) {
      onActionError?.(error.response?.data?.message || error.message);
    } finally {
      setIsExecuting(false);
      setShowMessageModal(null);
    }
  };

  /** Message OTA — trace backend (envoi API OTA : TODO côté orchestrateur) */
  const handleSendOtaMessage = async message => {
    setIsExecuting(true);
    try {
      await postDeadlineAction({
        actionId: 'SEND_OTA_MESSAGE',
        ...basePayload(),
        payload: {
          otaMessage: message,
          channel,
          adminNote: `Message OTA (${channel})`
        }
      });
      onActionSuccess?.('Message OTA enregistré (traçabilité)');

      // Ouvrir l'historique dans un nouvel onglet après envoi
      const historyUrl = `/admin/Communications?tab=ota&reservation=${reservation?.reservationNumber || ''}`;
      window.open(historyUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      onActionError?.(error.response?.data?.message || error.message);
    } finally {
      setIsExecuting(false);
      setShowMessageModal(null);
    }
  };
  const handleExtendHours = async hours => {
    setIsExecuting(true);
    try {
      await postDeadlineAction({
        actionId: 'EXTEND_DEADLINE',
        ...basePayload(),
        payload: {
          hours,
          adminNote: `Prolongation admin +${hours}h`
        }
      });
      onActionSuccess?.(`Deadline prolongée de ${hours}h`);
    } catch (error) {
      onActionError?.(error.response?.data?.message || error.message);
    } finally {
      setIsExecuting(false);
      setShowExtendModal(false);
    }
  };
  const handleResolve = async () => {
    const note = window.prompt('Note de résolution (obligatoire) :');
    if (!note?.trim()) return;
    setIsExecuting(true);
    try {
      await postDeadlineAction({
        actionId: 'MARK_RESOLVED_MANUALLY',
        ...basePayload(),
        payload: {
          adminNote: note.trim()
        }
      });
      onActionSuccess?.('Workflow marqué résolu par admin');
    } catch (error) {
      onActionError?.(error.response?.data?.message || error.message);
    } finally {
      setIsExecuting(false);
    }
  };
  const handleCancel = async () => {
    const note = window.prompt('Raison / note d\'annulation (obligatoire) :');
    if (!note?.trim()) return;
    setIsExecuting(true);
    try {
      await postDeadlineAction({
        actionId: 'CANCEL_TASK',
        ...basePayload(),
        payload: {
          reason: note.trim(),
          adminNote: note.trim()
        }
      });
      onActionSuccess?.('Tâche / workflow annulé');
    } catch (error) {
      onActionError?.(error.response?.data?.message || error.message);
    } finally {
      setIsExecuting(false);
    }
  };
  const handleAssignStaff = async staff => {
    setIsExecuting(true);
    try {
      const timeslotCode = taskTimeslotCodeForTask(workflow, actions, requestTimeslot);
      if (!timeslotCode) {
        // Si pas de timeslot, utiliser l'API deadline pour tracer
        if (deadlineRouteId) {
          await postDeadlineAction({
            actionId: 'ASSIGN_STAFF_MANUAL',
            ...basePayload(),
            payload: {
              staffId: staff._id || staff.id || staff.staffCode,
              staffName: `${staff.firstName} ${staff.lastName}`,
              staffPhone: staff.phoneNumber || staff.staffPhone,
              adminNote: `Staff assigné: ${staff.firstName} ${staff.lastName}`
            }
          });
        }
      } else {
        // Utiliser l'API srv-task directement comme dans AssignStaffDialog
        try {
          const response = await axios.post(`${MICROSERVICE_BASE_URL.SRV_TASK}/staff/auto-assign/${timeslotCode}`, {
            strategy: 'MANUAL',
            staffId: staff._id || staff.id || staff.staffCode,
            reservationNumber: reservation?.reservationNumber || reservation?.reservationCode,
            adminNote: `Assignation manuelle: ${staff.firstName} ${staff.lastName}`
          }, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            timeout: 10000
          });
          if (!response.data?.success) {
            throw new Error(response.data?.message || 'Erreur assignation');
          }
        } catch (taskError) {
          // En cas d'échec srv-task, essayer via orchestrator si possible
          if (deadlineRouteId) {
            await postDeadlineAction({
              actionId: 'ASSIGN_STAFF_MANUAL',
              ...basePayload(),
              payload: {
                staffId: staff._id || staff.id || staff.staffCode,
                staffName: `${staff.firstName} ${staff.lastName}`,
                staffPhone: staff.phoneNumber || staff.staffPhone,
                timeslotCode,
                adminNote: `Staff assigné (fallback): ${staff.firstName} ${staff.lastName}`
              }
            });
          } else {
            throw taskError;
          }
        }
      }
      onActionSuccess?.(`Staff ${staff.firstName} ${staff.lastName} assigné avec succès`);
    } catch (error) {
      onActionError?.(error.response?.data?.message || error.message);
    } finally {
      setIsExecuting(false);
      setShowStaffModal(false);
    }
  };

  /** Ouvre WhatsApp client directement (sans API) */
  const handleWhatsAppClientDirect = () => {
    if (!guestPhone) {
      onActionError?.('Numéro invité manquant');
      return;
    }
    const digits = String(guestPhone).replace(/\D/g, '');
    if (!digits) {
      onActionError?.('Numéro invalide pour WhatsApp');
      return;
    }
    // Message par défaut selon le type de workflow
    const isArrival = workflow?.category?.includes('arrival');
    const defaultMsg = isArrival ? `Bonjour, c'est pour votre arrivée. Avez-vous choisi votre créneau ?` : `Bonjour, c'est pour votre départ. Avez-vous choisi votre créneau ?`;
    const text = encodeURIComponent(defaultMsg);
    window.open(`https://wa.me/${digits}?text=${text}`, '_blank', 'noopener,noreferrer');
    onActionSuccess?.('WhatsApp client ouvert');
  };
  const primaryActions = [{
    id: 'timeslot',
    icon: '⏰',
    label: 'Choisir créneau',
    bgColor: 'bg-blue-600 hover:bg-blue-700',
    onClick: handleChooseTimeslot
  }, {
    id: 'staff',
    icon: '👤',
    label: 'Choisir staff',
    bgColor: 'bg-purple-600 hover:bg-purple-700',
    onClick: () => setShowStaffModal(true)
  }, {
    id: 'call',
    icon: '📞',
    label: 'Appel mobile client',
    bgColor: 'bg-green-600 hover:bg-green-700',
    onClick: handleCallClient
  }, {
    id: 'whatsappClient',
    icon: '💚',
    label: 'WhatsApp client',
    bgColor: 'bg-teal-600 hover:bg-teal-700',
    onClick: handleWhatsAppClientDirect
  }, {
    id: 'whatsapp',
    icon: '🤖',
    label: 'WhatsApp API Sojori',
    bgColor: 'bg-emerald-600 hover:bg-emerald-700',
    onClick: () => setShowMessageModal('whatsapp')
  }, {
    id: 'ota',
    icon: '🏨',
    label: 'Message OTA',
    bgColor: 'bg-indigo-600 hover:bg-indigo-700',
    onClick: () => setShowMessageModal('ota')
  }, {
    id: 'extend',
    icon: '⏳',
    label: 'Reporter',
    bgColor: 'bg-orange-600 hover:bg-orange-700',
    onClick: () => setShowExtendModal(true)
  }];
  const moreActions = [{
    id: 'resolve',
    icon: '✅',
    label: 'Marquer résolu',
    onClick: handleResolve
  }, {
    id: 'cancel',
    icon: '❌',
    label: 'Annuler',
    onClick: handleCancel
  }];
  return <div className="bg-gray-50 p-3 rounded-lg">
      <div className="mb-3 font-semibold text-xs text-purple-900">🎯 ACTIONS RAPIDES</div>

      {/* Avertissement discret si plan non chargé — n'empêche pas les actions */}
      {!deadlineRouteId && <div className="mb-2 text-[10px] text-amber-700 flex items-center gap-1">
          <span>⚠️</span>
          <span>Plan non chargé — les traces backend seront ignorées pour certaines actions</span>
        </div>}

      {(guestPhone || reservation?.guestEmail || reservation?.guestName) && <div className="mb-2 text-[10px] text-gray-600 flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
          <span className="font-semibold text-gray-700 shrink-0">Invité :</span>
          {reservation?.guestName ? <span className="text-gray-800">{reservation.guestName}</span> : null}
          {guestPhone ? <span className="font-mono text-gray-800">{guestPhone}</span> : <span className="text-amber-700">téléphone manquant</span>}
          {reservation?.guestEmail ? <span className="text-gray-600 break-all">{reservation.guestEmail}</span> : null}
        </div>}

      <div className="flex flex-wrap gap-2 mb-3">
        {/* Premier bouton spécial : Choisir créneau avec sélecteur */}
        <div className="flex items-center gap-1 bg-blue-600 rounded-lg pr-1">
          <button type="button" onClick={handleChooseTimeslot} disabled={isExecuting} className="px-3 py-1.5 bg-transparent hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-semibold rounded-l-lg transition-colors flex items-center gap-1">
            <span>⏰</span>
            <span>Choisir créneau</span>
          </button>
          <select value={selectedHour} onChange={e => setSelectedHour(Number(e.target.value))} className="px-1 py-1 bg-blue-700 text-white border-l border-blue-800 text-xs font-medium rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-400">
            {Array.from({
            length: 24
          }, (_, i) => i).map(h => <option key={h} value={h}>
                {h}h00
              </option>)}
          </select>
        </div>

        {/* Autres boutons — tous actifs */}
        {primaryActions.slice(1).map(action => <button key={action.id} type="button" onClick={action.onClick} disabled={isExecuting || action.disabled} className={`px-3 py-1.5 ${action.bgColor} disabled:bg-gray-300 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1`}>
            <span>{action.icon}</span>
            <span>{action.label}</span>
          </button>)}
      </div>

      <div>
        <button type="button" onClick={() => setShowMoreActions(!showMoreActions)} className="text-xs text-purple-700 hover:text-purple-900 font-medium flex items-center gap-1 mb-2">
          <span>
            {showMoreActions ? '▼' : '▶'} Plus d&apos;actions ({moreActions.length})
          </span>
        </button>

        {showMoreActions && <div className="grid grid-cols-2 gap-1">
            {moreActions.map(action => <button key={action.id} type="button" onClick={action.onClick} disabled={isExecuting} className="px-2 py-1 bg-white hover:bg-gray-100 disabled:bg-gray-100 border border-gray-300 text-gray-700 text-xs font-medium rounded transition-colors flex items-center gap-1 text-left">
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </button>)}
          </div>}
      </div>

      {isExecuting && <div className="flex items-center gap-2 mt-3 text-xs text-gray-600">
          <span className="animate-spin">⏳</span>
          <span>Exécution en cours...</span>
        </div>}

      {/* Modals */}
      <ExtendDeadlineModal show={showExtendModal} onClose={() => setShowExtendModal(false)} onExtend={handleExtendHours} isExecuting={isExecuting} />

      <MessageModal show={showMessageModal !== null} onClose={() => setShowMessageModal(null)} type={showMessageModal} onSend={showMessageModal === 'whatsapp' ? handleWhatsAppSojoriFreeText : handleSendOtaMessage} reservation={reservation} guestPhone={guestPhone} isExecuting={isExecuting} />

      <AssignStaffDialog open={showStaffModal} onClose={() => setShowStaffModal(false)} task={{
      timeslotCode: taskTimeslotCodeForTask(workflow, actions, requestTimeslot),
      type: workflow?.category?.includes('arrival') ? 'arrival' : workflow?.category?.includes('departure') ? 'departure' : workflow?.category?.includes('cleaning') ? 'cleaning' : workflow?.category,
      category: workflow?.category,
      listingId: reservation?.listingId,
      date: workflow?.date || workflow?.startDate || reservation?.checkInDate,
      startTime: workflow?.startTime,
      endTime: workflow?.endTime,
      reservationNumber: reservation?.reservationNumber,
      __reservation: reservation
    }} onSuccess={async assignedStaffInfo => {
      // AssignStaffDialog gère déjà l'assignation via son propre appel API
      // On ferme juste le modal et on notifie le succès
      setShowStaffModal(false);
      onActionSuccess?.(`Staff assigné avec succès`);
      // Rafraîchir le plan si la fonction est fournie
      if (typeof handleCreerTimeslot === 'function') {
        await handleCreerTimeslot();
      }
    }} ownerId={reservation?.ownerId || reservation?.owner?._id} />
    </div>;
};
export default DeadlineChoiceActions;
