import { createTheme } from '@mui/material/styles';

export const sojoriTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#b8851a', dark: '#876119', light: '#e6c46a' },
    secondary: { main: '#7c3aed' },
    success: { main: '#0a8f5e' },
    warning: { main: '#c46506' },
    error: { main: '#c81e1e' },
    info: { main: '#0673b3' },
    background: { default: '#f6f5f1', paper: '#ffffff' },
    text: { primary: '#14110a', secondary: '#55504a' },
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
  },
  shape: { borderRadius: 10 },
});
