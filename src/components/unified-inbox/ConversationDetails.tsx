import { Box, Typography } from '@mui/material';
import type { Thread } from '../../types/unifiedInbox.types';
import type { InboxReservationData } from '../../types/inboxReservation.types';
import type { ReservationTask } from '../../types/reservationTask.types';
import { T } from './_tokens';
import {
  DtCard,
  DtRow,
  DetailsHeader,
  PlatformChip,
  PriceHero,
  StatusPill,
  StickyActionButton,
} from './inboxV4Ui';
import { bookingSourceTone, normalizeBookingSource } from './inboxFormat';
import { isBookingPlatform } from './otaPlatformTheme';
import TasksSection from './TasksSection';

interface ConversationDetailsProps {
  thread: Thread;
  type: 'whatsapp' | 'staff' | 'ota' | 'leads' | 'reviews';
  reservation?: InboxReservationData;
  onAction?: (action: string) => void;
}

export default function ConversationDetails({
  thread,
  type,
  reservation,
  onAction,
}: ConversationDetailsProps) {
  const isStaff = type === 'staff';
  const isLeads = type === 'leads';
  const isReviews = type === 'reviews';
  const isOtaStyle = type === 'ota' || isLeads || isReviews;
  const r = reservation ?? {};
  const bookingSource = r.bookingSource || normalizeBookingSource(r.otaPlatform);
  const resaStatus = r.reservationStatus || (isLeads ? r.leadStatus || 'Demande' : 'Confirmée');

  const headerLabel = isStaff
    ? 'Contexte staff'
    : isReviews
      ? 'Contexte avis'
      : isLeads
        ? 'Contexte demande'
        : type === 'ota'
          ? 'Contexte réservation'
          : 'Contexte conversation';

  const headerTitle = isStaff
    ? thread.name
    : isReviews
      ? `${bookingSource || 'OTA'} · ${r.reservationNumber || thread.reservationNumber || '—'}`
      : isLeads
        ? `${bookingSource || 'Demande'} · ${r.reservationNumber || 'Lead'}`
        : type === 'ota'
          ? `${r.otaPlatform || bookingSource || 'OTA'} · ${r.reservationNumber || thread.reservationNumber || '—'}`
          : 'Réservation active';

  const handleContactStaff = (task: ReservationTask) => {
    if (task.assignedStaff?.phone) {
      window.open(`https://wa.me/${task.assignedStaff.phone.replace(/\D/g, '')}`);
    }
  };

  const allTasks = thread.tasks ?? [];
  const supportTasks = allTasks.filter((t) => (t.type || '').toLowerCase().includes('support'));
  const linkedTasks = allTasks.filter((t) => !supportTasks.includes(t));

  const tasksCard = (tasks: ReservationTask[], title: string, layout: 'grouped' | 'flat' = 'grouped') =>
    thread.tasks !== undefined ? (
      <Box
        sx={{
          bgcolor: T.bg1,
          border: `1px solid ${T.border}`,
          borderRadius: '11px',
          p: '12px 13px',
          boxShadow: '0 1px 2px rgba(20,17,10,0.03)',
        }}
      >
        <TasksSection
          tasks={tasks}
          loading={thread.tasksLoading}
          title={title}
          layout={layout}
          onContactStaff={handleContactStaff}
          onViewDetails={(t) => onAction?.(`task:${t.taskId}`)}
          onAssign={(t) => onAction?.(`assign:${t.taskId}`)}
        />
      </Box>
    ) : null;

  return (
    <Box
      sx={{
        display: { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
        minHeight: 0,
        borderLeft: `1px solid ${T.border}`,
        bgcolor: T.bg2,
      }}
    >
      <DetailsHeader label={headerLabel} title={headerTitle} />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          px: '14px',
          py: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.375,
        }}
      >
        {isStaff ? (
          <>
            <DtCard title="Contact" emoji="👷">
              <DtRow label="Nom">{thread.name}</DtRow>
              {thread.phone && <DtRow label="Téléphone">{thread.phone}</DtRow>}
              <DtRow label="Rôle">
                <PlatformChip label="STAFF" tone="default" />
              </DtRow>
              <DtRow label="Canal">
                <PlatformChip label="💬 WhatsApp" tone="wa" />
              </DtRow>
            </DtCard>
            {thread.listingName && (
              <DtCard title="Profil" emoji="📍">
                <DtRow label="Identifiant">{thread.listingName}</DtRow>
              </DtCard>
            )}
            {thread.tasks !== undefined && tasksCard(thread.tasks, 'Tâches staff', 'flat')}
          </>
        ) : isOtaStyle ? (
          <>
            <DtCard
              title={isReviews ? 'Avis' : isLeads ? bookingSource || 'Demande' : r.otaPlatform || bookingSource || 'Airbnb'}
              emoji={isReviews ? '⭐' : isLeads ? '🎯' : '🏠'}
            >
              {r.reservationNumber && (
                <DtRow label="N° résa">
                  <Typography
                    component="span"
                    sx={{ fontFamily: '"Geist Mono", monospace', color: T.primaryDeep, fontWeight: 700 }}
                  >
                    {r.reservationNumber}
                  </Typography>
                </DtRow>
              )}
              {r.listingName && (
                <DtRow label="Logement">
                  <Typography component="span">{r.listingName}</Typography>
                </DtRow>
              )}
              <DtRow label="Statut">
                <StatusPill label={resaStatus} />
              </DtRow>
              {(r.guestRating || r.reviewRating != null) && (
                <DtRow label={isReviews ? 'Note' : 'Voyageur ★'}>
                  <Typography component="span">
                    {isReviews && r.reviewRating != null
                      ? `${r.reviewRating}/5`
                      : r.guestRating}
                  </Typography>
                </DtRow>
              )}
              {isReviews && (
                <DtRow label="Réponse">
                  <StatusPill label={r.reviewReplied ? 'Répondu' : 'À répondre'} />
                </DtRow>
              )}
            </DtCard>

            {(r.checkInDisplay || r.checkOutDisplay || r.guestsLabel) && (
              <DtCard
                title={r.nightsCount ? `Séjour · ${r.nightsCount}n` : 'Séjour'}
                emoji="📅"
              >
                {r.checkInDisplay && <DtRow label="Check-in">{r.checkInDisplay}</DtRow>}
                {r.checkOutDisplay && <DtRow label="Check-out">{r.checkOutDisplay}</DtRow>}
                {r.guestsLabel && <DtRow label="Voyageurs">{r.guestsLabel}</DtRow>}
              </DtCard>
            )}

            {r.totalPrice != null && (
              <DtCard title="Tarif" emoji="💰">
                <PriceHero value={r.totalPrice} currency={r.currency} />
                {r.netHost != null && <DtRow label="Net hôte">{`${r.netHost} ${r.currency || 'EUR'}`}</DtRow>}
                {r.commission != null && (
                  <DtRow label="Commission">{`${r.commission} ${r.currency || 'EUR'}`}</DtRow>
                )}
              </DtCard>
            )}
          </>
        ) : (
          <>
            <DtCard title="Réservation" emoji="📋">
              {r.reservationNumber && (
                <DtRow label="N°">
                  <Typography
                    component="span"
                    sx={{ fontFamily: '"Geist Mono", monospace', color: T.primaryDeep, fontWeight: 700 }}
                  >
                    {r.reservationNumber}
                  </Typography>
                </DtRow>
              )}
              {r.listingName && <DtRow label="Logement">{r.listingName}</DtRow>}
              {bookingSource && (
                <DtRow label="Source">
                  <PlatformChip label={`🏠 ${bookingSource}`} tone={bookingSourceTone(bookingSource)} />
                </DtRow>
              )}
              <DtRow label="Canal">
                <PlatformChip label="💬 WhatsApp" tone="wa" />
              </DtRow>
              <DtRow label="Statut">
                <StatusPill label={resaStatus} />
              </DtRow>
            </DtCard>

            {(r.checkInDisplay || r.checkOutDisplay || r.guestsLabel) && (
              <DtCard
                title={r.nightsCount ? `Séjour · ${r.nightsCount}n` : 'Séjour'}
                emoji="📅"
              >
                {r.checkInDisplay && <DtRow label="Check-in">{r.checkInDisplay}</DtRow>}
                {r.checkOutDisplay && <DtRow label="Check-out">{r.checkOutDisplay}</DtRow>}
                {r.guestsLabel && <DtRow label="Voyageurs">{r.guestsLabel}</DtRow>}
              </DtCard>
            )}

            {r.totalPrice != null && (
              <DtCard title="Tarif" emoji="💰">
                <PriceHero value={r.totalPrice} currency={r.currency} />
                {r.paymentStatus && (
                  <DtRow label="Paiement">
                    <Typography component="span" sx={{ color: T.success, fontWeight: 700 }}>
                      {r.paymentStatus}
                    </Typography>
                  </DtRow>
                )}
              </DtCard>
            )}
          </>
        )}

        {thread.tasks !== undefined && !isStaff && (
          <>
            {tasksCard(linkedTasks, 'Tâches liées', isOtaStyle ? 'flat' : 'grouped')}
            {!isOtaStyle && tasksCard(supportTasks, 'Support', 'grouped')}
          </>
        )}
      </Box>

      {!isStaff && (r.reservationNumber || thread.reservationNumber) && (
        <StickyActionButton
          variant={
            isOtaStyle && isBookingPlatform(thread.channel, r.otaPlatform || bookingSource)
              ? 'booking'
              : isOtaStyle
                ? 'airbnb'
                : 'gold'
          }
          label={
            isReviews
              ? '⭐ Publier réponse →'
              : isLeads
                ? `🔗 Ouvrir sur ${bookingSource || 'OTA'} →`
                : type === 'ota'
                  ? `🔗 Ouvrir sur ${r.otaPlatform || bookingSource || 'OTA'} →`
                  : '📋 Voir réservation complète →'
          }
          onClick={() =>
            onAction?.(
              isReviews ? 'publish-review' : isLeads || type === 'ota' ? 'view-platform' : 'view-full-reservation',
            )
          }
        />
      )}
    </Box>
  );
}
