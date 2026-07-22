import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../../../components/DashboardWrapper';
import { FinancesModule, useFinancesAccess } from '../FinancesModule';
import {
  createLedgerEntry,
  createRecurringTemplate,
  deleteLedgerEntry,
  listExpenseCategories,
  listLedgerEntries,
  listRecurringTemplates,
  patchLedgerEntry,
  runDueRecurringTemplates,
  catchUpRecurringTemplate,
} from '../financesApi';
import { useFinancesOwnerScope } from '../useFinancesOwnerScope';
import { getListings, getOneListing } from '../../listing/services/serverApi.listing';
import type { ExpenseCategory, LandlordAccount, LedgerEntry, RecurringTemplate } from '../types';
import { formatShortDateTime, ledgerSourceBadge, paidByLabel } from '../utils/format';
import { listLandlords } from '../landlordApi';
import { CategorySelect } from '../utils/expenseCategories.tsx';
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
  proposeCatchUpOptions,
  RecurringCatchUpFields,
} from '../components/RecurringCatchUpFields';
import {
  describeRecurringSchedule,
} from '../utils/recurringSchedule.tsx';
import { buildRecurringScopeBody } from '../utils/recurringScope.tsx';
import { LedgerAttachmentUpload } from '../components/LedgerAttachmentUpload';
import { ReservationSearchSelect } from '../components/ReservationSearchSelect';
import {
  fetchReservationLabels,
  type LedgerReservationOption,
} from '../services/ledgerReservationApi';

type ListingRow = { _id?: string; id?: string; name?: string; title?: string };

export function FinancesLedgerPage() {
  return (
    <DashboardWrapper breadcrumb={['Finances', 'Dépenses & extras']} hidePageHeader>
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
  const [catchUpStayLoading, setCatchUpStayLoading] = useState(false);

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
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
    // Fenêtre large pour voir le rattrapage des récurrences (6 mois + mois courant)
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const [entriesRes, catsRes, recRes, landlordsRes] = await Promise.allSettled([
      listLedgerEntries({ startDate: start, endDate: end, limit: 500 }, scope),
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
    return rows.filter(
      (e) =>
        e.name?.toLowerCase().includes(q) ||
        e.categoryLabel?.toLowerCase().includes(q) ||
        e.entryCode?.toLowerCase().includes(q),
    );
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

  const perStayTemplates = useMemo(
    () => activeRecurring.filter((r) => r.frequency === 'per_stay'),
    [activeRecurring],
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

  /** Rattrapage des règles « par séjour » via les mêmes résas que le P&L (3 mois). */
  const handleCatchUpPerStay = async () => {
    if (needsOwnerPick) {
      toast.warn('Sélectionnez un propriétaire PM dans la barre du haut');
      return;
    }
    if (!perStayTemplates.length) {
      toast.warn('Aucune règle « par séjour » active');
      return;
    }
    setCatchUpStayLoading(true);
    try {
      let created = 0;
      let stays = 0;
      for (const tpl of perStayTemplates) {
        const id = String(tpl._id || '');
        if (!id) continue;
        const out = await catchUpRecurringTemplate(id, { catchUpLastMonths: 3 }, { ownerId });
        created += out?.created ?? 0;
        stays += out?.stays ?? 0;
      }
      toast.success(
        created > 0
          ? `Rattrapage : ${created} ligne${created > 1 ? 's' : ''} créée${created > 1 ? 's' : ''} (${stays} séjour${stays > 1 ? 's' : ''} scannés)`
          : stays > 0
            ? `Aucune nouvelle ligne (${stays} séjour${stays > 1 ? 's' : ''} déjà couverts ou hors listings)`
            : 'Aucun séjour trouvé sur 3 mois pour ces listings',
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setCatchUpStayLoading(false);
    }
  };

  return (
    <>
        <div className="ph">
          <div>
            <h1>Dépenses &amp; extras</h1>
            <p className="sub">Par listing et par réservation.</p>
          </div>
          {canWrite && (
            <div className="ph-actions">
              <button type="button" className="btn btn-ghost pm-only" onClick={openRecurring}>
                🔁 Récurrences
              </button>
              <button type="button" className="btn btn-prim pm-only" onClick={openExpense}>
                + Dépense / Extra
              </button>
            </div>
          )}
        </div>

        {needsOwnerPick && (
          <div className="inote info">
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
            <input placeholder="Libellé, réf. SE-…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-h" style={{ alignItems: 'center' }}>
              <span className="ct">🔁 Dépenses récurrentes</span>
              <span className="bdg gray">
                {activeRecurring.length} active{activeRecurring.length > 1 ? 's' : ''}
              </span>
              <div style={{ flex: 1 }} />
              {canWrite ? (
                <>
                  {perStayTemplates.length > 0 ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={catchUpStayLoading || needsOwnerPick}
                      onClick={() => void handleCatchUpPerStay()}
                      title="Crée les lignes manquantes pour les checkouts des 3 derniers mois (même source que le P&L)"
                    >
                      {catchUpStayLoading ? '…' : 'Rattraper séjours (3 mois)'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={runDueLoading || needsOwnerPick}
                    onClick={() => void handleRunDue()}
                  >
                    {runDueLoading ? '…' : 'Générer dues'}
                  </button>
                </>
              ) : null}
            </div>
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
                  <th>Créé le</th>
                  <th>Réf.</th>
                  <th>Libellé</th>
                  <th>Type</th>
                  <th className="num">Montant</th>
                  <th>Catégorie</th>
                  <th>Listing</th>
                  <th>Résa.</th>
                  <th>Payé par</th>
                  <th>Source</th>
                  <th>Justif.</th>
                  {canWrite ? <th className="num">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={canWrite ? 12 : 11}>
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
                      <td className="mono" title={row.createdAt || row.date}>
                        {formatShortDateTime(row.createdAt || row.date)}
                      </td>
                      <td className="mono ledger-truncate" title={row.entryCode || row._id}>
                        {row.entryCode ? (
                          <span className="bdg info">{row.entryCode}</span>
                        ) : (
                          <span className="sub">—</span>
                        )}
                      </td>
                      <td className="cell-main ledger-truncate" title={row.name}>
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
                        {(() => {
                          const src = ledgerSourceBadge(row);
                          return (
                            <span className={`bdg ${src.tone}`} title={src.title}>
                              {src.label}
                            </span>
                          );
                        })()}
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
  const [categoryError, setCategoryError] = useState('');
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
  const catchUpDefaults = useMemo(() => proposeCatchUpOptions(schedule, 6).map((o) => o.isoDate), [schedule]);
  const [catchUpDates, setCatchUpDates] = useState<string[]>(catchUpDefaults);
  const [perStayMonths, setPerStayMonths] = useState(6);
  useEffect(() => {
    setCatchUpDates(catchUpDefaults);
  }, [catchUpDefaults]);
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
    if (patch.frequency === 'per_stay') {
      setAssociation((prev) => ({ ...prev, scopeType: 'listing' }));
    }
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
      setCategoryError('Sélectionnez une catégorie (ex. Ménage ou Autre)');
      toast.warn('Sélectionnez une catégorie');
      return;
    }
    if (entryMode === 'recurring') {
      if (!categoryId) {
        setCategoryError('Sélectionnez une catégorie — champ obligatoire');
        toast.warn('Sélectionnez une catégorie');
        return;
      }
      const assocErr = validateRecurringAssociation(association);
      if (assocErr) {
        toast.warn(assocErr);
        return;
      }
    }
    setCategoryError('');
    setSaving(true);
    try {
      const cat = categories.find((c) => c._id === categoryId);
      const scope = { ownerId };
      if (entryMode === 'recurring') {
        const isPerStay = schedule.frequency === 'per_stay';
        const created = await createRecurringTemplate(
          {
            type,
            name: name.trim() || cat?.name || 'Récurrent',
            amount: amountNum,
            currency: 'MAD',
            categoryId,
            paidBy: paidBy === 'guest' ? 'pm' : paidBy,
            ...buildRecurringScopeBody(association),
            ...buildRecurringApiBody(schedule),
            ...(isPerStay
              ? { catchUpLastMonths: perStayMonths, catchUpPerStay: perStayMonths > 0 }
              : { catchUpDates }),
          },
          scope,
        );
        const n = created?.catchUpCreated ?? 0;
        toast.success(
          n > 0
            ? isPerStay
              ? `Règle par séjour créée — ${n} ligne${n > 1 ? 's' : ''} (résas déjà liées).`
              : `Récurrence créée — ${n} ligne${n > 1 ? 's' : ''} de rattrapage. Liez-les aux résas dans le journal.`
            : isPerStay
              ? 'Règle par séjour créée — les prochaines résas Completed généreront la ligne.'
              : `Récurrence créée — ${describeRecurringSchedule(schedule)}`,
        );
      } else {
        const created = await createLedgerEntry(
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
        toast.success(created?.entryCode ? `Ligne enregistrée · ${created.entryCode}` : 'Ligne enregistrée');
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
                <div className="flabel">
                  Montant <span className="req">*</span>
                </div>
                <input className="fin" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              {entryMode === 'once' ? (
                <div className="fgrp">
                  <div className="flabel">
                    Date <span className="req">*</span>
                  </div>
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
                kinds={type === 'extra' ? ['extra', 'expense'] : ['expense']}
                placeholder={type === 'extra' ? 'Choisir une catégorie…' : 'Ex. Ménage, Internet…'}
                error={categoryError}
                onChange={(id, cat) => {
                  setCategoryId(id);
                  setCategoryError('');
                  if (cat && !name.trim()) setName(cat.name);
                }}
              />
              <p className="sub" style={{ margin: '6px 0 0', fontSize: 12 }}>
                Charges uniquement — « Ménage » (pas « Ménage payant », réservé au service guest).
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
                <RecurringCatchUpFields
                  schedule={schedule}
                  selectedDates={catchUpDates}
                  onChange={setCatchUpDates}
                  perStayMonths={perStayMonths}
                  onPerStayMonthsChange={setPerStayMonths}
                />
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
                <div className="flabel">
                  Listing <span className="req">*</span>
                </div>
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
  const [categoryError, setCategoryError] = useState('');
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
  const catchUpDefaults = useMemo(() => proposeCatchUpOptions(schedule, 6).map((o) => o.isoDate), [schedule]);
  const [catchUpDates, setCatchUpDates] = useState<string[]>(catchUpDefaults);
  const [perStayMonths, setPerStayMonths] = useState(6);
  useEffect(() => {
    setCatchUpDates(catchUpDefaults);
  }, [catchUpDefaults]);
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
      setCategoryError('Sélectionnez une catégorie — champ obligatoire');
      toast.warn('Sélectionnez une catégorie');
      return;
    }
    setCategoryError('');
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
    if (schedule.frequency === 'per_stay' && association.scopeType !== 'listing') {
      toast.warn('Par séjour : choisissez le rattachement Listing(s)');
      return;
    }
    const cat = categories.find((c) => c._id === categoryId);
    setSaving(true);
    try {
      const isPerStay = schedule.frequency === 'per_stay';
      const created = await createRecurringTemplate(
        {
          name: name.trim() || cat?.name || 'Récurrent',
          amount: amountNum,
          currency: 'MAD',
          categoryId,
          paidBy,
          ...buildRecurringScopeBody(association),
          ...buildRecurringApiBody(schedule),
          ...(isPerStay
            ? { catchUpLastMonths: perStayMonths, catchUpPerStay: perStayMonths > 0 }
            : { catchUpDates }),
        },
        { ownerId },
      );
      const n = created?.catchUpCreated ?? 0;
      toast.success(
        n > 0
          ? isPerStay
            ? `Règle par séjour créée — ${n} ligne${n > 1 ? 's' : ''} (résas déjà liées).`
            : `Récurrence créée — ${n} ligne${n > 1 ? 's' : ''} de rattrapage. Liez-les aux résas dans le journal.`
          : isPerStay
            ? 'Règle par séjour créée — les prochaines résas Completed généreront la ligne.'
            : 'Récurrence créée',
      );
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
              <div className="inote info" style={{ marginBottom: 16 }}>
                <span className="i">🔁</span>
                <b>
                  {(() => {
                    const n = recurring.filter((r) => r.enabled !== false).length;
                    return `${n} active${n > 1 ? 's' : ''}`;
                  })()}
                </b>
                {' — '}
                les modèles ne sont pas listés ici. Les lignes apparaissent dans le journal après génération.
              </div>
            )}
            <div className="flabel">Nouvelle récurrence</div>
            <div className="fgrp">
              <div className="flabel">
                Libellé <span className="opt">(optionnel)</span>
              </div>
              <input
                className="fin"
                placeholder="Ex. Fibre Orange — laissez vide pour reprendre la catégorie"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="fgrp">
              <div className="flabel">
                Catégorie <span className="req">*</span>
              </div>
              <CategorySelect
                categories={categories}
                value={categoryId}
                required
                kinds={['expense']}
                placeholder="Ex. Ménage, Internet…"
                error={categoryError}
                onChange={(id, cat) => {
                  setCategoryId(id);
                  setCategoryError('');
                  if (cat && !name.trim()) setName(cat.name);
                }}
              />
              <p className="sub" style={{ margin: '6px 0 0', fontSize: 12 }}>
                Choisissez <b>Ménage</b> pour le coût par séjour — pas « Ménage payant ».
              </p>
            </div>
            <div className="fgrp">
              <div className="flabel">
                Montant <span className="req">*</span>
              </div>
              <input
                className="fin"
                placeholder="Ex. 280"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <RecurringScheduleFields
              value={schedule}
              onChange={(patch) => {
                setSchedule((prev) => ({ ...prev, ...patch }));
                if (patch.frequency === 'per_stay') {
                  setAssociation((prev) => ({ ...prev, scopeType: 'listing' }));
                }
              }}
            />
            <RecurringCatchUpFields
              schedule={schedule}
              selectedDates={catchUpDates}
              onChange={setCatchUpDates}
              perStayMonths={perStayMonths}
              onPerStayMonthsChange={setPerStayMonths}
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
              l&apos;échéance générée (bouton 📎). Puis associez une réservation si besoin.
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
  const [categoryError, setCategoryError] = useState('');
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
    setCategoryError('');
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
      setCategoryError('Sélectionnez une catégorie (ex. Ménage ou Autre)');
      toast.warn('Sélectionnez une catégorie');
      return;
    }
    setCategoryError('');
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
            <div className="fgrp">
              <div className="flabel">
                Catégorie <span className="req">*</span>
              </div>
              <CategorySelect
                categories={categories}
                value={categoryId}
                required
                kinds={entry.type === 'extra' ? ['extra', 'expense'] : ['expense']}
                placeholder="Ex. Ménage, Internet…"
                error={categoryError}
                onChange={(id, cat) => {
                  setCategoryId(id);
                  setCategoryError('');
                  if (cat && !name.trim()) setName(cat.name);
                }}
              />
            </div>
            <div className="frow c2">
              <div className="fgrp">
                <div className="flabel">
                  Montant <span className="req">*</span>
                </div>
                <input className="fin" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="fgrp">
                <div className="flabel">
                  Date <span className="req">*</span>
                </div>
                <input className="fin" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
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
              <div className="flabel">
                Listing <span className="req">*</span>
              </div>
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
              variant="gallery"
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
