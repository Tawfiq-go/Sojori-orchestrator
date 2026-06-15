/** Volumes agrégés par owner ou par annonce — utilisé par Summary. */
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Home, UserRound } from 'lucide-react';
import { onChannelsRefresh } from '../../utils/channelsRefresh';
import { fetchBusinessListingStats, fetchBusinessOwnerStats } from '../../services/channelsDashboardApi';
import { formatCasablancaDate } from '../../utils/dateFormatting';
import { tokens as T } from '../dashboard/DashboardV2.components';

export type VolumesView = 'owner-vol' | 'listing';

function errMsg(e: unknown): string {
  const err = e as { response?: { data?: { error?: string } }; message?: string };
  return err.response?.data?.error || err.message || 'Erreur';
}

export function ChannelsVolumesSection({ view }: { view: VolumesView }) {
  const [searchParams] = useSearchParams();
  const hoursFromUrl = Number(searchParams.get('hours'));
  const [hours, setHours] = useState(
    Number.isFinite(hoursFromUrl) && hoursFromUrl > 0 ? hoursFromUrl : 72,
  );
  const [rows, setRows] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetcher = view === 'owner-vol' ? fetchBusinessOwnerStats : fetchBusinessListingStats;
      const { data } = await fetcher({ hours });
      if (!data?.success) {
        setError(data?.error || 'Impossible de charger les volumes');
        setRows([]);
      } else setRows(data.data?.items || []);
    } catch (e) {
      setError(errMsg(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [hours, view]);

  useEffect(() => {
    const h = Number(searchParams.get('hours'));
    if (Number.isFinite(h) && h > 0 && h !== hours) setHours(h);
  }, [searchParams, hours]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => onChannelsRefresh(() => void load()), [load]);

  const isOwner = view === 'owner-vol';

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800">
        {isOwner ? (
          <>
            <UserRound size={12} className="inline mr-1" />
            <strong>Volumes par owner</strong> — tous appels API agrégés par PM (résa, calendrier, messages…). Distinct du
            provisioning owner (Business → API → Owner).
          </>
        ) : (
          <>
            <Home size={12} className="inline mr-1" />
            <strong>Volumes par annonce</strong> — agrégats par listing. Distinct des appels RU propriété (Business → API →
            Propriétés).
          </>
        )}
      </div>
      {error && (
        <div style={{ padding: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, color: '#B91C1C', fontSize: 13 }}>
          {error}
        </div>
      )}
      {rows.length > 0 && (
        <div className="bg-white border rounded overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                {(isOwner
                  ? ['Owner', 'Total', 'Succès', 'Échecs', 'Taux', 'ms moy', 'Dernière activité', 'APIs']
                  : ['Listing', 'Owner', 'Total', 'Succès', 'Échecs', 'Taux', 'ms moy', 'Dernière activité', 'APIs']
                ).map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rows as Record<string, unknown>[]).map((row) => (
                <tr key={String(isOwner ? row.ownerId : row.listingId)} className="border-t border-slate-100">
                  {isOwner ? (
                    <td className="px-3 py-2">
                      <div className="font-medium">{String(row.ownerName)}</div>
                      <div className="text-[10px] font-mono text-slate-400">{String(row.ownerId || '').slice(-8)}</div>
                    </td>
                  ) : (
                    <>
                      <td className="px-3 py-2">
                        <div className="font-medium">{String(row.listingName)}</div>
                        <div className="text-[10px] font-mono text-slate-400">{String(row.listingId || '').slice(-8)}</div>
                      </td>
                      <td className="px-3 py-2">{String(row.ownerName || '—')}</td>
                    </>
                  )}
                  <td className="px-3 py-2 text-right font-semibold">{String(row.totalCalls)}</td>
                  <td className="px-3 py-2 text-right text-green-700">{String(row.successCount)}</td>
                  <td className="px-3 py-2 text-right text-red-600">{String(row.failedCount)}</td>
                  <td className="px-3 py-2 text-right">{String(row.successRate)}%</td>
                  <td className="px-3 py-2 text-right">{row.avgResponseTime != null ? String(row.avgResponseTime) : '—'}</td>
                  <td className="px-3 py-2">
                    {row.lastActivityAt ? formatCasablancaDate(String(row.lastActivityAt), 'dd/MM HH:mm') : '—'}
                  </td>
                  <td className="px-3 py-2 flex flex-wrap gap-1">
                    {((row.actions as string[]) || []).slice(0, isOwner ? 8 : 6).map((a) => (
                      <span key={a} style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: T.bg2 }}>
                        {a.replace(/^(Push_|Pull_|RU_REST_)/, '')}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && rows.length === 0 && !error && (
        <div className="text-sm text-slate-500 p-4 border rounded bg-white text-center">
          {isOwner ? 'Aucun appel API avec owner identifié.' : 'Aucun appel API avec listing identifié.'}
        </div>
      )}
      {loading && rows.length === 0 && (
        <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: T.text3 }}>Chargement…</div>
      )}
    </div>
  );
}
