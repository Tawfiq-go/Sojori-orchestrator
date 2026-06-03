import { Box, Chip, Stack, Typography } from '@mui/material';
import { CHATBOT_T as T } from './chatbotTokens';
import {
  type ConversationPreviewLike,
  type GuestContextWhatsappLike,
  type GuestWhatsappFlowEntry,
  type GuestWhatsappRequestEntry,
  flowDisplayLabel,
  flowStatusUi,
  formatRelativeTimeFr,
  requestDisplayLabel,
} from './guestWhatsappMemory';

const OUTCOME_COLOR: Record<string, { bg: string; color: string }> = {
  completed: { bg: 'rgba(10,143,94,0.12)', color: T.success },
  pending: { bg: 'rgba(6,115,179,0.12)', color: T.info },
  abandoned: { bg: 'rgba(200,30,30,0.1)', color: T.error },
  likely_ignored: { bg: 'rgba(196,101,6,0.12)', color: T.warning },
};

function SectionTitle({ children, badge }: { children: string; badge?: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, mt: 2.5 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: T.text3, textTransform: 'uppercase' }}>
        {children}
      </Typography>
      {badge && (
        <Chip size="small" label={badge} sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: T.bg3, color: T.text3 }} />
      )}
    </Stack>
  );
}

function MemoryStat({
  label,
  value,
  empty = '—',
}: {
  label: string;
  value?: string | null;
  empty?: string;
}) {
  const display = value?.trim() ? value.trim() : empty;
  const muted = display === empty;
  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: 1.25,
        border: `1px solid ${T.border}`,
        bgcolor: muted ? T.bg2 : T.bg1,
        minHeight: 72,
      }}
    >
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 13,
          fontWeight: muted ? 500 : 700,
          color: muted ? T.text4 : T.text,
          mt: 0.5,
          lineHeight: 1.4,
          wordBreak: 'break-word',
        }}
      >
        {display}
      </Typography>
    </Box>
  );
}

function FlowRow({ entry, index }: { entry: GuestWhatsappFlowEntry; index: number }) {
  const now = new Date();
  const status = flowStatusUi(entry, now);
  const colors = OUTCOME_COLOR[status.outcome] ?? OUTCOME_COLOR.pending;
  const sentWhen = formatRelativeTimeFr(entry.sentAt, now);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.25,
        alignItems: 'flex-start',
        py: 1.25,
        px: 1.25,
        borderRadius: 1.25,
        border: `1px solid ${T.border}`,
        bgcolor: colors.bg,
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          bgcolor: T.bg1,
          border: `2px solid ${colors.color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 800,
          color: colors.color,
          flexShrink: 0,
        }}
      >
        {index + 1}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.text }}>{flowDisplayLabel(entry.flowKind)}</Typography>
        <Typography sx={{ fontSize: 12, color: T.text2, mt: 0.25 }}>
          Envoyé <b>{sentWhen}</b>
          {entry.flowKind && (
            <Box component="span" sx={{ fontFamily: 'monospace', fontSize: 10.5, color: T.text4, ml: 0.75 }}>
              ({entry.flowKind})
            </Box>
          )}
        </Typography>
        {status.hint && (
          <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.35, lineHeight: 1.4 }}>{status.hint}</Typography>
        )}
      </Box>
      <Chip
        size="small"
        label={status.label}
        sx={{ fontWeight: 800, fontSize: 10.5, bgcolor: colors.bg, color: colors.color, flexShrink: 0 }}
      />
    </Box>
  );
}

function RequestRow({ entry }: { entry: GuestWhatsappRequestEntry }) {
  const when = formatRelativeTimeFr(entry.requestedAt);
  const resolved = Boolean(entry.resolved);
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        py: 1,
        px: 1.25,
        borderRadius: 1.25,
        border: `1px solid ${T.border}`,
        bgcolor: resolved ? 'rgba(10,143,94,0.06)' : 'rgba(196,101,6,0.06)',
      }}
    >
      <Typography sx={{ fontSize: 18, lineHeight: 1 }}>{resolved ? '✓' : '○'}</Typography>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: T.text }}>{requestDisplayLabel(entry.kind)}</Typography>
        <Typography sx={{ fontSize: 12, color: T.text2 }}>Détecté {when}</Typography>
        {entry.summary && (
          <Typography sx={{ fontSize: 12, color: T.text3, mt: 0.35, fontStyle: 'italic' }}>{entry.summary}</Typography>
        )}
        {(entry.exactDate || entry.exactTime || entry.relativeDate) && (
          <Typography sx={{ fontSize: 11, color: T.text4, mt: 0.25 }}>
            {[entry.relativeDate, entry.exactDate, entry.exactTime].filter(Boolean).join(' · ')}
          </Typography>
        )}
      </Box>
      <Chip
        size="small"
        label={resolved ? 'Traité' : 'Ouvert'}
        sx={{
          fontWeight: 700,
          fontSize: 10.5,
          bgcolor: resolved ? 'rgba(10,143,94,0.12)' : 'rgba(196,101,6,0.12)',
          color: resolved ? T.success : T.warning,
        }}
      />
    </Box>
  );
}

function ChatBubble({ role, content }: { role: 'user' | 'assistant' | 'system'; content: string }) {
  if (role === 'system') return null;
  const isUser = role === 'user';
  return (
    <Box sx={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', mb: 0.75 }}>
      <Box
        sx={{
          maxWidth: '92%',
          px: 1.25,
          py: 0.85,
          borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          bgcolor: isUser ? 'rgba(184,133,26,0.14)' : T.bg2,
          border: `1px solid ${T.border}`,
        }}
      >
        <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: T.text4, textTransform: 'uppercase', mb: 0.25 }}>
          {isUser ? 'Voyageur' : 'Sojori'}
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: T.text, lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {content.length > 500 ? `${content.slice(0, 500)}…` : content}
        </Typography>
      </Box>
    </Box>
  );
}

export default function GuestWhatsappMemoryPanel({
  whatsapp,
  conversationPreview,
  hasCommunicated,
}: {
  whatsapp?: GuestContextWhatsappLike | null;
  conversationPreview?: ConversationPreviewLike | null;
  hasCommunicated?: boolean;
}) {
  const flows = [...(whatsapp?.flowsSent ?? [])].reverse();
  const requests = [...(whatsapp?.requests ?? [])].reverse();
  const topics = whatsapp?.recentIntents ?? [];
  const exchanges = conversationPreview?.recentExchanges ?? [];
  const totalMessages = conversationPreview?.totalMessages ?? 0;
  const pairCount = conversationPreview?.exchangePairCount ?? 10;

  const hasMemory =
    Boolean(whatsapp?.lastUserNeed) ||
    Boolean(whatsapp?.lastUnresolvedRequest) ||
    flows.length > 0 ||
    requests.length > 0 ||
    topics.length > 0 ||
    totalMessages > 0;

  if (!hasCommunicated && !hasMemory) {
    return (
      <Box className="cb-empty" sx={{ minHeight: 160, py: 3 }}>
        <span className="em">💬</span>
        <Typography sx={{ fontSize: 13, color: T.text3, maxWidth: 360 }}>
          Pas encore de mémoire WhatsApp pour ce voyageur. Les formulaires envoyés, demandes détectées et le fil de conversation
          apparaîtront ici dès le premier échange.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <SectionTitle badge="aligné LLM">Mémoire conversationnelle</SectionTitle>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(2, 1fr)' },
          gap: 1,
        }}
      >
        <MemoryStat label="Dernière intention" value={whatsapp?.lastUserNeed} />
        <MemoryStat label="Point ouvert" value={whatsapp?.lastUnresolvedRequest} empty="Aucun" />
        <MemoryStat label="Dernière action OK" value={whatsapp?.lastSuccessfulAction} />
        <MemoryStat label="Dernier échec / abandon" value={whatsapp?.lastFailedAction} empty="Aucun" />
      </Box>

      <SectionTitle badge={flows.length ? String(flows.length) : undefined}>
        Formulaires & flows WhatsApp
      </SectionTitle>
      {flows.length === 0 ? (
        <Typography sx={{ fontSize: 12.5, color: T.text3, py: 1 }}>
          Aucun formulaire WhatsApp enregistré dans ce fil pour l&apos;instant.
        </Typography>
      ) : (
        <Stack spacing={0.75}>
          {flows.map((f, i) => (
            <FlowRow key={`${f.flowKind}-${f.sentAt}-${i}`} entry={f} index={flows.length - 1 - i} />
          ))}
        </Stack>
      )}

      {requests.length > 0 && (
        <>
          <SectionTitle badge={String(requests.length)}>Demandes détectées (bot)</SectionTitle>
          <Stack spacing={0.75}>
            {requests.map((r, i) => (
              <RequestRow key={`${r.kind}-${r.requestedAt}-${i}`} entry={r} />
            ))}
          </Stack>
        </>
      )}

      {topics.length > 0 && (
        <>
          <SectionTitle>Sujets déjà abordés</SectionTitle>
          <Stack spacing={0.5}>
            {topics.slice(0, 5).map((t, i) => (
              <Box
                key={`${t.detectedAt}-${i}`}
                sx={{
                  px: 1.25,
                  py: 0.85,
                  borderRadius: 1,
                  border: `1px dashed ${T.border}`,
                  bgcolor: T.bg2,
                }}
              >
                <Typography sx={{ fontSize: 12.5, color: T.text, fontStyle: 'italic' }}>
                  « {(t.userMessagePreview || '…').slice(0, 120)} »
                </Typography>
                <Typography sx={{ fontSize: 11, color: T.text4, mt: 0.25 }}>
                  {formatRelativeTimeFr(t.detectedAt)}
                  {t.type ? ` · ${t.type}` : ''}
                </Typography>
              </Box>
            ))}
          </Stack>
        </>
      )}

      <SectionTitle badge={totalMessages > 0 ? `${totalMessages} msgs` : undefined}>
        Dernier échange WhatsApp
      </SectionTitle>
      {exchanges.length === 0 ? (
        <Typography sx={{ fontSize: 12.5, color: T.text3, py: 1 }}>
          {totalMessages > 0
            ? `${totalMessages} message(s) en base — aperçu limité au dernier échange.`
            : 'Aucun message enregistré pour cette réservation.'}
        </Typography>
      ) : (
        <Box sx={{ p: 1.25, borderRadius: 1.25, border: `1px solid ${T.border}`, bgcolor: T.bg2 }}>
          <Typography sx={{ fontSize: 11.5, color: T.text3, mb: 1.25, fontWeight: 600 }}>
            Aperçu (1–2 derniers messages — fil complet dans Communications → WhatsApp)
          </Typography>
          {exchanges
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .slice(-4)
            .map((m, i) => (
              <ChatBubble key={i} role={m.role} content={m.content} />
            ))}
        </Box>
      )}

      {whatsapp?.updatedAt && (
        <Typography sx={{ fontSize: 10.5, color: T.text4, mt: 2, textAlign: 'right' }}>
          Mémoire WhatsApp mise à jour {formatRelativeTimeFr(whatsapp.updatedAt)}
        </Typography>
      )}
    </Box>
  );
}
