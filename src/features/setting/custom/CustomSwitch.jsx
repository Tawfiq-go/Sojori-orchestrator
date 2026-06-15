import { Switch, styled } from '@mui/material';

const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
  primaryPale: '#FFF3E0',
  gray: {
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#616161',
  },
};

export const CustomSwitch = styled(Switch)(({ theme }) => ({
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: SOJORI_COLORS.primary,
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: SOJORI_COLORS.primary,
  },
  '& .MuiSwitch-switchBase': {
    '&.Mui-disabled': {
      color: SOJORI_COLORS.gray[400],
    },
  },
  '& .MuiSwitch-track': {
    backgroundColor: SOJORI_COLORS.gray[400], 
  },
}));