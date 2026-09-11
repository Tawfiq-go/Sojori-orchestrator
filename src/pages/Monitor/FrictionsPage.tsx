/**
 * Monitor → Frictions — les moments où quelqu'un n'a PAS pu aboutir.
 *
 * Les 14 autres onglets répondent à « est-ce que le service tourne ? ».
 * Celui-ci répond à « est-ce que quelqu'un est resté bloqué ? ». D'où
 * l'organisation par ACTEUR et par CAUSE plutôt que par service : un PM qui
 * n'arrive pas à se connecter et une femme de ménage dont les photos ne
 * partent pas sont deux problèmes différents, même si les deux produisent un
 * HTTP 500 dans les logs.
 *
 * ⚠️ Tant que `collection.active` est faux, aucun point d'émission n'est
 * branché : une liste vide signifie « on ne mesure pas encore », pas « tout
 * va bien ». La page l'affiche en toutes lettres — un écran vert qui ne
 * prouve rien serait pire que pas d'écran du tout.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import {
  Badge,
  MonitorEmpty,
  MonitorError,
  MonitorKpiStrip,
  MonitorLoading,
  MonitorPageHeader,
  MonitorSection,
  MonitorSelectFilter,
  MonitorToolbarRow,
  monitorTokens as t,
} from '../../features/monitoring/shared/MonitorDesign';
import {
  ACTOR_LABELS,
  CAUSE_ACTIONS,
  CAUSE_LABELS,
  OUTCOME_LABELS,
  fetchFrictions,
  type FrictionEvent,
  type FrictionsResponse,
} from '../../services/frictionsApi';

const RANGE_OPTIONS = [
  { value: '24h', label: '24 heures' },
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: 'all', label: 'Tout' },
];

const ACTOR_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'client', label: 'Voyageur' },
  { value: 'staff', label: 'Équipe terrain' },
  { value: 'owner', label: 'Propriétaire' },
  { value: 'admin', label: 'Admin' },
  { value: 'system', label: 'Système' },
  { value: 'orchestrator', label: 'Orchestrateur' },
];

const CAUSE_OPTIONS = [
  { value: '', label: 'Toutes' },
  { value: 'infra', label: 'Notre infrastructure' },
  { value: 'config', label: 'Un réglage' },
  { value: 'field', label: 'Le terrain' },
  { value: 'unknown', label: 'Non identifiée' },
];

const OUTCOME_OPTIONS = [
  { value: '', label: 'Échecs + abandons' },
  { value: 'failed', label: 'Échecs seuls' },
  { value: 'abandoned', label: 'Abandons seuls' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'Toutes' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'reservation', label: 'Réservation' },
  { value: 'task', label: 'Tâche' },
  { value: 'calendar', label: 'Calendrier' },
  { value: 'orchestration', label: 'Orchestration' },
  { value: 'support', label: 'Support' },
];

/** Les causes infra méritent une alerte : une cause, plusieurs acteurs. */
const CAUSE_TONE: Record<string, 'error' | 'warning' | 'info' | 'neutral'> = {
  infra: 'error',
  config: 'warning',
  field: 'info',
  unknown: 'neutral',
};

function startDateFor(range: string): string | undefined {
  if (range === 'all') return undefined;
  const days = range === '24h' ? 1 : range === '7d' ? 7 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Une friction se lit d'abord par QUI a été bloqué, pas par quel service a
 * renvoyé quoi. Le type d'événement reste visible, mais en second plan.
 */
function FrictionRow({ event }: { event: FrictionEvent }) {
  const actor = ACTOR_LABELS[event.actorType ?? 'unknown'] ?? event.actorType ?? 'Inconnu';
  const cause = event.causeClass ?? 'unknown';

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '130px 1fr 150px 120px' },
        gap: 1.25,
        alignItems: 'center',
        py: 1.25,
        px: 1.5,
        borderBottom: `1px solid ${t.border}`,
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Typography sx={{ fontSize: 12, color: t.text3, fontVariantNumeric: 'tabular-nums' }}>
        {formatWhen(event.timestamp)}
      </Typography>

      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.text }}>
          {actor}
          {event.listingName ? (
            <Box component="span" sx={{ color: t.text3, fontWeight: 500 }}>
              {' · '}
              {event.listingName}
            </Box>
          ) : null}
          {event.reservationNumber ? (
            <Box component="span" sx={{ color: t.text3, fontWeight: 500 }}>
              {' · '}
              {event.reservationNumber}
            </Box>
          ) : null}
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: t.text3, mt: 0.25 }}>
          {event.cause ?? event.eventType}
        </Typography>
      </Box>

      <Badge variant={CAUSE_TONE[cause] ?? 'neutral'}>{CAUSE_LABELS[cause] ?? cause}</Badge>

      <Badge variant={event.outcome === 'abandoned' ? 'warning' : 'error'}>
        {OUTCOME_LABELS[event.outcome ?? ''] ?? event.outcome ?? '—'}
      </Badge>
    </Box>
  );
}

/**
 * Bandeau affiché quand rien n'est encore mesuré. Volontairement explicite :
 * sans lui, « 0 friction » se lirait comme un bon résultat.
 */
function NotCollectingBanner({ note }: { note?: string }) {
  return (
    <Box
      sx={{
        p: 2,
        mb: 2,
        borderRadius: '12px',
        bgcolor: t.warningTint,
        border: `1px solid ${t.warning}33`,
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.warning, mb: 0.5 }}>
        Aucune friction n'est encore mesurée
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: t.text2, lineHeight: 1.6 }}>
        {note ??
          "Les événements sont enregistrés sans issue : rien ne distingue encore une action réussie d'un échec."}{' '}
        Une liste vide ci-dessous ne veut donc <strong>pas</strong> dire qu'il n'y a pas de
        friction — seulement que les points d'émission ne sont pas branchés.
      </Typography>
    </Box>
  );
}

export default function FrictionsPage() {
  const [data, setData] = useState<FrictionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [range, setRange] = useState('7d');
  const [actorType, setActorType] = useState('');
  const [causeClass, setCauseClass] = useState('');
  const [outcome, setOutcome] = useState('');
  const [eventCategory, setEventCategory] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFrictions({
        actorType: actorType || undefined,
        causeClass: causeClass || undefined,
        outcome: outcome || undefined,
        eventCategory: eventCategory || undefined,
        startDate: startDateFor(range),
        limit: 100,
      });
      setData(res);
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setError(
        status === 401
          ? "Session expirée ou absente — l'API frictions exige une authentification."
          : (e as Error)?.message || 'Chargement impossible.',
      );
    } finally {
      setLoading(false);
    }
  }, [range, actorType, causeClass, outcome, eventCategory]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * KPI orientés décision, pas volume : ce qui compte est de savoir s'il faut
   * alerter (infra), ouvrir un ticket (config) ou seulement agréger (field).
   */
  const kpis = useMemo(() => {
    if (!data) return [];
    const byCause = Object.fromEntries(data.byCause.map((c) => [c.causeClass, c.count]));
    return [
      { label: 'Total', value: data.pagination.total, tone: 'neutral' as const },
      { label: 'À alerter (infra)', value: byCause.infra ?? 0, tone: 'error' as const },
      { label: 'À traiter (réglage)', value: byCause.config ?? 0, tone: 'warning' as const },
      { label: 'Terrain', value: byCause.field ?? 0, tone: 'info' as const },
      { label: 'Non identifiées', value: byCause.unknown ?? 0, tone: 'neutral' as const },
    ];
  }, [data]);

  return (
    <Box>
      <MonitorPageHeader
        title="Frictions"
        subtitle="Les moments où quelqu'un n'a pas pu aboutir — par acteur et par cause, pas par service"
        accent="infra"
        count={data ? `${data.pagination.total}` : undefined}
        onRefresh={() => void load()}
        loading={loading}
      />

      {data && !data.collection.active && <NotCollectingBanner note={data.collection.note} />}

      <MonitorToolbarRow
        left={
          <>
            <MonitorSelectFilter
              label="Période"
              value={range}
              options={RANGE_OPTIONS}
              onChange={setRange}
            />
            <MonitorSelectFilter
              label="Qui"
              value={actorType}
              options={ACTOR_OPTIONS}
              onChange={setActorType}
            />
            <MonitorSelectFilter
              label="Cause"
              value={causeClass}
              options={CAUSE_OPTIONS}
              onChange={setCauseClass}
            />
            <MonitorSelectFilter
              label="Issue"
              value={outcome}
              options={OUTCOME_OPTIONS}
              onChange={setOutcome}
            />
            <MonitorSelectFilter
              label="Domaine"
              value={eventCategory}
              options={CATEGORY_OPTIONS}
              onChange={setEventCategory}
            />
          </>
        }
      />

      {loading && !data && <MonitorLoading label="Chargement des frictions…" />}
      {error && <MonitorError message={error} onRetry={() => void load()} />}

      {data && !error && (
        <>
          <MonitorKpiStrip items={kpis} />

          <MonitorSection title="Qui est bloqué">
            {data.byActor.length === 0 ? (
              <MonitorEmpty message="Aucun acteur concerné sur cette période." />
            ) : (
              <Stack spacing={0.75} sx={{ p: 1.5 }}>
                {data.byActor.map((a) => (
                  <Stack
                    key={a.actorType}
                    direction="row"
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Typography sx={{ fontSize: 13, color: t.text }}>
                      {ACTOR_LABELS[a.actorType] ?? a.actorType}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: t.text,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {a.count}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </MonitorSection>

          <MonitorSection title="Quoi faire">
            {data.byCause.length === 0 ? (
              <MonitorEmpty message="Aucune cause enregistrée sur cette période." />
            ) : (
              <Stack spacing={1} sx={{ p: 1.5 }}>
                {data.byCause.map((c) => (
                  <Stack
                    key={c.causeClass}
                    direction="row"
                    spacing={1.5}
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Badge variant={CAUSE_TONE[c.causeClass] ?? 'neutral'}>
                        {CAUSE_LABELS[c.causeClass] ?? c.causeClass}
                      </Badge>
                      <Typography sx={{ fontSize: 12, color: t.text3, mt: 0.4 }}>
                        {CAUSE_ACTIONS[c.causeClass] ?? '—'}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: t.text,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {c.count}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </MonitorSection>

          <MonitorSection title={`Détail (${data.events.length})`}>
            {data.events.length === 0 ? (
              <MonitorEmpty
                message={
                  data.collection.active
                    ? 'Aucune friction sur cette période avec ces filtres.'
                    : "Rien à afficher : la collecte n'est pas encore active (voir le bandeau ci-dessus)."
                }
              />
            ) : (
              <Box>
                {data.events.map((e) => (
                  <FrictionRow key={e._id} event={e} />
                ))}
              </Box>
            )}
          </MonitorSection>
        </>
      )}
    </Box>
  );
}
