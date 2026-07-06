// ════════════════════════════════════════════════════════════════════
// TooltipBreakdown.jsx — cascade Sojori AI + prix actif (dynamique vs manuel)
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
    <div style={{ marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
      <div style={{
        fontSize: 10, fontWeight: 800, color: T.ai, marginBottom: 6,
        fontFamily: '"Geist Mono", monospace', textTransform: 'uppercase',
      }}>
        Sojori AI · {history.mixEngineVersion ?? 'v2.4'}
      </div>
      {factors.map((f, i) => {
        const isBase = f.key === 'base';
        const label = isBase ? 'Prix marché' : normalizeFactorLabel(f.label);
        const after = f.after ?? (isBase ? history?.base : null);
        const valueText = isBase
          ? `${Math.round(after ?? f.valueMad ?? 0)} ${currency}`
          : `${(f.valueMad ?? 0) >= 0 ? '+' : ''}${Math.round(f.valueMad ?? 0)} ${currency}`;

        return (
          <div key={`${f.key ?? i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', gap: 8 }}>
            <span style={{ fontSize: 11, color: T.text2, fontWeight: 600 }}>{label}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, fontFamily: '"Geist Mono", monospace',
              color: isBase ? T.text : (f.valueMad ?? 0) >= 0 ? T.success : T.error,
            }}>
              {valueText}
            </span>
          </div>
        );
      })}
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

  return (
    <div role="tooltip" style={{
      position: 'absolute', zIndex: 100,
      ...(placement === 'left' ? { right: 'calc(100% + 12px)', bottom: 0 } : { left: 'calc(100% + 12px)', bottom: 0 }),
      minWidth: 240, maxWidth: 300,
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: `1px solid ${T.borderStrong}`, borderRadius: 14,
      padding: '14px 16px',
      boxShadow: '0 12px 40px rgba(20,17,10,0.15), 0 0 0 1px rgba(184,133,26,0.10)',
      animation: 'fadeIn 0.2s both',
      pointerEvents: 'none',
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 700, color: T.text3,
        fontFamily: '"Geist Mono", monospace',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        paddingBottom: 8, borderBottom: `1px solid ${T.border}`, marginBottom: 8,
      }}>
        {dateStr}{inv.availableRoom != null ? ` · ${inv.availableRoom} dispo` : ''}
        {isArchiveDay(inv) ? ' · historique (lecture seule)' : ''}
      </div>

      <PilotFactorsBlock history={history} currency={currency} />

      <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, marginBottom: 4, textTransform: 'uppercase' }}>
        Prix affiché calendrier
      </div>

      {calc != null && (
        <PriceModeRow
          label="Prix dynamique"
          value={`${calc.toFixed(0)} ${currency}`}
          active={dynamicActive}
          accent={T.ai}
        />
      )}
      {man != null && (
        <PriceModeRow
          label="✏ Manuel"
          value={`${man.toFixed(0)} ${currency}`}
          active={manualActive}
          accent={T.warning}
        />
      )}
      {!hasPilot && baseInv > 0 && (
        <PriceModeRow
          label="Base inventaire"
          value={`${baseInv.toFixed(0)} ${currency}`}
          active={!dynamicActive && !manualActive}
          accent={T.text2}
        />
      )}

      {mode !== 'base' && inv.applyManual && inv.useDynamicPrice && (
        <div style={{ fontSize: 10.5, color: T.warning, marginTop: 8, lineHeight: 1.45, fontWeight: 600 }}>
          Flags legacy incohérents — le mode affiché est « {PRICE_MODE_LABEL[mode]} » (priceMode).
        </div>
      )}

      <div style={{
        paddingTop: 8, marginTop: 8, borderTop: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
          Prix final · {PRICE_MODE_LABEL[mode]}
        </span>
        <span style={{
          fontSize: 15, fontWeight: 800,
          color: manualActive ? T.warning : dynamicActive ? T.ai : T.primary,
          fontFamily: '"Geist Mono", monospace',
        }}>
          {total.toFixed(0)} {currency}
        </span>
      </div>
    </div>
  );
}

function PriceModeRow({ label, value, active, accent }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '5px 0', gap: 8,
      opacity: active ? 1 : 0.45,
    }}>
      <span style={{
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        color: active ? accent : T.text4,
      }}>
        {label}
        {active ? (
          <span style={{
            marginLeft: 6, fontSize: 9, fontWeight: 800, color: accent,
            fontFamily: '"Geist Mono", monospace',
          }}>
            ACTIF
          </span>
        ) : null}
      </span>
      <span style={{
        fontSize: 12,
        fontWeight: active ? 700 : 500,
        color: active ? accent : T.text4,
        fontFamily: '"Geist Mono", monospace',
      }}>
        {value}
      </span>
    </div>
  );
}
