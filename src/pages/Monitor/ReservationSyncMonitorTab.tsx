/**
 * Audit cohérence réservation / plan / whitelist / calendar
 * Design aligné sur /reservations (Atelier 2026)
 */

import React, { useState, useEffect, useCallback, useMemo, startTransition } from 'react';
import {
  Box,
  Stack,
  Typography,
  Paper,
  Chip,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Build as WrenchIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import 'moment/locale/fr';
import apiClient from '../../services/apiClient';
import { getOwners } from '../../services/teamDashboardApi';
import reservationsService from '../../services/reservationsService';
import { listingsService } from '../../services/listingsService';

moment.locale('fr');

const T = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  bg1: '#ffffff',
  bg2: '#fafaf7',
  bg3: '#f0eee8',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)',
  success: '#0a8f5e',
  warning: '#c46506',
  error: '#c81e1e',
  info: '#0673b3',
};

const ISSUE_LABELS: Record<string, string> = {
  PLAN_MISSING: 'Plan manquant',
  PLAN_ORPHAN: 'Plan orphelin',
  WHITELIST_MISSING: 'Whitelist manquante',
  WHITELIST_STALE: 'Whitelist obsolète',
  CALENDAR_BLOCK_STALE: 'Bloc calendar obsolète',
  CALENDAR_BLOCK_MISSING: 'Bloc calendar manquant',
  RESERVATION_UNREACHABLE: 'Réservation inaccessible',
};

const FIX_LABELS: Record<string, string> = {
  PLAN_MISSING: 'Créer plan',
  PLAN_ORPHAN: 'Annuler plan',
  WHITELIST_MISSING: 'Créer whitelist',
  WHITELIST_STALE: 'Annuler whitelist',
  CALENDAR_BLOCK_STALE: 'Libérer calendar',
  CALENDAR_BLOCK_MISSING: 'Bloquer calendar',
};

const SEVERITY_META: Record<string, { bg: string; color: string }> = {
  critical: { bg: 'rgba(200,30,30,0.10)', color: T.error },
  high: { bg: 'rgba(196,101,6,0.12)', color: T.warning },
  medium: { bg: 'rgba(6,115,179,0.10)', color: T.info },
  low: { bg: 'rgba(20,17,10,0.05)', color: T.text3 },
};

type OwnerRow = {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

type SyncIssue = {
  reservationId: string;
  reservationCode?: string;
  code: string;
  severity: string;
  message: string;
  reservationStatus?: string;
  planStatus?: string;
  whitelistStatus?: string;
  calendarBlocked?: boolean | null;
  activeTaskCount?: number;
  guestName?: string;
  listingId?: string;
  listingName?: string;
  channelName?: string;
  createdAt?: string;
  arrivalDate?: string;
  departureDate?: string;
  checkInTime?: string | number;
  checkOutTime?: string | number;
};

type AuditResult = {
  summary?: {
    scanned?: number;
    issues?: number;
    reservationsActive?: number;
    reservationsInWindow?: number;
    reservationsByStatus?: Record<string, number>;
    plansActive?: number;
    whitelistRows?: number;
    byCode?: Record<string, number>;
  };
  issues?: SyncIssue[];
  durationMs?: number;
};

const FIX_ERROR_HINTS: Record<string, string> = {
  reservation_unreachable: 'Réservation introuvable sur srv-reservations',
  orchestration_skipped: 'Orchestration désactivée sur le listing',
  reservation_cancelled: 'Réservation annulée — plan non créé',
  reconcile_error: 'Erreur interne lors de la réconciliation',
  whitelist_upsert_failed: 'Échec création whitelist',
  calendar_release_failed: 'Échec libération calendar',
  still_blocked_after_release: 'Bloc calendar toujours présent après libération',
  calendar_block_failed: 'Échec blocage calendar',
};

function formatFixError(payload: {
  error?: string;
  message?: string;
  action?: string;
}): string {
  const raw = payload.message || payload.error || payload.action || 'Correction échouée';
  return FIX_ERROR_HINTS[raw] ?? raw;
}

function resolveOwnerId(o: OwnerRow | null | undefined): string {
  if (!o) return '';
  return String(o._id ?? o.id ?? '').trim();
}

function ownerLabel(o: OwnerRow): string {
  const name = [o.firstName, o.lastName].filter(Boolean).join(' ').trim();
  if (name && o.email) return `${name} (${o.email})`;
  return name || o.email || resolveOwnerId(o) || 'Owner';
}

function formatTime(timeInput: unknown): string | null {
  if (timeInput === undefined || timeInput === null || timeInput === '') return null;
  if (typeof timeInput === 'string' && /^\d{1,2}$/.test(timeInput.trim())) {
    return `${timeInput.trim().padStart(2, '0')}:00`;
  }
  if (typeof timeInput === 'string' && timeInput.includes('T')) {
    const m = timeInput.match(/T(\d{2}):(\d{2})/);
    if (m) return `${m[1]}:${m[2]}`;
  }
  if (typeof timeInput === 'string' && /^\d{1,2}:\d{2}$/.test(timeInput)) {
    const [h, mn] = timeInput.split(':');
    return `${h.padStart(2, '0')}:${mn}`;
  }
  if (typeof timeInput === 'number') {
    if (timeInput < 100) return `${timeInput.toString().padStart(2, '0')}:00`;
    const h = Math.floor(timeInput / 100);
    const mn = timeInput % 100;
    return `${h.toString().padStart(2, '0')}:${mn.toString().padStart(2, '0')}`;
  }
  return null;
}

function issueNeedsEnrich(row: SyncIssue): boolean {
  return !row.guestName || !row.arrivalDate || !row.listingName;
}

function mergeReservationIntoIssue(row: SyncIssue, r: Record<string, unknown>): SyncIssue {
  const listing = r.listing as { name?: string; _id?: string } | undefined;
  const guest =
    String(r.guestName ?? '').trim() ||
    [r.guestFirstName, r.guestLastName].filter(Boolean).join(' ').trim();
  return {
    ...row,
    guestName: row.guestName || guest || undefined,
    listingId:
      row.listingId || String(r.sojoriId ?? listing?._id ?? '').trim() || undefined,
    listingName: row.listingName || listing?.name || undefined,
    channelName: row.channelName || String(r.channelName ?? '').trim() || undefined,
    createdAt: row.createdAt || (r.createdAt ? String(r.createdAt) : undefined),
    arrivalDate: row.arrivalDate || (r.arrivalDate ? String(r.arrivalDate) : undefined),
    departureDate: row.departureDate || (r.departureDate ? String(r.departureDate) : undefined),
    checkInTime: row.checkInTime ?? (r.checkInTime as string | number | undefined),
    checkOutTime: row.checkOutTime ?? (r.checkOutTime as string | number | undefined),
  };
}

async function enrichAuditIssues(issues: SyncIssue[]): Promise<SyncIssue[]> {
  const idsToFetch = [
    ...new Set(issues.filter(issueNeedsEnrich).map((i) => i.reservationId)),
  ];
  if (idsToFetch.length === 0) return issues;

  const reservationCache = new Map<string, Record<string, unknown>>();
  const BATCH = 6;
  for (let i = 0; i < idsToFetch.length; i += BATCH) {
    await Promise.all(
      idsToFetch.slice(i, i + BATCH).map(async (id) => {
        try {
          const r = await reservationsService.getById(id);
          reservationCache.set(id, r as unknown as Record<string, unknown>);
        } catch {
          /* réservation inaccessible */
        }
      }),
    );
  }

  let merged = issues.map((row) => {
    const r = reservationCache.get(row.reservationId);
    return r ? mergeReservationIntoIssue(row, r) : row;
  });

  const listingIds = [
    ...new Set(
      merged.filter((r) => r.listingId && !r.listingName).map((r) => r.listingId as string),
    ),
  ];
  if (listingIds.length > 0) {
    const listingNames = new Map<string, string>();
    await Promise.all(
      listingIds.slice(0, 40).map(async (lid) => {
        try {
          const res = await listingsService.getListingById(lid);
          const name = res.data?.name;
          if (typeof name === 'string' && name.trim()) listingNames.set(lid, name.trim());
        } catch {
          /* ignore */
        }
      }),
    );
    merged = merged.map((row) =>
      row.listingId && !row.listingName && listingNames.has(row.listingId)
        ? { ...row, listingName: listingNames.get(row.listingId) }
        : row,
    );
  }

  return merged;
}

function statusMeta(status?: string): { bg: string; color: string; label: string } {
  const n = String(status ?? '').toLowerCase();
  if (n === 'confirmed') return { bg: 'rgba(10,143,94,0.12)', color: T.success, label: 'Confirmé' };
  if (n === 'pending') return { bg: 'rgba(196,101,6,0.12)', color: T.warning, label: 'En attente' };
  if (n.includes('cancel')) return { bg: 'rgba(200,30,30,0.10)', color: T.error, label: 'Annulé' };
  if (n === 'completed') return { bg: 'rgba(6,115,179,0.10)', color: T.info, label: 'Terminé' };
  return { bg: 'rgba(20,17,10,0.05)', color: T.text3, label: status || '—' };
}

function fmtDate(d?: string): string {
  if (!d) return '—';
  const m = moment(d);
  return m.isValid() ? m.format('DD MMM YY') : '—';
}

function fmtDateTime(d?: string): { date: string; time: string } {
  if (!d) return { date: '—', time: '' };
  const m = moment(d);
  if (!m.isValid()) return { date: '—', time: '' };
  return { date: m.format('DD MMM YY'), time: m.format('HH:mm') };
}

function KpiCard({
  label,
  value,
  sub,
  accent = T.text,
}: {
  label: string;
  value?: number;
  sub?: string;
  accent?: string;
}) {
  return (
    <Paper sx={{ p: 1.75, border: `1px solid ${T.border}`, borderRadius: 1.5, bgcolor: T.bg1 }}>
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.text3 }}>
        {label}
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 22, fontWeight: 700, color: accent, lineHeight: 1 }}>
        {value ?? '—'}
      </Typography>
      {sub ? (
        <Typography sx={{ mt: 0.5, fontSize: 11, color: T.text4 }}>{sub}</Typography>
      ) : null}
    </Paper>
  );
}

function Pill({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <Button
      size="small"
      onClick={onClick}
      sx={{
        textTransform: 'none',
        fontSize: 12,
        fontWeight: 600,
        px: 1.25,
        py: 0.5,
        minHeight: 28,
        borderRadius: 999,
        border: '1px solid',
        borderColor: active ? color : T.border,
        bgcolor: active ? `${color}18` : T.bg1,
        color: active ? color : T.text2,
        '&:hover': { bgcolor: active ? `${color}22` : T.bg2 },
      }}
    >
      {label}
      <Box
        component="span"
        sx={{
          ml: 0.75,
          fontSize: 10.5,
          fontWeight: 700,
          bgcolor: active ? `${color}28` : T.bg3,
          color: active ? color : T.text3,
          borderRadius: 999,
          px: 0.75,
          py: 0.25,
        }}
      >
        {count}
      </Box>
    </Button>
  );
}

export default function ReservationSyncMonitorTab() {
  const navigate = useNavigate();
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState('');

  const [createdSinceDays, setCreatedSinceDays] = useState(14);
  const [arrivalWithinDays, setArrivalWithinDays] = useState(60);
  const [limit, setLimit] = useState(200);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);

  const [globalFilter, setGlobalFilter] = useState('');
  const [codeFilter, setCodeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedListings, setSelectedListings] = useState<string[]>([]);
  const [quickFilters, setQuickFilters] = useState({
    arrToday: false,
    depToday: false,
    arr7days: false,
    dep7days: false,
  });

  const [fixingKey, setFixingKey] = useState<string | null>(null);
  const [fixedKeys, setFixedKeys] = useState<Set<string>>(() => new Set());
  const [fixFeedback, setFixFeedback] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [batchFixing, setBatchFixing] = useState(false);
  const [batchSummary, setBatchSummary] = useState<{
    total: number;
    fixed: number;
    failed: number;
    durationMs?: number;
  } | null>(null);

  const fetchOwners = useCallback(async (q = '') => {
    setOwnersLoading(true);
    try {
      const res = await getOwners({ limit: 50, page: 0, search_text: q.trim() });
      const list =
        (res as { data?: OwnerRow[] })?.data ??
        (Array.isArray(res) ? (res as OwnerRow[]) : []);
      setOwners(Array.isArray(list) ? list : []);
    } catch {
      setOwners([]);
    } finally {
      setOwnersLoading(false);
    }
  }, []);

  const selectedOwner = useMemo(
    () => owners.find((o) => resolveOwnerId(o) === selectedOwnerId) ?? null,
    [owners, selectedOwnerId],
  );

  useEffect(() => {
    void fetchOwners('');
  }, [fetchOwners]);

  useEffect(() => {
    const t = setTimeout(() => void fetchOwners(ownerSearch), 300);
    return () => clearTimeout(t);
  }, [ownerSearch, fetchOwners]);

  const runAudit = async () => {
    const ownerId = selectedOwnerId.trim();
    if (!/^[a-f0-9]{24}$/i.test(ownerId)) {
      setError('Choisissez un propriétaire dans la liste déroulante');
      return;
    }
    setLoading(true);
    setError(null);
    setFixedKeys(new Set());
    setFixFeedback({});
    setBatchSummary(null);
    setGlobalFilter('');
    setSelectedListings([]);
    setQuickFilters({ arrToday: false, depToday: false, arr7days: false, dep7days: false });
    try {
      const res = await apiClient.post(
        '/api/monitoring/reservation-sync/audit',
        { ownerId, createdSinceDays, arrivalWithinDays, limit },
        { timeout: 120000 },
      );
      if (!res.data?.success) throw new Error(res.data?.error || 'Audit échoué');
      const payload = (res.data?.data ?? res.data) as AuditResult;
      const enrichedIssues = await enrichAuditIssues(payload.issues ?? []);
      setResult({ ...payload, issues: enrichedIssues });
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { error?: string; message?: string } };
        message?: string;
      };
      const body = e.response?.data;
      setError(body?.message || body?.error || e.message || 'Erreur audit');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const issueKey = (row: SyncIssue) => `${row.reservationId}-${row.code}`;

  const runFix = async (row: SyncIssue) => {
    const key = issueKey(row);
    setFixingKey(key);
    setFixFeedback((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    try {
      const res = await apiClient.post(
        '/api/monitoring/reservation-sync/fix',
        { reservationId: row.reservationId, code: row.code },
        { timeout: 60000, validateStatus: () => true },
      );
      const payload = res.data?.data ?? res.data;
      if (res.data?.success && payload?.success !== false) {
        setFixedKeys((prev) => new Set(prev).add(key));
        setFixFeedback((prev) => ({
          ...prev,
          [key]: { ok: true, text: payload?.action || 'Corrigé' },
        }));
      } else {
        setFixFeedback((prev) => ({
          ...prev,
          [key]: { ok: false, text: formatFixError(payload ?? res.data ?? {}) },
        }));
      }
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { data?: { error?: string; message?: string }; error?: string } };
        message?: string;
      };
      const body = e.response?.data?.data ?? e.response?.data;
      setFixFeedback((prev) => ({
        ...prev,
        [key]: {
          ok: false,
          text: formatFixError(body ?? { message: e.message }),
        },
      }));
    } finally {
      setFixingKey(null);
    }
  };

  const applyFixResults = (
    results: Array<{
      reservationId: string;
      code: string;
      success: boolean;
      action?: string;
      error?: string;
      message?: string;
    }>,
  ) => {
    if (!Array.isArray(results) || results.length === 0) return;
    setFixedKeys((prev) => {
      const next = new Set(prev);
      for (const r of results) {
        if (r.success) next.add(`${r.reservationId}-${r.code}`);
      }
      return next;
    });
    setFixFeedback((prev) => {
      const next = { ...prev };
      for (const r of results) {
        const key = `${r.reservationId}-${r.code}`;
        next[key] = {
          ok: r.success,
          text: r.success ? r.action || 'Corrigé' : r.error || r.message || 'Échec',
        };
      }
      return next;
    });
  };

  const runFixAll = async (targetIssues: SyncIssue[]) => {
    const fixable = targetIssues.filter((i) => i.code !== 'RESERVATION_UNREACHABLE');
    if (fixable.length === 0) return;
    setBatchFixing(true);
    setBatchSummary(null);
    setError(null);
    try {
      const res = await apiClient.post(
        '/api/monitoring/reservation-sync/fix-batch',
        { items: fixable.map((i) => ({ reservationId: i.reservationId, code: i.code })) },
        { timeout: 180000 },
      );
      if (!res.data?.success) throw new Error(res.data?.error || 'Correction batch échouée');
      const data = res.data.data;
      applyFixResults(data?.results ?? []);
      setBatchSummary({
        total: data?.total ?? fixable.length,
        fixed: data?.fixed ?? 0,
        failed: data?.failed ?? 0,
        durationMs: data?.durationMs,
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      setError(e.response?.data?.error || e.message || 'Erreur correction batch');
    } finally {
      setBatchFixing(false);
    }
  };

  const rawIssues = useMemo(
    () => (result?.issues || []).filter((i) => !fixedKeys.has(issueKey(i))),
    [result?.issues, fixedKeys],
  );

  const availableListings = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rawIssues) {
      if (row.listingId && row.listingName) map.set(row.listingId, row.listingName);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawIssues]);

  const { today, next7 } = useMemo(() => {
    const t = moment().startOf('day');
    return { today: t, next7: t.clone().add(7, 'days').endOf('day') };
  }, []);

  const filterCounts = useMemo(() => {
    const counts = { arrToday: 0, depToday: 0, arr7days: 0, dep7days: 0 };
    for (const r of rawIssues) {
      if (r.arrivalDate) {
        const arr = moment(r.arrivalDate);
        if (arr.isSame(today, 'day')) counts.arrToday += 1;
        if (arr.isBetween(today, next7, 'day', '[]')) counts.arr7days += 1;
      }
      if (r.departureDate) {
        const dep = moment(r.departureDate);
        if (dep.isSame(today, 'day')) counts.depToday += 1;
        if (dep.isBetween(today, next7, 'day', '[]')) counts.dep7days += 1;
      }
    }
    return counts;
  }, [rawIssues, today, next7]);

  const issues = useMemo(() => {
    let f = rawIssues;
    if (globalFilter.trim()) {
      const s = globalFilter.toLowerCase();
      f = f.filter(
        (r) =>
          r.reservationCode?.toLowerCase().includes(s) ||
          r.guestName?.toLowerCase().includes(s) ||
          r.listingName?.toLowerCase().includes(s) ||
          r.message?.toLowerCase().includes(s),
      );
    }
    if (codeFilter !== 'all') f = f.filter((r) => r.code === codeFilter);
    if (statusFilter !== 'all') {
      f = f.filter(
        (r) => String(r.reservationStatus ?? '').toLowerCase() === statusFilter.toLowerCase(),
      );
    }
    if (selectedListings.length > 0) {
      f = f.filter((r) => r.listingId && selectedListings.includes(r.listingId));
    }
    if (quickFilters.arrToday) {
      f = f.filter((r) => r.arrivalDate && moment(r.arrivalDate).isSame(today, 'day'));
    }
    if (quickFilters.depToday) {
      f = f.filter((r) => r.departureDate && moment(r.departureDate).isSame(today, 'day'));
    }
    if (quickFilters.arr7days) {
      f = f.filter((r) => r.arrivalDate && moment(r.arrivalDate).isBetween(today, next7, 'day', '[]'));
    }
    if (quickFilters.dep7days) {
      f = f.filter((r) => r.departureDate && moment(r.departureDate).isBetween(today, next7, 'day', '[]'));
    }
    return f;
  }, [rawIssues, globalFilter, codeFilter, statusFilter, selectedListings, quickFilters, today, next7]);

  const statusOptions = useMemo(() => {
    const fromSummary = result?.summary?.reservationsByStatus ?? {};
    const fromIssues: Record<string, number> = {};
    for (const row of rawIssues) {
      const st = String(row.reservationStatus ?? 'Unknown');
      fromIssues[st] = (fromIssues[st] ?? 0) + 1;
    }
    const merged = { ...fromSummary, ...fromIssues };
    return Object.entries(merged).sort((a, b) => b[1] - a[1]);
  }, [result?.summary?.reservationsByStatus, rawIssues]);

  const toggleQuick = (k: keyof typeof quickFilters) => {
    startTransition(() => {
      setQuickFilters((prev) => ({ ...prev, [k]: !prev[k] }));
    });
  };

  const summary = result?.summary;
  const issueCount = summary?.issues ?? 0;
  const remainingCount = Math.max(0, issueCount - fixedKeys.size);
  const kpiAccent = remainingCount === 0 ? T.success : remainingCount > 5 ? T.error : T.warning;
  const fixableCount = issues.filter((i) => i.code !== 'RESERVATION_UNREACHABLE').length;
  const fixAllLabel =
    codeFilter === 'all'
      ? `Corriger tout (${fixableCount})`
      : `Corriger tout — ${ISSUE_LABELS[codeFilter] || codeFilter} (${fixableCount})`;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, mx: 'auto' }}>
      <Typography sx={{ fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: '-0.02em' }}>
        Sync réservations
      </Typography>
      <Typography sx={{ mt: 0.5, fontSize: 13, color: T.text2 }}>
        Vérifie toutes les réservations (Confirmé, Pending, Completed, annulées…) et détecte les
        artefacts orphelins dans fulltask (plan), fullchatbot (whitelist) et calendar.
      </Typography>

      {/* Audit controls */}
      <Paper sx={{ mt: 2, p: 2, border: `1px solid ${T.border}`, borderRadius: 1.5, bgcolor: T.bg1 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Filtrer owners…"
            value={ownerSearch}
            onChange={(e) => setOwnerSearch(e.target.value)}
            sx={{ minWidth: 160, flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 260, flex: 2 }}>
            <Select
              displayEmpty
              value={selectedOwnerId}
              onChange={(e) => setSelectedOwnerId(e.target.value)}
              disabled={ownersLoading}
            >
              <MenuItem value="">— Choisir un propriétaire —</MenuItem>
              {owners.map((o) => {
                const id = resolveOwnerId(o);
                if (!id) return null;
                return (
                  <MenuItem key={id} value={id}>
                    {ownerLabel(o)}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          <TextField
            size="small"
            type="number"
            label="Créées (j)"
            value={createdSinceDays}
            onChange={(e) => setCreatedSinceDays(Number(e.target.value) || 14)}
            sx={{ width: 110 }}
          />
          <TextField
            size="small"
            type="number"
            label="Arrivée (j)"
            value={arrivalWithinDays}
            onChange={(e) => setArrivalWithinDays(Number(e.target.value) || 60)}
            sx={{ width: 110 }}
          />
          <TextField
            size="small"
            type="number"
            label="Limite"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value) || 200)}
            sx={{ width: 90 }}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <PlayIcon />}
            disabled={loading || !selectedOwnerId}
            onClick={() => void runAudit()}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: T.primary,
              '&:hover': { bgcolor: T.primaryDeep },
              alignSelf: 'center',
            }}
          >
            Lancer l&apos;audit
          </Button>
        </Stack>
        {error ? (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {error}
          </Alert>
        ) : null}
      </Paper>

      {summary ? (
        <>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
            <KpiCard
              label="Résas fenêtre"
              value={summary.reservationsInWindow ?? summary.scanned}
              sub={Object.entries(summary.reservationsByStatus ?? {})
                .slice(0, 4)
                .map(([st, n]) => `${st}: ${n}`)
                .join(' · ')}
            />
            <KpiCard label="Plans actifs" value={summary.plansActive} />
            <KpiCard label="Whitelist" value={summary.whitelistRows} />
            <KpiCard
              label="Anomalies"
              value={remainingCount}
              accent={kpiAccent}
              sub={
                fixedKeys.size > 0
                  ? `${fixedKeys.size} corrigée(s) · ${result?.durationMs ? `${Math.round(result.durationMs / 1000)}s` : ''}`
                  : result?.durationMs
                    ? `${Math.round(result.durationMs / 1000)}s`
                    : undefined
              }
            />
          </Stack>

          {remainingCount === 0 ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              {issueCount === 0
                ? 'Aucune anomalie détectée sur la fenêtre sélectionnée.'
                : 'Toutes les anomalies affichées ont été corrigées.'}
            </Alert>
          ) : (
            <>
              {/* Toolbar — même logique que /reservations */}
              <Paper sx={{ mt: 2, p: 1.5, border: `1px solid ${T.border}`, borderRadius: 1.5, bgcolor: T.bg1 }}>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    placeholder="Rechercher voyageur, propriété, n° résa…"
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ fontSize: 18, color: T.text3 }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                    sx={{ flex: 1, minWidth: 200, maxWidth: 340 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <Select
                      multiple
                      displayEmpty
                      value={selectedListings}
                      onChange={(e) => setSelectedListings(e.target.value as string[])}
                      renderValue={(s) => `Propriété · ${(s as string[]).length || 'toutes'}`}
                    >
                      {availableListings.map((lst) => (
                        <MenuItem key={lst.id} value={lst.id}>
                          <Checkbox checked={selectedListings.indexOf(lst.id) > -1} size="small" />
                          <ListItemText primary={lst.name} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <Select
                      displayEmpty
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="all">Statut · tous</MenuItem>
                      {statusOptions.map(([st, n]) => (
                        <MenuItem key={st} value={st}>
                          {st} ({n})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <Select
                      displayEmpty
                      value={codeFilter}
                      onChange={(e) => setCodeFilter(e.target.value)}
                    >
                      <MenuItem value="all">Anomalie · toutes</MenuItem>
                      {Object.entries(ISSUE_LABELS).map(([code, label]) => (
                        <MenuItem key={code} value={code}>
                          {label} ({summary.byCode?.[code] ?? 0})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  {fixableCount > 0 ? (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={batchFixing ? <CircularProgress size={14} color="inherit" /> : <WrenchIcon />}
                      disabled={batchFixing || loading || fixingKey != null}
                      onClick={() => void runFixAll(issues)}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        bgcolor: T.success,
                        '&:hover': { bgcolor: '#087a4f' },
                      }}
                    >
                      {fixAllLabel}
                    </Button>
                  ) : null}
                </Stack>
                <Stack direction="row" spacing={0.75} sx={{ mt: 1.25, flexWrap: 'wrap', gap: 0.75 }}>
                  <Pill label="Arr. auj." count={filterCounts.arrToday} active={quickFilters.arrToday} onClick={() => toggleQuick('arrToday')} color={T.info} />
                  <Pill label="Dép. auj." count={filterCounts.depToday} active={quickFilters.depToday} onClick={() => toggleQuick('depToday')} color={T.warning} />
                  <Pill label="Arr. 7 jours" count={filterCounts.arr7days} active={quickFilters.arr7days} onClick={() => toggleQuick('arr7days')} color={T.primary} />
                  <Pill label="Dép. 7 jours" count={filterCounts.dep7days} active={quickFilters.dep7days} onClick={() => toggleQuick('dep7days')} color={T.error} />
                  <Typography sx={{ fontSize: 12, color: T.text3, alignSelf: 'center', ml: 1 }}>
                    {issues.length} ligne(s) affichée(s)
                  </Typography>
                </Stack>
              </Paper>

              {batchSummary ? (
                <Alert
                  severity={batchSummary.failed === 0 ? 'success' : 'warning'}
                  sx={{ mt: 1.5 }}
                >
                  Batch : {batchSummary.fixed}/{batchSummary.total} corrigée(s)
                  {batchSummary.failed > 0 ? ` · ${batchSummary.failed} échec(s)` : ''}
                  {batchSummary.durationMs ? ` · ${Math.round(batchSummary.durationMs / 1000)}s` : ''}
                </Alert>
              ) : null}

              <Paper sx={{ mt: 1.5, border: `1px solid ${T.border}`, borderRadius: 1.5, overflow: 'hidden' }}>
                <Box sx={{ overflowX: 'auto' }}>
                  <Box
                    component="table"
                    sx={{ width: '100%', minWidth: 1400, borderCollapse: 'collapse', fontSize: 12.5 }}
                  >
                    <Box component="thead">
                      <Box component="tr" sx={{ bgcolor: T.bg2 }}>
                        {[
                          'Réservation',
                          'Anomalie',
                          'Propriété',
                          'Voyageur',
                          'Créé',
                          'Check-in',
                          'Check-out',
                          'Statut',
                          'Message',
                          'Action',
                        ].map((h) => (
                          <Box
                            component="th"
                            key={h}
                            sx={{
                              textAlign: 'left',
                              px: 1.5,
                              py: 1.25,
                              fontSize: 10.75,
                              fontWeight: 700,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              color: T.text3,
                              borderBottom: `1px solid ${T.border}`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {h}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    <Box component="tbody">
                      {issues.map((row) => {
                        const key = issueKey(row);
                        const isFixing = fixingKey === key;
                        const feedback = fixFeedback[key];
                        const canFix = row.code !== 'RESERVATION_UNREACHABLE';
                        const sev = SEVERITY_META[row.severity] || SEVERITY_META.low;
                        const st = statusMeta(row.reservationStatus);
                        const created = fmtDateTime(row.createdAt);
                        return (
                          <Box
                            component="tr"
                            key={key}
                            sx={{
                              transition: 'background-color 100ms ease',
                              '&:hover': { bgcolor: T.bg2 },
                              '& > td': {
                                borderBottom: `1px solid ${T.border}`,
                                px: 1.5,
                                py: 1.25,
                                verticalAlign: 'middle',
                              },
                            }}
                          >
                            <Box component="td">
                              <Typography
                                onClick={() => navigate(`/reservations/${row.reservationId}`)}
                                sx={{
                                  fontFamily: '"Geist Mono", monospace',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: T.primaryDeep,
                                  cursor: 'pointer',
                                  '&:hover': { textDecoration: 'underline' },
                                }}
                              >
                                {row.reservationCode || '—'}
                              </Typography>
                              <Typography sx={{ fontSize: 10, color: T.text4, fontFamily: 'monospace' }}>
                                {row.reservationId.slice(-8)}
                              </Typography>
                            </Box>
                            <Box component="td">
                              <Stack spacing={0.5}>
                                <Chip
                                  label={ISSUE_LABELS[row.code] || row.code}
                                  size="small"
                                  sx={{ fontWeight: 600, fontSize: 10.5, height: 22, maxWidth: 180 }}
                                />
                                <Chip
                                  label={row.severity}
                                  size="small"
                                  sx={{
                                    bgcolor: sev.bg,
                                    color: sev.color,
                                    fontWeight: 600,
                                    fontSize: 10,
                                    height: 20,
                                    width: 'fit-content',
                                  }}
                                />
                              </Stack>
                            </Box>
                            <Box component="td">
                              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: T.text, maxWidth: 180 }}>
                                {row.listingName || '—'}
                              </Typography>
                            </Box>
                            <Box component="td">
                              <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: T.text }}>
                                {row.guestName || '—'}
                              </Typography>
                            </Box>
                            <Box component="td">
                              <Typography sx={{ fontSize: 12, color: T.text2 }}>{created.date}</Typography>
                              {created.time ? (
                                <Typography sx={{ fontSize: 10.5, color: T.text4 }}>{created.time}</Typography>
                              ) : null}
                            </Box>
                            <Box component="td">
                              <Typography sx={{ fontSize: 12, color: T.text }}>{fmtDate(row.arrivalDate)}</Typography>
                              {row.arrivalDate ? (
                                <Typography sx={{ fontSize: 10.5, color: T.text4 }}>
                                  {formatTime(row.checkInTime) || '15:00'}
                                </Typography>
                              ) : null}
                            </Box>
                            <Box component="td">
                              <Typography sx={{ fontSize: 12, color: T.text }}>{fmtDate(row.departureDate)}</Typography>
                              {row.departureDate ? (
                                <Typography sx={{ fontSize: 10.5, color: T.text4 }}>
                                  {formatTime(row.checkOutTime) || '11:00'}
                                </Typography>
                              ) : null}
                            </Box>
                            <Box component="td">
                              <Chip
                                label={st.label}
                                size="small"
                                sx={{ bgcolor: st.bg, color: st.color, fontWeight: 600, fontSize: 11, height: 22 }}
                              />
                            </Box>
                            <Box component="td">
                              <Typography sx={{ fontSize: 12, color: T.text2, maxWidth: 220 }}>
                                {row.message}
                              </Typography>
                              <Typography sx={{ fontSize: 10, color: T.text4, mt: 0.25 }}>
                                {[
                                  row.planStatus && `plan=${row.planStatus}`,
                                  row.whitelistStatus && `wl=${row.whitelistStatus}`,
                                  row.calendarBlocked != null &&
                                    `cal=${row.calendarBlocked ? 'blocked' : 'free'}`,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Typography>
                            </Box>
                            <Box component="td">
                              {canFix ? (
                                <Stack spacing={0.5}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={
                                      isFixing ? (
                                        <CircularProgress size={12} />
                                      ) : (
                                        <WrenchIcon sx={{ fontSize: 14 }} />
                                      )
                                    }
                                    disabled={isFixing || loading || batchFixing}
                                    onClick={() => void runFix(row)}
                                    sx={{
                                      textTransform: 'none',
                                      fontSize: 11,
                                      fontWeight: 600,
                                      borderColor: T.primary,
                                      color: T.primaryDeep,
                                    }}
                                  >
                                    {FIX_LABELS[row.code] || 'Corriger'}
                                  </Button>
                                  {feedback ? (
                                    <Typography
                                      sx={{
                                        fontSize: 10.5,
                                        color: feedback.ok ? T.success : T.error,
                                      }}
                                    >
                                      {feedback.text}
                                    </Typography>
                                  ) : null}
                                </Stack>
                              ) : (
                                <Typography sx={{ fontSize: 11, color: T.text4 }}>—</Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
                {issues.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <WarningIcon sx={{ fontSize: 32, color: T.text4, mb: 1 }} />
                    <Typography sx={{ fontSize: 13, color: T.text3 }}>
                      Aucune anomalie ne correspond aux filtres actifs.
                    </Typography>
                  </Box>
                ) : null}
              </Paper>
            </>
          )}
        </>
      ) : !loading ? (
        <Paper
          sx={{
            mt: 3,
            p: 4,
            textAlign: 'center',
            border: `1px dashed ${T.border}`,
            borderRadius: 1.5,
            bgcolor: T.bg1,
          }}
        >
          <RefreshIcon sx={{ fontSize: 36, color: T.text4, mb: 1 }} />
          <Typography sx={{ fontSize: 13, color: T.text3 }}>
            Choisissez un propriétaire, puis lancez l&apos;audit.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: T.primary }} />
        </Box>
      )}
    </Box>
  );
}
