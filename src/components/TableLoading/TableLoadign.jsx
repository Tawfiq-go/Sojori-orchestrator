import React from 'react';
import { Box, CircularProgress } from '@mui/material';

const TableLoading = () => {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="200px"
    >
      <CircularProgress sx={{ color: '#00b4b4' }} />
    </Box>
  );
};

export default TableLoading;