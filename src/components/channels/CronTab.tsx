/**
 * CronTab.tsx
 * Onglet Cron - Gestion des jobs planifiés
 * Migré depuis sojori-dashboard ChannelsHubPage (tab=Cron)
 */

import { useState, useEffect } from 'react';
import { tokens as T } from '../dashboard/DashboardV2.components';
import { onChannelsRefresh } from '../../utils/channelsRefresh';
import { fetchChannelsCronJobs, patchChannelsCronJob } from '../../services/channelsDashboardApi';

type CronJob = {
  id: string;
  label: string;
  enabled: boolean;
  schedule: string;
  description?: string;
  apisCalled?: string[];
  lastTickFinishedAt?: string | null;
  lastError?: string | null;
};

function parseCronJobsResponse(result: unknown): CronJob[] {
  if (!result || typeof result !== 'object') return [];
  const root = result as { success?: boolean; data?: unknown };
  if (!root.success) return [];
  const payload = root.data;
  const raw = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { jobs?: unknown }).jobs)
      ? (payload as { jobs: unknown[] }).jobs
      : [];
  return raw.map((row) => {
    const j = row as Record<string, unknown>;
    return {
      id: String(j.id ?? j._id ?? ''),
      label: String(j.label ?? j.name ?? j.id ?? '—'),
      description: typeof j.description === 'string' ? j.description : undefined,
      schedule: String(j.scheduleExpression ?? j.schedule ?? '—'),
      enabled: Boolean(j.effectiveEnabled ?? j.enabled),
      apisCalled: Array.isArray(j.apisCalled) ? (j.apisCalled as string[]) : undefined,
      lastTickFinishedAt:
        typeof j.lastTickFinishedAt === 'string' ? j.lastTickFinishedAt : null,
      lastError: typeof j.lastError === 'string' ? j.lastError : null,
    };
  });
}

export function CronTab() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => onChannelsRefresh(() => void loadJobs()), []);

  const loadJobs = async () => {
    setLoading(true);
    console.log('[CronTab] 🔄 Loading cron jobs...');
    try {
      const { data: result } = await fetchChannelsCronJobs();
      setJobs(parseCronJobsResponse(result));
    } catch (error) {
      console.error('[CronTab] ❌ Error:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleJob = async (jobId: string, currentlyEnabled: boolean) => {
    console.log('[CronTab] 🔄 Toggling job:', jobId, 'to', !currentlyEnabled);
    try {
      const { data: result } = await patchChannelsCronJob(jobId, { enabled: !currentlyEnabled });
      if (result?.success) {
        const updated = parseCronJobsResponse(result);
        if (updated.length > 0) {
          setJobs(updated);
        } else {
          setJobs((prev) =>
            prev.map((job) => (job.id === jobId ? { ...job, enabled: !currentlyEnabled } : job)),
          );
        }
      }
    } catch (error) {
      console.error('[CronTab] ❌ Error toggling job:', error);
      alert('Erreur lors du toggle du job');
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 leading-relaxed">
        <strong>Cron srv-channels</strong> — jobs planifiés côté canaux RU (complément des webhooks temps réel).
        Activer / désactiver ici surcharge le défaut env (Mongo). Les exécutions apparaissent aussi dans Summary
        (bloc « API via Cron ») et dans Debug.
      </div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          padding: '10px 12px',
          background: T.bg2,
          borderRadius: 6,
        }}
      >
        <div style={{ fontSize: 12, color: T.text3 }}>
          <span style={{ fontWeight: 700, color: T.text }}>
            {jobs.length} job{jobs.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={loadJobs}
          disabled={loading}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: 0,
            background: T.primary,
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          {loading ? 'Chargement...' : '🔄 Actualiser'}
        </button>
      </div>

      {/* Jobs List */}
      <div
        style={{
          overflow: 'auto',
          border: `1px solid ${T.border}`,
          borderRadius: 8,
        }}
      >
        {loading && (
          <div style={{ padding: 40, textAlign: 'center', color: T.text3 }}>Chargement...</div>
        )}

        {!loading && jobs.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: T.text3 }}>
            Aucun job cron trouvé
          </div>
        )}

        {!loading && jobs.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: T.bg2 }}>
                <th
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                  }}
                >
                  Nom
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                  }}
                >
                  Schedule
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                  }}
                >
                  Statut
                </th>
                <th
                  style={{
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.text3,
                    borderBottom: `2px solid ${T.border}`,
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  style={{
                    borderBottom: `1px solid ${T.border}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = T.bg2;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                      {job.label}
                    </div>
                    {job.description && (
                      <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>
                        {job.description}
                      </div>
                    )}
                    {job.lastTickFinishedAt && (
                      <div style={{ fontSize: 10, color: T.text3, marginTop: 4 }}>
                        Dernier run : {new Date(job.lastTickFinishedAt).toLocaleString('fr-FR')}
                        {job.lastError ? ` — erreur : ${job.lastError}` : ''}
                      </div>
                    )}
                  </td>
                  <td
                    style={{
                      padding: '10px 14px',
                      fontSize: 12,
                      color: T.text2,
                      fontFamily: '"Geist Mono", monospace',
                    }}
                  >
                    {job.schedule}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 4,
                        background: job.enabled ? '#ECFDF5' : '#F3F4F6',
                        color: job.enabled ? '#065F46' : '#6B7280',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {job.enabled ? '✓ Activé' : '⊗ Désactivé'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button
                      onClick={() => toggleJob(job.id, job.enabled)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: `1px solid ${T.border}`,
                        background: T.bg1,
                        color: T.text,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {job.enabled ? 'Désactiver' : 'Activer'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
