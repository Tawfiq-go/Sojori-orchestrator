import React, { useState } from 'react';
import { Box } from '@mui/material';
import ChatbotPropertyResumeTab from './ChatbotPropertyResumeTab';
import ListingOrchestrationV3Embed from '../orchestrationListingV3/ListingOrchestrationV3Embed';

type MainTab = 'resume' | 'orchestration-v3';

type Props = {
  listingId: string;
  formValues: Record<string, unknown>;
  rawDoc: Record<string, unknown>;
  snapshotUpdatedAt?: string;
  menuOptionsCount: number;
};

const MAIN_TABS: Array<{ id: MainTab; icon: string; label: string; pill?: string }> = [
  { id: 'resume', icon: '📋', label: 'Résumé propriété' },
  { id: 'orchestration-v3', icon: '🎯', label: 'Orchestration', pill: 'Par service' },
];

export default function ChatbotListingDetailTabs({
  listingId,
  formValues,
  rawDoc,
  snapshotUpdatedAt,
  menuOptionsCount,
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

      <Box className="cb-detail-tabs__panel" role="tabpanel" sx={{ minHeight: 'calc(100vh - 220px)', display: 'flex', flexDirection: 'column' }}>
        {mainTab === 'resume' && (
          <ChatbotPropertyResumeTab
            listingId={listingId}
            formValues={formValues}
            rawDoc={rawDoc}
            snapshotUpdatedAt={snapshotUpdatedAt}
            menuOptionsCount={menuOptionsCount}
          />
        )}
        {mainTab === 'orchestration-v3' && (
          <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <ListingOrchestrationV3Embed
              listingId={listingId}
              ownerId={formValues.ownerId as string | undefined}
              listingName={formValues.name as string | undefined}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
