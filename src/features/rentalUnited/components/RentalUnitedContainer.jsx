import React from 'react';
import { Box, Paper } from '@mui/material';
import OwnerSelector from './OwnerSelector';

const RentalUnitedContainer = ({ 
  isAdmin, 
  owners, 
  selectedOwnerId, 
  onOwnerChange,
  showOwnerSelector = true 
}) => {
  return (
    <>
      {isAdmin && owners.length > 0 && showOwnerSelector && (
        <Box sx={{ pb: 1 }}>
          <OwnerSelector
            owners={owners}
            selectedOwnerId={selectedOwnerId}
            onOwnerChange={onOwnerChange}
            title="Owner Selection"
            subtitle=""
          />
        </Box>
      )}

      <Box sx={{
        pt: isAdmin && owners.length > 0 && showOwnerSelector ? 0 : 0,
        isolation: 'isolate',
        '& #ruApp': {
          all: 'initial',
          fontFamily: 'inherit',
          minHeight: '500px',
          width: '100%',
          overflow: 'hidden',
          display: 'block',
          '& *': {
            fontFamily: 'inherit !important',
          }
        }
      }}>
        <Paper elevation={0} sx={{ minHeight: '600px', overflow: 'hidden' }}>
          <Box
            id="ruApp"
            sx={{
              minHeight: '500px',
              width: '100%',
              overflow: 'hidden',
            }}
          />
        </Paper>
      </Box>
    </>
  );
};

export default RentalUnitedContainer;
