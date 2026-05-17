// ════════════════════════════════════════════════════════════════════
// Sojori · Orchestration — Modale Réassignation Staff
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  Avatar,
  Chip,
} from '@mui/material';
import axios from 'axios';
import { API_BASE_URL as API_URL } from '../../../config/backendServer.config';
import { toast } from 'react-toastify';

const ReassignStaffModal = ({ open, onClose, actionId, reservationNumber, onRefresh }) => {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !actionId) return;

    const fetchAvailableStaff = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Appel API pour récupérer la liste du staff disponible
        const url = `${API_URL}/api/v1/orchestrator/staff/available`;
        const response = await axios.get(url, {
          params: { reservationNumber, actionId },
          timeout: 10000,
        });

        if (response.data?.success) {
          setStaffList(response.data.data || []);
        } else {
          setError(response.data?.error || 'Erreur lors du chargement');
        }
      } catch (err) {
        console.error('[ReassignStaffModal] Error fetching staff:', err);
        setError(err.response?.data?.error || err.message || 'Erreur réseau');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAvailableStaff();
  }, [open, actionId, reservationNumber]);

  const handleReassign = async () => {
    if (!selectedStaffId) {
      toast.error('Veuillez sélectionner un membre du staff', {
        position: 'bottom-right',
        autoClose: 3000,
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const url = `${API_URL}/api/v1/orchestrator/actions/${actionId}/reassign-manual`;
      const response = await axios.post(
        url,
        {
          reservationNumber,
          staffId: selectedStaffId,
        },
        { timeout: 15000 }
      );

      if (response.data?.success) {
        const staffName = response.data?.data?.staffName || 'Staff';
        toast.success(`Réassigné à ${staffName}`, {
          position: 'bottom-right',
          autoClose: 3000,
        });

        onClose();
        if (onRefresh) await onRefresh();
      } else {
        toast.error(response.data?.error || 'Erreur lors de la réassignation', {
          position: 'bottom-right',
          autoClose: 5000,
        });
      }
    } catch (err) {
      console.error('[ReassignStaffModal] Error reassigning staff:', err);
      toast.error(`Échec: ${err.response?.data?.error || err.message}`, {
        position: 'bottom-right',
        autoClose: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAvailabilityColor = (availability) => {
    switch (availability) {
      case 'AVAILABLE':
        return 'success';
      case 'BUSY':
        return 'warning';
      case 'UNAVAILABLE':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          bgcolor: 'var(--bg-paper, #fff)',
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: 1, borderColor: 'var(--border, #e0e0e0)', pb: 2 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 700, color: 'var(--text-h)' }}>
          👤 Réassigner le staff
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'var(--text-muted)', mt: 0.5 }}>
          Sélectionnez un membre du staff pour cette tâche
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : staffList.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'var(--text-muted)' }}>
            <Typography sx={{ fontSize: 14 }}>
              Aucun staff disponible
            </Typography>
          </Box>
        ) : (
          <RadioGroup value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {staffList.map((staff) => (
                <FormControlLabel
                  key={staff.id}
                  value={staff.id}
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 1 }}>
                      <Avatar
                        src={staff.avatar}
                        sx={{ width: 36, height: 36, bgcolor: 'var(--accent, #2563eb)' }}
                      >
                        {staff.name?.charAt(0)?.toUpperCase() || '?'}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)' }}>
                          {staff.name || 'N/A'}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {staff.role || 'Staff'} · {staff.tasksCount || 0} tâche(s) en cours
                        </Typography>
                      </Box>
                      <Chip
                        label={staff.availability || 'N/A'}
                        color={getAvailabilityColor(staff.availability)}
                        size="small"
                        sx={{ height: 22, fontSize: 10.5, fontWeight: 600 }}
                      />
                    </Box>
                  }
                  sx={{
                    m: 0,
                    p: 1.5,
                    border: 1,
                    borderColor: selectedStaffId === staff.id ? 'var(--accent, #2563eb)' : 'var(--border, #e0e0e0)',
                    borderRadius: 1.5,
                    bgcolor: selectedStaffId === staff.id ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                    '&:hover': {
                      bgcolor: 'var(--bg, #fafafa)',
                    },
                  }}
                />
              ))}
            </Box>
          </RadioGroup>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: 1, borderColor: 'var(--border, #e0e0e0)', p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button
          onClick={handleReassign}
          variant="contained"
          sx={{ textTransform: 'none', bgcolor: 'var(--accent, #2563eb)' }}
          disabled={!selectedStaffId || isSubmitting}
        >
          {isSubmitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Réassigner'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReassignStaffModal;
