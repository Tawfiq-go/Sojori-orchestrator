import React, { useState } from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Tooltip from '@mui/material/Tooltip';

// Sojori Color Palette
const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF8F6B', 
  primaryDark: '#E55A2B',
  primaryPale: '#FFF3E0',
  gray: {
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
  }
};

const StyledTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    height: '40px',
    borderRadius: '4px 0 0 4px',
    backgroundColor: 'white',
    '& fieldset': {
      border: `1px solid ${SOJORI_COLORS.gray[300]}`,
      borderRight: 'none',
    },
    '&:hover fieldset': {
      borderColor: SOJORI_COLORS.gray[500],
      borderRight: 'none',
    },
    '&.Mui-focused fieldset': {
      borderColor: SOJORI_COLORS.primary,
      borderRight: 'none',
      borderWidth: '2px',
    },
  },
  '& .MuiInputBase-input': {
    padding: '9px 14px',
    height: '22px',
    color: SOJORI_COLORS.gray[700],
    '&::placeholder': {
      color: SOJORI_COLORS.gray[500],
      opacity: 1,
    },
  },
});

const SearchButton = styled(IconButton)({
  height: '40px',
  width: '40px',
  borderRadius: '0 4px 4px 0',
  backgroundColor: SOJORI_COLORS.primary,
  border: `1px solid ${SOJORI_COLORS.primary}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.primaryDark,
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
  },
  '& .MuiSvgIcon-root': {
    color: 'white',
  },
});

const tooltipText = 'reservationNumber, phone, guest name';

const ReservationNumberFilter = ({
  reservationNumber,
  setReservationNumber,
  width = 'auto',
}) => {
  const { t } = useTranslation('common');

  const [inputValue, setInputValue] = useState(reservationNumber || '');

  const handleChange = (event) => {
    const newValue = event.target.value;
    setInputValue(newValue);
  };

  const handleSearchClick = () => {
    const normalizedValue = inputValue.toLowerCase().trim();
    setReservationNumber(normalizedValue);
  };

  return (
    <div className="flex items-center w-full">
      <StyledTextField
        placeholder={t('Quick Search')}
        value={inputValue}
        onChange={handleChange}
        variant="outlined"
        size="small"
        sx={{ 
          width: { xs: '100%', sm: width },
          minWidth: { xs: '100%', sm: '200px' },
          maxWidth: { xs: '100%', sm: '250px' }
        }}
        InputProps={{
          style: { paddingRight: 0 },
        }}
      />
      <SearchButton onClick={handleSearchClick} className="!text-white">
        <SearchIcon className="!text-white" />
      </SearchButton>
      <Tooltip
        title={
          <span style={{ whiteSpace: 'pre-line', fontSize: 15 }}>
            {tooltipText}
          </span>
        }
        arrow
        placement="bottom"
      >
        <IconButton
          size="small"
          sx={{
            marginLeft: { xs: '8px', sm: '12px' },
            background: '#fff',
            height: '40px',
            width: '40px',
            borderRadius: '4px',
            transition: 'all 0.2s ease',
            flexShrink: 0,
            '&:hover': {
              backgroundColor: SOJORI_COLORS.primaryPale,
            },
            '& .MuiSvgIcon-root': {
              color: SOJORI_COLORS.primary,
            }
          }}
        >
          <InfoOutlinedIcon />
        </IconButton>
      </Tooltip>
    </div>
  );
};

export default ReservationNumberFilter;
