/**
 * SmartStaffSelector - Dialog avec filtres intelligents pour sélectionner un staff
 *
 * Utilise l'API /available-for-task avec scoring intelligent basé sur:
 * - Listing (permission géographique)
 * - Catégorie (compétence)
 * - Planning (disponibilité horaire)
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, List, ListItem, ListItemButton, ListItemText, ListItemAvatar, Avatar, TextField, InputAdornment, Typography, Chip, FormControlLabel, Checkbox, Box, Collapse } from '@mui/material';
import { Search as SearchIcon, Person as PersonIcon, Check as CheckIcon, FilterList as FilterListIcon } from '@mui/icons-material';
import { fetchAvailableStaffForTask } from './addTaskApi';

const SOJORI_COLORS = {
  primary: '#b8851a',
  primaryDark: '#9a6f14',
  primaryPale: '#f5ead8',
};
interface Staff {
  _id: string;
  staffCode: string;
  staffName: string;
  staffPhone?: string;
  email?: string;
  memberRole?: string;
  score: number;
  reasons: string[];
  passesRequiredFilters?: boolean;
  hasScheduleConflict?: boolean;
  hasListing: boolean; // MUST-HAVE
  hasCategory: boolean; // NICE-TO-HAVE
  hasPlanning: boolean; // NICE-TO-HAVE
  available: boolean; // true si hasListing = true (peut être assigné)
}
interface SmartStaffSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (staff: Staff) => void;
  taskData: {
    listingId?: string;
    listingName?: string;
    taskType?: string;
    taskCategory?: string;
    ownerId?: string;
    startDate?: Date;
    startTime?: string;
    endTime?: string;
  };
}
export function SmartStaffSelector({
  open,
  onClose,
  onSelect,
  taskData,
}: SmartStaffSelectorProps) {
  const [availableStaff, setAvailableStaff] = useState<Staff[]>([]);
  const [unavailableStaff, setUnavailableStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [listingTaskLine, setListingTaskLine] = useState('');
  const [staffSummary, setStaffSummary] = useState('');

  // Intelligent filters (enabled by default)
  const [checkListing, setCheckListing] = useState(true);
  const [checkTaskType, setCheckTaskType] = useState(true);
  const [checkPlanning, setCheckPlanning] = useState(true);
  const [showUnavailable, setShowUnavailable] = useState(false);
  useEffect(() => {
    if (open) {
      void loadStaff();
    }
  }, [open, checkListing, checkTaskType, checkPlanning]);
  const loadStaff = async () => {
    setLoading(true);
    setListingTaskLine('');
    setStaffSummary('');
    try {
      const result = await fetchAvailableStaffForTask({
        listingId: taskData.listingId,
        taskType: taskData.taskType,
        taskCategory: taskData.taskCategory,
        ownerId: taskData.ownerId,
        startDate: taskData.startDate,
        startTime: taskData.startTime,
        endTime: taskData.endTime,
        checkListing,
        checkTaskType,
        checkPlanning,
      });
      setAvailableStaff(result.available as Staff[]);
      setUnavailableStaff(result.unavailable as Staff[]);
      setListingTaskLine(result.listingTaskLine);
      setStaffSummary(result.staffSummary);
    } catch {
      setAvailableStaff([]);
      setUnavailableStaff([]);
    } finally {
      setLoading(false);
    }
  };
  const handleSelect = () => {
    if (selectedStaff) {
      onSelect(selectedStaff);
      onClose();
    }
  };
  const filterStaffBySearch = (staffList: Staff[]) => {
    if (!searchTerm) return staffList;
    const search = searchTerm.toLowerCase();
    return staffList.filter(s => s.staffName?.toLowerCase().includes(search) || s.staffCode?.toLowerCase().includes(search) || s.staffPhone?.includes(search));
  };
  const filteredAvailable = filterStaffBySearch(availableStaff);
  const filteredUnavailable = filterStaffBySearch(unavailableStaff);
  return <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{
    sx: {
      borderRadius: '16px'
    }
  }}>
      <DialogTitle sx={{
      bgcolor: SOJORI_COLORS.primary,
      color: 'white',
      fontWeight: 600
    }}>
        🎯 Sélection Intelligente du Staff
      </DialogTitle>

      <DialogContent sx={{
      pt: 2,
      pb: 1
    }}>
        {/* Compact Header: Filters + Task Info */}
        <Box sx={{
        mb: 1.5,
        display: 'flex',
        gap: 2,
        alignItems: 'flex-start',
        flexWrap: 'wrap'
      }}>
          {/* Intelligent Filters */}
          <Box sx={{
          flex: '1 1 auto',
          minWidth: '250px',
          p: 1.5,
          bgcolor: SOJORI_COLORS.primaryPale,
          borderRadius: 2
        }}>
            <Box sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 0.5
          }}>
              <FilterListIcon sx={{
              color: SOJORI_COLORS.primary,
              fontSize: 18,
              mr: 0.5
            }} />
              <Typography variant="caption" sx={{
              fontWeight: 600,
              color: SOJORI_COLORS.primary
            }}>
                Filtres Intelligents
              </Typography>
            </Box>
            <Box sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 0.5
          }}>
              <FormControlLabel control={<Checkbox size="small" checked={checkListing} onChange={e => setCheckListing(e.target.checked)} sx={{
              color: SOJORI_COLORS.primary,
              '&.Mui-checked': {
                color: SOJORI_COLORS.primary
              },
              padding: '4px'
            }} />} label={<Typography variant="caption" sx={{
              fontSize: '11px'
            }}>Listing</Typography>} sx={{
              mr: 1
            }} />
              <FormControlLabel control={<Checkbox size="small" checked={checkTaskType} onChange={e => setCheckTaskType(e.target.checked)} sx={{
              color: SOJORI_COLORS.primary,
              '&.Mui-checked': {
                color: SOJORI_COLORS.primary
              },
              padding: '4px'
            }} />} label={<Typography variant="caption" sx={{
              fontSize: '11px'
            }}>Type Tâche</Typography>} sx={{
              mr: 1
            }} />
              <FormControlLabel control={<Checkbox size="small" checked={checkPlanning} onChange={e => setCheckPlanning(e.target.checked)} sx={{
              color: SOJORI_COLORS.primary,
              '&.Mui-checked': {
                color: SOJORI_COLORS.primary
              },
              padding: '4px'
            }} />} label={<Typography variant="caption" sx={{
              fontSize: '11px'
            }}>Planning</Typography>} />
            </Box>
          </Box>

          {/* Task Info */}
          <Box sx={{
          flex: '0 0 auto',
          minWidth: '200px',
          p: 1.5,
          bgcolor: '#f8fafc',
          borderRadius: 2
        }}>
            <Typography variant="caption" sx={{
            color: '#64748b',
            display: 'block',
            mb: 0.5
          }}>
              Logement · type de tâche
            </Typography>
            <Typography variant="body2" sx={{
            fontWeight: 600,
            mb: 0.5,
            lineHeight: 1.35
          }}>
              {listingTaskLine || [taskData.listingName, taskData.taskType].filter(Boolean).join(' · ') || taskData.taskType || '—'}
            </Typography>
            <Typography variant="caption" sx={{
            color: '#64748b',
            fontSize: '10px',
            display: 'block'
          }}>
              {taskData.startDate && new Date(taskData.startDate).toLocaleDateString('fr-FR')}
              {taskData.startTime && ` à ${taskData.startTime}`}
            </Typography>
            {staffSummary ? <Typography variant="caption" sx={{
            color: '#0f766e',
            fontSize: '11px',
            display: 'block',
            mt: 0.5
          }}>
                {staffSummary}
              </Typography> : null}
          </Box>
        </Box>

        {/* Search */}
        <TextField fullWidth size="small" placeholder="Rechercher un staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} InputProps={{
        startAdornment: <InputAdornment position="start">
                <SearchIcon style={{
            color: SOJORI_COLORS.primary,
            fontSize: 18
          }} />
              </InputAdornment>
      }} sx={{
        mb: 1.5,
        '& .MuiOutlinedInput-root': {
          '&:hover fieldset': {
            borderColor: SOJORI_COLORS.primary
          },
          '&.Mui-focused fieldset': {
            borderColor: SOJORI_COLORS.primary
          }
        }
      }} />

        {/* Staff List */}
        {loading ? <div style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '64px 0'
      }}>
            <CircularProgress style={{
          color: SOJORI_COLORS.primary
        }} />
          </div> : <>
            {/* Available Staffs */}
            {filteredAvailable.length > 0 && <>
                <div style={{
            fontWeight: 600,
            marginBottom: '6px',
            color: '#10b981',
            fontSize: '13px'
          }}>
                  ✅ Disponibles ({filteredAvailable.length})
                </div>
                <List sx={{
            maxHeight: 280,
            overflow: 'auto',
            mb: 1.5
          }}>
                  {filteredAvailable.map(s => <ListItem key={s._id} disablePadding sx={{
              mb: 0.5
            }}>
                      <ListItemButton selected={selectedStaff?._id === s._id} onClick={() => setSelectedStaff(s)} sx={{
                borderRadius: '8px',
                py: 0.75,
                px: 1.5,
                border: '1px solid #e2e8f0',
                '&.Mui-selected': {
                  backgroundColor: SOJORI_COLORS.primaryPale,
                  borderColor: SOJORI_COLORS.primary,
                  '&:hover': {
                    backgroundColor: SOJORI_COLORS.primaryPale
                  }
                }
              }}>
                        <ListItemAvatar>
                          <Avatar sx={{
                    bgcolor: SOJORI_COLORS.primary
                  }}>
                            {s.staffName?.charAt(0)?.toUpperCase() || 'S'}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText primary={<div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap'
                }}>
                              <span style={{
                    fontWeight: 600,
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '120px'
                  }}>
                                {s.staffName}
                              </span>
                              <Chip label={s.staffCode} size="small" style={{
                    fontSize: '9px',
                    height: '16px',
                    backgroundColor: SOJORI_COLORS.primary,
                    color: 'white'
                  }} />
                              <Chip label={s.memberRole || 'Staff'} size="small" style={{
                    fontSize: '8px',
                    height: '16px',
                    backgroundColor: s.memberRole === 'Manager' ? '#8b5cf6' : '#64748b',
                    color: 'white'
                  }} />
                              <Chip label={`${s.score} pts`} size="small" style={{
                    fontSize: '8px',
                    height: '16px',
                    backgroundColor: '#10b981',
                    color: 'white'
                  }} />
                              {/* Badge ROUGE si listing OK mais catégorie/planning manque */}
                              {s.hasListing && (!s.hasCategory || !s.hasPlanning) && <Chip label={!s.hasCategory ? '⚠️ Catégorie' : '⚠️ Planning'} size="small" style={{
                    fontSize: '8px',
                    height: '16px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontWeight: 600
                  }} />}
                            </div>} secondary={null} />
                        {selectedStaff?._id === s._id && <CheckIcon style={{
                  color: SOJORI_COLORS.primary
                }} />}
                      </ListItemButton>
                    </ListItem>)}
                </List>
              </>}

            {/* Unavailable Staffs (Collapsible) */}
            {filteredUnavailable.length > 0 && <>
                <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            marginBottom: '6px'
          }} onClick={() => setShowUnavailable(!showUnavailable)}>
                  <span style={{
              fontWeight: 600,
              color: '#64748b',
              fontSize: '13px'
            }}>
                    ⚠️ Occupés mais assignables ({filteredUnavailable.length})
                  </span>
                  <span style={{
              color: SOJORI_COLORS.primary,
              fontSize: '11px'
            }}>
                    {showUnavailable ? 'Masquer' : 'Afficher'}
                  </span>
                </div>
                <Collapse in={showUnavailable}>
                  <List sx={{
              maxHeight: 180,
              overflow: 'auto',
              opacity: 0.85
            }}>
                    {filteredUnavailable.map(s => <ListItem key={s._id} disablePadding sx={{
                mb: 0.5
              }}>
                        <ListItemButton selected={selectedStaff?._id === s._id} onClick={() => setSelectedStaff(s)} sx={{
                  borderRadius: '8px',
                  py: 0.75,
                  px: 1.5,
                  border: '1px solid #fbbf24',
                  backgroundColor: '#fffbeb',
                  '&.Mui-selected': {
                    backgroundColor: SOJORI_COLORS.primaryPale,
                    borderColor: SOJORI_COLORS.primary
                  }
                }}>
                          <ListItemAvatar>
                            <Avatar sx={{
                      bgcolor: '#fbbf24'
                    }}>
                              {s.staffName?.charAt(0)?.toUpperCase() || 'S'}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText primary={<div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap'
                  }}>
                                <span style={{
                      fontWeight: 600,
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '120px'
                    }}>
                                  {s.staffName}
                                </span>
                                <Chip label={s.staffCode} size="small" style={{
                      fontSize: '9px',
                      height: '16px'
                    }} />
                                <Chip label={`${s.score} pts`} size="small" style={{
                      fontSize: '8px',
                      height: '16px',
                      backgroundColor: '#fbbf24',
                      color: 'white'
                    }} />
                                {/* Badge ROUGE si pas de listing (MUST-HAVE manquant) */}
                                {!s.hasListing && <Chip label="❌ Pas listing" size="small" style={{
                      fontSize: '8px',
                      height: '16px',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      fontWeight: 600
                    }} />}
                              </div>} secondary={null} />
                          {selectedStaff?._id === s._id && <CheckIcon style={{
                    color: SOJORI_COLORS.primary
                  }} />}
                        </ListItemButton>
                      </ListItem>)}
                  </List>
                </Collapse>
              </>}

            {/* No results */}
            {filteredAvailable.length === 0 && filteredUnavailable.length === 0 && !loading && <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '64px 0'
        }}>
                <PersonIcon style={{
            fontSize: 48,
            color: '#cbd5e1',
            marginBottom: 8
          }} />
                <span style={{
            fontSize: '14px',
            color: '#64748b'
          }}>
                  Aucun staff trouvé
                </span>
                <span style={{
            fontSize: '12px',
            color: '#94a3b8',
            marginTop: 4
          }}>
                  Essayez de désactiver certains filtres
                </span>
              </div>}
          </>}
      </DialogContent>

      <DialogActions sx={{
      px: 3,
      pb: 2
    }}>
        <Button onClick={onClose} sx={{
        textTransform: 'none',
        color: '#64748b'
      }}>
          Annuler
        </Button>
        <Button onClick={handleSelect} disabled={!selectedStaff} variant="contained" sx={{
        textTransform: 'none',
        bgcolor: SOJORI_COLORS.primary,
        color: 'white',
        '&:hover': {
          bgcolor: SOJORI_COLORS.primaryDark
        },
        '&.Mui-disabled': {
          bgcolor: '#cbd5e1',
          color: 'white'
        }
      }}>
          Sélectionner
        </Button>
      </DialogActions>
    </Dialog>;
}
