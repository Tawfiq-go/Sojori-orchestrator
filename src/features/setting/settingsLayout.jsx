/** Shell Paramètres — contenu dans DashboardWrapper orchestrator */
import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';

export const SETTINGS_FONT = "'Poppins', 'Inter', system-ui, sans-serif";

export const settingsOuterSx = {
  width: '100%',
  maxWidth: '100%',
  minHeight: '100%',
  fontFamily: SETTINGS_FONT,
};

export const settingsHeaderPaperSx = {
  mb: 1.5,
  px: 1.25,
  py: 0.85,
  borderRadius: 1.5,
  background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 55%, #fffaf5 100%)',
  border: '1px solid rgba(255,107,53,0.28)',
};

export function SettingsSectionHeader({ title, icon }) {
  if (!title) return null;
  return (
    <Paper elevation={0} sx={settingsHeaderPaperSx}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        {icon != null ? (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              bgcolor: '#E6B022',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
            }}
          >
            {icon}
          </Box>
        ) : null}
        <Typography sx={{ fontWeight: 800, fontSize: 13, color: '#B8881A', textTransform: 'uppercase' }}>
          {title}
        </Typography>
      </Stack>
    </Paper>
  );
}

export default function SettingsPageShell({ children }) {
  return (
    <Box sx={settingsOuterSx}>
      {children}
    </Box>
  );
}
