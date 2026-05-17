import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import InboxLayout from '../unified-inbox/InboxLayout';
import { T } from '../unified-inbox/_tokens';
import { DtCard, DtRow, DetailsHeader } from '../unified-inbox/inboxV4Ui';
import { WA_QUICK_TEMPLATES } from '../unified-inbox/inboxMessages';

const QA_TEMPLATES = [
  ...WA_QUICK_TEMPLATES.filter((x) => x.id !== 'wa-5'),
  { id: 'qa-1', label: '🔑 Code accès', icon: '🔑', text: 'Bonjour ! Voici votre code d\'accès : {{code}}' },
  { id: 'qa-2', label: '📍 Adresse', icon: '📍', text: 'L\'adresse exacte est : {{address}}' },
  { id: 'qa-3', label: '📶 Wifi', icon: '📶', text: 'Réseau: {{ssid}} · Mot de passe: {{password}}' },
  { id: 'qa-4', label: '✅ Check-in', icon: '✅', text: 'Votre check-in est confirmé pour {{date}} à {{time}}.' },
  { id: 'qa-5', label: '🆘 Support', icon: '🆘', text: 'Un membre de notre équipe vous contacte dans les plus brefs délais.' },
];

export default function WATemplatesTabV2() {
  const [selected, setSelected] = useState(QA_TEMPLATES[0]);
  const [search, setSearch] = useState('');

  const list = QA_TEMPLATES.filter((tpl) =>
    tpl.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <InboxLayout>
      {/* Col 1 — liste templates */}
      <Box
        sx={{
          width: { xs: '100%', lg: 320 },
          minWidth: { lg: 320 },
          borderRight: { lg: `1px solid ${T.border}` },
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          bgcolor: T.bg1,
        }}
      >
        <Box sx={{ px: '14px', py: '12px', borderBottom: `1px solid ${T.border}`, bgcolor: T.bg2 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 700, mb: 1 }}>📝 Templates (QA)</Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: '11px',
              py: '7px',
              bgcolor: T.bg1,
              border: `1px solid ${T.border}`,
              borderRadius: '8px',
            }}
          >
            <span>🔍</span>
            <Box
              component="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un template…"
              sx={{ flex: 1, border: 0, outline: 0, font: 'inherit', fontSize: 12.5, bgcolor: 'transparent' }}
            />
          </Box>
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', px: 1, py: 1 }}>
          {list.map((tpl) => (
            <Box
              key={tpl.id}
              onClick={() => setSelected(tpl)}
              sx={{
                p: '10px 12px',
                mb: '2px',
                borderRadius: '9px',
                cursor: 'pointer',
                bgcolor: selected.id === tpl.id ? T.primaryTint : 'transparent',
                boxShadow: selected.id === tpl.id ? `inset 2px 0 0 ${T.primary}` : 'none',
                '&:hover': { bgcolor: T.bg2 },
              }}
            >
              <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{tpl.label}</Typography>
              <Typography sx={{ fontSize: 11, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tpl.text.slice(0, 60)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Col 2 — preview WA */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, bgcolor: T.bg1 }}>
        <Box
          sx={{
            px: '18px',
            py: '7px',
            fontSize: 10,
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            borderBottom: `1px solid ${T.border}`,
            bgcolor: T.greenBg,
            color: '#0e8c4d',
          }}
        >
          💬 WhatsApp Business · Aperçu template QA
        </Box>
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            px: '24px',
            py: '18px',
            background: `linear-gradient(180deg, ${T.bg2} 0%, ${T.bg0} 100%)`,
          }}
        >
          <Box sx={{ alignSelf: 'flex-end', maxWidth: '75%', ml: 'auto' }}>
            <Box
              sx={{
                background: 'linear-gradient(135deg,#dcf8c6,#c5e8b3)',
                border: '1px solid rgba(37,211,102,0.30)',
                borderRadius: '14px 14px 4px 14px',
                px: '13px',
                py: '9px',
                fontSize: 13,
                color: '#0a3a17',
                lineHeight: 1.5,
              }}
            >
              {selected.text || '(vide)'}
            </Box>
            <Typography sx={{ fontSize: 10, color: T.text4, fontFamily: '"Geist Mono", monospace', textAlign: 'right', mt: 0.5 }}>
              14:34 ✓✓
            </Typography>
          </Box>
        </Box>
        <Box sx={{ px: '18px', py: '6px', bgcolor: T.aiTint, borderTop: `1px solid ${T.border}`, fontSize: 10.5, color: '#5b21b6', fontFamily: '"Geist Mono", monospace' }}>
          ⚠ Mode QA — variables {'{{…}}'} à remplacer avant envoi prod
        </Box>
      </Box>

      {/* Col 3 — meta */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          minHeight: 0,
          borderLeft: `1px solid ${T.border}`,
          bgcolor: T.bg2,
          width: 340,
        }}
      >
        <DetailsHeader label="Template QA" title={selected.label} />
        <Box sx={{ flex: 1, overflowY: 'auto', px: '14px', py: '14px' }}>
          <DtCard title="Détails" emoji="📝">
            <DtRow label="ID">{selected.id}</DtRow>
            <DtRow label="Canal">
              <Typography component="span" sx={{ color: T.success, fontWeight: 700 }}>
                WhatsApp
              </Typography>
            </DtRow>
            <DtRow label="Statut">Approuvé · QA</DtRow>
          </DtCard>
          <DtCard title="Corps" emoji="💬">
            <Typography sx={{ fontSize: 12, lineHeight: 1.55, color: T.text2 }}>{selected.text}</Typography>
          </DtCard>
        </Box>
      </Box>
    </InboxLayout>
  );
}
