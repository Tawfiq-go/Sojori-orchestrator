import React from 'react';
import { Box, Tooltip } from '@mui/material';
import RoleBasedRenderer from 'components/wrappers/RoleBasedRenderer';

const FieldIndicatorCompany = ({ type }) => {
  if (type !== 'ru' && type !== 'so') return null;
  const color = type === 'ru' ? '#4a90e2' : '#f5a623';
  const bgColor = type === 'ru' ? 'rgba(74, 144, 226, 0.1)' : 'rgba(245, 166, 35, 0.1)';
  const label = type === 'ru' ? 'RU' : 'SO';
  const tooltip = type === 'ru' ? 'Rental United' : 'Sojori';
  return (
    <RoleBasedRenderer adminOnly={true}>
      <Tooltip title={tooltip} arrow placement="top">
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '24px',
            height: '20px',
            px: 0.5,
            borderRadius: '4px',
            backgroundColor: bgColor,
            color: color,
            fontSize: '0.7rem',
            fontWeight: '600',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            transition: 'all 0.2s ease',
            ml: 1,
          }}
        >
          {label}
        </Box>
      </Tooltip>
    </RoleBasedRenderer>
  );
};

export default FieldIndicatorCompany; 