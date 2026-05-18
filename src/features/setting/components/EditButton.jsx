import React from 'react'; import { useTranslation } from 'react-i18next';

import { Button, Typography } from '@mui/material';
import { Edit3, ChevronRight } from 'lucide-react';

const EditButton = ({ onClick }) => {
  const { t } = useTranslation('common');
  return (
    <Button
      className="!my-4"
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#2ac9c9',
        color: 'white !important',
        padding: '10px 10px',
        borderRadius: '8px',
        transition: 'all 0.3s ease',
        '&:hover': {
          background: '#00b4b4',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Edit3 size={20} />
      <Typography 
        variant="button" 
        sx={{ 
          fontWeight: 'bold',
          textTransform: 'none',
          letterSpacing: '0.5px',
        }}
      >
        {t('Edit Title/Description')}
      </Typography>
      <ChevronRight size={20} />
    </Button>
  );
};

export default EditButton;