import React, { useState } from 'react';
import { Box, Button, Stack, Typography, Drawer, IconButton, Divider } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, Panel, OrchestrationTimeline, TLEvent, TLDayLabel,
  AICard, Badge, Revenue, ViewToggle,
  btnGhostSx, btnAiSx, btnSmSx, btnPrimarySx,
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

// ════════════════════════════════════════════════════════════════════
// Page
// ════════════════════════════════════════════════════════════════════
export function OrchestrationPage() {
  const [view, setView] = useState('chronologie');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const handleEventClick = (eventData: any) => {
    setSelectedEvent(eventData);
  };

  const closeDrawer = () => {
    setSelectedEvent(null);
  };

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Orchestration', view === 'chronologie' ? 'Chronologie' : 'Plan d\'orchestration']}>
      <PageHeader title={`✨ Orchestration · ${view === 'chronologie' ? 'Chronologie' : 'Plan d\'orchestration'}`} count="RÉSA #1234">
        <ViewToggle
          options={[
            { value: 'chronologie', label: 'Chronologie' },
            { value: 'board', label: 'Plan d\'orchestration' }
          ]}
          value={view}
          onChange={setView}
        />
        <Button sx={btnGhostSx}>📋 Voir réservation</Button>
        <Button sx={btnAiSx}>✨ Demander à l'AI</Button>
      </PageHeader>

      {view === 'board' ? (
        <OrchestrationBoard />
      ) : (
        <>
          {/* Header context — réservation */}
          <Stack direction="row" alignItems="center" spacing={1.75} sx={{
            mb: 2.5, p: '14px 18px',
            bgcolor: t.bg1, border: `1px solid ${t.border}`, borderRadius: '11px',
          }}>
        <Box sx={{
          width: 48, height: 48, borderRadius: '9px',
          background: 'linear-gradient(135deg,#fde68a,#d97706)', flexShrink: 0,
        }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Villa Belvédère · Nice</Typography>
          <Typography sx={{
            fontSize: 12, color: t.text3, mt: 0.25,
            fontFamily: 'Geist Mono', letterSpacing: 0.3,
          }}>SARAH JOHNSON · 12 → 22 MAI · 10 NUITS · €1,840</Typography>
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
              onClick={() => handleEventClick({
                title: 'Réservation confirmée',
                time: '10:14 · il y a 3 jours',
                status: 'completed',
                source: 'Airbnb',
                resaId: 'HMXY42TZ8K',
                amount: '€1,840',
                type: 'reservation',
                details: 'Cette réservation a été confirmée automatiquement via Airbnb. Le paiement a été reçu et la disponibilité a été mise à jour sur tous les canaux.'
              })}
            />
            <TLEvent
              time={<><strong>10:14</strong> · +18s</>}
              icon="✨" {...ICO.ai}
              title="Workflow orchestrateur déclenché"
              badge={<Badge variant="ai">AI</Badge>}
              meta="<strong>23 tâches</strong> générées · Workflow <strong>Villa Belvédère · Long séjour</strong>"
            />
            <TLEvent
              time={<><strong>10:18</strong> · +4 min</>}
              icon="📧" {...ICO.info}
              title="Message bienvenue envoyé"
              badge={<Badge variant="info">WhatsApp</Badge>}
              meta="Template <strong>welcome-villa</strong> · 🇬🇧 EN · Lu <strong>il y a 2 min</strong>"
              quote="« Hi Sarah! 👋 Welcome to Villa Belvédère. We're delighted to host you from May 12–22… »"
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
            />
            <TLEvent
              time={<><strong>19:45</strong> · il y a 2 jours · +5h15</>}
              icon="✓" {...ICO.completed}
              title="Sarah a complété l'enregistrement"
              badge={<Badge variant="success">Form</Badge>}
              meta="Passeport scanné · Données vérifiées <strong>✓</strong> · KYC <strong>OK</strong>"
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
            />
            <TLEvent
              time={<><strong>10:00</strong> · hier</>}
              icon="🎫" {...ICO.pending}
              title="Déclaration police programmée"
              badge={<Badge variant="warning">En attente</Badge>}
              meta="Deadline <strong>15 mai 18:00</strong> · Statut <strong>En attente données check-in</strong>"
            />
            <TLEvent
              time={<><strong>15:30</strong> · hier</>}
              icon="🧹" {...ICO.completed}
              title="Ménage pré-arrivée complété"
              badge={<Badge variant="success">Staff</Badge>}
              meta="Yasmine K. · Durée <strong>2h35</strong> · Photos validées <strong>✓</strong> · Note <strong>9.6/10</strong>"
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
            />
            <TLEvent
              critical
              time={<><strong>16:14</strong> · aujourd'hui · +2h14</>}
              icon="🛬" {...ICO.completed}
              title="Sarah a effectué son check-in"
              badge={<Badge variant="success">Auto · QR + GPS</Badge>}
              meta="Vérifié sur place · ID + photo profil <strong>✓</strong> · Vidéo welcome <strong>vue 2 fois</strong>"
            />
            <TLEvent
              time={<><strong>18:00</strong> · aujourd'hui · prévu +1h46</>}
              icon="📧" {...ICO.completed}
              title="Déclaration police envoyée"
              badge={<Badge variant="success">API</Badge>}
              meta="Préfecture · Statut <strong style='color:#047857'>Accepté ✓</strong> · Référence <strong>POL-2026-9821</strong>"
            />
            <TLEvent
              time={<><strong>19:00</strong> · aujourd'hui</>}
              icon="🧹" {...ICO.pending}
              title="Ménage de fin programmé"
              badge={<Badge variant="warning">Planifié</Badge>}
              meta="Assigné <strong>Marie Dupont</strong> · Check-out prévu <strong>22 mai 11:00</strong> · Durée estimée 3h"
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
            />
            <TLEvent
              future
              time={<><strong>11:00</strong> · dans 7 jours</>}
              icon="🛫" {...ICO.future}
              title="Check-out prévu"
              badge={<Badge variant="warning">Deadline</Badge>}
              meta="QR code de sortie · Vidéo checkout à filmer · Désactivation code d'accès auto"
            />
            <TLEvent
              future
              time={<><strong>12:00</strong> · dans 7 jours</>}
              icon="🧹" {...ICO.future}
              title="Ménage complet programmé"
              badge={<Badge variant="info">Staff</Badge>}
              meta="Assigné <strong>Marie Dupont</strong> · Durée estimée <strong>3h</strong> · Inclut inventaire & photos"
            />
            <TLEvent
              future
              time={<><strong>14:00</strong> · dans 7 jours · +3h</>}
              icon="📧" {...ICO.future}
              title="Message merci programmé"
              badge={<Badge variant="info">WhatsApp</Badge>}
              meta="Template <strong>thank-you-villa</strong> · Délai <strong>+3h après checkout</strong>"
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
            />
            <TLEvent
              future
              time={<><strong>10:00</strong> · dans 8 jours</>}
              icon="📧" {...ICO.future}
              title="Plan de relances avis"
              badge={<Badge variant="warning">3 essais max</Badge>}
              meta={`${retryChip('Essai 1/3')} 23 mai · ${retryChip('Essai 2/3')} 26 mai · ${retryChip('Essai 3/3')} 30 mai`}
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

      {/* ═══════════════ Event Details Drawer ═══════════════ */}
      <Drawer
        anchor="right"
        open={!!selectedEvent}
        onClose={closeDrawer}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 420 },
            bgcolor: t.bg0,
          },
        }}
      >
        {selectedEvent && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Stack direction="row" sx={{
              alignItems: 'center', justifyContent: 'space-between',
              p: '16px 20px',
              bgcolor: t.bg1,
              borderBottom: `1px solid ${t.border}`,
            }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700 }}>Détails de l'événement</Typography>
              <IconButton onClick={closeDrawer} sx={{
                width: 32, height: 32, borderRadius: '8px',
                color: t.text2,
                '&:hover': { bgcolor: t.bg2 },
              }}>✕</IconButton>
            </Stack>

            {/* Content */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: '20px 20px' }}>
              {/* Title & Status */}
              <Stack spacing={1.5} sx={{ mb: 3 }}>
                <Typography sx={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>
                  {selectedEvent.title}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Badge variant={
                    selectedEvent.status === 'completed' ? 'success' :
                    selectedEvent.status === 'pending' ? 'warning' :
                    selectedEvent.status === 'error' ? 'error' : 'info'
                  } dot>
                    {selectedEvent.status === 'completed' ? 'Complété' :
                     selectedEvent.status === 'pending' ? 'En attente' :
                     selectedEvent.status === 'error' ? 'Erreur' : 'Info'}
                  </Badge>
                  <Typography sx={{
                    fontSize: 12, color: t.text3,
                    fontFamily: 'Geist Mono', letterSpacing: 0.3,
                  }}>{selectedEvent.time}</Typography>
                </Stack>
              </Stack>

              <Divider sx={{ mb: 3, borderColor: t.border }} />

              {/* Details Grid */}
              <Stack spacing={2.5}>
                {selectedEvent.source && (
                  <DetailRow label="Source" value={selectedEvent.source} />
                )}
                {selectedEvent.resaId && (
                  <DetailRow label="ID Réservation" value={selectedEvent.resaId} mono />
                )}
                {selectedEvent.amount && (
                  <DetailRow label="Montant" value={selectedEvent.amount} mono />
                )}
                {selectedEvent.type && (
                  <DetailRow label="Type" value={selectedEvent.type} />
                )}
              </Stack>

              <Divider sx={{ my: 3, borderColor: t.border }} />

              {/* Description */}
              {selectedEvent.details && (
                <Box>
                  <Typography sx={{
                    fontSize: 11, fontWeight: 700, color: t.text3,
                    letterSpacing: 0.8, textTransform: 'uppercase',
                    fontFamily: 'Geist Mono', mb: 1.5,
                  }}>Description</Typography>
                  <Typography sx={{
                    fontSize: 13, lineHeight: 1.6, color: t.text2,
                    bgcolor: t.bg1, p: '12px 14px',
                    border: `1px solid ${t.border}`, borderRadius: '9px',
                  }}>{selectedEvent.details}</Typography>
                </Box>
              )}

              {/* Actions Section */}
              <Box sx={{ mt: 3 }}>
                <Typography sx={{
                  fontSize: 11, fontWeight: 700, color: t.text3,
                  letterSpacing: 0.8, textTransform: 'uppercase',
                  fontFamily: 'Geist Mono', mb: 1.5,
                }}>Actions rapides</Typography>
                <Stack spacing={1}>
                  <Button sx={{ ...btnGhostSx, width: '100%', justifyContent: 'flex-start' }}>
                    📋 Voir la réservation complète
                  </Button>
                  <Button sx={{ ...btnGhostSx, width: '100%', justifyContent: 'flex-start' }}>
                    💬 Contacter le voyageur
                  </Button>
                  <Button sx={{ ...btnGhostSx, width: '100%', justifyContent: 'flex-start' }}>
                    📊 Voir les logs système
                  </Button>
                </Stack>
              </Box>
            </Box>

            {/* Footer */}
            <Box sx={{
              p: '16px 20px',
              bgcolor: t.bg1,
              borderTop: `1px solid ${t.border}`,
            }}>
              <Button
                onClick={closeDrawer}
                sx={{ ...btnPrimarySx, width: '100%', justifyContent: 'center' }}
              >
                Fermer
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>
    </DashboardWrapper>
  );
}

// ─── Drawer Detail Row helper ──────────────────────────────────
type DetailRowProps = { label: string; value: string; mono?: boolean };

function DetailRow({ label, value, mono }: DetailRowProps) {
  return (
    <Box>
      <Typography sx={{
        fontSize: 11, color: t.text3, mb: 0.5,
        fontFamily: 'Geist Mono', letterSpacing: 0.4,
      }}>{label}</Typography>
      <Typography sx={{
        fontSize: 13, fontWeight: 600,
        fontFamily: mono ? 'Geist Mono' : 'inherit',
      }}>{value}</Typography>
    </Box>
  );
}

// ─── Aside helpers ──────────────────────────────────────────────
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

type DistRowProps = { color: string; label: string; count: string; pct: number };

function DistRow({ color, label, count, pct }: DistRowProps) {
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
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
