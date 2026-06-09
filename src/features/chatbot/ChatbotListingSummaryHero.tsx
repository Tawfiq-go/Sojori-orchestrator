import React from 'react';
import { Link } from 'react-router-dom';
import FullChatbotSyncButton from '../../components/listing/FullChatbotSyncButton';
import {
  buildChatbotListingSummary,
  displayMetric,
  formatSummaryDate,
  type ChatbotListingSummary,
} from './chatbotListingSummary';

type Props = {
  listingId: string;
  formValues: Record<string, unknown>;
  rawDoc?: Record<string, unknown> | null;
  snapshotUpdatedAt?: string;
  menuOptionsCount?: number;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || '??').toUpperCase();
}

function SynthCell({
  icon,
  value,
  label,
  accent,
}: {
  icon: string;
  value: string;
  label: string;
  accent?: 'green';
}) {
  return (
    <div className="synth-cell">
      <span className="em">{icon}</span>
      <div className={`v${accent === 'green' ? ' green' : ''}`}>{value}</div>
      <div className="l">{label}</div>
    </div>
  );
}

function MetaLine({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`cb-summary-meta-line${className ? ` ${className}` : ''}`}>{children}</div>;
}

export default function ChatbotListingSummaryHero({
  listingId,
  formValues,
  rawDoc,
  snapshotUpdatedAt,
  menuOptionsCount = 0,
}: Props) {
  const s: ChatbotListingSummary = buildChatbotListingSummary(listingId, formValues, rawDoc);

  return (
    <div className="hero cb-listing-summary">
      <div className="hero-main">
        <div className="hero-identity">
          <div className="hero-guest">
            <div className="hero-av">{initials(s.name)}</div>
            <div className="hero-name">
              <div className="hero-title-row">
                <h1>{s.name}</h1>
                <span className={`state-pill${s.active ? ' progress' : ''}`}>
                  <span className="dot" />
                  {s.active ? 'ACTIF' : 'INACTIF'}
                </span>
              </div>
              <div className="meta">
                <b>{s.city || '—'}</b>
                {s.country ? ` · ${s.country}` : ''} · <span className="cb-mono">{s.listingId}</span>
              </div>
              <div className="hero-sub-state cb-summary-details">
                <MetaLine>
                  <strong>Type :</strong> {s.propertyType}
                  <span className="sep">·</span>
                  <strong>Unité :</strong> {s.propertyUnit}
                </MetaLine>
                {s.ownerName !== '—' && (
                  <MetaLine>
                    <strong>Propriétaire :</strong> {s.ownerName}
                  </MetaLine>
                )}
                {s.rentalUnitedLabel && (
                  <MetaLine className="ru">{s.rentalUnitedLabel}</MetaLine>
                )}
                <MetaLine>
                  <strong>Channel :</strong> {s.channelManager}
                </MetaLine>
                <MetaLine>
                  {snapshotUpdatedAt ? (
                    <>
                      <strong>Snapshot WA :</strong> {formatSummaryDate(snapshotUpdatedAt)}
                    </>
                  ) : null}
                  {snapshotUpdatedAt && s.listingUpdatedAt ? <span className="sep">·</span> : null}
                  {s.listingUpdatedAt ? (
                    <>
                      <strong>Maj listing :</strong> {formatSummaryDate(s.listingUpdatedAt)}
                    </>
                  ) : null}
                </MetaLine>
              </div>
            </div>
          </div>
          <div className="cb-summary-actions">
            <FullChatbotSyncButton listingId={listingId} variant="listing" size="small" />
            <Link to={`/listings/${listingId}?level=orchestration-v3`} className="cb-link">
              Orchestration ↗
            </Link>
            <Link to={`/listings/${listingId}?level=detail&tab=general`} className="cb-link cb-link--ghost">
              Détail listing ↗
            </Link>
          </div>
        </div>
      </div>

      <div className="synth synth--compact cb-summary-synth">
        <SynthCell icon="🏠" value={s.propertyType} label="Type" />
        <SynthCell icon="🛏️" value={displayMetric(s.bedrooms)} label="Chambres" />
        <SynthCell icon="🚿" value={displayMetric(s.bathrooms)} label="SDB" />
        <SynthCell icon="🛌" value={displayMetric(s.beds)} label="Lits" />
        <SynthCell icon="👥" value={displayMetric(s.maxGuests)} label="Cap. max" />
        <SynthCell
          icon="📐"
          value={s.surface != null ? `${s.surface}` : '—'}
          label="Surface m²"
        />
        <SynthCell
          icon="🏢"
          value={
            s.floor != null && s.totalFloors != null
              ? `${s.floor}/${s.totalFloors}`
              : displayMetric(s.floor ?? s.totalFloors)
          }
          label="Étage"
        />
        <SynthCell icon="📱" value={String(menuOptionsCount)} label="Menu WA" accent="green" />
      </div>
    </div>
  );
}
