import React from 'react';

export default function DistributionHeader({ summary, onRefresh, loading, apiUnavailable }) {
  const s = summary || {};
  return (
    <div className="distribution-header">
      <div className="distribution-header-top">
        <h1 className="distribution-title">Distribution</h1>
        <button
          type="button"
          className="distribution-refresh"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? 'Chargement…' : 'Rafraîchir'}
        </button>
      </div>
      {apiUnavailable ? (
        <p className="distribution-header-api-down">
          Grille canal manager non chargée — utilisez les actions ci-dessous ou rafraîchir après déploiement
          srv-listing.
        </p>
      ) : null}
      <div className={`distribution-kpis ${apiUnavailable ? 'distribution-kpis-hidden' : ''}`}>
        <div className="kpi">
          <span className="kpi-value">{s.totalProperties ?? 0}</span>
          <span className="kpi-label">Propriétés</span>
        </div>
        <div className="kpi kpi-connections">
          <span className="kpi-value">{s.totalConnections ?? 0}</span>
          <span className="kpi-label">Connexions</span>
        </div>
        <div className="kpi kpi-online">
          <span className="kpi-value">{s.online ?? 0}</span>
          <span className="kpi-label">En ligne</span>
        </div>
        <div className="kpi kpi-pending">
          <span className="kpi-value">{s.pending ?? 0}</span>
          <span className="kpi-label">Attente</span>
        </div>
        <div className="kpi kpi-error">
          <span className="kpi-value">{s.errors ?? 0}</span>
          <span className="kpi-label">Erreurs</span>
        </div>
        <div className="kpi kpi-none">
          <span className="kpi-value">{s.notConnected ?? 0}</span>
          <span className="kpi-label">Non connecté</span>
        </div>
      </div>
      <style>{`
        .distribution-header { padding: 20px 24px; background: #fff; border-bottom: 1px solid #E0E0E0; }
        .distribution-header-api-down {
          margin: 0 0 12px 0; font-size: 13px; color: #6b7280; line-height: 1.4; max-width: 640px;
        }
        .distribution-kpis-hidden { display: none !important; }
        .distribution-header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .distribution-title { margin: 0; font-size: 22px; font-weight: 600; color: #333; }
        .distribution-refresh { padding: 8px 16px; border-radius: 8px; border: 1px solid #FF6B35; background: #fff; color: #FF6B35; font-weight: 500; cursor: pointer; }
        .distribution-refresh:hover:not(:disabled) { background: #FF6B35; color: #fff; }
        .distribution-refresh:disabled { opacity: 0.6; cursor: not-allowed; }
        .distribution-kpis { display: flex; flex-wrap: wrap; gap: 16px; }
        .kpi { padding: 12px 20px; background: #FAFAFA; border-radius: 12px; min-width: 100px; text-align: center; }
        .kpi-value { display: block; font-size: 24px; font-weight: 700; color: #333; }
        .kpi-label { font-size: 12px; color: #666; }
        .kpi-connections .kpi-value { color: #0369a1; }
        .kpi-online .kpi-value { color: #166534; }
        .kpi-pending .kpi-value { color: #854D0E; }
        .kpi-error .kpi-value { color: #991B1B; }
        .kpi-none .kpi-value { color: #9E9E9E; }
      `}</style>
    </div>
  );
}
