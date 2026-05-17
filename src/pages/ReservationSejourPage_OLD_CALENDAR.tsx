import { useState, useEffect } from 'react';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, Panel, OrchestrationTimeline, TLEvent, TLDayLabel,
  Badge, Revenue, AICard,
  btnGhostSx, btnSmSx, btnAiSx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { Box, Button, Stack, Typography, Avatar, Tabs, Tab, CircularProgress, Alert } from '@mui/material';
import { useParams } from 'react-router-dom';
import TravelersSection from '../components/sections/TravelersSection';
import FinancialSection from '../components/sections/FinancialSection';
import { MultiPropertyInventory, type PropertyRow } from '../components/MultiPropertyInventory';
import { toast } from 'react-toastify';
import reservationsService from '../services/reservationsService';
import type { ReservationDetail } from '../types/reservations.types';

export function ReservationSejourPage() {
  const { id } = useParams();
  const [currentTab, setCurrentTab] = useState(0);
  const [reservationData, setReservationData] = useState<ReservationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─────────────── FETCH RESERVATION DETAILS ───────────────
  useEffect(() => {
    if (!id) {
      setError('ID de réservation manquant');
      setIsLoading(false);
      return;
    }

    const fetchReservationDetail = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await reservationsService.getDetail(id);
        setReservationData(response.reservation);
        toast.success('Réservation chargée avec succès');
      } catch (err: any) {
        console.error('Error fetching reservation:', err);
        setError(err.message || 'Erreur lors du chargement de la réservation');
        toast.error('Erreur lors du chargement de la réservation');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservationDetail();
  }, [id]);

  // ─────────────── LOADING STATE ───────────────
  if (isLoading) {
    return (
      <DashboardWrapper breadcrumb={['Réservations', 'Détails', `#${id || '...'}`]}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Stack spacing={2} sx={{ alignItems: 'center' }}>
            <CircularProgress size={60} sx={{ color: t.primary }} />
            <Typography sx={{ fontSize: 16, color: t.text3 }}>
              Chargement de la réservation...
            </Typography>
          </Stack>
        </Box>
      </DashboardWrapper>
    );
  }

  // ─────────────── ERROR STATE ───────────────
  if (error || !reservationData) {
    return (
      <DashboardWrapper breadcrumb={['Réservations', 'Détails', `#${id || '...'}`]}>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            {error || 'Réservation introuvable'}
          </Alert>
          <Button
            onClick={() => window.history.back()}
            sx={{ ...btnGhostSx, mt: 2 }}
          >
            ← Retour
          </Button>
        </Box>
      </DashboardWrapper>
    );
  }

  // ─────────────── EXTRACT DATA ───────────────
  const guestName = reservationData.guest_name || 'Guest';
  const guest = {
    name: guestName,
    initials: guestName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2),
    country: reservationData.guest_country ? `🌐 ${reservationData.guest_country}` : '',
    email: reservationData.guest_email || '',
    phone: reservationData.guest_phone || '',
    vip: false, // TODO: Ajouter champ VIP au backend
  };

  const property = {
    name: reservationData.listing_name,
    city: '', // TODO: Extraire depuis listing
    address: '', // TODO: Extraire depuis listing
    color: 'gold',
  };

  // Calculer nombre de nuits et jour actuel
  const arrivalDate = new Date(reservationData.arrival_date_raw);
  const departureDate = new Date(reservationData.departure_date_raw);
  const today = new Date();
  const nights = reservationData.nights || Math.ceil((departureDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));
  const currentDay = today >= arrivalDate && today <= departureDate
    ? Math.ceil((today.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  const dates = {
    checkIn: reservationData.arrival_date,
    checkOut: reservationData.departure_date,
    nights,
    currentDay,
  };

  const pricing = {
    total: reservationData.total_price,
    perNight: reservationData.total_price ? `${(parseFloat(reservationData.total_price.replace(/[^\d.]/g, '')) / nights).toFixed(0)}€` : 'N/A',
    cleaning: 'N/A', // TODO: Extraire depuis services
    commission: 'N/A', // TODO: Calculer commission
    net: 'N/A', // TODO: Calculer net
  };

  const status = reservationData.status === 'confirmed' ? 'active' : reservationData.status;
  const source = reservationData.channel_name || 'direct';
  const confirmationCode = reservationData.reservation_number;

  // Mock calendar data (TODO: Fetcher depuis API pour période autour de cette réservation)
  const allProperties: PropertyRow[] = [
    {
      id: 'p1',
      name: reservationData.listing_name,
      city: 'Marrakech',
      photoColor: 'gold',
      occupancyPct: 87,
      monthRevenue: '€8,420',
      bookedRanges: [[arrivalDate.getDate(), departureDate.getDate()]],
      closedDays: [],
      reservations: [
        {
          id: reservationData.id,
          guestName: reservationData.guest_name,
          guestFlag: reservationData.guest_country || '',
          amount: reservationData.total_price,
          startDay: arrivalDate.getDate(),
          endDay: departureDate.getDate(),
          status: reservationData.status as 'confirmed' | 'pending',
        },
      ],
    },
  ];

  // Icon presets (same as OrchestrationPage)
  const ICO = {
    completed: { iconBg: t.successTint,  iconColor: t.success },
    pending:   { iconBg: t.warningTint,  iconColor: t.warning },
    info:      { iconBg: t.infoTint,     iconColor: t.info    },
    ai:        { iconBg: t.aiTint,       iconColor: t.ai      },
    future:    { iconBg: t.bg2,          iconColor: t.text4   },
    error:     { iconBg: t.errorTint,    iconColor: t.error   },
  };

  // Status badge
  const statusBadge = status === 'active' || status === 'confirmed'
    ? <Badge variant="success" dot>Active{currentDay > 0 ? ` · Jour ${currentDay}/${nights}` : ''}</Badge>
    : <Badge variant="warning">Terminée</Badge>;

  return (
    <DashboardWrapper breadcrumb={['Réservations', 'Liste', `#${id}`]}>
      {/* Page Header */}
      <PageHeader title={`Réservation #${confirmationCode}`} count={status === 'active' ? 'ACTIVE' : 'TERMINÉE'}>
        <Button sx={btnGhostSx}>📧 Envoyer message</Button>
        <Button sx={btnGhostSx}>📋 Modifier</Button>
        <Button sx={{ ...btnGhostSx, color: t.error, borderColor: t.errorTint }}>❌ Annuler</Button>
      </PageHeader>

      {/* Hero Card - Guest & Property Info */}
      <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center', 
        mb: 2.5, p: '18px 20px',
        bgcolor: t.bg1, border: `1px solid ${t.border}`, borderRadius: '12px',
        boxShadow: '0 2px 6px rgba(26,20,8,0.04)',
      }}>
        {/* Property Photo */}
        <Box sx={{
          width: 72, height: 72, borderRadius: '11px',
          background: 'linear-gradient(135deg,#fde68a,#d97706)',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(217,119,6,0.25)',
        }} />

        {/* Guest Info */}
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 0.5 }}>
            <Avatar sx={{
              width: 36, height: 36, fontSize: 13, fontWeight: 700,
              background: 'linear-gradient(135deg,#c4b5fd,#8b5cf6)',
            }}>{guest.initials}</Avatar>
            <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
              {guest.name} {guest.country}
            </Typography>
            {guest.vip && <Badge variant="gold">VIP</Badge>}
          </Stack>
          <Typography sx={{
            fontSize: 12.5, color: t.text3, fontFamily: 'Geist Mono',
            letterSpacing: 0.3,
          }}>
            {property.name} · {reservationData.ota}
          </Typography>
          <Typography sx={{
            fontSize: 12.5, color: t.text2, mt: 0.5,
            fontFamily: 'Geist Mono', letterSpacing: 0.3,
          }}>
            {dates.checkIn} → {dates.checkOut} · {dates.nights} nuits · {pricing.total}
          </Typography>
        </Box>

        {/* Status Badge */}
        {statusBadge}
      </Stack>

      {/* Tabs - Vue Calendrier / Vue Timeline */}
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: t.border,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 14,
            },
          }}
        >
          <Tab label="📅 Vue Calendrier" />
          <Tab label="⏱️ Vue Timeline" />
        </Tabs>
      </Box>

      {/* Main Grid - Left: Calendar or Timeline / Right: Details */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1fr 340px' },
        gap: 2.25,
      }}>

        {/* LEFT - Calendar or Timeline */}
        {currentTab === 0 ? (
          // Calendar View - Use MultiPropertyInventory
          <Box>
            <MultiPropertyInventory
              startDate={new Date(arrivalDate.getFullYear(), arrivalDate.getMonth(), 1)}
              days={31}
              properties={allProperties}
              showPrices={false}
              onCellClick={(propertyId, dayIdx) => {
                alert(`Clic sur ${propertyId} jour ${dayIdx + 1}`);
              }}
            />
            <Alert severity="info" sx={{ mt: 2 }}>
              🚧 Calendrier en cours d'intégration avec l'API. Pour l'instant, affichage de cette réservation uniquement.
            </Alert>
          </Box>
        ) : (
          // Timeline View
          <Panel title="Chronologie du séjour">
          {/* ──── Réservation confirmée ──── */}
          <TLDayLabel>{dates.checkIn} · Réservation confirmée</TLDayLabel>
          <OrchestrationTimeline>
            <TLEvent
              time={<><strong>10:14</strong> · {dates.checkIn}</>}
              icon="✓" {...ICO.completed}
              title="Réservation confirmée"
              badge={<Badge variant="success">Auto</Badge>}
              meta={`Source : <strong>${source.charAt(0).toUpperCase() + source.slice(1)}</strong> · ID <strong>${confirmationCode}</strong> · Montant <strong>${pricing.total}</strong>`}
            />
            <TLEvent
              time={<><strong>10:14</strong> · +18s</>}
              icon="✨" {...ICO.ai}
              title="Workflow orchestrateur déclenché"
              badge={<Badge variant="ai">AI</Badge>}
              meta="<strong>Workflow standard</strong> · Tâches générées automatiquement"
            />
          </OrchestrationTimeline>

          {/* ──── Check-in ──── */}
          {reservationData.arrival_declared !== 'Pas déclaré' && (
            <>
              <TLDayLabel>{dates.checkIn} · Check-in</TLDayLabel>
              <OrchestrationTimeline>
                <TLEvent
                  time={<><strong>{reservationData.arrival_declared}</strong></>}
                  icon="🛬" {...ICO.completed}
                  title={`${guest.name} a effectué son check-in`}
                  badge={<Badge variant="success">Confirmé</Badge>}
                  meta={`Heure déclarée : <strong>${reservationData.arrival_declared}</strong>`}
                />
              </OrchestrationTimeline>
            </>
          )}

          {/* ──── Check-out ──── */}
          {reservationData.departure_declared !== 'Pas déclaré' ? (
            <>
              <TLDayLabel>{dates.checkOut} · Check-out</TLDayLabel>
              <OrchestrationTimeline>
                <TLEvent
                  time={<><strong>{reservationData.departure_declared}</strong></>}
                  icon="🛫" {...ICO.completed}
                  title="Check-out effectué"
                  badge={<Badge variant="success">Confirmé</Badge>}
                  meta={`Heure déclarée : <strong>${reservationData.departure_declared}</strong>`}
                />
              </OrchestrationTimeline>
            </>
          ) : (
            <>
              <TLDayLabel>{dates.checkOut} · Check-out prévu</TLDayLabel>
              <OrchestrationTimeline>
                <TLEvent
                  future
                  time={<><strong>{reservationData.check_out_time_chosen || '11:00'}</strong></>}
                  icon="🛫" {...ICO.future}
                  title="Check-out prévu"
                  badge={<Badge variant="warning">À venir</Badge>}
                  meta={`Heure prévue : <strong>${reservationData.check_out_time_chosen || '11:00'}</strong>`}
                />
              </OrchestrationTimeline>
            </>
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            🚧 Timeline enrichie en cours d'intégration. Affichage basique des événements principaux.
          </Alert>
          </Panel>
        )}

        {/* RIGHT - Infos & Actions */}
        <Stack spacing={1.75}>

          {/* Résumé réservation */}
          <Panel sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Résumé réservation</Typography>
            <Stack spacing={1.125} sx={{ fontSize: 12 }}>
              <KV k="Statut" v={statusBadge} />
              {currentDay > 0 && <KV k="Phase" v={`Jour ${currentDay}/${nights}`} mono />}
              <KV k="Check-in" v={dates.checkIn} mono />
              <KV k="Check-out" v={dates.checkOut} mono />
              <KV k="Nuits" v={`${nights}`} />
              <KV k="Source" v={reservationData.ota} />
              <KV k="Code" v={confirmationCode} mono />
              {reservationData.door_code && reservationData.door_code !== 'Non défini' && (
                <KV k="Code porte" v={reservationData.door_code} mono divider />
              )}
            </Stack>
          </Panel>

          {/* Tarification */}
          <Panel sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Tarification</Typography>
            <Stack spacing={1.125} sx={{ fontSize: 12 }}>
              <KV k="Total voyageur" v={<Revenue amount={pricing.total} />} />
              <KV k="Par nuit" v={<Revenue amount={pricing.perNight} />} />
              <KV k="Déjà payé" v={<Revenue amount={`${reservationData.already_paid || 0}€`} />} />
              <KV k="Statut paiement" v={reservationData.payment_status} divider />
            </Stack>
          </Panel>

          {/* Contact guest */}
          <Panel sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Contact</Typography>
            <Stack spacing={1.125} sx={{ fontSize: 12 }}>
              <KV k="Email" v={guest.email} />
              <KV k="Téléphone" v={guest.phone} mono />
              {reservationData.guest_phone_whatsapp && (
                <KV k="WhatsApp" v={reservationData.guest_phone_whatsapp} mono />
              )}
              {reservationData.guest_language && (
                <KV k="Langue" v={reservationData.guest_language.toUpperCase()} />
              )}
            </Stack>
          </Panel>

          {/* Voyageurs */}
          {(reservationData.adults || reservationData.children || reservationData.infants) && (
            <Panel sx={{ p: 2 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Voyageurs</Typography>
              <Stack spacing={1.125} sx={{ fontSize: 12 }}>
                <KV k="Total" v={reservationData.guests} />
                {reservationData.adults && <KV k="Adultes" v={`${reservationData.adults}`} />}
                {reservationData.children && reservationData.children > 0 && <KV k="Enfants" v={`${reservationData.children}`} />}
                {reservationData.infants && reservationData.infants > 0 && <KV k="Bébés" v={`${reservationData.infants}`} />}
                {reservationData.police_members > 0 && (
                  <KV k="Enregistrés police" v={`${reservationData.police_members}`} divider />
                )}
              </Stack>
            </Panel>
          )}

          {/* AI Card */}
          <AICard
            title="Sojori AI"
            footer={
              <Stack spacing={0.75}>
                <Button sx={{ ...btnAiSx, ...btnSmSx, width: '100%', justifyContent: 'center' }}>
                  ✨ Générer message
                </Button>
                <Button sx={{ ...btnGhostSx, ...btnSmSx, width: '100%', justifyContent: 'center' }}>
                  Voir recommandations
                </Button>
              </Stack>
            }
          >
            <Typography sx={{ fontSize: 12, color: t.text2, lineHeight: 1.55 }}>
              {currentDay > 0 && currentDay < nights
                ? `Le voyageur est en <strong>J+${currentDay}</strong>. Vous pouvez lui proposer des services supplémentaires.`
                : `Séjour ${status === 'active' ? 'en cours' : 'terminé'}.`}
            </Typography>
          </AICard>

          {/* Actions rapides */}
          <Panel sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Actions rapides</Typography>
            <Stack spacing={0.875}>
              <Button sx={{ ...btnGhostSx, ...btnSmSx, width: '100%', justifyContent: 'flex-start' }}>
                💬 Ouvrir WhatsApp
              </Button>
              <Button sx={{ ...btnGhostSx, ...btnSmSx, width: '100%', justifyContent: 'flex-start' }}>
                📋 Modifier réservation
              </Button>
              <Button sx={{ ...btnGhostSx, ...btnSmSx, width: '100%', justifyContent: 'flex-start' }}>
                📊 Voir orchestration
              </Button>
              <Button sx={{ ...btnGhostSx, ...btnSmSx, width: '100%', justifyContent: 'flex-start', color: t.error }}>
                ❌ Annuler séjour
              </Button>
            </Stack>
          </Panel>

          {/* Voyageurs - TravelersSection from Claude Design */}
          <Box sx={{ mt: 2.5 }}>
            <TravelersSection
              reservationId={id || ''}
              onAdd={(group) => alert(`Ajouter voyageur (${group}) - MOCK`)}
              onEdit={(traveler) => alert(`Éditer voyageur ${traveler.firstName} - MOCK`)}
              onDelete={(deleteId) => {
                if (confirm('Supprimer ce voyageur ?')) {
                  alert(`Supprimé ${deleteId} - MOCK`);
                }
              }}
            />
          </Box>

          {/* Finances - FinancialSection from Claude Design */}
          <Box sx={{ mt: 2.5 }}>
            <FinancialSection
              totalGuest={parseFloat(pricing.total.replace(/[^\d.]/g, '')) || 0}
              commission={0} // TODO: Calculer commission
              netOwner={parseFloat(pricing.total.replace(/[^\d.]/g, '')) || 0}
              currency="€"
              onAddPayment={() => alert('Ajouter paiement - MOCK')}
              onAddCharge={() => alert('Ajouter frais - MOCK')}
            />
          </Box>
        </Stack>
      </Box>
    </DashboardWrapper>
  );
}

// ─── Helper component ───────────────────────────────────────────
type KVProps = { k: string; v: React.ReactNode; mono?: boolean; divider?: boolean };

function KV({ k, v, mono, divider }: KVProps) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', 
      pt: divider ? 1.125 : 0,
      borderTop: divider ? `1px dashed ${t.border}` : 'none',
    }}>
      <Typography sx={{ color: t.text3, fontSize: 12 }}>{k}</Typography>
      <Box sx={{
        fontWeight: 600, fontSize: 12,
        fontFamily: mono ? 'Geist Mono' : 'inherit',
      }}>{v}</Box>
    </Stack>
  );
}
