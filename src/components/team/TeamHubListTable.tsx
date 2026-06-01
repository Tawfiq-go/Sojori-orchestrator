import { Box, Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { TEAM_T } from './teamHubTokens';

export type TeamHubColumn<T> = {
  key: string;
  label: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render: (row: T) => ReactNode;
};

type TeamHubListTableProps<T> = {
  rows: T[];
  columns: TeamHubColumn<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
};

export function TeamHubListTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  emptyLabel = 'Aucun élément',
}: TeamHubListTableProps<T>) {
  if (rows.length === 0) {
    return (
      <Paper
        sx={{
          textAlign: 'center',
          py: 6,
          border: `1px solid ${TEAM_T.border}`,
          borderRadius: 1.5,
          bgcolor: TEAM_T.bg1,
        }}
      >
        <Typography sx={{ fontSize: 14, color: TEAM_T.text3 }}>{emptyLabel}</Typography>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        border: `1px solid ${TEAM_T.border}`,
        borderRadius: 1.5,
        overflow: 'hidden',
        bgcolor: TEAM_T.bg1,
      }}
    >
      <Box sx={{ overflowX: 'auto' }}>
        <Box
          component="table"
          sx={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12.5,
            '& th': {
              textAlign: 'left',
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: TEAM_T.text3,
              bgcolor: TEAM_T.bg2,
              borderBottom: `1px solid ${TEAM_T.border}`,
              px: 1.5,
              py: 1.125,
              whiteSpace: 'nowrap',
            },
            '& td': {
              px: 1.5,
              py: 1.125,
              borderBottom: `1px solid ${TEAM_T.border}`,
              color: TEAM_T.text,
              verticalAlign: 'middle',
            },
            '& tbody tr:last-child td': { borderBottom: 0 },
            '& tbody tr': {
              cursor: onRowClick ? 'pointer' : 'default',
              transition: 'background 0.12s',
              '&:hover': onRowClick ? { bgcolor: TEAM_T.bg2 } : undefined,
            },
          }}
        >
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    width: col.width,
                    textAlign: col.align || 'left',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} onClick={() => onRowClick?.(row)}>
                {columns.map((col) => (
                  <td key={col.key} style={{ textAlign: col.align || 'left' }}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Box>
      </Box>
    </Paper>
  );
}

export default TeamHubListTable;
