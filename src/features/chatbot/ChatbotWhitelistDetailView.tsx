import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { Link, useNavigate, useParams } from 'react-router-dom';
import moment from 'moment';
import 'moment/locale/fr';
import '../planReservation/planReservation.css';
import './chatbotHub.css';
import * as fullchatbotApi from '../../services/fullchatbotApi';
import { CHATBOT_T as T } from './chatbotTokens';
import WhatsappMenuInterpretationPanel from './WhatsappMenuInterpretationPanel';
import GuestWhatsappMemoryPanel from './GuestWhatsappMemoryPanel';
import type { ConversationPreviewLike, GuestContextWhatsappLike } from './guestWhatsappMemory';
import {
  interpretMenuOptionsForStay,
  type GuestContextLike,
  type MenuOptionLike,
} from './whatsappMenuAvailability';

moment.locale('fr');

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || '?').toUpperCase();
}

type OpenTaskLike = {
  type?: string;
  status?: string;
  summary?: string;
  categoryLabel?: string;
  scheduledDate?: string;
};

function GuestJourneyPanel({ gc }: { gc: GuestContextLike | null | undefined }) {
  if (!gc) {
    return (
      <Typography sx={{ fontSize: 13, color: T.text3, py: 2 }}>
        Parcours séjour pas encore synchronisé (fulltask).
      </Typography>
    );
  }

  const rows = [
    {
      icon: '👥',
      label: 'Enregistrement',
      value: `${gc.registration?.registered ?? 0} / ${gc.registration?.total ?? '?'}`,
      ok: Boolean(gc.registration?.complete),
    },
    {
      icon: '🕐',
      label: 'Heure arrivée',
      value: gc.arrival?.choose?.chosen ? 'Choisie' : 'Non choisie',
      ok: Boolean(gc.arrival?.choose?.chosen),
    },
    {
      icon: '🕐',
      label: 'Heure départ',
      value: gc.departure?.choose?.chosen ? 'Confirmée' : 'Non confirmée',
      ok: Boolean(gc.departure?.choose?.chosen),
    },
  ];

  return (
    <Stack spacing={1}>
      {rows.map((r) => (
        <Box
          key={r.label}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            p: 1.25,
            borderRadius: 1.25,
            border: `1px solid ${T.border}`,
            bgcolor: r.ok ? 'rgba(10,143,94,0.08)' : 'rgba(196,101,6,0.08)',
          }}
        >
          <Typography sx={{ fontSize: 20 }}>{r.icon}</Typography>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 12, color: T.text3, fontWeight: 600 }}>{r.label}</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.text }}>{r.value}</Typography>
          </Box>
          <Chip
            size="small"
            label={r.ok ? 'OK' : 'En attente'}
            sx={{
              fontWeight: 700,
              fontSize: 10.5,
              bgcolor: r.ok ? 'rgba(10,143,94,0.12)' : 'rgba(196,101,6,0.12)',
              color: r.ok ? T.success : T.warning,
            }}
          />
        </Box>
      ))}
    </Stack>
  );
}

function OpenTasksPanel({ tasks }: { tasks: OpenTaskLike[] }) {
  if (tasks.length === 0) return null;
  return (
    <Box sx={{ mt: 2.5 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: T.text3, textTransform: 'uppercase', mb: 1 }}>
        Tâches ouvertes (PMS)
      </Typography>
      <Stack spacing={0.75}>
        {tasks.slice(0, 8).map((t, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.25,
              borderRadius: 1.25,
              border: `1px solid ${T.border}`,
              bgcolor: T.bg2,
            }}
          >
            <Typography sx={{ fontSize: 18 }}>📋</Typography>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                {t.categoryLabel || t.type || 'Tâche'}
              </Typography>
              <Typography sx={{ fontSize: 12, color: T.text2 }}>
                {t.summary || t.status || '—'}
                {t.scheduledDate ? ` · ${moment(t.scheduledDate).format('DD MMM')}` : ''}
              </Typography>
            </Box>
            <Chip size="small" label={t.status || '—'} sx={{ fontSize: 10, fontWeight: 700 }} />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

export default function ChatbotWhitelistDetailView() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!reservationId) return;
    let cancelled = false;
    setLoading(true);
    fullchatbotApi
      .getWhitelistDetail(reservationId)
      .then((res) => {
        if (!cancelled) setDetail(res?.data ?? null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reservationId]);

  const wl = detail?.whitelist as Record<string, unknown> | undefined;
  const guestContext = detail?.guestContext as (GuestContextLike & { whatsapp?: GuestContextWhatsappLike; openTasks?: OpenTaskLike[] }) | null | undefined;
  const listingSnapshot = detail?.listingSnapshot;
  const conversationPreview = detail?.conversationPreview as ConversationPreviewLike | null | undefined;
  const whatsappMemory = guestContext?.whatsapp;
  const registration = guestContext?.registration;
  const openTasks = Array.isArray(guestContext?.openTasks) ? guestContext.openTasks : [];

  const guestName = String(wl?.guestName ?? 'Voyageur');
  const listingSnap = listingSnapshot as { name?: string; menu?: { menuOptions?: MenuOptionLike[] } } | null;
  const waInterpret = useMemo(
    () =>
      interpretMenuOptionsForStay(
        listingSnap?.menu?.menuOptions || [],
        wl?.checkIn as string | Date | undefined,
        wl?.checkOut as string | Date | undefined,
        guestContext,
      ),
    [listingSnap, wl?.checkIn, wl?.checkOut, guestContext],
  );

  const checkInLabel = wl?.checkIn ? moment(String(wl.checkIn)).format('DD MMM YYYY') : undefined;
  const checkOutLabel = wl?.checkOut ? moment(String(wl.checkOut)).format('DD MMM YYYY') : undefined;

  return (
    <div className="so-plan-res so-chatbot-hub">
      <Box sx={{ px: { xs: 2, md: 3 }, pt: 2, pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton size="small" onClick={() => navigate('/chatbot/whitelist')} sx={{ color: T.primaryDeep }}>
            <ArrowBack />
          </IconButton>
          <Typography sx={{ fontSize: 13, color: T.text3, fontWeight: 600 }}>Retour à la whitelist</Typography>
        </Stack>
      </Box>

      {error && (
        <Box sx={{ px: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: T.primary }} />
        </Box>
      )}

      {!loading && wl && (
        <Box className="wrap" sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, md: 3 }, pb: 4 }}>
          <div className="hero">
            <div className="hero-main">
              <div className="hero-identity">
                <div className="hero-guest">
                  <div className="hero-av">{initials(guestName)}</div>
                  <div className="hero-name">
                    <div className="hero-title-row">
                      <h1>{guestName}</h1>
                      <span className={`state-pill${wl.hasCommunicated ? ' progress' : ''}`}>
                        <span className="dot" />
                        {wl.hasCommunicated ? 'WHATSAPP ACTIF' : 'PAS ENCORE CONTACTÉ'}
                      </span>
                    </div>
                    <div className="meta">
                      <b>{String(wl.reservationCode ?? '—')}</b> · {String(wl.guestLanguage ?? 'fr').toUpperCase()} ·{' '}
                      {String(wl.phoneOta ?? '—')}
                    </div>
                    {listingSnap?.name && (
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.text2, mt: 0.5 }}>
                        {listingSnap.name}
                      </Typography>
                    )}
                  </div>
                </div>
                {Boolean(wl.listingId) && (
                  <Link to={`/listings/${wl.listingId}?level=config-new`} className="cb-link">
                    Config Orch. ↗
                  </Link>
                )}
              </div>
            </div>

            <div className="synth synth--compact">
              <div className="synth-cell">
                <span className="em">👥</span>
                <div className={`v ${registration?.complete ? 'green' : 'amber'}`}>
                  {registration?.registered ?? 0}/{registration?.total ?? '?'}
                </div>
                <div className="l">Enregistrement</div>
              </div>
              <div className="synth-cell">
                <span className="em">📋</span>
                <div className="v">{openTasks.length}</div>
                <div className="l">Tasks ouvertes</div>
              </div>
              <div className="synth-cell">
                <span className="em">🏠</span>
                <div className={`v ${listingSnapshot ? 'green' : 'muted'}`}>{listingSnapshot ? 'OK' : '—'}</div>
                <div className="l">Listing sync</div>
              </div>
              <div className="synth-cell">
                <span className="em">📅</span>
                <div className="v muted">{checkInLabel ?? '—'}</div>
                <div className="l">Arrivée</div>
              </div>
            </div>
          </div>

          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ mb: 2, borderBottom: `1px solid ${T.border}`, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}
          >
            <Tab label="Menu WhatsApp (A → L)" />
            <Tab label="Parcours séjour" />
          </Tabs>

          {tab === 0 && (
            <div className="prog-card">
              <div className="prog-h">
                <h3>Options menu — interprétation fullchatbot</h3>
              </div>
              <Box sx={{ p: 1.5 }}>
                <WhatsappMenuInterpretationPanel
                  options={waInterpret.options}
                  listingName={listingSnap?.name}
                  guestLabel={guestName}
                  checkInLabel={checkInLabel}
                  checkOutLabel={checkOutLabel}
                />
              </Box>
            </div>
          )}

          {tab === 1 && (
            <>
              <div className="prog-card">
                <div className="prog-h">
                  <h3>État du parcours voyageur</h3>
                  <Chip size="small" label="guest_context · PMS" sx={{ ml: 'auto', fontSize: 10 }} />
                </div>
                <Box sx={{ p: 1.5 }}>
                  <GuestJourneyPanel gc={guestContext} />
                  <OpenTasksPanel tasks={openTasks} />
                </Box>
              </div>

              <div className="prog-card" style={{ marginTop: 16 }}>
                <div className="prog-h">
                  <h3>Mémoire WhatsApp & parcours bot</h3>
                  <Chip size="small" label="whatsapp · LLM" sx={{ ml: 'auto', fontSize: 10 }} />
                </div>
                <Box sx={{ p: 1.5 }}>
                  <GuestWhatsappMemoryPanel
                    whatsapp={whatsappMemory}
                    conversationPreview={conversationPreview}
                    hasCommunicated={Boolean(wl.hasCommunicated)}
                  />
                </Box>
              </div>
            </>
          )}
        </Box>
      )}
    </div>
  );
}
