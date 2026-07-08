import { useCallback, useEffect, useState } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { CatalogMessage } from '../taskHub/staff-design/types';
import * as fulltaskApi from '../../services/fulltaskApi';
import { apiOrchestrationToDesign } from '../../utils/fulltaskMappers';
import { unwrapFulltaskData } from '../../utils/unwrapFulltaskResponse';
import { V3 } from './theme';

type Props = {
  ownerKey: string;
};

function channelOf(msg: CatalogMessage): 'wa' | 'ota' | 'email' {
  if (msg.whatsappTemplateId) return 'wa';
  if (msg.messageFrOta?.trim()) return 'ota';
  return 'email';
}

const CHANNEL_LABEL = { wa: 'WHATSAPP', ota: 'OTA', email: 'EMAIL' };
const CHANNEL_EMOJI = { wa: '📱', ota: '🏨', email: '📧' };

export default function V3MessageLibrary({ ownerKey }: Props) {
  const ownerId = ownerKey === 'global' ? 'global' : ownerKey;
  const [catalog, setCatalog] = useState<CatalogMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await fulltaskApi.getOrchestrationConfig(ownerId);
      const doc = unwrapFulltaskData<Record<string, unknown>>(raw);
      const mapped = doc ? apiOrchestrationToDesign(doc) : null;
      setCatalog((mapped?.catalog ?? []) as CatalogMessage[]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Catalogue indisponible');
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = [
    { title: 'Messages WhatsApp · templates Meta', filter: (m: CatalogMessage) => channelOf(m) === 'wa' },
    { title: 'Messages OTA · réponses Airbnb / Booking', filter: (m: CatalogMessage) => channelOf(m) === 'ota' },
    { title: 'Messages Email', filter: (m: CatalogMessage) => channelOf(m) === 'email' },
  ];

  const expertUrl = `/orchestration/config?owner=${encodeURIComponent(ownerKey)}&tab=messages`;

  if (loading) {
    return (
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress sx={{ color: V3.p }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 980 }}>
      <Typography sx={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.025em', mb: 0.75 }}>
        📚 Bibliothèque messages
      </Typography>
      <Typography sx={{ fontSize: 13, color: V3.t2, mb: 3, lineHeight: 1.6, maxWidth: 640 }}>
        Le seul contenu hérité par <b>tous les listings</b> du PM : les textes des messages. Le{' '}
        <b>timing</b> et l'<b>orchestration</b> se règlent par annonce.
      </Typography>

      <Box
        sx={{
          p: '14px 18px',
          background: `linear-gradient(135deg,${V3.pt},transparent)`,
          border: `1px solid ${V3.pt2}`,
          borderRadius: '12px',
          fontSize: 12.5,
          color: V3.t2,
          lineHeight: 1.6,
          mb: 3,
          display: 'flex',
          gap: 1.5,
        }}
      >
        <span style={{ fontSize: 22 }}>💡</span>
        <div>
          Ici le PM définit <b>le QUOI</b> (texte OTA, email, template WhatsApp). Chaque listing référence
          ces messages et définit <b>le QUAND</b> (relances, délais).
        </div>
      </Box>

      {groups.map(grp => {
        const items = catalog.filter(grp.filter);
        if (items.length === 0) return null;
        return (
          <Box key={grp.title} sx={{ mb: 3 }}>
            <Typography
              sx={{
                fontFamily: '"Geist Mono", ui-monospace, monospace',
                fontSize: 10,
                fontWeight: 800,
                color: V3.t4,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                mb: 1.25,
              }}
            >
              {grp.title}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {items.map(msg => {
                const ch = channelOf(msg);
                return (
                  <Box
                    key={msg.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.625,
                      p: '13px 15px',
                      bgcolor: V3.card,
                      border: `1px solid ${V3.b}`,
                      borderRadius: '12px',
                    }}
                  >
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '10px',
                        bgcolor: ch === 'wa' ? V3.waT : ch === 'ota' ? V3.clientT : V3.orchT,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 15,
                        flexShrink: 0,
                      }}
                    >
                      {CHANNEL_EMOJI[ch]}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.005em' }}>
                        {msg.label}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5 }}>
                        <Box
                          component="span"
                          sx={{
                            fontFamily: '"Geist Mono", ui-monospace, monospace',
                            fontSize: 8.5,
                            fontWeight: 800,
                            px: 0.75,
                            py: '1px',
                            borderRadius: '4px',
                            bgcolor: ch === 'wa' ? V3.waT : ch === 'ota' ? V3.clientT : V3.orchT,
                            color: ch === 'wa' ? V3.wa : ch === 'ota' ? V3.client : V3.orch,
                          }}
                        >
                          {CHANNEL_LABEL[ch]}
                        </Box>
                        <Box
                          component="span"
                          sx={{
                            fontFamily: '"Geist Mono", ui-monospace, monospace',
                            fontSize: 8.5,
                            fontWeight: 800,
                            px: 0.75,
                            py: '1px',
                            borderRadius: '4px',
                            bgcolor: V3.bg,
                            color: V3.t3,
                          }}
                        >
                          {msg.id}
                        </Box>
                      </Box>
                    </Box>
                    <Button
                      component={RouterLink}
                      to={expertUrl}
                      sx={{ minWidth: 30, width: 30, height: 30, borderRadius: '8px', color: V3.t3, fontSize: 13 }}
                    >
                      ✏
                    </Button>
                  </Box>
                );
              })}
            </Box>
          </Box>
        );
      })}

      {catalog.length === 0 && (
        <Typography component="div" sx={{ color: V3.t3, fontSize: 13 }}>
          Catalogue vide — seed via{' '}
          <Button component={RouterLink} to={expertUrl} size="small">
            orchestration-config
          </Button>
        </Typography>
      )}
    </Box>
  );
}
