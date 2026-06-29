import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../../../components/DashboardWrapper';
import { FinancesModule, useFinancesAccess } from '../FinancesModule';
import {
  createLedgerBundle,
  createLedgerEntry,
  createRecurringTemplate,
  deleteLedgerEntry,
  generateRecurringNow,
  listExpenseCategories,
  listLedgerEntries,
  listRecurringTemplates,
  patchLedgerEntry,
  runDueRecurringTemplates,
} from '../financesApi';
import { useFinancesOwnerScope } from '../useFinancesOwnerScope';
import { getListings, getOneListing } from '../../listing/services/serverApi.listing';
import type { ExpenseCategory, LandlordAccount, LedgerEntry, RecurringTemplate } from '../types';
import { formatMoney, formatShortDate, paidByLabel } from '../utils/format';
import { listLandlords } from '../landlordApi';
import { CategorySelect, categoryNameById } from '../utils/expenseCategories.tsx';
import { SearchSelect } from '../utils/financesSearchSelect.tsx';
import {
  RecurringAssociationFields,
  validateRecurringAssociation,
  type RecurringAssociationValue,
} from '../components/RecurringAssociationFields';
import {
  buildRecurringApiBody,
  RecurringScheduleFields,
  type RecurringScheduleValue,
} from '../components/RecurringScheduleFields';
import {
  describeRecurringSchedule,
  formatNextRunAt,
} from '../utils/recurringSchedule.tsx';
import { buildRecurringScopeBody, describeRecurringScope } from '../utils/recurringScope.tsx';
import { LedgerAttachmentUpload } from '../components/LedgerAttachmentUpload';
import { ReservationSearchSelect } from '../components/ReservationSearchSelect';
import {
  fetchReservationLabels,
  type LedgerReservationOption,
} from '../services/ledgerReservationApi';

type ListingRow = { _id?: string; id?: string; name?: string; title?: string };

export function FinancesLedgerPage() {
  return (
    <DashboardWrapper breadcrumb={['Finances', 'Dépenses & extras']}>
      <FinancesModule>
        <FinancesLedgerPageContent />
      </FinancesModule>
    </DashboardWrapper>
  );
}

function FinancesLedgerPageContent() {
  const { canWrite, isLandlord } = useFinancesAccess();
  const { ownerId, needsOwnerPick } = useFinancesOwnerScope();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [recurring, setRecurring] = useState<RecurringTemplate[]>([]);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [listingLabels, setListingLabels] = useState<Record<string, string>>({});
  const [reservationLabels, setReservationLabels] = useState<Record<string, LedgerReservationOption>>({});
  const [listingsPickerLoaded, setListingsPickerLoaded] = useState(false);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [landlords, setLandlords] = useState<LandlordAccount[]>([]);
  const [landlordsLoading, setLandlordsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'whatsapp' | 'manual' | 'recurring'>('all');
  const [runDueLoading, setRunDueLoading] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringPanelOpen, setRecurringPanelOpen] = useState(false);
  const [attachEntry, setAttachEntry] = useState<LedgerEntry | null>(null);
  const [editEntry, setEditEntry] = useState<LedgerEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const mergeListingLabel = (id: string, name: string) => {
    if (!id || !name) return;
    setListingLabels((prev) => (prev[id] === name ? prev : { ...prev, [id]: name }));
  };

  const ingestListingRows = (rows: ListingRow[]) => {
    if (!rows.length) return;
    setListings((prev) => {
      const byId = new Map(prev.map((l) => [String(l._id || l.id), l]));
      for (const row of rows) {
        const id = String(row._id || row.id);
        if (id) byId.set(id, row);
      }
      return [...byId.values()];
    });
    for (const row of rows) {
      const id = String(row._id || row.id);
      const label = row.name || row.title;
      if (id && label) mergeListingLabel(id, label);
    }
  };

  const refreshPickerListings = async (pmOwnerId: string) => {
    setListingsLoading(true);
    try {
      const result = await getListings({
        page: 0,
        limit: 500,
        staging: false,
        compact: true,
        filterOwnerId: pmOwnerId,
      });
      const rows = Array.isArray(result?.data?.data) ? result.data.data : [];
      ingestListingRows(rows);
      setListingsPickerLoaded(true);
    } catch {
      setListingsPickerLoaded(false);
    } finally {
      setListingsLoading(false);
    }
  };

  const hydrateListingLabels = async (rows: LedgerEntry[]) => {
    const ids = [...new Set(rows.map((e) => e.listingId).filter(Boolean).map(String))];
    if (!ids.length) return;
    await Promise.all(
      ids.slice(0, 50).map(async (id) => {
        try {
          const listing = await getOneListing(id, false);
          const name = listing?.name || listing?.title;
          if (name) {
            mergeListingLabel(id, name);
            setListings((prev) => {
              if (prev.some((l) => String(l._id || l.id) === id)) return prev;
              return [...prev, { _id: id, name }];
            });
          }
        } catch {
          /* ignore */
        }
      }),
    );
  };

  const hydrateReservationLabels = async (rows: LedgerEntry[]) => {
    const ids = [...new Set(rows.map((e) => e.reservationId).filter(Boolean).map(String))];
    if (!ids.length) return;
    const labels = await fetchReservationLabels(ids);
    if (Object.keys(labels).length) {
      setReservationLabels((prev) => ({ ...prev, ...labels }));
    }
  };

  const load = async () => {
    if (needsOwnerPick) {
      setEntries([]);
      setCategories([]);
      setRecurring([]);
      setListings([]);
      setListingLabels({});
      setReservationLabels({});
      setListingsPickerLoaded(false);
      setLandlords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const scope = { ownerId };
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const [entriesRes, catsRes, recRes, landlordsRes] = await Promise.allSettled([
      listLedgerEntries({ startDate: start, endDate: end, limit: 200 }, scope),
      listExpenseCategories(scope),
      listRecurringTemplates(scope),
      canWrite ? listLandlords('', ownerId) : Promise.resolve([]),
    ]);

    const errors: string[] = [];
    if (entriesRes.status === 'fulfilled') {
      setEntries(entriesRes.value);
      if (ownerId) await refreshPickerListings(ownerId);
      void hydrateListingLabels(entriesRes.value);
      void hydrateReservationLabels(entriesRes.value);
    } else {
      setEntries([]);
      errors.push(entriesRes.reason instanceof Error ? entriesRes.reason.message : 'Journal inaccessible');
    }
    if (catsRes.status === 'fulfilled') setCategories(catsRes.value);
    else {
      setCategories([]);
      errors.push(catsRes.reason instanceof Error ? catsRes.reason.message : 'Catégories inaccessibles');
    }
    if (recRes.status === 'fulfilled') setRecurring(recRes.value);
    else setRecurring([]);
    if (landlordsRes.status === 'fulfilled') setLandlords(landlordsRes.value);
    else setLandlords([]);

    setLoading(false);
    if (errors.length) toast.error(errors[0]);
  };

  useEffect(() => {
    setListingsPickerLoaded(false);
  }, [ownerId]);

  useEffect(() => {
    void load();
  }, [ownerId, needsOwnerPick]);

  const loadLandlordsForPickers = async () => {
    if (needsOwnerPick) {
      setLandlords([]);
      return;
    }
    setLandlordsLoading(true);
    try {
      const rows = await listLandlords('', ownerId);
      setLandlords(rows);
    } catch {
      setLandlords([]);
    } finally {
      setLandlordsLoading(false);
    }
  };

  const ensureDrawerData = () => {
    if (ownerId && !listingsPickerLoaded && !listingsLoading) void refreshPickerListings(ownerId);
    if (!landlords.length && !landlordsLoading && !loading) void loadLandlordsForPickers();
  };

  const handleDeleteEntry = async (row: LedgerEntry): Promise<boolean> => {
    if (needsOwnerPick || deletingId) return false;
    if (!window.confirm(`Supprimer « ${row.name} » ?`)) return false;
    setDeletingId(row._id);
    try {
      await deleteLedgerEntry(row._id, { ownerId });
      toast.success('Ligne supprimée');
      await load();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Suppression impossible');
      return false;
    } finally {
      setDeletingId(null);
    }
  };

  const openEditEntry = (row: LedgerEntry) => {
    ensureDrawerData();
    setEditEntry(row);
  };

  const openExpense = () => {
    ensureDrawerData();
    setExpenseOpen(true);
  };

  const openBundle = () => {
    ensureDrawerData();
    setBundleOpen(true);
  };
  const openRecurring = () => {
    ensureDrawerData();
    setRecurringOpen(true);
  };

  const filtered = useMemo(() => {
    let rows = entries;
    if (sourceFilter === 'whatsapp') {
      rows = rows.filter((e) => e.source === 'whatsapp');
    } else if (sourceFilter === 'manual') {
      rows = rows.filter((e) => !e.source || e.source === 'manual');
    } else if (sourceFilter === 'recurring') {
      rows = rows.filter((e) => e.source === 'recurring' || !!e.recurringTemplateId);
    }
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((e) => e.name?.toLowerCase().includes(q) || e.categoryLabel?.toLowerCase().includes(q));
  }, [entries, search, sourceFilter]);

  const whatsappCount = useMemo(() => entries.filter((e) => e.source === 'whatsapp').length, [entries]);

  const kpis = useMemo(() => {
    const expenses = filtered.filter((e) => e.type === 'expense');
    const extras = filtered.filter((e) => e.type === 'extra');
    const expTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const extraTotal = extras.reduce((s, e) => s + Number(e.amount || 0), 0);
    return { expTotal, extraTotal, expCount: expenses.length, extraCount: extras.length, recurring: recurring.filter((r) => r.enabled !== false).length };
  }, [filtered, recurring]);

  const listingLabel = (id?: string) => {
    if (!id) return '—';
    const key = String(id);
    if (listingLabels[key]) return listingLabels[key];
    const row = listings.find((l) => String(l._id || l.id) === key);
    return row?.name || row?.title || '…';
  };

  const reservationLabel = (id?: string) => {
    if (!id) return '—';
    const row = reservationLabels[String(id)];
    return row?.reservationNumber || '…';
  };

  const activeRecurring = useMemo(
    () => recurring.filter((r) => r.enabled !== false),
    [recurring],
  );

  const handleRunDue = async () => {
    if (needsOwnerPick) {
      toast.warn('Sélectionnez un propriétaire PM dans la barre du haut');
      return;
    }
    setRunDueLoading(true);
    try {
      const out = await runDueRecurringTemplates({ ownerId });
      const created = out?.created ?? 0;
      toast.success(
        created > 0
          ? `${created} ligne${created > 1 ? 's' : ''} générée${created > 1 ? 's' : ''}`
          : 'Aucune échéance due pour le moment',
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setRunDueLoading(false);
    }
  };

  const handleGenerateNow = async (id: string) => {
    if (needsOwnerPick || generatingId) return;
    setGeneratingId(id);
    try {
      const out = await generateRecurringNow(id, { ownerId });
      const created = out?.created ?? 0;
      toast.success(created > 0 ? 'Ligne générée dans le journal' : 'Rien à générer');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <>
        <div className="ph">
          <div>
            <div className="eyebrow">Finances · /finances/ledger</div>
            <h1>Dépenses &amp; extras</h1>
            <p className="sub">Toutes les dépenses et recettes additionnelles, par listing et par réservation.</p>
          </div>
          {canWrite && (
            <div className="ph-actions">
              <button type="button" className="btn btn-ghost pm-only" onClick={openRecurring}>
                🔁 Récurrences
              </button>
              <button type="button" className="btn btn-ghost pm-only" onClick={openBundle}>
                ✨ Service avec marge
              </button>
              <button type="button" className="btn btn-prim pm-only" onClick={openExpense}>
                + Dépense / Extra
              </button>
            </div>
          )}
        </div>

        {needsOwnerPick && (
          <div className="inote info" style={{ marginBottom: 16 }}>
            <span className="i">ℹ️</span>
            Sélectionnez un <b>propriétaire PM</b> dans la barre du haut pour charger le journal des dépenses.
          </div>
        )}

        {isLandlord && (
          <div className="ro-banner">
            <div className="ic">👁</div>
            <div>
              Vous consultez vos finances en <b>lecture seule</b>. Les dépenses et extras sont saisis par votre gestionnaire.
            </div>
          </div>
        )}

        <div className="kpis">
          <div className="kpi rose">
            <div className="k">💸 Dépenses · période</div>
            <div className="v">{kpis.expTotal.toLocaleString('fr-FR')}</div>
            <div className="d" style={{ color: 'var(--t3)' }}>
              MAD · {kpis.expCount} lignes
            </div>
          </div>
          <div className="kpi green">
            <div className="k">✨ Extras encaissés</div>
            <div className="v">{kpis.extraTotal.toLocaleString('fr-FR')}</div>
            <div className="d" style={{ color: 'var(--t3)' }}>
              MAD · {kpis.extraCount} lignes
            </div>
          </div>
          <div className="kpi">
            <div className="k">🔁 Récurrences actives</div>
            <div className="v">{kpis.recurring}</div>
          </div>
        </div>

        <div className="toolbar">
          <div className="search-in">
            <span>🔎</span>
            <input placeholder="Libellé…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="ledger-source-filters" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="sub" style={{ marginRight: 4 }}>
              Origine :
            </span>
            {(
              [
                ['all', 'Toutes'],
                ['whatsapp', `📱 WhatsApp${whatsappCount ? ` (${whatsappCount})` : ''}`],
                ['manual', 'Manuel'],
                ['recurring', '🔁 Récurrent'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`btn btn-ghost btn-sm${sourceFilter === key ? ' on' : ''}`}
                onClick={() => setSourceFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {!loading && activeRecurring.length > 0 && (
          <div className={`card recurring-panel${recurringPanelOpen ? ' is-open' : ''}`} style={{ marginBottom: 12 }}>
            <div className="card-h recurring-panel-h">
              <button
                type="button"
                className="recurring-panel-toggle"
                aria-expanded={recurringPanelOpen}
                onClick={() => setRecurringPanelOpen((o) => !o)}
              >
                <span className="recurring-chevron" aria-hidden>
                  {recurringPanelOpen ? '▼' : '▶'}
                </span>
                <span className="ct">🔁 Dépenses récurrentes</span>
                <span className="bdg gray">{activeRecurring.length}</span>
                {!recurringPanelOpen ? (
                  <span className="sub recurring-panel-summary">
                    {activeRecurring
                      .slice(0, 3)
                      .map((r) => r.name)
                      .join(' · ')}
                    {activeRecurring.length > 3 ? ` · +${activeRecurring.length - 3}` : ''}
                  </span>
                ) : null}
              </button>
              {canWrite ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={runDueLoading || needsOwnerPick}
                  onClick={() => void handleRunDue()}
                >
                  {runDueLoading ? '…' : 'Générer dues'}
                </button>
              ) : null}
            </div>
            {recurringPanelOpen ? (
              <div className="recurring-panel-body">
                <p className="sub recurring-panel-hint">
                  Les modèles n&apos;apparaissent dans le journal qu&apos;après génération (cron ou bouton ci-dessus).
                </p>
                <ul className="recurring-compact-list">
                  {activeRecurring.map((r) => {
                    const scope = describeRecurringScope({
                      scopeType: r.scopeType,
                      listingIds: r.listingIds,
                      landlordId: r.landlordId,
                      landlords,
                    });
                    const schedule = describeRecurringSchedule(r);
                    const next = r.nextRunAt ? formatNextRunAt(r.nextRunAt) : '';
                    return (
                      <li key={r._id} className="recurring-compact-row">
                        <span className="recurring-compact-name" title={r.name}>
                          {r.name}
                        </span>
                        <span
                          className="recurring-compact-meta"
                          title={`${categoryNameById(categories, r.categoryId)} · ${scope} · ${schedule}${next ? ` · ${next}` : ''}`}
                        >
                          {categoryNameById(categories, r.categoryId)} · {scope} · {schedule}
                          {next ? ` · proch. ${next}` : ''}
                        </span>
                        <span className="amt neg recurring-compact-amt">
                          −{Number(r.amount).toLocaleString('fr-FR')}
                        </span>
                        {canWrite ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={!!generatingId || needsOwnerPick}
                            onClick={() => void handleGenerateNow(r._id)}
                          >
                            {generatingId === r._id ? '…' : 'Générer'}
                          </button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        <div className="card">
          {loading ? (
            <div className="empty">
              <div className="spinner" />
            </div>
          ) : (
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Libellé</th>
                  <th>Type</th>
                  <th className="num">Montant</th>
                  <th>Catégorie</th>
                  <th>Listing</th>
                  <th>Résa.</th>
                  <th>Payé par</th>
                  <th>Justif.</th>
                  {canWrite ? <th className="num">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={canWrite ? 10 : 9}>
                      <div className="empty" style={{ padding: '32px 16px' }}>
                        <div>Aucune ligne pour la période en cours.</div>
                        {activeRecurring.length > 0 ? (
                          <div className="sub" style={{ marginTop: 8 }}>
                            {activeRecurring.length} récurrence{activeRecurring.length > 1 ? 's actives' : ' active'} — ouvrez
                            🔁 ou « Générer dues ».
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row._id}>
                      <td className="mono">{formatShortDate(row.date)}</td>
                      <td className="cell-main ledger-truncate" title={row.name}>
                        {row.source === 'whatsapp' ? (
                          <span className="bdg info" title="Saisie via WhatsApp (Flow E)" style={{ marginRight: 6 }}>
                            📱
                          </span>
                        ) : row.source === 'recurring' || row.recurringTemplateId ? (
                          <span className="bdg gray" title="Ligne issue d'une récurrence" style={{ marginRight: 6 }}>
                            🔁
                          </span>
                        ) : null}
                        {row.name}
                      </td>
                      <td>
                        <span className={`bdg ${row.type === 'extra' ? 'green' : 'rose'}`}>{row.type === 'extra' ? 'Extra' : 'Dépense'}</span>
                      </td>
                      <td className={`num amt ${row.type === 'extra' ? 'pos' : 'neg'}`}>
                        {row.type === 'extra' ? '+' : '−'}
                        {Number(row.amount || 0).toLocaleString('fr-FR')}
                      </td>
                      <td>
                        <span className="bdg gray">{row.categoryLabel || '—'}</span>
                      </td>
                      <td className="ledger-truncate" title={listingLabel(row.listingId)}>
                        {listingLabel(row.listingId)}
                      </td>
                      <td>
                        <span className="bdg info mono">{reservationLabel(row.reservationId)}</span>
                      </td>
                      <td>
                        <span className="bdg info">{paidByLabel(row.paidBy)}</span>
                      </td>
                      <td>
                        {(row.invoiceUrls?.length ?? 0) > 0 ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm ledger-justif-btn"
                            title="Voir les justificatifs"
                            onClick={() => setAttachEntry(row)}
                          >
                            📎 {row.invoiceUrls?.length}
                          </button>
                        ) : (
                          <span className="sub">—</span>
                        )}
                      </td>
                      {canWrite ? (
                        <td className="num ledger-actions-cell">
                          <div className="ledger-actions">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm ledger-action-btn"
                              title="Modifier"
                              onClick={() => openEditEntry(row)}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm ledger-action-btn"
                              title="Justificatifs"
                              onClick={() => setAttachEntry(row)}
                            >
                              📎
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm ledger-action-btn"
                              title="Supprimer"
                              disabled={deletingId === row._id}
                              onClick={() => void handleDeleteEntry(row)}
                            >
                              {deletingId === row._id ? '…' : '🗑'}
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {expenseOpen && (
          <ExpenseDrawer
            categories={categories}
            listings={listings}
            listingsLoading={listingsLoading}
            landlords={landlords}
            landlordsLoading={landlordsLoading}
            ownerId={ownerId}
            needsOwnerPick={needsOwnerPick}
            onClose={() => setExpenseOpen(false)}
            onSaved={() => {
              setExpenseOpen(false);
              void load();
            }}
          />
        )}
        {bundleOpen && (
          <BundleDrawer
            listings={listings}
            categories={categories}
            ownerId={ownerId}
            needsOwnerPick={needsOwnerPick}
            onClose={() => setBundleOpen(false)}
            onSaved={() => {
              setBundleOpen(false);
              void load();
            }}
          />
        )}
        {recurringOpen && (
          <RecurringDrawer
            categories={categories}
            listings={listings}
            landlords={landlords}
            landlordsLoading={landlordsLoading}
            recurring={recurring}
            ownerId={ownerId}
            needsOwnerPick={needsOwnerPick}
            onClose={() => setRecurringOpen(false)}
            onSaved={() => {
              setRecurringOpen(false);
              void load();
            }}
          />
        )}
        {attachEntry && (
          <EntryAttachmentsDrawer
            entry={attachEntry}
            ownerId={ownerId}
            needsOwnerPick={needsOwnerPick}
            readOnly={!canWrite}
            onClose={() => setAttachEntry(null)}
            onSaved={() => {
              setAttachEntry(null);
              void load();
            }}
          />
        )}
        {editEntry && (
          <EntryEditDrawer
            entry={editEntry}
            categories={categories}
            listings={listings}
            listingsLoading={listingsLoading}
            ownerId={ownerId}
            needsOwnerPick={needsOwnerPick}
            onClose={() => setEditEntry(null)}
            onDelete={async () => {
              const ok = await handleDeleteEntry(editEntry);
              if (ok) setEditEntry(null);
            }}
            deleting={deletingId === editEntry._id}
            onSaved={() => {
              setEditEntry(null);
              void load();
            }}
          />
        )}
    </>
  );
}

function ExpenseDrawer({
  categories,
  listings,
  listingsLoading = false,
  landlords,
  landlordsLoading,
  ownerId,
  needsOwnerPick,
  onClose,
  onSaved,
}: {
  categories: ExpenseCategory[];
  listings: ListingRow[];
  listingsLoading?: boolean;
  landlords: LandlordAccount[];
  landlordsLoading?: boolean;
  ownerId: string | null;
  needsOwnerPick: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [entryMode, setEntryMode] = useState<'once' | 'recurring'>('once');
  const [type, setType] = useState<'expense' | 'extra'>('expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState('');
  const [paidBy, setPaidBy] = useState<'pm' | 'landlord' | 'guest'>('pm');
  const [listingId, setListingId] = useState('');
  const [reservationId, setReservationId] = useState('');
  const [selectedReservation, setSelectedReservation] = useState<LedgerReservationOption | null>(null);
  const [association, setAssociation] = useState<RecurringAssociationValue>({
    scopeType: 'listing',
    listingIds: [],
    landlordId: '',
  });
  const [schedule, setSchedule] = useState<RecurringScheduleValue>({
    frequency: 'monthly',
    dayOfMonth: 1,
    lastDayOfMonth: false,
    dayOfWeek: 1,
  });
  const [invoiceUrls, setInvoiceUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const listingOptions = useMemo(
    () =>
      listings.map((l) => {
        const id = String(l._id || l.id);
        return { value: id, label: l.name || l.title || id };
      }),
    [listings],
  );

  const patchAssociation = (patch: Partial<RecurringAssociationValue>) => {
    setAssociation((prev) => {
      const next = { ...prev, ...patch };
      if (patch.scopeType === 'pm') setPaidBy('pm');
      else if (patch.scopeType === 'landlord') setPaidBy('landlord');
      return next;
    });
  };

  const patchSchedule = (patch: Partial<RecurringScheduleValue>) => {
    setSchedule((prev) => ({ ...prev, ...patch }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (needsOwnerPick) {
      toast.warn('Sélectionnez un propriétaire PM dans la barre du haut');
      return;
    }
    if (!name.trim()) {
      toast.warn('Indiquez un libellé');
      return;
    }
    const amountNum = Number(amount);
    if (!amount.trim() || Number.isNaN(amountNum) || amountNum < 0) {
      toast.warn('Indiquez un montant valide');
      return;
    }
    if (entryMode === 'once' && !listingId && !reservationId) {
      toast.warn('Sélectionnez un listing ou une réservation');
      return;
    }
    if (entryMode === 'once' && !categoryId) {
      toast.warn('Sélectionnez une catégorie (ex. « Autre » si aucune ne convient)');
      return;
    }
    if (entryMode === 'recurring') {
      if (!categoryId) {
        toast.warn('Sélectionnez une catégorie');
        return;
      }
      const assocErr = validateRecurringAssociation(association);
      if (assocErr) {
        toast.warn(assocErr);
        return;
      }
    }
    setSaving(true);
    try {
      const cat = categories.find((c) => c._id === categoryId);
      const scope = { ownerId };
      if (entryMode === 'recurring') {
        await createRecurringTemplate(
          {
            type,
            name: name.trim() || cat?.name || 'Récurrent',
            amount: amountNum,
            currency: 'MAD',
            categoryId,
            paidBy: paidBy === 'guest' ? 'pm' : paidBy,
            ...buildRecurringScopeBody(association),
            ...buildRecurringApiBody(schedule),
          },
          scope,
        );
        toast.success(`Récurrence créée — ${describeRecurringSchedule(schedule)}`);
      } else {
        await createLedgerEntry(
          {
            type,
            name,
            amount: amountNum,
            currency: 'MAD',
            date,
            categoryId,
            categoryLabel: cat?.name,
            paidBy,
            collectedBy: type === 'extra' ? 'pm' : undefined,
            listingId: listingId || selectedReservation?.listingId || undefined,
            reservationId: reservationId || undefined,
            invoiceUrls: invoiceUrls.length ? invoiceUrls : undefined,
          },
          scope,
        );
        toast.success('Ligne enregistrée');
      }
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="scrim on" onClick={onClose} role="presentation" />
      <aside className="drawer on">
        <form noValidate onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="dr-h">
            <div className="dt">
              <h2>Nouvelle saisie</h2>
              <div className="ds">Dépense ou recette additionnelle.</div>
            </div>
            <button type="button" className="dr-close" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="dr-b">
            <div className="seg dark" style={{ marginBottom: 18 }}>
              <button type="button" className={type === 'expense' ? 'on' : ''} onClick={() => setType('expense')}>
                💸 Dépense
              </button>
              <button type="button" className={type === 'extra' ? 'on' : ''} onClick={() => setType('extra')}>
                ✨ Extra
              </button>
            </div>
            <div className="fgrp">
              <div className="flabel">Type de saisie</div>
              <div className="seg">
                <button type="button" className={entryMode === 'once' ? 'on' : ''} onClick={() => setEntryMode('once')}>
                  Ponctuelle
                </button>
                <button
                  type="button"
                  className={entryMode === 'recurring' ? 'on' : ''}
                  onClick={() => setEntryMode('recurring')}
                >
                  🔁 Récurrente
                </button>
              </div>
            </div>
            <div className="fgrp">
              <div className="flabel">
                Libellé <span className="req">*</span>
              </div>
              <input className="fin" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="frow c2">
              <div className="fgrp">
                <div className="flabel">Montant</div>
                <input className="fin" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              {entryMode === 'once' ? (
                <div className="fgrp">
                  <div className="flabel">Date</div>
                  <input className="fin" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              ) : (
                <div className="fgrp">
                  <div className="flabel">Devise</div>
                  <input className="fin" value="MAD" readOnly />
                </div>
              )}
            </div>
            <div className="fgrp">
              <div className="flabel">
                Catégorie <span className="req">*</span>
              </div>
              <CategorySelect
                categories={categories}
                value={categoryId}
                required
                onChange={(id, cat) => {
                  setCategoryId(id);
                  if (cat && !name.trim()) setName(cat.name);
                }}
              />
              <p className="sub" style={{ margin: '6px 0 0', fontSize: 12 }}>
                Obligatoire — choisissez « Autre » dans la liste si besoin, puis précisez le libellé.
              </p>
            </div>
            <div className="fgrp">
              <div className="flabel">Payé par</div>
              <div className="seg">
                {(['pm', 'landlord', 'guest'] as const).map((p) => (
                  <button key={p} type="button" className={paidBy === p ? 'on' : ''} onClick={() => setPaidBy(p)}>
                    {paidByLabel(p)}
                  </button>
                ))}
              </div>
            </div>
            {entryMode === 'recurring' && (
              <>
                <RecurringScheduleFields value={schedule} onChange={patchSchedule} />
                <RecurringAssociationFields
                  value={association}
                  onChange={patchAssociation}
                  listings={listings}
                  landlords={landlords}
                  landlordsLoading={landlordsLoading}
                />
              </>
            )}
            {entryMode === 'once' && (
              <div className="fgrp">
                <div className="flabel">Réservation (optionnel)</div>
                <ReservationSearchSelect
                  ownerId={ownerId}
                  value={reservationId}
                  selected={selectedReservation}
                  disabled={needsOwnerPick || saving}
                  onChange={(id, opt) => {
                    setReservationId(id);
                    setSelectedReservation(opt || null);
                    if (opt?.listingId) setListingId(opt.listingId);
                  }}
                  onClear={() => {
                    setReservationId('');
                    setSelectedReservation(null);
                  }}
                />
              </div>
            )}
            {entryMode === 'once' && (
              <div className="fgrp">
                <div className="flabel">Listing</div>
                {listingsLoading && listingOptions.length === 0 ? (
                  <div className="inote info" style={{ margin: 0 }}>
                    <span className="i">ℹ️</span>
                    Chargement des listings…
                  </div>
                ) : listingOptions.length ? (
                  <SearchSelect
                    options={listingOptions}
                    value={listingId}
                    required
                    placeholder="Choisir un listing…"
                    searchPlaceholder="Rechercher un listing…"
                    emptyMessage="Aucun listing trouvé"
                    onChange={(id) => setListingId(id)}
                  />
                ) : (
                  <div className="inote warn" style={{ margin: 0 }}>
                    <span className="i">⚠️</span>
                    Aucun listing pour ce propriétaire PM — vérifiez la sélection en haut de page.
                  </div>
                )}
              </div>
            )}
            {entryMode === 'once' && (
              <LedgerAttachmentUpload
                ownerId={ownerId}
                value={invoiceUrls}
                onChange={setInvoiceUrls}
                disabled={needsOwnerPick || saving}
              />
            )}
            {entryMode === 'recurring' && (
              <div className="inote info" style={{ marginTop: 4 }}>
                <span className="i">ℹ️</span>
                Les justificatifs s&apos;ajoutent sur chaque <b>ligne générée</b> (après l&apos;échéance), pas sur le
                modèle récurrent.
              </div>
            )}
          </div>
          <div className="dr-f">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Annuler
            </button>
            <div style={{ flex: 1 }} />
            <button type="submit" className="btn btn-prim" disabled={saving}>
              {entryMode === 'recurring' ? 'Créer la récurrence' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

function pickBundleLineCategories(categories: ExpenseCategory[]) {
  const other = categories.find((c) => c.slug === 'other' || c.name === 'Autre');
  const extra =
    categories.find((c) => c.kind === 'extra') ||
    categories.find((c) => c.kind === 'service') ||
    other;
  const expense =
    categories.find((c) => c.kind === 'expense' && c.slug !== 'other') || other;
  return { extra, expense };
}

function BundleDrawer({
  listings,
  categories,
  ownerId,
  needsOwnerPick,
  onClose,
  onSaved,
}: {
  listings: ListingRow[];
  categories: ExpenseCategory[];
  ownerId: string | null;
  needsOwnerPick: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [inAmount, setInAmount] = useState('300');
  const [outAmount, setOutAmount] = useState('200');
  const [supplier, setSupplier] = useState('');
  const [listingId, setListingId] = useState('');
  const [name, setName] = useState('Service avec marge');
  const [saving, setSaving] = useState(false);
  const margin = (Number(inAmount) || 0) - (Number(outAmount) || 0);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (needsOwnerPick) {
      toast.warn('Sélectionnez un propriétaire PM dans la barre du haut');
      return;
    }
    if (!listingId) {
      toast.warn('Sélectionnez un listing');
      return;
    }
    const { extra: extraCat, expense: expenseCat } = pickBundleLineCategories(categories);
    if (!extraCat?._id || !expenseCat?._id) {
      toast.warn('Catégories manquantes — rechargez la page ou sélectionnez le PM');
      return;
    }
    setSaving(true);
    try {
      await createLedgerBundle(
        {
          name,
          listingId,
          lines: [
            {
              type: 'extra',
              amount: Number(inAmount) || 0,
              transactionRole: 'revenue',
              paidBy: 'guest',
              collectedBy: 'pm',
              categoryId: extraCat._id,
              categoryLabel: extraCat.name,
            },
            {
              type: 'expense',
              amount: Number(outAmount) || 0,
              transactionRole: 'cost',
              paidBy: 'pm',
              supplier,
              categoryId: expenseCat._id,
              categoryLabel: expenseCat.name,
            },
          ],
        },
        { ownerId },
      );
      toast.success('Service créé (extra + dépense)');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="scrim on" onClick={onClose} role="presentation" />
      <aside className="drawer on">
        <form noValidate onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="dr-h">
            <div className="dt">
              <h2>Service avec marge</h2>
              <div className="ds">Extra client + dépense prestataire liés.</div>
            </div>
            <button type="button" className="dr-close" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="dr-b">
            <div className="fgrp">
              <input className="fin" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="frow c2">
              <div className="fgrp">
                <div className="flabel" style={{ color: 'var(--su)' }}>
                  ✨ Encaissé du client
                </div>
                <input className="fin" value={inAmount} onChange={(e) => setInAmount(e.target.value)} />
              </div>
              <div className="fgrp">
                <div className="flabel" style={{ color: 'var(--rose)' }}>
                  💸 Payé au prestataire
                </div>
                <input className="fin" value={outAmount} onChange={(e) => setOutAmount(e.target.value)} />
              </div>
            </div>
            <div className="margin-box">
              <div className="leg">
                <div className="l">Encaissé</div>
                <div className="v" style={{ color: 'var(--su)' }}>
                  +{Number(inAmount).toLocaleString('fr-FR')} MAD
                </div>
              </div>
              <span className="eq">−</span>
              <div className="leg">
                <div className="l">Payé</div>
                <div className="v" style={{ color: 'var(--rose)' }}>
                  {Number(outAmount).toLocaleString('fr-FR')} MAD
                </div>
              </div>
              <span className="eq">=</span>
              <div className="res">
                <div className="l">Marge</div>
                <div className="v" style={{ color: margin >= 0 ? 'var(--su)' : 'var(--rose)' }}>
                  {formatMoney(margin)}
                </div>
              </div>
            </div>
            <div className="fgrp" style={{ marginTop: 16 }}>
              <div className="flabel">Fournisseur</div>
              <input className="fin" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </div>
            <div className="fgrp">
              <div className="flabel">Listing</div>
              <select className="fin" value={listingId} onChange={(e) => setListingId(e.target.value)} required>
                <option value="">Choisir…</option>
                {listings.map((l) => {
                  const id = String(l._id || l.id);
                  return (
                    <option key={id} value={id}>
                      {l.name || l.title || id}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="dr-f">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Annuler
            </button>
            <div style={{ flex: 1 }} />
            <button type="submit" className="btn btn-prim" disabled={saving}>
              Créer le service
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

function RecurringDrawer({
  categories,
  listings,
  landlords,
  landlordsLoading,
  recurring,
  ownerId,
  needsOwnerPick,
  onClose,
  onSaved,
}: {
  categories: ExpenseCategory[];
  listings: ListingRow[];
  landlords: LandlordAccount[];
  landlordsLoading?: boolean;
  recurring: RecurringTemplate[];
  ownerId: string | null;
  needsOwnerPick: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<'pm' | 'landlord'>('landlord');
  const [association, setAssociation] = useState<RecurringAssociationValue>({
    scopeType: 'listing',
    listingIds: [],
    landlordId: '',
  });
  const [schedule, setSchedule] = useState<RecurringScheduleValue>({
    frequency: 'monthly',
    dayOfMonth: 1,
    lastDayOfMonth: false,
    dayOfWeek: 1,
  });
  const [saving, setSaving] = useState(false);

  const patchAssociation = (patch: Partial<RecurringAssociationValue>) => {
    setAssociation((prev) => {
      const next = { ...prev, ...patch };
      if (patch.scopeType === 'pm') setPaidBy('pm');
      else if (patch.scopeType === 'landlord') setPaidBy('landlord');
      return next;
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (needsOwnerPick) {
      toast.warn('Sélectionnez un propriétaire PM dans la barre du haut');
      return;
    }
    if (!categoryId) {
      toast.warn('Sélectionnez une catégorie');
      return;
    }
    const amountNum = Number(amount);
    if (!amount.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
      toast.warn('Indiquez un montant valide');
      return;
    }
    const assocErr = validateRecurringAssociation(association);
    if (assocErr) {
      toast.warn(assocErr);
      return;
    }
    const cat = categories.find((c) => c._id === categoryId);
    setSaving(true);
    try {
      await createRecurringTemplate(
        {
          name: name.trim() || cat?.name || 'Récurrent',
          amount: amountNum,
          currency: 'MAD',
          categoryId,
          paidBy,
          ...buildRecurringScopeBody(association),
          ...buildRecurringApiBody(schedule),
        },
        { ownerId },
      );
      toast.success('Récurrence créée');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="scrim on" onClick={onClose} role="presentation" />
      <aside className="drawer on">
        <form noValidate onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="dr-h">
            <div className="dt">
              <h2>Dépenses récurrentes</h2>
            </div>
            <button type="button" className="dr-close" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="dr-b">
            {recurring.length > 0 && (
              <div className="card" style={{ marginBottom: 18 }}>
                <div className="card-h">
                  <span className="ct">Actives</span>
                  <span className="sub">{recurring.length}</span>
                </div>
                <table>
                  <tbody>
                    {recurring.map((r) => (
                      <tr key={r._id}>
                        <td>
                          <div className="cell-main">{r.name}</div>
                          <div className="cell-sub">
                            {categoryNameById(categories, r.categoryId)} ·{' '}
                            {describeRecurringScope({
                              scopeType: r.scopeType,
                              listingIds: r.listingIds,
                              landlordId: r.landlordId,
                              landlords,
                            })}{' '}
                            · {describeRecurringSchedule(r)}
                            {r.nextRunAt ? ` · prochaine : ${formatNextRunAt(r.nextRunAt)}` : ''}
                          </div>
                        </td>
                        <td className="num amt neg">−{Number(r.amount).toLocaleString('fr-FR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flabel">Nouvelle récurrence</div>
            <div className="fgrp">
              <div className="flabel">Catégorie</div>
              <CategorySelect
                categories={categories}
                value={categoryId}
                onChange={(id, cat) => {
                  setCategoryId(id);
                  if (cat && !name.trim()) setName(cat.name);
                }}
              />
            </div>
            <div className="fgrp">
              <div className="flabel">Libellé (optionnel)</div>
              <input
                className="fin"
                placeholder="Ex. Fibre Majorelle — laissez vide pour reprendre la catégorie"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="fgrp">
              <div className="flabel">
                Montant <span className="req">*</span>
              </div>
              <input
                className="fin"
                placeholder="Ex. 350"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <RecurringScheduleFields
              value={schedule}
              onChange={(patch) => setSchedule((prev) => ({ ...prev, ...patch }))}
            />
            <RecurringAssociationFields
              value={association}
              onChange={patchAssociation}
              listings={listings}
              landlords={landlords}
              landlordsLoading={landlordsLoading}
            />
            <div className="inote info" style={{ marginBottom: 12 }}>
              <span className="i">ℹ️</span>
              Pas de justificatif sur le modèle : ajoutez PDF/image sur chaque ligne du journal une fois
              l&apos;échéance générée (bouton 📎).
            </div>
            <div className="fgrp">
              <div className="flabel">Payé par</div>
              <div className="seg">
                {(['pm', 'landlord'] as const).map((p) => (
                  <button key={p} type="button" className={paidBy === p ? 'on' : ''} onClick={() => setPaidBy(p)}>
                    {paidByLabel(p)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="dr-f">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Fermer
            </button>
            <div style={{ flex: 1 }} />
            <button type="submit" className="btn btn-prim" disabled={saving}>
              {saving ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

export default FinancesLedgerPage;

function entryDateInputValue(date?: string): string {
  if (!date) return new Date().toISOString().slice(0, 10);
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function EntryEditDrawer({
  entry,
  categories,
  listings,
  listingsLoading = false,
  ownerId,
  needsOwnerPick,
  onClose,
  onSaved,
  onDelete,
  deleting = false,
}: {
  entry: LedgerEntry;
  categories: ExpenseCategory[];
  listings: ListingRow[];
  listingsLoading?: boolean;
  ownerId: string | null;
  needsOwnerPick: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDelete: () => void | Promise<void>;
  deleting?: boolean;
}) {
  const [name, setName] = useState(entry.name || '');
  const [amount, setAmount] = useState(String(entry.amount ?? ''));
  const [date, setDate] = useState(entryDateInputValue(entry.date));
  const [categoryId, setCategoryId] = useState(entry.categoryId ? String(entry.categoryId) : '');
  const [paidBy, setPaidBy] = useState<'pm' | 'landlord' | 'guest'>(entry.paidBy || 'pm');
  const [listingId, setListingId] = useState(entry.listingId ? String(entry.listingId) : '');
  const [reservationId, setReservationId] = useState(entry.reservationId ? String(entry.reservationId) : '');
  const [selectedReservation, setSelectedReservation] = useState<LedgerReservationOption | null>(null);
  const [invoiceUrls, setInvoiceUrls] = useState<string[]>(entry.invoiceUrls ?? []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(entry.name || '');
    setAmount(String(entry.amount ?? ''));
    setDate(entryDateInputValue(entry.date));
    setCategoryId(entry.categoryId ? String(entry.categoryId) : '');
    setPaidBy(entry.paidBy || 'pm');
    setListingId(entry.listingId ? String(entry.listingId) : '');
    setReservationId(entry.reservationId ? String(entry.reservationId) : '');
    setSelectedReservation(null);
    setInvoiceUrls(entry.invoiceUrls ?? []);
    if (entry.reservationId) {
      void fetchReservationLabels([String(entry.reservationId)]).then((map) => {
        const row = map[String(entry.reservationId)];
        if (row) setSelectedReservation(row);
      });
    }
  }, [entry]);

  const listingOptions = useMemo(
    () =>
      listings.map((l) => {
        const id = String(l._id || l.id);
        return { value: id, label: l.name || l.title || id };
      }),
    [listings],
  );

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (needsOwnerPick) {
      toast.warn('Sélectionnez un propriétaire PM dans la barre du haut');
      return;
    }
    if (!name.trim()) {
      toast.warn('Indiquez un libellé');
      return;
    }
    const amountNum = Number(amount);
    if (!amount.trim() || Number.isNaN(amountNum) || amountNum < 0) {
      toast.warn('Indiquez un montant valide');
      return;
    }
    if (!listingId && !reservationId) {
      toast.warn('Sélectionnez un listing ou une réservation');
      return;
    }
    if (!categoryId) {
      toast.warn('Sélectionnez une catégorie (ex. « Autre » si aucune ne convient)');
      return;
    }
    setSaving(true);
    try {
      const cat = categories.find((c) => c._id === categoryId);
      await patchLedgerEntry(
        entry._id,
        {
          name: name.trim(),
          amount: amountNum,
          date,
          categoryId,
          categoryLabel: cat?.name,
          paidBy,
          listingId: listingId || selectedReservation?.listingId || undefined,
          reservationId: reservationId || null,
          invoiceUrls,
        },
        { ownerId },
      );
      toast.success('Ligne mise à jour');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="scrim on" onClick={onClose} role="presentation" />
      <aside className="drawer on">
        <form noValidate onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="dr-h">
            <div className="dt">
              <h2>Modifier la ligne</h2>
              <div className="ds">
                <span className={`bdg ${entry.type === 'extra' ? 'green' : 'rose'}`}>
                  {entry.type === 'extra' ? 'Extra' : 'Dépense'}
                </span>
              </div>
            </div>
            <button type="button" className="dr-close" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="dr-b">
            <div className="fgrp">
              <div className="flabel">
                Libellé <span className="req">*</span>
              </div>
              <input className="fin" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="frow c2">
              <div className="fgrp">
                <div className="flabel">Montant</div>
                <input className="fin" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="fgrp">
                <div className="flabel">Date</div>
                <input className="fin" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="fgrp">
              <div className="flabel">
                Catégorie <span className="req">*</span>
              </div>
              <CategorySelect
                categories={categories}
                value={categoryId}
                required
                onChange={(id, cat) => {
                  setCategoryId(id);
                  if (cat && !name.trim()) setName(cat.name);
                }}
              />
            </div>
            <div className="fgrp">
              <div className="flabel">Payé par</div>
              <div className="seg">
                {(['pm', 'landlord', 'guest'] as const).map((p) => (
                  <button key={p} type="button" className={paidBy === p ? 'on' : ''} onClick={() => setPaidBy(p)}>
                    {paidByLabel(p)}
                  </button>
                ))}
              </div>
            </div>
            <div className="fgrp">
              <div className="flabel">Réservation (optionnel)</div>
              <ReservationSearchSelect
                ownerId={ownerId}
                value={reservationId}
                selected={selectedReservation}
                disabled={needsOwnerPick || saving}
                onChange={(id, opt) => {
                  setReservationId(id);
                  setSelectedReservation(opt || null);
                  if (opt?.listingId) setListingId(opt.listingId);
                }}
                onClear={() => {
                  setReservationId('');
                  setSelectedReservation(null);
                }}
              />
            </div>
            <div className="fgrp">
              <div className="flabel">Listing</div>
              {listingsLoading && listingOptions.length === 0 ? (
                <div className="inote info" style={{ margin: 0 }}>
                  <span className="i">ℹ️</span>
                  Chargement des listings…
                </div>
              ) : listingOptions.length ? (
                <SearchSelect
                  options={listingOptions}
                  value={listingId}
                  required
                  placeholder="Choisir un listing…"
                  searchPlaceholder="Rechercher un listing…"
                  emptyMessage="Aucun listing trouvé"
                  onChange={(id) => setListingId(id)}
                />
              ) : (
                <div className="inote warn" style={{ margin: 0 }}>
                  <span className="i">⚠️</span>
                  Aucun listing chargé
                </div>
              )}
            </div>
            <LedgerAttachmentUpload
              ownerId={ownerId}
              value={invoiceUrls}
              onChange={setInvoiceUrls}
              disabled={needsOwnerPick || saving}
            />
          </div>
          <div className="dr-f">
            <button
              type="button"
              className="btn btn-ghost"
              style={{ color: 'var(--rose)' }}
              disabled={deleting || saving}
              onClick={() => void onDelete()}
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </button>
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn-prim" disabled={saving || deleting}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

function EntryAttachmentsDrawer({
  entry,
  ownerId,
  needsOwnerPick,
  readOnly = false,
  onClose,
  onSaved,
}: {
  entry: LedgerEntry;
  ownerId: string | null;
  needsOwnerPick: boolean;
  readOnly?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [invoiceUrls, setInvoiceUrls] = useState<string[]>(entry.invoiceUrls ?? []);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (readOnly) {
      onClose();
      return;
    }
    if (needsOwnerPick) {
      toast.warn('Sélectionnez un propriétaire PM dans la barre du haut');
      return;
    }
    setSaving(true);
    try {
      await patchLedgerEntry(entry._id, { invoiceUrls }, { ownerId });
      toast.success('Justificatifs enregistrés');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="scrim on" onClick={onClose} role="presentation" />
      <aside className="drawer on">
        <form noValidate onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="dr-h">
            <div className="dt">
              <h2>{readOnly ? 'Aperçu justificatifs' : 'Justificatifs'}</h2>
              <div className="ds">{entry.name}</div>
            </div>
            <button type="button" className="dr-close" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="dr-b">
            <LedgerAttachmentUpload
              ownerId={ownerId}
              value={invoiceUrls}
              onChange={setInvoiceUrls}
              disabled={readOnly || needsOwnerPick || saving}
              hint={
                entry.recurringTemplateId || entry.source === 'recurring'
                  ? 'Ligne issue d’une récurrence — ajoutez ici la facture ou la photo du mois.'
                  : undefined
              }
            />
          </div>
          <div className="dr-f">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {readOnly ? 'Fermer' : 'Annuler'}
            </button>
            {!readOnly ? (
              <>
                <div style={{ flex: 1 }} />
                <button type="submit" className="btn btn-prim" disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </>
            ) : null}
          </div>
        </form>
      </aside>
    </>
  );
}
