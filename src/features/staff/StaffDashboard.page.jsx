import React, { useState, useEffect } from 'react';
import { Box, Paper, Tabs, Tab, Typography, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, IconButton } from '@mui/material';
import { Users, Calendar, Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import TeamRolesPageShell, { TeamRolesSectionHeader, teamRolesContentPaperSx, teamRolesPlanningFiltersSx } from './teamRolesLayout';
import StaffManagementView from './components/StaffManagementView';
import { getStaffSimplified, updateStaffSimplified } from './services/serverApi.staffSimplified';
import { getListingsTa } from '../tasks/services/serverApi.task';
import { getcities } from '../setting/services/serverApi.adminConfig';
import { useAdminOwnerFilter } from 'context/AdminOwnerFilterContext';
const SOJORI_COLORS = {
  primary: '#E6B022',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  gray: {
    50: '#FAFAFA',
    100: '#F3F4F6',
    200: '#E5E7EB',
    600: '#4B5563'
  }
};
const DAYS_OF_WEEK = [{
  en: 'Monday',
  fr: 'Lun'
}, {
  en: 'Tuesday',
  fr: 'Mar'
}, {
  en: 'Wednesday',
  fr: 'Mer'
}, {
  en: 'Thursday',
  fr: 'Jeu'
}, {
  en: 'Friday',
  fr: 'Ven'
}, {
  en: 'Saturday',
  fr: 'Sam'
}, {
  en: 'Sunday',
  fr: 'Dim'
}];
const CATEGORY_LABELS = {
  ARRIVAL: {
    icon: '🚪',
    label: 'Arrivée'
  },
  DEPARTURE: {
    icon: '🚪',
    label: 'Départ'
  },
  CLEANING: {
    icon: '🧹',
    label: 'Ménage'
  },
  TRANSPORT: {
    icon: '🚗',
    label: 'Transport'
  },
  GROCERIES: {
    icon: '🛒',
    label: 'Courses'
  },
  SUPPORT: {
    icon: '🆘',
    label: 'Support'
  },
  MAINTENANCE: {
    icon: '🔧',
    label: 'Maintenance'
  },
  CUSTOM: {
    icon: '✨',
    label: 'Personnalisé'
  }
};

// Minutes: uniquement 00 et 30 (pas de saisie libre)
const MINUTES_OPTIONS = [0, 30];
const HOURS_START_OPTIONS = Array.from({
  length: 24
}, (_, i) => i);
// Fin de créneau peut être 24h00 = fin de journée (24/24 : un slot { start: 0, end: 24 })
const HOURS_END_OPTIONS = Array.from({
  length: 25
}, (_, i) => i);

// Templates (alignés avec StaffPlanningTab) - slots simples + combo avec pause
const SCHEDULE_TEMPLATES = [{
  label: '24h (24/24)',
  slots: [{
    start: 0,
    end: 24
  }]
}, {
  label: '9h-17h',
  slots: [{
    start: 9,
    end: 17
  }]
}, {
  label: '8h-19h',
  slots: [{
    start: 8,
    end: 19
  }]
}, {
  label: '8h-20h',
  slots: [{
    start: 8,
    end: 20
  }]
}, {
  label: '8h-12h',
  slots: [{
    start: 8,
    end: 12
  }]
}, {
  label: '14h-20h',
  slots: [{
    start: 14,
    end: 20
  }]
}, {
  label: '8h-12h + 14h-20h',
  slots: [{
    start: 8,
    end: 12
  }, {
    start: 14,
    end: 20
  }]
}, {
  label: '8h-12h + 14h-18h',
  slots: [{
    start: 8,
    end: 12
  }, {
    start: 14,
    end: 18
  }]
}, {
  label: '8h30-17h30',
  slots: [{
    start: 8.5,
    end: 17.5
  }]
}, {
  label: '9h-18h',
  slots: [{
    start: 9,
    end: 18
  }]
}];

// Planning filters (backend)
const PLANNING_ROLES = [{
  value: '',
  label: 'Tous'
}, {
  value: 'Staff',
  label: 'Staff'
}, {
  value: 'Manager',
  label: 'Manager'
}];
const CATEGORY_OPTIONS = [{
  value: '',
  label: 'Toutes'
}, ...Object.entries(CATEGORY_LABELS).map(([id, {
  label
}]) => ({
  value: id,
  label
}))];

// Team Planning View Component
const TeamPlanningView = ({
  staff,
  onScheduleUpdated,
  filters = {},
  onFiltersChange,
  listings = [],
  cities = [],
  page = 0,
  totalCount = 0,
  limit = 50,
  onPageChange,
  loading = false
}) => {
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [editDialog, setEditDialog] = useState({
    open: false,
    staffMember: null,
    day: null
  });
  // editedTimings: array of { start, end } (décimal, ex: 9.5 = 9h30)
  const [editedTimings, setEditedTimings] = useState([]);
  // Nouveau créneau en cours d'ajout
  const [newSlot, setNewSlot] = useState({
    startH: 9,
    startM: 0,
    endH: 17,
    endM: 0
  });
  const formatHour = val => {
    if (val === 24 || val === 24.0) return '24:00';
    const h = Math.floor(val);
    const m = val % 1 === 0.5 ? 30 : 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  const calculateDayHours = timings => {
    if (!Array.isArray(timings)) return 0;
    return timings.reduce((total, timing) => total + (timing.end - timing.start), 0);
  };
  const getWeekDates = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const diff = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today.setDate(today.getDate() + diff + currentWeekOffset * 7));
    return DAYS_OF_WEEK.map((day, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return {
        ...day,
        date: date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short'
        })
      };
    });
  };
  const weekDates = getWeekDates();
  const navigateWeek = direction => {
    setCurrentWeekOffset(prev => prev + direction);
  };
  const handleDayClick = (staffMember, day, daySchedule) => {
    setEditDialog({
      open: true,
      staffMember,
      day
    });
    if (daySchedule?.timings && daySchedule.timings.length > 0) {
      setEditedTimings(daySchedule.timings.map(t => ({
        start: t.start,
        end: t.end
      })).sort((a, b) => a.start - b.start));
    } else {
      setEditedTimings([]);
    }
    setNewSlot({
      startH: 9,
      startM: 0,
      endH: 17,
      endM: 0
    });
  };
  const applyTemplate = tpl => {
    setEditedTimings(tpl.slots.map(s => ({
      start: s.start,
      end: s.end
    })).sort((a, b) => a.start - b.start));
  };
  const addNewSlot = () => {
    let endH = newSlot.endH;
    let endM = newSlot.endM;
    if (endH === 24 && endM !== 0) {
      toast.error('Pour fin à minuit (24h), les minutes de fin doivent être 00');
      return;
    }
    const start = newSlot.startH + (newSlot.startM === 30 ? 0.5 : 0);
    const end = endH === 24 ? 24 : endH + (endM === 30 ? 0.5 : 0);
    if (start >= end) {
      toast.error('L\'heure de fin doit être après l\'heure de début');
      return;
    }
    const merged = [...editedTimings, {
      start,
      end
    }].sort((a, b) => a.start - b.start);
    setEditedTimings(merged);
    setNewSlot({
      startH: 9,
      startM: 0,
      endH: 17,
      endM: 0
    });
  };
  const removeSlot = index => {
    setEditedTimings(editedTimings.filter((_, i) => i !== index));
  };
  const handleSaveHours = async () => {
    try {
      const {
        staffMember,
        day
      } = editDialog;
      const sorted = [...editedTimings].sort((a, b) => a.start - b.start);
      const updatedSchedule = {
        ...(staffMember.schedule || {}),
        [day.en]: {
          present: sorted.length > 0,
          timings: sorted
        }
      };
      await updateStaffSimplified(staffMember.staffCode, {
        schedule: updatedSchedule
      });
      toast.success(`Planning mis à jour pour ${day.fr}`);
      setEditDialog({
        open: false,
        staffMember: null,
        day: null
      });
      onScheduleUpdated?.();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };
  return <Box>
      {/* Filters - Backend */}
      <Box sx={teamRolesPlanningFiltersSx}>
        <FormControl size="small" sx={{
        minWidth: 100
      }}>
          <InputLabel>Rôle</InputLabel>
          <Select value={filters.memberRole || ''} label="Rôle" onChange={e => onFiltersChange?.({
          ...filters,
          memberRole: e.target.value || ''
        })}>
            {PLANNING_ROLES.map(r => <MenuItem key={r.value || 'all'} value={r.value}>{r.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{
        minWidth: 120
      }}>
          <InputLabel>Catégorie</InputLabel>
          <Select value={filters.category || ''} label="Catégorie" onChange={e => onFiltersChange?.({
          ...filters,
          category: e.target.value || ''
        })}>
            {CATEGORY_OPTIONS.map(c => <MenuItem key={c.value || 'all'} value={c.value}>{c.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{
        minWidth: 160
      }}>
          <InputLabel>Propriété</InputLabel>
          <Select value={filters.listingId || ''} label="Propriété" onChange={e => onFiltersChange?.({
          ...filters,
          listingId: e.target.value || ''
        })}>
            <MenuItem value="">Toutes</MenuItem>
            {(listings || []).map(l => <MenuItem key={l.id || l._id} value={l.id || l._id}>{l.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{
        minWidth: 140
      }}>
          <InputLabel>Ville</InputLabel>
          <Select value={filters.cityId || ''} label="Ville" onChange={e => onFiltersChange?.({
          ...filters,
          cityId: e.target.value || ''
        })}>
            <MenuItem value="">Toutes</MenuItem>
            {(cities || []).map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
          </Select>
        </FormControl>
        {totalCount > 0 && <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        ml: 'auto'
      }}>
            <Typography sx={{
          fontSize: '11px',
          color: 'text.secondary'
        }}>
              {totalCount} résultat{totalCount > 1 ? 's' : ''}
            </Typography>
            {totalCount > limit && <Box sx={{
          display: 'flex',
          gap: 0.5
        }}>
                <Chip label="←" size="small" onClick={() => onPageChange?.(Math.max(0, page - 1))} sx={{
            cursor: page > 0 ? 'pointer' : 'not-allowed',
            opacity: page > 0 ? 1 : 0.5,
            fontSize: '12px',
            height: '24px'
          }} />
                <Chip label={`${page + 1} / ${Math.ceil(totalCount / limit)}`} size="small" sx={{
            fontSize: '11px',
            height: '24px'
          }} />
                <Chip label="→" size="small" onClick={() => onPageChange?.(page + 1)} sx={{
            cursor: (page + 1) * limit < totalCount ? 'pointer' : 'not-allowed',
            opacity: (page + 1) * limit < totalCount ? 1 : 0.5,
            fontSize: '12px',
            height: '24px'
          }} />
              </Box>}
          </Box>}
      </Box>

      {/* Week Navigation */}
      <Box sx={{
      mb: 2,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 1.5
    }}>
        <Box onClick={() => navigateWeek(-1)} sx={{
        px: 2,
        py: 0.75,
        bgcolor: SOJORI_COLORS.gray[100],
        borderRadius: 1.5,
        cursor: 'pointer',
        '&:hover': {
          bgcolor: SOJORI_COLORS.gray[200]
        },
        fontWeight: 600,
        fontSize: '13px'
      }}>
          ← Précédente
        </Box>
        <Chip label={currentWeekOffset === 0 ? 'Cette semaine' : `Semaine ${currentWeekOffset > 0 ? '+' : ''}${currentWeekOffset}`} sx={{
        bgcolor: SOJORI_COLORS.primary,
        color: 'white !important',
        fontWeight: 700,
        fontSize: '13px',
        height: '28px',
        px: 2
      }} />
        <Box onClick={() => navigateWeek(1)} sx={{
        px: 2,
        py: 0.75,
        bgcolor: SOJORI_COLORS.gray[100],
        borderRadius: 1.5,
        cursor: 'pointer',
        '&:hover': {
          bgcolor: SOJORI_COLORS.gray[200]
        },
        fontWeight: 600,
        fontSize: '13px'
      }}>
          Suivante →
        </Box>
      </Box>

      {/* Planning Grid */}
      <Paper sx={{
      overflow: 'auto'
    }}>
        <Box sx={{
        minWidth: '800px'
      }}>
          {/* Header Row - Staff info + Days */}
          <Box sx={{
          display: 'grid',
          gridTemplateColumns: '130px 210px 160px 100px 80px repeat(7, minmax(36px, 1fr))',
          borderBottom: `2px solid ${SOJORI_COLORS.gray[200]}`,
          bgcolor: SOJORI_COLORS.gray[50]
        }}>
            {/* Col 1 — Staff */}
            <Box sx={{
            p: 1.5,
            borderRight: `1px solid ${SOJORI_COLORS.gray[200]}`
          }}>
              <Typography sx={{
              fontSize: '12px',
              fontWeight: 700
            }}>Staff</Typography>
            </Box>
            {/* Col 2 — Catégories */}
            <Box sx={{
            p: 1.5,
            borderRight: `1px solid ${SOJORI_COLORS.gray[200]}`
          }}>
              <Typography sx={{
              fontSize: '12px',
              fontWeight: 700
            }}>Catégories</Typography>
            </Box>
            {/* Col 3 — Propriétés */}
            <Box sx={{
            p: 1.5,
            borderRight: `1px solid ${SOJORI_COLORS.gray[200]}`
          }}>
              <Typography sx={{
              fontSize: '12px',
              fontWeight: 700
            }}>Propriétés</Typography>
            </Box>
            {/* Col 4 — WhatsApp */}
            <Box sx={{
            p: 1.5,
            borderRight: `1px solid ${SOJORI_COLORS.gray[200]}`
          }}>
              <Typography sx={{
              fontSize: '12px',
              fontWeight: 700
            }}>WhatsApp</Typography>
            </Box>
            {/* Col 5 — Langue */}
            <Box sx={{
            p: 1.5,
            borderRight: `2px solid ${SOJORI_COLORS.primary}`
          }}>
              <Typography sx={{
              fontSize: '12px',
              fontWeight: 700
            }}>Langue</Typography>
            </Box>
            {/* Cols 6-12 — Days */}
            {weekDates.map(day => <Box key={day.en} sx={{
            p: 0.75,
            textAlign: 'center',
            borderRight: `1px solid ${SOJORI_COLORS.gray[200]}`
          }}>
                <Typography sx={{
              fontSize: '11px',
              fontWeight: 700
            }}>
                  {day.fr}
                </Typography>
                <Typography sx={{
              fontSize: '9px',
              color: 'text.secondary'
            }}>
                  {day.date}
                </Typography>
              </Box>)}
          </Box>

          {/* Staff Rows */}
          {staff.length === 0 ? <Box sx={{
          p: 4,
          textAlign: 'center'
        }}>
              <Typography color="text.secondary">Aucun staff membre trouvé</Typography>
            </Box> : staff.map(staffMember => {
          const whatsapp = staffMember.phone || staffMember.phoneNumber || staffMember.whatsappNumber || staffMember.whatsappPhone || staffMember.contact?.phone || null;
          return <Box key={staffMember.staffCode} sx={{
            display: 'grid',
            gridTemplateColumns: '130px 210px 160px 100px 80px repeat(7, minmax(36px, 1fr))',
            borderBottom: `1px solid ${SOJORI_COLORS.gray[200]}`,
            '&:hover': {
              bgcolor: SOJORI_COLORS.gray[50]
            }
          }}>
                {/* Col 1 — Nom + rôle + statut + code */}
                <Box sx={{
              p: 1,
              borderRight: `1px solid ${SOJORI_COLORS.gray[200]}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.4,
              justifyContent: 'center',
              bgcolor: staffMember.memberRole === 'Manager' ? SOJORI_COLORS.primary + '08' : 'transparent',
              borderLeft: staffMember.memberRole === 'Manager' ? `3px solid ${SOJORI_COLORS.primary}` : 'none'
            }}>
                  <Typography sx={{
                fontSize: '12px',
                fontWeight: 700,
                lineHeight: 1.2
              }}>
                    {staffMember.username}
                  </Typography>
                  <Box sx={{
                display: 'flex',
                gap: 0.5,
                flexWrap: 'wrap'
              }}>
                    <Chip label={staffMember.memberRole === 'Manager' ? 'Manager' : 'Staff'} size="small" sx={{
                  bgcolor: staffMember.memberRole === 'Manager' ? SOJORI_COLORS.primary : SOJORI_COLORS.gray[200],
                  color: staffMember.memberRole === 'Manager' ? 'white !important' : SOJORI_COLORS.gray[600],
                  fontSize: '8px',
                  height: '15px',
                  fontWeight: 700
                }} />
                    <Chip label={staffMember.isActive ? 'Actif' : 'Inactif'} size="small" sx={{
                  bgcolor: staffMember.isActive ? SOJORI_COLORS.success : SOJORI_COLORS.gray[600],
                  color: 'white !important',
                  fontSize: '8px',
                  height: '15px',
                  fontWeight: 700
                }} />
                  </Box>
                  <Typography sx={{
                fontSize: '9px',
                color: 'text.secondary'
              }}>
                    {staffMember.staffCode}
                  </Typography>
                </Box>

                {/* Col 2 — Catégories */}
                <Box sx={{
              p: 0.75,
              borderRight: `1px solid ${SOJORI_COLORS.gray[200]}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 0.4
            }}>
                  {staffMember.categories && staffMember.categories.length > 0 ? <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '3px'
              }}>
                      {staffMember.categories.map(cat => {
                  const info = CATEGORY_LABELS[cat] || {
                    icon: '•',
                    label: cat
                  };
                  return <Chip key={cat} size="small" label={`${info.icon} ${info.label}`} sx={{
                    fontSize: '8px',
                    height: '16px',
                    '& .MuiChip-label': {
                      px: 0.4
                    },
                    bgcolor: SOJORI_COLORS.gray[100],
                    color: SOJORI_COLORS.gray[700],
                    border: `1px solid ${SOJORI_COLORS.gray[200]}`,
                    width: '100%'
                  }} />;
                })}
                    </Box> : <Typography sx={{
                fontSize: '10px',
                color: SOJORI_COLORS.gray[400]
              }}>—</Typography>}
                </Box>

                {/* Col 3 — Propriétés */}
                <Box sx={{
              p: 0.75,
              borderRight: `1px solid ${SOJORI_COLORS.gray[200]}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 0.4
            }}>
                  {staffMember.listingIds && staffMember.listingIds.length > 0 ? staffMember.listingIds.includes('All') ? <Chip label="Tous" size="small" sx={{
                fontSize: '9px',
                height: '18px',
                bgcolor: SOJORI_COLORS.primary,
                color: 'white !important',
                fontWeight: 700
              }} /> : <Box sx={{
                display: 'flex',
                gap: '3px',
                flexWrap: 'wrap'
              }}>
                        {staffMember.listingIds.slice(0, 2).map(listingId => {
                  const listing = listings.find(l => (l._id || l.id) === listingId);
                  return listing ? <Chip key={listingId} label={listing.name} size="small" sx={{
                    fontSize: '8px',
                    height: '16px',
                    bgcolor: SOJORI_COLORS.gray[100],
                    color: SOJORI_COLORS.gray[700],
                    border: `1px solid ${SOJORI_COLORS.gray[200]}`
                  }} /> : null;
                })}
                        {staffMember.listingIds.length > 2 && <Chip label={`+${staffMember.listingIds.length - 2}`} size="small" sx={{
                  fontSize: '8px',
                  height: '16px',
                  bgcolor: SOJORI_COLORS.info,
                  color: 'white !important',
                  fontWeight: 700
                }} />}
                      </Box> : <Typography sx={{
                fontSize: '10px',
                color: SOJORI_COLORS.gray[400]
              }}>—</Typography>}
                </Box>

                {/* Col 4 — WhatsApp */}
                <Box sx={{
              p: 0.75,
              borderRight: `1px solid ${SOJORI_COLORS.gray[200]}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
                  {whatsapp ? <Typography sx={{
                fontSize: '9px',
                fontWeight: 600,
                color: SOJORI_COLORS.success,
                fontFamily: 'monospace',
                textAlign: 'center',
                lineHeight: 1.3,
                wordBreak: 'break-all'
              }}>
                      {whatsapp}
                    </Typography> : <Typography sx={{
                fontSize: '10px',
                color: SOJORI_COLORS.gray[400]
              }}>—</Typography>}
                </Box>

                {/* Col 5 — Langue */}
                <Box sx={{
              p: 0.75,
              borderRight: `2px solid ${SOJORI_COLORS.primary}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
                  {staffMember.language ? <Chip label={staffMember.language === 'French' ? '🇫🇷 FR' : staffMember.language === 'Arabic' ? '🇲🇦 AR' : staffMember.language === 'English' ? '🇬🇧 EN' : staffMember.language} size="small" sx={{
                fontSize: '9px',
                height: '18px',
                fontWeight: 700,
                bgcolor: SOJORI_COLORS.primary + '15',
                color: SOJORI_COLORS.primary,
                border: `1px solid ${SOJORI_COLORS.primary}`
              }} /> : <Typography sx={{
                fontSize: '10px',
                color: SOJORI_COLORS.gray[400]
              }}>—</Typography>}
                </Box>

                {/* Days */}
                {DAYS_OF_WEEK.map(day => {
              const daySchedule = staffMember.schedule?.[day.en];
              const isAvailable = daySchedule?.present || false;
              const timings = daySchedule?.timings || [];
              const totalHours = calculateDayHours(timings);
              return <Box key={day.en} onClick={() => handleDayClick(staffMember, day, daySchedule)} sx={{
                p: 0.5,
                borderRight: `1px solid ${SOJORI_COLORS.gray[200]}`,
                bgcolor: isAvailable ? 'white' : SOJORI_COLORS.gray[50],
                minHeight: '50px',
                cursor: 'pointer',
                position: 'relative',
                '&:hover': {
                  bgcolor: SOJORI_COLORS.primary + '10',
                  '&::after': {
                    content: '"✏️"',
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    fontSize: '10px'
                  }
                }
              }}>
                      {isAvailable ? <>
                          {timings.length === 0 ? <Typography sx={{
                    display: 'block',
                    textAlign: 'center',
                    color: SOJORI_COLORS.success,
                    fontWeight: 700,
                    fontSize: '11px',
                    py: 1.5
                  }}>
                              Journée
                            </Typography> : <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5
                  }}>
                              {timings.map((timing, idx) => <Box key={idx} sx={{
                      p: 0.4,
                      bgcolor: SOJORI_COLORS.info + '20',
                      borderRadius: 0.75,
                      border: `1px solid ${SOJORI_COLORS.info}`
                    }}>
                                  <Typography sx={{
                        fontSize: '10px',
                        lineHeight: 1.2
                      }}>
                                    {formatHour(timing.start)} - {formatHour(timing.end)}
                                  </Typography>
                                </Box>)}
                              {totalHours > 0 && <Chip label={`${totalHours}h`} size="small" sx={{
                      bgcolor: SOJORI_COLORS.primary,
                      color: 'white !important',
                      fontSize: '9px',
                      height: '16px',
                      fontWeight: 700,
                      mt: 0.4
                    }} />}
                            </Box>}
                        </> : <Typography sx={{
                  display: 'block',
                  textAlign: 'center',
                  color: SOJORI_COLORS.gray[400],
                  fontSize: '12px',
                  py: 1.5
                }}>
                          -
                        </Typography>}
                    </Box>;
            })}
              </Box>;
        })}
        </Box>
      </Paper>

      {/* Edit Hours Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({
      open: false,
      staffMember: null,
      day: null
    })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{
        pb: 1
      }}>
          <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
            <Edit2 size={20} color={SOJORI_COLORS.primary} />
            <Box>
              <Typography sx={{
              fontSize: '15px',
              fontWeight: 700
            }}>
                Modifier les horaires
              </Typography>
              <Typography sx={{
              fontSize: '12px',
              color: 'text.secondary'
            }}>
                {editDialog.staffMember?.username} - {editDialog.day?.fr}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{
        pt: 2
      }}>
          {/* Templates (alignés StaffPlanningTab) */}
          <Box sx={{
          mb: 2
        }}>
            <Typography sx={{
            fontSize: '11px',
            color: 'text.secondary',
            mb: 1
          }}>
              Templates
            </Typography>
            <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.75,
            alignItems: 'center'
          }}>
              {SCHEDULE_TEMPLATES.map(tpl => <Chip key={tpl.label} label={tpl.label} size="small" onClick={() => applyTemplate(tpl)} sx={{
              fontSize: '11px',
              height: '26px',
              cursor: 'pointer',
              bgcolor: tpl.slots?.some(s => s.start === 0 && s.end === 24) ? SOJORI_COLORS.success + '22' : SOJORI_COLORS.gray[100],
              '&:hover': {
                bgcolor: SOJORI_COLORS.primary + '25'
              }
            }} />)}
            </Box>
          </Box>
          {/* Liste des créneaux (ordre trié) */}
          {editedTimings.length > 0 && <Box sx={{
          mb: 2
        }}>
              <Typography sx={{
            fontSize: '11px',
            color: 'text.secondary',
            mb: 1
          }}>
                Créneaux ({editedTimings.reduce((s, t) => s + (t.end - t.start), 0)}h)
              </Typography>
              <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5
          }}>
                {editedTimings.map((t, idx) => <Box key={idx} sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1,
              bgcolor: SOJORI_COLORS.gray[100],
              borderRadius: 1
            }}>
                    <Typography sx={{
                fontSize: '12px'
              }}>
                      {formatHour(t.start)} - {formatHour(t.end)} ({t.end - t.start}h)
                    </Typography>
                    <IconButton size="small" onClick={() => removeSlot(idx)} sx={{
                p: 0.25
              }}>
                      <Trash2 size={14} />
                    </IconButton>
                  </Box>)}
              </Box>
            </Box>}
          {/* Ajouter un créneau */}
          <Box sx={{
          mt: 1
        }}>
            <Typography sx={{
            fontSize: '11px',
            color: 'text.secondary',
            mb: 1
          }}>
              Ajouter un créneau
            </Typography>
            <Box sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'flex-end',
            flexWrap: 'wrap'
          }}>
              <FormControl size="small" sx={{
              minWidth: 56
            }}>
                <InputLabel>Déb h</InputLabel>
                <Select value={newSlot.startH} label="Déb h" onChange={e => setNewSlot({
                ...newSlot,
                startH: Number(e.target.value)
              })}>
                  {HOURS_START_OPTIONS.map(h => <MenuItem key={h} value={h}>{String(h).padStart(2, '0')}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{
              minWidth: 48
            }}>
                <InputLabel>min</InputLabel>
                <Select value={newSlot.startM} label="min" onChange={e => setNewSlot({
                ...newSlot,
                startM: Number(e.target.value)
              })}>
                  {MINUTES_OPTIONS.map(m => <MenuItem key={m} value={m}>{String(m).padStart(2, '0')}</MenuItem>)}
                </Select>
              </FormControl>
              <Typography sx={{
              color: 'text.secondary',
              pb: 1,
              fontSize: '12px'
            }}>→</Typography>
              <FormControl size="small" sx={{
              minWidth: 56
            }}>
                <InputLabel>Fin h</InputLabel>
                <Select value={newSlot.endH} label="Fin h" onChange={e => {
                const v = Number(e.target.value);
                setNewSlot({
                  ...newSlot,
                  endH: v,
                  endM: v === 24 ? 0 : newSlot.endM
                });
              }}>
                  {HOURS_END_OPTIONS.map(h => <MenuItem key={h} value={h}>
                      {h === 24 ? '24 (minuit fin)' : String(h).padStart(2, '0')}
                    </MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{
              minWidth: 48
            }} disabled={newSlot.endH === 24}>
                <InputLabel>min</InputLabel>
                <Select value={newSlot.endH === 24 ? 0 : newSlot.endM} label="min" onChange={e => setNewSlot({
                ...newSlot,
                endM: Number(e.target.value)
              })}>
                  {MINUTES_OPTIONS.map(m => <MenuItem key={m} value={m}>{String(m).padStart(2, '0')}</MenuItem>)}
                </Select>
              </FormControl>
              <Button size="small" variant="outlined" startIcon={<Plus size={14} />} onClick={addNewSlot} sx={{
              borderColor: SOJORI_COLORS.primary,
              color: SOJORI_COLORS.primary,
              fontSize: '11px'
            }}>
                Ajouter
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{
        p: 2,
        pt: 1
      }}>
          <Button onClick={() => setEditDialog({
          open: false,
          staffMember: null,
          day: null
        })} size="small" startIcon={<X size={14} />} sx={{
          fontSize: '12px'
        }}>
            Annuler
          </Button>
          <Button onClick={handleSaveHours} variant="contained" size="small" startIcon={<Save size={14} />} sx={{
          bgcolor: SOJORI_COLORS.primary,
          color: 'white !important',
          fontSize: '12px',
          '&:hover': {
            bgcolor: SOJORI_COLORS.primary + 'dd'
          }
        }}>
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>
    </Box>;
};

// Main Staff Dashboard Component
const StaffDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planningFilters, setPlanningFilters] = useState({
    memberRole: '',
    category: '',
    listingId: '',
    cityId: ''
  });
  const [planningPage, setPlanningPage] = useState(0);
  const [planningTotal, setPlanningTotal] = useState(0);
  const [listings, setListings] = useState([]);
  const [cities, setCities] = useState([]);
  const PLANNING_LIMIT = 50;
  const user = useSelector(state => state.auth.user);
  const { requestOwnerId } = useAdminOwnerFilter();
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const [listingsRes, citiesRes] = await Promise.all([getListingsTa().catch(() => []), getcities().then(r => r.data?.cities || []).catch(() => [])]);
        setListings(Array.isArray(listingsRes) ? listingsRes : []);
        setCities(Array.isArray(citiesRes) ? citiesRes : []);
      } catch (e) {}
    };
    loadFilterData();
  }, []);
  const loadStaff = async (filters = planningFilters, page = 0) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: PLANNING_LIMIT,
        search: '',
        ...(filters.memberRole && {
          memberRole: filters.memberRole
        }),
        ...(filters.category && {
          category: filters.category
        }),
        ...(filters.listingId && {
          listingId: filters.listingId
        }),
        ...(filters.cityId && {
          cityId: filters.cityId
        })
      };
      if (requestOwnerId) {
        params.ownerId = requestOwnerId;
      }
      const response = await getStaffSimplified(params);
      setStaff(response.staff || []);
      setPlanningTotal(response.pagination?.totalCount ?? response.staff?.length ?? 0);
    } catch (error) {
      toast.error('Erreur lors du chargement des staff membres');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    setPlanningPage(0);
    loadStaff(planningFilters, 0);
  }, [requestOwnerId]);
  const handlePlanningFiltersChange = newFilters => {
    setPlanningFilters(newFilters);
    setPlanningPage(0);
    loadStaff(newFilters, 0);
  };
  const handlePlanningPageChange = newPage => {
    setPlanningPage(newPage);
    loadStaff(planningFilters, newPage);
  };
  return <TeamRolesPageShell>
      <TeamRolesSectionHeader title="Dashboard Staff" icon={<Users size={16} strokeWidth={2.4} color="#fff" />} chip={<Chip label={`${staff.length} membres`} size="small" sx={{
      bgcolor: SOJORI_COLORS.primary,
      color: 'white !important',
      fontWeight: 700,
      fontSize: '11px',
      height: '22px'
    }} />} />

        {/* Main Tabs */}
        <Paper elevation={0} sx={{
      ...teamRolesContentPaperSx,
      mb: 1.5
    }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} variant="scrollable" scrollButtons="auto" sx={{
        minHeight: '42px',
        '& .MuiTabs-flexContainer': {
          gap: 0.5
        },
        '& .Mui-selected': {
          color: SOJORI_COLORS.primary + ' !important'
        },
        '& .MuiTabs-indicator': {
          bgcolor: SOJORI_COLORS.primary,
          height: '3px'
        }
      }}>
            <Tab icon={<Calendar size={16} />} iconPosition="start" label="Planning Staff" sx={{
          fontWeight: 700,
          fontSize: '12px',
          px: 1.5,
          minHeight: '42px',
          textTransform: 'none'
        }} />
            <Tab icon={<Users size={16} />} iconPosition="start" label="Gestion Staff" sx={{
          fontWeight: 700,
          fontSize: '12px',
          px: 1.5,
          minHeight: '42px',
          textTransform: 'none'
        }} />
          </Tabs>
        </Paper>

        {/* Tab Content — même carte blanche / bordure orange que Groupes / WhatsApp admin */}
        <Paper elevation={0} sx={{
      ...teamRolesContentPaperSx,
      px: {
        xs: 0.75,
        sm: 1
      },
      pt: 1,
      pb: 1.5,
      mt: 0.5
    }}>
          {activeTab === 0 && <TeamPlanningView staff={staff} onScheduleUpdated={() => loadStaff(planningFilters, planningPage)} filters={planningFilters} onFiltersChange={handlePlanningFiltersChange} listings={listings} cities={cities} page={planningPage} totalCount={planningTotal} limit={PLANNING_LIMIT} onPageChange={handlePlanningPageChange} loading={loading} />}
          {activeTab === 1 && <StaffManagementView isEmbedded={true} mode="cards" />}
        </Paper>
    </TeamRolesPageShell>;
};
export default StaffDashboard;
