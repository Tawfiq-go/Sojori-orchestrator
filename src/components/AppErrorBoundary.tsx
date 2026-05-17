import React from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { runtimeLog } from '../utils/runtimeLog';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AppErrorBoundary caught render error', { error, errorInfo });
    runtimeLog('error', 'React', `ErrorBoundary: ${error.message}`, {
      stack: error.stack?.slice(0, 500),
      componentStack: errorInfo.componentStack?.slice(0, 500),
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#fbfaf6',
            p: 3,
          }}
        >
          <Stack spacing={2} sx={{ width: '100%', maxWidth: 560 }}>
            <Alert severity="error">
              Un composant a plante. Le dashboard a ete mis en securite au lieu d'afficher une page blanche.
            </Alert>
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>
              Une erreur React a ete capturee.
            </Typography>
            <Typography color="text.secondary">
              Recharge la page pour repartir proprement. Si le probleme revient, il faut corriger le composant concerne.
            </Typography>
            <Button variant="contained" onClick={this.handleReload}>
              Recharger la page
            </Button>
          </Stack>
        </Box>
      );
    }

    return this.props.children;
  }
}
