import React from 'react';
import TabSectionPage from 'components/TabSectionPage';
import Template from './pages/template/template.page';
import NotificationSettingPage from './pages/notification/notification.setting.page';
import CompanyProfileTabs from './pages/CompanyProfileTabs';
import AdminConfig from './pages/admin.page';
import ReferralPage from './pages/referral/referral.page';
import ChatInbox from './components/ChatInbox';
import OpenAi from './pages/openai.page';
import ChannelManager from './pages/channelManager.page';
import UsefulNUmber from './pages/useFulNumber/UsefulNumber.page';
import WatchField from './pages/WatchField/WatchField.page';

const tabComponents = {
  template: Template,
  notifications: NotificationSettingPage,
  'host-profile': CompanyProfileTabs,
  'admin-config': AdminConfig,
  referrals: ReferralPage,
  chatbox: ChatInbox,
  'ai-config': OpenAi,
  'channel-manager': ChannelManager,
  'use-full-number': UsefulNUmber,
  sockets: WatchField,
};

export default function SettingsSectionPage() {
  return <TabSectionPage tabComponents={tabComponents} defaultTab="template" />;
}
