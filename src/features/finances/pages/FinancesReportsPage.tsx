import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../../../components/DashboardWrapper';
import { FinancesModule, useFinancesAccess } from '../FinancesModule';
import { deleteProfitReport, generateProfitReport, listProfitReports } from '../financesApi';
import { useFinancesOwnerScope } from '../useFinancesOwnerScope';
import { listLandlords } from '../landlordApi';
import { getListings } from '../../listing/services/serverApi.listing';
import type { LandlordAccount, ProfitReport } from '../types';
import { formatPeriod, formatShortDate, personName } from '../utils/format';
import { listingsForLandlord, type ListingRow } from '../utils/recurringScope';
import { ReportColumnConfigPanel } from '../components/ReportColumnConfigPanel';
import { defaultProfitReportColumnConfig } from '../utils/profitReportColumns';

export function FinancesReportsPage() {
  return (
    <DashboardWrapper breadcrumb={['Finances', 'Rapports P&L']} hidePageHeader>
      <FinancesModule>
        <FinancesReportsPageContent />
      </FinancesModule>
    </DashboardWrapper>
  );
}

function FinancesReportsPageContent() {
  const navigate = useNavigate();
  const { canWrite, isLandlord } = useFinancesAccess();
  const { ownerId, needsOwnerPick } = useFinancesOwnerScope();
  const [rows, setRows] = useState<ProfitReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    if (needsOwnerPick) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await listProfitReports({ ownerId }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [ownerId, needsOwnerPick]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const handleDelete = async (row: ProfitReport) => {
    const label = row.status === 'published' ? 'publié' : 'brouillon';
    if (
      !window.confirm(
        `Supprimer le rapport ${label} « ${row.name} » ?\nIl disparaîtra de la liste (non récupérable ici).`,
      )
    ) {
      return;
    }
    setDeletingId(row._id);
    try {
      await deleteProfitReport(row._id, { ownerId });
      toast.success('Rapport supprimé');
      setRows((prev) => prev.filter((r) => r._id !== row._id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Suppression impossible');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
        <div className="ph">
          <div>
            <h1>Rapports P&amp;L</h1>
            <p className="sub">
              Vue <b>PM</b> (tous listings choisis) ou <b>propriétaire</b> (contrat + annonces du bailleur) — brouillon
              modifiable, publication figée.
            </p>
          </div>
          {canWrite && (
            <div className="ph-actions">
              <Link className="btn btn-ghost pm-only" to="/finances/branding">
                En-tête & logo P&L
              </Link>
              <button type="button" className="btn btn-prim pm-only" onClick={() => setWizardOpen(true)}>
                + Générer un rapport
              </button>
            </div>
          )}
        </div>

        {isLandlord && (
          <div className="ro-banner">
            <div className="ic">👁</div>
            <div>
              Vous consultez les rapports <b>publiés</b> par votre gestionnaire. Lecture et téléchargement HTML uniquement.
            </div>
          </div>
        )}

        {needsOwnerPick && (
          <div className="inote info">
            <span className="i">ℹ️</span>
            Sélectionnez un <b>propriétaire PM</b> dans la barre du haut pour afficher les rapports P&amp;L.
          </div>
        )}

        <div className="toolbar">
          <div className="search-in">
            <span>🔎</span>
            <input placeholder="Nom du rapport…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="empty">
              <div className="spinner" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <div className="em">📊</div>
              <div className="t">Aucun rapport</div>
              {canWrite && (
                <button type="button" className="btn btn-prim" onClick={() => setWizardOpen(true)}>
                  Générer le premier rapport
                </button>
              )}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Rapport</th>
                  <th>Période</th>
                  <th className="num">Listings</th>
                  <th>Statut</th>
                  <th className="num">Net propriétaire</th>
                  {canWrite ? <th /> : <th />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const net = row.snapshot?.grandTotal ?? row.snapshot?.metrics?.find((m) => m.key === 'net_to_landlord')?.value;
                  const scopeLabel = row.landlordId ? 'Propriétaire' : 'PM';
                  return (
                    <tr key={row._id} className="clk" onClick={() => navigate(`/finances/reports/${row._id}`)}>
                      <td>
                        <div className="cell-main">{row.name}</div>
                        <div className="cell-sub">
                          {scopeLabel}
                          {' · '}
                          {row.status === 'published' && row.publishedAt
                            ? `publié le ${formatShortDate(row.publishedAt)}`
                            : 'brouillon'}
                        </div>
                      </td>
                      <td className="mono">{formatPeriod(row.periodStart, row.periodEnd)}</td>
                      <td className="num">
                        <b>{row.listingIds?.length ?? '—'}</b>
                      </td>
                      <td>
                        <span className={`bdg ${row.status === 'published' ? 'green' : 'gold'}`}>
                          <span className="dot" />
                          {row.status === 'published' ? 'Publié' : 'Brouillon'}
                        </span>
                      </td>
                      <td className="num amt" style={{ color: row.status === 'published' ? 'var(--pd)' : 'var(--t3)' }}>
                        {net != null ? Number(net).toLocaleString('fr-FR') : '—'}
                      </td>
                      <td className="ledger-actions-cell" onClick={(e) => e.stopPropagation()}>
                        {canWrite ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm ledger-action-btn"
                            title={row.status === 'published' ? 'Supprimer le rapport publié' : 'Supprimer le brouillon'}
                            disabled={deletingId === row._id}
                            onClick={() => void handleDelete(row)}
                          >
                            {deletingId === row._id ? '…' : '🗑'}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--t4)' }}>›</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {wizardOpen && (
          <ReportWizard
            ownerId={ownerId}
            needsOwnerPick={needsOwnerPick}
            onClose={() => setWizardOpen(false)}
            onCreated={(id) => {
              setWizardOpen(false);
              void load();
              navigate(`/finances/reports/${id}`);
            }}
          />
        )}
    </>
  );
}

function ReportWizard({
  ownerId,
  needsOwnerPick,
  onClose,
  onCreated,
}: {
  ownerId: string | null;
  needsOwnerPick: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState('');
  /** pm = tous listings du compte ; landlord = bailleur + ses annonces */
  const [scope, setScope] = useState<'pm' | 'landlord'>('landlord');
  const [landlordId, setLandlordId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [listingIds, setListingIds] = useState<string[]>([]);
  const [landlords, setLandlords] = useState<LandlordAccount[]>([]);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [columnConfig, setColumnConfig] = useState(defaultProfitReportColumnConfig);

  const selectedLandlord = useMemo(
    () => landlords.find((l) => l._id === landlordId),
    [landlords, landlordId],
  );

  const selectableListings = useMemo(() => {
    if (scope === 'pm') return listings;
    return listingsForLandlord(listings, selectedLandlord);
  }, [scope, listings, selectedLandlord]);

  useEffect(() => {
    if (needsOwnerPick || !ownerId) {
      setLandlords([]);
      setListings([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setListingsLoading(true);
      try {
        const [ll, ls] = await Promise.all([
          listLandlords('', ownerId),
          getListings({
            page: 0,
            limit: 500,
            staging: false,
            compact: true,
            filterOwnerId: ownerId,
          }),
        ]);
        if (cancelled) return;
        setLandlords(ll);
        const rows = Array.isArray(ls?.data?.data) ? ls.data.data : [];
        setListings(rows);
      } catch {
        if (!cancelled) {
          setLandlords([]);
          setListings([]);
        }
      } finally {
        if (!cancelled) setListingsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerId, needsOwnerPick]);

  useEffect(() => {
    if (scope === 'pm') {
      setLandlordId('');
      const ids = listings.map((l) => String(l._id || l.id)).filter(Boolean);
      setListingIds(ids);
      return;
    }
    if (!selectedLandlord) {
      setListingIds([]);
      return;
    }
    const ids = listingsForLandlord(listings, selectedLandlord)
      .map((l) => String(l._id || l.id))
      .filter(Boolean);
    setListingIds(ids);
  }, [scope, landlordId, selectedLandlord, listings]);

  const toggleListing = (id: string) => {
    setListingIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAllListings = () => {
    setListingIds(selectableListings.map((l) => String(l._id || l.id)).filter(Boolean));
  };

  const clearListings = () => setListingIds([]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (needsOwnerPick) {
      toast.warn('Sélectionnez un propriétaire PM dans la barre du haut');
      return;
    }
    if (scope === 'landlord' && !landlordId) {
      toast.warn('Sélectionnez un propriétaire bailleur');
      return;
    }
    if (!listingIds.length) {
      toast.warn('Sélectionnez au moins un listing');
      return;
    }
    setSaving(true);
    try {
      const report = await generateProfitReport(
        {
          name,
          ...(scope === 'landlord' && landlordId ? { landlordId } : {}),
          periodStart,
          periodEnd,
          listingIds,
          currency: 'MAD',
          columnConfig,
        },
        { ownerId },
      );
      toast.success(scope === 'pm' ? 'Brouillon PM généré' : 'Brouillon propriétaire généré');
      onCreated(report?._id || '');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="scrim on" onClick={onClose} role="presentation" />
      <div className="modal on">
        <div className="modal-box wide">
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div className="dr-h">
              <div className="dt">
                <h2>Générer un rapport P&amp;L</h2>
              </div>
              <button type="button" className="dr-close" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="dr-b">
              {needsOwnerPick ? (
                <div className="inote info" style={{ margin: 0 }}>
                  <span className="i">ℹ️</span>
                  Sélectionnez un <b>propriétaire PM</b> dans la barre du haut avant de générer un rapport.
                </div>
              ) : (
                <>
                  <div className="fgrp">
                    <div className="flabel">
                      Périmètre <span className="req">*</span>
                    </div>
                    <div className="chips" style={{ marginBottom: 4 }}>
                      <button
                        type="button"
                        className={`chip ${scope === 'landlord' ? 'on' : ''}`}
                        onClick={() => setScope('landlord')}
                      >
                        Propriétaire (bailleur)
                      </button>
                      <button
                        type="button"
                        className={`chip ${scope === 'pm' ? 'on' : ''}`}
                        onClick={() => setScope('pm')}
                      >
                        PM (compte)
                      </button>
                    </div>
                    <p className="sub" style={{ margin: '4px 0 0', fontSize: 11 }}>
                      {scope === 'landlord'
                        ? 'Contrat du bailleur + listings liés à son compte. Visible côté propriétaire une fois publié.'
                        : 'Sans bailleur : tous les listings du PM (ou une sélection). Commission contrat proprio = 0.'}
                    </p>
                  </div>

                  <div className="frow c2">
                    <div className="fgrp">
                      <div className="flabel">
                        Nom du rapport <span className="req">*</span>
                      </div>
                      <input className="fin" value={name} onChange={(e) => setName(e.target.value)} required />
                    </div>
                    {scope === 'landlord' ? (
                      <div className="fgrp">
                        <div className="flabel">
                          Propriétaire <span className="req">*</span>
                        </div>
                        <select
                          className="fin"
                          value={landlordId}
                          onChange={(e) => setLandlordId(e.target.value)}
                          required
                        >
                          <option value="">— Choisir —</option>
                          {landlords.map((l) => (
                            <option key={l._id} value={l._id}>
                              {personName(l.firstName, l.lastName, l.email)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="fgrp">
                        <div className="flabel">Compte</div>
                        <div className="fin" style={{ display: 'flex', alignItems: 'center', opacity: 0.85 }}>
                          Vue PM — pas de bailleur
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="frow c2">
                    <div className="fgrp">
                      <div className="flabel">
                        Début <span className="req">*</span>
                      </div>
                      <input
                        className="fin"
                        type="date"
                        value={periodStart}
                        onChange={(e) => setPeriodStart(e.target.value)}
                        required
                      />
                    </div>
                    <div className="fgrp">
                      <div className="flabel">
                        Fin <span className="req">*</span>
                      </div>
                      <input
                        className="fin"
                        type="date"
                        value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="fgrp">
                    <div className="flabel" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span>
                        Listings <span className="req">*</span>{' '}
                        <span className="sub" style={{ fontWeight: 400 }}>
                          ({listingIds.length} sélectionné{listingIds.length > 1 ? 's' : ''})
                        </span>
                      </span>
                      {selectableListings.length > 0 && (
                        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={selectAllListings}>
                            Tout
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={clearListings}>
                            Aucun
                          </button>
                        </span>
                      )}
                    </div>
                    {scope === 'landlord' && !landlordId ? (
                      <div className="inote info" style={{ margin: 0 }}>
                        <span className="i">ℹ️</span>
                        Choisissez d&apos;abord un propriétaire — les annonces rattachées à son compte s&apos;affichent
                        ici.
                      </div>
                    ) : listingsLoading ? (
                      <div className="inote info" style={{ margin: 0 }}>
                        <span className="i">ℹ️</span>
                        Chargement des listings…
                      </div>
                    ) : selectableListings.length ? (
                      <div className="chips">
                        {selectableListings.map((l) => {
                          const id = String(l._id || l.id);
                          return (
                            <button
                              key={id}
                              type="button"
                              className={`chip ${listingIds.includes(id) ? 'on' : ''}`}
                              onClick={() => toggleListing(id)}
                            >
                              {l.name || l.title || id}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="inote warn" style={{ margin: 0 }}>
                        <span className="i">⚠️</span>
                        {scope === 'landlord'
                          ? 'Aucune annonce rattachée à ce propriétaire — éditez sa fiche (onglet Annonces) pour lier des listings.'
                          : 'Aucun listing sur ce compte PM.'}
                      </div>
                    )}
                  </div>
                  <div className="fgrp" style={{ marginTop: 8 }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setColumnsOpen((o) => !o)}>
                      {columnsOpen ? '▼' : '▶'} Colonnes du rapport (OTA, catégorie…)
                    </button>
                    {columnsOpen ? (
                      <div style={{ marginTop: 10 }}>
                        <ReportColumnConfigPanel value={columnConfig} onChange={setColumnConfig} />
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
            <div className="dr-f">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Annuler
              </button>
              <div style={{ flex: 1 }} />
              <button type="submit" className="btn btn-prim" disabled={saving || needsOwnerPick}>
                {saving ? 'Calcul…' : 'Enregistrer le brouillon'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default FinancesReportsPage;
