// Bandeau — dernière synchro Dynamic Pricing (calendrier inventaire)
import React from 'react';
import { Link } from 'react-router-dom';
import { T } from './_shared';

function fmt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default function DpSyncAuditStrip({
  summary,
  listingNameById = {},
  selectedListingId,
  loading = false,
}) {
  if (loading) {
    return (
      <div
        style={{
          fontSize: 11,
          color: T.text3,
          padding: '6px 12px',
          borderRadius: 9,
          background: T.bg2,
          border: `1px solid ${T.border}`,
        }}
      >
        Chargement synchro Dynamic Pricing…
      </div>
    );
  }

  if (!summary?.fleetLast) {
    return (
      <div
        style={{
          fontSize: 11,
          color: T.text3,
          padding: '6px 12px',
          borderRadius: 9,
          background: T.bg2,
          border: `1px dashed ${T.border}`,
        }}
      >
        Aucune mise à jour Dynamic Pricing enregistrée pour ce portefeuille.
      </div>
    );
  }

  const fleet = summary.fleetLast;
  const fleetName = listingNameById[fleet.listingId] || fleet.listingId;
  const s = fleet.summary;
  const daysCal = s?.daysCalendarDatesUpdated ?? fleet.daysChanged ?? 0;
  const daysPrice = s?.daysPayloadPriceDays ?? 0;

  const selected = selectedListingId
    ? summary.byListing?.find((r) => r.listingId === selectedListingId)
    : null;

  const auditQs =
    summary.byListing?.length > 0
      ? `?listingIds=${summary.byListing.map((r) => r.listingId).join(',')}`
      : '';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        padding: '6px 12px',
        borderRadius: 9,
        background: T.aiTint || 'rgba(124,58,237,0.06)',
        border: `1px solid ${T.ai || '#7c3aed'}33`,
        fontSize: 11,
        color: T.text2,
        flex: '1 1 280px',
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 800, color: T.ai || '#7c3aed' }}>⚡ DP</span>
      <span>
        Dernière synchro <b style={{ color: T.text }}>{fmt(fleet.appliedAt)}</b>
        {fleetName ? (
          <>
            {' '}
            · <span style={{ fontFamily: '"Geist Mono", monospace' }}>{fleetName}</span>
          </>
        ) : null}
      </span>
      <span style={{ fontFamily: '"Geist Mono", monospace', fontWeight: 700, color: T.text }}>
        {summary.aggregates?.listingsWithApply ?? 0} bien(s) · {daysCal} j. cal. maj.
        {daysPrice > 0 ? ` · ${daysPrice} prix` : ''}
      </span>
      {selected?.summary && (
        <span
          style={{
            fontSize: 10.5,
            background: T.bg1,
            padding: '2px 8px',
            borderRadius: 99,
            border: `1px solid ${T.border}`,
          }}
        >
          Sélection :{' '}
          {selected.summary.daysCalendarDatesUpdated ?? selected.daysChanged ?? 0} j.
        </span>
      )}
      <Link
        to={`/dynamic-pricing/audit${auditQs}`}
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: T.primaryDeep || T.primary,
          textDecoration: 'none',
          marginLeft: 'auto',
        }}
      >
        Audit complet →
      </Link>
    </div>
  );
}
