import React, { useState } from 'react';
import { Chip, IconButton, Tooltip, CircularProgress } from '@mui/material';
import { PlayArrow as PlayIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { API_BASE_URL } from '../../../config/backendServer.config';
const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryPale: '#FFF3E0'
};
const STATUS_CONFIG = {
  active: {
    label: '⚡ Active',
    color: '#4CAF50',
    bgColor: '#E8F5E9'
  },
  processing: {
    label: '🔄 Processing',
    color: '#FF9800',
    bgColor: '#FFF3E0'
  },
  completed: {
    label: '✅ Completed',
    color: '#2196F3',
    bgColor: '#E3F2FD'
  },
  error: {
    label: '❌ Error',
    color: '#F44336',
    bgColor: '#FFEBEE'
  },
  failed: {
    label: '❌ Failed',
    color: '#F44336',
    bgColor: '#FFEBEE'
  },
  paused: {
    label: '⏸️ Paused',
    color: '#9E9E9E',
    bgColor: '#F5F5F5'
  }
};
const ReservationCard = ({
  reservation,
  selected,
  onClick
}) => {
  const statusConfig = STATUS_CONFIG[reservation.orchestrationStatus] || STATUS_CONFIG.active;
  const [isExecuting, setIsExecuting] = useState(false);

  // Use eventCounts from API response
  const completedEvents = reservation.eventCounts?.executed || 0;
  const totalEvents = reservation.eventCounts?.total || 0;
  const progress = totalEvents > 0 ? completedEvents / totalEvents * 100 : 0;
  const pendingEvents = reservation.eventCounts?.pending || 0;

  // Format date safely
  const formatDate = dateStr => {
    if (!dateStr) return 'N/A';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy', {
        locale: fr
      });
    } catch {
      return 'N/A';
    }
  };
  const handleForceExecuteAll = async e => {
    e.stopPropagation();
    if (!window.confirm(`Forcer l'exécution de ${pendingEvents} événement(s) pending pour ${reservation.reservationNumber}?`)) {
      return;
    }
    try {
      setIsExecuting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/v1/orchestrator/reservations/${reservation.reservationNumber}/execute-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        alert(`✅ Exécution réussie!\n\n${data.message}\n\nRechargez la page pour voir les changements.`);
        window.location.reload();
      } else {
        alert(`❌ Erreur: ${data.error || 'Échec de l\'exécution'}`);
      }
    } catch (error) {
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setIsExecuting(false);
    }
  };
  return <div onClick={onClick} className={`
        flex-shrink-0 w-[140px] p-2 rounded-lg border cursor-pointer transition-all
        ${selected ? 'bg-gradient-to-r from-[#FFF3E0] to-white border-[#E6B022] border-l-4' : 'border-slate-200 hover:bg-slate-50'}
      `}>
      {/* Header ultra compact */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="font-bold text-xs text-slate-900 truncate">
          {reservation.reservationNumber}
        </span>
        <Chip label={statusConfig.label} size="small" sx={{
        bgcolor: statusConfig.bgColor,
        color: statusConfig.color,
        fontWeight: 600,
        fontSize: '9px',
        height: '16px',
        minWidth: 'auto',
        '& .MuiChip-label': {
          px: 0.5
        }
      }} />
      </div>

      {/* Info ultra compacte */}
      <div className="text-[10px] text-slate-600 space-y-0.5">
        {reservation.listingName && <div className="font-medium text-slate-700 truncate">{reservation.listingName}</div>}
        {reservation.guestName && <div className="text-slate-600 truncate">👤 {reservation.guestName}</div>}
        {reservation.arrivalDate && reservation.departureDate && <div className="flex items-center gap-1 text-slate-600 truncate">
            <span>📅</span>
            <span className="truncate">
              {format(new Date(reservation.arrivalDate), 'dd MMM', {
            locale: fr
          })} → {format(new Date(reservation.departureDate), 'dd MMM', {
            locale: fr
          })}
            </span>
          </div>}
        <div className="flex items-center gap-1 text-[9px] text-slate-500">
          <span className="font-semibold text-[#E6B022]">{completedEvents}/{totalEvents}</span>
          <span>⏳ {reservation.nights ?? reservation.numberOfNights ?? '—'}</span>
          {pendingEvents > 0 && <Tooltip title={`Forcer l'exécution de ${pendingEvents} événement(s)`}>
              <IconButton size="small" onClick={handleForceExecuteAll} disabled={isExecuting} sx={{
            backgroundColor: '#10B981',
            color: 'white',
            width: 18,
            height: 18,
            minWidth: 18,
            '& .MuiSvgIcon-root': {
              fontSize: 10
            },
            '&:hover': {
              backgroundColor: '#059669'
            },
            '&:disabled': {
              backgroundColor: '#D1D5DB'
            }
          }}>
                {isExecuting ? <CircularProgress size={10} sx={{
              color: 'white'
            }} /> : <PlayIcon sx={{
              fontSize: 10
            }} />}
              </IconButton>
            </Tooltip>}
        </div>
      </div>

      {/* Progress bar fin */}
      <div className="mt-1">
        <div className="h-0.5 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#E6B022] to-[#B8881A] transition-all duration-500" style={{
          width: `${progress}%`
        }} />
        </div>
      </div>
    </div>;
};
export default ReservationCard;
