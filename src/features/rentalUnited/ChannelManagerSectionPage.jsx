import React from 'react';
import TabSectionPage from 'components/TabSectionPage';
import RentalUnitedPageV2 from './pages/RentalUnitedV2Page';
import DistributionPage from '../distribution/pages/DistributionPage';

const tabComponents = { 'channel-manager': RentalUnitedPageV2, distribution: DistributionPage };

export default function ChannelManagerSectionPage() {
  return <TabSectionPage tabComponents={tabComponents} defaultTab="channel-manager" />;
}
