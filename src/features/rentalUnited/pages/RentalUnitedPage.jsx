import React from 'react';
import { Container, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import DashboardLayout from 'components/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'components/Navbars/DashboardNavbar';
import RentalUnitedWhiteLabel from '../components/RentalUnitedWhiteLabel';

const RentalUnitedPage = () => {
  const { i18n } = useTranslation();
  
  return (
    <DashboardLayout>
        
          <RentalUnitedWhiteLabel key={i18n.language} />
    </DashboardLayout>
  );
};

export default RentalUnitedPage;
