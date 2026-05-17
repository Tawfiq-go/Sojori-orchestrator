import React from 'react';
import TabSectionPage from 'components/TabSectionPage';
import Client from './Client.page';
import ClientWhiteList from './Client.white.list.page';

const tabComponents = { client: Client, 'client-white-list': ClientWhiteList };

export default function GuestsSectionPage() {
  return <TabSectionPage tabComponents={tabComponents} defaultTab="client" />;
}
