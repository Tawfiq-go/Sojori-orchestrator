/**
 * Monitor → AI — onglet Usage : stats par cas d'usage IA et par modèle.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Collapse, Stack, Typography } from '@mui/material';
import { formatCasablancaDate } from '../../utils/dateFormatting.js';
import {
  fetchAiUsageBreakdown,
  type AiModality,
  type MergedModelRow,
  type MergedUseCase,
  type RecentAiCall,
} from '../../services/aiUsageMonitoringApi';
import {
  Badge,
  DataTable,
  FilterChip,
  MonitorEmpty,
  MonitorError,
  MonitorKpiStrip,
  MonitorLoading,
  MonitorSection,
  monitorTokens as t,
} from '../../features/monitoring/shared/MonitorDesign';

type WindowKey = 'h24' | 'd7' | 'd30' | 'month';
type ModalityFilter = 'all' | AiModality;

const WINDOW_LABELS: Record<WindowKey, string> = {
  h24: '24 h',
  d7: '7 j',
  d30: '30 j',
  month: 'Mois en cours',
};

const MODALITY_FILTERS: { value: ModalityFilter; label: string }[] = [
  { value: 'all', label: 'Tous types' },
  { value: 'text', label: 'Texte' },
  { value: 'voice_stt', label: 'Voice STT' },
  { value: 'voice_tts', label: 'Voice TTS' },
  { value: 'image', label: 'Image' },
];

function modalityBadgeVariant(m?: AiModality): 'success' | 'ai' | 'info' | 'warning' | 'neutral' {
  if (m === 'text') return 'info';
  if (m === 'voice_stt') return 'ai';
  if (m === 'voice_tts') return 'warning';
  if (m === 'image') return 'success';
  return 'neutral';
}

function fmtUsd(n: number): string {
  if (!n || n <= 0) return '—';
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(3)}`;
}

function fmtTokens(n: number): string {
  if (!n) return '—';
  return n.toLocaleString('fr-FR');
}

function providerBadge(p: string): 'success' | 'ai' | 'info' | 'warning' | 'neutral' {
  if (p === 'openai') return 'success';
  if (p === 'claude') return 'ai';
  if (p === 'gemini') return 'info';
  if (p === 'deepseek') return 'warning';
  if (p === 'gcloud') return 'neutral';
  return 'neutral';
}

function metricLabelsForModality(modality?: AiModality): {
  in: string;
  out: string;
  total: string;
  avg: string;
} {
  if (modality === 'voice_tts') {
    return { in: 'Caractères', out: '—', total: 'Chars', avg: 'Moy chars' };
  }
  if (modality === 'voice_stt') {
    return { in: 'Tokens in', out: 'Tokens out', total: 'Total', avg: 'Moy / appel' };
  }
  if (modality === 'image') {
    return { in: 'Tokens in', out: 'Tokens out', total: 'Total', avg: 'Moy / appel' };
  }
  return { in: 'Tokens in', out: 'Tokens out', total: 'Total tok', avg: 'Moy / appel' };
}

function StatCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <Box sx={{ minWidth: 72 }}>
      <Typography sx={{ fontSize: 9, color: t.text3, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 700,
          color: t.text,
          fontFamily: mono ? 'Geist Mono, monospace' : 'inherit',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function ModelStatsRow({ row, windowKey }: { row: MergedModelRow; windowKey: WindowKey }) {
  const w = row.windows[windowKey];
  const dimmed = row.catalogOnly || w.calls === 0;
  const labels = metricLabelsForModality(row.modality);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(140px, 1.2fr) repeat(6, minmax(64px, 1fr))',
        gap: 1,
        alignItems: 'center',
        py: 0.75,
        px: 1,
        borderRadius: 1,
        opacity: dimmed ? 0.55 : 1,
        bgcolor: dimmed ? 'transparent' : 'rgba(255,255,255,0.02)',
        borderBottom: `1px solid ${t.border}`,
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Badge variant={providerBadge(row.provider)}>{row.provider}</Badge>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.llmModel}
        </Typography>
        {row.catalogOnly ? <Badge variant="neutral">0 appel</Badge> : null}
      </Stack>
      <StatCell label="Appels" value={String(w.calls)} mono />
      <StatCell label={labels.in} value={fmtTokens(w.promptTokens)} mono />
      <StatCell label={labels.out} value={row.modality === 'voice_tts' ? '—' : fmtTokens(w.completionTokens)} mono />
      <StatCell label={labels.total} value={fmtTokens(w.totalTokens || w.promptTokens)} mono />
      <StatCell
        label={labels.avg}
        value={w.avgTotalTokens || w.avgPromptTokens ? String(Math.round(w.avgTotalTokens || w.avgPromptTokens)) : '—'}
        mono
      />
      <StatCell label="Coût" value={fmtUsd(w.costUsd)} mono />
    </Box>
  );
}

function UseCaseCard({
  useCase,
  windowKey,
  expanded,
  onToggle,
}: {
  useCase: MergedUseCase;
  windowKey: WindowKey;
  expanded: boolean;
  onToggle: () => void;
}) {
  const totals = useCase.totals[windowKey];
  const hasActivity = totals.calls > 0;
  const activeModels = useCase.models.filter((m) => m.windows[windowKey].calls > 0).length;

  return (
    <MonitorSection
      dense
      title={
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', cursor: 'pointer', width: '100%' }}
          onClick={onToggle}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text, flex: 1 }}>
            {useCase.label}
          </Typography>
          <Badge variant={modalityBadgeVariant(useCase.modality)}>
            {useCase.modalityLabel || useCase.modality}
          </Badge>
          <Badge variant="neutral">{useCase.service.replace('srv-', '')}</Badge>
          {useCase.topModelD30 ? (
            <Typography sx={{ fontSize: 10, color: t.text3 }}>
              Top 30j · {useCase.topModelD30.llmModel} ({useCase.topModelD30.calls})
            </Typography>
          ) : null}
          <Badge variant={hasActivity ? 'success' : 'neutral'}>
            {totals.calls} appel{totals.calls !== 1 ? 's' : ''}
          </Badge>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.success, fontFamily: 'Geist Mono, monospace' }}>
            {fmtUsd(totals.costUsd)}
          </Typography>
        </Stack>
      }
      desc={useCase.description}
    >
      <Collapse in={expanded}>
        <Box sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: 10, color: t.text3, mb: 0.75 }}>
            {activeModels} modèle(s) actif(s) · {useCase.models.length} dans le catalogue (incl. fallbacks à 0)
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(140px, 1.2fr) repeat(6, minmax(64px, 1fr))',
              gap: 1,
              px: 1,
              pb: 0.5,
            }}
          >
            {['Modèle', 'Appels', 'In', 'Out', 'Total', 'Moy', 'Coût'].map((h) => (
              <Typography key={h} sx={{ fontSize: 9, fontWeight: 700, color: t.text3, textTransform: 'uppercase' }}>
                {h}
              </Typography>
            ))}
          </Box>
          {useCase.models.map((m) => (
            <ModelStatsRow key={`${m.provider}|${m.llmModel}`} row={m} windowKey={windowKey} />
          ))}
        </Box>
      </Collapse>
    </MonitorSection>
  );
}

export default function AIMonitoringUsageTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowKey, setWindowKey] = useState<WindowKey>('d30');
  const [data, setData] = useState<import('../../services/aiUsageMonitoringApi').AiUsageBreakdownResponse | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [modalityFilter, setModalityFilter] = useState<ModalityFilter>('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAiUsageBreakdown({ callsLimit: 80 });
      if (!res.data?.success) throw new Error('Réponse invalide');
      setData(res.data);
    } catch (err: unknown) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const global = data?.data?.globalTotals?.[windowKey];
  const byModality = data?.data?.byModality ?? [];
  const useCases = useMemo(() => {
    let list = data?.data?.useCases ?? [];
    if (modalityFilter !== 'all') {
      list = list.filter((uc) => uc.modality === modalityFilter);
    }
    if (showOnlyActive) {
      list = list.filter((uc) => uc.totals[windowKey].calls > 0);
    }
    return list;
  }, [data, showOnlyActive, windowKey, modalityFilter]);

  const recentCalls = useMemo(() => {
    const list = data?.data?.recentCalls ?? [];
    if (modalityFilter === 'all') return list;
    const triggers = new Set(
      (data?.data?.useCases ?? [])
        .filter((uc) => uc.modality === modalityFilter)
        .flatMap((uc) => uc.models.map((m) => m.triggeredBy)),
    );
    return list.filter((c) => triggers.has(c.triggeredBy));
  }, [data, modalityFilter]);

  const serviceErrors = data?.data?.serviceErrors ?? {};

  if (loading && !data) return <MonitorLoading label="Chargement usage IA…" />;
  if (error) return <MonitorError message={error} onRetry={() => void load()} />;

  return (
    <Stack spacing={1.25}>
      <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        {(Object.keys(WINDOW_LABELS) as WindowKey[]).map((k) => (
          <FilterChip
            key={k}
            label={WINDOW_LABELS[k]}
            active={windowKey === k}
            onClick={() => setWindowKey(k)}
          />
        ))}
        <Box sx={{ flex: 1 }} />
        <FilterChip
          label={showOnlyActive ? 'Tous les cas' : 'Actifs seulement'}
          active={showOnlyActive}
          onClick={() => setShowOnlyActive((v) => !v)}
        />
      </Stack>

      <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: 'uppercase', mr: 0.5 }}>
          Type
        </Typography>
        {MODALITY_FILTERS.map((f) => (
          <FilterChip
            key={f.value}
            label={f.label}
            active={modalityFilter === f.value}
            onClick={() => setModalityFilter(f.value)}
          />
        ))}
      </Stack>

      {byModality.length > 0 ? (
        <MonitorKpiStrip
          items={byModality.map((m) => {
            const w = m.windows[windowKey];
            return {
              label: m.label,
              value: `${w.calls} · ${fmtUsd(w.costUsd)}`,
              tone:
                m.modality === 'voice_stt'
                  ? 'ai'
                  : m.modality === 'voice_tts'
                    ? 'warning'
                    : m.modality === 'image'
                      ? 'success'
                      : 'info',
              active: modalityFilter === m.modality,
              onClick: () =>
                setModalityFilter((prev) => (prev === m.modality ? 'all' : m.modality)),
            };
          })}
        />
      ) : null}

      {global && modalityFilter === 'all' ? (
        <MonitorKpiStrip
          items={[
            { label: 'Appels', value: global.calls, tone: 'info' },
            { label: 'Réussis', value: global.successCount, tone: 'success' },
            { label: 'Échecs', value: global.failedCount, tone: global.failedCount ? 'error' : 'neutral' },
            { label: 'Tokens in', value: fmtTokens(global.promptTokens), tone: 'neutral' },
            { label: 'Tokens out', value: fmtTokens(global.completionTokens), tone: 'neutral' },
            { label: 'Total tokens', value: fmtTokens(global.totalTokens), tone: 'neutral' },
            { label: 'Moy / appel', value: global.avgTotalTokens ? String(Math.round(global.avgTotalTokens)) : '—', tone: 'info' },
            { label: 'Max tokens', value: fmtTokens(global.maxTotalTokens), tone: 'warning' },
            { label: 'Coût estimé', value: fmtUsd(global.costUsd), tone: 'success' },
          ]}
        />
      ) : null}

      {Object.keys(serviceErrors).length > 0 ? (
        <MonitorSection dense title="Services partiels" desc="Certaines sources n'ont pas répondu">
          <Stack spacing={0.5}>
            {Object.entries(serviceErrors).map(([svc, msg]) => (
              <Typography key={svc} sx={{ fontSize: 11, color: t.error }}>
                {svc}: {msg}
              </Typography>
            ))}
          </Stack>
        </MonitorSection>
      ) : null}

      <Stack spacing={1}>
        {useCases.length === 0 ? (
          <MonitorEmpty message="Aucun cas d'usage IA sur cette période." />
        ) : (
          useCases.map((uc) => (
            <UseCaseCard
              key={uc.id}
              useCase={uc}
              windowKey={windowKey}
              expanded={expanded[uc.id] !== false}
              onToggle={() => setExpanded((e) => ({ ...e, [uc.id]: !(e[uc.id] !== false) }))}
            />
          ))
        )}
      </Stack>

      {recentCalls.length > 0 ? (
        <MonitorSection dense title="Derniers appels" desc={`${recentCalls.length} récents`}>
          <DataTable
            hideRowActions
            compact
            columns={[
              {
                key: 'createdAt',
                label: 'Date',
                width: '120px',
                render: (row: RecentAiCall) => (
                  <Typography sx={{ fontSize: 11, color: t.text2 }}>
                    {formatCasablancaDate(row.createdAt)}
                  </Typography>
                ),
              },
              {
                key: 'triggeredBy',
                label: 'Usage',
                render: (row: RecentAiCall) => (
                  <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{row.triggeredBy}</Typography>
                ),
              },
              {
                key: 'model',
                label: 'Modèle',
                render: (row: RecentAiCall) => (
                  <Badge variant={providerBadge(row.provider)}>{row.llmModel}</Badge>
                ),
              },
              {
                key: 'in',
                label: 'In',
                align: 'right',
                render: (row: RecentAiCall) => (
                  <Typography sx={{ fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>
                    {fmtTokens(row.promptTokens)}
                  </Typography>
                ),
              },
              {
                key: 'out',
                label: 'Out',
                align: 'right',
                render: (row: RecentAiCall) => (
                  <Typography sx={{ fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>
                    {fmtTokens(row.completionTokens)}
                  </Typography>
                ),
              },
              {
                key: 'cost',
                label: 'Coût',
                align: 'right',
                render: (row: RecentAiCall) => (
                  <Typography sx={{ fontSize: 11, color: t.success, fontFamily: 'Geist Mono, monospace' }}>
                    {fmtUsd(row.costUsd)}
                  </Typography>
                ),
              },
              {
                key: 'ok',
                label: 'OK',
                render: (row: RecentAiCall) => (
                  <Badge variant={row.success ? 'success' : 'error'} dot>
                    {row.success ? 'OK' : 'KO'}
                  </Badge>
                ),
              },
            ]}
            rows={recentCalls.map((r, i) => ({ id: r.id || `rc-${i}`, ...r }))}
          />
        </MonitorSection>
      ) : null}
    </Stack>
  );
}
