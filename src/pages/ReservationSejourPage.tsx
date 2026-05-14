import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, CalendarGantt, ViewToggle, Panel, OrchestrationTimeline, TLEvent, TLDayLabel,
  Badge, Revenue, AICard,
  btnGhostSx, btnSmSx, btnAiSx, btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { Box, Button, Stack, Typography, Avatar } from '@mui/material';
import { useParams } from 'react-router-dom';

export function ReservationSejourPage() {
  const { id } = useParams();

  // Mock data basée sur l'ID
  const reservationData = {
    id: id || '1234',
    guest: {
      name: 'Sarah Johnson',
      initials: 'SJ',
      country: '🇺🇸',
      email: 'sarah.j@example.com',
      phone: '+1 415 555 0123',
      vip: false,
    },
    property: {
      name: 'Villa Belvédère',
      city: 'Nice',
      address: '15 Avenue des Fleurs, 06000 Nice',
      color: 'gold',
    },
    dates: {
      checkIn: '12 mai 2026',
      checkOut: '22 mai 2026',
      nights: 10,
      currentDay: 3,
    },
    pricing: {
      total: '€1,840',
      perNight: '€184',
      cleaning: '€120',
      commission: '€276',
      net: '€1,564',
    },
    status: 'active',
    source: 'airbnb',
    confirmationCode: 'HMXY42TZ8K',
  };

  // Icon presets (same as OrchestrationPage)
  const ICO = {
    completed: { iconBg: t.successTint,  iconColor: t.success },
    pending:   { iconBg: t.warningTint,  iconColor: t.warning },
    info:      { iconBg: t.infoTint,     iconColor: t.info    },
    ai:        { iconBg: t.aiTint,       iconColor: t.ai      },
    future:    { iconBg: t.bg2,          iconColor: t.text4   },
    error:     { iconBg: t.errorTint,    iconColor: t.error   },
  };

  return (
    <DashboardWrapper breadcrumb={['Réservations', 'Liste', `#${reservationData.id}`]}>
      {/* Page Header */}
      <PageHeader title={`Réservation #${reservationData.id}`} count={reservationData.status === 'active' ? 'ACTIVE' : 'TERMINÉE'}>
        <Button sx={btnGhostSx}>📧 Envoyer message</Button>
        <Button sx={btnGhostSx}>📋 Modifier</Button>
        <Button sx={{ ...btnGhostSx, color: t.error, borderColor: t.errorTint }}>❌ Annuler</Button>
      </PageHeader>

      {/* Hero Card - Guest & Property Info */}
      <Stack direction="row" alignItems="center" spacing={2.5} sx={{
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
            }}>{reservationData.guest.initials}</Avatar>
            <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
              {reservationData.guest.name} {reservationData.guest.country}
            </Typography>
            {reservationData.guest.vip && <Badge variant="gold">VIP</Badge>}
          </Stack>
          <Typography sx={{
            fontSize: 12.5, color: t.text3, fontFamily: 'Geist Mono',
            letterSpacing: 0.3,
          }}>
            {reservationData.property.name} · {reservationData.property.city}
          </Typography>
          <Typography sx={{
            fontSize: 12.5, color: t.text2, mt: 0.5,
            fontFamily: 'Geist Mono', letterSpacing: 0.3,
          }}>
            {reservationData.dates.checkIn} → {reservationData.dates.checkOut} · {reservationData.dates.nights} nuits · {reservationData.pricing.total}
          </Typography>
        </Box>

        {/* Status Badge */}
        <Badge variant="success" dot>
          Active · Jour {reservationData.dates.currentDay}/{reservationData.dates.nights}
        </Badge>
      </Stack>

      {/* Main Grid - Left: Timeline / Right: Details */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1fr 340px' },
        gap: 2.25,
      }}>

        {/* LEFT - Timeline des événements */}
        <Panel title="Chronologie du séjour">
          {/* ──── 12 mai · Réservation ──── */}
          <TLDayLabel>12 mai · Réservation confirmée</TLDayLabel>
          <OrchestrationTimeline>
            <TLEvent
              time={<><strong>10:14</strong> · il y a 3 jours</>}
              icon="✓" {...ICO.completed}
              title="Réservation confirmée"
              badge={<Badge variant="success">Auto</Badge>}
              meta={`Source : <strong>${reservationData.source.charAt(0).toUpperCase() + reservationData.source.slice(1)}</strong> · ID <strong>${reservationData.confirmationCode}</strong> · Montant <strong>${reservationData.pricing.total}</strong>`}
            />
            <TLEvent
              time={<><strong>10:14</strong> · +18s</>}
              icon="✨" {...ICO.ai}
              title="Workflow orchestrateur déclenché"
              badge={<Badge variant="ai">AI</Badge>}
              meta="<strong>23 tâches</strong> générées · Workflow <strong>Villa séjour standard</strong>"
            />
            <TLEvent
              time={<><strong>10:18</strong> · +4 min</>}
              icon="📧" {...ICO.info}
              title="Message bienvenue envoyé"
              badge={<Badge variant="info">WhatsApp</Badge>}
              meta="Template <strong>welcome-villa</strong> · 🇬🇧 EN · Lu <strong>il y a 2 min</strong>"
            />
          </OrchestrationTimeline>

          {/* ──── 13 mai · Enregistrement ──── */}
          <TLDayLabel>13 mai · Enregistrement voyageur</TLDayLabel>
          <OrchestrationTimeline>
            <TLEvent
              time={<><strong>14:30</strong> · il y a 2 jours</>}
              icon="📱" {...ICO.info}
              title="Formulaire enregistrement envoyé"
              badge={<Badge variant="info">WhatsApp</Badge>}
              meta="Template <strong>registration-form</strong> · Expiration <strong>14 mai 23:59</strong>"
            />
            <TLEvent
              time={<><strong>19:45</strong> · il y a 2 jours</>}
              icon="✓" {...ICO.completed}
              title="Sarah a complété l'enregistrement"
              badge={<Badge variant="success">Form</Badge>}
              meta="Passeport scanné · Données vérifiées <strong>✓</strong> · KYC <strong>OK</strong>"
            />
          </OrchestrationTimeline>

          {/* ──── 14 mai · Préparatifs ──── */}
          <TLDayLabel>14 mai · Préparatifs check-in</TLDayLabel>
          <OrchestrationTimeline>
            <TLEvent
              time={<><strong>09:00</strong> · hier</>}
              icon="🔐" {...ICO.completed}
              title="Code d'accès généré"
              badge={<Badge variant="success">Auto</Badge>}
              meta="Code <strong>4829*</strong> · Igloohome · Envoi prévu <strong>15 mai 14:00</strong>"
            />
            <TLEvent
              time={<><strong>15:30</strong> · hier</>}
              icon="🧹" {...ICO.completed}
              title="Ménage pré-arrivée complété"
              badge={<Badge variant="success">Staff</Badge>}
              meta="Yasmine K. · Durée <strong>2h35</strong> · Photos validées <strong>✓</strong>"
            />
          </OrchestrationTimeline>

          {/* ──── 15 mai · Check-in · AUJOURD'HUI ──── */}
          <TLDayLabel>15 mai · Check-in · AUJOURD'HUI</TLDayLabel>
          <OrchestrationTimeline>
            <TLEvent
              time={<><strong>14:00</strong> · aujourd'hui</>}
              icon="🔐" {...ICO.completed}
              title="Code d'accès envoyé"
              badge={<Badge variant="info">WhatsApp</Badge>}
              meta="Template <strong>access-code</strong> · Code <strong>4829*</strong> · Lu <strong>✓</strong>"
            />
            <TLEvent
              critical
              time={<><strong>16:14</strong> · aujourd'hui</>}
              icon="🛬" {...ICO.completed}
              title="Sarah a effectué son check-in"
              badge={<Badge variant="success">Auto · QR + GPS</Badge>}
              meta="Vérifié sur place · ID + photo profil <strong>✓</strong> · Vidéo welcome <strong>vue 2 fois</strong>"
            />
          </OrchestrationTimeline>

          {/* ──── 22 mai · Check-out futur ──── */}
          <TLDayLabel>22 mai · Check-out prévu</TLDayLabel>
          <OrchestrationTimeline>
            <TLEvent
              future
              time={<><strong>08:00</strong> · dans 7 jours</>}
              icon="📧" {...ICO.future}
              title="Rappel check-out programmé"
              badge={<Badge variant="info">WhatsApp</Badge>}
              meta="Template <strong>checkout-reminder</strong> · Inclut code & instructions"
            />
            <TLEvent
              future
              time={<><strong>11:00</strong> · dans 7 jours</>}
              icon="🛫" {...ICO.future}
              title="Check-out prévu"
              badge={<Badge variant="warning">Deadline</Badge>}
              meta="QR code de sortie · Vidéo checkout · Désactivation code auto"
            />
          </OrchestrationTimeline>
        </Panel>

        {/* RIGHT - Infos & Actions */}
        <Stack spacing={1.75}>

          {/* Résumé réservation */}
          <Panel sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Résumé réservation</Typography>
            <Stack spacing={1.125} sx={{ fontSize: 12 }}>
              <KV k="Statut" v={<Badge variant="success" dot>Active</Badge>} />
              <KV k="Phase" v={`Jour ${reservationData.dates.currentDay}/${reservationData.dates.nights}`} mono />
              <KV k="Check-in" v={reservationData.dates.checkIn} mono />
              <KV k="Check-out" v={reservationData.dates.checkOut} mono />
              <KV k="Nuits" v={`${reservationData.dates.nights}`} />
              <KV k="Source" v={reservationData.source.charAt(0).toUpperCase() + reservationData.source.slice(1)} />
              <KV k="Code" v={reservationData.confirmationCode} mono divider />
            </Stack>
          </Panel>

          {/* Tarification */}
          <Panel sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Tarification</Typography>
            <Stack spacing={1.125} sx={{ fontSize: 12 }}>
              <KV k="Total voyageur" v={<Revenue amount={reservationData.pricing.total} />} />
              <KV k="Par nuit" v={<Revenue amount={reservationData.pricing.perNight} />} />
              <KV k="Frais ménage" v={<Revenue amount={reservationData.pricing.cleaning} />} />
              <KV k="Commission OTA" v={<Revenue amount={reservationData.pricing.commission} />} />
              <KV k="Revenu net" v={<Revenue amount={reservationData.pricing.net} />} divider />
            </Stack>
          </Panel>

          {/* Contact guest */}
          <Panel sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Contact</Typography>
            <Stack spacing={1.125} sx={{ fontSize: 12 }}>
              <KV k="Email" v={reservationData.guest.email} />
              <KV k="Téléphone" v={reservationData.guest.phone} mono />
            </Stack>
          </Panel>

          {/* AI Card */}
          <AICard
            title="Sojori AI"
            footer={
              <Stack spacing={0.75}>
                <Button sx={{ ...btnAiSx, ...btnSmSx, width: '100%', justifyContent: 'center' }}>
                  ✨ Générer message mid-stay
                </Button>
                <Button sx={{ ...btnGhostSx, ...btnSmSx, width: '100%', justifyContent: 'center' }}>
                  Voir recommandations
                </Button>
              </Stack>
            }
          >
            <Typography sx={{ fontSize: 12, color: t.text2, lineHeight: 1.55 }}>
              Sarah est en <strong>J+3</strong>. Recommandation : proposer excursion Èze ou location vélo électrique (+47% conversion mid-stay).
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
        </Stack>
      </Box>
    </DashboardWrapper>
  );
}

// ─── Helper component ───────────────────────────────────────────
type KVProps = { k: string; v: React.ReactNode; mono?: boolean; divider?: boolean };

function KV({ k, v, mono, divider }: KVProps) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{
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
