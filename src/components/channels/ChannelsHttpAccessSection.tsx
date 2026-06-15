/** Journal HTTP brut (Mongo logapis) — utilisé par Debug → HTTP. */
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { onChannelsRefresh } from '../../utils/channelsRefresh';
import { fetchChannelsHttpAccessLogs } from '../../services/channelsDashboardApi';
import { tokens as T } from '../dashboard/DashboardV2.components';

const LIMIT = 25;

function errMsg(e: unknown): string {
  const err = e as { response?: { data?: { error?: string } }; message?: string };
  return err.response?.data?.error || err.message || 'Erreur';
}

export function ChannelsHttpAccessSection() {
  const [searchParams] = useSearchParams();
  const hoursFromUrl = Number(searchParams.get('hours'));
  const [hours, setHours] = useState(
    Number.isFinite(hoursFromUrl) && hoursFromUrl > 0 ? hoursFromUrl : 72,
  );
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items?: unknown[]; pagination?: { total?: number } } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await fetchChannelsHttpAccessLogs({ hours, page, limit: LIMIT });
      if (!res?.success) {
        setError('Impossible de charger les logs HTTP');
        setData(null);
      } else setData(res.data);
    } catch (e) {
      setError(errMsg(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [hours, page]);

  useEffect(() => {
    const h = Number(searchParams.get('hours'));
    if (Number.isFinite(h) && h > 0 && h !== hours) setHours(h);
  }, [searchParams, hours]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => onChannelsRefresh(() => void load()), [load]);

  return (
    <div className="space-y-3">
      {error && (
        <div style={{ padding: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 4, color: '#B91C1C', fontSize: 13 }}>
          {error}
        </div>
      )}
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
        Journal HTTP srv-channels (Mongo <code className="font-mono">logapis</code>) — toutes requêtes reçues, hors{' '}
        <code className="font-mono">/</code> et <code className="font-mono">/health</code>. Distinct des appels RU
        catalogués (Pull/Push dans Debug).
      </div>
      {data && (
        <>
          <div className="flex justify-between text-xs bg-white border border-slate-200 rounded px-3 py-1.5 items-center">
            <span>{data.pagination?.total ?? '—'} entrées</span>
            <div className="flex gap-2">
              <button type="button" className="px-2 py-0.5 rounded border text-xs disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>←</button>
              <span className="text-slate-500">p.{page}</span>
              <button type="button" className="px-2 py-0.5 rounded border text-xs disabled:opacity-40" disabled={(data.items?.length || 0) < LIMIT} onClick={() => setPage((p) => p + 1)}>→</button>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="channels-table-scroll channels-table-unbounded">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="channels-sticky-thead">
                  <tr>
                    {['Date', 'Méthode', 'Chemin', 'Cat.', 'HTTP', 'ms', 'Snippet'].map((h) => (
                      <th key={h} className="text-left px-2 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.items as Record<string, unknown>[] || []).map((row) => (
                    <tr key={String(row._id)} className="border-t border-slate-100">
                      <td className="px-2 py-2 text-xs whitespace-nowrap">{row.createdAt ? new Date(String(row.createdAt)).toLocaleString() : '—'}</td>
                      <td className="px-2 py-2 text-xs font-mono">{String(row.method || '—')}</td>
                      <td className="px-2 py-2 text-xs font-mono break-all">{String(row.path || '—')}</td>
                      <td className="px-2 py-2 text-xs">{String(row.category || '—')}</td>
                      <td className="px-2 py-2 text-right text-xs">{String(row.statusCode ?? '—')}</td>
                      <td className="px-2 py-2 text-right text-xs">{row.durationMs != null ? String(row.durationMs) : '—'}</td>
                      <td className="px-2 py-2 text-xs">
                        <pre style={{ background: T.bg, color: T.text, padding: '6px 8px', borderRadius: 4, fontFamily: 'monospace', fontSize: 10, lineHeight: 1.3, overflow: 'auto', border: `1px solid ${T.border}`, maxHeight: 120 }} className="max-h-[120px] overflow-auto text-[10px]">
                          {row.snippetRequest ? String(row.snippetRequest).slice(0, 2000) : '—'}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {loading && !data && (
        <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: T.text3 }}>Chargement…</div>
      )}
    </div>
  );
}
