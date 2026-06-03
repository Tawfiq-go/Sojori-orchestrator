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
import { ChatbotCleaningSchedulePanel } from './ChatbotCleaningSchedulePanel';
import WhitelistLanguageCell from './WhitelistLanguageCell';
import WhatsappMenuInterpretationPanel from './WhatsappMenuInterpretationPanel';
import GuestWhatsappMemoryPanel from './GuestWhatsappMemoryPanel';
import type { ConversationPreviewLike, GuestContextWhatsappLike } from './guestWhatsappMemory';
import {
  interpretMenuOptionsForStay,
  type MenuOptionLike,
} from './whatsappMenuAvailability';
import {
  GuestJourneyDetailPanel,
  type GuestContextDetail,
  type ListingSnapshotDetail,
} from './ChatbotWhitelistStayPanels';

moment.locale('fr');

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || '?').toUpperCase();
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
  const guestContext = detail?.guestContext as
    | (GuestContextDetail & { whatsapp?: GuestContextWhatsappLike })
    | null
    | undefined;
  const listingSnapshot = detail?.listingSnapshot as ListingSnapshotDetail | null | undefined;
  const conversationPreview = detail?.conversationPreview as ConversationPreviewLike | null | undefined;
  const whatsappMemory = guestContext?.whatsapp;
  const registration = guestContext?.registration;
  const listingId = wl?.listingId ? String(wl.listingId) : '';
  const listingName = listingSnapshot?.name || '';

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
                      <b>{String(wl.reservationCode ?? '—')}</b> · {String(wl.phoneOta ?? '—')}
                    </div>
                    <Box sx={{ mt: 0.75 }}>
                      <WhitelistLanguageCell
                        guestLanguage={wl.guestLanguage as string | undefined}
                        whatsappSelectedLanguage={wl.whatsappSelectedLanguage as string | null | undefined}
                      />
                    </Box>
                    {listingName ? (
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.text2, mt: 0.5 }}>
                        {listingName}
                      </Typography>
                    ) : null}
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
                <span className="em">📅</span>
                <div className="v muted">{checkInLabel ?? '—'}</div>
                <div className="l">Arrivée</div>
              </div>
              <div className="synth-cell">
                <span className="em">🛬</span>
                <div
                  className={`v ${guestContext?.arrival?.choose?.chosen ? 'green' : 'amber'}`}
                  style={{ fontSize: guestContext?.arrival?.choose?.time ? 15 : undefined }}
                >
                  {guestContext?.arrival?.choose?.time ?? '—'}
                </div>
                <div className="l">
                  Heure arrivée
                  {guestContext?.arrival?.choose?.chosen ? ' · choisie' : ''}
                </div>
              </div>
              <div className="synth-cell">
                <span className="em">📅</span>
                <div className="v muted">{checkOutLabel ?? '—'}</div>
                <div className="l">Départ</div>
              </div>
              <div className="synth-cell">
                <span className="em">🏠</span>
                <div className="v muted" style={{ fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>
                  {listingId ? listingId.slice(-8) : '—'}
                </div>
                <div className="l">Listing ID</div>
              </div>
            </div>
          </div>

          {listingId ? (
            <Stack direction="row" sx={{ mb: 2, gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography sx={{ fontSize: 12, color: T.text3 }}>Listing</Typography>
              <Typography
                sx={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, fontWeight: 600, color: T.text2 }}
              >
                {listingId}
              </Typography>
              <Link to={`/chatbot/listing?listingId=${encodeURIComponent(listingId)}`} className="cb-link">
                Infos logement ↗
              </Link>
            </Stack>
          ) : null}

          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ mb: 2, borderBottom: `1px solid ${T.border}`, '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}
          >
            <Tab label="Parcours séjour" />
            <Tab label="Menu WhatsApp (A → L)" />
            <Tab label="Mémoire bot" />
          </Tabs>

          {tab === 0 && (
            <>
              <div className="prog-card">
                <div className="prog-h">
                  <h3>🧹 Plan ménage · config listing</h3>
                  <Chip size="small" label="frequency + payant" sx={{ ml: 'auto', fontSize: 10 }} />
                </div>
                <Box sx={{ p: 1.5 }}>
                  <ChatbotCleaningSchedulePanel
                    checkIn={wl.checkIn as string | Date | undefined}
                    checkOut={wl.checkOut as string | Date | undefined}
                    cleaning={listingSnapshot?.cleaning}
                    guestCleaningFree={guestContext?.cleaningFree}
                    freeCleaningEnabled={listingSnapshot?.flags?.orchestration_cleaning_free !== false}
                    paidCleaningEnabled={listingSnapshot?.flags?.orchestration_cleaning_paid !== false}
                  />
                </Box>
              </div>

              <div className="prog-card" style={{ marginTop: 16 }}>
                <div className="prog-h">
                  <h3>Guest context — parcours séjour</h3>
                  <Chip size="small" label="guest_context" sx={{ ml: 'auto', fontSize: 10 }} />
                </div>
                <Box sx={{ p: 1.5 }}>
                  <GuestJourneyDetailPanel gc={guestContext} listingSnapshot={listingSnapshot} />
                </Box>
              </div>
            </>
          )}

          {tab === 1 && (
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

          {tab === 2 && (
            <div className="prog-card">
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
          )}
        </Box>
      )}
    </div>
  );
}
