import React, { useState, useCallback } from 'react';
import {
  Box,
  IconButton,
  Collapse,
  Fade,
} from '@mui/material';
import { ChevronUp, ChevronDown } from 'lucide-react';

const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryLight: '#FF8F6B', 
  primaryDark: '#B8881A',
  primaryPale: '#FFF3E0',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121'
  }
};

const GlobalFilter = ({
  children,
  showControls = true,
  onToggleControls,
  defaultOpen = true,
  filterContent,
  paginationContent,
  filterWidth = '68%',
  filterFullWidth = false,
  paginationWidth = '32%',
  className = '',
  style = {},
  openMarginBottom = '10px',
  closedMarginBottom = '2px'
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = useCallback(() => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (onToggleControls) {
      onToggleControls(newState);
    }
  }, [isOpen, onToggleControls]);

  return (
    <Box 
      className={className}
      style={{
        marginBottom: isOpen ? openMarginBottom : closedMarginBottom, 
        transition: 'all 0.3s ease',
        ...style
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center',
        marginBottom: isOpen ? '4px' : '0px',
      }}>
        <IconButton
          onClick={handleToggle}
          size="small"
          sx={{
            padding: '2px',
            backgroundColor: SOJORI_COLORS.gray[100],
            border: `1px solid ${SOJORI_COLORS.gray[200]}`,
            borderRadius: '20px',
            width: '60px',
            height: '20px',
            '&:hover': {
              backgroundColor: SOJORI_COLORS.gray[200],
            },
          }}
        >
          {isOpen ? 
            <ChevronUp size={14} style={{ color: SOJORI_COLORS.gray[600] }} /> : 
            <ChevronDown size={14} style={{ color: SOJORI_COLORS.gray[600] }} />
          }
        </IconButton>
      </Box>

      <Collapse in={isOpen} timeout={300}>
        {filterFullWidth ? (
          <Box sx={{ width: '100%' }}>{filterContent}</Box>
        ) : (
          <Box 
            sx={{ 
              display: 'flex',
              gap: '24px',
              alignItems: 'stretch',
            }}
          >
            <Box sx={{ 
              width: filterWidth,
              minWidth: 0,
            }}>
              {filterContent}
            </Box>
            <Box sx={{ 
              flex: 1,
              minWidth: 0,
            }}>
              {paginationContent}
            </Box>
          </Box>
        )}
      </Collapse>

      {children}
    </Box>
  );
};

export default GlobalFilter;