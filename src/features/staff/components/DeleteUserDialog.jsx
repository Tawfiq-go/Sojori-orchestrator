import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BlockIcon from '@mui/icons-material/Block';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-toastify';
import { deleteStaff } from '../services/serverApi.task';
const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  warning: '#FF9800',
  error: '#F44336'
};
const DeleteUserDialog = ({
  user,
  open,
  onClose,
  functionToExecute,
  title,
  message,
  btnTxt,
  btnClass
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async () => {
    // setIsLoading(true);
    // try {
    //   const response = user?.clerkId && (await deleteStaff(user?.clerkId));

    //   if (response) {
    //     onAdminCreated();
    //     onClose();
    //   } else {
    //     throw new Error('Unexpected response structure');
    //   }
    // } catch (error) {
    //   toast.error(
    //     (error.response?.data?.error &&
    //       error.response?.data?.error.length &&
    //       error.response?.data?.error[0]?.message) ||
    //       error.response?.data?.message ||
    //       'Failed to delete admin',
    //   );
    //   onClose();
    // } finally {
    //   setIsLoading(false);
    //   onClose();
    // }

    setIsLoading(true);
    try {
      functionToExecute();
    } catch (error) {
      toast.error(error.response?.data?.error && error.response?.data?.error.length && error.response?.data?.error[0]?.message || error.response?.data?.message || 'Failed to delete admin');
      onClose();
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  // Determine icon based on button text - but always use orange color
  const isDelete = btnTxt?.toLowerCase().includes('supprimer');
  const isBlock = btnTxt?.toLowerCase().includes('bloquer');
  const ActionIcon = isDelete ? DeleteIcon : isBlock ? BlockIcon : WarningAmberIcon;
  return <Dialog open={open} onClose={onClose} maxWidth="xs" PaperProps={{
    sx: {
      borderRadius: '12px',
      maxWidth: '400px'
    }
  }}>
      {/* Header */}
      <DialogTitle sx={{
      padding: 0
    }}>
        <div className="flex items-center justify-between p-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ActionIcon style={{
            color: SOJORI_COLORS.primary,
            fontSize: 24
          }} />
            <h3 className="text-lg font-bold text-slate-800">
              {title}
            </h3>
          </div>
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{
      padding: '20px 24px'
    }}>
        <Typography className="text-slate-700 text-sm">
          {message}
        </Typography>
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{
      padding: '12px 16px',
      borderTop: '1px solid #e5e7eb',
      bgcolor: '#f9fafb',
      gap: 1
    }}>
        <Button onClick={onClose} variant="outlined" disabled={isLoading} sx={{
        flex: 1,
        borderRadius: '8px',
        borderColor: '#d1d5db',
        color: '#6b7280',
        textTransform: 'none',
        fontWeight: 500,
        '&:hover': {
          borderColor: '#9ca3af',
          backgroundColor: '#f3f4f6'
        }
      }}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading} variant="contained" sx={{
        flex: 1,
        borderRadius: '8px',
        background: `linear-gradient(to right, ${SOJORI_COLORS.primary}, ${SOJORI_COLORS.primaryDark})`,
        textTransform: 'none',
        fontWeight: 600,
        color: 'white',
        boxShadow: '0 4px 6px rgba(255, 107, 53, 0.25)',
        '&:hover': {
          background: `linear-gradient(to right, ${SOJORI_COLORS.primaryDark}, #D44920)`,
          boxShadow: '0 6px 8px rgba(255, 107, 53, 0.35)'
        },
        '&:disabled': {
          background: '#d1d5db',
          color: '#9ca3af'
        }
      }}>
          {isLoading ? `${btnTxt}...` : btnTxt}
        </Button>
      </DialogActions>
    </Dialog>;
};
export default DeleteUserDialog;
