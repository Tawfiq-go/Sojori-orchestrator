import { Box } from '@mui/material';
import { tokens as T } from '../dashboard/dashboardTokens';

export type PageFullscreenEnterBtnProps = {
  onClick: () => void;
  disabled?: boolean;
  /** aria-label / title — ex. « Liste plein écran », « Calendrier plein écran » */
  label?: string;
};

/**
 * Bouton carré ⛶ (~30×28) — masquer quand déjà en fullscreen.
 */
export function PageFullscreenEnterBtn({
  onClick,
  disabled = false,
  label = 'Plein écran',
}: PageFullscreenEnterBtnProps) {
  return (
    <Box
      component="button"
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      sx={{
        all: 'unset',
        boxSizing: 'border-box',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 28,
        borderRadius: '6px',
        border: `1px solid ${T.borderStrong}`,
        bgcolor: T.bg1,
        color: disabled ? T.text4 : T.text2,
        fontSize: 15,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        lineHeight: 1,
        opacity: disabled ? 0.5 : 1,
        boxShadow: '0 1px 2px rgba(20,17,10,0.06)',
        '&:hover': disabled
          ? {}
          : { bgcolor: T.bg2, borderColor: T.primary, color: T.primaryDeep },
      }}
    >
      ⛶
    </Box>
  );
}
