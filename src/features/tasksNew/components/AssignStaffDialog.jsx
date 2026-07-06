import React, { useState, useEffect } from 'react';
import { CircularProgress, List, ListItem, ListItemButton, ListItemText, ListItemAvatar, Avatar, TextField, InputAdornment, Typography, Chip, FormControlLabel, Checkbox, Box, Collapse, Button, useMediaQuery, useTheme } from '@mui/material';
import { Search as SearchIcon, Person as PersonIcon, Check as CheckIcon, FilterList as FilterListIcon } from '@mui/icons-material';
import axios from 'axios';
import { API_BASE_URL, MICROSERVICE_BASE_URL } from '../../../config/backendServer.config';
import { getToken as getAuthToken } from '../../../utils/auth.utils';
import { useAuth } from '../../../hooks/useAuth';
import { labelForTaskTypeId } from '../../taskHub/staff-design/fulltaskTaskTypes';

/**
 * 🛡️ STRATÉGIE ROBUSTE - Récupération OwnerId avec fallbacks multiples
 *
 * Niveaux de fallback (dans l'ordre):
 * 1. Props direct (ownerIdProp)
 * 2. Task object (task.ownerId, task.owner._id, task.__owner, etc.)
 * 3. Session utilisateur (useAuth)
 * 4. LocalStorage (userId en dernier recours)
 *
 * @returns {string|null} ownerId trouvé ou null
 */
const resolveOwnerIdRobust = (ownerIdProp, task, sessionUser) => {
  // Niveau 1: Props direct
  if (ownerIdProp && ownerIdProp !== 'undefined' && ownerIdProp !== 'null') {
    return String(ownerIdProp);
  }

  // Niveau 2: Task object (plusieurs chemins possibles)
  if (task) {
    const fromTask = task.ownerId || task.owner?._id || task.owner?.id || task.__owner?._id || task.__owner?.id || task.ownerCode || task.data?.ownerId || task.__reservation?.ownerId || task.reservation?.ownerId;
    if (fromTask && fromTask !== 'undefined' && fromTask !== 'null') {
      return String(fromTask);
    }
  }

  // Niveau 3: utilisateur connecté (useAuth)
  if (sessionUser) {
    const fromSession =
      sessionUser.ownerId ||
      sessionUser.theOwnerId ||
      sessionUser._id ||
      sessionUser.id;
    if (fromSession && fromSession !== 'undefined' && fromSession !== 'null') {
      return String(fromSession);
    }
  }

  // Niveau 4: LocalStorage (fallback ultime)
  try {
    const userId = localStorage.getItem('userId');
    if (userId && userId !== 'undefined' && userId !== 'null') {
      return String(userId);
    }
  } catch (e) {}

  // Si aucune source ne fonctionne, logger et retourner null

  return null;
};

/** Aligné TaskDetailDrawer : listing souvent sous __listing / data */
function resolveListingIdForStaffApi(raw) {
  if (!raw) return '';
  const id = raw.listingId || raw.data?.listingId || raw.__listing?.id || raw.__listing?.listingId || raw.__reservation?.listingId || raw.listing?.id || raw.listing?._id;
  return id != null && id !== '' ? String(id) : '';
}

/** Backend findTaskInAllCollections : ObjectId OU code SM-/ST-/SR-/SC- */
function resolveTaskIdForStaffApi(task) {
  if (!task) return null;
  const id = task._id != null ? String(task._id).trim() : '';
  if (/^[0-9a-fA-F]{24}$/.test(id)) return id;
  const code = String(task.itemNumber || task.taskCode || task.timeslotCode || task.itemCode || task.requestNumber || '').trim();
  return code || null;
}
/** Palette « Atelier 2026 » — alignée TasksListPage / ReservationsPage */
const SOJORI_COLORS = {
  primary: '#b8851a',
  primaryDark: '#876119',
  primaryPale: 'rgba(184,133,26,0.10)',
};

/**
 * Panneau latéral droit (comme TaskDetailDrawer) — uniquement assignation staff, pas de détail tâche.
 * Export inchangé : AssignStaffDialog (TasksNew, TaskEditModal).
 */
const AssignStaffDialog = ({
  open,
  onClose,
  task,
  onSuccess,
  ownerId: ownerIdProp,
  useFulltaskApi = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')) || useMediaQuery('(max-width: 900px)');

  const { user: authUser } = useAuth();
  const [availableStaff, setAvailableStaff] = useState([]);
  const [unavailableStaff, setUnavailableStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [listingTaskLine, setListingTaskLine] = useState('');
  const [staffSummary, setStaffSummary] = useState('');
  const [checkListing, setCheckListing] = useState(true);
  const [checkTaskType, setCheckTaskType] = useState(true);
  const [checkPlanning, setCheckPlanning] = useState(true);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [panelError, setPanelError] = useState('');
  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setSelectedStaff(null);
      setShowUnavailable(false);
      setPanelError('');
    }
  }, [open]);
  useEffect(() => {
    if (open && task) {
      fetchStaff();
    }
  }, [open, task, checkListing, checkTaskType, checkPlanning]);
  const fetchStaff = async () => {
    setLoading(true);
    setListingTaskLine('');
    setStaffSummary('');
    setPanelError('');
    try {
      const token = getAuthToken();
      if (!token) {
        setAvailableStaff([]);
        setUnavailableStaff([]);
        setPanelError('Session expirée — reconnectez-vous.');
        return;
      }

      if (useFulltaskApi) {
        const { listStaff } = await import('../../../services/fulltaskApi');
        const listingId = resolveListingIdForStaffApi(task);
        const res = await listStaff(listingId ? { listingId } : {});
        const taskTypeId = task?.subType || task?.type;
        const rows = (res?.data || [])
          .filter((s) => {
            if (!taskTypeId || !Array.isArray(s.taskTypes) || s.taskTypes.length === 0) return true;
            return s.taskTypes.includes(String(taskTypeId));
          })
          .map((s) => ({
            _id: s._id,
            staffCode: String(s._id),
            staffName: s.name,
            staffPhone: s.phone,
          }));
        setAvailableStaff(rows);
        setUnavailableStaff([]);
        const typeLabel = taskTypeId ? labelForTaskTypeId(String(taskTypeId)) : '';
        setListingTaskLine(
          [task?.listingName, typeLabel || taskTypeId].filter(Boolean).join(' · ') || '',
        );
        setStaffSummary(`${rows.length} membre(s) éligible(s)`);
        return;
      }

      const params = new URLSearchParams({
        checkListing: checkListing.toString(),
        checkTaskType: checkTaskType.toString(),
        checkPlanning: checkPlanning.toString()
      });
      const fallbackListingId = resolveListingIdForStaffApi(task);
      const fallbackTaskType = task.type || task.taskType || task.subType || task.category || task.name;
      if (fallbackListingId) params.set('listingId', fallbackListingId);
      // ✅ FIX: Convertir en minuscules pour matcher avec la DB (arrival, departure, cleaning, registration)
      if (fallbackTaskType) params.set('taskType', String(fallbackTaskType).toLowerCase());
      if (task.category) params.set('taskCategory', String(task.category));

      // ✅ AJOUTER LES DATES COMME DANS SmartStaffSelector
      if (task.date) {
        const taskDate = new Date(task.date);
        params.set('startDate', taskDate.toISOString());
      }
      if (task.startTime) params.set('startTime', task.startTime);
      if (task.endTime) params.set('endTime', task.endTime);

      // 🛡️ ROBUSTESSE - Utiliser fonction avec fallbacks multiples
      const resolvedOwnerId = resolveOwnerIdRobust(ownerIdProp, task, authUser);
      if (resolvedOwnerId) {
        params.set('ownerId', resolvedOwnerId);
      } else {}

      // ⚠️ NE PAS passer taskId si c'est un code SM- car l'API essaie de le convertir en ObjectId
      // Depuis orchestrator, on n'a pas de vraie tâche, juste un timeslot
      const taskIdForApi = resolveTaskIdForStaffApi(task);
      // Seulement passer taskId si c'est un vrai ObjectId MongoDB (24 caractères hex)
      if (taskIdForApi && /^[0-9a-fA-F]{24}$/.test(taskIdForApi)) {
        params.set('taskId', taskIdForApi);
      } else if (taskIdForApi) {}
      const fullUrl = `${MICROSERVICE_BASE_URL.SRV_FULLTASK}/staff-simplified/available-for-task?${params}`;
      const response = await axios.get(fullUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data.success) {
        const payload = response.data.data || {};
        const {
          staffs
        } = payload;
        const availableList = Array.isArray(staffs?.available) ? staffs.available : [];
        const unavailableList = Array.isArray(staffs?.unavailable) ? staffs.unavailable : [];
        setAvailableStaff(availableList);
        setUnavailableStaff(unavailableList);
        setListingTaskLine(payload.context?.listingTaskLine || payload.listing_task_line || '');
        setStaffSummary(payload.staff_summary || '');
      } else {}
    } catch (error) {
      setAvailableStaff([]);
      setUnavailableStaff([]);
      setPanelError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          'Impossible de charger le staff',
      );
    } finally {
      setLoading(false);
    }
  };
  const handleAssign = async () => {
    if (!selectedStaff) return;
    const token = getAuthToken();
    if (!token) {
      setPanelError('Session expirée. Reconnectez-vous pour assigner un staff.');
      return;
    }
    setAssigning(true);
    setPanelError('');
    try {
      if (useFulltaskApi) {
        const taskId = task._id;
        if (!taskId) throw new Error('Identifiant tâche manquant');
        const { assignTask } = await import('../../../services/fulltaskApi');
        const staffId = selectedStaff._id || selectedStaff.staffCode;
        const res = await assignTask(taskId, staffId);
        if (res?.success === false) throw new Error(res?.error || 'Assignation refusée');
        onSuccess(selectedStaff);
        onClose();
        return;
      }

      const assignId = resolveTaskIdForStaffApi(task) || task.itemNumber || task.taskCode || task._id;
      const response = await axios.put(`${API_BASE_URL}/api/v1/task/tasks/${assignId}/assign`, {
        staffCode: selectedStaff.staffCode,
        reservationNumber: task.reservationNumber || task.reservation?.number || null
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data.success) {
        onSuccess(selectedStaff);
        onClose();
      } else {
        setPanelError(response.data?.message || 'Assignation refusée');
      }
    } catch (error) {
      setPanelError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          'Erreur lors de l\'assignation de la tâche',
      );
    } finally {
      setAssigning(false);
    }
  };
  const filterStaffBySearch = staffList => {
    if (!searchTerm) return staffList;
    const search = searchTerm.toLowerCase();
    return staffList.filter(s => s.staffName?.toLowerCase().includes(search) || s.staffCode?.toLowerCase().includes(search) || s.staffPhone?.includes(search));
  };
  const filteredAvailable = filterStaffBySearch(availableStaff);
  const filteredUnavailable = filterStaffBySearch(unavailableStaff);
  if (!open || !task) return null;
  return <>
      <div role="presentation" onClick={() => {
      if (!assigning) onClose();
    }} style={{
      position: 'fixed',
      inset: 0,
      zIndex: 15020,
      background: 'rgba(15, 23, 42, 0.35)'
    }} />

      <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      left: isMobile ? 0 : undefined,
      bottom: 0,
      width: isMobile ? '100%' : 440,
      maxWidth: '100%',
      zIndex: 15021,
      background: '#fff',
      boxShadow: isMobile ? 'none' : '-4px 0 32px rgba(0,0,0,0.14)',
      display: 'flex',
      flexDirection: 'column',
      animation: isMobile ? 'assignSlideUp 0.28s ease-out' : 'assignSlideIn 0.22s ease-out',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      paddingTop: isMobile ? 'env(safe-area-inset-top, 0px)' : undefined
    }}>
        {/* En-tête — même esprit que TaskDetailDrawer, sans contenu détail */}
        <div style={{
        padding: isMobile ? '12px 14px' : '14px 18px',
        background: `linear-gradient(135deg, ${SOJORI_COLORS.primary} 0%, ${SOJORI_COLORS.primaryDark} 100%)`,
        color: '#fff',
        flexShrink: 0
      }}>
          <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 10
        }}>
            <div style={{
            minWidth: 0
          }}>
              <div style={{
              fontWeight: 700,
              fontSize: isMobile ? 15 : 16,
              marginBottom: 4
            }}>
                Assigner un staff
              </div>
              <div style={{
              fontSize: 11,
              opacity: 0.9,
              fontFamily: 'monospace',
              marginBottom: 2
            }}>
                {task?.itemNumber || task?.taskCode || '—'}
              </div>
              <div style={{
              fontSize: 12,
              opacity: 0.88,
              lineHeight: 1.35,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
                {listingTaskLine || [task?.listingName, (task?.type || task?.name)?.toLowerCase?.()].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>
            <button type="button" onClick={() => {
            if (!assigning) onClose();
          }} style={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: 8,
            border: 'none',
            background: 'rgba(255,255,255,0.22)',
            cursor: assigning ? 'default' : 'pointer',
            color: '#fff',
            fontSize: 22,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }} aria-label="Fermer">
              ×
            </button>
          </div>
        </div>

        {/* Corps scrollable — filtres + recherche + listes */}
        <div style={{
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: isMobile ? '12px 14px' : '14px 16px'
      }}>
          {panelError ? (
            <Box sx={{ mb: 1.5, p: 1.25, bgcolor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 1.5, fontSize: 12, color: '#b91c1c' }}>
              {panelError}
            </Box>
          ) : null}
          {!useFulltaskApi ? (
            <Box sx={{ mb: 1.5, p: 1.25, bgcolor: SOJORI_COLORS.primaryPale, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <FilterListIcon sx={{ color: SOJORI_COLORS.primary, fontSize: 18, mr: 0.5 }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: SOJORI_COLORS.primary }}>
                  Filtres intelligents
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={checkListing}
                      onChange={(e) => setCheckListing(e.target.checked)}
                      sx={{
                        color: SOJORI_COLORS.primary,
                        '&.Mui-checked': { color: SOJORI_COLORS.primary },
                        padding: '4px',
                      }}
                    />
                  }
                  label={<Typography variant="caption" sx={{ fontSize: '11px' }}>Listing</Typography>}
                  sx={{ mr: 0.5 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={checkTaskType}
                      onChange={(e) => setCheckTaskType(e.target.checked)}
                      sx={{
                        color: SOJORI_COLORS.primary,
                        '&.Mui-checked': { color: SOJORI_COLORS.primary },
                        padding: '4px',
                      }}
                    />
                  }
                  label={<Typography variant="caption" sx={{ fontSize: '11px' }}>Type tâche</Typography>}
                  sx={{ mr: 0.5 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={checkPlanning}
                      onChange={(e) => setCheckPlanning(e.target.checked)}
                      sx={{
                        color: SOJORI_COLORS.primary,
                        '&.Mui-checked': { color: SOJORI_COLORS.primary },
                        padding: '4px',
                      }}
                    />
                  }
                  label={<Typography variant="caption" sx={{ fontSize: '11px' }}>Planning</Typography>}
                />
              </Box>
              {staffSummary ? (
                <Typography variant="caption" sx={{ color: '#0f766e', fontSize: '10px', display: 'block', mt: 0.75 }}>
                  {staffSummary}
                </Typography>
              ) : null}
            </Box>
          ) : staffSummary ? (
            <Typography variant="caption" sx={{ color: '#0f766e', fontSize: '11px', display: 'block', mb: 1 }}>
              {staffSummary}
            </Typography>
          ) : null}

          <TextField fullWidth size="small" placeholder="Rechercher un staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} slotProps={{
          input: {
            startAdornment: <InputAdornment position="start">
                  <SearchIcon style={{
              color: SOJORI_COLORS.primary,
              fontSize: 18
            }} />
                </InputAdornment>
          }
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

          {loading ? <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '48px 0'
        }}>
              <CircularProgress style={{
            color: SOJORI_COLORS.primary
          }} />
            </div> : <>
              {filteredAvailable.length > 0 && <>
                  <div style={{
              fontWeight: 600,
              marginBottom: '6px',
              color: '#10b981',
              fontSize: '13px'
            }}>
                    Disponibles ({filteredAvailable.length})
                  </div>
                  <List sx={{
              maxHeight: 'min(42vh, 320px)',
              overflow: 'auto',
              mb: 1.5,
              py: 0
            }}>
                    {filteredAvailable.map(s => <ListItem key={s._id} disablePadding sx={{
                mb: 0.75
              }}>
                        <ListItemButton selected={selectedStaff?._id === s._id} onClick={() => setSelectedStaff(s)} sx={{
                  borderRadius: '8px',
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
                          <ListItemText
                            primaryTypographyProps={{ component: 'div' }}
                            secondaryTypographyProps={{ component: 'div' }}
                            primary={<div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap',
                    marginBottom: '4px'
                  }}>
                                <span style={{
                      fontWeight: 600,
                      fontSize: '13px'
                    }}>{s.staffName}</span>
                                <Chip label={s.staffCode} size="small" sx={{
                      fontSize: '9px',
                      height: 18,
                      bgcolor: SOJORI_COLORS.primary,
                      color: 'white'
                    }} />
                                <Chip label={s.memberRole || 'Staff'} size="small" sx={{
                      fontSize: '9px',
                      height: 18,
                      bgcolor: s.memberRole === 'Manager' ? '#8b5cf6' : '#64748b',
                      color: 'white'
                    }} />
                                <Chip label={`${s.score} pts`} size="small" sx={{
                      fontSize: '9px',
                      height: 18,
                      bgcolor: '#10b981',
                      color: 'white'
                    }} />
                              </div>} secondary={<div style={{
                    marginTop: '4px'
                  }}>
                                {s.staffPhone && <div style={{
                      fontSize: '10px',
                      marginBottom: '2px'
                    }}>{s.staffPhone}</div>}
                                {s.reasons?.map((reason, idx) => <div key={`reason-${s._id}-${idx}`} style={{
                      fontSize: '10px',
                      color: '#64748b',
                      marginBottom: '2px'
                    }}>
                                    {reason}
                                  </div>)}
                              </div>} />
                          {selectedStaff?._id === s._id && <CheckIcon style={{
                    color: SOJORI_COLORS.primary
                  }} />}
                        </ListItemButton>
                      </ListItem>)}
                  </List>
                </>}

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
                      Occupés / conflit ({filteredUnavailable.length})
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
                maxHeight: 160,
                overflow: 'auto',
                opacity: 0.65,
                py: 0
              }}>
                      {filteredUnavailable.map(s => <ListItem key={s._id} disablePadding sx={{
                  mb: 0.5
                }}>
                          <ListItemButton disabled sx={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                            <ListItemAvatar>
                              <Avatar sx={{
                        bgcolor: '#cbd5e1'
                      }}>
                                {s.staffName?.charAt(0)?.toUpperCase() || 'S'}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              secondaryTypographyProps={{ component: 'div' }}
                              primary={<span style={{
                      fontWeight: 600,
                      fontSize: '13px'
                    }}>{s.staffName}</span>} secondary={<div style={{
                      marginTop: '4px'
                    }}>
                                  {s.reasons?.map((reason, idx) => <div key={`u-${s._id}-${idx}`} style={{
                        fontSize: '10px',
                        color: '#64748b'
                      }}>
                                      {reason}
                                    </div>)}
                                </div>} />
                          </ListItemButton>
                        </ListItem>)}
                    </List>
                  </Collapse>
                </>}

              {filteredAvailable.length === 0 && filteredUnavailable.length === 0 && !loading && <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px 0'
          }}>
                  <PersonIcon style={{
              fontSize: 44,
              color: '#cbd5e1',
              marginBottom: 8
            }} />
                  <span style={{
              fontSize: '14px',
              color: '#64748b'
            }}>Aucun staff trouvé</span>
                </div>}
            </>}
        </div>

        {/* Pied fixe */}
        <div style={{
        flexShrink: 0,
        padding: isMobile ? '10px 14px 14px' : '12px 16px 16px',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        gap: 10,
        background: '#fafafa'
      }}>
          <Button fullWidth variant="outlined" onClick={onClose} disabled={assigning} sx={{
          textTransform: 'none',
          borderColor: '#cbd5e1',
          color: '#64748b'
        }}>
            Annuler
          </Button>
          <Button fullWidth variant="contained" onClick={handleAssign} disabled={!selectedStaff || assigning} sx={{
          textTransform: 'none',
          bgcolor: `${SOJORI_COLORS.primary} !important`,
          '&:hover': {
            bgcolor: `${SOJORI_COLORS.primaryDark} !important`
          }
        }}>
            {assigning ? <>
                <CircularProgress size={18} sx={{
              color: 'white',
              mr: 1
            }} />
                Assignation…
              </> : 'Assigner'}
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes assignSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes assignSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </>;
};
export default AssignStaffDialog;
