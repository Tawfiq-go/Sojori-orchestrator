import React from 'react';
import { Box, Button, Fade, IconButton } from '@mui/material';
import { Plus, RefreshCw } from 'lucide-react';

const ListingGlobalFilter = ({
  searchFilter,
  countryFilter,
  cityFilter,
  unitTypeFilter,
  onReset,
  showAddButton = false,
  onAddClick,
  addButtonLabel = 'Create New',
  /** Bouton ajouter = icône seule (pages admin compactes) */
  addButtonMinimal = false,
  canCreate = true,
  showResetButton = true,
  resetEnabled = false,
  rightExtraContent = null,
}) => {
  return (
    <Fade in={true} timeout={300}>
      <Box
        sx={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '12px 16px',
          border: '1px solid #EEEEEE',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: '12px', sm: '8px' },
            alignItems: { xs: 'stretch', sm: 'center' },
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>{searchFilter}</Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>{countryFilter}</Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>{cityFilter}</Box>
          <Box sx={{ flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>{unitTypeFilter}</Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {showResetButton && (
              <Button
                onClick={onReset}
                sx={{
                  background: 'linear-gradient(135deg, #E6B022 0%, #B8881A 100%)',
                  color: 'white',
                  borderRadius: '8px',
                  width: '42px',
                  minWidth: '42px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  transition: 'all 0.2s ease',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(255, 107, 53, 0.25)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(255, 107, 53, 0.35)'
                  },
                }}
              >
                <RefreshCw size={18} style={{ color: 'white' }} />
              </Button>
            )}
          </Box>

          {rightExtraContent && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              {rightExtraContent}
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: rightExtraContent ? 0 : 'auto' }}>
            {showAddButton && canCreate && (
              addButtonMinimal ? (
                <IconButton
                  onClick={onAddClick}
                  size="small"
                  aria-label={addButtonLabel || 'Add'}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1,
                    color: '#fff',
                    background: 'linear-gradient(135deg, #E6B022 0%, #B8881A 100%)',
                    boxShadow: '0 2px 8px rgba(255, 107, 53, 0.25)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #B8881A 0%, #E6B022 100%)',
                      boxShadow: '0 4px 12px rgba(255, 107, 53, 0.35)',
                    },
                  }}
                >
                  <Plus size={18} strokeWidth={2.5} />
                </IconButton>
              ) : (
                <Button
                  onClick={onAddClick}
                  className="!text-white"
                  sx={{
                    background: 'linear-gradient(135deg, #E6B022 0%, #B8881A 100%)',
                    color: 'white',
                    padding: '8px 24px',
                    borderRadius: '8px',
                    height: '42px',
                    fontWeight: 600,
                    fontSize: '14px',
                    textTransform: 'none',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(255, 107, 53, 0.2)',
                    minWidth: { xs: '120px', sm: 'auto' },
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(255, 107, 53, 0.3)',
                      background: 'linear-gradient(135deg, #B8881A 0%, #E6B022 100%)',
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                    },
                  }}
                >
                  <Plus size={16} />
                  {addButtonLabel}
                </Button>
              )
            )}
          </Box>
        </Box>
      </Box>
    </Fade>
  );
};

export default ListingGlobalFilter;


