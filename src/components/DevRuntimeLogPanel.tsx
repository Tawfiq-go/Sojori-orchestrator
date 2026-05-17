import { useEffect, useState } from 'react';
import { Box, Button, Chip, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import MinimizeIcon from '@mui/icons-material/Minimize';
import {
  clearRuntimeLogs,
  getRuntimeLogs,
  isRuntimeLogPanelEnabled,
  subscribeRuntimeLogs,
  type RuntimeLogEntry,
} from '../utils/runtimeLog';

function levelColor(level: RuntimeLogEntry['level']): string {
  if (level === 'error') return '#fecaca';
  if (level === 'warn') return '#fef3c7';
  return '#e5e7eb';
}

export function DevRuntimeLogPanel() {
  const [open, setOpen] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => subscribeRuntimeLogs(() => setTick((n) => n + 1)), []);

  const logs = [...getRuntimeLogs()].reverse();

  if (!isRuntimeLogPanelEnabled()) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        right: 12,
        bottom: open ? 12 : 48,
        zIndex: 10000,
        maxWidth: { xs: 'calc(100vw - 24px)', sm: 440 },
        width: open ? { xs: 'calc(100vw - 24px)', sm: 440 } : 'auto',
        pointerEvents: 'auto',
      }}
    >
      {open ? (
        <Paper
          elevation={8}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'min(42vh, 320px)',
            bgcolor: 'rgba(17,24,39,0.94)',
            color: '#f9fafb',
            border: '1px solid rgba(255,255,255,0.12)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1.25,
              py: 0.75,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              flexShrink: 0,
              gap: 1,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
              Runtime logs
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 0.5 }}>
              <Button
                size="small"
                variant="text"
                sx={{ color: '#93c5fd', minWidth: 0, fontSize: 11 }}
                onClick={() => clearRuntimeLogs()}
              >
                Effacer
              </Button>
              <Tooltip title="Réduire">
                <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: '#e5e7eb' }}>
                  <MinimizeIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 1,
              flex: 1,
              overflow: 'auto',
              fontSize: 10,
              lineHeight: 1.45,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {logs.length === 0 ? (
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                Aucun log encore. Navigation / Analytics / erreurs apparaissent ici.
              </Typography>
            ) : (
              logs.map((e) => (
                <Box
                  key={e.id}
                  sx={{
                    mb: 0.75,
                    pb: 0.75,
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 0.5,
                      mb: 0.25,
                    }}
                  >
                    <Chip
                      label={e.level}
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: 9,
                        bgcolor: levelColor(e.level),
                        color: '#111827',
                      }}
                    />
                    <Typography component="span" sx={{ fontSize: 10, color: '#9ca3af' }}>
                      {e.ts}
                    </Typography>
                    <Typography component="span" sx={{ fontSize: 10, color: '#a5b4fc', fontWeight: 600 }}>
                      {e.tag}
                    </Typography>
                  </Box>
                  <Typography component="span" sx={{ fontSize: 10, color: '#f3f4f6' }}>
                    {e.message}
                  </Typography>
                  {e.detail !== undefined && (
                    <Typography
                      component="div"
                      sx={{ mt: 0.25, fontSize: 9, color: '#d1d5db', opacity: 0.95 }}
                    >
                      {typeof e.detail === 'string'
                        ? e.detail
                        : JSON.stringify(e.detail, null, 0)}
                    </Typography>
                  )}
                </Box>
              ))
            )}
          </Box>
        </Paper>
      ) : (
        <Tooltip title="Afficher les logs runtime">
          <Button
            size="small"
            variant="contained"
            onClick={() => setOpen(true)}
            sx={{
              fontSize: 11,
              textTransform: 'none',
              bgcolor: 'rgba(17,24,39,0.92)',
              color: '#f9fafb',
              boxShadow: 4,
            }}
          >
            Logs ({getRuntimeLogs().length})
          </Button>
        </Tooltip>
      )}
    </Box>
  );
}
