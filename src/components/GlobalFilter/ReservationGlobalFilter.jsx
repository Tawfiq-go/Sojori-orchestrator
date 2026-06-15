import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  Fade,
  Button
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import { RefreshCw, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Palette de couleurs Sojori cohérente
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
    900: '#212121'
  }
};

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '12px 16px',
    border: `1px solid ${SOJORI_COLORS.gray[200]}`,
    transition: 'all 0.3s ease',
    width: '100%',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    '&:hover': {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    }
  },
  saveButton: {
    background: `linear-gradient(135deg, ${SOJORI_COLORS.primary} 0%, ${SOJORI_COLORS.primaryDark} 100%)`,
    color: 'white',
    borderRadius: '8px',
    padding: '8px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    height: '42px',
    fontWeight: 600,
    fontSize: '14px',
    border: 'none',
    position: 'relative',
    overflow: 'hidden',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 6px 20px rgba(255, 107, 53, 0.3)',
    },
    '&:active': {
      transform: 'translateY(0)',
    }
  },
  badge: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    backgroundColor: SOJORI_COLORS.error,
    color: 'white',
    borderRadius: '50%',
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 700,
    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
    animation: '$pulse 2s infinite'
  },
  '@keyframes pulse': {
    '0%': {
      boxShadow: '0 0 0 0 rgba(255, 107, 53, 0.7)',
      transform: 'scale(1)',
    },
    '50%': {
      boxShadow: '0 0 0 10px rgba(255, 107, 53, 0)',
      transform: 'scale(1.1)',
    },
    '100%': {
      boxShadow: '0 0 0 0 rgba(255, 107, 53, 0.7)',
      transform: 'scale(1)',
    }
  }
}));

// Fonction utilitaire pour comparer les arrays
const arraysEqual = (a, b) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

// Composant bouton Reset moderne
const ModernResetButton = ({ onClick, selectedListings, selectedChannels, selectedTimeline, selectedItems }) => {
  const { t } = useTranslation('common');
  const hasActiveFilters = 
    selectedListings.length > 0 || 
    selectedChannels.length > 0 ||
    selectedTimeline.length > 0 ||
    !arraysEqual(selectedItems, ['Available Room', 'Rate']);

  return (
    <button
      onClick={onClick}
      disabled={!hasActiveFilters}
      style={{
        background: hasActiveFilters
          ? `linear-gradient(135deg, ${SOJORI_COLORS.primary} 0%, ${SOJORI_COLORS.primaryDark} 100%)`
          : '#F5F5F5',
        color: hasActiveFilters ? 'white' : '#BDBDBD',
        borderRadius: '8px',
        width: '42px',
        height: '42px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: hasActiveFilters ? 'pointer' : 'not-allowed',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: 'none',
        boxShadow: hasActiveFilters ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (hasActiveFilters) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
        }
      }}
      onMouseLeave={(e) => {
        if (hasActiveFilters) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        }
      }}
    >
      <RefreshCw
        size={18}
        style={{
          transition: 'transform 0.3s ease',
          transform: hasActiveFilters ? 'rotate(0deg)' : 'rotate(-45deg)',
        }}
      />
    </button>
  );
};

const ReservationGlobalFilter = ({
  // Filter components
  listingFilter,
  channelFilter,
  timelineFilter,
  searchFilter,
  
  // States
  selectedListings = [],
  selectedChannels = [],
  selectedTimeline = [],
  searchValue = '',
  
  // Callbacks
  onListingChange,
  onChannelChange,
  onTimelineChange,
  onSearchChange,
  onReset,
  onSearch,
  onOpenSidebar,
  
  // Save functionality
  hasPendingChanges = false,
  pendingChangesCount = 0,
  onSaveChanges,
  canUpdate = true,
  
  // Additional props
  showSaveButton = false,
  showSidebarButton = true,
  className = '',
  style = {}
}) => {
  const { t } = useTranslation('common');
  const classes = useStyles();

  const handleSaveChanges = async () => {
    if (!hasPendingChanges || !pendingChangesCount) {
      return;
    }
    if (onSaveChanges) {
      onSaveChanges();
    }
  };

  return (
    <Fade in={true} timeout={600}>
      <Box className={`${classes.root} ${className}`} style={style}>
        <style>
          {`
            @keyframes shimmer {
              0% { left: -100%; }
              100% { left: 100%; }
            }
          `}
        </style>
        <Box className="flex flex-col gap-3">
          <Box 
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: '12px', sm: '8px' },
              alignItems: { xs: 'stretch', sm: 'center' },
              flexWrap: 'wrap',
            }}
          >
            <Box 
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: '8px', sm: '6px' },
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                rowGap: { xs: '8px', sm: '0px' },
                alignItems: { xs: 'stretch', sm: 'center' },
                flex: { xs: '1 1 100%', sm: '1 1 auto' },
                minWidth: 0,
                maxWidth: '100%',
              }}
            >
              {searchFilter && (
                <Box sx={{ 
                  flex: { xs: '1 1 100%', sm: '0 0 auto' },
                  minWidth: { xs: '100%', sm: '280px' },
                  maxWidth: { xs: '100%', sm: '320px' },
                  marginRight: { xs: '0', sm: '8px' }
                }}>
                  {searchFilter}
                </Box>
              )}

              {listingFilter && (
                <Box sx={{ 
                  flex: { xs: '1 1 100%', sm: '0 0 auto' },
                  minWidth: { xs: '100%', sm: '130px' },
                  maxWidth: { xs: '100%', sm: '130px' }
                }}>
                  {listingFilter}
                </Box>
              )}

              {timelineFilter && (
                <Box sx={{ 
                  flex: { xs: '1 1 100%', sm: '0 0 auto' },
                  minWidth: { xs: '100%', sm: '130px' },
                  maxWidth: { xs: '100%', sm: '130px' }
                }}>
                  {timelineFilter}
                </Box>
              )}

              {channelFilter && (
                <Box sx={{ 
                  flex: { xs: '1 1 100%', sm: '0 0 auto' },
                  minWidth: { xs: '100%', sm: '130px' },
                  maxWidth: { xs: '100%', sm: '130px' }
                }}>
                  {channelFilter}
                </Box>
              )}

              <Box sx={{ 
                flex: { xs: '1 0 100%', sm: '0 0 auto' },
                display: 'flex',
                justifyContent: { xs: 'flex-start', sm: 'flex-start' },
                alignItems: 'center',
                flexShrink: 0,
                marginTop: { xs: '4px', sm: 0 }
              }}>
                <ModernResetButton
                  onClick={onReset}
                  selectedListings={selectedListings}
                  selectedChannels={selectedChannels}
                  selectedTimeline={selectedTimeline}
                  selectedItems={[]}
                />
              </Box>
            </Box>

            <Box 
              sx={{
                display: 'flex',
                flexDirection: { xs: 'row', sm: 'row' },
                gap: { xs: '8px', sm: '8px' },
                alignItems: 'center',
                justifyContent: { xs: 'flex-end', sm: 'flex-end' },
                flex: { xs: '0 0 auto', sm: '0 0 auto' },
                minWidth: 0,
              }}
            >
              {showSidebarButton && (
                <Box sx={{ flex: { xs: '0 0 auto', sm: '0 0 auto' } }}>
                  <Button
                    onClick={onOpenSidebar}
                    className="!text-white"
                    sx={{
                      background: `linear-gradient(135deg, ${SOJORI_COLORS.primary} 0%, ${SOJORI_COLORS.primaryDark} 100%)`,
                      color: 'white',
                      padding: '8px 24px',
                      borderRadius: '8px',
                      height: '42px',
                      fontWeight: 600,
                      fontSize: '14px',
                      textTransform: 'none',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(255, 107, 53, 0.2)',
                      minWidth: { xs: '80px', sm: 'auto' },
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 6px 20px rgba(255, 107, 53, 0.3)',
                        background: `linear-gradient(135deg, ${SOJORI_COLORS.primaryDark} 0%, ${SOJORI_COLORS.primary} 100%)`,
                      },
                      '&:active': {
                        transform: 'translateY(0)',
                      }
                    }}
                  >
                    {t('Search')}
                  </Button>
                </Box>
              )}
            </Box>

            {showSaveButton && hasPendingChanges && canUpdate && (
              <Fade in={true} timeout={200}>
                <button
                  onClick={handleSaveChanges}
                  className={classes.saveButton}
                  style={{ position: 'relative' }}
                >
                  <Save size={16} />
                  <span>{t('Save Changes')}</span>
                  <div className={classes.badge}>
                    {pendingChangesCount}
                  </div>
                </button>
              </Fade>
            )}
          </Box>

          {showSaveButton && hasPendingChanges && canUpdate && (
            <Fade in={true} timeout={300}>
              <Box 
                sx={{
                  padding: '10px 16px',
                  backgroundColor: `${SOJORI_COLORS.primary}08`,
                  borderLeft: `4px solid ${SOJORI_COLORS.primary}`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: SOJORI_COLORS.warning,
                    animation: 'pulse 2s infinite'
                  }} />
                  <Typography 
                    variant="body2" 
                    style={{ 
                      color: SOJORI_COLORS.primaryDark,
                      fontWeight: 500,
                      fontSize: '13px'
                    }}
                  >
                    {pendingChangesCount} {t('unsaved change(s)')} - {t('Review and save your modifications')}
                  </Typography>
                </Box>
                
                <button
                  onClick={handleSaveChanges}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${SOJORI_COLORS.primary}`,
                    color: SOJORI_COLORS.primary,
                    borderRadius: '6px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = SOJORI_COLORS.primaryPale;
                    e.target.style.borderColor = SOJORI_COLORS.primaryDark;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.borderColor = SOJORI_COLORS.primary;
                  }}
                >
                  {t('View Details')}
                </button>
              </Box>
            </Fade>
          )}
        </Box>
      </Box>
    </Fade>
  );
};

export default ReservationGlobalFilter;
