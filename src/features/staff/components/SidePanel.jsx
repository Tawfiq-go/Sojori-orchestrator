import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
  gray: { 50: '#FAFAFA', 100: '#F5F5F5', 200: '#EEEEEE' },
};

const SidePanel = ({ open, onClose, title, width = 600, footer, zIndex = 1300, children, headerIcon }) => {
  if (!open) return null;

  return (
    <>
      {/* overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: typeof width === 'number' ? `${width}px` : width,
          backgroundColor: SOJORI_COLORS.gray[50],
          boxShadow: '0 25px 60px -12px rgba(0,0,0,0.4)',
          zIndex,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: 'Roboto',
          animation: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>

        {/* Modern Gradient Header */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${SOJORI_COLORS.primary} 0%, ${SOJORI_COLORS.primaryDark} 100%)`,
            p: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(255, 107, 53, 0.25)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '12px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)',
              }}
            >
              {headerIcon ?? <WhatsAppIcon sx={{ fontSize: '24px', color: 'white' }} />}
            </Box>
            <Typography
              sx={{
                fontSize: '22px',
                fontWeight: 700,
                color: 'white',
                letterSpacing: '-0.3px',
              }}
            >
              {title}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            sx={{
              color: 'white',
              backgroundColor: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.25)',
                transform: 'rotate(90deg)',
              },
              transition: 'all 0.3s ease',
            }}
          >
            <CloseIcon sx={{ fontSize: '20px' }} />
          </IconButton>
        </Box>

        {/* body */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: 'white',
            scrollbarWidth: 'thin',
            scrollbarColor: `${SOJORI_COLORS.primary} ${SOJORI_COLORS.gray[200]}`,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: SOJORI_COLORS.gray[100],
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: SOJORI_COLORS.primary,
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: SOJORI_COLORS.primaryDark,
              },
            },
          }}
        >
          {children}
        </Box>

        {/* Modern Footer */}
        {footer && (
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              p: '20px 28px',
              borderTop: `2px solid ${SOJORI_COLORS.gray[200]}`,
              backgroundColor: 'white',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.05)',
            }}
          >
            {footer}
          </Box>
        )}
      </div>
    </>
  );
};

export default SidePanel;
