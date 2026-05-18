import React from 'react';
import ProfilEntrepriseForm from '../components/ProfilEntrepriseForm';
import DashboardLayout from 'components/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'components/Navbars/DashboardNavbar';

const ProfilEntreprisePage = () => {
  return (
    <DashboardLayout>
      
      <ProfilEntrepriseForm />
    </DashboardLayout>
  );
};

export default ProfilEntreprisePage; 