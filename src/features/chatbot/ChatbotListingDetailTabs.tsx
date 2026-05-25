import React, { useState } from 'react';
import { Box } from '@mui/material';
import ListingFormV2 from '../../components/listing/form-v2/ListingFormV2';
import ChatbotPropertyResumeTab from './ChatbotPropertyResumeTab';
import { CONFIG_NEW_TAB_COUNT } from '../../components/listing/form-v2/ListingFormShell';

type MainTab = 'resume' | 'config-new';

type Props = {
  listingId: string;
  formValues: Record<string, unknown>;
  rawDoc: Record<string, unknown>;
  snapshotUpdatedAt?: string;
  menuOptionsCount: number;
  configDefaultTab?: string;
  onSave: (values: Record<string, unknown>) => void;
  onImagesPersisted: () => void;
  onVerifyRuChannels: () => void;
  verifyRuLoading: boolean;
  listingStructure: unknown;
  roomTypeConfigs: unknown[];
};

const MAIN_TABS: Array<{ id: MainTab; icon: string; label: string; pill?: string }> = [
  { id: 'resume', icon: '📋', label: 'Résumé propriété' },
  { id: 'config-new', icon: '✨', label: 'Config Orch. NEW', pill: `${CONFIG_NEW_TAB_COUNT} onglets` },
];

export default function ChatbotListingDetailTabs({
  listingId,
  formValues,
  rawDoc,
  snapshotUpdatedAt,
  menuOptionsCount,
  configDefaultTab = 'access-config',
  onSave,
  onImagesPersisted,
  onVerifyRuChannels,
  verifyRuLoading,
  listingStructure,
  roomTypeConfigs,
}: Props) {
  const [mainTab, setMainTab] = useState<MainTab>('resume');

  return (
    <Box className="cb-detail-tabs">
      <Box className="cb-detail-tabs__bar" role="tablist">
        {MAIN_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={mainTab === t.id}
            className={`cb-detail-tabs__btn${mainTab === t.id ? ' on' : ''}`}
            onClick={() => setMainTab(t.id)}
          >
            <span>{t.icon}</span>
            {t.label}
            {t.pill ? <span className="cb-detail-tabs__pill">{t.pill}</span> : null}
          </button>
        ))}
      </Box>

      <Box className="cb-detail-tabs__panel" role="tabpanel">
        {mainTab === 'resume' && (
          <ChatbotPropertyResumeTab
            listingId={listingId}
            formValues={formValues}
            rawDoc={rawDoc}
            snapshotUpdatedAt={snapshotUpdatedAt}
            menuOptionsCount={menuOptionsCount}
          />
        )}
        {mainTab === 'config-new' && (
          <ListingFormV2
            listingId={listingId}
            initialValues={formValues}
            defaultLevel="config-new"
            defaultTab={configDefaultTab}
            lockLevel="config-new"
            embedded
            onSave={onSave}
            onImagesPersisted={onImagesPersisted}
            onVerifyRuChannels={onVerifyRuChannels}
            verifyRuLoading={verifyRuLoading}
            listingStructure={listingStructure}
            roomTypeConfigs={roomTypeConfigs}
          />
        )}
      </Box>
    </Box>
  );
}
