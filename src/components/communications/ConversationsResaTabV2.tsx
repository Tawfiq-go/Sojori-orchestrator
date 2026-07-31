/**
 * Conversations Résa — vue admin unifiée des demandes de réservation (web + WhatsApp).
 * Lecture : liste des conversations à gauche, fil complet à droite avec l'intent extrait
 * par l'IA (ville / dates / voyageurs / budget) affiché par message. Sert à comprendre
 * ce que cherchent les clients, quel que soit le canal.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import {
  type ConversationDetail,
  type ConversationIntent,
  type ConversationListItem,
  getConversationDetail,
  getConversations,
} from '../../services/conversationsResaService';

const CHANNEL_META: Record<string, { label: string; bg: string; fg: string }> = {
  web: { label: 'Web', bg: 'rgba(45,108,181,0.12)', fg: '#2d6cb5' },
  whatsapp: { label: 'WhatsApp', bg: 'rgba(31,138,84,0.12)', fg: '#1f8a54' },
};

function intentSummary(i?: ConversationIntent): string {
  if (!i) return '';
  const bits: string[] = [];
  if (i.city) bits.push(i.city);
  if (i.checkIn && i.checkOut) bits.push(`${i.checkIn} → ${i.checkOut}`);
  if (i.guests) bits.push(`${i.guests} pers.`);
  if (i.budgetMad) bits.push(`≤ ${i.budgetMad.toLocaleString('fr-FR')} MAD`);
  return bits.join(' · ');
}

// Libellé lisible du statut de localisation résolu par le cerveau IA.
const LOCATION_STATUS_LABEL: Record<string, string> = {
  resolved: '✅ Ville couverte',
  not_covered: '⛔ Ville pas encore couverte',
  country_only: '🇲🇦 Pays seulement (ville non précisée)',
  out_of_scope: '🌍 Hors Maroc',
  ambiguous: '❓ Lieu ambigu',
  none: '— Aucun lieu',
};

function locationStatusLabel(s?: string): string {
  if (!s) return '';
  return LOCATION_STATUS_LABEL[s] || s;
}

// Ligne clé/valeur du panneau « Comment cette réponse a été faite ».
function TraceRow({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <Stack direction="row" spacing={1} justifyContent="space-between">
      <Typography sx={{ fontSize: 10.5, color: t.text3, whiteSpace: 'nowrap' }}>{k}</Typography>
      <Typography sx={{ fontSize: 10.5, color: t.text, fontWeight: 600, textAlign: 'right' }}>{v}</Typography>
    </Stack>
  );
}

function fmtWhen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "à l'instant";
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)} h`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function ChannelChip({ channel }: { channel: string }) {
  const m = CHANNEL_META[channel] || { label: channel, bg: t.bg2, fg: t.text2 };
  return (
    <Chip
      label={m.label}
      size="small"
      sx={{ bgcolor: m.bg, color: m.fg, fontWeight: 700, fontSize: 11, height: 20 }}
    />
  );
}

export default function ConversationsResaTabV2() {
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [channel, setChannel] = useState<'all' | 'web' | 'whatsapp'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  // Message dont le panneau « Comment cette réponse a été faite » est ouvert.
  const [openTraceId, setOpenTraceId] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const rows = await getConversations({
        limit: 100,
        channel: channel === 'all' ? undefined : channel,
      });
      setItems(rows);
      if (!selectedId && rows.length) setSelectedId(rows[0].id);
    } catch {
      setItems([]);
    } finally {
      setLoadingList(false);
    }
  }, [channel, selectedId]);

  useEffect(() => {
    void loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    getConversationDetail(selectedId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const filters = useMemo(
    () =>
      [
        { id: 'all', label: 'Tous' },
        { id: 'web', label: 'Web' },
        { id: 'whatsapp', label: 'WhatsApp' },
      ] as const,
    [],
  );

  return (
    <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 220px)', minHeight: 460 }}>
      {/* LISTE */}
      <Box
        sx={{
          width: 340,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${t.border}`,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: '#fff',
        }}
      >
        <Box sx={{ p: 1.5, borderBottom: `1px solid ${t.border}` }}>
          <Typography sx={{ fontWeight: 800, fontSize: 15, color: t.text, mb: 1 }}>
            Conversations Résa
          </Typography>
          <Stack direction="row" spacing={0.75}>
            {filters.map((f) => (
              <Chip
                key={f.id}
                label={f.label}
                size="small"
                onClick={() => setChannel(f.id)}
                sx={{
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 12,
                  bgcolor: channel === f.id ? t.primary : t.bg2,
                  color: channel === f.id ? '#fff' : t.text2,
                }}
              />
            ))}
          </Stack>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {loadingList ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={26} sx={{ color: t.primary }} />
            </Box>
          ) : items.length === 0 ? (
            <Typography sx={{ p: 3, color: t.text3, fontSize: 13, textAlign: 'center' }}>
              Aucune conversation pour ce filtre.
            </Typography>
          ) : (
            items.map((c) => {
              const active = c.id === selectedId;
              const intent = intentSummary(c.lastIntent);
              return (
                <Box
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    cursor: 'pointer',
                    borderBottom: `1px solid ${t.border}`,
                    bgcolor: active ? t.bg2 : 'transparent',
                    boxShadow: active ? `inset 3px 0 0 ${t.primary}` : 'none',
                    '&:hover': { bgcolor: t.bg2 },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <ChannelChip channel={c.channel} />
                    <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: t.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.displayName}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: t.text3, flexShrink: 0 }}>
                      {fmtWhen(c.lastMessageAt)}
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 12.5, color: t.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.lastPreview || '—'}
                  </Typography>
                  {intent && (
                    <Typography sx={{ mt: 0.5, fontSize: 11.5, color: t.primary, fontWeight: 600 }}>
                      🎯 {intent}
                    </Typography>
                  )}
                </Box>
              );
            })
          )}
        </Box>
      </Box>

      {/* FIL */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${t.border}`,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: '#fff',
        }}
      >
        {!detail ? (
          <Box sx={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {loadingDetail ? (
              <CircularProgress size={28} sx={{ color: t.primary }} />
            ) : (
              <Typography sx={{ color: t.text3, fontSize: 13 }}>
                Sélectionnez une conversation.
              </Typography>
            )}
          </Box>
        ) : (
          <>
            <Box sx={{ p: 1.5, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ChannelChip channel={detail.channel} />
              <Typography sx={{ fontWeight: 800, fontSize: 15, color: t.text }}>
                {detail.displayName}
              </Typography>
              {detail.waNumber && (
                <Typography sx={{ fontSize: 12.5, color: t.text3 }}>+{detail.waNumber}</Typography>
              )}
              <Box sx={{ flex: 1 }} />
              <Chip label={detail.language.toUpperCase()} size="small" sx={{ bgcolor: t.bg2, color: t.text2, fontWeight: 700, fontSize: 11, height: 20 }} />
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {detail.messages.map((m) => {
                const mine = !m.isIncoming;
                const intent = intentSummary(m.aiIntent);
                return (
                  <Box
                    key={m.id}
                    sx={{
                      alignSelf: mine ? 'flex-end' : 'flex-start',
                      maxWidth: '78%',
                    }}
                  >
                    <Box
                      sx={{
                        px: 1.5,
                        py: 1,
                        borderRadius: 2,
                        bgcolor: mine ? t.primary : t.bg2,
                        color: mine ? '#fff' : t.text,
                        fontSize: 13.5,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {m.type === 'audio' && '🎤 '}
                      {m.summary || m.body || m.transcript || '—'}
                    </Box>
                    <Stack direction="row" spacing={0.75} sx={{ mt: 0.4, px: 0.5, flexWrap: 'wrap' }} justifyContent={mine ? 'flex-end' : 'flex-start'}>
                      <Typography sx={{ fontSize: 10.5, color: t.text3 }}>
                        {m.source === 'admin' ? 'Admin' : m.source === 'bot' ? 'Bot' : 'Client'} ·{' '}
                        {new Date(m.timestamp).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                      {(m.tags || []).map((tag) => (
                        <Chip key={tag} label={tag} size="small" sx={{ height: 16, fontSize: 9.5, bgcolor: 'rgba(230,176,34,0.15)', color: '#b45309' }} />
                      ))}
                    </Stack>
                    {intent && (
                      <Typography sx={{ fontSize: 11, color: t.primary, fontWeight: 600, mt: 0.3, px: 0.5, textAlign: mine ? 'right' : 'left' }}>
                        🎯 {intent}
                      </Typography>
                    )}
                    {m.source === 'bot' && m.trace && (
                      <Box sx={{ mt: 0.3, textAlign: mine ? 'right' : 'left' }}>
                        <Typography
                          component="button"
                          onClick={() => setOpenTraceId((cur) => (cur === m.id ? null : m.id))}
                          sx={{
                            fontSize: 10.5,
                            color: t.text3,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            p: 0,
                            textDecoration: 'underline dotted',
                            '&:hover': { color: t.primary },
                          }}
                        >
                          {openTraceId === m.id ? '▾ Comment cette réponse a été faite' : '▸ Comment cette réponse a été faite'}
                        </Typography>
                        {openTraceId === m.id && (
                          <Box
                            sx={{
                              mt: 0.5,
                              p: 1,
                              borderRadius: 1.5,
                              bgcolor: t.bg2,
                              border: `1px solid ${t.border || 'rgba(0,0,0,0.08)'}`,
                              textAlign: 'left',
                              maxWidth: 320,
                              ml: mine ? 'auto' : 0,
                            }}
                          >
                            <Stack spacing={0.4}>
                              <TraceRow k="Moteur IA" v={m.trace.fallback ? `${m.trace.provider} (secours)` : m.trace.provider} />
                              {m.trace.model && <TraceRow k="Modèle" v={m.trace.model} />}
                              {typeof m.trace.latencyMs === 'number' && (
                                <TraceRow k="Latence" v={`${m.trace.latencyMs} ms`} />
                              )}
                              {typeof m.trace.historyCount === 'number' && (
                                <TraceRow k="Contexte" v={`${m.trace.historyCount} message(s) d'historique`} />
                              )}
                              {m.aiIntent?.locationStatus && (
                                <TraceRow k="Lieu" v={`${m.aiIntent.city || '—'} · ${locationStatusLabel(m.aiIntent.locationStatus)}`} />
                              )}
                              {m.aiIntent?.propertyType && <TraceRow k="Type de bien" v={m.aiIntent.propertyType} />}
                              {m.aiIntent?.checkIn && m.aiIntent?.checkOut && (
                                <TraceRow k="Dates" v={`${m.aiIntent.checkIn} → ${m.aiIntent.checkOut}`} />
                              )}
                              {m.aiIntent?.guests && <TraceRow k="Voyageurs" v={`${m.aiIntent.guests}`} />}
                              {m.aiIntent?.budgetMad && (
                                <TraceRow k="Budget" v={`≤ ${m.aiIntent.budgetMad.toLocaleString('fr-FR')} MAD`} />
                              )}
                            </Stack>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}
