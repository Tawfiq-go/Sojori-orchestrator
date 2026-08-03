import { Box, IconButton, Tooltip } from '@mui/material';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { tokens as T } from '../dashboard/dashboardTokens';

export type PageFullscreenLayerProps = {
  open: boolean;
  onClose: () => void;
  /** aria-label du dialog — ex. « Liste des réservations plein écran » */
  label: string;
  children: ReactNode;
  /**
   * z-index overlay. Défaut 1200 (sous MUI Dialog/Popover 1300).
   * Calendrier inventaire : ~40 (popups internes bas).
   */
  zIndex?: number;
  bgcolor?: string;
};

/**
 * Portal body : overlay fixed inset:0 + arbre page + bouton ×.
 * ⚠️ Portaler le même arbre JSX que la page (filtres + contenu), pas une liste nue.
 */
export function PageFullscreenLayer({
  open,
  onClose,
  label,
  children,
  zIndex = 1200,
  bgcolor = T.bg0,
}: PageFullscreenLayerProps) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <Box
      role="dialog"
      aria-modal="true"
      aria-label={label}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex,
        bgcolor,
        display: 'flex',
        flexDirection: 'column',
        p: { xs: 0.5, sm: 0.75 },
        boxSizing: 'border-box',
      }}
      data-page-fullscreen="true"
    >
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
      <Tooltip title="Quitter le plein écran (Échap)" placement="left">
        <IconButton
          type="button"
          onClick={onClose}
          aria-label="Quitter le plein écran"
          sx={{
            position: 'fixed',
            right: { xs: 10, md: 14 },
            bottom: { xs: 10, md: 14 },
            zIndex: zIndex + 1,
            width: 36,
            height: 36,
            bgcolor: 'rgba(255,255,255,0.94)',
            border: `1px solid ${T.border}`,
            boxShadow: '0 4px 16px rgba(20,17,10,0.14)',
            color: T.text3,
            fontSize: 22,
            fontWeight: 300,
            lineHeight: 1,
            '&:hover': {
              bgcolor: T.bg1,
              color: T.text,
              borderColor: T.borderStrong,
            },
          }}
        >
          ×
        </IconButton>
      </Tooltip>
    </Box>,
    document.body,
  );
}
