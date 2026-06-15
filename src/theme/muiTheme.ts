import { createTheme } from '@mui/material/styles';

/**
 * Thème Sojori — édition 2026 « Atelier ».
 * Palette : ambre dignifié + neutres chauds, contrastes WCAG AA partout.
 * Surfaces ultra-plates, ombres très douces, typo Geist resserrée.
 *
 * Couples (tokens) avec `DashboardV2.components.jsx` :
 *   primary.main      ↔ tokens.primary      (#E6B022)
 *   primary.light     ↔ tokens.primarySoft  (#F4CF5E)
 *   primary.dark      ↔ tokens.primaryDeep  (#B8881A)
 *   background.default↔ tokens.bg0          (#f6f5f1)
 *   background.paper  ↔ tokens.bg1          (#ffffff)
 *   text.primary      ↔ tokens.text         (#14110a)
 */
export const sojoriTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#E6B022',
      light: '#F4CF5E',
      dark: '#B8881A',
      contrastText: '#1a1408',
    },
    secondary: {
      main: '#4a4540',          // graphite chaud
      light: '#7a756c',
      dark: '#2a2620',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f6f5f1',       // page (1.4% plus clair, moins jaune)
      paper: '#ffffff',         // surfaces
    },
    text: {
      primary: '#14110a',       // titres : sombre dense
      secondary: '#55504a',     // corps : 4.8:1 sur bg.default
      disabled: '#9a948a',
    },
    divider: 'rgba(20, 17, 10, 0.07)',
    success: { main: '#0a8f5e', light: '#a7e4cd', dark: '#066a44' },
    warning: { main: '#c46506', light: '#fed8a8', dark: '#8b4505' },
    error:   { main: '#c81e1e', light: '#fbb3b3', dark: '#8a1212' },
    info:    { main: '#0673b3', light: '#a8d8f2', dark: '#03517f' },
    action: {
      hover: 'rgba(20, 17, 10, 0.045)',
      selected: 'rgba(230, 176, 34, 0.10)',
      focus: 'rgba(230, 176, 34, 0.18)',
      disabled: 'rgba(20, 17, 10, 0.26)',
      disabledBackground: 'rgba(20, 17, 10, 0.06)',
    },
  },

  shape: { borderRadius: 10 },

  /** Système d'ombre maison — très subtil, premium B2B */
  shadows: [
    'none',
    '0 1px 2px rgba(20,17,10,0.05)',
    '0 1px 3px rgba(20,17,10,0.06), 0 1px 2px rgba(20,17,10,0.03)',
    '0 2px 6px -1px rgba(20,17,10,0.07), 0 1px 3px rgba(20,17,10,0.04)',
    '0 4px 12px -2px rgba(20,17,10,0.08), 0 2px 4px -1px rgba(20,17,10,0.04)',
    '0 6px 16px -4px rgba(20,17,10,0.09), 0 2px 6px -2px rgba(20,17,10,0.05)',
    '0 8px 22px -6px rgba(20,17,10,0.10), 0 3px 8px -3px rgba(20,17,10,0.05)',
    '0 12px 28px -8px rgba(20,17,10,0.12), 0 4px 10px -3px rgba(20,17,10,0.06)',
    '0 16px 32px -10px rgba(20,17,10,0.14), 0 6px 12px -4px rgba(20,17,10,0.07)',
    ...Array(16).fill('0 20px 40px -12px rgba(20,17,10,0.16), 0 8px 16px -6px rgba(20,17,10,0.08)'),
  ] as any,

  typography: {
    fontFamily: '"Geist", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    htmlFontSize: 16,
    // Échelle resserrée, plus « produit » que marketing
    h1: { fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.15 },
    h2: { fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.2 },
    h3: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.25 },
    h4: { fontSize: '1.25rem', fontWeight: 650, letterSpacing: '-0.02em', lineHeight: 1.3 },
    h5: { fontSize: '1.0625rem', fontWeight: 650, letterSpacing: '-0.015em', lineHeight: 1.35 },
    h6: { fontSize: '0.9375rem', fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.4 },
    subtitle1: { fontSize: '0.9375rem', fontWeight: 500, lineHeight: 1.5 },
    subtitle2: { fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '0.01em', lineHeight: 1.45 },
    body1: { fontSize: '0.875rem', lineHeight: 1.55 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.5, color: '#55504a' },
    caption: { fontSize: '0.6875rem', letterSpacing: '0.03em', lineHeight: 1.45, color: '#7a756c' },
    overline: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', lineHeight: 1.4 },
    button: {
      fontSize: '0.8125rem',
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.005em',
    },
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*, *::before, *::after': { boxSizing: 'border-box' },
        body: {
          backgroundColor: '#f6f5f1',
          fontFeatureSettings: '"cv11", "ss01", "ss03"', // ligatures Geist propres
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        },
        '::selection': {
          background: 'rgba(230, 176, 34, 0.25)',
          color: '#14110a',
        },
        /* Focus visible global, plus subtil que le défaut MUI */
        ':focus-visible': {
          outline: '2px solid rgba(230, 176, 34, 0.55)',
          outlineOffset: '2px',
        },
        /* Scrollbars discrètes */
        '::-webkit-scrollbar': { width: '10px', height: '10px' },
        '::-webkit-scrollbar-thumb': {
          background: 'rgba(20,17,10,0.16)',
          borderRadius: '6px',
          border: '2px solid transparent',
          backgroundClip: 'padding-box',
        },
        '::-webkit-scrollbar-thumb:hover': { background: 'rgba(20,17,10,0.28)', backgroundClip: 'padding-box', borderRadius: '6px', border: '2px solid transparent' },
        '::-webkit-scrollbar-track': { background: 'transparent' },
      },
    },

    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(20, 17, 10, 0.07)',
          borderRadius: 12,
        },
        outlined: { borderColor: 'rgba(20, 17, 10, 0.09)' },
      },
    },

    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid rgba(20, 17, 10, 0.07)',
          borderRadius: 12,
          transition: 'box-shadow 160ms ease, border-color 160ms ease, transform 160ms ease',
          '&:hover': {
            borderColor: 'rgba(20, 17, 10, 0.12)',
            boxShadow: '0 4px 12px -2px rgba(20,17,10,0.06)',
          },
        },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: false },
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontWeight: 600,
          padding: '7px 14px',
          minHeight: 36,
          transition: 'background-color 140ms ease, border-color 140ms ease, transform 100ms ease, box-shadow 140ms ease',
          '&:active': { transform: 'translateY(0.5px)' },
        },
        sizeSmall: { padding: '4px 11px', minHeight: 30, fontSize: '0.75rem' },
        sizeLarge: { padding: '10px 20px', minHeight: 44, fontSize: '0.875rem' },
        containedPrimary: {
          background: 'linear-gradient(180deg, #f4cf5e 0%, #e6b022 100%)',
          color: '#1a1408',
          boxShadow: '0 1px 2px rgba(135,97,25,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
          '&:hover': {
            background: 'linear-gradient(180deg, #f4cf5e 0%, #e6b022 100%)',
            boxShadow: '0 2px 6px rgba(135,97,25,0.36), inset 0 1px 0 rgba(255,255,255,0.30)',
          },
        },
        outlined: { borderColor: 'rgba(20, 17, 10, 0.14)', backgroundColor: '#ffffff' },
        text: { color: '#14110a' },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: '#ffffff',
          transition: 'border-color 140ms ease, box-shadow 140ms ease',
          '& fieldset': { borderColor: 'rgba(20, 17, 10, 0.14)' },
          '&:hover fieldset': { borderColor: 'rgba(20, 17, 10, 0.24)' },
          '&.Mui-focused fieldset': {
            borderColor: '#e6b022',
            borderWidth: 1.5,
            boxShadow: '0 0 0 3px rgba(230, 176, 34, 0.16)',
          },
        },
        notchedOutline: { transition: 'border-color 140ms ease' },
      },
    },

    MuiTextField: {
      defaultProps: { size: 'small' },
    },

    MuiInputLabel: {
      styleOverrides: {
        root: { color: '#55504a', '&.Mui-focused': { color: '#b8881a' } },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(20,17,10,0.06)',
          fontSize: '0.8125rem',
        },
        head: {
          fontSize: '0.6875rem',
          fontWeight: 700,
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
          color: '#7a756c',
          backgroundColor: '#fafaf7',
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
          fontSize: '0.6875rem',
          letterSpacing: '0.02em',
          height: 22,
        },
        sizeSmall: { height: 20, fontSize: '0.6875rem' },
        outlined: { borderColor: 'rgba(20, 17, 10, 0.12)' },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          border: '1px solid rgba(20, 17, 10, 0.08)',
          boxShadow: '0 20px 40px -12px rgba(20,17,10,0.20), 0 8px 16px -6px rgba(20,17,10,0.10)',
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(20, 17, 10, 0.07)',
          backgroundImage: 'none',
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#14110a',
          fontSize: '0.6875rem',
          fontWeight: 500,
          padding: '6px 9px',
          borderRadius: 6,
        },
        arrow: { color: '#14110a' },
      },
    },

    MuiSwitch: {
      styleOverrides: {
        switchBase: { '&.Mui-checked': { color: '#e6b022' } },
        track: { backgroundColor: 'rgba(20,17,10,0.22)' },
      },
    },

    MuiDivider: {
      styleOverrides: { root: { borderColor: 'rgba(20,17,10,0.07)' } },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: '#e6b022', height: 2.5, borderRadius: 1 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.8125rem',
          letterSpacing: '0.005em',
          minHeight: 42,
          color: '#55504a',
          '&.Mui-selected': { color: '#14110a' },
        },
      },
    },
  },
});
