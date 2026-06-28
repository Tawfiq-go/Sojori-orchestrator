import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../../../components/DashboardWrapper';
import { FinancesModule, useFinancesAccess } from '../FinancesModule';
import {
  createLedgerBundle,
  createLedgerEntry,
  createRecurringTemplate,
  listExpenseCategories,
  listLedgerEntries,
  listRecurringTemplates,
} from '../financesApi';
import { useFinancesOwnerScope } from '../useFinancesOwnerScope';
import { getListings, getOneListing } from '../../listing/services/serverApi.listing';
import type { ExpenseCategory, LedgerEntry, RecurringTemplate } from '../types';
import { formatMoney, formatShortDate, paidByLabel } from '../utils/format';
import { CategorySelect, categoryNameById } from '../utils/expenseCategories.tsx';
import { SearchSelect } from '../utils/financesSearchSelect.tsx';
import {
  buildRecurringApiBody,
  RecurringScheduleFields,
  type RecurringScheduleValue,
} from '../components/RecurringScheduleFields';
import {
  describeRecurringSchedule,
  formatNextRunAt,
  type RecurringFrequency,
} from '../utils/recurringSchedule.tsx';

type ListingRow = { _id?: string; id?: string; name?: string; title?: string };

export function FinancesLedgerPage() {
  const { canWrite, isLandlord } = useFinancesAccess();
  const { ownerId, needsOwnerPick } = useFinancesOwnerScope();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [recurring, setRecurring] = useState<RecurringTemplate[]>([]);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [bundleOpen, setBundleOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);

  const loadListingsForPickers = async () => {
    setListingsLoading(true);
    try {
      const result = await getListings({
        page: 0,
        limit: 200,
        staging: false,
        useActiveFilter: true,
        active: true,
        compact: true,
      });
      const rows = Array.isArray(result?.data?.data) ? result.data.data : [];
      setListings(rows);
    } catch {
      setListings([]);
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
          const row = await getOneListing(id, false);
          if (row?.name || row?.title) {
            setListings((prev) => {
              if (prev.some((l) => String(l._id || l.id) === id)) return prev;
              return [...prev, { _id: id, name: row.name || row.title }];
            });
          }
        } catch {
          /* ignore */
        }
      }),
    );
  };

  const load = async () => {
    if (needsOwnerPick) {
      setEntries([]);
      setCategories([]);
      setRecurring([]);
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const scope = { ownerId };
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const [entriesRes, catsRes, recRes] = await Promise.allSettled([
      listLedgerEntries({ startDate: start, endDate: end, limit: 200 }, scope),
      listExpenseCategories(scope),
      canWrite ? listRecurringTemplates(scope) : Promise.resolve([]),
    ]);

    const errors: string[] = [];
    if (entriesRes.status === 'fulfilled') {
      setEntries(entriesRes.value);
      void hydrateListingLabels(entriesRes.value);
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

    setLoading(false);
    if (errors.length) toast.error(errors[0]);
  };

  useEffect(() => {
    void load();
  }, [ownerId, needsOwnerPick]);

  const ensureListingsForDrawer = () => {
    if (listings.length > 0 || listingsLoading) return;
    void loadListingsForPickers();
  };

  const openExpense = () => {
    ensureListingsForDrawer();
    setExpenseOpen(true);
  };
  const openBundle = () => {
    ensureListingsForDrawer();
    setBundleOpen(true);
  };
  const openRecurring = () => {
    ensureListingsForDrawer();
    setRecurringOpen(true);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.name?.toLowerCase().includes(q) || e.categoryLabel?.toLowerCase().includes(q));
  }, [entries, search]);

  const kpis = useMemo(() => {
    const expenses = filtered.filter((e) => e.type === 'expense');
    const extras = filtered.filter((e) => e.type === 'extra');
    const expTotal = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const extraTotal = extras.reduce((s, e) => s + Number(e.amount || 0), 0);
    return { expTotal, extraTotal, expCount: expenses.length, extraCount: extras.length, recurring: recurring.filter((r) => r.enabled !== false).length };
  }, [filtered, recurring]);

  const listingLabel = (id?: string) => {
    if (!id) return '—';
    const row = listings.find((l) => String(l._id || l.id) === id);
    return row?.name || row?.title || id.slice(-6);
  };

  return (
    <DashboardWrapper breadcrumb={['Finances', 'Dépenses & extras']}>
      <FinancesModule>
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
        </div>

        <div className="card">
          {loading ? (
            <div className="empty">
              <div className="spinner" />
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Libellé</th>
                  <th>Type</th>
                  <th className="num">Montant</th>
                  <th>Catégorie</th>
                  <th>Listing</th>
                  <th>Payé par</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row._id}>
                    <td className="mono">{formatShortDate(row.date)}</td>
                    <td className="cell-main">{row.name}</td>
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
                    <td>
                      <div className="cell-main" style={{ fontSize: 12 }}>
                        {listingLabel(row.listingId)}
                      </div>
                    </td>
                    <td>
                      <span className="bdg info">{paidByLabel(row.paidBy)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {expenseOpen && (
          <ExpenseDrawer
            categories={categories}
            listings={listings}
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
            recurring={recurring}
            onClose={() => setRecurringOpen(false)}
            onSaved={() => {
              setRecurringOpen(false);
              void load();
            }}
          />
        )}
      </FinancesModule>
    </DashboardWrapper>
  );
}

function ExpenseDrawer({
  categories,
  listings,
  onClose,
  onSaved,
}: {
  categories: ExpenseCategory[];
  listings: ListingRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<'expense' | 'extra'>('expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState('');
  const [paidBy, setPaidBy] = useState<'pm' | 'landlord' | 'guest'>('pm');
  const [listingId, setListingId] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!listingId) {
      toast.warn('Sélectionnez un listing');
      return;
    }
    setSaving(true);
    try {
      const cat = categories.find((c) => c._id === categoryId);
      await createLedgerEntry({
        type,
        name,
        amount: Number(amount) || 0,
        currency: 'MAD',
        date,
        categoryId: categoryId || undefined,
        categoryLabel: cat?.name,
        paidBy,
        collectedBy: type === 'extra' ? 'pm' : undefined,
        listingId,
      });
      toast.success('Ligne enregistrée');
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
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
              <div className="flabel">
                Libellé <span className="req">*</span>
              </div>
              <input className="fin" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="frow c2">
              <div className="fgrp">
                <div className="flabel">Montant</div>
                <input className="fin" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="fgrp">
                <div className="flabel">Date</div>
                <input className="fin" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="fgrp">
              <div className="flabel">Catégorie</div>
              <CategorySelect
                categories={categories}
                value={categoryId}
                onChange={(id) => setCategoryId(id)}
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
              Enregistrer
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

function BundleDrawer({
  listings,
  onClose,
  onSaved,
}: {
  listings: ListingRow[];
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
    if (!listingId) {
      toast.warn('Sélectionnez un listing');
      return;
    }
    setSaving(true);
    try {
      await createLedgerBundle({
        name,
        listingId,
        lines: [
          { type: 'extra', amount: Number(inAmount) || 0, transactionRole: 'revenue', paidBy: 'guest', collectedBy: 'pm' },
          { type: 'expense', amount: Number(outAmount) || 0, transactionRole: 'cost', paidBy: 'pm', supplier },
        ],
      });
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
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
  recurring,
  onClose,
  onSaved,
}: {
  categories: ExpenseCategory[];
  listings: ListingRow[];
  recurring: RecurringTemplate[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [listingIds, setListingIds] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [lastDayOfMonth, setLastDayOfMonth] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [saving, setSaving] = useState(false);

  const schedulePreview = describeRecurringSchedule({
    frequency,
    dayOfMonth,
    lastDayOfMonth,
    dayOfWeek,
  });

  const toggleListing = (id: string) => {
    setListingIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      toast.warn('Sélectionnez une catégorie');
      return;
    }
    if (!listingIds.length) {
      toast.warn('Sélectionnez au moins un listing');
      return;
    }
    const cat = categories.find((c) => c._id === categoryId);
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim() || cat?.name || 'Récurrent',
        amount: Number(amount) || 0,
        currency: 'MAD',
        categoryId,
        listingIds,
        frequency,
        paidBy: 'landlord',
      };
      if (frequency === 'weekly') {
        body.dayOfWeek = dayOfWeek;
      } else if (frequency === 'monthly') {
        body.lastDayOfMonth = lastDayOfMonth;
        if (!lastDayOfMonth) body.dayOfMonth = dayOfMonth;
      }
      await createRecurringTemplate(body);
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
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                            {categoryNameById(categories, r.categoryId)} · {describeRecurringSchedule(r)}
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
                required
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
              <input className="fin" placeholder="Montant" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="fgrp">
              <div className="flabel">Fréquence</div>
              <select
                className="fin"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
              >
                {FREQUENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {frequency === 'monthly' && (
              <div className="fgrp">
                <div className="flabel">Jour du mois</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={lastDayOfMonth}
                    onChange={(e) => setLastDayOfMonth(e.target.checked)}
                  />
                  Dernier jour du mois (28–31 selon le mois)
                </label>
                {!lastDayOfMonth && (
                  <select className="fin" value={dayOfMonth} onChange={(e) => setDayOfMonth(Number(e.target.value))}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Le {d} de chaque mois
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            {frequency === 'weekly' && (
              <div className="fgrp">
                <div className="flabel">Jour de la semaine</div>
                <select className="fin" value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}>
                  {WEEKDAY_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {frequency === 'yearly' && (
              <p style={{ fontSize: 12.5, color: 'var(--t3)', margin: '0 0 16px', lineHeight: 1.45 }}>
                La dépense sera générée chaque année à la même date (jour et mois du premier passage).
              </p>
            )}
            <p style={{ fontSize: 12.5, color: 'var(--t3)', margin: '0 0 16px', lineHeight: 1.45 }}>
              Une seule récurrence = une ligne automatique dans le journal à chaque échéance ({schedulePreview}
              ). Si plusieurs listings sont cochés, une ligne par listing à chaque passage.
            </p>
            <div className="fgrp">
              <div className="flabel">Listings concernés</div>
              <div className="chips">
                {listings.map((l) => {
                  const id = String(l._id || l.id);
                  return (
                    <button key={id} type="button" className={`chip ${listingIds.includes(id) ? 'on' : ''}`} onClick={() => toggleListing(id)}>
                      {l.name || l.title || id}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="dr-f">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Fermer
            </button>
            <div style={{ flex: 1 }} />
            <button type="submit" className="btn btn-prim" disabled={saving}>
              Ajouter
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

export default FinancesLedgerPage;
