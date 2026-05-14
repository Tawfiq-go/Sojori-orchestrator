import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, Panel, OrchestrationTimeline, TLEvent, TLDayLabel,
  AICard, Badge, Revenue, ViewToggle,
  btnGhostSx, btnAiSx, btnSmSx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { OrchestrationBoard } from '../components/OrchestrationBoard';

// ════════════════════════════════════════════════════════════════════
// Sojori — Orchestration · Chronologie (timeline enrichie)
//
// 20+ événements, 5 états visuels (completed / pending / info / future / critical),
// indicateurs de fenêtre, relances, séparateurs jour, panel résumé + AI card.
// ════════════════════════════════════════════════════════════════════

// ─── Helpers icon presets ─────────────────────────────────────────
const ICO = {
  completed: { iconBg: t.successTint,  iconColor: t.success },
  pending:   { iconBg: t.warningTint,  iconColor: t.warning },
  info:      { iconBg: t.infoTint,     iconColor: t.info    },
  ai:        { iconBg: t.aiTint,       iconColor: t.ai      },
  future:    { iconBg: t.bg2,          iconColor: t.text4   },
  error:     { iconBg: t.errorTint,    iconColor: t.error   },
};

// Visual chips (window indicators, retry counters) — inline span helpers
const WINDOW_CHIP_STYLE = `
  display: inline-block;
  padding: 1px 7px;
  border-radius: 99px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.2px;
  margin-left: 6px;
`;

function windowChip(label: 'available' | 'too-early' | 'late' | 'expired') {
  const palette = {
    available: { bg: 'rgba(16,185,129,0.10)', color: '#047857', text: 'Disponible' },
    'too-early': { bg: 'rgba(245,158,11,0.10)', color: '#b45309', text: 'Trop tôt' },
    late:       { bg: 'rgba(239,68,68,0.10)',  color: '#b91c1c', text: 'Retard' },
    expired:    { bg: 'rgba(0,0,0,0.06)',      color: t.text3,   text: 'Expiré' },
  }[label];
  return `<span style="${WINDOW_CHIP_STYLE} background:${palette.bg};color:${palette.color}">${palette.text}</span>`;
}

function retryChip(text: string) {
  return `<span style="${WINDOW_CHIP_STYLE} background:rgba(139,92,246,0.10);color:${t.ai}">${text}</span>`;
}

type DrawerContent =
  | {
      type: 'reservation';
    }
  | {
      type: 'event';
      detail: {
        title: string;
        status: string;
        when: string;
        summary: string;
        note?: string;
        channel?: string;
      };
    };

type MessagePreview = {
  title: string;
  channel: string;
  template: string;
  recipient: string;
  schedule: string;
  body: string;
};

// ════════════════════════════════════════════════════════════════════
// Page
// ════════════════════════════════════════════════════════════════════
export function OrchestrationPage() {
  const [view, setView] = useState('chronologie');
  const [drawerContent, setDrawerContent] = useState<DrawerContent | null>(null);
  const [messagePreview, setMessagePreview] = useState<MessagePreview | null>(null);

  const reservation = {
    code: 'RÉSA #1234',
    guest: 'Sarah Johnson',
    property: 'Villa Belvédère · Nice',
    stay: '12 → 22 mai · 10 nuits',
    amount: '€1,840',
    source: 'Airbnb',
    netRevenue: '€1,656',
    phase: 'Check-in · Jour 3/10',
    phone: '+1 415 555 0123',
    email: 'sarah.j@example.com',
    confirmationCode: 'HMXY42TZ8K',
  };

  const openReservationDrawer = () => {
    setDrawerContent({ type: 'reservation' });
  };

  const closeDrawer = () => {
    setDrawerContent(null);
  };

  const openEventDrawer = (detail: DrawerContent extends { type: 'event'; detail: infer T } ? T : never) => {
    setDrawerContent({ type: 'event', detail });
  };

  const openMessagePreview = (preview: MessagePreview) => {
    setMessagePreview(preview);
  };

  const closeMessagePreview = () => {
    setMessagePreview(null);
  };

  const handleBoardStepClick = ({
    lane,
    step,
    day,
  }: {
    lane: { title: string; day?: string };
    step: { title: string; meta: string; kind: string; channel?: string };
    day?: { day: string; label: string } | null;
  }) => {
    const schedule = day ? `${day.day} · ${day.label}` : lane.day || 'Planifié';

    if (step.channel === 'wa' || step.channel === 'email') {
      openMessagePreview({
        title: step.title,
        channel: step.channel === 'wa' ? 'WhatsApp' : 'Email',
        template: lane.title,
        recipient: reservation.guest,
        schedule,
        body: `${reservation.guest},\n\n${step.title} — ${step.meta}.\n\nRéservation ${reservation.code} · ${reservation.property}.`,
      });
      return;
    }

    openEventDrawer({
      title: step.title,
      status: step.kind,
      when: schedule,
      summary: step.meta,
      channel: step.channel ? step.channel.toUpperCase() : undefined,
      note: `Étape du plan d'orchestration · ${lane.title}`,
    });
  };

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Orchestration', view === 'chronologie' ? 'Chronologie' : 'Plan d\'orchestration']}>
      <PageHeader
        title={`✨ Orchestration · ${view === 'chronologie' ? 'Chronologie' : 'Plan d\'orchestration'}`}
        count={
          <Box
            component="button"
            onClick={openReservationDrawer}
            sx={{
              all: 'unset',
              cursor: 'pointer',
              fontFamily: 'Geist Mono',
            }}
          >
            {reservation.code}
          </Box>
        }
      >
        <ViewToggle
          options={[
            { value: 'chronologie', label: 'Chronologie' },
            { value: 'board', label: 'Plan d\'orchestration' }
          ]}
          value={view}
          onChange={setView}
        />
        <Button sx={btnGhostSx} onClick={openReservationDrawer}>📋 Voir réservation</Button>
        <Button sx={btnAiSx}>✨ Demander à l'AI</Button>
      </PageHeader>

      {view === 'board' ? (
        <OrchestrationBoard
          onReservationOpen={openReservationDrawer}
          onStepClick={handleBoardStepClick}
        />
      ) : (
        <>
          {/* Header context — réservation */}
          <Stack
            direction="row"
            spacing={1.75}
            onClick={openReservationDrawer}
            sx={{
              alignItems: 'center',
              mb: 2.5,
              p: '14px 18px',
              bgcolor: t.bg1,
              border: `1px solid ${t.border}`,
              borderRadius: '11px',
              cursor: 'pointer',
              transition: 'box-shadow 0.12s ease, transform 0.12s ease',
              '&:hover': {
                boxShadow: '0 8px 18px rgba(26,20,8,0.08)',
                transform: 'translateY(-1px)',
              },
            }}
          >
        <Box sx={{
          width: 48, height: 48, borderRadius: '9px',
          background: 'linear-gradient(135deg,#fde68a,#d97706)', flexShrink: 0,
        }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{reservation.property}</Typography>
          <Typography sx={{
            fontSize: 12, color: t.text3, mt: 0.25,
            fontFamily: 'Geist Mono', letterSpacing: 0.3,
          }}>{reservation.guest.toUpperCase()} · {reservation.stay.toUpperCase()} · {reservation.amount}</Typography>
        </Box>
        <Badge variant="success" dot>Active · Jour 3/10</Badge>
      </Stack>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1fr 320px' },
        gap: 2.25,
      }}>

        {/* ═══════════════ Timeline column ═══════════════ */}
        <Panel title="Chronologie des événements">

          {/* ──── 12 mai · J-3 · Réservation ──── */}
          <TLDayLabel>12 mai · J-3 · Réservation</TLDayLabel>
          <OrchestrationTimeline>
            <TLEvent
              time={<><strong>10:14</strong> · il y a 3 jours</>}
              icon="✓" {...ICO.completed}
              title="Réservation confirmée"
              badge={<Badge variant="success">Auto</Badge>}
              meta="Source : <strong>Airbnb</strong> · ID résa <strong>HMXY42TZ8K</strong> · Montant <strong>€1,840</strong>"
              onClick={() =>
                openReservationDrawer()
              }
            />
            <TLEvent
              time={<><strong>10:14</strong> · +18s</>}
              icon="✨" {...ICO.ai}
              title="Workflow orchestrateur déclenché"
              badge={<Badge variant="ai">AI</Badge>}
              meta="<strong>23 tâches</strong> générées · Workflow <strong>Villa Belvédère · Long séjour</strong>"
              onClick={() =>
                openEventDrawer({
                  title: 'Workflow orchestrateur déclenché',
                  status: 'AI',
                  when: '12 mai · 10:14',
                  summary: '23 tâches générées pour cette réservation.',
                  note: 'Le plan complet a été initialisé automatiquement après confirmation.',
                })
              }
            />
            <TLEvent
              time={<><strong>10:18</strong> · +4 min</>}
              icon="📧" {...ICO.info}
              title="Message bienvenue envoyé"
              badge={<Badge variant="info">WhatsApp</Badge>}
              meta="Template <strong>welcome-villa</strong> · 🇬🇧 EN · Lu <strong>il y a 2 min</strong>"
              quote="« Hi Sarah! 👋 Welcome to Villa Belvédère. We're delighted to host you from May 12–22… »"
              onClick={() =>
                openMessagePreview({
                  title: 'Message bienvenue envoyé',
                  channel: 'WhatsApp',
                  template: 'welcome-villa',
                  recipient: reservation.guest,
                  schedule: '12 mai · 10:18',
                  body:
                    "Hi Sarah! 👋 Welcome to Villa Belvédère. We're delighted to host you from May 12–22. Your team is already preparing access and arrival steps.",
                })
              }
            />
          </OrchestrationTimeline>

          {/* ──── 13 mai · J-2 · Enregistrement ──── */}
          <TLDayLabel>13 mai · J-2</TLDayLabel>
          <OrchestrationTimeline>
            <TLEvent
              time={<><strong>14:30</strong> · il y a 2 jours</>}
              icon="📱" {...ICO.info}
              title="Enregistrement voyageur envoyé"
              badge={<Badge variant="info">WhatsApp</Badge>}
              meta={`Template <strong>registration-form-link</strong> · ${windowChip('available')} · Expiration <strong>14 mai 23:59</strong>`}
              onClick={() =>
                openMessagePreview({
                  title: 'Enregistrement voyageur envoyé',
                  channel: 'WhatsApp',
                  template: 'registration-form-link',
                  recipient: reservation.guest,
                  schedule: '13 mai · 14:30',
                  body:
                    'Bonjour Sarah, voici votre formulaire d’enregistrement sécurisé. Merci de compléter vos informations voyageurs avant votre arrivée.',
                })
              }
            />
            <TLEvent
              time={<><strong>19:45</strong> · il y a 2 jours · +5h15</>}
              icon="✓" {...ICO.completed}
              title="Sarah a complété l'enregistrement"
              badge={<Badge variant="success">Form</Badge>}
              meta="Passeport scanné · Données vérifiées <strong>✓</strong> · KYC <strong>OK</strong>"
              onClick={() =>
                openEventDrawer({
                  title: "Sarah a complété l'enregistrement",
                  status: 'Complété',
                  when: '13 mai · 19:45',
                  summary: 'Passeport scanné, données vérifiées, KYC OK.',
                  note: 'Le dossier voyageur est complet pour le séjour.',
                })
              }
            />
          </OrchestrationTimeline>

          {/* ──── 14 mai · J-1 · Préparatifs ──── */}
          <TLDayLabel>14 mai · J-1 · Préparatifs</TLDayLabel>
          <OrchestrationTimeline>
            <TLEvent
              time={<><strong>09:00</strong> · hier</>}
              icon="🔐" {...ICO.completed}
              title="Code d'accès généré"
              badge={<Badge variant="success">Auto</Badge>}
              meta="Code <strong style='font-family:Geist Mono'>4829*</strong> · Igloohome · Villa Belvédère · Envoi prévu <strong>15 mai 14:00</strong>"
              onClick={() =>
                openEventDrawer({
                  title: "Code d'accès généré",
                  status: 'Complété',
                  when: '14 mai · 09:00',
                  summary: "Code Igloohome 4829* généré pour l'arrivée.",
                  note: 'Le code sera communiqué automatiquement au bon moment.',
                })
              }
            />
            <TLEvent
              time={<><strong>10:00</strong> · hier</>}
              icon="🎫" {...ICO.pending}
              title="Déclaration police programmée"
              badge={<Badge variant="warning">En attente</Badge>}
              meta="Deadline <strong>15 mai 18:00</strong> · Statut <strong>En attente données check-in</strong>"
              onClick={() =>
                openEventDrawer({
                  title: 'Déclaration police programmée',
                  status: 'En attente',
                  when: '14 mai · 10:00',
                  summary: "La déclaration sera transmise après confirmation du check-in.",
                  note: 'Dépendance: validation des données d’arrivée.',
                })
              }
            />
            <TLEvent
              time={<><strong>15:30</strong> · hier</>}
              icon="🧹" {...ICO.completed}
              title="Ménage pré-arrivée complété"
              badge={<Badge variant="success">Staff</Badge>}
              meta="Yasmine K. · Durée <strong>2h35</strong> · Photos validées <strong>✓</strong> · Note <strong>9.6/10</strong>"
              onClick={() =>
                openEventDrawer({
                  title: 'Ménage pré-arrivée complété',
                  status: 'Complété',
                  when: '14 mai · 15:30',
                  summary: 'Ménage terminé par Yasmine K. avec validation photo.',
                  note: 'Note qualité 9.6/10.',
                })
              }
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
              meta="Template <strong>access-code</strong> · Code <strong style='font-family:Geist Mono'>4829*</strong> · Lu <strong>il y a 30 min</strong>"
              onClick={() =>
                openMessagePreview({
                  title: "Code d'accès envoyé",
                  channel: 'WhatsApp',
                  template: 'access-code',
                  recipient: reservation.guest,
                  schedule: "15 mai · 14:00",
                  body:
                    "Hi Sarah, your access is ready. Code: 4829*. The property will be available from 16:00. Reply here if you need help on arrival.",
                })
              }
            />
            <TLEvent
              critical
              time={<><strong>16:14</strong> · aujourd'hui · +2h14</>}
              icon="🛬" {...ICO.completed}
              title="Sarah a effectué son check-in"
              badge={<Badge variant="success">Auto · QR + GPS</Badge>}
              meta="Vérifié sur place · ID + photo profil <strong>✓</strong> · Vidéo welcome <strong>vue 2 fois</strong>"
              onClick={() =>
                openEventDrawer({
                  title: 'Sarah a effectué son check-in',
                  status: 'Critique',
                  when: "15 mai · 16:14",
                  summary: 'Check-in confirmé automatiquement via QR + GPS.',
                  note: 'ID et photo profil validés, vidéo welcome consultée deux fois.',
                })
              }
            />
            <TLEvent
              time={<><strong>18:00</strong> · aujourd'hui · prévu +1h46</>}
              icon="📧" {...ICO.completed}
              title="Déclaration police envoyée"
              badge={<Badge variant="success">API</Badge>}
              meta="Préfecture · Statut <strong style='color:#047857'>Accepté ✓</strong> · Référence <strong>POL-2026-9821</strong>"
              onClick={() =>
                openEventDrawer({
                  title: 'Déclaration police envoyée',
                  status: 'Complété',
                  when: "15 mai · 18:00",
                  summary: 'Transmission API acceptée par la préfecture.',
                  note: 'Référence de suivi: POL-2026-9821.',
                })
              }
            />
            <TLEvent
              time={<><strong>19:00</strong> · aujourd'hui</>}
              icon="🧹" {...ICO.pending}
              title="Ménage de fin programmé"
              badge={<Badge variant="warning">Planifié</Badge>}
              meta="Assigné <strong>Marie Dupont</strong> · Check-out prévu <strong>22 mai 11:00</strong> · Durée estimée 3h"
              onClick={() =>
                openEventDrawer({
                  title: 'Ménage de fin programmé',
                  status: 'Planifié',
                  when: "15 mai · 19:00",
                  summary: 'Mission assignée à Marie Dupont pour le check-out du 22 mai.',
                  note: 'Durée estimée 3h avec inventaire et photos.',
                })
              }
            />
          </OrchestrationTimeline>

          {/* ──── 16 mai · J+1 ──── */}
          <TLDayLabel>16 mai · J+1</TLDayLabel>
          <OrchestrationTimeline>
            <TLEvent
              future
              time={<><strong>10:00</strong> · demain</>}
              icon="📧" {...ICO.future}
              title="Message feedback demandé"
              badge={<Badge variant="info">Programmé</Badge>}
              meta={`Template <strong>midstay-feedback</strong> · Envoi prévu <strong>demain 10:00</strong> · ${windowChip('too-early')}`}
              onClick={() =>
                openMessagePreview({
                  title: 'Message feedback demandé',
                  channel: 'WhatsApp',
                  template: 'midstay-feedback',
                  recipient: reservation.guest,
                  schedule: '16 mai · 10:00',
                  body:
                    'Bonjour Sarah, comment se passe votre séjour jusqu’ici ? Nous pouvons vous aider pour toute demande locale ou un besoin sur place.',
                })
              }
            />
          </OrchestrationTimeline>

          {/* ──── 17 mai · J+2 · Mid-stay ──── */}
          <TLDayLabel>17 mai · J+2 · Mid-stay</TLDayLabel>
          <OrchestrationTimeline>
            <TLEvent
              future
              time={<><strong>10:00</strong> · dans 2 jours</>}
              icon="📧" {...ICO.future}
              title="Message mid-stay programmé"
              badge={<Badge variant="ai">AI personnalisé</Badge>}
              meta={`Template <strong>midstay-villa</strong> · Personnalisation IA selon historique · ${windowChip('too-early')}`}
              onClick={() =>
                openMessagePreview({
                  title: 'Message mid-stay programmé',
                  channel: 'WhatsApp',
                  template: 'midstay-villa',
                  recipient: reservation.guest,
                  schedule: '17 mai · 10:00',
                  body:
                    'Hi Sarah, if you’d like a personalized local recommendation, we can suggest a sunset trip to Eze or a Mont Boron walk based on your stay profile.',
                })
              }
            />
          </OrchestrationTimeline>

          {/* ──── 22 mai · Check-out ──── */}
          <TLDayLabel>22 mai · Check-out</TLDayLabel>
          <OrchestrationTimeline>
            <TLEvent
              future
              time={<><strong>08:00</strong> · dans 7 jours</>}
              icon="📧" {...ICO.future}
              title="Rappel check-out programmé"
              badge={<Badge variant="info">WhatsApp</Badge>}
              meta="Template <strong>checkout-reminder</strong> · Envoi <strong>22 mai 08:00</strong> · Inclut code & instructions"
              onClick={() =>
                openMessagePreview({
                  title: 'Rappel check-out programmé',
                  channel: 'WhatsApp',
                  template: 'checkout-reminder',
                  recipient: reservation.guest,
                  schedule: '22 mai · 08:00',
                  body:
                    'Hello Sarah, a quick reminder that check-out is scheduled for 11:00 on 22 May. We will send final instructions and the exit flow shortly.',
                })
              }
            />
            <TLEvent
              future
              time={<><strong>11:00</strong> · dans 7 jours</>}
              icon="🛫" {...ICO.future}
              title="Check-out prévu"
              badge={<Badge variant="warning">Deadline</Badge>}
              meta="QR code de sortie · Vidéo checkout à filmer · Désactivation code d'accès auto"
              onClick={() =>
                openEventDrawer({
                  title: 'Check-out prévu',
                  status: 'Futur',
                  when: '22 mai · 11:00',
                  summary: 'Le flow de sortie prévoit QR code, vidéo et désactivation automatique du code.',
                  note: 'Étape clef de clôture du séjour.',
                })
              }
            />
            <TLEvent
              future
              time={<><strong>12:00</strong> · dans 7 jours</>}
              icon="🧹" {...ICO.future}
              title="Ménage complet programmé"
              badge={<Badge variant="info">Staff</Badge>}
              meta="Assigné <strong>Marie Dupont</strong> · Durée estimée <strong>3h</strong> · Inclut inventaire & photos"
              onClick={() =>
                openEventDrawer({
                  title: 'Ménage complet programmé',
                  status: 'Futur',
                  when: '22 mai · 12:00',
                  summary: 'Intervention ménage avec inventaire et photos à la sortie.',
                  note: 'Assigné à Marie Dupont.',
                })
              }
            />
            <TLEvent
              future
              time={<><strong>14:00</strong> · dans 7 jours · +3h</>}
              icon="📧" {...ICO.future}
              title="Message merci programmé"
              badge={<Badge variant="info">WhatsApp</Badge>}
              meta="Template <strong>thank-you-villa</strong> · Délai <strong>+3h après checkout</strong>"
              onClick={() =>
                openMessagePreview({
                  title: 'Message merci programmé',
                  channel: 'WhatsApp',
                  template: 'thank-you-villa',
                  recipient: reservation.guest,
                  schedule: '22 mai · 14:00',
                  body:
                    'Thank you Sarah for staying at Villa Belvédère. We hope you had a wonderful time and would love to welcome you again.',
                })
              }
            />
          </OrchestrationTimeline>

          {/* ──── 23 mai · J+1 post-checkout ──── */}
          <TLDayLabel>23 mai · J+1 post-checkout</TLDayLabel>
          <OrchestrationTimeline>
            <TLEvent
              future
              time={<><strong>10:00</strong> · dans 8 jours</>}
              icon="⭐" {...ICO.future}
              title="Demande d'avis Airbnb programmée"
              badge={<Badge variant="ai">AI optimisé</Badge>}
              meta={`Template <strong>request-review-airbnb</strong> · ${windowChip('too-early')} · Délai optimal calculé par AI`}
              onClick={() =>
                openMessagePreview({
                  title: "Demande d'avis Airbnb programmée",
                  channel: 'WhatsApp',
                  template: 'request-review-airbnb',
                  recipient: reservation.guest,
                  schedule: '23 mai · 10:00',
                  body:
                    'Hi Sarah, if you enjoyed your stay, your Airbnb review would mean a lot to the team. Thank you again for choosing Sojori.',
                })
              }
            />
            <TLEvent
              future
              time={<><strong>10:00</strong> · dans 8 jours</>}
              icon="📧" {...ICO.future}
              title="Plan de relances avis"
              badge={<Badge variant="warning">3 essais max</Badge>}
              meta={`${retryChip('Essai 1/3')} 23 mai · ${retryChip('Essai 2/3')} 26 mai · ${retryChip('Essai 3/3')} 30 mai`}
              onClick={() =>
                openEventDrawer({
                  title: 'Plan de relances avis',
                  status: 'Futur',
                  when: '23 mai → 30 mai',
                  summary: 'Trois relances maximum sont prévues si aucun avis n’est reçu.',
                  note: 'Cadence: 23 mai, 26 mai, 30 mai.',
                })
              }
            />
          </OrchestrationTimeline>

        </Panel>

        {/* ═══════════════ Aside · Résumé + AI ═══════════════ */}
        <Stack spacing={1.75}>

          <Panel sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Résumé séjour</Typography>
            <Stack spacing={1.125} sx={{ fontSize: 12 }}>
              <KV k="Statut workflow"  v={<Badge variant="success" dot>Active</Badge>} />
              <KV k="Avancement"        v="11 / 23 tâches" />
              <KV k="Phase actuelle"    v="Check-in · Jour 3/10" mono />
              <KV k="Prochaine action"  v="16/05 · 10:00" mono />
              <KV k="Anomalies"         v={<Box sx={{ color: t.success, fontWeight: 600 }}>Aucune ✓</Box>} />
              <KV k="Relances en cours" v="0" />
              <KV k="Revenu net"        v={<Revenue amount="€1,656" />} divider />
            </Stack>
          </Panel>

          <AICard
            title="Sojori AI"
            footer={
              <Stack spacing={0.75}>
                <Button sx={{ ...btnAiSx, ...btnSmSx, width: '100%', justifyContent: 'center' }}>
                  Générer suggestion mid-stay ✨
                </Button>
                <Button sx={{ ...btnGhostSx, ...btnSmSx, width: '100%', justifyContent: 'center' }}>
                  Voir 3 autres recommandations
                </Button>
              </Stack>
            }
          >
            <Typography sx={{ fontSize: 12, color: t.text2, lineHeight: 1.55 }}>
              Sarah est en <strong>J+3</strong> de son séjour. <strong>Recommandation</strong> : envoyer une suggestion d'activité (excursion Èze ou Mont Boron) — meilleure conversion à mid-stay <strong>(+47%)</strong>.
            </Typography>
          </AICard>

          <Panel sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.25 }}>Distribution des états</Typography>
            <Stack spacing={0.875}>
              <DistRow color={t.success} label="Complétés" count="11" pct={47} />
              <DistRow color={t.warning} label="En attente" count="2"  pct={8}  />
              <DistRow color={t.info}    label="Info"      count="3"  pct={13} />
              <DistRow color={t.text4}   label="Futurs"    count="7"  pct={32} />
            </Stack>
          </Panel>
        </Stack>
      </Box>
        </>
      )}

      <Drawer
        anchor="right"
        open={Boolean(drawerContent)}
        onClose={closeDrawer}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 440 },
            p: 0,
            bgcolor: '#fbfaf6',
          },
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: 2.5, pb: 2 }}>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
              {drawerContent?.type === 'reservation'
                ? `Détail ${reservation.code}`
                : drawerContent?.detail.title}
            </Typography>
            <Typography sx={{ fontSize: 12, color: t.text3, mt: 0.5 }}>
              {drawerContent?.type === 'reservation'
                ? `${reservation.guest} · ${reservation.property}`
                : drawerContent?.detail.when}
            </Typography>
          </Box>
          <IconButton onClick={closeDrawer}>✕</IconButton>
        </Stack>
        <Divider />

        <Box sx={{ p: 2.5 }}>
          {drawerContent?.type === 'reservation' ? (
            <Stack spacing={2}>
              <Panel sx={{ p: 2 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Séjour</Typography>
                <Stack spacing={1.1}>
                  <KV k="Guest" v={reservation.guest} />
                  <KV k="Property" v={reservation.property} />
                  <KV k="Dates" v={reservation.stay} mono />
                  <KV k="Source" v={reservation.source} />
                  <KV k="Code confirmation" v={reservation.confirmationCode} mono />
                  <KV k="Revenu net" v={<Revenue amount={reservation.netRevenue} />} divider />
                </Stack>
              </Panel>

              <Panel sx={{ p: 2 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Contact</Typography>
                <Stack spacing={1.1}>
                  <KV k="Email" v={reservation.email} />
                  <KV k="Téléphone" v={reservation.phone} mono />
                  <KV k="Phase actuelle" v={reservation.phase} mono divider />
                </Stack>
              </Panel>

              <Panel sx={{ p: 2 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Actions rapides</Typography>
                <Stack spacing={1}>
                  <Button sx={{ ...btnGhostSx, width: '100%', justifyContent: 'flex-start' }}>
                    💬 Ouvrir WhatsApp guest
                  </Button>
                  <Button sx={{ ...btnGhostSx, width: '100%', justifyContent: 'flex-start' }}>
                    📋 Voir la page séjour complète
                  </Button>
                  <Button sx={{ ...btnGhostSx, width: '100%', justifyContent: 'flex-start' }}>
                    📊 Revenir au workflow
                  </Button>
                </Stack>
              </Panel>
            </Stack>
          ) : drawerContent?.type === 'event' ? (
            <Stack spacing={2}>
              <Panel sx={{ p: 2 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Résumé événement</Typography>
                <Stack spacing={1.1}>
                  <KV k="Statut" v={drawerContent.detail.status} />
                  <KV k="Quand" v={drawerContent.detail.when} mono />
                  {drawerContent.detail.channel && <KV k="Canal" v={drawerContent.detail.channel} />}
                </Stack>
                <Typography sx={{ fontSize: 12.5, color: t.text2, mt: 2, lineHeight: 1.6 }}>
                  {drawerContent.detail.summary}
                </Typography>
                {drawerContent.detail.note && (
                  <Typography sx={{ fontSize: 11.5, color: t.text3, mt: 1.5, lineHeight: 1.6 }}>
                    {drawerContent.detail.note}
                  </Typography>
                )}
              </Panel>

              <Panel sx={{ p: 2 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Contexte réservation</Typography>
                <Stack spacing={1.1}>
                  <KV k="Réservation" v={reservation.code} mono />
                  <KV k="Guest" v={reservation.guest} />
                  <KV k="Séjour" v={reservation.stay} mono divider />
                </Stack>
              </Panel>
            </Stack>
          ) : null}
        </Box>
      </Drawer>

      <Dialog open={Boolean(messagePreview)} onClose={closeMessagePreview} fullWidth maxWidth="sm">
        <DialogTitle>{messagePreview?.title}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25}>
            <Typography sx={{ fontSize: 12, color: t.text3 }}>
              {messagePreview?.channel} · {messagePreview?.template} · {messagePreview?.schedule}
            </Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
              Destinataire: {messagePreview?.recipient}
            </Typography>
            <Box
              sx={{
                p: 2,
                bgcolor: t.bg2,
                borderRadius: 2,
                border: `1px solid ${t.border}`,
                whiteSpace: 'pre-wrap',
                fontSize: 13,
                lineHeight: 1.7,
                color: t.text2,
              }}
            >
              {messagePreview?.body}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeMessagePreview} sx={btnGhostSx}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </DashboardWrapper>
  );
}

// ─── Aside helpers ──────────────────────────────────────────────
type KVProps = { k: string; v: React.ReactNode; mono?: boolean; divider?: boolean };

function KV({ k, v, mono, divider }: KVProps) {
  return (
    <Stack direction="row" sx={{
      justifyContent: 'space-between',
      alignItems: 'center',
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

type DistRowProps = { color: string; label: string; count: string; pct: number };

function DistRow({ color, label, count, pct }: DistRowProps) {
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
        <Typography sx={{ flex: 1, fontSize: 11.5, color: t.text2 }}>{label}</Typography>
        <Typography sx={{ fontFamily: 'Geist Mono', fontSize: 11, color: t.text3 }}>{count}</Typography>
      </Stack>
      <Box sx={{ height: 4, bgcolor: t.bg2, borderRadius: '99px', overflow: 'hidden' }}>
        <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: color, transition: 'width 0.4s ease' }} />
      </Box>
    </Box>
  );
}
