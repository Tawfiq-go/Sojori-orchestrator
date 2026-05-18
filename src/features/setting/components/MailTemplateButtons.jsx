import React from 'react';
import { Button, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import EmailIcon from '@mui/icons-material/Email';
import DescriptionIcon from '@mui/icons-material/Description';
import RuleIcon from '@mui/icons-material/Rule';
import ChatIcon from '@mui/icons-material/Chat';
import RoomServiceIcon from '@mui/icons-material/RoomService';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { SHOW_MAIL_TEMPLATE_DESCRIPTION_TAB } from 'features/setting/config/mailTemplateUi.config';

const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryPale: '#FFF3E0',
  gray: {
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#616161',
  },
};

const TabButton = styled(Button)({
  height: '40px',
  borderRadius: '4px',
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.9rem',
  padding: '8px 16px',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
  },
});

const MailTemplateButtons = ({ activeTab, setActiveTab, t, showForm }) => {
  const buttons = [
    {
      tab: 'message',
      label: t('message'),
      icon: <EmailIcon sx={{ fontSize: '1rem', mr: 1 }} />,
    },
    ...(SHOW_MAIL_TEMPLATE_DESCRIPTION_TAB
      ? [
          {
            tab: 'description',
            label: t('description'),
            icon: <DescriptionIcon sx={{ fontSize: '1rem', mr: 1 }} />,
          },
        ]
      : []),
    {
      tab: 'rules',
      label: t('rules_and_infos'),
      icon: <RuleIcon sx={{ fontSize: '1rem', mr: 1 }} />,
    },
  {
    tab: 'chatbot',
    label: t('menu_whatsapp', { defaultValue: 'Menu WhatsApp' }),
    icon: <ChatIcon sx={{ fontSize: '1rem', mr: 1 }} />,
  },
  {
    tab: 'concierge',
    label: t('concierge_services', { defaultValue: 'Conciergerie' }),
    icon: <RoomServiceIcon sx={{ fontSize: '1rem', mr: 1 }} />,
  },
  {
    tab: 'support',
    label: t('support_categories', { defaultValue: 'Support' }),
    icon: <SupportAgentIcon sx={{ fontSize: '1rem', mr: 1 }} />,
  },
  {
    tab: 'tasks',
    label: 'Orchestrator',
    icon: <AssignmentIcon sx={{ fontSize: '1rem', mr: 1 }} />,
  },
  ];

  if (showForm) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      {buttons.map((button) => (
        <Tooltip key={button.tab} title={button.label}>
          <TabButton
            onClick={() => setActiveTab(button.tab)}
            className={activeTab === button.tab ? '!text-white hover:!text-white' : 'hover:!text-black'}
            sx={{
              backgroundColor: activeTab === button.tab ? SOJORI_COLORS.primary : 'white',
              color: activeTab === button.tab ? 'white' : SOJORI_COLORS.gray[700],
              border: `1px solid ${activeTab === button.tab ? SOJORI_COLORS.primary : SOJORI_COLORS.gray[300]}`,
              '&:hover': {
                backgroundColor: activeTab === button.tab ? SOJORI_COLORS.primaryDark : SOJORI_COLORS.primaryPale,
                color: activeTab === button.tab ? 'white' : 'black',
              },
            }}
            aria-label={button.label}
          >
            <span className={`${activeTab === button.tab ? '!text-white hover:!text-white' : 'hover:!text-black'}`}>
              {button.icon}
            </span>
            {button.label}
          </TabButton>
        </Tooltip>
      ))}
    </div>
  );
};

export default MailTemplateButtons;