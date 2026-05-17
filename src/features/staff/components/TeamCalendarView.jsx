import React, { useState } from 'react';
import { Button, IconButton, Tooltip, Chip, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, TextField, ToggleButtonGroup, ToggleButton, Checkbox } from '@mui/material';
import { ChevronLeft, ChevronRight, Calendar, Clock, Copy, Download, Filter, Users, Plus, Trash2, Edit2, TrendingUp, AlertTriangle, Check, X as CloseIcon, CalendarDays, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryLight: '#FF8F6B',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827'
  }
};
const HOURS = Array.from({
  length: 17
}, (_, i) => i + 7); // 7h-23h

/**
 * Team-wide calendar view - Option C
 * Shows all staff members in a weekly grid with inline editing
 */
const TeamCalendarView = ({
  staff = [],
  onUpdateStaff,
  onBulkUpdate,
  onSaveAll
}) => {
  const {
    t
  } = useTranslation('common');
  const [currentWeek, setCurrentWeek] = useState(0); // 0 = current week
  const [selectedCell, setSelectedCell] = useState(null);
  const [quickAddDialog, setQuickAddDialog] = useState(false);
  const [quickAddData, setQuickAddData] = useState({
    start: 9,
    end: 17
  });
  const [viewMode, setViewMode] = useState('week'); // week | month
  const [filterMenu, setFilterMenu] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState([]); // IDs of selected staff
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [addMode, setAddMode] = useState('simple'); // 'simple', 'template', 'hourly'
  const [selectedHours, setSelectedHours] = useState([]); // For hourly mode

  // Debug: Log staff data to verify subType
  React.useEffect(() => {
    if (staff.length > 0) {}
  }, [staff]);

  // Mock data for demo - replace with real data
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Calculate week stats
  const getWeekStats = () => {
    let totalHours = 0;
    let totalStaff = staff.length;
    let activeStaff = 0;
    staff.forEach(member => {
      if (member?.staffPlanning?.schedule) {
        const memberHours = member.staffPlanning.schedule.reduce((sum, day) => {
          if (day.present && day.timings) {
            return sum + day.timings.reduce((s, t) => s + (t.end - t.start), 0);
          }
          return sum;
        }, 0);
        if (memberHours > 0) activeStaff++;
        totalHours += memberHours;
      }
    });
    return {
      totalHours,
      totalStaff,
      activeStaff,
      avgHoursPerStaff: totalStaff > 0 ? Math.round(totalHours / totalStaff) : 0
    };
  };
  const stats = getWeekStats();

  // Get schedule for specific staff member and day
  const getScheduleForDay = (staffMember, dayName) => {
    if (!staffMember?.staffPlanning?.schedule) return null;
    return staffMember.staffPlanning.schedule.find(s => s.day.toLowerCase() === dayName.toLowerCase());
  };

  // Calculate hours for a specific day
  const calculateDayHours = schedule => {
    if (!schedule?.timings) return 0;
    return schedule.timings.reduce((sum, t) => sum + (t.end - t.start), 0);
  };

  // Hours for hourly selection (7am to 11pm)
  const HOURS = Array.from({
    length: 17
  }, (_, i) => i + 7); // 7 to 23

  // Handle cell click
  const handleCellClick = (staffMember, dayName) => {
    setSelectedCell({
      staffMember,
      dayName
    });
    setQuickAddDialog(true);
    setAddMode('simple');
    setSelectedHours([]);

    // Always start with default values for adding a new timing
    setQuickAddData({
      start: 9,
      end: 17
    });
  };

  // Delete a specific timing from a day
  const handleDeleteTiming = (staffMember, dayName, timingIndex) => {
    const newSchedule = [...(staffMember?.staffPlanning?.schedule || [])];
    const dayIndex = newSchedule.findIndex(s => s.day.toLowerCase() === dayName.toLowerCase());
    if (dayIndex !== -1) {
      const updatedTimings = newSchedule[dayIndex].timings.filter((_, idx) => idx !== timingIndex);
      newSchedule[dayIndex] = {
        ...newSchedule[dayIndex],
        present: updatedTimings.length > 0,
        timings: updatedTimings
      };
      if (onUpdateStaff) {
        onUpdateStaff(staffMember._id, {
          schedule: newSchedule
        });
      }
      setHasUnsavedChanges(true);
      toast.success('Créneau supprimé');
    }
  };

  // Toggle hour selection in hourly mode
  const toggleHourSelection = hour => {
    setSelectedHours(prev => {
      if (prev.includes(hour)) {
        return prev.filter(h => h !== hour);
      } else {
        return [...prev, hour].sort((a, b) => a - b);
      }
    });
  };

  // Apply template in dialog
  const applyTemplateToDialog = templateName => {
    switch (templateName) {
      case '9-17':
        setQuickAddData({
          start: 9,
          end: 17
        });
        setSelectedHours(Array.from({
          length: 8
        }, (_, i) => i + 9)); // 9-16
        break;
      case '8-16':
        setQuickAddData({
          start: 8,
          end: 16
        });
        setSelectedHours(Array.from({
          length: 8
        }, (_, i) => i + 8)); // 8-15
        break;
      case '10-18':
        setQuickAddData({
          start: 10,
          end: 18
        });
        setSelectedHours(Array.from({
          length: 8
        }, (_, i) => i + 10)); // 10-17
        break;
      case '14-22':
        setQuickAddData({
          start: 14,
          end: 22
        });
        setSelectedHours(Array.from({
          length: 8
        }, (_, i) => i + 14)); // 14-21
        break;
      default:
        break;
    }
  };

  // Group consecutive hours into separate timings
  const groupConsecutiveHours = hours => {
    if (hours.length === 0) return [];
    const sortedHours = [...hours].sort((a, b) => a - b);
    const groups = [];
    let currentGroup = [sortedHours[0]];
    for (let i = 1; i < sortedHours.length; i++) {
      if (sortedHours[i] === sortedHours[i - 1] + 1) {
        // Consecutive hour, add to current group
        currentGroup.push(sortedHours[i]);
      } else {
        // Gap detected, start new group
        groups.push(currentGroup);
        currentGroup = [sortedHours[i]];
      }
    }

    // Add last group
    groups.push(currentGroup);

    // Convert groups to timings (start, end)
    return groups.map(group => ({
      start: Math.min(...group),
      end: Math.max(...group) + 1
    }));
  };

  // Handle quick add
  const handleQuickAdd = () => {
    if (!selectedCell) return;
    const {
      staffMember,
      dayName
    } = selectedCell;

    // Determine timings based on mode
    let newTimings = [];
    if (addMode === 'hourly' && selectedHours.length > 0) {
      // Create multiple timings from consecutive hours
      newTimings = groupConsecutiveHours(selectedHours);
    } else {
      // Simple mode or template mode: one timing
      const start = quickAddData.start;
      const end = quickAddData.end;

      // Validation
      if (start >= end) {
        toast.error('L\'heure de fin doit être après l\'heure de début');
        return;
      }
      newTimings = [{
        start,
        end
      }];
    }

    // Create or update schedule
    const newSchedule = staffMember?.staffPlanning?.schedule || daysOfWeek.map(day => ({
      day,
      present: false,
      timings: []
    }));
    const dayIndex = newSchedule.findIndex(s => s.day.toLowerCase() === dayName.toLowerCase());
    if (dayIndex !== -1) {
      // Get existing timings for this day
      const existingTimings = newSchedule[dayIndex].timings || [];

      // Check for overlapping timings
      const hasOverlap = newTimings.some(newTiming => existingTimings.some(timing => newTiming.start >= timing.start && newTiming.start < timing.end || newTiming.end > timing.start && newTiming.end <= timing.end || newTiming.start <= timing.start && newTiming.end >= timing.end));
      if (hasOverlap) {
        toast.warning('Certains créneaux chevauchent des créneaux existants. Ils seront quand même ajoutés.');
      }

      // Add new timings to existing timings and sort by start time
      const updatedTimings = [...existingTimings, ...newTimings].sort((a, b) => a.start - b.start);
      newSchedule[dayIndex] = {
        ...newSchedule[dayIndex],
        present: true,
        timings: updatedTimings
      };
    }

    // Call update callback with correct format
    if (onUpdateStaff) {
      onUpdateStaff(staffMember._id, {
        schedule: newSchedule
      });
    }
    setHasUnsavedChanges(true);
    const timingCount = newTimings.length;
    toast.success(t(`${timingCount} créneau${timingCount > 1 ? 'x' : ''} ajouté${timingCount > 1 ? 's' : ''} avec succès`));
    setQuickAddDialog(false);
    setSelectedCell(null);
    setSelectedHours([]);
  };

  // Toggle staff selection
  const toggleStaffSelection = staffId => {
    setSelectedStaff(prev => prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]);
  };

  // Select all staff
  const selectAllStaff = () => {
    if (selectedStaff.length === staff.length) {
      setSelectedStaff([]);
    } else {
      setSelectedStaff(staff.map(s => s._id));
    }
  };

  // Handle bulk template application
  const applyTemplate = templateName => {
    let template = [];
    switch (templateName) {
      case '9-17-weekdays':
        template = daysOfWeek.map((day, idx) => ({
          day,
          present: idx < 5,
          timings: idx < 5 ? [{
            start: 9,
            end: 17
          }] : []
        }));
        break;
      case '8-16-weekdays':
        template = daysOfWeek.map((day, idx) => ({
          day,
          present: idx < 5,
          timings: idx < 5 ? [{
            start: 8,
            end: 16
          }] : []
        }));
        break;
      case '10-18-everyday':
        template = daysOfWeek.map(day => ({
          day,
          present: true,
          timings: [{
            start: 10,
            end: 18
          }]
        }));
        break;
      default:
        return;
    }

    // Apply to selected staff or all if none selected
    const targetStaff = selectedStaff.length > 0 ? selectedStaff : staff.map(s => s._id);
    targetStaff.forEach(staffId => {
      if (onUpdateStaff) {
        onUpdateStaff(staffId, {
          schedule: template
        });
      }
    });
    setHasUnsavedChanges(true);
    const count = targetStaff.length;
    toast.success(`Template appliqué à ${count} membre${count > 1 ? 's' : ''}`);
  };

  // Save all changes
  const handleSaveAll = async () => {
    if (onSaveAll) {
      try {
        await onSaveAll(staff);
        setHasUnsavedChanges(false);
        toast.success('Toutes les modifications ont été enregistrées');
      } catch (error) {
        toast.error('Erreur lors de l\'enregistrement');
      }
    } else {
      // Fallback: just clear the unsaved flag
      setHasUnsavedChanges(false);
      toast.success('Modifications enregistrées localement');
    }
  };
  return <div className="w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header - Modern & Clean */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Title & Stats Combined */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{t('Planning Équipe')}</h2>
                <div className="flex items-center gap-3 text-sm text-white/90 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {stats.activeStaff}/{stats.totalStaff}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {stats.totalHours}h total
                  </span>
                  <span>•</span>
                  <span>{stats.avgHoursPerStaff}h/pers</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Save Button - Modern */}
            {hasUnsavedChanges && <Button onClick={handleSaveAll} startIcon={<Save className="w-4 h-4" />} sx={{
            backgroundColor: 'white',
            color: SOJORI_COLORS.primary,
            fontWeight: 600,
            fontSize: '13px',
            padding: '8px 20px',
            borderRadius: '10px',
            textTransform: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            '&:hover': {
              backgroundColor: '#FFF',
              boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
              transform: 'translateY(-1px)'
            },
            transition: 'all 0.2s ease'
          }}>
                Enregistrer les modifications
              </Button>}

            {/* Week Navigation - Modern */}
            <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-xl px-2 py-1.5 shadow-lg">
              <IconButton size="small" onClick={() => setCurrentWeek(currentWeek - 1)} sx={{
              color: 'white',
              padding: '6px',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.2)'
              }
            }}>
                <ChevronLeft className="w-4 h-4" />
              </IconButton>
              <span className="text-white font-semibold px-3 text-sm">
                {currentWeek === 0 ? 'Semaine actuelle' : `Semaine ${currentWeek > 0 ? '+' : ''}${currentWeek}`}
              </span>
              <IconButton size="small" onClick={() => setCurrentWeek(currentWeek + 1)} sx={{
              color: 'white',
              padding: '6px',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.2)'
              }
            }}>
                <ChevronRight className="w-4 h-4" />
              </IconButton>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar - Modern & Clean */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b-2 border-gray-100 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Selection Info */}
            {selectedStaff.length > 0 && <Chip label={`${selectedStaff.length} membre${selectedStaff.length > 1 ? 's' : ''} sélectionné${selectedStaff.length > 1 ? 's' : ''}`} size="medium" onDelete={() => setSelectedStaff([])} icon={<Check className="w-4 h-4" />} sx={{
            height: '32px',
            background: 'linear-gradient(135deg, #FF6B35 0%, #E55A2B 100%)',
            color: 'white',
            fontWeight: 600,
            fontSize: '13px',
            paddingX: '12px',
            boxShadow: '0 2px 8px rgba(255,107,53,0.3)',
            '& .MuiChip-icon': {
              color: 'white'
            },
            '& .MuiChip-deleteIcon': {
              color: 'white',
              fontSize: '18px',
              '&:hover': {
                color: 'rgba(255,255,255,0.8)'
              }
            }
          }} />}

            {/* Quick Templates - Modern */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-semibold">Templates rapides:</span>
              {[{
              label: '9h - 17h',
              value: '9-17',
              color: SOJORI_COLORS.primary,
              bg: '#FFF5F2'
            }, {
              label: '8h - 16h',
              value: '8-16',
              color: SOJORI_COLORS.info,
              bg: '#EFF6FF'
            }, {
              label: '10h - 18h',
              value: '10-18',
              color: SOJORI_COLORS.success,
              bg: '#F0FDF4'
            }].map((template, idx) => <Button key={template.value} size="small" variant="outlined" onClick={() => applyTemplate(template.value === '9-17' ? '9-17-weekdays' : template.value === '8-16' ? '8-16-weekdays' : '10-18-everyday')} sx={{
              borderColor: template.color,
              color: template.color,
              fontSize: '12px',
              padding: '6px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              textTransform: 'none',
              minWidth: 'auto',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: template.bg,
                borderWidth: '2px',
                transform: 'translateY(-1px)',
                boxShadow: `0 4px 12px ${template.color}30`
              }
            }}>
                  {template.label}
                </Button>)}
            </div>
          </div>

          {selectedStaff.length > 0 && <span className="text-sm text-gray-500 font-medium">
              Les templates seront appliqués aux membres sélectionnés
            </span>}
        </div>
      </div>

      {/* Calendar Grid - Modern & Spacious */}
      <div className="overflow-x-auto overflow-y-auto" style={{
      maxHeight: 'calc(100vh - 240px)'
    }}>
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-white z-10 shadow-sm">
            <tr>
              {/* Staff column header - Modern */}
              <th className="sticky left-0 bg-white z-20 px-4 py-3 text-left border-b-2 border-r-2 border-gray-200">
                <div className="flex items-center gap-2">
                  <Checkbox checked={selectedStaff.length === staff.length && staff.length > 0} indeterminate={selectedStaff.length > 0 && selectedStaff.length < staff.length} onChange={selectAllStaff} size="small" sx={{
                  padding: '4px',
                  '& .MuiSvgIcon-root': {
                    fontSize: 20
                  },
                  color: SOJORI_COLORS.primary,
                  '&.Mui-checked': {
                    color: SOJORI_COLORS.primary
                  },
                  '&.MuiCheckbox-indeterminate': {
                    color: SOJORI_COLORS.primary
                  }
                }} />
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-md">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-bold text-gray-800">
                    Membres ({staff.length})
                  </span>
                </div>
              </th>

              {/* Day columns - Modern */}
              {daysOfWeek.map((day, idx) => <th key={day} className="px-3 py-3 text-center border-b-2 border-r border-gray-200 bg-gray-50" style={{
              minWidth: '140px'
            }}>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-bold text-gray-800">
                      {t(day)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {t(day.substring(0, 3)).toUpperCase()}
                    </span>
                  </div>
                </th>)}

              {/* Total column - Modern */}
              <th className="px-4 py-3 text-center border-b-2 border-gray-200 bg-gradient-to-br from-orange-50 to-orange-100">
                <div className="flex flex-col items-center gap-1">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-bold text-orange-600">Total</span>
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            {staff.length === 0 ? <tr>
                <td colSpan={daysOfWeek.length + 2} className="p-8 text-center">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Users className="w-12 h-12" />
                    <p className="text-sm">Aucun membre d&apos;équipe trouvé</p>
                  </div>
                </td>
              </tr> : staff.map((member, memberIdx) => {
            const weeklyHours = member?.staffPlanning?.schedule ? member.staffPlanning.schedule.reduce((sum, day) => {
              if (day.present && day.timings) {
                return sum + day.timings.reduce((s, t) => s + (t.end - t.start), 0);
              }
              return sum;
            }, 0) : 0;
            return <tr key={member._id} className="group hover:bg-orange-50/50 transition-all duration-200 border-b border-gray-100">
                    {/* Staff member cell - Modern & Spacious */}
                    <td className="sticky left-0 bg-white group-hover:bg-orange-50/50 z-10 px-4 py-3 border-r-2 border-gray-200 transition-colors duration-200">
                      <div className="flex items-center gap-3">
                        <Checkbox checked={selectedStaff.includes(member._id)} onChange={() => toggleStaffSelection(member._id)} size="small" sx={{
                    padding: '4px',
                    '& .MuiSvgIcon-root': {
                      fontSize: 20
                    },
                    color: SOJORI_COLORS.primary,
                    '&.Mui-checked': {
                      color: SOJORI_COLORS.primary
                    }
                  }} />
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:shadow-lg transition-shadow">
                          {member.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 relative">
                          {/* Nom du staff */}
                          <Tooltip title={member.subType && member.subType.length > 0 ? <div className="flex flex-col gap-1 p-1">
                                  <span className="font-semibold text-xs">Services:</span>
                                  {member.subType.map((type, idx) => <span key={idx} className="text-xs">• {type}</span>)}
                                </div> : <span className="text-xs">Aucun service défini</span>} arrow placement="right">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-900 text-sm cursor-help">
                                {member.username}
                              </span>
                              {member.subType && member.subType.length > 0 && <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {member.subType.length}
                                </span>}
                            </div>
                          </Tooltip>
                        </div>
                      </div>
                    </td>

                    {/* Day cells */}
                    {daysOfWeek.map(day => {
                const schedule = getScheduleForDay(member, day);
                const hours = calculateDayHours(schedule);
                const isActive = schedule?.present && hours > 0;
                return <td key={day} className="px-2 py-1.5 border-r border-gray-100 cursor-pointer group/cell relative transition-all duration-200" onClick={() => handleCellClick(member, day)}>
                          <div className="rounded-lg p-2 min-h-[35px] flex flex-col items-center justify-center transition-all duration-200 hover:shadow-lg border-2" style={{
                    backgroundColor: isActive ? hours >= 8 ? '#FED7AA' :
                    // Orange clair pour 8h+
                    hours >= 4 ? '#FEE2B3' :
                    // Orange très clair pour 4-8h
                    '#FEF3E2' // Beige pour moins de 4h
                    : 'white',
                    borderColor: isActive ? hours >= 8 ? '#FF6B35' : hours >= 4 ? '#FB923C' : '#FDBA74' : SOJORI_COLORS.gray[200]
                  }}>
                            {isActive ? <>
                                <div className="flex flex-col items-center gap-1 w-full">
                                  {schedule.timings.map((timing, idx) => <div key={idx} className="text-xs font-bold text-orange-800 bg-white px-2 py-0.5 rounded shadow-sm">
                                      {timing.start}h - {timing.end}h
                                    </div>)}
                                </div>

                                {/* Quick Actions on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-black/10 opacity-0 group-hover/cell:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center gap-1.5">
                                  <Tooltip title="Modifier" arrow>
                                    <IconButton size="small" sx={{
                            backgroundColor: 'white',
                            padding: '4px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            '&:hover': {
                              backgroundColor: '#FFF5F2',
                              transform: 'scale(1.1)'
                            },
                            transition: 'all 0.2s ease'
                          }}>
                                      <Edit2 className="w-3.5 h-3.5 text-orange-600" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Supprimer" arrow>
                                    <IconButton size="small" sx={{
                            backgroundColor: 'white',
                            padding: '4px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            '&:hover': {
                              backgroundColor: '#FEE2E2',
                              transform: 'scale(1.1)'
                            },
                            transition: 'all 0.2s ease'
                          }}>
                                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                    </IconButton>
                                  </Tooltip>
                                </div>
                              </> : <div className="flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity duration-200">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                  <Plus className="w-4 h-4 text-gray-500" />
                                </div>
                              </div>}
                          </div>
                        </td>;
              })}

                    {/* Total column */}
                    <td className="px-4 py-3 text-center border-l-2 border-gray-200 bg-gradient-to-br from-orange-50 to-orange-100">
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-2xl font-bold text-orange-600">
                          {weeklyHours}h
                        </div>
                        <Chip label={weeklyHours > 40 ? 'Surcharge' : weeklyHours > 35 ? 'Full-time' : weeklyHours > 20 ? 'Part-time' : 'Léger'} size="small" sx={{
                    fontSize: '11px',
                    height: '22px',
                    fontWeight: 600,
                    backgroundColor: weeklyHours > 40 ? SOJORI_COLORS.error : weeklyHours > 35 ? SOJORI_COLORS.success : weeklyHours > 20 ? SOJORI_COLORS.warning : SOJORI_COLORS.gray[400],
                    color: 'white',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }} />
                      </div>
                    </td>
                  </tr>;
          })}
          </tbody>
        </table>
      </div>

      {/* Enhanced Quick Add Dialog - 3 Modes */}
      <Dialog open={quickAddDialog} onClose={() => setQuickAddDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <span>Planifier un créneau</span>
            </div>
            <IconButton size="small" onClick={() => setQuickAddDialog(false)} sx={{
            color: SOJORI_COLORS.gray[600]
          }}>
              <CloseIcon className="w-5 h-5" />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent>
          <div className="flex flex-col gap-4 mt-2">
            {/* Staff & Day Info */}
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-3 border border-orange-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs">
                  {selectedCell?.staffMember?.username?.charAt(0).toUpperCase()}
                </div>
                <div className="text-sm">
                  <div className="font-bold text-gray-900">{selectedCell?.staffMember?.username}</div>
                  <div className="text-gray-600">
                    {selectedCell?.dayName && t(selectedCell.dayName.charAt(0).toUpperCase() + selectedCell.dayName.slice(1))}
                  </div>
                </div>
              </div>
            </div>

            {/* Existing Timings for this day */}
            {(() => {
            const existingSchedule = selectedCell ? getScheduleForDay(selectedCell.staffMember, selectedCell.dayName) : null;
            const existingTimings = existingSchedule?.timings || [];
            if (existingTimings.length > 0) {
              return <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-blue-800">Créneaux existants pour ce jour:</span>
                      <Chip label={`${existingTimings.length} créneau${existingTimings.length > 1 ? 'x' : ''}`} size="small" sx={{
                    backgroundColor: SOJORI_COLORS.info,
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '11px',
                    height: '20px'
                  }} />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {existingTimings.map((timing, idx) => <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm">
                          <Clock className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-sm font-semibold text-gray-800">
                            {timing.start}h - {timing.end}h
                          </span>
                          <span className="text-xs text-gray-500">
                            ({timing.end - timing.start}h)
                          </span>
                          <IconButton size="small" onClick={() => {
                      handleDeleteTiming(selectedCell.staffMember, selectedCell.dayName, idx);
                      // Refresh dialog if no more timings
                      if (existingTimings.length === 1) {
                        setQuickAddDialog(false);
                      }
                    }} sx={{
                      padding: '2px',
                      marginLeft: '4px',
                      '&:hover': {
                        backgroundColor: '#FEE2E2'
                      }
                    }}>
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </IconButton>
                        </div>)}
                    </div>
                  </div>;
            }
            return null;
          })()}

            {/* Mode Selector */}
            <ToggleButtonGroup value={addMode} exclusive onChange={(e, newMode) => newMode && setAddMode(newMode)} fullWidth sx={{
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '13px',
              padding: '10px',
              '&.Mui-selected': {
                backgroundColor: SOJORI_COLORS.primary,
                color: 'white',
                '&:hover': {
                  backgroundColor: SOJORI_COLORS.primaryDark
                }
              }
            }
          }}>
              <ToggleButton value="simple">
                <Clock className="w-4 h-4 mr-2" />
                Début/Fin
              </ToggleButton>
              <ToggleButton value="template">
                <Copy className="w-4 h-4 mr-2" />
                Templates
              </ToggleButton>
              <ToggleButton value="hourly">
                <Calendar className="w-4 h-4 mr-2" />
                Heure par heure
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Mode: Simple (Début/Fin) */}
            {addMode === 'simple' && <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <TextField label="Heure de début" type="number" value={quickAddData.start} onChange={e => setQuickAddData({
                ...quickAddData,
                start: parseInt(e.target.value)
              })} inputProps={{
                min: 0,
                max: 24
              }} fullWidth sx={{
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: SOJORI_COLORS.primary
                  }
                }
              }} />
                  <TextField label="Heure de fin" type="number" value={quickAddData.end} onChange={e => setQuickAddData({
                ...quickAddData,
                end: parseInt(e.target.value)
              })} inputProps={{
                min: 0,
                max: 24
              }} fullWidth sx={{
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: SOJORI_COLORS.primary
                  }
                }
              }} />
                </div>

                <div className="text-sm bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Durée:</span>
                    <span className="text-lg font-bold text-orange-600">
                      {Math.max(0, quickAddData.end - quickAddData.start)}h
                    </span>
                  </div>
                </div>
              </div>}

            {/* Mode: Templates */}
            {addMode === 'template' && <div className="flex flex-col gap-3">
                <div className="text-xs text-gray-600 font-medium mb-1">Sélectionnez un template prédéfini :</div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outlined" onClick={() => applyTemplateToDialog('9-17')} sx={{
                borderColor: SOJORI_COLORS.primary,
                color: SOJORI_COLORS.primary,
                padding: '12px',
                justifyContent: 'flex-start',
                '&:hover': {
                  backgroundColor: SOJORI_COLORS.primaryPale,
                  borderColor: SOJORI_COLORS.primaryDark
                }
              }}>
                    <div className="flex flex-col items-start w-full">
                      <div className="font-bold text-base">9h - 17h</div>
                      <div className="text-xs text-gray-500">Journée standard (8h)</div>
                    </div>
                  </Button>

                  <Button variant="outlined" onClick={() => applyTemplateToDialog('8-16')} sx={{
                borderColor: SOJORI_COLORS.info,
                color: SOJORI_COLORS.info,
                padding: '12px',
                justifyContent: 'flex-start',
                '&:hover': {
                  backgroundColor: '#EFF6FF',
                  borderColor: SOJORI_COLORS.info
                }
              }}>
                    <div className="flex flex-col items-start w-full">
                      <div className="font-bold text-base">8h - 16h</div>
                      <div className="text-xs text-gray-500">Matinée complète (8h)</div>
                    </div>
                  </Button>

                  <Button variant="outlined" onClick={() => applyTemplateToDialog('10-18')} sx={{
                borderColor: SOJORI_COLORS.success,
                color: SOJORI_COLORS.success,
                padding: '12px',
                justifyContent: 'flex-start',
                '&:hover': {
                  backgroundColor: '#F0FDF4',
                  borderColor: SOJORI_COLORS.success
                }
              }}>
                    <div className="flex flex-col items-start w-full">
                      <div className="font-bold text-base">10h - 18h</div>
                      <div className="text-xs text-gray-500">Après-midi (8h)</div>
                    </div>
                  </Button>

                  <Button variant="outlined" onClick={() => applyTemplateToDialog('14-22')} sx={{
                borderColor: SOJORI_COLORS.warning,
                color: SOJORI_COLORS.warning,
                padding: '12px',
                justifyContent: 'flex-start',
                '&:hover': {
                  backgroundColor: '#FFF7ED',
                  borderColor: SOJORI_COLORS.warning
                }
              }}>
                    <div className="flex flex-col items-start w-full">
                      <div className="font-bold text-base">14h - 22h</div>
                      <div className="text-xs text-gray-500">Soirée (8h)</div>
                    </div>
                  </Button>
                </div>

                <div className="text-sm bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Créneau sélectionné:</span>
                    <span className="text-base font-bold text-orange-600">
                      {quickAddData.start}h - {quickAddData.end}h ({quickAddData.end - quickAddData.start}h)
                    </span>
                  </div>
                </div>
              </div>}

            {/* Mode: Hourly */}
            {addMode === 'hourly' && <div className="flex flex-col gap-3">
                <div className="text-xs text-gray-600 font-medium mb-1">
                  Cliquez sur les heures pour sélectionner votre créneau :
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {HOURS.map(hour => <Button key={hour} variant={selectedHours.includes(hour) ? 'contained' : 'outlined'} onClick={() => toggleHourSelection(hour)} sx={{
                minWidth: '60px',
                padding: '10px 8px',
                fontSize: '13px',
                fontWeight: 600,
                ...(selectedHours.includes(hour) ? {
                  background: 'linear-gradient(135deg, #FF6B35 0%, #E55A2B 100%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #E55A2B 0%, #D14520 100%)'
                  }
                } : {
                  borderColor: SOJORI_COLORS.gray[300],
                  color: SOJORI_COLORS.gray[700],
                  '&:hover': {
                    borderColor: SOJORI_COLORS.primary,
                    backgroundColor: SOJORI_COLORS.primaryPale
                  }
                })
              }}>
                      {hour}h
                    </Button>)}
                </div>

                {selectedHours.length > 0 && <div className="text-sm bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
                    {(() => {
                const timings = groupConsecutiveHours(selectedHours);
                const totalHours = selectedHours.length;
                return <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-gray-700 font-semibold">
                              {timings.length} créneau{timings.length > 1 ? 'x' : ''} sera{timings.length > 1 ? 'ont' : ''} créé{timings.length > 1 ? 's' : ''} :
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {timings.map((timing, idx) => <div key={idx} className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-orange-200 shadow-sm">
                                <Clock className="w-3.5 h-3.5 text-orange-600" />
                                <span className="text-sm font-semibold text-gray-800">
                                  {timing.start}h - {timing.end}h
                                </span>
                                <span className="text-xs text-gray-500">
                                  ({timing.end - timing.start}h)
                                </span>
                              </div>)}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-orange-200">
                            <span className="text-gray-700">Durée totale:</span>
                            <span className="text-lg font-bold text-orange-600">
                              {totalHours}h
                            </span>
                          </div>
                        </>;
              })()}
                  </div>}
              </div>}
          </div>
        </DialogContent>
        <DialogActions sx={{
        padding: '16px 24px',
        borderTop: '2px solid #F3F4F6'
      }}>
          <Button onClick={() => setQuickAddDialog(false)} sx={{
          color: SOJORI_COLORS.gray[600],
          '&:hover': {
            backgroundColor: SOJORI_COLORS.gray[100]
          }
        }}>
            Annuler
          </Button>
          <Button onClick={handleQuickAdd} variant="contained" startIcon={<Check className="w-4 h-4" />} disabled={addMode === 'hourly' && selectedHours.length === 0} sx={{
          background: 'linear-gradient(135deg, #FF6B35 0%, #E55A2B 100%)',
          fontWeight: 600,
          padding: '8px 20px',
          '&:hover': {
            background: 'linear-gradient(135deg, #E55A2B 0%, #D14520 100%)',
            boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
          },
          '&:disabled': {
            background: SOJORI_COLORS.gray[300],
            color: SOJORI_COLORS.gray[500]
          }
        }}>
            {addMode === 'hourly' && selectedHours.length === 0 ? 'Sélectionnez des heures' : (() => {
            const existingSchedule = selectedCell ? getScheduleForDay(selectedCell.staffMember, selectedCell.dayName) : null;
            const hasExisting = (existingSchedule?.timings || []).length > 0;
            return hasExisting ? 'Ajouter un nouveau créneau' : 'Ajouter le créneau';
          })()}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Filter Menu */}
      <Menu anchorEl={filterMenu} open={Boolean(filterMenu)} onClose={() => setFilterMenu(null)}>
        <MenuItem onClick={() => {
        setSelectedDepartment('all');
        setFilterMenu(null);
      }}>
          Tous les départements
        </MenuItem>
        <MenuItem onClick={() => {
        setSelectedDepartment('cleaning');
        setFilterMenu(null);
      }}>
          Nettoyage
        </MenuItem>
        <MenuItem onClick={() => {
        setSelectedDepartment('maintenance');
        setFilterMenu(null);
      }}>
          Maintenance
        </MenuItem>
        <MenuItem onClick={() => {
        setSelectedDepartment('reception');
        setFilterMenu(null);
      }}>
          Réception
        </MenuItem>
      </Menu>
    </div>;
};
export default TeamCalendarView;
