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
  type WindowStats,
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
type KpiTone = 'neutral' | 'error' | 'warning' | 'success' | 'info';

/** Short chip label */
const WINDOW_CHIP: Record<WindowKey, string> = {
  h24: '24 h',
  d7: '7 jours',
  d30: '30 jours',
  month: 'Mois en cours',
};

/** Full phrase used in titles / column headers */
const WINDOW_PHRASE: Record<WindowKey, string> = {
  h24: 'les dernières 24 heures',
  d7: 'les 7 derniers jours',
  d30: 'les 30 derniers jours',
  month: 'le mois calendaire en cours',
};

/** Compact suffix for badges (ex. "sur 30 j") */
const WINDOW_SHORT: Record<WindowKey, string> = {
  h24: '24 h',
  d7: '7 j',
  d30: '30 j',
  month: 'ce mois',
};

const MODALITY_FILTERS: { value: ModalityFilter; label: string }[] = [
  { value: 'all', label: 'Tous types' },
  { value: 'text', label: 'Texte' },
  { value: 'voice_stt', label: 'Voice STT' },
  { value: 'voice_tts', label: 'Voice TTS' },
  { value: 'image', label: 'Image' },
];

const EMPTY_WINDOW: WindowStats = {
  calls: 0,
  successCount: 0,
  failedCount: 0,
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  costUsd: 0,
  avgPromptTokens: 0,
  avgCompletionTokens: 0,
  avgTotalTokens: 0,
  avgCostUsd: 0,
  minTotalTokens: 0,
  maxTotalTokens: 0,
  minCostUsd: 0,
  maxCostUsd: 0,
};

function modalityBadgeVariant(m?: AiModality): 'success' | 'ai' | 'info' | 'warning' | 'neutral' {
  if (m === 'text') return 'info';
  if (m === 'voice_stt') return 'ai';
  if (m === 'voice_tts') return 'warning';
  if (m === 'image') return 'success';
  return 'neutral';
}

function modalityKpiTone(m?: AiModality): KpiTone {
  if (m === 'voice_stt') return 'info';
  if (m === 'voice_tts') return 'warning';
  if (m === 'image') return 'success';
  return 'info';
}

function modalityLabel(m?: AiModality, fallback?: string): string {
  if (fallback) return fallback;
  if (m === 'voice_stt') return 'Voice · STT';
  if (m === 'voice_tts') return 'Voice · TTS';
  if (m === 'image') return 'Image';
  if (m === 'text') return 'Texte';
  return 'Texte';
}

function fmtUsd(n?: number): string {
  if (n == null || Number.isNaN(n) || n <= 0) return '—';
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(3)}`;
}

function fmtTokens(n?: number): string {
  if (n == null || Number.isNaN(n) || !n) return '—';
  return n.toLocaleString('fr-FR');
}

function providerBadge(p?: string): 'success' | 'ai' | 'info' | 'warning' | 'neutral' {
  if (p === 'openai') return 'success';
  if (p === 'claude') return 'ai';
  if (p === 'gemini') return 'info';
  if (p === 'deepseek') return 'warning';
  if (p === 'gcloud') return 'neutral';
  return 'neutral';
}

function windowOf(
  windows: Partial<Record<WindowKey, WindowStats>> | undefined,
  key: WindowKey,
): WindowStats {
  return windows?.[key] ?? EMPTY_WINDOW;
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

function columnHeaders(windowKey: WindowKey, isTts: boolean): string[] {
  const p = WINDOW_SHORT[windowKey];
  return [
    'Modèle',
    `Appels (${p})`,
    isTts ? `Caractères (${p})` : `Tokens entrée (${p})`,
    isTts ? '—' : `Tokens sortie (${p})`,
    isTts ? `Total chars (${p})` : `Total tokens (${p})`,
    isTts ? 'Moy. chars / appel' : 'Moy. tokens / appel',
    `Coût estimé (${p})`,
  ];
}

function ModelStatsRow({ row, windowKey }: { row: MergedModelRow; windowKey: WindowKey }) {
  const w = windowOf(row.windows, windowKey);
  const dimmed = row.catalogOnly || w.calls === 0;
  const isTts = row.modality === 'voice_tts';
  const p = WINDOW_SHORT[windowKey];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(160px, 1.3fr) repeat(6, minmax(72px, 1fr))',
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
        <Badge variant={providerBadge(row.provider)}>{row.provider || '—'}</Badge>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {row.llmModel || '—'}
        </Typography>
        {row.catalogOnly ? <Badge variant="neutral">0 appel</Badge> : null}
      </Stack>
      <StatCell label={`Appels · ${p}`} value={String(w.calls)} mono />
      <StatCell
        label={isTts ? `Caractères · ${p}` : `Entrée · ${p}`}
        value={fmtTokens(w.promptTokens)}
        mono
      />
      <StatCell
        label={isTts ? '—' : `Sortie · ${p}`}
        value={isTts ? '—' : fmtTokens(w.completionTokens)}
        mono
      />
      <StatCell
        label={isTts ? `Total chars · ${p}` : `Total tokens · ${p}`}
        value={fmtTokens(w.totalTokens || w.promptTokens)}
        mono
      />
      <StatCell
        label="Moy. / appel"
        value={
          w.avgTotalTokens || w.avgPromptTokens
            ? String(Math.round(w.avgTotalTokens || w.avgPromptTokens))
            : '—'
        }
        mono
      />
      <StatCell label={`Coût · ${p}`} value={fmtUsd(w.costUsd)} mono />
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
  const totals = windowOf(useCase.totals, windowKey);
  const hasActivity = totals.calls > 0;
  const models = Array.isArray(useCase.models) ? useCase.models : [];
  const activeModels = models.filter((m) => windowOf(m.windows, windowKey).calls > 0).length;
  const service = String(useCase.service || '—').replace(/^srv-/, '');
  const period = WINDOW_SHORT[windowKey];
  const isTts = useCase.modality === 'voice_tts';
  const topModel = [...models]
    .filter((m) => windowOf(m.windows, windowKey).calls > 0)
    .sort((a, b) => windowOf(b.windows, windowKey).calls - windowOf(a.windows, windowKey).calls)[0];
  const headers = columnHeaders(windowKey, isTts);

  return (
    <MonitorSection
      dense
      title={useCase.label || useCase.id || 'Usage IA'}
      desc={`${useCase.description || ''} · Stats sur ${WINDOW_PHRASE[windowKey]}`.replace(/^ · /, '')}
      headRight={
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: 'center', cursor: 'pointer', flexWrap: 'wrap' }}
          onClick={onToggle}
        >
          <Badge variant={modalityBadgeVariant(useCase.modality)}>
            {modalityLabel(useCase.modality, useCase.modalityLabel)}
          </Badge>
          <Badge variant="neutral">{service}</Badge>
          {topModel ? (
            <Typography sx={{ fontSize: 10, color: t.text3 }}>
              Top {period} · {topModel.llmModel} ({windowOf(topModel.windows, windowKey).calls})
            </Typography>
          ) : null}
          <Badge variant={hasActivity ? 'success' : 'neutral'}>
            {totals.calls} appel{totals.calls !== 1 ? 's' : ''} / {period}
          </Badge>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.success, fontFamily: 'Geist Mono, monospace' }}>
            {fmtUsd(totals.costUsd)} / {period}
          </Typography>
          <Typography sx={{ fontSize: 11, color: t.text3 }}>{expanded ? '▾' : '▸'}</Typography>
        </Stack>
      }
    >
      <Box
        onClick={onToggle}
        sx={{ cursor: 'pointer', mb: expanded ? 0.75 : 0, fontSize: 11, color: t.text3 }}
      >
        {expanded ? 'Masquer les modèles' : 'Voir les modèles'}
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ mb: 1 }}>
          <Typography sx={{ fontSize: 10, color: t.text3, mb: 0.75 }}>
            {activeModels} modèle(s) actif(s) sur {period} · {models.length} au catalogue (fallbacks à 0 inclus).
            Colonnes = cumuls sur {WINDOW_PHRASE[windowKey]} uniquement.
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(160px, 1.3fr) repeat(6, minmax(72px, 1fr))',
              gap: 1,
              px: 1,
              pb: 0.5,
            }}
          >
            {headers.map((h) => (
              <Typography key={h} sx={{ fontSize: 9, fontWeight: 700, color: t.text3, textTransform: 'uppercase' }}>
                {h}
              </Typography>
            ))}
          </Box>
          {models.map((m, idx) => (
            <ModelStatsRow
              key={`${m.provider}|${m.llmModel}|${idx}`}
              row={m}
              windowKey={windowKey}
            />
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
      if (!res.data?.success) {
        throw new Error(
          (res.data as { error?: string } | undefined)?.error || 'Réponse invalide',
        );
      }
      setData(res.data);
    } catch (err: unknown) {
      setData(null);
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String(
              (err as { response?: { data?: { error?: string }; status?: number } }).response?.data
                ?.error ||
                (err as { message?: string }).message ||
                'Erreur réseau',
            )
          : err instanceof Error
            ? err.message
            : 'Erreur réseau';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const payload = data?.data;
  const global = payload?.globalTotals?.[windowKey];
  const byModality = Array.isArray(payload?.byModality) ? payload.byModality : [];

  const useCases = useMemo(() => {
    let list = Array.isArray(payload?.useCases) ? payload.useCases : [];
    if (modalityFilter !== 'all') {
      list = list.filter((uc) => (uc.modality || 'text') === modalityFilter);
    }
    if (showOnlyActive) {
      list = list.filter((uc) => windowOf(uc.totals, windowKey).calls > 0);
    }
    return list;
  }, [payload, showOnlyActive, windowKey, modalityFilter]);

  const recentCalls = useMemo(() => {
    const list = Array.isArray(payload?.recentCalls) ? payload.recentCalls : [];
    if (modalityFilter === 'all') return list;
    const triggers = new Set(
      (payload?.useCases ?? [])
        .filter((uc) => (uc.modality || 'text') === modalityFilter)
        .flatMap((uc) => (uc.models ?? []).map((m) => m.triggeredBy).filter(Boolean)),
    );
    return list.filter((c) => triggers.has(c.triggeredBy));
  }, [payload, modalityFilter]);

  const serviceErrors = payload?.serviceErrors ?? {};

  if (loading && !data) return <MonitorLoading label="Chargement usage IA…" />;
  if (error) return <MonitorError message={error} onRetry={() => void load()} />;

  const period = WINDOW_SHORT[windowKey];
  const periodPhrase = WINDOW_PHRASE[windowKey];

  return (
    <Stack spacing={1.25}>
      {/* Période — filtre principal, bien visible */}
      <Box
        sx={{
          p: 1.25,
          borderRadius: '10px',
          border: `1px solid ${t.border}`,
          bgcolor: t.bg1,
        }}
      >
        <Stack spacing={0.75}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800, color: t.text, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Période
            </Typography>
            <Badge variant="ai">Actif : {WINDOW_CHIP[windowKey]}</Badge>
            <Typography sx={{ fontSize: 12, color: t.text2 }}>
              Tous les totaux et coûts ci-dessous = cumuls sur <strong>{periodPhrase}</strong> (pas « depuis toujours »).
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            {(Object.keys(WINDOW_CHIP) as WindowKey[]).map((k) => (
              <FilterChip
                key={k}
                label={WINDOW_CHIP[k]}
                active={windowKey === k}
                onClick={() => setWindowKey(k)}
              />
            ))}
            <Box sx={{ flex: 1, minWidth: 8 }} />
            <FilterChip
              label={showOnlyActive ? 'Tous les cas' : 'Actifs seulement'}
              active={showOnlyActive}
              onClick={() => setShowOnlyActive((v) => !v)}
            />
          </Stack>
        </Stack>
      </Box>

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
            const w = windowOf(m.windows, windowKey);
            return {
              label: `${m.label || modalityLabel(m.modality)} · ${period}`,
              value: `${w.calls} · ${fmtUsd(w.costUsd)}`,
              tone: modalityKpiTone(m.modality),
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
            { label: `Appels · ${period}`, value: global.calls ?? 0, tone: 'info' },
            { label: `Réussis · ${period}`, value: global.successCount ?? 0, tone: 'success' },
            {
              label: `Échecs · ${period}`,
              value: global.failedCount ?? 0,
              tone: global.failedCount ? 'error' : 'neutral',
            },
            { label: `Tokens entrée · ${period}`, value: fmtTokens(global.promptTokens), tone: 'neutral' },
            { label: `Tokens sortie · ${period}`, value: fmtTokens(global.completionTokens), tone: 'neutral' },
            { label: `Total tokens · ${period}`, value: fmtTokens(global.totalTokens), tone: 'neutral' },
            {
              label: 'Moy. tokens / appel',
              value: global.avgTotalTokens ? String(Math.round(global.avgTotalTokens)) : '—',
              tone: 'info',
            },
            { label: `Max tokens / appel · ${period}`, value: fmtTokens(global.maxTotalTokens), tone: 'warning' },
            { label: `Coût estimé · ${period}`, value: fmtUsd(global.costUsd), tone: 'success' },
          ]}
        />
      ) : null}

      {Object.keys(serviceErrors).length > 0 ? (
        <MonitorSection dense title="Services partiels" desc="Certaines sources n'ont pas répondu">
          <Stack spacing={0.5}>
            {Object.entries(serviceErrors).map(([svc, msg]) => (
              <Typography key={svc} sx={{ fontSize: 11, color: t.error }}>
                {svc}: {String(msg)}
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
        <MonitorSection
          dense
          title="Derniers appels (journal)"
          desc={`${recentCalls.length} récents — tokens/coût = cet appel seul, pas la période`}
        >
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
                  <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{row.triggeredBy || '—'}</Typography>
                ),
              },
              {
                key: 'model',
                label: 'Modèle',
                render: (row: RecentAiCall) => (
                  <Badge variant={providerBadge(row.provider)}>{row.llmModel || '—'}</Badge>
                ),
              },
              {
                key: 'in',
                label: 'Tokens entrée',
                align: 'right',
                render: (row: RecentAiCall) => (
                  <Typography sx={{ fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>
                    {fmtTokens(row.promptTokens)}
                  </Typography>
                ),
              },
              {
                key: 'out',
                label: 'Tokens sortie',
                align: 'right',
                render: (row: RecentAiCall) => (
                  <Typography sx={{ fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>
                    {fmtTokens(row.completionTokens)}
                  </Typography>
                ),
              },
              {
                key: 'cost',
                label: 'Coût / appel',
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
