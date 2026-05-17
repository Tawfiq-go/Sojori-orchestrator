/**
 * PlanningView.tsx
 * Vue Planning hebdomadaire avec créneaux de 30min
 * Migré depuis sojori-dashboard/src/features/support-team (Planning sub-tab)
 */

import { useState, useEffect } from 'react';
import { tokens as T } from '../dashboard/DashboardV2.components';
import { getSupportAgents, getWeekAvailability, updateAvailability, type SupportAgent } from '../../services/crmService';
import { format, addDays, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

// Generate 48 time slots (00:00 to 23:30)
const generateTimeSlots = () => {
  const slots = [];
  for (let i = 0; i < 48; i++) {
    const hours = Math.floor(i / 2);
    const minutes = i % 2 === 0 ? '00' : '30';
    slots.push(`${String(hours).padStart(2, '0')}:${minutes}`);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const SLOT_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  available: { label: 'Disponible', color: '#fff', bgColor: '#10B981' },
  booked: { label: 'Réservé', color: '#fff', bgColor: '#F59E0B' },
  unavailable: { label: 'Indisponible', color: '#9CA3AF', bgColor: '#E5E7EB' },
};

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
  status: 'available' | 'booked' | 'unavailable';
  slotIndex: number;
  date: string;
}

// ════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════

export function PlanningView() {
  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 0 })); // Sunday

  // Load agents on mount
  useEffect(() => {
    loadAgents();
  }, []);

  // Load slots when agent or date changes
  useEffect(() => {
    if (selectedAgentId) {
      loadSlots();
    }
  }, [selectedAgentId, selectedDate]);

  const loadAgents = async () => {
    try {
      const response = await getSupportAgents();
      if (response.success && response.data.length > 0) {
        setAgents(response.data);
        // Auto-select first agent
        const firstAgentId = response.data[0]._id || (response.data[0] as any).id;
        setSelectedAgentId(firstAgentId);
      }
    } catch (error) {
      console.error('[PlanningView] Error loading agents:', error);
    }
  };

  const loadSlots = async () => {
    if (!selectedAgentId) return;

    setLoading(true);
    console.log('[PlanningView] 🔄 Loading slots for agent:', selectedAgentId, 'date:', selectedDate);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await getWeekAvailability({
        agentId: selectedAgentId,
        startDate: dateStr,
      });
      console.log('[PlanningView] 📥 Slots response:', response);

      if (response.success) {
        // Filter slots for selected date only
        const daySlots = (response.data.slots || []).filter((slot: any) => {
          const slotDate = slot.date || format(new Date(slot.startTime), 'yyyy-MM-dd');
          return slotDate === dateStr;
        });
        setSlots(daySlots);
      }
    } catch (error) {
      console.error('[PlanningView] ❌ Error loading slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotClick = async (slot: Slot) => {
    // Can't change booked slots
    if (slot.status === 'booked') {
      alert('Ce créneau est réservé et ne peut pas être modifié');
      return;
    }

    const newStatus = slot.status === 'available' ? 'unavailable' : 'available';

    try {
      // Update via API (implementation depends on backend)
      // For now, just update locally
      setSlots((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, status: newStatus as 'available' | 'unavailable' } : s)),
      );

      // TODO: Call API to persist change
      // await updateAvailability({ agentId: selectedAgentId, date: slot.date, timeSlots: [...] });
    } catch (error) {
      console.error('[PlanningView] Error updating slot:', error);
      // Revert on error
      loadSlots();
    }
  };

  const getSlotColor = (status: string) => {
    return SLOT_STATUS_CONFIG[status]?.bgColor || SLOT_STATUS_CONFIG.unavailable.bgColor;
  };

  const getSlotTextColor = (status: string) => {
    return SLOT_STATUS_CONFIG[status]?.color || SLOT_STATUS_CONFIG.unavailable.color;
  };

  const generateWeekDays = (start: Date) => {
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  const currentWeekDays = generateWeekDays(weekStart);
  const nextWeekDays = generateWeekDays(addDays(weekStart, 7));

  const selectedAgent = agents.find((a) => (a._id || (a as any).id) === selectedAgentId);

  return (
    <div>
      {/* Agent selector */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          background: T.bg2,
          borderRadius: 8,
        }}
      >
        <label style={{ fontSize: 11, fontWeight: 700, color: T.text3, display: 'block', marginBottom: 6 }}>
          {selectedAgent ? (selectedAgent._id || (selectedAgent as any).id) : 'Sélectionner un agent'}
        </label>
        <select
          value={selectedAgentId}
          onChange={(e) => setSelectedAgentId(e.target.value)}
          style={{
            width: '100%',
            maxWidth: 300,
            padding: '8px 12px',
            borderRadius: 6,
            border: `1px solid ${T.border}`,
            background: T.bg1,
            color: T.text,
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        >
          <option value="">Choisir un agent</option>
          {agents.map((agent) => {
            const agentId = agent._id || (agent as any).id;
            return (
              <option key={agentId} value={agentId}>
                {agent.firstName} {agent.lastName} ({agent.email})
              </option>
            );
          })}
        </select>
      </div>

      {!selectedAgentId && (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            color: T.text3,
          }}
        >
          Sélectionnez un agent pour voir son planning
        </div>
      )}

      {selectedAgentId && (
        <>
          {/* Week navigation */}
          <div
            style={{
              marginBottom: 16,
              padding: '10px 12px',
              background: T.bg2,
              borderRadius: 8,
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: '0 0 12px' }}>Semaine en cours</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {currentWeekDays.map((day) => {
                const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: `2px solid ${isSelected ? T.primary : T.border}`,
                      background: isSelected ? T.primaryTint : T.bg1,
                      color: isSelected ? T.primary : T.text,
                      fontSize: 12,
                      fontWeight: isSelected ? 700 : 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      minWidth: 90,
                    }}
                  >
                    <div style={{ fontSize: 11, color: isSelected ? T.primary : T.text3 }}>
                      {format(day, 'EEEE', { locale: fr })}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{format(day, 'd', { locale: fr })}</div>
                  </button>
                );
              })}
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: '12px 0' }}>Semaine suivante</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {nextWeekDays.map((day) => {
                const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: `2px solid ${isSelected ? T.primary : T.border}`,
                      background: isSelected ? T.primaryTint : T.bg1,
                      color: isSelected ? T.primary : T.text,
                      fontSize: 12,
                      fontWeight: isSelected ? 700 : 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      minWidth: 90,
                    }}
                  >
                    <div style={{ fontSize: 11, color: isSelected ? T.primary : T.text3 }}>
                      {format(day, 'EEEE', { locale: fr })}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{format(day, 'd', { locale: fr })}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slots for selected date */}
          <div
            style={{
              padding: 16,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              background: T.bg1,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: '0 0 12px' }}>
              Créneaux pour le {format(selectedDate, 'EEEE d MMMM', { locale: fr })}
            </h3>

            <div
              style={{
                marginBottom: 16,
                padding: '10px 12px',
                background: '#EFF6FF',
                borderRadius: 6,
                fontSize: 12,
                color: '#1E40AF',
              }}
            >
              💡 Cliquez sur un créneau pour le rendre disponible/indisponible
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 12 }}>
              {Object.entries(SLOT_STATUS_CONFIG).map(([status, config]) => (
                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: config.bgColor,
                    }}
                  />
                  <span style={{ color: T.text2 }}>{config.label}</span>
                </div>
              ))}
            </div>

            {loading && (
              <div style={{ padding: 40, textAlign: 'center', color: T.text3 }}>Chargement des créneaux...</div>
            )}

            {!loading && slots.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: T.text3 }}>
                Aucun créneau généré pour ce jour
              </div>
            )}

            {!loading && slots.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                  gap: 8,
                }}
              >
                {slots
                  .sort((a, b) => a.slotIndex - b.slotIndex)
                  .map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => handleSlotClick(slot)}
                      disabled={slot.status === 'booked'}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 6,
                        border: `1px solid ${slot.status === 'booked' ? '#F59E0B' : T.border}`,
                        background: getSlotColor(slot.status),
                        color: getSlotTextColor(slot.status),
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: slot.status === 'booked' ? 'not-allowed' : 'pointer',
                        fontFamily: '"Geist Mono", monospace',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (slot.status !== 'booked') {
                          e.currentTarget.style.opacity = '0.8';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      title={`${slot.startTime} - ${SLOT_STATUS_CONFIG[slot.status]?.label}`}
                    >
                      {slot.startTime}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
