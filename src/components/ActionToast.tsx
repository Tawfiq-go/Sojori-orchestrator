import { useCallback, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

interface ToastState {
  open: boolean;
  message: string;
  severity: ToastSeverity;
}

const initialState: ToastState = {
  open: false,
  message: '',
  severity: 'success',
};

export function useActionToast() {
  const [toast, setToast] = useState<ToastState>(initialState);

  const showToast = useCallback((message: string, severity: ToastSeverity = 'success') => {
    setToast({ open: true, message, severity });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    toast,
    showToast,
    hideToast,
  };
}

interface ActionToastProps {
  open: boolean;
  message: string;
  severity?: ToastSeverity;
  onClose: () => void;
}

export function ActionToast({
  open,
  message,
  severity = 'success',
  onClose,
}: ActionToastProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={3200}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
