/**
 * Liste route par route — accès lecture / écriture du worker.
 */
import React, { useMemo, useState } from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import {
  buildOwnerRouteRows,
  summarizeWorkerRouteAccess,
} from '../../utils/ownerRoutePermissions';
import { tokens as t } from '../dashboard/DashboardV2.components';

function AccessPill({ ok, label }) {
  return (
    <Chip
      size="small"
      label={label}
      sx={{
        height: 20,
        fontSize: 10,
        fontWeight: 700,
        bgcolor: ok ? t.successTint : t.bg2,
        color: ok ? t.success : t.text3,
        border: `1px solid ${ok ? 'rgba(34,139,34,0.25)' : t.border}`,
      }}
    />
  );
}

export function WorkerRouteAccessMatrix({ worker, compact = false, defaultExpanded = false }) {
  const routes = useMemo(() => buildOwnerRouteRows(), []);
  const summary = useMemo(
    () => summarizeWorkerRouteAccess(worker, routes),
    [worker, routes],
  );
  const [expanded, setExpanded] = useState(defaultExpanded);
  const visible = compact && !expanded ? summary.rows.slice(0, 8) : summary.rows;

  if (summary.adminAccess) {
    return (
      <Box
        sx={{
          mt: 1,
          p: 1,
          borderRadius: 1,
          bgcolor: t.primaryTint,
          border: `1px solid ${t.border}`,
        }}
      >
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.primaryDeep }}>
          Accès complet (toutes les routes Owner)
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 1 }}>
      <Stack direction="row" spacing={0.75} sx={{ mb: 0.75, flexWrap: 'wrap' }} useFlexGap>
        <Chip
          size="small"
          label={`${summary.readCount}/${summary.total} lecture`}
          sx={{ height: 22, fontSize: 10, fontWeight: 700, bgcolor: t.bg2 }}
        />
        <Chip
          size="small"
          label={`${summary.writeCount}/${summary.total} écriture`}
          sx={{ height: 22, fontSize: 10, fontWeight: 700, bgcolor: t.bg2 }}
        />
      </Stack>

      <Box
        sx={{
          border: `1px solid ${t.border}`,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: t.bg1,
        }}
      >
        {visible.map((row) => (
          <Stack
            key={row.featureKey}
            direction="row"
            spacing={1}
            sx={{
              px: 1,
              py: 0.625,
              alignItems: 'center',
              borderBottom: `1px solid ${t.border}`,
              '&:last-child': { borderBottom: 0 },
              fontSize: 11,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text, lineHeight: 1.2 }}>
                {row.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: 9.5,
                  color: t.text3,
                  fontFamily: 'Geist Mono, monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.path}
              </Typography>
            </Box>
            <AccessPill ok={row.read} label="Lecture" />
            <AccessPill ok={row.write} label="Écriture" />
          </Stack>
        ))}
      </Box>

      {compact && summary.rows.length > 8 ? (
        <Button
          size="small"
          onClick={() => setExpanded((v) => !v)}
          sx={{
            mt: 0.75,
            textTransform: 'none',
            fontSize: 11,
            fontWeight: 700,
            color: t.primaryDeep,
            p: 0,
            minWidth: 0,
          }}
        >
          {expanded ? 'Réduire' : `Voir les ${summary.rows.length} routes`}
        </Button>
      ) : null}
    </Box>
  );
}

export default WorkerRouteAccessMatrix;
