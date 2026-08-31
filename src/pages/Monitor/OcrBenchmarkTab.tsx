/**
 * Monitoring → OCR — laboratoire benchmark admin (passeport / CIN).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Collapse,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Badge,
  DataTable,
  MonitorEmpty,
  MonitorError,
  MonitorLoading,
  MonitorSection,
  MonitorSelectFilter,
  Panel,
  btnGhostSx,
  btnPrimarySx,
  monitorTokens as t,
} from '../../features/monitoring/shared/MonitorDesign';
import {
  CATEGORY_LABELS,
  compareOcrModels,
  fetchOcrBenchmarkProviders,
  fileToBase64,
  formatBytes,
  runOcrBenchmark,
  type OcrBenchmarkProvider,
  type OcrBenchmarkResult,
  type OcrBenchmarkRunMetrics,
  type OcrDocumentType,
} from '../../services/ocrBenchmarkService';
import {
  computeReviewStats,
  correctionsToReference,
  formatManualAccuracyLabel,
  getFieldReview,
  OCR_REVIEW_FIELD_KEYS,
  reviewStatusLabel,
  reviewStorageKey,
  sortCompareResultsByManualReview,
  type FieldReviewEntry,
  type FieldReviewStatus,
  type OcrReviewFieldKey,
  type ReviewStore,
  type SessionRun,
} from './ocrBenchmarkReview';

const FIELD_LABELS: Record<OcrReviewFieldKey, string> = {
  document_type: 'Type sélectionné',
  observed_document_type: 'Type observé',
  first_name: 'Prénom',
  last_name: 'Nom',
  document_number: 'N° document',
  nationality: 'Nationalité',
  issuing_country: 'Pays émetteur',
  residence_country: 'Pays résidence',
  gender: 'Genre',
  birth_date: 'Date naissance',
  place_of_birth: 'Lieu naissance',
  document_issued_at: 'Lieu délivrance',
  document_issued_on: 'Date délivrance',
  document_expiry_date: 'Date expiration',
  personal_number: 'N° personnel',
  mrz_line1: 'MRZ ligne 1',
  mrz_line2: 'MRZ ligne 2',
  mrz_line3: 'MRZ ligne 3',
};

function newRunId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function extractApiError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const ax = err as { response?: { data?: { error?: string } }; message?: string };
    return ax.response?.data?.error || ax.message || 'Erreur réseau';
  }
  return err instanceof Error ? err.message : 'Erreur réseau';
}

function formatDurationMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${ms} ms`;
}

function formatProviderLabel(provider: string): string {
  const map: Record<string, string> = {
    claude: 'Claude',
    openai: 'OpenAI',
    gemini: 'Gemini',
    deepseek: 'DeepSeek',
    production_chain: 'Production',
    gcloud_vision: 'Google Cloud Vision',
  };
  return map[provider.toLowerCase()] || provider;
}

function formatTokenCount(n: number | undefined | null): string {
  if (n == null) return '—';
  return n.toLocaleString('fr-FR');
}

function formatCostDisplay(run: OcrBenchmarkRunMetrics): string {
  if (run.costFreeTierEligible) {
    const equiv =
      run.paidTierEquivalentUsd != null
        ? `~$${run.paidTierEquivalentUsd >= 0.01 ? run.paidTierEquivalentUsd.toFixed(4) : run.paidTierEquivalentUsd.toFixed(6)}`
        : run.estimatedCostUsd != null
          ? `~$${run.estimatedCostUsd >= 0.01 ? run.estimatedCostUsd.toFixed(4) : run.estimatedCostUsd.toFixed(6)}`
          : null;
    return equiv ? `Free tier · ${equiv}` : 'Free tier';
  }
  if (run.estimatedCostUsd != null) {
    if (run.estimatedCostUsd >= 0.01) return `$${run.estimatedCostUsd.toFixed(4)}`;
    return `$${run.estimatedCostUsd.toFixed(6)}`;
  }
  return run.costLabel || '—';
}

function totalTokenCount(run: OcrBenchmarkRunMetrics): number | null {
  if (run.totalTokens != null) return run.totalTokens;
  if (run.inputTokens != null || run.outputTokens != null) {
    return (run.inputTokens ?? 0) + (run.outputTokens ?? 0);
  }
  return null;
}

function reviewToggleSx(active: boolean, tone: 'success' | 'error') {
  const color = tone === 'success' ? t.success : t.error;
  const bg = tone === 'success' ? t.successTint : t.errorTint;
  return {
    minWidth: 30,
    px: 0.75,
    py: 0.35,
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1,
    borderRadius: 1,
    border: `1px solid ${active ? color : t.border}`,
    bgcolor: active ? bg : t.bg2,
    color: active ? color : t.text3,
  };
}

function FieldReviewRow({
  label,
  value,
  review,
  onSetStatus,
  onCorrectionChange,
}: {
  label: string;
  value?: string;
  review: FieldReviewEntry;
  onSetStatus: (status: FieldReviewStatus) => void;
  onCorrectionChange: (correction: string) => void;
}) {
  const missing = !value?.trim();
  const isCorrect = review.status === 'correct';
  const isIncorrect = review.status === 'incorrect';

  const toggle = (target: 'correct' | 'incorrect') => {
    if (review.status === target) onSetStatus('unreviewed');
    else onSetStatus(target);
  };

  return (
    <Box sx={{ py: 0.45 }}>
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'flex-start' }}>
        <Typography sx={{ fontSize: 11, color: t.text3, minWidth: 118, flexShrink: 0, pt: 0.35 }}>
          {label}
        </Typography>
        <Typography
          sx={{
            flex: 1,
            fontSize: 12,
            fontWeight: missing ? 500 : 600,
            color: missing ? t.text3 : t.text,
            fontStyle: missing ? 'italic' : 'normal',
            wordBreak: 'break-word',
            pt: 0.25,
          }}
        >
          {missing ? '— manquant —' : value}
        </Typography>
        <Stack direction="row" spacing={0.35} sx={{ flexShrink: 0 }}>
          <Button
            size="small"
            aria-label={`${label} — correct`}
            aria-pressed={isCorrect}
            onClick={() => toggle('correct')}
            sx={reviewToggleSx(isCorrect, 'success')}
          >
            ✓
          </Button>
          <Button
            size="small"
            aria-label={`${label} — incorrect`}
            aria-pressed={isIncorrect}
            onClick={() => toggle('incorrect')}
            sx={reviewToggleSx(isIncorrect, 'error')}
          >
            ✕
          </Button>
        </Stack>
      </Stack>
      {isIncorrect ? (
        <TextField
          size="small"
          fullWidth
          label="Valeur correcte (optionnelle)"
          value={review.correction ?? ''}
          onChange={(e) => onCorrectionChange(e.target.value)}
          sx={{ mt: 0.75, ml: { xs: 0, sm: '118px' }, '& .MuiInputBase-input': { fontSize: 12 } }}
        />
      ) : null}
    </Box>
  );
}

function ReviewToolbar({
  stats,
  onMarkAllCorrect,
  onReset,
}: {
  stats: ReturnType<typeof computeReviewStats>;
  onMarkAllCorrect: () => void;
  onReset: () => void;
}) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mb: 1 }}
    >
      <Typography sx={{ fontSize: 11, color: t.text2, fontWeight: 600 }}>
        {stats.reviewedCount} / {stats.totalFields} champs vérifiés
      </Typography>
      <Box sx={{ flex: 1, minWidth: 8 }} />
      <Button size="small" sx={btnGhostSx} onClick={onMarkAllCorrect}>
        Tout correct
      </Button>
      <Button size="small" sx={btnGhostSx} onClick={onReset}>
        Réinitialiser
      </Button>
    </Stack>
  );
}

function MetricLine({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
      <Typography sx={{ fontSize: 11, color: t.text3 }}>{label}</Typography>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          fontFamily: 'Geist Mono, monospace',
          color: highlight ? t.error : t.text,
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

function KpiCell({ value, label }: { value: string; label: string }) {
  return (
    <Box sx={{ textAlign: 'center', minWidth: 0, px: 0.5 }}>
      <Typography
        sx={{
          fontFamily: 'Geist Mono, monospace',
          fontSize: 17,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: t.text,
          lineHeight: 1.15,
        }}
      >
        {value}
      </Typography>
      <Typography sx={{ fontSize: 10, fontWeight: 600, color: t.text3, mt: 0.25 }}>
        {label}
      </Typography>
    </Box>
  );
}

function MetricsPanel({
  run,
  displayName,
  reviewStats,
}: {
  run: OcrBenchmarkRunMetrics | null;
  displayName?: string;
  reviewStats: ReturnType<typeof computeReviewStats>;
}) {
  const [techOpen, setTechOpen] = useState(false);

  if (!run) return <MonitorEmpty message="Aucune métrique — lancez une analyse." />;

  const providerLabel = formatProviderLabel(run.provider);
  const tokensTotal = totalTokenCount(run);
  const under4s = run.under4s;
  const accuracyKpi =
    reviewStats.manualAccuracy != null ? `${reviewStats.manualAccuracy}%` : '—';

  return (
    <Stack spacing={1.25}>
      <Box
        sx={{
          border: `1px solid ${t.border}`,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: t.bg1,
        }}
      >
        <Box sx={{ px: 1.5, py: 1.25, borderBottom: `1px dashed ${t.border}` }}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text, lineHeight: 1.3 }}>
            {displayName || providerLabel}
          </Typography>
          <Typography
            sx={{
              fontSize: 11,
              fontFamily: 'Geist Mono, monospace',
              color: t.text2,
              mt: 0.35,
              wordBreak: 'break-all',
            }}
          >
            {run.model}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 0.5,
            px: 0.75,
            py: 1.25,
            borderBottom: `1px dashed ${t.border}`,
          }}
        >
          <KpiCell value={formatDurationMs(run.backendTotalMs)} label="Temps" />
          <KpiCell value={accuracyKpi} label="Précision" />
          <KpiCell value={tokensTotal != null ? formatTokenCount(tokensTotal) : '—'} label="Tokens" />
          <KpiCell value={formatCostDisplay(run)} label="Coût" />
        </Box>

        <Stack spacing={0.35} sx={{ px: 1.5, py: 1 }}>
          <Typography sx={{ fontSize: 11, color: t.text2 }}>
            {reviewStats.reviewedCount > 0
              ? `${reviewStats.correctCount} correct / ${reviewStats.reviewedCount} vérifiés`
              : 'Précision non évaluée'}
            {' · '}
            {!run.success
              ? 'Échec'
              : under4s
                ? 'Objectif atteint'
                : 'Trop lent'}
          </Typography>
          <Typography sx={{ fontSize: 10, color: t.text3 }}>
            API: {formatDurationMs(run.providerLatencyMs)} · Tokens entrée/sortie:{' '}
            {formatTokenCount(run.inputTokens)} / {formatTokenCount(run.outputTokens)}
          </Typography>
        </Stack>
      </Box>

      <Typography sx={{ fontSize: 11, color: t.text2 }}>
        {formatManualAccuracyLabel(reviewStats)}
      </Typography>

      <Button
        size="small"
        sx={{ ...btnGhostSx, alignSelf: 'flex-start', fontSize: 11 }}
        onClick={() => setTechOpen((v) => !v)}
      >
        {techOpen ? 'Masquer' : 'Afficher'} les détails techniques
      </Button>

      <Collapse in={techOpen}>
        <Stack spacing={0.75} sx={{ pt: 0.5 }}>
          <MetricLine label="Taille avant prep." value={formatBytes(run.imageBytesBefore)} />
          <MetricLine label="Taille après prep." value={formatBytes(run.imageBytesAfter)} />
          <MetricLine label="Prep. image" value={`${run.prepMs} ms`} />
          <MetricLine label="Parsing / norm." value={`${run.parseMs} ms`} />
          <MetricLine
            label="Tokens cache R/W"
            value={`${run.cacheReadTokens ?? 0} / ${run.cacheWriteTokens ?? 0}`}
          />
          {run.promptCacheStatus ? (
            <MetricLine label="Cache prompt" value={run.promptCacheStatus} />
          ) : null}
          {run.ocrConfigNote ? (
            <MetricLine label="Config OCR" value={run.ocrConfigNote} />
          ) : null}
          <MetricLine label="Complétude" value={`${run.completenessPercent} %`} />
          {run.accuracyPercent != null ? (
            <MetricLine label="Précision réf. (API)" value={`${run.accuracyPercent} %`} />
          ) : null}
          <MetricLine
            label="Fiabilité (gate)"
            value={run.reliabilityPass ? 'PASS' : 'FAIL'}
            highlight={!run.reliabilityPass}
          />
          <MetricLine label="MRZ détecté" value={run.mrzDetected ? 'Oui' : 'Non'} />
          <MetricLine
            label="MRZ checksum"
            value={
              run.mrzChecksumValid == null ? '—' : run.mrzChecksumValid ? 'Valide' : 'Invalide'
            }
          />
          <MetricLine
            label="Budget WhatsApp (5 s)"
            value={run.underWhatsappBudget ? 'Oui' : 'Non'}
          />
        </Stack>
      </Collapse>

      {run.error ? (
        <Alert severity="error" sx={{ fontSize: 12 }}>
          {run.error}
        </Alert>
      ) : null}
    </Stack>
  );
}

export default function OcrBenchmarkTab() {
  const [providers, setProviders] = useState<OcrBenchmarkProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [docType, setDocType] = useState<OcrDocumentType>('passport');
  const [modelId, setModelId] = useState('production_chain');
  const [runCount, setRunCount] = useState<1 | 3 | 5>(1);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [singleResult, setSingleResult] = useState<OcrBenchmarkResult | null>(null);
  const [compareResults, setCompareResults] = useState<OcrBenchmarkResult[]>([]);
  const [roundTripMs, setRoundTripMs] = useState<number | null>(null);
  const [timingNotice, setTimingNotice] = useState('');
  const [sessionRuns, setSessionRuns] = useState<Record<string, SessionRun>>({});
  const [fieldReviews, setFieldReviews] = useState<ReviewStore>({});
  const [focusModelId, setFocusModelId] = useState<string | null>(null);

  const loadProviders = useCallback(async () => {
    try {
      setLoadingProviders(true);
      setProviderError(null);
      const rows = await fetchOcrBenchmarkProviders();
      setProviders(rows);
      if (rows.length && !rows.some((p) => p.modelIds[0] === modelId)) {
        setModelId(rows[0]!.modelIds[0]!);
      }
    } catch (err) {
      setProviderError(extractApiError(err));
      setProviders([]);
    } finally {
      setLoadingProviders(false);
    }
  }, [modelId]);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  const selectedProvider = useMemo(
    () => providers.find((p) => p.modelIds[0] === modelId),
    [providers, modelId],
  );

  const activeResult = useMemo(() => {
    if (singleResult) return singleResult;
    if (!focusModelId) return compareResults[0] ?? null;
    return compareResults.find((r) => r.modelId === focusModelId) ?? compareResults[0] ?? null;
  }, [singleResult, compareResults, focusModelId]);

  const activeSessionRun = useMemo(() => {
    if (!activeResult) return undefined;
    if (singleResult && activeResult.modelId === singleResult.modelId) {
      return sessionRuns.single;
    }
    return sessionRuns[activeResult.modelId];
  }, [activeResult, singleResult, sessionRuns]);

  useEffect(() => {
    if (singleResult) {
      setFocusModelId(singleResult.modelId);
      return;
    }
    if (compareResults.length > 0) {
      setFocusModelId((prev) =>
        prev && compareResults.some((r) => r.modelId === prev)
          ? prev
          : compareResults[0]!.modelId,
      );
    }
  }, [singleResult, compareResults]);

  const activeRun = activeResult?.lastRun ?? null;
  const extracted = activeRun?.extracted ?? null;
  const activeRunId = activeSessionRun?.runId ?? '';

  const activeReviewStats = useMemo(
    () =>
      activeRunId
        ? computeReviewStats(fieldReviews, activeRunId)
        : computeReviewStats(fieldReviews, 'none'),
    [fieldReviews, activeRunId],
  );

  const setFieldReview = useCallback(
    (fieldKey: OcrReviewFieldKey, patch: Partial<FieldReviewEntry>) => {
      if (!activeRunId) return;
      const key = reviewStorageKey(activeRunId, fieldKey);
      setFieldReviews((prev) => {
        const current = prev[key] ?? { status: 'unreviewed' as const };
        return { ...prev, [key]: { ...current, ...patch } };
      });
    },
    [activeRunId],
  );

  const resetActiveReviews = useCallback(() => {
    if (!activeRunId) return;
    setFieldReviews((prev) => {
      const next = { ...prev };
      for (const fieldKey of OCR_REVIEW_FIELD_KEYS) {
        delete next[reviewStorageKey(activeRunId, fieldKey)];
      }
      return next;
    });
  }, [activeRunId]);

  const markAllCorrect = useCallback(() => {
    if (!activeRunId) return;
    const ok = window.confirm(
      'Marquer tous les champs affichés comme corrects ? Cette action modifie votre évaluation manuelle.',
    );
    if (!ok) return;
    setFieldReviews((prev) => {
      const next = { ...prev };
      for (const fieldKey of OCR_REVIEW_FIELD_KEYS) {
        next[reviewStorageKey(activeRunId, fieldKey)] = { status: 'correct' };
      }
      return next;
    });
  }, [activeRunId]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setRunError('Formats acceptés : JPEG, PNG, WebP');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setRunError('Image trop volumineuse (max 8 Mo)');
      return;
    }
    const { base64, mimeType: mt } = await fileToBase64(file);
    setImageBase64(base64);
    setMimeType(mt);
    setImagePreview(URL.createObjectURL(file));
    setRunError(null);
    setSingleResult(null);
    setCompareResults([]);
    setSessionRuns({});
    setFieldReviews({});
    setFocusModelId(null);
  };

  const clearAll = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageBase64(null);
    setSingleResult(null);
    setCompareResults([]);
    setSessionRuns({});
    setFieldReviews({});
    setFocusModelId(null);
    setRoundTripMs(null);
    setRunError(null);
  };

  const runAnalyze = async () => {
    if (!imageBase64) {
      setRunError('Chargez une image de document');
      return;
    }
    const targetProvider = providers.find((p) => p.modelIds[0] === modelId);
    if (!targetProvider?.enabled) {
      setRunError('Modèle non disponible');
      return;
    }
    try {
      setRunning(true);
      setRunError(null);
      setCompareResults([]);
      const reference = correctionsToReference(fieldReviews);
      const res = await runOcrBenchmark({
        imageBase64,
        mimeType,
        expectedDocumentType: docType,
        modelId,
        runCount,
        reference,
      });
      const runId = newRunId();
      setSessionRuns({ single: { runId, modelId: res.result.modelId } });
      setSingleResult(res.result);
      setRoundTripMs(res.roundTripMs);
      setTimingNotice(res.whatsappTimingNotice);
    } catch (err) {
      setRunError(extractApiError(err));
    } finally {
      setRunning(false);
    }
  };

  const runCompare = async () => {
    if (!imageBase64) {
      setRunError('Chargez une image de document');
      return;
    }
    try {
      setRunning(true);
      setRunError(null);
      setSingleResult(null);
      const reference = correctionsToReference(fieldReviews);
      const res = await compareOcrModels({
        imageBase64,
        mimeType,
        expectedDocumentType: docType,
        runCount,
        reference,
        providers,
      });
      const runs: Record<string, SessionRun> = {};
      for (const row of res.results) {
        runs[row.modelId] = { runId: newRunId(), modelId: row.modelId };
      }
      setSessionRuns(runs);
      setCompareResults(res.results);
      setRoundTripMs(res.roundTripMs);
      setTimingNotice(res.whatsappTimingNotice);
    } catch (err) {
      setRunError(extractApiError(err));
    } finally {
      setRunning(false);
    }
  };

  const copyJson = () => {
    const payload = extracted ?? {};
    void navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  };

  type ComparisonRow = OcrBenchmarkResult & {
    id: string;
    manualStats: ReturnType<typeof computeReviewStats>;
  };

  const comparisonRows: ComparisonRow[] = useMemo(() => {
    const rows = compareResults.map((r, idx) => ({
      id: r.modelId || `row-${idx}`,
      ...r,
      manualStats: sessionRuns[r.modelId]
        ? computeReviewStats(fieldReviews, sessionRuns[r.modelId]!.runId)
        : computeReviewStats(fieldReviews, 'none'),
    }));
    return sortCompareResultsByManualReview(rows, fieldReviews, sessionRuns);
  }, [compareResults, fieldReviews, sessionRuns]);

  return (
    <Stack spacing={1.5}>
      <Alert severity="warning" sx={{ fontSize: 12 }}>
        Données sensibles — utilisez des documents de test synthétiques ou autorisés. Les évaluations
        manuelles restent en mémoire navigateur uniquement (jamais persistées). Métrique principale :{' '}
        <strong>cœur OCR backend</strong> (hors Meta / WhatsApp Flow).
      </Alert>

      {timingNotice ? (
        <Alert severity="info" sx={{ fontSize: 12 }}>
          {timingNotice}
          {roundTripMs != null ? ` · Round-trip navigateur : ${roundTripMs} ms.` : ''}
        </Alert>
      ) : null}

      {providerError ? <MonitorError message={providerError} onRetry={loadProviders} /> : null}
      {runError ? <MonitorError message={runError} /> : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.2fr 1fr' },
          gap: 1.25,
          alignItems: 'start',
        }}
      >
        <Stack spacing={1.25}>
          <Panel sx={{ p: 1.25 }}>
            <Stack spacing={1}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.text }}>
                Image document
              </Typography>
              <Box
                sx={{
                  border: `1px dashed ${t.border}`,
                  borderRadius: 2,
                  minHeight: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: t.bg1,
                  overflow: 'hidden',
                }}
              >
                {imagePreview ? (
                  <Box
                    component="img"
                    src={imagePreview}
                    alt="Aperçu document"
                    sx={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain' }}
                  />
                ) : (
                  <Typography sx={{ fontSize: 12, color: t.text3, p: 2, textAlign: 'center' }}>
                    Glissez ou choisissez un passeport / CIN (JPEG, PNG, WebP)
                  </Typography>
                )}
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Button component="label" sx={btnGhostSx} disabled={running}>
                  Charger
                  <input
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
                  />
                </Button>
                <Button sx={btnGhostSx} onClick={clearAll} disabled={running}>
                  Effacer
                </Button>
              </Stack>
            </Stack>
          </Panel>

          <MonitorSection dense title="Informations extraites" desc="cœur OCR backend">
            {running && !extracted ? (
              <MonitorLoading label="Analyse en cours…" />
            ) : extracted && activeRunId ? (
              <Stack spacing={0.5}>
                {compareResults.length > 0 && !singleResult ? (
                  <MonitorSelectFilter
                    label="Modèle à réviser"
                    value={focusModelId ?? activeResult?.modelId ?? ''}
                    onChange={setFocusModelId}
                    options={compareResults.map((r) => ({
                      value: r.modelId,
                      label: r.displayName,
                    }))}
                  />
                ) : null}

                <ReviewToolbar
                  stats={activeReviewStats}
                  onMarkAllCorrect={markAllCorrect}
                  onReset={resetActiveReviews}
                />

                {OCR_REVIEW_FIELD_KEYS.map((key) => (
                  <FieldReviewRow
                    key={`${activeRunId}-${key}`}
                    label={FIELD_LABELS[key]}
                    value={extracted[key]}
                    review={getFieldReview(fieldReviews, activeRunId, key)}
                    onSetStatus={(status) => {
                      if (status === 'unreviewed') {
                        setFieldReview(key, { status, correction: undefined });
                      } else {
                        setFieldReview(key, { status });
                      }
                    }}
                    onCorrectionChange={(correction) => setFieldReview(key, { correction })}
                  />
                ))}

                <Typography sx={{ fontSize: 11, color: t.text2, mt: 0.5 }}>
                  {formatManualAccuracyLabel(activeReviewStats)}
                </Typography>

                <Button sx={{ ...btnGhostSx, mt: 0.5, alignSelf: 'flex-start' }} onClick={copyJson}>
                  Copier JSON
                </Button>
              </Stack>
            ) : (
              <MonitorEmpty message="Aucune extraction — lancez Analyser." />
            )}
          </MonitorSection>
        </Stack>

        <Stack spacing={1.25}>
          <Panel sx={{ p: 1.25 }}>
            <Stack spacing={1.25}>
              {loadingProviders ? (
                <MonitorLoading label="Modèles…" />
              ) : (
                <FormControl fullWidth size="small">
                  <InputLabel id="ocr-model-label">Modèle / fournisseur</InputLabel>
                  <Select
                    labelId="ocr-model-label"
                    label="Modèle / fournisseur"
                    value={modelId}
                    onChange={(e) => setModelId(String(e.target.value))}
                  >
                    {providers.map((p) => (
                      <MenuItem key={p.modelIds[0]} value={p.modelIds[0]} disabled={!p.enabled}>
                        {p.displayName}
                        {!p.enabled ? ` (${p.credentialStatus})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {selectedProvider ? (
                <Stack spacing={0.5}>
                  <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                    <Badge variant={selectedProvider.enabled ? 'success' : 'warning'}>
                      {selectedProvider.credentialStatus}
                    </Badge>
                    {selectedProvider.freeTierEligible ? (
                      <Badge variant="neutral">Free tier disponible</Badge>
                    ) : null}
                  </Stack>
                  <Typography sx={{ fontSize: 11, color: t.text3 }}>
                    {CATEGORY_LABELS[selectedProvider.category]} · {selectedProvider.description}
                  </Typography>
                </Stack>
              ) : null}

              <MonitorSelectFilter
                label="Type document"
                value={docType}
                onChange={(v) => setDocType(v as OcrDocumentType)}
                options={[
                  { value: 'passport', label: 'Passeport' },
                  { value: 'national_id', label: 'CIN / carte nationale' },
                ]}
              />

              <MonitorSelectFilter
                label="Runs"
                value={String(runCount)}
                onChange={(v) => setRunCount(Number(v) as 1 | 3 | 5)}
                options={[
                  { value: '1', label: '1 run' },
                  { value: '3', label: '3 runs' },
                  { value: '5', label: '5 runs' },
                ]}
              />

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Button sx={btnPrimarySx} onClick={() => void runAnalyze()} disabled={running}>
                  {running ? '…' : 'Analyser'}
                </Button>
                <Button sx={btnGhostSx} onClick={() => void runCompare()} disabled={running}>
                  Comparer les modèles
                </Button>
              </Stack>
            </Stack>
          </Panel>

          <MonitorSection dense title="Métriques" desc="OCR backend core">
            {running && !activeRun ? (
              <MonitorLoading label="Mesure…" />
            ) : (
              <MetricsPanel
                run={activeRun}
                displayName={activeResult?.displayName}
                reviewStats={activeReviewStats}
              />
            )}
          </MonitorSection>
        </Stack>
      </Box>

      {comparisonRows.length > 0 ? (
        <MonitorSection dense title="Comparaison modèles" desc={`${comparisonRows.length} modèles`}>
          <Typography sx={{ fontSize: 11, color: t.text3, mb: 1 }}>
            Classement par précision manuelle (si évaluée), puis temps OCR et coût. Aucun gagnant
            automatique sans revue manuelle.
          </Typography>
          <DataTable
            hideRowActions
            compact
            columns={[
              {
                key: 'provider',
                label: 'Fournisseur',
                render: (row: ComparisonRow) => (
                  <Typography sx={{ fontSize: 11 }}>{row.provider}</Typography>
                ),
              },
              {
                key: 'model',
                label: 'Modèle',
                render: (row: ComparisonRow) => (
                  <Typography sx={{ fontSize: 11, fontFamily: 'Geist Mono, monospace' }}>
                    {row.model}
                  </Typography>
                ),
              },
              {
                key: 'manualAccuracy',
                label: 'Précision man.',
                render: (row: ComparisonRow) =>
                  row.manualStats.manualAccuracy != null
                    ? `${row.manualStats.manualAccuracy}%`
                    : '—',
              },
              {
                key: 'manualCount',
                label: 'Correct / vérifiés',
                render: (row: ComparisonRow) =>
                  row.manualStats.reviewedCount > 0
                    ? `${row.manualStats.correctCount} / ${row.manualStats.reviewedCount}`
                    : '—',
              },
              {
                key: 'reviewStatus',
                label: 'Revue',
                render: (row: ComparisonRow) => (
                  <Badge
                    variant={
                      row.manualStats.reviewStatus === 'complete'
                        ? 'success'
                        : row.manualStats.reviewStatus === 'partial'
                          ? 'warning'
                          : 'neutral'
                    }
                  >
                    {reviewStatusLabel(row.manualStats.reviewStatus)}
                  </Badge>
                ),
              },
              {
                key: 'success',
                label: 'Succès',
                render: (row: ComparisonRow) => (
                  <Badge variant={row.aggregated.successRate > 0 ? 'success' : 'error'}>
                    {row.aggregated.successRate}%
                  </Badge>
                ),
              },
              {
                key: 'backend',
                label: 'OCR ms',
                align: 'right',
                render: (row: ComparisonRow) => row.aggregated.backendTotal.avg ?? '—',
              },
              {
                key: 'p95',
                label: 'p95',
                align: 'right',
                render: (row: ComparisonRow) => row.aggregated.backendTotal.p95 ?? '—',
              },
              {
                key: 'tokens',
                label: 'Tokens',
                align: 'right',
                render: (row: ComparisonRow) => row.lastRun?.totalTokens ?? '—',
              },
              {
                key: 'cost',
                label: 'Coût',
                align: 'right',
                render: (row: ComparisonRow) =>
                  row.lastRun ? formatCostDisplay(row.lastRun) : '—',
              },
              {
                key: 'notes',
                label: 'Notes',
                render: (row: ComparisonRow) => (
                  <Typography sx={{ fontSize: 10, color: t.text3, maxWidth: 160 }} noWrap>
                    {row.lastRun?.error ?? ''}
                  </Typography>
                ),
              },
            ]}
            rows={comparisonRows}
          />
        </MonitorSection>
      ) : null}
    </Stack>
  );
}
