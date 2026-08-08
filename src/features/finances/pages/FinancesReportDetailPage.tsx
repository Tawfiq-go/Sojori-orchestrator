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
  regenerateProfitReport,
} from '../financesApi';
import { getOneListing } from '../../listing/services/serverApi.listing';
import { ReportColumnConfigPanel } from '../components/ReportColumnConfigPanel';
import { ReportHeaderSection } from '../components/ReportHeaderSection';
import { useFinancesOwnerScope } from '../useFinancesOwnerScope';
import type { ProfitLandlordBilan, ProfitListingBilan, ProfitReport } from '../types';
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
  const [regenerating, setRegenerating] = useState(false);
  const [savingCols, setSavingCols] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
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

  const onRegenerate = async () => {
    if (!id || regenerating) return;
    setRegenerating(true);
    try {
      const updated = await regenerateProfitReport(id, { ownerId });
      setReport(updated);
      setColumnDraft(normalizeColumnConfig(updated?.snapshot?.columnConfig));
      setHeaderDraft(normalizeProfitReportHeader(updated?.snapshot?.header));
      toast.success('Rapport régénéré');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Régénération impossible');
    } finally {
      setRegenerating(false);
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
        toast.warn('Marque PDF introuvable — configurez Finances → Marque PDF');
        return;
      }
      setHeaderDraft(normalizeProfitReportHeader(defaults));
      toast.info('Marque PDF rechargée (pas encore enregistrée sur ce rapport)');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement marque impossible');
    } finally {
      setLoadingHeaderDefault(false);
    }
  };

  const onSaveHeaderReport = async () => {
    if (!id) return;
    setSavingHeader(true);
    try {
      const updated = await patchProfitReportHeader(id, headerDraft, { ownerId });
      setReport(updated);
      setHeaderDraft(normalizeProfitReportHeader(updated?.snapshot?.header));
      toast.success('En-tête enregistré pour ce rapport');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement en-tête impossible');
    } finally {
      setSavingHeader(false);
    }
  };

  const onSaveHeaderBrand = async () => {
    if (!id || !ownerId) return;
    setSavingBrand(true);
    try {
      const company = (headerDraft.companyName || headerDraft.publicName || '').trim();
      const { updateOwner } = await import('../../staff/services/serverApi.task');
      await updateOwner(ownerId, {
        phone: headerDraft.phone || '',
        address: headerDraft.address || '',
        pmProfile: {
          publicName: company,
          tagline: headerDraft.tagline || '',
          logoImage: headerDraft.logoUrl || '',
          logoText: headerDraft.logoText || company.charAt(0).toUpperCase() || '',
        },
      });
      const updated = await patchProfitReportHeader(id, headerDraft, { ownerId });
      setReport(updated);
      setHeaderDraft(normalizeProfitReportHeader(updated?.snapshot?.header));
      toast.success('Marque PM mise à jour + en-tête de ce rapport');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Mise à jour marque impossible');
    } finally {
      setSavingBrand(false);
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
      const pick = (key: string) =>
        fresh[key] !== undefined && fresh[key] !== null ? fresh[key] : row[key];
      return {
        ...row,
        adults: pick('adults'),
        children: pick('children'),
        numberOfGuests: pick('numberOfGuests'),
        alreadyPaid: pick('alreadyPaid'),
        balanceDue: pick('balanceDue'),
        paymentStatus: pick('paymentStatus'),
        paymentStatusRaw: pick('paymentStatusRaw'),
        accommodationAmount: pick('accommodationAmount'),
        channelTotal: pick('channelTotal'),
        cleaningFee: pick('cleaningFee'),
        cleaningFeeOnSite: pick('cleaningFeeOnSite'),
        cityTax: pick('cityTax'),
        cityTaxOnSite: pick('cityTaxOnSite'),
        otherTaxes: pick('otherTaxes'),
        taxesTotal: pick('taxesTotal'),
        otherFees: pick('otherFees'),
        feesTotal: pick('feesTotal'),
        paidAtArrival: pick('paidAtArrival'),
        otaCommissionPercent: pick('otaCommissionPercent'),
        grossRevenue: pick('grossRevenue'),
        otaCommission: pick('otaCommission'),
        netRevenue: pick('netRevenue'),
        channelName: row.channelName || fresh.channelName || '',
        listingName: row.listingName || fresh.listingName || '',
        ledgerExtras: row.ledgerExtras ?? fresh.ledgerExtras ?? 0,
        // Toujours recalculer ADR sur le loyer final (évite « — » ou valeur snapshot obsolète).
        accommodationPerNight: (() => {
          const nights = Number(pick('nights') ?? row.nights) || 0;
          const acc = Number(pick('accommodationAmount') ?? row.accommodationAmount) || 0;
          if (nights > 0 && acc > 0) return Math.round((acc / nights) * 100) / 100;
          const snap = Number(row.accommodationPerNight);
          return Number.isFinite(snap) && snap > 0 ? snap : null;
        })(),
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
    if (key === 'paymentStatus') {
      const s = String(row.paymentStatus || row.paymentStatusRaw || '').trim();
      if (!s) return '—';
      const paid = /^(payé|paid)$/i.test(s);
      const unpaid = /unpaid|non\s*payé/i.test(s);
      const cls = paid ? 'pay-ok' : unpaid ? 'pay-ko' : 'pay-other';
      return (
        <span
          className={`pay-dot ${cls}`}
          title={paid ? 'Payé' : unpaid ? 'Non payé' : s}
          aria-label={paid ? 'Payé' : unpaid ? 'Non payé' : s}
        />
      );
    }
    if (key === 'otaCommission') {
      const money = formatProfitReportCell('money', row.otaCommission, currency);
      const pct = row.otaCommissionPercent;
      if (pct == null || pct === '' || !Number.isFinite(Number(pct))) return money;
      return (
        <span className="ota-comm-cell">
          {money}
          <span className="ota-pct">{Number(pct).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %</span>
        </span>
      );
    }
    if (key === 'cleaningFee' || key === 'cityTax' || key === 'paidAtArrival') {
      const n = row[key];
      if (n == null || n === '' || Number(n) === 0) {
        return <span className="amt-muted">—</span>;
      }
      const money = formatProfitReportCell('money', n, currency);
      let onSite = false;
      if (key === 'cleaningFee') onSite = !!row.cleaningFeeOnSite;
      else if (key === 'cityTax') onSite = !!row.cityTaxOnSite;
      else onSite = Number(n) > 0; // Sur place = toujours à collecter
      return (
        <span
          className={onSite ? 'amt-onsite' : 'amt-ota-paid'}
          title={onSite ? 'À collecter sur place' : 'Payé via OTA (inclus canal)'}
        >
          {money}
        </span>
      );
    }
    if (type === 'percent') {
      return formatProfitReportCell('percent', row[key], currency);
    }
    if (type === 'money') {
      const n = row[key];
      if (n == null || n === '') return '—';
      return formatProfitReportCell('money', n, currency);
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
      <DashboardWrapper breadcrumb={['Finances', 'Rapports P&L', '…']} hidePageHeader>
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
      <DashboardWrapper breadcrumb={['Finances', 'Rapports P&L']} hidePageHeader>
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
  const isPmBusiness = report.snapshot?.reportKind === 'pm_business';
  const isDraft = report.status === 'draft';
  const contractBadgeInfo = contractBadge(contract);
  const metricVal = (key: string) => Math.abs(Number(metrics.find((m) => m.key === key)?.value) || 0);
  const grossRevenue = metricVal('gross_revenue');
  const otaTaken = metricVal('ota_commission');
  const pmCommissionIncome = metricVal('pm_commission_income') || metricVal('pm_fee');
  const cleaningExtras = metricVal('cleaning_retained_pm') || metricVal('cleaning_to_pm');
  const staffSalariesCost = metricVal('staff_salaries');
  const checkoutFdMCost = metricVal('checkout_cleaning_cost');
  const checkoutFdMCount = expenses.filter((e) =>
    /ménage checkout|menage checkout|checkout/i.test(`${e.category || ''} ${e.name || ''}`),
  ).length;
  const cityTaxCollected = metricVal('city_tax_collected');
  const totalHebergement = reservations.reduce(
    (s, r) => s + (Number(r.accommodationAmount) || Number(r.grossRevenue) || 0),
    0,
  );
  const totalMenageOta = reservations.reduce((s, r) => s + (Number(r.cleaningFee) || 0), 0);
  const totalTaxeSejour = reservations.reduce((s, r) => s + (Number(r.cityTax) || 0), 0);
  const totalCanalClient = reservations.reduce((s, r) => s + (Number(r.channelTotal) || 0), 0);
  const activeListings =
    report.snapshot?.listingBilans?.filter((b) => (b.reservations || 0) > 0).length ||
    new Set(reservations.map((r) => String(r.listingId || '')).filter(Boolean)).size ||
    0;
  const pmFlowDisplay = pmFlowMetrics.map((m) =>
    m.key === 'cleaning_retained_pm'
      ? { ...m, label: 'Extras (ménages OTA récupérés)', value: Math.abs(Number(m.value) || 0) }
      : m,
  );

  const headerSnap = normalizeProfitReportHeader(report.snapshot?.header);
  const pmRecoverName = (headerSnap.companyName || headerSnap.publicName || 'le PM').trim() || 'le PM';
  const extrasMetricVal = Number(metrics.find((m) => m.key === 'extras')?.value) || 0;
  const otaMetricVal = Number(metrics.find((m) => m.key === 'ota_commission')?.value) || 0;
  const expensesLlMetricVal = Number(metrics.find((m) => m.key === 'expenses_landlord')?.value) || 0;
  const pmFeeMetricVal = Number(metrics.find((m) => m.key === 'pm_fee')?.value) || 0;
  const landlordTotalBrut = grossRevenue + cleaningExtras + Math.max(0, extrasMetricVal);

  const formatPlAmount = (value: number) => {
    if (value === 0) return `0 ${currency}`;
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${Number(value).toLocaleString('fr-FR')} ${currency}`;
  };

  return (
    <DashboardWrapper breadcrumb={['Finances', 'Rapports P&L', report.name]} hidePageHeader>
      <FinancesModule>
        <div className="ph report-detail-toolbar">
          <div>
            <h1>{report.name}</h1>
            <p className="sub">
              {formatPeriod(report.periodStart, report.periodEnd)} · {report.listingIds?.length ?? 0} listing(s) · {currency}
            </p>
          </div>
          <div className="ph-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/finances/reports')}
              title="Retour à la liste des rapports"
            >
              ✕ Fermer
            </button>
            <span className={`bdg ${isDraft ? 'gold' : 'green'} lg`} style={{ marginRight: 4 }}>
              <span className="dot" />
              {isDraft ? 'Brouillon' : 'Publié'}
            </span>
            {canWrite && (
              <button
                type="button"
                className="btn btn-ghost pm-only"
                disabled={regenerating}
                onClick={() => void onRegenerate()}
                title="Recalcule réservations, dépenses et totaux (conserve colonnes et en-tête)"
              >
                {regenerating ? '…' : '↻ Régénérer'}
              </button>
            )}
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
              <b>Brouillon</b> — en-tête PDF : <b>Ce rapport</b> (override) ou <b>Marque PM</b> (défaut). Colonnes via
              ⚙. <b>Publier</b> fige le snapshot (en-tête inclus) ; pas d&apos;envoi email auto.
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          {canWrite && isDraft ? (
            <ReportHeaderSection
              value={headerDraft}
              onChange={setHeaderDraft}
              onLoadDefault={() => void onLoadHeaderDefault()}
              onSaveReport={() => void onSaveHeaderReport()}
              onSaveBrand={() => void onSaveHeaderBrand()}
              loadingDefault={loadingHeaderDefault}
              saving={savingHeader}
              savingBrand={savingBrand}
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

        {isPmBusiness ? (
          <>
            {/* Ligne 1 — ton compte PM (ce que tu gagnes) */}
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
              <div className="kpi green">
                <div className="k">★ Ce que tu gagnes</div>
                <div className="v" style={{ fontSize: 18 }}>
                  {Number(netPm).toLocaleString('fr-FR')} <small>{currency}</small>
                </div>
                <div className="d">net après salaires &amp; FdM</div>
              </div>
              <div className="kpi">
                <div className="k">🏠 Réservations</div>
                <div className="v" style={{ fontSize: 18 }}>
                  {reservations.length}
                </div>
                <div className="d">{activeListings} biens actifs</div>
              </div>
              <div className="kpi rose">
                <div className="k">Salaires staff</div>
                <div className="v" style={{ fontSize: 18 }}>
                  {staffSalariesCost.toLocaleString('fr-FR')} <small>{currency}</small>
                </div>
                <div className="d">charge mensuelle</div>
              </div>
              <div className="kpi rose">
                <div className="k">Dépenses ménage</div>
                <div className="v" style={{ fontSize: 18 }}>
                  {checkoutFdMCost.toLocaleString('fr-FR')} <small>{currency}</small>
                </div>
                <div className="d">
                  {checkoutFdMCount > 0
                    ? `${checkoutFdMCount} départ(s) × 100 MAD FdM`
                    : 'checkout FdM (100 MAD / départ)'}
                </div>
              </div>
              <div className="kpi" style={{ borderColor: 'var(--suT)' }}>
                <div className="k">✨ Extras</div>
                <div className="v" style={{ fontSize: 18, color: 'var(--su)' }}>
                  {cleaningExtras.toLocaleString('fr-FR')} <small>{currency}</small>
                </div>
                <div className="d kpi-split">
                  <span>ménage = {cleaningExtras.toLocaleString('fr-FR')}</span>
                  <span>
                    taxe = {(totalTaxeSejour || cityTaxCollected).toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>
              <div className="kpi green">
                <div className="k">Gagné sur loyer</div>
                <div className="v" style={{ fontSize: 18 }}>
                  {pmCommissionIncome.toLocaleString('fr-FR')} <small>{currency}</small>
                </div>
                <div className="d">commissions PM</div>
              </div>
              <div className="kpi green">
                <div className="k">Gagné sur extras</div>
                <div className="v" style={{ fontSize: 18 }}>
                  {cleaningExtras.toLocaleString('fr-FR')} <small>{currency}</small>
                </div>
                <div className="d">ménages OTA récupérés</div>
              </div>
            </div>
            {/* Ligne 2 — volumétrie business (pas tout = ton gain) */}
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginTop: 8 }}>
              <div className="kpi">
                <div className="k">Total brut</div>
                <div className="v" style={{ fontSize: 17 }}>
                  {grossRevenue.toLocaleString('fr-FR')} <small>{currency}</small>
                </div>
                <div className="d">revenu hôte séjours</div>
              </div>
              <div className="kpi">
                <div className="k">Total hébergement</div>
                <div className="v" style={{ fontSize: 17 }}>
                  {totalHebergement.toLocaleString('fr-FR')} <small>{currency}</small>
                </div>
                <div className="d">loyers canal</div>
              </div>
              <div className="kpi">
                <div className="k">Total ménage OTA</div>
                <div className="v" style={{ fontSize: 17 }}>
                  {totalMenageOta.toLocaleString('fr-FR')} <small>{currency}</small>
                </div>
                <div className="d">facturé clients</div>
              </div>
              <div className="kpi">
                <div className="k">Total canal client</div>
                <div className="v" style={{ fontSize: 17 }}>
                  {totalCanalClient.toLocaleString('fr-FR')} <small>{currency}</small>
                </div>
                <div className="d">ce que paie le voyageur</div>
              </div>
              <div className="kpi rose">
                <div className="k">OTA a pris</div>
                <div className="v" style={{ fontSize: 17 }}>
                  {otaTaken.toLocaleString('fr-FR')} <small>{currency}</small>
                </div>
                <div className="d">comm. Airbnb / Booking</div>
              </div>
              <div className="kpi" title="Collectée pour la commune — pas dans ton résultat PM">
                <div className="k">Taxe de séjour</div>
                <div className="v" style={{ fontSize: 17 }}>
                  {(totalTaxeSejour || cityTaxCollected).toLocaleString('fr-FR')} <small>{currency}</small>
                </div>
                <div className="d">collectée · pas ton gain</div>
              </div>
            </div>
          </>
        ) : (
          /* Rapport type propriétaire : 1er flash = loyer sans ménage */
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            <div className="kpi green">
              <div className="k">★ Revenu brut loyer</div>
              <div className="v" style={{ fontSize: 20 }}>
                {grossRevenue.toLocaleString('fr-FR')} <small>{currency}</small>
              </div>
              <div className="d">sans ménage OTA</div>
            </div>
            <div className="kpi">
              <div className="k">Revenu ménage</div>
              <div className="v" style={{ fontSize: 18 }}>
                {cleaningExtras.toLocaleString('fr-FR')} <small>{currency}</small>
              </div>
              <div className="d">récupéré par {pmRecoverName}</div>
            </div>
            <div className="kpi">
              <div className="k">🏠 Réservations</div>
              <div className="v">{reservations.length}</div>
            </div>
            <div className="kpi rose">
              <div className="k">Commission OTA</div>
              <div className="v" style={{ fontSize: 18 }}>
                {otaTaken.toLocaleString('fr-FR')} <small>{currency}</small>
              </div>
            </div>
            <div className="kpi green">
              <div className="k">Net propriétaire</div>
              <div className="v" style={{ fontSize: 18 }}>
                {Number(netLandlord).toLocaleString('fr-FR')} <small>{currency}</small>
              </div>
              <div className="d">à reverser</div>
            </div>
          </div>
        )}

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
                {isPmBusiness ? (
                  <>
                    <div className="pl-section-label">Ce que tu gagnes (marge PM)</div>
                    {pmFlowDisplay.map((m) => {
                      const hint =
                        m.key === 'cleaning_retained_pm'
                          ? 'considéré comme extra — 100 % pour le PM'
                          : resolveProfitMetricHint(m, metricHintCtx);
                      const displayVal =
                        m.key === 'cleaning_retained_pm' ? Math.abs(Number(m.value) || 0) : Number(m.value);
                      return (
                        <div
                          key={m.key}
                          className={`pl-line ${displayVal > 0 ? 'plus' : displayVal < 0 ? 'minus' : ''}`}
                        >
                          <span className="lbl">
                            <span className="lbl-main">{m.label}</span>
                            {hint ? <span className="lbl-hint">{hint}</span> : null}
                          </span>
                          <span className="v">{formatPlAmount(displayVal)}</span>
                        </div>
                      );
                    })}
                    <div className="pl-line net-pm">
                      <span className="lbl">
                        <span className="lbl-main">Résultat business PM</span>
                        <span className="lbl-hint">commissions + extras ménages − salaires − FdM − autres charges</span>
                      </span>
                      <span className="v">
                        {Number(netPm).toLocaleString('fr-FR')} {currency}
                      </span>
                    </div>

                    <div className="pl-section-label">Reversement propriétaires</div>
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
                        <span className="lbl-main">Net propriétaires</span>
                        <span className="lbl-hint">total à reverser au portefeuille</span>
                      </span>
                      <span className="v">
                        {Number(netLandlord).toLocaleString('fr-FR')} {currency}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="pl-section-label">Reversement propriétaire</div>
                    <div className="pl-line plus flash">
                      <span className="lbl">
                        <span className="lbl-main">Revenu brut loyer</span>
                        <span className="lbl-hint">hébergement — sans ménage OTA</span>
                      </span>
                      <span className="v">{formatPlAmount(grossRevenue)}</span>
                    </div>
                    {cleaningExtras > 0 ? (
                      <div className="pl-line plus">
                        <span className="lbl">
                          <span className="lbl-main">Revenu ménage</span>
                          <span className="lbl-hint">
                            facturé au voyageur — récupéré par {pmRecoverName} (hors reversement)
                          </span>
                        </span>
                        <span className="v">{formatPlAmount(cleaningExtras)}</span>
                      </div>
                    ) : null}
                    {extrasMetricVal !== 0 ? (
                      <div className={`pl-line ${extrasMetricVal > 0 ? 'plus' : 'minus'}`}>
                        <span className="lbl">
                          <span className="lbl-main">Extras</span>
                          <span className="lbl-hint">
                            {resolveProfitMetricHint(
                              { key: 'extras', label: 'Extras', value: extrasMetricVal },
                              metricHintCtx,
                            ) || 'hors commissions OTA / ménage'}
                          </span>
                        </span>
                        <span className="v">{formatPlAmount(extrasMetricVal)}</span>
                      </div>
                    ) : null}
                    <div className="pl-line plus subtotal">
                      <span className="lbl">
                        <span className="lbl-main">Total brut</span>
                        <span className="lbl-hint">loyer + ménage + extras</span>
                      </span>
                      <span className="v">{formatPlAmount(landlordTotalBrut)}</span>
                    </div>
                    <div className={`pl-line ${otaMetricVal < 0 ? 'minus' : ''}`}>
                      <span className="lbl">
                        <span className="lbl-main">Commission OTA</span>
                        <span className="lbl-hint">Airbnb / Booking / etc.</span>
                      </span>
                      <span className="v">{formatPlAmount(otaMetricVal)}</span>
                    </div>
                    {cleaningExtras > 0 ? (
                      <div className="pl-line minus">
                        <span className="lbl">
                          <span className="lbl-main">Ménage récupéré par {pmRecoverName}</span>
                          <span className="lbl-hint">retiré du reversement propriétaire</span>
                        </span>
                        <span className="v">{formatPlAmount(-cleaningExtras)}</span>
                      </div>
                    ) : null}
                    {expensesLlMetricVal !== 0 ? (
                      <div className={`pl-line ${expensesLlMetricVal < 0 ? 'minus' : ''}`}>
                        <span className="lbl">
                          <span className="lbl-main">Charges propriétaire</span>
                          <span className="lbl-hint">
                            {resolveProfitMetricHint(
                              {
                                key: 'expenses_landlord',
                                label: 'Charges propriétaire',
                                value: expensesLlMetricVal,
                              },
                              metricHintCtx,
                            ) || 'dépenses ledger à charge du propriétaire'}
                          </span>
                        </span>
                        <span className="v">{formatPlAmount(expensesLlMetricVal)}</span>
                      </div>
                    ) : null}
                    <div className={`pl-line ${pmFeeMetricVal < 0 ? 'minus' : ''}`}>
                      <span className="lbl">
                        <span className="lbl-main">Honoraires gestion</span>
                        <span className="lbl-hint">
                          {resolveProfitMetricHint(
                            { key: 'pm_fee', label: 'Honoraires gestion', value: pmFeeMetricVal },
                            metricHintCtx,
                          ) || 'honoraires de gestion prévus au contrat'}
                        </span>
                      </span>
                      <span className="v">{formatPlAmount(pmFeeMetricVal)}</span>
                    </div>
                    <div className="pl-line net">
                      <span className="lbl">
                        <span className="lbl-main">Net propriétaire</span>
                        <span className="lbl-hint">montant à reverser sur la période</span>
                      </span>
                      <span className="v">
                        {Number(netLandlord).toLocaleString('fr-FR')} {currency}
                      </span>
                    </div>
                  </>
                )}
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

        {report.snapshot?.reportKind === 'pm_business' &&
          ((report.snapshot.landlordBilans?.length || 0) > 0 ||
            (report.snapshot.listingBilans?.length || 0) > 0) && (
            <div className="report-ledger-stack" style={{ marginBottom: 16 }}>
              {(report.snapshot.landlordBilans?.length || 0) > 0 && (
                <div className="card">
                  <div className="card-h">
                    <span className="ct">Bilan par propriétaire (marge PM)</span>
                    <span className="sub">
                      classé du plus rentable · top :{' '}
                      {report.snapshot.topLandlord?.landlordName || '—'} (
                      {Number(report.snapshot.topLandlord?.netPmContribution || 0).toLocaleString('fr-FR')}{' '}
                      {currency})
                    </span>
                  </div>
                  <div className="report-table-scroll">
                    <table className="ledger-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Propriétaire</th>
                          <th className="num">Biens</th>
                          <th className="num">Résas</th>
                          <th className="num">Comm. PM</th>
                          <th className="num">Ménage OTA</th>
                          <th className="num">Taxe séjour</th>
                          <th className="num">FdM / charges</th>
                          <th className="num">Marge PM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(report.snapshot.landlordBilans as ProfitLandlordBilan[]).map((row, i) => (
                          <tr key={row.landlordId}>
                            <td>{i + 1}</td>
                            <td>{row.landlordName}</td>
                            <td className="num">{row.listings}</td>
                            <td className="num">{row.reservations}</td>
                            <td className="num amt">
                              {row.pmCommission.toLocaleString('fr-FR')} {currency}
                            </td>
                            <td className="num">
                              {row.cleaningRetained.toLocaleString('fr-FR')} {currency}
                            </td>
                            <td className="num">
                              {row.cityTaxCollected.toLocaleString('fr-FR')} {currency}
                            </td>
                            <td className="num">
                              {(row.checkoutCleaningCost + row.otherPmExpenses).toLocaleString('fr-FR')}{' '}
                              {currency}
                            </td>
                            <td className="num amt">
                              {row.netPmContribution.toLocaleString('fr-FR')} {currency}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {(report.snapshot.listingBilans?.length || 0) > 0 && (
                <div className="card">
                  <div className="card-h">
                    <span className="ct">Bilan par bien (marge PM)</span>
                    <span className="sub">
                      classé du plus rentable · top : {report.snapshot.topListing?.listingName || '—'} (
                      {Number(report.snapshot.topListing?.netPmContribution || 0).toLocaleString('fr-FR')}{' '}
                      {currency})
                      {report.snapshot.topListing?.avgAccommodationPerNight != null
                        ? ` · ADR ${Number(report.snapshot.topListing.avgAccommodationPerNight).toLocaleString('fr-FR')} ${currency}/nuit`
                        : ''}
                    </span>
                  </div>
                  <div className="report-table-scroll">
                    <table className="ledger-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Bien</th>
                          <th>Propriétaire</th>
                          <th className="num">Résas</th>
                          <th className="num">Nuits</th>
                          <th className="num">Héberg./jour</th>
                          <th className="num">Comm. PM</th>
                          <th className="num">Ménage OTA</th>
                          <th className="num">Taxe séjour</th>
                          <th className="num">FdM / charges</th>
                          <th className="num">Marge PM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(report.snapshot.listingBilans as ProfitListingBilan[]).map((row, i) => (
                          <tr key={row.listingId}>
                            <td>{i + 1}</td>
                            <td className="report-listing-cell" title={row.listingName}>
                              {row.listingName}
                            </td>
                            <td>{row.landlordName || '—'}</td>
                            <td className="num">{row.reservations}</td>
                            <td className="num">{row.nights}</td>
                            <td className="num">
                              {row.avgAccommodationPerNight != null
                                ? `${row.avgAccommodationPerNight.toLocaleString('fr-FR')} ${currency}`
                                : '—'}
                            </td>
                            <td className="num amt">
                              {row.pmCommission.toLocaleString('fr-FR')} {currency}
                            </td>
                            <td className="num">
                              {row.cleaningRetained.toLocaleString('fr-FR')} {currency}
                            </td>
                            <td className="num">
                              {row.cityTaxCollected.toLocaleString('fr-FR')} {currency}
                            </td>
                            <td className="num">
                              {(row.checkoutCleaningCost + row.otherPmExpenses).toLocaleString('fr-FR')}{' '}
                              {currency}
                            </td>
                            <td className="num amt">
                              {row.netPmContribution.toLocaleString('fr-FR')} {currency}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

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
