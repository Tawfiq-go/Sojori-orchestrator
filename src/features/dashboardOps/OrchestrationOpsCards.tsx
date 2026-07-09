// ════════════════════════════════════════════════════════════════════
// OrchestrationOpsCards — 2 widgets « la machine tourne-t-elle ? » du
// dashboard principal (maquette validée) :
//   ⚙️ Orchestration aujourd'hui : tâches faites/en cours/en retard,
//      messages de plan en échec (bouton renvoyer), staff non accepté
//   📥 Résas sans orchestration : pending du flux import, tri par urgence
// Sources : fulltask /orchestration/day-health · reservations /orchestration/pending
// ════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import apiClient from '../../services/apiClient';
import { MICROSERVICE_BASE_URL } from '../../config/authConfig';

const MONO = 'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace';
const C = {
  ink: '#14110a', ink2: '#55504a', ink3: '#7a756c',
  border: 'rgba(20,17,10,0.08)', bg: '#fff',
  gold: '#F4CF5E', goldDeep: '#c79b22', goldTint: 'rgba(244,207,94,0.14)',
  ok: '#0a8f5e', okTint: 'rgba(10,143,94,0.10)',
  bad: '#dc2626', badTint: 'rgba(220,38,38,0.08)',
  warn: '#c46506', warnTint: 'rgba(196,101,6,0.10)',
};

interface DayHealth {
  date: string;
  tasks: {
    done: number;
    inProgress: number;
    late: number;
    lateDetails: Array<{ taskCode?: string; type?: string; reservationCode?: string | null; guestName?: string | null; dueAt: string; lateMinutes: number }>;
  };
  failedMessages: Array<{ planId: string; template?: string; label?: string; reservationCode?: string | null; guestName?: string | null; canal?: string | null }>;
  failedMessagesCount: number;
  unacceptedOver2h: number;
}

interface PendingResa {
  reservationNumber: string;
  guestName: string | null;
  channelName: string | null;
  listingId: string;
  listingName: string | null;
  checkIn: string;
  checkOut: string;
  daysUntilArrival: number;
}

const TASK_TYPE_LABELS: Record<string, string> = {
  cleaning_free: 'Ménage', cleaning_paid: 'Ménage payant', cleaning_sojori: 'Ménage Sojori',
  checkout_cleaning: 'Ménage départ', arrival_choose: 'Heure d’arrivée', departure_choose: 'Heure de départ',
  arrival_declare: 'Déclarer arrivée', departure_declare: 'Déclarer départ', registration: 'Enregistrement',
};
const taskLabel = (t?: string) => (t ? TASK_TYPE_LABELS[t] ?? t.replace(/_/g, ' ') : 'Tâche');
const channelColor = (c?: string | null) =>
  /airbnb/i.test(String(c)) ? '#e5484d' : /booking/i.test(String(c)) ? '#2f6fd6' : C.goldDeep;
const fmtLate = (m: number) => (m < 60 ? `−${m} min` : `−${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`);

const cardSx = {
  bgcolor: C.bg, border: `1px solid ${C.border}`, borderRadius: '16px', p: 2.25,
  display: 'flex', flexDirection: 'column' as const, gap: 1.25, minWidth: 0,
};
const headSx = { display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' as const };
const titleSx = { fontSize: 14.5, fontWeight: 800, letterSpacing: '-0.01em' };
const ctaSx = {
  ml: 'auto', textTransform: 'none' as const, fontWeight: 800, fontSize: 11.5, py: 0.375, px: 1.5,
  color: C.goldDeep, border: `1px solid ${C.gold}`, bgcolor: C.goldTint, borderRadius: '9px',
  '&:hover': { bgcolor: 'rgba(244,207,94,0.28)', borderColor: C.goldDeep },
};

export default function OrchestrationOpsCards({ ownerId }: { ownerId?: string }) {
  const navigate = useNavigate();
  const [health, setHealth] = useState<DayHealth | null>(null);
  const [pending, setPending] = useState<PendingResa[] | null>(null);
  const [rearmed, setRearmed] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const params = ownerId ? { ownerId } : {};
    void apiClient
      .get<{ success: boolean; data: DayHealth }>(`${MICROSERVICE_BASE_URL.SRV_FULLTASK}/orchestration/day-health`, { params })
      .then((r) => setHealth(r.data?.data ?? null))
      .catch(() => setHealth(null));
    void apiClient
      .get<{ success: boolean; reservations: PendingResa[] }>(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/orchestration/pending`, { params })
      .then((r) => setPending(r.data?.reservations ?? []))
      .catch(() => setPending([]));
  }, [ownerId]);

  useEffect(() => { void load(); }, [load]);

  const rearm = async (planId: string, template?: string) => {
    const key = `${planId}:${template}`;
    setRearmed((s) => ({ ...s, [key]: 'busy' }));
    try {
      await apiClient.post(`${MICROSERVICE_BASE_URL.SRV_FULLTASK}/orchestration/messages/rearm`, { planId, template });
      setRearmed((s) => ({ ...s, [key]: 'done' }));
    } catch {
      setRearmed((s) => ({ ...s, [key]: 'error' }));
    }
  };

  const urgent = (pending ?? []).filter((r) => r.daysUntilArrival <= 7).length;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 3 }}>
      {/* ⚙️ Orchestration aujourd'hui */}
      <Box sx={cardSx}>
        <Box sx={headSx}>
          <Typography sx={titleSx}>⚙️ Orchestration aujourd'hui</Typography>
          <Button size="small" sx={ctaSx} onClick={() => navigate('/orchestration/plans')}>Plans →</Button>
        </Box>
        {!health ? (
          <Typography sx={{ fontSize: 12.5, color: C.ink3 }}>Chargement…</Typography>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              {[
                { n: health.tasks.done, lbl: 'tâches faites', color: C.ok, tint: C.okTint },
                { n: health.tasks.inProgress, lbl: 'en cours', color: C.ink2, tint: '#f4f2ec' },
                { n: health.tasks.late, lbl: 'en retard', color: health.tasks.late > 0 ? C.bad : C.ink3, tint: health.tasks.late > 0 ? C.badTint : '#f4f2ec' },
              ].map((s) => (
                <Box key={s.lbl} sx={{ borderRadius: '12px', p: '10px 12px', textAlign: 'center', bgcolor: s.tint, border: `1px solid ${C.border}` }}>
                  <Typography sx={{ fontSize: 21, fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{s.n}</Typography>
                  <Typography sx={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.ink3 }}>{s.lbl}</Typography>
                </Box>
              ))}
            </Box>

            {health.tasks.lateDetails.map((t) => (
              <Box key={`${t.taskCode}-${t.dueAt}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, borderRadius: '10px', p: '8px 11px', bgcolor: C.badTint, border: '1px solid rgba(220,38,38,0.22)', fontSize: 12.5 }}>
                🧹 <Typography component="span" sx={{ fontSize: 12.5 }}>
                  <b>{taskLabel(t.type)} en retard</b>{t.guestName ? ` — ${t.guestName}` : ''}{t.reservationCode ? ` (${t.reservationCode})` : ''}
                </Typography>
                <Typography component="span" sx={{ fontFamily: MONO, fontSize: 10.5, color: C.bad, fontWeight: 800, ml: 'auto', whiteSpace: 'nowrap' }}>
                  {fmtLate(t.lateMinutes)}
                </Typography>
              </Box>
            ))}

            {health.failedMessages.map((m) => {
              const key = `${m.planId}:${m.template}`;
              const st = rearmed[key];
              return (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, borderRadius: '10px', p: '8px 11px', bgcolor: C.warnTint, border: '1px solid rgba(196,101,6,0.22)', fontSize: 12.5 }}>
                  ✉️ <Typography component="span" sx={{ fontSize: 12.5 }}>
                    <b>Message en échec</b> — {String(m.label ?? m.template)}{m.guestName ? ` · ${m.guestName}` : ''}{m.reservationCode ? ` (${m.reservationCode})` : ''}
                  </Typography>
                  {st === 'done' ? (
                    <Typography component="span" sx={{ fontFamily: MONO, fontSize: 10.5, color: C.ok, fontWeight: 800, ml: 'auto' }}>réarmé ✓</Typography>
                  ) : (
                    <Button size="small" disabled={st === 'busy'} onClick={() => void rearm(m.planId, m.template)}
                      sx={{ ...ctaSx, ml: 'auto', fontSize: 10.5, py: 0.125 }}>
                      {st === 'busy' ? '…' : st === 'error' ? 'réessayer' : 'renvoyer →'}
                    </Button>
                  )}
                </Box>
              );
            })}

            {health.tasks.late === 0 && health.failedMessagesCount === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, borderRadius: '10px', p: '8px 11px', bgcolor: C.okTint, color: C.ok, fontSize: 12.5, fontWeight: 700 }}>
                ✓ Machine à jour — aucune tâche en retard, aucun message en échec
                {health.unacceptedOver2h > 0 ? ` · ⚠ ${health.unacceptedOver2h} tâche(s) non acceptée(s) > 2 h` : ''}
              </Box>
            ) : health.unacceptedOver2h > 0 ? (
              <Typography sx={{ fontFamily: MONO, fontSize: 11, color: C.warn, fontWeight: 700 }}>
                ⚠ {health.unacceptedOver2h} tâche(s) non acceptée(s) par le staff depuis plus de 2 h
              </Typography>
            ) : null}
          </>
        )}
      </Box>

      {/* 📥 Résas sans orchestration */}
      <Box sx={cardSx}>
        <Box sx={headSx}>
          <Typography sx={titleSx}>📥 Résas sans orchestration</Typography>
          {(pending?.length ?? 0) > 0 ? (
            <Button size="small" sx={ctaSx} onClick={() => pending?.[0] && navigate(`/listings/${pending[0].listingId}`)}>
              Tout orchestrer →
            </Button>
          ) : null}
        </Box>
        {!pending ? (
          <Typography sx={{ fontSize: 12.5, color: C.ink3 }}>Chargement…</Typography>
        ) : pending.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, borderRadius: '10px', p: '8px 11px', bgcolor: C.okTint, color: C.ok, fontSize: 12.5, fontWeight: 700 }}>
            ✓ Toutes les réservations sont orchestrées
          </Box>
        ) : (
          <>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', color: C.warn, lineHeight: 1 }}>
                {pending.length}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: C.ink2 }}>
                réservation{pending.length > 1 ? 's' : ''} sans plan lancé
                {urgent > 0 ? <> — dont <b>{urgent} arrivée{urgent > 1 ? 's' : ''} sous 7 jours ⚠</b></> : ''}
              </Typography>
            </Stack>
            {pending.slice(0, 4).map((r) => (
              <Box key={r.reservationNumber} sx={{ display: 'flex', alignItems: 'center', gap: 1, border: `1px solid ${C.border}`, borderRadius: '10px', p: '8px 11px', fontSize: 12.5 }}>
                <Typography component="span" sx={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 800 }}>{r.reservationNumber}</Typography>
                <Box component="span" sx={{ width: 8, height: 8, borderRadius: '2px', bgcolor: channelColor(r.channelName), flexShrink: 0 }} />
                <Typography component="span" noWrap sx={{ fontSize: 12, minWidth: 0 }}>
                  {r.guestName ?? '—'} · {r.listingName ?? r.listingId.slice(-6)}
                </Typography>
                <Typography component="span" sx={{ fontFamily: MONO, fontSize: 10, color: r.daysUntilArrival <= 7 ? C.warn : C.ink3, fontWeight: r.daysUntilArrival <= 7 ? 800 : 400, whiteSpace: 'nowrap' }}>
                  {r.checkIn}{r.daysUntilArrival >= 0 && r.daysUntilArrival <= 7 ? ` · J−${r.daysUntilArrival} ⚠` : ''}
                </Typography>
                <Button size="small" onClick={() => navigate(`/listings/${r.listingId}`)}
                  sx={{ ...ctaSx, ml: 'auto', fontSize: 10.5, py: 0.125 }}>
                  Orchestrer
                </Button>
              </Box>
            ))}
          </>
        )}
      </Box>
    </Box>
  );
}
