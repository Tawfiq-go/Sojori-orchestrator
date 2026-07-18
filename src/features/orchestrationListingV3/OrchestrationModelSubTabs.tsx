import { Box, Tab, Tabs } from '@mui/material';

/** Deux onglets : Vue d’ensemble (config + messages) · Services & workflows (détail + messages). */
export type OrchestrationModelSection = 'apercu' | 'services';

/** Anciennes valeurs d’URL encore acceptées puis redirigées. */
export type OrchestrationModelSectionLegacy =
  | OrchestrationModelSection
  | 'activation'
  | 'messages';

const TAB_DEFS: { id: OrchestrationModelSection; label: string; emoji: string }[] = [
  { id: 'apercu', label: "Vue d'ensemble", emoji: '👁' },
  { id: 'services', label: 'Services & workflows', emoji: '⚙️' },
];

/** Clé rail pour ouvrir les messages planifiés dans Services & workflows. */
export const SCHEDULED_MESSAGES_RAIL_KEY = '__scheduled_messages__';

export function normalizeOrchestrationSection(
  raw: string | null | undefined,
): OrchestrationModelSection {
  if (raw === 'services') return 'services';
  // activation / messages / apercu / inconnu → apercu
  return 'apercu';
}

type Props = {
  value: OrchestrationModelSection;
  onChange: (section: OrchestrationModelSection) => void;
  /** @deprecated plus d’onglet activation */
  showActivation?: boolean;
  /** @deprecated plus d’onglet messages dédié */
  hideMessages?: boolean;
  messageCount?: number;
};

export default function OrchestrationModelSubTabs({ value, onChange }: Props) {
  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
      <Tabs
        value={value}
        onChange={(_, v) => onChange(v as OrchestrationModelSection)}
        sx={{ minHeight: 42 }}
      >
        {TAB_DEFS.map(t => (
          <Tab
            key={t.id}
            value={t.id}
            label={
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </Box>
            }
          />
        ))}
      </Tabs>
    </Box>
  );
}
