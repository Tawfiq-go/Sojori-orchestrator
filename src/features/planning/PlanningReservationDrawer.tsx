/**
 * Drawer aperçu résa depuis le planning — reste dans le cockpit (pas de navigation).
 * Actions secondaires : WA / OTA / fiche complète.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { T } from '../../components/calendar-v3/_shared';
import {
  channelFromName,
  cleaningLabelFr,
  type ListingRow,
  type ReservationRow,
  type TimelineItem,
} from '../../components/calendar-views/_shared';
import { ModalScrollColumn } from '../../components/common/ModalScrollColumn';
import { otaInboxUrl, waInboxUrl } from '../../utils/commsDeepLinks';
import PlanningThreadPanel, { PlanningThreadComposer } from './PlanningThreadPanel';

const DRAWER_WIDTH = 460;

export type PlanningReservationFocus = 'overview' | 'wa' | 'ota';

export type PlanningReservationDrawerProps = {
  reservation: ReservationRow;
  listing: Pick<ListingRow, 'listingId' | 'listingName' | 'city'>;
  focus?: PlanningReservationFocus;
  onClose: () => void;
  onTaskClick?: (item: TimelineItem) => void;
  /** Initier WA (template) — optionnel, fourni par ResasTab. */
  onInitiateWhatsApp?: () => void;
  initiateBusy?: boolean;
  canInitiateWhatsApp?: boolean;
};

function channelMeta(channelName?: string) {
  const ch = channelFromName(channelName);
  const c = String(channelName || '').toLowerCase();
  if (c.includes('booking') || ch === 'booking')
    return { icon: '💼', label: 'Booking.com', color: '#003580' };
  if (c.includes('airbnb') || ch === 'airbnb')
    return { icon: '🏠', label: 'Airbnb', color: '#FF5A5F' };
  if (c.includes('vrbo') || ch === 'vrbo')
    return { icon: '🏡', label: 'Vrbo', color: '#0E64A4' };
  return { icon: '📱', label: channelName || 'Direct', color: T.primaryDeep };
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function nightsBetween(arrival?: string, departure?: string) {
  if (!arrival || !departure) return null;
  const a = new Date(arrival).getTime();
  const d = new Date(departure).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(d)) return null;
  return Math.max(0, Math.round((d - a) / 86400000));
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 1.5,
        py: 1.1,
        px: 1.5,
        borderRadius: '10px',
        bgcolor: T.bg2,
        border: `1px solid ${T.border}`,
      }}
    >
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: T.text3 }}>{label}</Typography>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: T.text, textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  color,
  variant = 'solid',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  color: string;
  variant?: 'solid' | 'outline';
}) {
  return (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      sx={{
        width: '100%',
        py: 1.15,
        px: 1.5,
        borderRadius: '10px',
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        ...(variant === 'solid'
          ? { bgcolor: color, color: '#fff', border: 0, '&:hover': { filter: 'brightness(0.95)' } }
          : {
              bgcolor: 'transparent',
              color,
              border: `1.5px solid ${color}`,
              '&:hover': { bgcolor: `${color}12` },
            }),
      }}
    >
      {children}
    </Box>
  );
}

function taskChipLabel(t: TimelineItem): string {
  if (t.type === 'cleaning') return cleaningLabelFr(t);
  if (t.type === 'arrival') return 'Arrivée';
  if (t.type === 'departure') return 'Départ';
  return String(t.category || t.type || 'Tâche');
}

export default function PlanningReservationDrawer({
  reservation,
  listing,
  focus = 'overview',
  onClose,
  onTaskClick,
  onInitiateWhatsApp,
  initiateBusy,
  canInitiateWhatsApp,
}: PlanningReservationDrawerProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const channel = channelMeta(reservation.channelName);
  const code = reservation.reservationNumber || reservation.reservationId;
  const nights = nightsBetween(reservation.arrivalDate, reservation.departureDate);
  const ops = reservation.stayOps;
  const tasks = useMemo(
    () => (reservation.timeline || []).filter((t) => t.isTask !== false),
    [reservation.timeline],
  );
  const phone = String(reservation.lastWa?.phone || '').trim();
  const waExists = Boolean(reservation.lastWa?.exists || phone);
  const otaExists = Boolean(
    reservation.lastOta?.exists || reservation.lastOta?.threadId || reservation.lastOta?.text,
  );
  const [panel, setPanel] = useState<'overview' | 'wa' | 'ota'>(
    focus === 'wa' || focus === 'ota' ? focus : 'overview',
  );
  const [threadReload, setThreadReload] = useState(0);

  useEffect(() => {
    setPanel(focus === 'wa' || focus === 'ota' ? focus : 'overview');
  }, [focus, reservation.reservationId, reservation.reservationNumber]);

  const messageTabs = (
    <Stack direction="row" spacing={0.75} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
      {(
        [
          { id: 'overview' as const, label: 'Résumé', color: T.primaryDeep },
          { id: 'wa' as const, label: 'WhatsApp', color: '#128C4B', disabled: !waExists },
          { id: 'ota' as const, label: 'OTA', color: '#003580', disabled: !otaExists },
        ] as const
      ).map((tab) => {
        const active = panel === tab.id;
        const disabled = 'disabled' in tab && tab.disabled;
        return (
          <Box
            key={tab.id}
            component="button"
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setPanel(tab.id)}
            sx={{
              all: 'unset',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.4 : 1,
              fontSize: 11.5,
              fontWeight: active ? 800 : 600,
              px: 1.25,
              py: 0.55,
              borderRadius: '8px',
              border: `1px solid ${active ? tab.color : T.border}`,
              bgcolor: active ? `${tab.color}18` : T.bg1,
              color: active ? tab.color : T.text2,
              fontFamily: 'inherit',
            }}
          >
            {tab.label}
          </Box>
        );
      })}
    </Stack>
  );

  const openFullPage = () => {
    const routeId = reservation.reservationNumber || reservation.reservationId;
    if (!routeId) return;
    onClose();
    navigate(`/reservations/${encodeURIComponent(routeId)}`);
  };

  const openWa = () => {
    navigate(
      waInboxUrl({
        phone: phone || undefined,
        reservationNumber: reservation.reservationNumber,
      }),
    );
  };

  const openOta = () => {
    navigate(
      otaInboxUrl({
        threadId: reservation.lastOta?.threadId,
        reservationNumber: reservation.reservationNumber,
      }),
    );
  };

  const drawerOpen = Boolean(reservation);

  return (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={onClose}
      disableScrollLock
      sx={{
        '& .MuiDrawer-paper': {
          width: isMobile ? '100%' : DRAWER_WIDTH,
          maxWidth: '100vw',
          height: '100%',
          maxHeight: '100dvh',
          bgcolor: T.bg1,
          borderLeft: `1px solid ${T.border}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ px: 2.25, py: 2, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Box component="span" sx={{ fontSize: 20 }}>
                  {channel.icon}
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: channel.color }}>
                  {channel.label}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    fontFamily: '"Geist Mono", monospace',
                    color: T.text,
                  }}
                >
                  {code}
                </Typography>
              </Stack>
              <Typography sx={{ mt: 0.75, fontSize: 18, fontWeight: 800, color: T.text, lineHeight: 1.25 }}>
                {reservation.guestName || 'Guest'}
              </Typography>
              <Typography sx={{ mt: 0.35, fontSize: 12.5, color: T.text2 }}>
                {listing.listingName}
                {listing.city ? ` · ${listing.city}` : ''}
              </Typography>
            </Box>
            <Box
              component="button"
              type="button"
              aria-label="Fermer"
              onClick={onClose}
              sx={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                border: `1px solid ${T.border}`,
                bgcolor: T.bg1,
                cursor: 'pointer',
                fontSize: 18,
                color: T.text2,
                flexShrink: 0,
              }}
            >
              ×
            </Box>
          </Stack>

          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
            <MetaChip>
              {reservation.status === 'confirmed' ? 'Confirmée' : 'En attente'}
            </MetaChip>
            {nights != null && <MetaChip>{nights} nuit{nights > 1 ? 's' : ''}</MetaChip>}
            {reservation.numberOfGuests != null && (
              <MetaChip>{reservation.numberOfGuests} voyageur{reservation.numberOfGuests > 1 ? 's' : ''}</MetaChip>
            )}
          </Stack>
          {messageTabs}
        </Box>

        {panel === 'overview' ? (
          <ModalScrollColumn
            active={drawerOpen}
            className="planning-reservation-drawer-scroll"
            wrapperSx={{ flex: 1, minHeight: 0 }}
            innerSx={{ px: 2.25, py: 2 }}
          >
            <Stack spacing={1}>
              <InfoRow label="Arrivée" value={fmtDate(reservation.arrivalDate)} />
              <InfoRow label="Départ" value={fmtDate(reservation.departureDate)} />
              {phone ? <InfoRow label="Téléphone" value={phone} /> : null}
            </Stack>

            {ops && (
              <Box sx={{ mt: 2.25 }}>
                <SectionLabel>Check-in / séjour</SectionLabel>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <InfoRow
                    label="Enregistrement"
                    value={
                      ops.toRegister > 0
                        ? `${ops.registered}/${ops.toRegister}`
                        : ops.registered > 0
                          ? `${ops.registered} OK`
                          : '—'
                    }
                  />
                  <InfoRow
                    label="Heure arrivée"
                    value={
                      ops.arrivalChosen && ops.arrivalTime
                        ? String(ops.arrivalTime)
                        : ops.arrived
                          ? 'Sur place'
                          : 'Non choisie'
                    }
                  />
                  <InfoRow
                    label="Heure départ"
                    value={
                      ops.departureChosen && ops.departureTime
                        ? String(ops.departureTime)
                        : 'Non choisie'
                    }
                  />
                </Stack>
              </Box>
            )}

            {tasks.length > 0 && (
              <Box sx={{ mt: 2.25 }}>
                <SectionLabel>Tâches liées</SectionLabel>
                <Stack spacing={0.75} sx={{ mt: 1 }}>
                  {tasks.map((t, idx) => {
                    const taskId = String(
                      (t.data as { taskId?: string; _id?: string } | undefined)?.taskId ||
                        (t.data as { _id?: string } | undefined)?._id ||
                        '',
                    );
                    const clickable = Boolean(taskId && onTaskClick);
                    return (
                      <Box
                        key={`${taskId || t.type}-${idx}`}
                        component={clickable ? 'button' : 'div'}
                        type={clickable ? 'button' : undefined}
                        onClick={clickable ? () => onTaskClick?.(t) : undefined}
                        sx={{
                          all: clickable ? 'unset' : undefined,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          py: 1,
                          px: 1.25,
                          borderRadius: '10px',
                          bgcolor: T.bg2,
                          border: `1px solid ${T.border}`,
                          cursor: clickable ? 'pointer' : 'default',
                          fontFamily: 'inherit',
                          width: '100%',
                          textAlign: 'left',
                          '&:hover': clickable
                            ? { borderColor: T.primary, bgcolor: T.primaryTint }
                            : {},
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>
                            {taskChipLabel(t)}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: 11,
                              color: T.text3,
                              fontFamily: '"Geist Mono", monospace',
                            }}
                          >
                            {(t.scheduledFor || '').slice(0, 10)}
                            {t.staffName ? ` · ${t.staffName}` : ' · non assigné'}
                            {` · ${t.status || '—'}`}
                          </Typography>
                        </Box>
                        {clickable ? (
                          <Typography sx={{ fontSize: 12, color: T.primaryDeep, fontWeight: 700 }}>
                            →
                          </Typography>
                        ) : null}
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            )}

            <Box sx={{ mt: 2.25 }}>
              <SectionLabel>Messages</SectionLabel>
              <Stack spacing={1} sx={{ mt: 1 }}>
                <MsgPreview label="WhatsApp" color="#128C4B" meta={reservation.lastWa} />
                <MsgPreview label="OTA" color="#003580" meta={reservation.lastOta} />
                <Typography sx={{ fontSize: 11.5, color: T.text3, px: 0.25 }}>
                  Onglet WhatsApp / OTA pour le fil complet et répondre sans quitter le planning.
                </Typography>
              </Stack>
            </Box>
          </ModalScrollColumn>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              height: '100%',
              overflow: 'hidden',
              px: 2.25,
              py: 1.5,
            }}
          >
            <PlanningThreadPanel
              channel={panel}
              reservation={reservation}
              active={drawerOpen}
              reloadToken={threadReload}
            />
          </Box>
        )}


        <Box
          sx={{
            px: 2.25,
            py: 1.75,
            borderTop: `1px solid ${T.border}`,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {panel === 'wa' || panel === 'ota' ? (
            <PlanningThreadComposer
              channel={panel}
              reservation={reservation}
              onSent={() => setThreadReload((n) => n + 1)}
            />
          ) : null}
          {panel === 'wa' ? (
            <ActionBtn color="#128C4B" onClick={openWa} variant="outline">
              Ouvrir l’inbox WhatsApp
            </ActionBtn>
          ) : null}
          {panel === 'ota' ? (
            <ActionBtn color="#003580" onClick={openOta} variant="outline">
              Ouvrir l’inbox OTA
            </ActionBtn>
          ) : null}
          {panel === 'overview' ? (
            <>
              <ActionBtn
                color="#128C4B"
                onClick={() => (waExists ? setPanel('wa') : openWa())}
                disabled={!waExists && !reservation.reservationNumber}
              >
                💬 Voir échanges WhatsApp
              </ActionBtn>
              <ActionBtn
                color="#003580"
                onClick={() => (otaExists ? setPanel('ota') : openOta())}
                disabled={!otaExists && !reservation.reservationNumber}
              >
                🏨 Voir échanges OTA
              </ActionBtn>
            </>
          ) : null}
          {canInitiateWhatsApp && onInitiateWhatsApp ? (
            <ActionBtn
              color="#128C4B"
              variant="outline"
              onClick={onInitiateWhatsApp}
              disabled={initiateBusy}
            >
              {initiateBusy ? 'Envoi…' : 'Envoyer template WA'}
            </ActionBtn>
          ) : null}
          <Stack direction="row" spacing={1}>
            <ActionBtn color={T.primaryDeep} onClick={openFullPage}>
              Fiche complète
            </ActionBtn>
            <Box
              component="button"
              type="button"
              onClick={onClose}
              sx={{
                px: 2,
                py: 1.15,
                borderRadius: '10px',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: 'pointer',
                bgcolor: T.bg2,
                color: T.text2,
                border: `1px solid ${T.border}`,
              }}
            >
              Fermer
            </Box>
          </Stack>
        </Box>
      </Box>
    </Drawer>
  );
}

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={{
        fontSize: 11,
        fontWeight: 700,
        px: 1.1,
        py: 0.35,
        borderRadius: '8px',
        bgcolor: T.primaryTint,
        color: T.primaryDeep,
        fontFamily: '"Geist Mono", monospace',
      }}
    >
      {children}
    </Box>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Typography
      sx={{
        fontSize: 10.5,
        fontWeight: 700,
        color: T.text3,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontFamily: '"Geist Mono", monospace',
      }}
    >
      {children}
    </Typography>
  );
}

function MsgPreview({
  label,
  color,
  meta,
  highlight,
}: {
  label: string;
  color: string;
  meta?: ReservationRow['lastWa'] | ReservationRow['lastOta'];
  highlight?: boolean;
}) {
  const text = String(meta?.text || '').trim();
  const empty = !text || text === '—' || /^whatsapp lié|fil ota$/i.test(text);
  return (
    <Box
      sx={{
        py: 1,
        px: 1.25,
        borderRadius: '10px',
        bgcolor: highlight ? `${color}14` : T.bg2,
        border: `1px solid ${highlight ? color : T.border}`,
      }}
    >
      <Typography sx={{ fontSize: 11, fontWeight: 800, color, mb: 0.35 }}>{label}</Typography>
      <Typography
        sx={{
          fontSize: 12.5,
          fontWeight: 600,
          color: empty ? T.text3 : T.text,
          lineHeight: 1.35,
        }}
      >
        {empty ? 'Aucun aperçu' : text}
      </Typography>
      {(meta?.time || meta?.at) && (
        <Typography
          sx={{
            mt: 0.35,
            fontSize: 10.5,
            color: T.text3,
            fontFamily: '"Geist Mono", monospace',
          }}
        >
          {meta.time || meta.at}
          {meta.needsReply ? ' · à répondre' : ''}
          {(meta.unread || 0) > 0 ? ` · ${meta.unread} non lu` : ''}
        </Typography>
      )}
    </Box>
  );
}
