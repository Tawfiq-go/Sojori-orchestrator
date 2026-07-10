import { Box, Tab, Tabs } from '@mui/material';

export type OrchestrationModelSection = 'activation' | 'apercu' | 'services' | 'messages';

const TAB_DEFS: { id: OrchestrationModelSection; label: string; emoji: string }[] = [
  { id: 'activation', label: 'Activation des services', emoji: '🔌' },
  { id: 'services', label: 'Services & workflows', emoji: '⚙️' },
  { id: 'apercu', label: "Vue d'ensemble", emoji: '👁' },
  { id: 'messages', label: 'Messages planifiés', emoji: '📨' },
];

type Props = {
  value: OrchestrationModelSection;
  onChange: (section: OrchestrationModelSection) => void;
  messageCount?: number;
  /** Onglet activation (modèle PM uniquement). */
  showActivation?: boolean;
  /** Masque l’onglet messages (ex. aucun service activé sur le modèle PM). */
  hideMessages?: boolean;
};

export default function OrchestrationModelSubTabs({
  value,
  onChange,
  messageCount,
  showActivation = false,
  hideMessages = false,
}: Props) {
  const tabs = TAB_DEFS.filter(t => {
    if (t.id === 'activation' && !showActivation) return false;
    if (t.id === 'messages' && hideMessages) return false;
    return true;
  });
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs
        value={value}
        onChange={(_, v) => onChange(v as OrchestrationModelSection)}
        sx={{ minHeight: 42 }}
      >
        {tabs.map(t => (
          <Tab
            key={t.id}
            value={t.id}
            label={
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                <span>{t.emoji}</span>
                <span>{t.label}</span>
                {t.id === 'messages' && messageCount != null ? (
                  <Box
                    component="span"
                    sx={{
                      fontSize: 11,
                      fontWeight: 700,
                      px: 0.75,
                      py: 0.125,
                      borderRadius: 1,
                      bgcolor: 'action.selected',
                    }}
                  >
                    {messageCount}
                  </Box>
                ) : null}
              </Box>
            }
          />
        ))}
      </Tabs>
    </Box>
  );
}
