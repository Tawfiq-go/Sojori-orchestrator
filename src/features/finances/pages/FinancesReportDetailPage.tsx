import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../../../components/DashboardWrapper';
import { FinancesModule, useFinancesAccess } from '../FinancesModule';
import { getProfitReport, profitReportHtmlUrl, publishProfitReport } from '../financesApi';
import apiClient from '../../../services/apiClient';
import type { ProfitReport } from '../types';
import { formatPeriod, formatShortDate, paidByLabel } from '../utils/format';

export function FinancesReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canWrite, isLandlord } = useFinancesAccess();
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const row = await getProfitReport(id);
      setReport(row);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Rapport introuvable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const onPublish = async () => {
    if (!id) return;
    setPublishing(true);
    try {
      const updated = await publishProfitReport(id);
      setReport(updated);
      toast.success('Rapport publié');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Publication impossible');
    } finally {
      setPublishing(false);
    }
  };

  const openHtml = async () => {
    if (!id) return;
    try {
      const { data } = await apiClient.get<string>(profitReportHtmlUrl(id), {
        responseType: 'text',
        transformResponse: [(r) => r],
      });
      const blob = new Blob([data], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Impossible d’ouvrir le HTML');
    }
  };

  if (loading) {
    return (
      <DashboardWrapper breadcrumb={['Finances', 'Rapports P&L', '…']}>
        <FinancesModule>
          <div className="empty">
            <div className="spinner" />
          </div>
        </FinancesModule>
      </DashboardWrapper>
    );
  }

  if (!report) {
    return (
      <DashboardWrapper breadcrumb={['Finances', 'Rapports P&L']}>
        <FinancesModule>
          <div className="empty">
            <div className="t">Rapport introuvable</div>
            <Link className="btn btn-ghost" to="/finances/reports">
              ← Retour
            </Link>
          </div>
        </FinancesModule>
      </DashboardWrapper>
    );
  }

  const metrics = report.snapshot?.metrics ?? [];
  const reservations = report.snapshot?.reservations ?? [];
  const ledgerLines = [...(report.snapshot?.expenses ?? []), ...(report.snapshot?.extras ?? [])];
  const net = report.snapshot?.grandTotal ?? metrics.find((m) => m.key === 'net_to_landlord')?.value ?? 0;
  const isDraft = report.status === 'draft';

  return (
    <DashboardWrapper breadcrumb={['Finances', 'Rapports P&L', report.name]}>
      <FinancesModule>
        <button type="button" className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={() => navigate('/finances/reports')}>
          ← Retour aux rapports
        </button>

        <div className="ph" style={{ alignItems: 'center' }}>
          <div>
            <div className="eyebrow">
              Finances · /finances/reports/{report._id}
            </div>
            <h1>{report.name}</h1>
            <p className="sub">
              {formatPeriod(report.periodStart, report.periodEnd)} · {report.listingIds?.length ?? 0} listing(s) · {report.currency || 'MAD'}
            </p>
          </div>
          <div className="ph-actions">
            <span className={`bdg ${isDraft ? 'gold' : 'green'} lg`} style={{ marginRight: 4 }}>
              <span className="dot" />
              {isDraft ? 'Brouillon' : 'Publié'}
            </span>
            {canWrite && isDraft && (
              <button type="button" className="btn btn-su pm-only" disabled={publishing} onClick={() => void onPublish()}>
                Publier ✓
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={openHtml}>
              ↗ Voir HTML
            </button>
            <button type="button" className="btn btn-dark" onClick={openHtml}>
              🖨 Imprimer / PDF
            </button>
          </div>
        </div>

        {!isDraft && report.publishedAt && (
          <div className="inote info" style={{ marginBottom: 18 }}>
            <span className="i">🔒</span>
            <div>
              Rapport <b>publié le {formatShortDate(report.publishedAt)}</b>
              {isLandlord ? '' : ' par le PM'}. Les montants sont figés (snapshot).
            </div>
          </div>
        )}

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="kpi green">
            <div className="k">★ Net propriétaire</div>
            <div className="v">
              {Number(net).toLocaleString('fr-FR')} <small>{report.currency || 'MAD'}</small>
            </div>
          </div>
          <div className="kpi">
            <div className="k">🏠 Réservations</div>
            <div className="v">{reservations.length}</div>
          </div>
          <div className="kpi rose">
            <div className="k">💸 Lignes ledger</div>
            <div className="v">{ledgerLines.length}</div>
          </div>
        </div>

        <div className="rp-cols">
          <div className="card">
            <div className="card-h">
              <span className="ct">Synthèse P&amp;L</span>
            </div>
            <div className="card-b" style={{ padding: '8px 18px' }}>
              <div className="pl-lines">
                {metrics.map((m) => (
                  <div key={m.key} className={`pl-line ${m.value >= 0 ? 'plus' : 'minus'}`}>
                    <span className="lbl">{m.label}</span>
                    <span className="v">
                      {m.value >= 0 ? '+' : ''}
                      {Number(m.value).toLocaleString('fr-FR')} {report.currency || 'MAD'}
                    </span>
                  </div>
                ))}
                <div className="pl-line net">
                  <span className="lbl">Net propriétaire</span>
                  <span className="v">
                    {Number(net).toLocaleString('fr-FR')} {report.currency || 'MAD'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {reservations.length > 0 && (
          <div className="card">
            <div className="card-h">
              <span className="ct">Détail des réservations</span>
              <span className="sub">{reservations.length} séjours</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Réf.</th>
                  <th>Voyageur</th>
                  <th>Canal</th>
                  <th className="num">Nuits</th>
                  <th className="num">Brut</th>
                  <th className="num">Net</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r, i) => (
                  <tr key={String(r.reservationId || i)}>
                    <td className="mono">{String(r.reservationNumber || '—')}</td>
                    <td className="cell-main">{String(r.guestName || '—')}</td>
                    <td>{String(r.channelName || '—')}</td>
                    <td className="num">{String(r.nights ?? '—')}</td>
                    <td className="num mono">{Number(r.grossRevenue || 0).toLocaleString('fr-FR')}</td>
                    <td className="num amt">{Number(r.netRevenue || 0).toLocaleString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {ledgerLines.length > 0 && (
          <div className="card">
            <div className="card-h">
              <span className="ct">Dépenses &amp; extras de la période</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Libellé</th>
                  <th>Type</th>
                  <th>Payé par</th>
                  <th className="num">Montant</th>
                </tr>
              </thead>
              <tbody>
                {ledgerLines.map((line, i) => {
                  const isExtra = line.type === 'extra';
                  return (
                    <tr key={String(line.expenseId || i)}>
                      <td className="mono">{formatShortDate(String(line.date || ''))}</td>
                      <td className="cell-main">{String(line.name || '—')}</td>
                      <td>
                        <span className={`bdg ${isExtra ? 'green' : 'rose'}`}>{isExtra ? 'Extra' : 'Dépense'}</span>
                      </td>
                      <td>{paidByLabel(String(line.paidBy || ''))}</td>
                      <td className={`num amt ${isExtra ? 'pos' : 'neg'}`}>
                        {isExtra ? '+' : '−'}
                        {Number(line.amount || 0).toLocaleString('fr-FR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </FinancesModule>
    </DashboardWrapper>
  );
}

export default FinancesReportDetailPage;
