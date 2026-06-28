import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../../../components/DashboardWrapper';
import { FinancesModule, useFinancesAccess } from '../FinancesModule';
import { getLandlordById } from '../landlordApi';
import {
  fetchProfitReportReservations,
  fetchProfitReportHtml,
  fetchDefaultPmReportHeader,
  getProfitReport,
  patchProfitReportColumnConfig,
  patchProfitReportHeader,
  publishProfitReport,
} from '../financesApi';
import { getOneListing } from '../../listing/services/serverApi.listing';
import { ReportColumnConfigPanel } from '../components/ReportColumnConfigPanel';
import { ReportHeaderSection } from '../components/ReportHeaderSection';
import { useFinancesOwnerScope } from '../useFinancesOwnerScope';
import type { ProfitReport } from '../types';
import { contractBadge, formatPeriod, formatShortDate } from '../utils/format';
import type { LandlordContract } from '../types';
import {
  defaultProfitReportColumnConfig,
  formatProfitReportCell,
  ledgerCellValue,
  ledgerDisplayColumnKeys,
  normalizeColumnConfig,
  PROFIT_REPORT_LEDGER_COLUMNS,
  PROFIT_REPORT_RESERVATION_COLUMNS,
  type ProfitColumnType,
} from '../utils/profitReportColumns';
import { resolveProfitMetricHint } from '../utils/profitMetricHints';
import {
  profitLandlordFlowMetrics,
  profitPmFlowMetrics,
  resolveProfitReportTotals,
} from '../utils/profitReportTotals';
import { openProfitReportHtmlTab, printProfitReportHtml } from '../utils/profitReportPrint';
import { normalizeProfitReportHeader } from '../utils/profitReportHeader';
import type { ProfitReportHeader } from '../types';

const EMPTY_SNAPSHOT_RESERVATIONS: Array<Record<string, unknown>> = [];

export function FinancesReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canWrite, isLandlord } = useFinancesAccess();
  const { ownerId } = useFinancesOwnerScope();
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [savingCols, setSavingCols] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  const [loadingHeaderDefault, setLoadingHeaderDefault] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [columnDraft, setColumnDraft] = useState(normalizeColumnConfig());
  const [headerDraft, setHeaderDraft] = useState<ProfitReportHeader>(normalizeProfitReportHeader());
  const [listingLabels, setListingLabels] = useState<Record<string, string>>({});
  const [reservationOverlay, setReservationOverlay] = useState<Record<string, Record<string, unknown>>>({});
  const [liveContract, setLiveContract] = useState<LandlordContract | undefined>();
  const [htmlLoading, setHtmlLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const row = await getProfitReport(id, { ownerId });
      setReport(row);
      setColumnDraft(normalizeColumnConfig(row?.snapshot?.columnConfig));
      setHeaderDraft(normalizeProfitReportHeader(row?.snapshot?.header));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Rapport introuvable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id, ownerId]);

  const onPublish = async () => {
    if (!id) return;
    setPublishing(true);
    try {
      const updated = await publishProfitReport(id, { ownerId });
      setReport(updated);
      toast.success('Rapport publié');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Publication impossible');
    } finally {
      setPublishing(false);
    }
  };

  const onSaveColumns = async () => {
    if (!id) return;
    setSavingCols(true);
    try {
      const updated = await patchProfitReportColumnConfig(id, columnDraft, { ownerId });
      setReport(updated);
      setConfigOpen(false);
      toast.success('Colonnes enregistrées');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setSavingCols(false);
    }
  };

  const onLoadHeaderDefault = async () => {
    setLoadingHeaderDefault(true);
    try {
      const defaults = await fetchDefaultPmReportHeader({ ownerId });
      if (!defaults) {
        toast.warn('Profil PM introuvable — complétez la fiche propriétaire');
        return;
      }
      setHeaderDraft(normalizeProfitReportHeader(defaults));
      toast.info('En-tête chargé depuis le profil PM');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement profil PM impossible');
    } finally {
      setLoadingHeaderDefault(false);
    }
  };

  const onSaveHeader = async () => {
    if (!id) return;
    setSavingHeader(true);
    try {
      const updated = await patchProfitReportHeader(id, headerDraft, { ownerId });
      setReport(updated);
      setHeaderDraft(normalizeProfitReportHeader(updated?.snapshot?.header));
      toast.success('En-tête enregistré');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement en-tête impossible');
    } finally {
      setSavingHeader(false);
    }
  };

  const openHtml = async () => {
    if (!id || htmlLoading) return;
    setHtmlLoading(true);
    try {
      const html = await fetchProfitReportHtml(id, { ownerId });
      await openProfitReportHtmlTab(html);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Impossible d’ouvrir le HTML');
    } finally {
      setHtmlLoading(false);
    }
  };

  const printReport = async () => {
    if (!id || printLoading) return;
    setPrintLoading(true);
    try {
      const html = await fetchProfitReportHtml(id, { ownerId });
      await printProfitReportHtml(html);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Impossible d’imprimer le rapport');
    } finally {
      setPrintLoading(false);
    }
  };

  const currency = report?.snapshot?.currency || report?.currency || 'MAD';
  const snapshotReservations = useMemo(
    () => report?.snapshot?.reservations ?? EMPTY_SNAPSHOT_RESERVATIONS,
    [report?.snapshot?.reservations],
  );
  const reportListingIdsKey = report?.listingIds?.join(',') ?? '';

  useEffect(() => {
    if (!report?._id || !ownerId || !report.periodStart || !report.periodEnd) {
      setReservationOverlay((prev) => (Object.keys(prev).length ? {} : prev));
      return;
    }
    let cancelled = false;
    void fetchProfitReportReservations({
      ownerId,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      listingIds: report.listingIds,
    })
      .then((rows) => {
        if (cancelled) return;
        const next: Record<string, Record<string, unknown>> = {};
        for (const row of rows) {
          const rid = String(row.reservationId || '');
          const num = String(row.reservationNumber || '');
          if (rid) next[rid] = row;
          if (num) next[`num:${num}`] = row;
        }
        setReservationOverlay(next);
      })
      .catch(() => {
        if (!cancelled) setReservationOverlay({});
      });
    return () => {
      cancelled = true;
    };
  }, [report?._id, ownerId, report?.periodStart, report?.periodEnd, reportListingIdsKey]);

  useEffect(() => {
    const snapType = report?.snapshot?.contract?.type;
    const lid = report?.landlordId;
    if (!report?._id || snapType || !lid) {
      setLiveContract(undefined);
      return;
    }
    let cancelled = false;
    void getLandlordById(String(lid))
      .then((row) => {
        if (!cancelled && row.landlordContract?.type) {
          setLiveContract(row.landlordContract);
        }
      })
      .catch(() => {
        if (!cancelled) setLiveContract(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [report?._id, report?.landlordId, report?.snapshot?.contract?.type]);

  const reservations = useMemo(() => {
    if (!snapshotReservations.length || !Object.keys(reservationOverlay).length) {
      return snapshotReservations;
    }
    return snapshotReservations.map((row) => {
      const fresh =
        reservationOverlay[String(row.reservationId || '')] ||
        reservationOverlay[`num:${String(row.reservationNumber || '')}`];
      if (!fresh) return row;
      return {
        ...row,
        adults: row.adults ?? fresh.adults,
        children: row.children ?? fresh.children,
        numberOfGuests: row.numberOfGuests ?? fresh.numberOfGuests,
        alreadyPaid: row.alreadyPaid ?? fresh.alreadyPaid,
        paymentStatus: row.paymentStatus ?? fresh.paymentStatus,
        listingName: row.listingName || fresh.listingName || '',
      };
    });
  }, [snapshotReservations, reservationOverlay]);

  useEffect(() => {
    const ids = [...new Set(snapshotReservations.map((r) => String(r.listingId || '')).filter(Boolean))];
    if (!ids.length) {
      setListingLabels((prev) => (Object.keys(prev).length ? {} : prev));
      return;
    }
    let cancelled = false;
    void Promise.all(
      ids.slice(0, 40).map(async (listingId) => {
        try {
          const row = await getOneListing(listingId, false);
          const name = row?.name || row?.title;
          return name ? ([listingId, name] as const) : null;
        } catch {
          return null;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const p of pairs) {
        if (p) next[p[0]] = p[1];
      }
      setListingLabels(next);
    });
    return () => {
      cancelled = true;
    };
  }, [snapshotReservations]);

  const resaCellValue = (key: string, type: ProfitColumnType, row: Record<string, unknown>) => {
    if (key === 'listingName') {
      const name = String(row.listingName || '').trim();
      if (name) return name;
      const id = String(row.listingId || '');
      return listingLabels[id] || '—';
    }
    if (key === 'listingId') {
      return '—';
    }
    if (key === 'adults' || key === 'children') {
      const n = row[key] ?? (key === 'adults' ? row.numberOfGuests : undefined);
      if (n == null || n === '') return '—';
      return String(n);
    }
    if (key === 'alreadyPaid') {
      const n = row.alreadyPaid;
      if (n == null || n === '') return '—';
      return formatProfitReportCell('money', n, currency);
    }
    if (key === 'paymentStatus') {
      const s = String(row.paymentStatus || '').trim();
      return s || '—';
    }
    return formatProfitReportCell(type, row[key], currency);
  };
  const columnConfig = useMemo(
    () => normalizeColumnConfig(report?.snapshot?.columnConfig),
    [report?.snapshot?.columnConfig],
  );
  const resaCols = useMemo(
    () =>
      columnConfig.reservations
        .map((k) => PROFIT_REPORT_RESERVATION_COLUMNS.find((c) => c.key === k))
        .filter((c): c is (typeof PROFIT_REPORT_RESERVATION_COLUMNS)[number] => !!c),
    [columnConfig.reservations],
  );
  const ledgerCols = useMemo(
    () =>
      ledgerDisplayColumnKeys(columnConfig.ledger)
        .map((k) => PROFIT_REPORT_LEDGER_COLUMNS.find((c) => c.key === k))
        .filter((c): c is (typeof PROFIT_REPORT_LEDGER_COLUMNS)[number] => !!c && c.key !== 'type'),
    [columnConfig.ledger],
  );

  const reservationNumById = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of reservations) {
      const id = String(r.reservationId || '');
      const num = String(r.reservationNumber || '');
      if (id && num) map.set(id, num);
    }
    for (const row of Object.values(reservationOverlay)) {
      const id = String(row.reservationId || '');
      const num = String(row.reservationNumber || '');
      if (id && num) map.set(id, num);
    }
    return map;
  }, [reservations, reservationOverlay]);

  const ledgerCellDisplay = (
    colKey: string,
    line: Record<string, unknown>,
    kind: 'expense' | 'extra',
  ) => {
    if (colKey === 'listingName') {
      return String(line.listingName || listingLabels[String(line.listingId || '')] || '—');
    }
    if (colKey === 'reservationNumber') {
      const num =
        String(line.reservationNumber || '').trim() ||
        reservationNumById.get(String(line.reservationId || '')) ||
        '';
      return num || '—';
    }
    if (colKey === 'amount') {
      const formatted = formatProfitReportCell('money', line.amount, currency).replace(/^−/, '');
      return `${kind === 'extra' ? '+' : '−'}${formatted}`;
    }
    return ledgerCellValue(colKey, line, currency);
  };

  const renderLedgerTable = (
    lines: Array<Record<string, unknown>>,
    kind: 'expense' | 'extra',
  ) => (
    <div className="report-table-fit">
      <table className="ledger-table report-ledger-table">
        <thead>
          <tr>
            {ledgerCols.map((col) => (
              <th key={col.key} className={col.type === 'money' ? 'num' : undefined}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={String(line.expenseId || i)}>
              {ledgerCols.map((col) => (
                <td
                  key={col.key}
                  className={
                    col.key === 'amount'
                      ? `num amt ${kind === 'extra' ? 'pos' : 'neg'}`
                      : col.type === 'money'
                        ? 'num'
                        : col.key === 'listingName'
                          ? 'report-listing-cell'
                          : col.key === 'name'
                            ? 'ledger-truncate'
                            : undefined
                  }
                  title={
                    col.key === 'listingName' || col.key === 'name'
                      ? ledgerCellDisplay(col.key, line, kind)
                      : undefined
                  }
                >
                  {ledgerCellDisplay(col.key, line, kind)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

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
  const expenses = report.snapshot?.expenses ?? [];
  const extras = report.snapshot?.extras ?? [];
  const expensesTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const extrasTotal = extras.reduce((s, e) => s + Number(e.amount || 0), 0);
  const contractSnapshot = (report.snapshot?.contract || undefined) as LandlordContract | undefined;
  const contract = contractSnapshot?.type ? contractSnapshot : liveContract;
  const contractMissingInSnapshot = !contractSnapshot?.type && !!contract?.type;
  const landlordFlowMetrics = profitLandlordFlowMetrics(metrics);
  const pmFlowMetrics = profitPmFlowMetrics(metrics);
  const { netLandlord, netPm, legacyFormula } = resolveProfitReportTotals(metrics);
  const pmExpenseCount = expenses.filter((e) => e.paidBy === 'pm').length;
  const landlordExpenseCount = expenses.filter((e) => e.paidBy === 'landlord').length;
  const metricHintCtx = {
    contract,
    currency,
    metrics,
    pmExpenseCount,
    landlordExpenseCount,
    extrasCount: extras.length,
  };

  const net = netLandlord;
  const isDraft = report.status === 'draft';
  const contractBadgeInfo = contractBadge(contract);

  const formatPlAmount = (value: number) => {
    if (value === 0) return `0 ${currency}`;
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${Number(value).toLocaleString('fr-FR')} ${currency}`;
  };

  return (
    <DashboardWrapper breadcrumb={['Finances', 'Rapports P&L', report.name]}>
      <FinancesModule>
        <button type="button" className="btn btn-ghost" style={{ marginBottom: 16 }} onClick={() => navigate('/finances/reports')}>
          ← Retour aux rapports
        </button>

        <div className="ph" style={{ alignItems: 'center' }}>
          <div>
            <div className="eyebrow">Finances · /finances/reports/{report._id}</div>
            <h1>{report.name}</h1>
            <p className="sub">
              {formatPeriod(report.periodStart, report.periodEnd)} · {report.listingIds?.length ?? 0} listing(s) · {currency}
            </p>
          </div>
          <div className="ph-actions">
            <span className={`bdg ${isDraft ? 'gold' : 'green'} lg`} style={{ marginRight: 4 }}>
              <span className="dot" />
              {isDraft ? 'Brouillon' : 'Publié'}
            </span>
            {canWrite && isDraft && (
              <>
                <button type="button" className="btn btn-ghost pm-only" onClick={() => setConfigOpen((o) => !o)}>
                  ⚙ Colonnes
                </button>
                <button type="button" className="btn btn-su pm-only" disabled={publishing} onClick={() => void onPublish()}>
                  Publier ✓
                </button>
              </>
            )}
            <button type="button" className="btn btn-ghost" disabled={htmlLoading} onClick={() => void openHtml()}>
              {htmlLoading ? '…' : '↗ Voir HTML'}
            </button>
            <button type="button" className="btn btn-dark" disabled={printLoading} onClick={() => void printReport()}>
              {printLoading ? '…' : '🖨 Imprimer / PDF'}
            </button>
          </div>
        </div>

        {!isDraft && report.publishedAt && (
          <div className="inote info" style={{ marginBottom: 18 }}>
            <span className="i">🔒</span>
            <div>
              Rapport <b>publié le {formatShortDate(report.publishedAt)}</b>
              {isLandlord ? '' : ' par le PM'}. Montants, logo et colonnes figés — visible par le propriétaire
              dans <b>Finances → Rapports P&L</b>.
            </div>
          </div>
        )}

        {isDraft && canWrite && (
          <div className="inote gold" style={{ marginBottom: 12 }}>
            <span className="i">📝</span>
            <div>
              <b>Brouillon</b> — en-tête PDF repliable ci-dessous, colonnes via ⚙. <b>Publier</b> fige tout ; pas
              d&apos;envoi email auto.
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          {canWrite && isDraft ? (
            <ReportHeaderSection
              value={headerDraft}
              onChange={setHeaderDraft}
              onLoadDefault={() => void onLoadHeaderDefault()}
              onSave={() => void onSaveHeader()}
              loadingDefault={loadingHeaderDefault}
              saving={savingHeader}
            />
          ) : (
            <ReportHeaderSection value={normalizeProfitReportHeader(report.snapshot?.header)} disabled onChange={() => {}} />
          )}
        </div>

        {configOpen && canWrite && isDraft && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-h">
              <span className="ct">Configuration des colonnes</span>
              <button type="button" className="btn btn-prim btn-sm" style={{ marginLeft: 'auto' }} disabled={savingCols} onClick={() => void onSaveColumns()}>
                {savingCols ? '…' : 'Enregistrer'}
              </button>
            </div>
            <div className="card-b">
              <ReportColumnConfigPanel value={columnDraft} onChange={setColumnDraft} />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 10 }}
                onClick={() => setColumnDraft(defaultProfitReportColumnConfig())}
              >
                Réinitialiser colonnes par défaut
              </button>
            </div>
          </div>
        )}

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="kpi green">
            <div className="k">★ Net propriétaire</div>
            <div className="v">
              {Number(net).toLocaleString('fr-FR')} <small>{currency}</small>
            </div>
          </div>
          <div className="kpi">
            <div className="k">🏠 Réservations</div>
            <div className="v">{reservations.length}</div>
          </div>
          <div className="kpi rose">
            <div className="k">💸 Dépenses</div>
            <div className="v">
              {expensesTotal.toLocaleString('fr-FR')} <small>{currency}</small>
            </div>
            <div className="d">{expenses.length} ligne(s)</div>
          </div>
          <div className="kpi" style={{ borderColor: 'var(--suT)' }}>
            <div className="k">✨ Extras</div>
            <div className="v" style={{ color: 'var(--su)' }}>
              {extrasTotal.toLocaleString('fr-FR')} <small>{currency}</small>
            </div>
            <div className="d">{extras.length} ligne(s)</div>
          </div>
        </div>

        {isDraft && contractMissingInSnapshot && (
          <div className="inote warn" style={{ marginBottom: 18 }}>
            <span className="i">⚠️</span>
            <div>
              Contrat lu depuis la fiche propriétaire ({contractBadge(contract).label}). Les montants commission / net
              de ce brouillon ont été calculés <b>sans contrat</b> — <b>régénérez le rapport</b> pour recalculer la
              commission PM.
            </div>
          </div>
        )}

        <div className="rp-cols">
          <div className="card">
            <div className="card-h">
              <span className="ct">Synthèse P&amp;L</span>
              {contract?.type ? (
                <span className={`bdg ${contractBadgeInfo.tone}`} style={{ marginLeft: 'auto' }}>
                  Contrat : {contractBadgeInfo.label}
                </span>
              ) : (
                <span className="bdg gray" style={{ marginLeft: 'auto' }}>
                  Contrat PM non défini
                </span>
              )}
            </div>
            <div className="card-b" style={{ padding: '8px 18px' }}>
              <div className="pl-lines">
                <div className="pl-section-label">Reversement propriétaire</div>
                {landlordFlowMetrics.map((m) => {
                  const hint = resolveProfitMetricHint(m, metricHintCtx);
                  return (
                    <div key={m.key} className={`pl-line ${m.value > 0 ? 'plus' : m.value < 0 ? 'minus' : ''}`}>
                      <span className="lbl">
                        <span className="lbl-main">{m.label}</span>
                        {hint ? <span className="lbl-hint">{hint}</span> : null}
                      </span>
                      <span className="v">{formatPlAmount(Number(m.value))}</span>
                    </div>
                  );
                })}
                <div className="pl-line net">
                  <span className="lbl">
                    <span className="lbl-main">Net propriétaire</span>
                    <span className="lbl-hint">reversement au propriétaire</span>
                  </span>
                  <span className="v">
                    {Number(netLandlord).toLocaleString('fr-FR')} {currency}
                  </span>
                </div>

                <div className="pl-section-label">Marge PM</div>
                {pmFlowMetrics.map((m) => {
                  const hint = resolveProfitMetricHint(m, metricHintCtx);
                  return (
                    <div key={m.key} className={`pl-line ${m.value > 0 ? 'plus' : m.value < 0 ? 'minus' : ''}`}>
                      <span className="lbl">
                        <span className="lbl-main">{m.label}</span>
                        {hint ? <span className="lbl-hint">{hint}</span> : null}
                      </span>
                      <span className="v">{formatPlAmount(Number(m.value))}</span>
                    </div>
                  );
                })}
                <div className="pl-line net-pm">
                  <span className="lbl">
                    <span className="lbl-main">Net PM</span>
                    <span className="lbl-hint">commission PM − charges payées par le PM</span>
                  </span>
                  <span className="v">
                    {Number(netPm).toLocaleString('fr-FR')} {currency}
                  </span>
                </div>
              </div>
              {legacyFormula && (
                <p className="pl-legacy-note">
                  Totaux recalculés avec la règle actuelle (charges PM sur la marge PM). Régénérez le rapport pour figer
                  le snapshot.
                </p>
              )}
            </div>
          </div>
        </div>

        {reservations.length > 0 && (
          <div className="card">
            <div className="card-h">
              <span className="ct">Détail des réservations</span>
              <span className="sub">{reservations.length} séjours · {resaCols.length} colonnes</span>
            </div>
            <div className="report-table-scroll">
              <table className="ledger-table">
                <thead>
                  <tr>
                    {resaCols.map((col) => (
                      <th key={col.key} className={col.type === 'money' || col.type === 'number' ? 'num' : undefined}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r, i) => (
                    <tr key={String(r.reservationId || i)}>
                      {resaCols.map((col) => (
                        <td
                          key={col.key}
                          className={
                            col.type === 'money' || col.type === 'number'
                              ? `num ${col.key.includes('Revenue') || col.key === 'grossRevenue' ? 'amt' : ''}`
                              : col.key === 'listingName'
                                ? 'report-listing-cell'
                                : undefined
                          }
                          title={col.key === 'listingName' ? resaCellValue(col.key, col.type, r) : undefined}
                        >
                          {resaCellValue(col.key, col.type, r)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(expenses.length > 0 || extras.length > 0) && (
          <div className="report-ledger-stack">
            {expenses.length > 0 && (
              <div className="card">
                <div className="card-h">
                  <span className="ct">💸 Dépenses de la période</span>
                  <span className="sub">
                    {expenses.length} ligne(s) · {expensesTotal.toLocaleString('fr-FR')} {currency}
                  </span>
                </div>
                {renderLedgerTable(
                  [...expenses].sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))),
                  'expense',
                )}
              </div>
            )}

            {extras.length > 0 && (
              <div className="card">
                <div className="card-h">
                  <span className="ct">✨ Extras encaissés</span>
                  <span className="sub">
                    {extras.length} ligne(s) · +{extrasTotal.toLocaleString('fr-FR')} {currency}
                  </span>
                </div>
                {renderLedgerTable(
                  [...extras].sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))),
                  'extra',
                )}
              </div>
            )}
          </div>
        )}
      </FinancesModule>
    </DashboardWrapper>
  );
}

export default FinancesReportDetailPage;
