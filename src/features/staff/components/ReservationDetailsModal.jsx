import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Chip,
  Typography,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

// Couleurs Sojori
const SOJORI_COLORS = {
  primary: '#E6B022',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
};

// Helper function to format dates
const formatDate = (date) => {
  if (!date) return 'N/A';
  const options = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  };
  return new Intl.DateTimeFormat('fr-FR', options).format(new Date(date));
};

const ReservationDetailsModal = ({ open, onClose, reservation }) => {
  if (!reservation) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          height: '75vh',
          maxHeight: '75vh',
          borderRadius: '12px',
        }
      }}
    >
      {/* Header - Compact */}
      <DialogTitle className="!bg-gradient-to-r !from-blue-50 !to-cyan-50 !border-b !border-gray-200" sx={{ py: 1.5, px: 2 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white rounded-full p-1.5">
              <WhatsAppIcon sx={{ fontSize: 18 }} />
            </div>
            <div>
              <div className="font-bold text-sm text-gray-800">
                Réservation #{reservation.reservationNumber}
              </div>
            </div>
          </div>
          <IconButton onClick={onClose} size="small">
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </div>
      </DialogTitle>

      {/* Content with scroll - Compact */}
      <DialogContent
        sx={{
          p: 0,
          overflow: 'auto',
          height: 'calc(75vh - 70px)',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#f1f1f1',
            borderRadius: '10px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#888',
            borderRadius: '10px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#555',
          },
        }}
      >
        <div className="p-3 space-y-2">
          {/* Info Base - Grid Compact 2 colonnes */}
          <div className="bg-blue-50 rounded-lg p-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <div className="col-span-2">
              <span className="text-gray-600">Invité:</span>
              <span className="ml-2 font-semibold text-gray-900">{reservation.guestName || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Canal:</span>
              <span className="ml-1 font-semibold text-gray-900">{reservation.channelName || reservation.source || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Statut:</span>
              <span className="ml-1 font-semibold text-gray-900">{reservation.status || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Arrivée:</span>
              <span className="ml-1 font-semibold text-gray-900">
                {reservation.arrivalDate ? new Date(reservation.arrivalDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Départ:</span>
              <span className="ml-1 font-semibold text-gray-900">
                {reservation.departureDate ? new Date(reservation.departureDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Type:</span>
              <span className="ml-1 font-semibold text-gray-900">{reservation.type || 'N/A'}</span>
            </div>
          </div>

          <Divider className="!my-2" />

          {/* Section WhatsApp - Compact */}
          {reservation.whatsapp_config?.menu_options && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-1.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <WhatsAppIcon style={{ color: '#25D366', fontSize: 16 }} />
                  <Typography variant="caption" className="!font-semibold" style={{ fontSize: '0.75rem' }}>
                    WhatsApp Config - {reservation.whatsapp_config.menu_options_count} options
                  </Typography>
                </div>
              </div>

              <div className="space-y-2">
                {reservation.whatsapp_config.menu_options.map((service, index) => {
                  // Calculate service dates
                  const calculateServiceDates = (startCondition, endCondition, arrivalDate, departureDate) => {
                    if (!arrivalDate) return { startDate: null, endDate: null };

                    const parseCondition = (condition, checkInDate, checkOutDate) => {
                      if (!condition) return null;

                      const match = condition.match(/(\d+)\s+(days?|hours?)\s+(before|after)\s+(check-in|check-out)/i);
                      if (!match) {
                        if (condition.includes('on check-in day')) return new Date(checkInDate);
                        if (condition.includes('on check-out day')) return checkOutDate ? new Date(checkOutDate) : null;
                        return null;
                      }

                      const [, value, unit, beforeAfter, reference] = match;
                      const numValue = parseInt(value);
                      const isNegative = beforeAfter.toLowerCase() === 'before';
                      const referenceDate = reference.toLowerCase() === 'check-in'
                        ? new Date(checkInDate)
                        : (checkOutDate ? new Date(checkOutDate) : null);

                      if (!referenceDate) return null;

                      const result = new Date(referenceDate);
                      if (unit.toLowerCase().startsWith('day')) {
                        result.setDate(result.getDate() + (isNegative ? -numValue : numValue));
                      } else if (unit.toLowerCase().startsWith('hour')) {
                        result.setHours(result.getHours() + (isNegative ? -numValue : numValue));
                      }

                      return result;
                    };

                    return {
                      startDate: parseCondition(startCondition, arrivalDate, departureDate),
                      endDate: parseCondition(endCondition, arrivalDate, departureDate)
                    };
                  };

                  const { startDate, endDate } = calculateServiceDates(
                    service.start_condition,
                    service.end_condition,
                    reservation.arrivalDate,
                    reservation.departureDate
                  );

                  const now = new Date();
                  const departureDate = reservation.departureDate ? new Date(reservation.departureDate) : null;
                  const effectiveEndDate = endDate || departureDate;

                  // Vérifier si les événements requis sont complétés
                  const checkEventCompleted = (requires) => {
                    if (!requires) return true;
                    const eventsCompleted = reservation.events_completed || {};
                    const checkinStatus = reservation.checkin_status || {};
                    const eventToCheck = requires === 'E_completed' ? 'online_checkin_completed' : requires;
                    if (eventToCheck === 'online_checkin_completed') {
                      return checkinStatus.registration_complete === true;
                    }
                    return eventsCompleted[eventToCheck] === true;
                  };

                  const requiresField = service.requires || service.availability_requires || service.availability?.requires;
                  const isEventCompleted = checkEventCompleted(requiresField);

                  const isInTimeWindow = startDate
                    ? (effectiveEndDate && now >= startDate && now <= effectiveEndDate)
                    : (effectiveEndDate && now <= effectiveEndDate);

                  const isBlockedByCondition = requiresField && !isEventCompleted && isInTimeWindow;
                  const isActive = isInTimeWindow && isEventCompleted;
                  const isPending = startDate && now < startDate;
                  const isExpired = effectiveEndDate && now > effectiveEndDate;

                  return (
                    <div
                      key={index}
                      className={`border rounded p-2 ${
                        service.enabled
                          ? isActive
                            ? 'border-green-300 bg-green-50'
                            : isBlockedByCondition
                            ? 'border-orange-300 bg-orange-50'
                            : isPending
                            ? 'border-yellow-300 bg-yellow-50'
                            : 'border-gray-300 bg-gray-50'
                          : 'border-gray-200 bg-gray-100'
                      }`}
                    >
                      {/* Service Header - Compact */}
                      <div className="flex items-start justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{service.icon || '📱'}</span>
                          <div>
                            <div className="font-semibold text-gray-900 text-xs">
                              {service.service_name || 'Service'}
                            </div>
                            {service.enabled && (
                              <div className="flex items-center gap-1 mt-0.5">
                                {isActive && (
                                  <span className="text-[0.65rem] bg-green-600 text-white px-1.5 py-0.5 rounded font-medium">
                                    🟢 Actif
                                  </span>
                                )}
                                {isBlockedByCondition && (
                                  <span className="text-[0.65rem] bg-orange-600 text-white px-1.5 py-0.5 rounded font-medium">
                                    🔒 Bloqué
                                  </span>
                                )}
                                {isPending && !isBlockedByCondition && (
                                  <span className="text-[0.65rem] bg-yellow-600 text-white px-1.5 py-0.5 rounded font-medium">
                                    ⏳ Attente
                                  </span>
                                )}
                                {isExpired && (
                                  <span className="text-[0.65rem] bg-gray-500 text-white px-1.5 py-0.5 rounded font-medium">
                                    ⏹️ Expiré
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          {service.enabled ? (
                            <CheckCircleIcon sx={{ fontSize: 16 }} className="text-green-600" />
                          ) : (
                            <CancelIcon sx={{ fontSize: 16 }} className="text-gray-400" />
                          )}
                        </div>
                      </div>

                      {/* Service Details - Compact */}
                      {service.enabled && (
                        <div className="space-y-1 mt-1.5 pt-1.5 border-t border-gray-200">
                          {/* Conditions - Ultra compact */}
                          <div className="text-[0.65rem] text-gray-600">
                            {service.start_condition || 'N/A'} → {service.end_condition || 'N/A'}
                            {(service.requires || service.availability_requires || service.availability?.requires) && (
                              <span className="text-purple-700 font-semibold ml-2">
                                | {service.requires || service.availability_requires || service.availability?.requires}
                              </span>
                            )}
                          </div>

                          {/* Calculated Dates - Grid compact */}
                          <div className="bg-white border border-gray-200 rounded p-1.5">
                            <div className="text-[0.65rem] font-semibold text-gray-700 mb-1">
                              📆 Dates:
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 text-[0.65rem]">
                              <div>
                                <span className="text-green-700">🟢</span>
                                <span className={`ml-1 ${isPending ? 'font-bold text-yellow-700' : 'text-gray-900'}`}>
                                  {startDate ? new Date(startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="text-red-700">🔴</span>
                                <span className="ml-1 text-gray-900">
                                  {(endDate || reservation.departureDate) ? new Date(endDate || reservation.departureDate).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {!service.enabled && (
                        <div className="text-[0.65rem] text-gray-500 italic">Désactivé</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationDetailsModal;
