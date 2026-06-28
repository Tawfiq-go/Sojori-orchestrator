import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../../../components/DashboardWrapper';
import { FinancesModule, useFinancesAccess } from '../FinancesModule';
import { generateProfitReport, listProfitReports } from '../financesApi';
import { useFinancesOwnerScope } from '../useFinancesOwnerScope';
import { listLandlords } from '../landlordApi';
import { getListings } from '../../listing/services/serverApi.listing';
import type { LandlordAccount, ProfitReport } from '../types';
import { formatPeriod, formatShortDate, personName } from '../utils/format';

export function FinancesReportsPage() {
  const navigate = useNavigate();
  const { canWrite, isLandlord } = useFinancesAccess();
  const { ownerId, needsOwnerPick } = useFinancesOwnerScope();
  const [rows, setRows] = useState<ProfitReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);

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

  return (
    <DashboardWrapper breadcrumb={['Finances', 'Rapports P&L']}>
      <FinancesModule>
        <div className="ph">
          <div>
            <div className="eyebrow">Finances · /finances/reports</div>
            <h1>Rapports P&amp;L</h1>
            <p className="sub">Compte de résultat par propriétaire et par période. Brouillon, puis publication figée.</p>
          </div>
          {canWrite && (
            <div className="ph-actions">
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
          <div className="inote info" style={{ marginBottom: 16 }}>
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
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const net = row.snapshot?.grandTotal ?? row.snapshot?.metrics?.find((m) => m.key === 'net_to_landlord')?.value;
                  return (
                    <tr key={row._id} className="clk" onClick={() => navigate(`/finances/reports/${row._id}`)}>
                      <td>
                        <div className="cell-main">{row.name}</div>
                        <div className="cell-sub">{row.status === 'published' && row.publishedAt ? `publié le ${formatShortDate(row.publishedAt)}` : 'brouillon'}</div>
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
                      <td>
                        <span style={{ color: 'var(--t4)' }}>›</span>
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
            onClose={() => setWizardOpen(false)}
            onCreated={(id) => {
              setWizardOpen(false);
              void load();
              navigate(`/finances/reports/${id}`);
            }}
          />
        )}
      </FinancesModule>
    </DashboardWrapper>
  );
}

function ReportWizard({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [landlordId, setLandlordId] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [listingIds, setListingIds] = useState<string[]>([]);
  const [landlords, setLandlords] = useState<LandlordAccount[]>([]);
  const [listings, setListings] = useState<Array<{ _id?: string; id?: string; name?: string; title?: string; landlordId?: string }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [ll, ls] = await Promise.all([
          listLandlords(),
          getListings({ page: 0, limit: 500, paged: false, staging: false }),
        ]);
        setLandlords(ll);
        const rows = ls?.data?.listings ?? ls?.listings ?? [];
        setListings(Array.isArray(rows) ? rows : []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    if (!landlordId) return;
    const ids = listings
      .filter((l) => String(l.landlordId || '') === landlordId)
      .map((l) => String(l._id || l.id))
      .filter(Boolean);
    setListingIds(ids);
  }, [landlordId, listings]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const report = await generateProfitReport({
        name,
        landlordId: landlordId || undefined,
        periodStart,
        periodEnd,
        listingIds,
        currency: 'MAD',
      });
      toast.success('Brouillon généré');
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
              <div className="frow c2">
                <div className="fgrp">
                  <div className="flabel">Nom du rapport</div>
                  <input className="fin" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="fgrp">
                  <div className="flabel">Propriétaire</div>
                  <select className="fin" value={landlordId} onChange={(e) => setLandlordId(e.target.value)}>
                    <option value="">—</option>
                    {landlords.map((l) => (
                      <option key={l._id} value={l._id}>
                        {personName(l.firstName, l.lastName)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="frow c3">
                <div className="fgrp">
                  <div className="flabel">Début</div>
                  <input className="fin" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
                </div>
                <div className="fgrp">
                  <div className="flabel">Fin</div>
                  <input className="fin" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
                </div>
                <div className="fgrp">
                  <div className="flabel">Listings</div>
                  <div className="fin sel">{listingIds.length} sélectionné(s)</div>
                </div>
              </div>
            </div>
            <div className="dr-f">
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Annuler
              </button>
              <div style={{ flex: 1 }} />
              <button type="submit" className="btn btn-prim" disabled={saving}>
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
