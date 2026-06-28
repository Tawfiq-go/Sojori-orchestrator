import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../../../components/DashboardWrapper';
import { FinancesModule, useFinancesAccess } from '../FinancesModule';
import { listLandlords } from '../landlordApi';
import { useFinancesOwnerScope } from '../useFinancesOwnerScope';
import type { LandlordAccount } from '../types';
import { contractBadge, initials, personName } from '../utils/format';
import { landlordListingCount } from '../utils/landlordListing';

export function FinancesLandlordsPage() {
  const navigate = useNavigate();
  const { canWrite } = useFinancesAccess();
  const { ownerId, needsOwnerPick } = useFinancesOwnerScope();
  const [rows, setRows] = useState<LandlordAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      if (needsOwnerPick) {
        setRows([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const landlords = await listLandlords(debouncedSearch, ownerId);
        if (controller.signal.aborted) return;
        setRows(landlords);
      } catch (e) {
        if (controller.signal.aborted) return;
        toast.error(e instanceof Error ? e.message : 'Chargement impossible');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [debouncedSearch, ownerId, needsOwnerPick]);

  const kpis = {
    active: rows.length,
    percent: rows.filter((r) => r.landlordContract?.type?.startsWith('percent')).length,
    listingsCount: rows.reduce((s, r) => s + landlordListingCount(r), 0),
  };

  const openCreate = () => navigate('/finances/landlords/new');
  const openEdit = (row: LandlordAccount) => navigate(`/finances/landlords/${row._id}`);

  return (
    <DashboardWrapper breadcrumb={['Finances', 'Propriétaires']}>
      <FinancesModule>
        <div className="ph">
          <div>
            <div className="eyebrow">Finances · /finances/landlords</div>
            <h1>Propriétaires</h1>
            <p className="sub">Les propriétaires de vos biens, leur contrat de gestion et leurs accès en lecture.</p>
          </div>
          {canWrite && (
            <div className="ph-actions">
              <button type="button" className="btn btn-prim" onClick={openCreate}>
                + Ajouter un propriétaire
              </button>
            </div>
          )}
        </div>

        {needsOwnerPick && (
          <div className="inote info" style={{ marginBottom: 16 }}>
            <span className="i">ℹ️</span>
            Sélectionnez un <b>propriétaire PM</b> dans la barre du haut pour afficher ses propriétaires immobiliers.
          </div>
        )}

        <div className="kpis">
          <div className="kpi">
            <div className="k">👤 Propriétaires actifs</div>
            <div className="v">{kpis.active}</div>
          </div>
          <div className="kpi gold">
            <div className="k">📄 Contrats au %</div>
            <div className="v">{kpis.percent}</div>
          </div>
          <div className="kpi">
            <div className="k">🏡 Listings rattachés</div>
            <div className="v">{kpis.listingsCount}</div>
          </div>
        </div>

        <div className="toolbar">
          <div className="search-in">
            <span>🔎</span>
            <input placeholder="Nom ou email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="empty">
              <div className="spinner" />
              <div className="t">Chargement…</div>
            </div>
          ) : rows.length === 0 ? (
            <div className="empty">
              <div className="em">👤</div>
              <div className="t">Aucun propriétaire</div>
              <div className="d">Ajoutez un propriétaire pour lier listings et rapports P&amp;L.</div>
              {canWrite && (
                <button type="button" className="btn btn-prim" onClick={openCreate}>
                  + Ajouter
                </button>
              )}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Propriétaire</th>
                  <th>Contact</th>
                  <th>Contrat</th>
                  <th className="num">Listings</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const badge = contractBadge(row.landlordContract);
                  return (
                    <tr key={row._id} className="clk" onClick={() => canWrite && openEdit(row)}>
                      <td>
                        <div className="who">
                          <div className="av-init">{initials(row.firstName, row.lastName)}</div>
                          <div>
                            <div className="cell-main">{personName(row.firstName, row.lastName)}</div>
                            <div className="cell-sub">{row.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="mono" style={{ fontSize: 11.5 }}>
                          {row.phone || '—'}
                        </div>
                      </td>
                      <td>
                        <span className={`bdg ${badge.tone}`}>{badge.label}</span>
                      </td>
                      <td className="num">
                        <b>{landlordListingCount(row)}</b>
                      </td>
                      <td>
                        <span className="bdg green">
                          <span className="dot" />
                          Actif
                        </span>
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
      </FinancesModule>
    </DashboardWrapper>
  );
}

export default FinancesLandlordsPage;
