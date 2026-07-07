// ════════════════════════════════════════════════════════════════════
// TooltipBreakdown.jsx — cascade Sojori AI + prix actif (compact)
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { T, priceOf, isArchiveDay, hasInventoryData, resolvePriceMode, PRICE_MODE_LABEL } from './_shared';

function normalizeFactorLabel(label) {
  return String(label || '')
    .replace(/\(estimate\)/gi, '')
    .replace(/estimate/gi, 'marché')
    .replace(/\s+/g, ' ')
    .trim();
}

function PilotFactorsBlock({ history, currency }) {
  const factors = history?.pilotFactors ?? [];
  if (history?.source !== 'pilot-v2' && factors.length === 0) return null;

  return (
    <div style={{ marginBottom: 6, paddingBottom: 6, borderBottom: `1px solid ${T.border}` }}>
      <div style={{
        fontSize: 9, fontWeight: 800, color: T.ai, marginBottom: 4,
        fontFamily: '"Geist Mono", monospace', textTransform: 'uppercase',
      }}>
        Sojori AI · {history.mixEngineVersion ?? 'v2.4'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2px 10px' }}>
        {factors.map((f, i) => {
          const isBase = f.key === 'base';
          const label = isBase ? 'Prix marché' : normalizeFactorLabel(f.label);
          const after = f.after ?? (isBase ? history?.base : null);
          const valueText = isBase
            ? `${Math.round(after ?? f.valueMad ?? 0)} ${currency}`
            : `${(f.valueMad ?? 0) >= 0 ? '+' : ''}${Math.round(f.valueMad ?? 0)} ${currency}`;

          return (
            <React.Fragment key={`${f.key ?? i}`}>
              <span style={{ fontSize: 10, color: T.text2, fontWeight: 600 }}>{label}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, fontFamily: '"Geist Mono", monospace', textAlign: 'right',
                color: isBase ? T.text : (f.valueMad ?? 0) >= 0 ? T.success : T.error,
              }}>
                {valueText}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default function TooltipBreakdown({ inv, dateStr, currency = 'EUR', placement = 'left' }) {
  if (!inv || !hasInventoryData(inv)) return null;
  const history = inv.calculatedPriceHistory;
  const hasPilot =
    history?.source === 'pilot-v2' || (Array.isArray(history?.pilotFactors) && history.pilotFactors.length > 0);

  const baseInv = inv.basePrice ?? 0;
  const calc =
    inv.calculatedPrice != null && inv.calculatedPrice !== undefined ? inv.calculatedPrice : null;
  const man = inv.manualPrice != null && inv.manualPrice !== undefined ? inv.manualPrice : null;

  const mode = resolvePriceMode(inv);
  const manualActive = mode === 'manual';
  const dynamicActive = mode === 'dynamic';
  const total = priceOf(inv);

  const priceRows = [];
  if (calc != null) {
    priceRows.push({ key: 'dyn', label: 'Dynamique', value: `${calc.toFixed(0)} ${currency}`, active: dynamicActive, accent: T.ai });
  }
  if (man != null) {
    priceRows.push({ key: 'man', label: 'Manuel', value: `${man.toFixed(0)} ${currency}`, active: manualActive, accent: T.warning });
  }
  if (!hasPilot && baseInv > 0) {
    priceRows.push({
      key: 'base', label: 'Base', value: `${baseInv.toFixed(0)} ${currency}`,
      active: !dynamicActive && !manualActive, accent: T.text2,
    });
  }

  return (
    <div role="tooltip" style={{
      position: 'absolute', zIndex: 100,
      ...(placement === 'left'
        ? { right: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' }
        : { left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' }),
      minWidth: 220, maxWidth: 280,
      background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: `1px solid ${T.borderStrong}`, borderRadius: 10,
      padding: '10px 12px',
      boxShadow: '0 8px 28px rgba(20,17,10,0.14), 0 0 0 1px rgba(184,133,26,0.08)',
      animation: 'fadeIn 0.15s both',
      pointerEvents: 'none',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8,
        fontSize: 10, fontWeight: 700, color: T.text3,
        fontFamily: '"Geist Mono", monospace',
        letterSpacing: '0.04em', textTransform: 'uppercase',
        paddingBottom: 6, borderBottom: `1px solid ${T.border}`, marginBottom: 6,
      }}>
        <span>{dateStr}</span>
        <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>
          {inv.availableRoom != null ? `${inv.availableRoom} dispo` : ''}
          {isArchiveDay(inv) ? ' · hist.' : ''}
        </span>
      </div>

      <PilotFactorsBlock history={history} currency={currency} />

      {priceRows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3px 10px', marginBottom: 6 }}>
          {priceRows.map((row) => (
            <React.Fragment key={row.key}>
              <span style={{
                fontSize: 11, fontWeight: row.active ? 700 : 500,
                color: row.active ? row.accent : T.text4,
              }}>
                {row.label}
                {row.active ? (
                  <span style={{ marginLeft: 4, fontSize: 8, fontWeight: 800, color: row.accent }}>●</span>
                ) : null}
              </span>
              <span style={{
                fontSize: 11, fontWeight: row.active ? 700 : 500,
                color: row.active ? row.accent : T.text4,
                fontFamily: '"Geist Mono", monospace', textAlign: 'right',
              }}>
                {row.value}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {mode !== 'base' && inv.applyManual && inv.useDynamicPrice && (
        <div style={{ fontSize: 9.5, color: T.warning, marginBottom: 4, lineHeight: 1.35, fontWeight: 600 }}>
          Flags legacy — mode « {PRICE_MODE_LABEL[mode]} »
        </div>
      )}

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
        paddingTop: 6, borderTop: `1px solid ${T.border}`,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>
          Final · {PRICE_MODE_LABEL[mode]}
        </span>
        <span style={{
          fontSize: 14, fontWeight: 800,
          color: manualActive ? T.warning : dynamicActive ? T.ai : T.primary,
          fontFamily: '"Geist Mono", monospace',
        }}>
          {total.toFixed(0)} {currency}
        </span>
      </div>
    </div>
  );
}
