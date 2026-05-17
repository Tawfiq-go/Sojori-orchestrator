import React from 'react';
import { 
  Box, 
  IconButton, 
  Select, 
  MenuItem, 
  Typography 
} from '@mui/material';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Hotel
} from 'lucide-react';

// Palette de couleurs Sojori cohérente
const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF8F6B', 
  primaryDark: '#E55A2B',
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

const GlobalPaginationCompact = ({ 
  currentPage, 
  totalItems, 
  itemsPerPage, 
  onPageChange, 
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100],
  loading = false,
  itemType = 'items',
  showItemsPerPage = true
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalItems === 0) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: '100%',
        height: '100%',
        color: SOJORI_COLORS.gray[500],
        fontSize: '12px'
      }}>
        No {itemType} found
      </Box>
    );
  }
  
  return (
    <Box
      sx={{
        border: `1px solid ${SOJORI_COLORS.gray[200]}`,
        borderRadius: '12px',
        backgroundColor: 'white !important',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        minHeight: '60px',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: '0',
        }}
      >
        {/* Info sur les items */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '100px' }}>
          <Hotel style={{ width: 15, height: 15, color: SOJORI_COLORS.primary }} />
          <Typography sx={{ 
            fontSize: '12px', 
            color: SOJORI_COLORS.gray[700], 
            fontWeight: 500,
            whiteSpace: 'nowrap'
          }}>
            <span style={{ color: SOJORI_COLORS.primary, fontWeight: 600 }}>
              {totalItems}
            </span> {itemType}
          </Typography>
        </Box>
        
        {/* Contrôles de navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Première page */}
          <IconButton
            onClick={() => onPageChange(0)}
            disabled={currentPage === 0 || loading}
            size="small"
            sx={{
              padding: '4px',
              borderRadius: '4px',
              backgroundColor: 'white',
              border: `1px solid ${SOJORI_COLORS.gray[200]}`,
              '&:hover': {
                backgroundColor: SOJORI_COLORS.primaryPale,
              },
              '&:disabled': { 
                opacity: 0.3,
              },
            }}
          >
            <ChevronsLeft size={12} style={{ color: currentPage === 0 ? SOJORI_COLORS.gray[400] : SOJORI_COLORS.gray[700] }} />
          </IconButton>
          
          {/* Page précédente */}
          <IconButton
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0 || loading}
            size="small"
            sx={{
              padding: '4px',
              borderRadius: '4px',
              backgroundColor: 'white',
              border: `1px solid ${SOJORI_COLORS.gray[200]}`,
              '&:hover': {
                backgroundColor: SOJORI_COLORS.primaryPale,
              },
              '&:disabled': { 
                opacity: 0.3,
              },
            }}
          >
            <ChevronLeft size={12} style={{ color: currentPage === 0 ? SOJORI_COLORS.gray[400] : SOJORI_COLORS.gray[700] }} />
          </IconButton>
          
          {/* Sélecteur de page */}
          <Select
            value={currentPage}
            onChange={(e) => onPageChange(Number(e.target.value))}
            disabled={loading}
            size="small"
            sx={{
              minWidth: '70px',
              height: '24px',
              backgroundColor: SOJORI_COLORS.gray[50],
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              color: SOJORI_COLORS.gray[700],
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: SOJORI_COLORS.gray[200],
              },
              '& .MuiSelect-select': {
                padding: '2px 8px',
              },
            }}
          >
            {[...Array(totalPages)].map((_, index) => (
              <MenuItem key={index} value={index} sx={{ fontSize: '11px' }}>
                {index + 1} / {totalPages}
              </MenuItem>
            ))}
          </Select>
          
          {/* Page suivante */}
          <IconButton
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1 || loading}
            size="small"
            sx={{
              padding: '4px',
              borderRadius: '4px',
              backgroundColor: 'white',
              border: `1px solid ${SOJORI_COLORS.gray[200]}`,
              '&:hover': {
                backgroundColor: SOJORI_COLORS.primaryPale,
              },
              '&:disabled': { 
                opacity: 0.3,
              },
            }}
          >
            <ChevronRight size={12} style={{ color: currentPage >= totalPages - 1 ? SOJORI_COLORS.gray[400] : SOJORI_COLORS.gray[700] }} />
          </IconButton>
          
          {/* Dernière page */}
          <IconButton
            onClick={() => onPageChange(totalPages - 1)}
            disabled={currentPage >= totalPages - 1 || loading}
            size="small"
            sx={{
              padding: '4px',
              borderRadius: '4px',
              backgroundColor: 'white',
              border: `1px solid ${SOJORI_COLORS.gray[200]}`,
              '&:hover': {
                backgroundColor: SOJORI_COLORS.primaryPale,
              },
              '&:disabled': { 
                opacity: 0.3,
              },
            }}
          >
            <ChevronsRight size={12} style={{ color: currentPage >= totalPages - 1 ? SOJORI_COLORS.gray[400] : SOJORI_COLORS.gray[700] }} />
          </IconButton>
        </Box>
        
        {/* Sélecteur items par page */}
        {showItemsPerPage && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Typography sx={{ fontSize: '11px', color: SOJORI_COLORS.gray[600] }}>
              Show:
            </Typography>
            <Select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              disabled={loading}
              size="small"
              sx={{
                minWidth: '50px',
                height: '22px',
                fontSize: '11px',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: SOJORI_COLORS.gray[200],
                },
                '& .MuiSelect-select': {
                  padding: '2px 6px',
                },
              }}
            >
              {itemsPerPageOptions.map(option => (
                <MenuItem key={option} value={option} sx={{ fontSize: '11px' }}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default GlobalPaginationCompact;
