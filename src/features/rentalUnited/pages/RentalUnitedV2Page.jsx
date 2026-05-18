import React from 'react';
import { useTranslation } from 'react-i18next';
import RentalUnitedWhiteLabelV2 from '../components/RentalUnitedWhiteLabelV2';
import DashboardLayout from 'components/LayoutContainers/DashboardLayout';

const RentalUnitedPageV2 = () => {
    const { i18n } = useTranslation();

    return (
        <DashboardLayout>
            <RentalUnitedWhiteLabelV2 key={i18n.language} />
        </DashboardLayout>
    );
};

export default RentalUnitedPageV2;

