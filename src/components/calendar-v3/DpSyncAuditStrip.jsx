// Bandeau — dernière synchro Dynamic Pricing (calendrier inventaire)
import React, { useState } from 'react';
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

function fmtShort(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const shellBase = {
  borderRadius: 9,
  background: T.aiTint || 'rgba(124,58,237,0.06)',
  border: `1px solid ${T.ai || '#7c3aed'}33`,
  fontSize: 11,
  color: T.text2,
  minWidth: 0,
};

export default function DpSyncAuditStrip({
  summary,
  listingNameById = {},
  selectedListingId,
  loading = false,
  compact = false,
}) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div
        style={{
          ...shellBase,
          padding: compact ? '8px 10px' : '6px 12px',
          fontSize: 11,
          color: T.text3,
          background: T.bg2,
          border: `1px solid ${T.border}`,
          flex: compact ? '1 1 0' : '1 1 280px',
        }}
      >
        Chargement synchro DP…
      </div>
    );
  }

  if (!summary?.fleetLast) {
    return (
      <div
        style={{
          ...shellBase,
          padding: compact ? '8px 10px' : '6px 12px',
          color: T.text3,
          background: T.bg2,
          border: `1px dashed ${T.border}`,
          flex: compact ? '1 1 0' : '1 1 280px',
        }}
      >
        Aucune synchro Dynamic Pricing enregistrée.
      </div>
    );
  }

  const fleet = summary.fleetLast;
  const fleetName = listingNameById[fleet.listingId] || fleet.listingId;
  const s = fleet.summary;
  const daysCal = s?.daysCalendarDatesUpdated ?? fleet.daysChanged ?? 0;
  const daysPrice = s?.daysPayloadPriceDays ?? 0;
  const listingCount = summary.aggregates?.listingsWithApply ?? 0;

  const selected = selectedListingId
    ? summary.byListing?.find((r) => r.listingId === selectedListingId)
    : null;

  const auditQs =
    summary.byListing?.length > 0
      ? `?listingIds=${summary.byListing.map((r) => r.listingId).join(',')}`
      : '';

  const statsLine = `${listingCount} bien(s) · ${daysCal} j. cal. maj.${
    daysPrice > 0 ? ` · ${daysPrice} prix` : ''
  }`;

  const auditLink = (
    <Link
      to={`/dynamic-pricing/audit${auditQs}`}
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: T.primaryDeep || T.primary,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      Audit →
    </Link>
  );

  if (compact && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-expanded={false}
        aria-label="Détails synchro Dynamic Pricing"
        style={{
          ...shellBase,
          flex: '1 1 0',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          textAlign: 'left',
          width: '100%',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 800, color: T.ai || '#7c3aed', flexShrink: 0 }}>
          ⚡ DP
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 600,
          }}
        >
          {fmtShort(fleet.appliedAt)} · {statsLine}
        </span>
        <span style={{ fontSize: 9, color: T.text4, flexShrink: 0 }}>▾</span>
      </button>
    );
  }

  return (
    <div
      style={{
        ...shellBase,
        display: 'flex',
        flexDirection: compact ? 'column' : 'row',
        alignItems: compact ? 'stretch' : 'center',
        gap: compact ? 6 : 10,
        flexWrap: compact ? 'nowrap' : 'wrap',
        padding: compact ? '8px 10px' : '6px 12px',
        flex: compact ? '1 1 0' : '1 1 280px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          flexWrap: 'wrap',
          minWidth: 0,
          flex: 1,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 800, color: T.ai || '#7c3aed', flexShrink: 0 }}>
          ⚡ DP
        </span>
        <span style={{ minWidth: 0, lineHeight: 1.4 }}>
          Dernière synchro <b style={{ color: T.text }}>{fmt(fleet.appliedAt)}</b>
          {fleetName ? (
            <>
              {' '}
              ·{' '}
              <span
                style={{
                  fontFamily: '"Geist Mono", monospace',
                  wordBreak: 'break-word',
                }}
              >
                {fleetName}
              </span>
            </>
          ) : null}
        </span>
        <span
          style={{
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 700,
            color: T.text,
            lineHeight: 1.4,
          }}
        >
          {statsLine}
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
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
          marginLeft: compact ? 0 : 'auto',
          justifyContent: compact ? 'space-between' : 'flex-end',
        }}
      >
        {auditLink}
        {compact ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Réduire le bandeau DP"
            style={{
              border: 0,
              background: T.bg1,
              color: T.text3,
              fontSize: 10,
              fontWeight: 700,
              padding: '4px 8px',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Réduire
          </button>
        ) : null}
      </div>
    </div>
  );
}
