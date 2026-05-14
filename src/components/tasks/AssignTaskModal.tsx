import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { toast } from 'react-toastify';
import { tokens as t, btnPrimarySx, btnGhostSx } from '../dashboard/DashboardV2.components';
import type { Task } from '../../data/mockTasks';
import type { TeamMember } from '../team/AddTeamMemberModal';

interface AssignTaskModalProps {
  open: boolean;
  onClose: () => void;
  task: Task | null;
  staff: TeamMember[];
  onTaskUpdated: (updatedTask: Task) => void;
}

/**
 * AssignTaskModal - Modal pour assigner ou réassigner un staff à une task
 *
 * Basé sur: sojori-dashboard/src/features/tasks/components/Calendar/AssignTask.jsx
 *
 * Features:
 * - Affiche le staff actuellement assigné (si existant)
 * - Select avec liste complète des staff members
 * - Disabled si même staffId sélectionné
 * - API call: AssignTaskToStaff (à implémenter)
 * - Loading state pendant save
 * - Error handling avec toast
 *
 * @example
 * ```tsx
 * <AssignTaskModal
 *   open={assignModalOpen}
 *   onClose={() => setAssignModalOpen(false)}
 *   task={selectedTask}
 *   staff={teamMembers}
 *   onTaskUpdated={(updated) => {
 *     setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
 *   }}
 * />
 * ```
 */
export function AssignTaskModal({
  open,
  onClose,
  task,
  staff,
  onTaskUpdated,
}: AssignTaskModalProps) {
  const [staffId, setStaffId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync staffId avec task.staffId quand task change
  useEffect(() => {
    if (task && task.staffId) {
      setStaffId(task.staffId);
    } else {
      setStaffId('');
    }
  }, [task]);

  const handleChange = (event: any) => {
    setStaffId(event.target.value);
    setError(null);
  };

  const handleSave = async () => {
    if (!task || !task.id) {
      setError('Invalid task ID.');
      toast.error('Invalid task ID.');
      return;
    }

    if (!staffId) {
      setError('Please select a staff member.');
      toast.error('Please select a staff member.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Remplacer par vraie API call
      // const response = await AssignTaskToStaff(task.id, staffId);

      // MOCK: Simuler API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simuler succès
      const isUpdate = !!task.staffId;
      const updatedTask = { ...task, staffId };

      toast.success(
        isUpdate ? 'Task staff updated successfully' : 'Task assigned successfully'
      );

      onTaskUpdated(updatedTask);
      onClose();
    } catch (err: any) {
      const errorMsg = 'Failed to assign/update task. Please try again.';
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!task) return null;

  const currentStaff = task.staffId ? staff.find((s) => s.id === task.staffId) : null;
  const isUpdate = !!task.staffId;
  const isSameStaff = task.staffId === staffId;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          bgcolor: t.bg1,
        },
      }}
    >
      <DialogTitle
        sx={{
          borderBottom: `1px solid ${t.border}`,
          pb: 2,
          fontSize: 18,
          fontWeight: 700,
          color: t.text,
        }}
      >
        {isUpdate ? 'Update Task Assignment' : 'Assign Task'}
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {/* Task Info */}
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontSize: 14, color: t.text2, mb: 0.5 }}>
            Task: <strong>{task.name}</strong>
          </Typography>
          <Typography sx={{ fontSize: 13, color: t.text3 }}>
            {task.type} • {task.subType}
          </Typography>
        </Box>

        {/* Currently Assigned (si existant) */}
        {currentStaff && (
          <Box
            sx={{
              mb: 3,
              p: 1.5,
              borderRadius: '8px',
              bgcolor: t.bg2,
              border: `1px solid ${t.border}`,
            }}
          >
            <Typography sx={{ fontSize: 12, color: t.text3, mb: 0.5 }}>
              Currently assigned to:
            </Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.text }}>
              {currentStaff.firstName} {currentStaff.lastName}
            </Typography>
            <Typography sx={{ fontSize: 12, color: t.text3 }}>
              {currentStaff.staffCode} • {currentStaff.role}
            </Typography>
          </Box>
        )}

        {/* Staff Select */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="staff-select-label">Staff Member</InputLabel>
          <Select
            labelId="staff-select-label"
            id="staff-select"
            value={staffId}
            label="Staff Member"
            onChange={handleChange}
            disabled={isLoading}
          >
            {staff.length === 0 ? (
              <MenuItem disabled>No staff members available</MenuItem>
            ) : (
              staff.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 500 }}>
                      {member.firstName} {member.lastName}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: t.text3 }}>
                      {member.staffCode} • {member.role} • {member.zone}
                    </Typography>
                  </Box>
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>

        {/* Error Message */}
        {error && (
          <Typography sx={{ color: 'error.main', fontSize: 13, mt: 1 }}>
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          borderTop: `1px solid ${t.border}`,
          p: 2,
          gap: 1,
        }}
      >
        <Button onClick={onClose} sx={btnGhostSx} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          sx={btnPrimarySx}
          disabled={isLoading || !staffId || isSameStaff}
          startIcon={isLoading ? <CircularProgress size={16} /> : null}
        >
          {isLoading ? 'Saving...' : isUpdate ? 'Update Assignment' : 'Assign Task'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
