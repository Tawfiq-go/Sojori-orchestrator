// ════════════════════════════════════════════════════════════════════
// TooltipBreakdown.jsx — cascade Sojori AI claire (base → réglages → final)
// ════════════════════════════════════════════════════════════════════
import React, { useLayoutEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { T, priceOf, isArchiveDay, hasInventoryData, resolvePriceMode, PRICE_MODE_LABEL } from './_shared';

const TOOLTIP_Z = 10150;
const VIEWPORT_PAD = 10;
const SAFE_TOP = 132;

const FACTOR_ORDER = ['base', 'mode', 'occupancy', 'floorNormal', 'floorAggressive', 'ceiling', 'event', 'lastMinute', 'rounding'];

function computeTooltipPosition(anchor, tip) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = anchor.right + VIEWPORT_PAD;
  if (left + tip.width > vw - VIEWPORT_PAD) {
    const leftSide = anchor.left - tip.width - VIEWPORT_PAD;
    left = leftSide >= VIEWPORT_PAD ? leftSide : Math.max(VIEWPORT_PAD, vw - tip.width - VIEWPORT_PAD);
  }

  const spaceBelow = vh - anchor.bottom - VIEWPORT_PAD;
  const spaceAbove = anchor.top - SAFE_TOP - VIEWPORT_PAD;
  const preferBelow = anchor.top < SAFE_TOP + 24 || spaceBelow >= tip.height;
  const preferAbove = anchor.bottom > vh - VIEWPORT_PAD - 24 && spaceAbove >= tip.height;

  let top;
  if (preferAbove && !preferBelow) {
    top = anchor.top - tip.height - VIEWPORT_PAD;
  } else if (preferBelow) {
    top = anchor.bottom + VIEWPORT_PAD;
  } else {
    top = anchor.top + anchor.height / 2 - tip.height / 2;
  }

  if (top < SAFE_TOP) top = SAFE_TOP;
  if (top + tip.height > vh - VIEWPORT_PAD) {
    top = Math.max(SAFE_TOP, vh - tip.height - VIEWPORT_PAD);
  }

  return { top, left };
}

function factorTitle(f) {
  if (f.key === 'base') {
    const sub = String(f.sub || '').toLowerCase();
    if (sub.includes('listing') || sub.includes('base listing')) return 'Prix base listing';
    return 'Estimation prix de marché';
  }
  if (f.key === 'mode') return f.label || 'Mode';
  if (f.key === 'occupancy') return 'Taux occupation';
  if (f.key === 'lastMinute') return 'Dernière minute';
  if (f.key === 'event') return f.label || 'Événement';
  if (f.key === 'floorNormal' || f.key === 'floorAggressive') return 'Plancher';
  if (f.key === 'ceiling') return 'Plafond';
  if (f.key === 'rounding') return 'Arrondi';
  return f.label || f.key;
}

function sortFactors(factors) {
  return [...factors].sort((a, b) => {
    const ia = FACTOR_ORDER.indexOf(a.key);
    const ib = FACTOR_ORDER.indexOf(b.key);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

/** Affiche la cascade du dernier apply (pas le prix manuel). */
function PilotCascadeBlock({ history, currency }) {
  const factors = sortFactors(history?.pilotFactors ?? []);
  if (history?.source !== 'pilot-v2' && factors.length === 0) return null;

  const baseSource =
    history?.pricingBaseSource === 'manual_base'
      ? 'manuel'
      : history?.pricingBaseSource === 'listing_base'
        ? 'listing'
        : 'estimate';

  return (
    <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${T.border}` }}>
      <div style={{
        fontSize: 9, fontWeight: 800, color: T.ai, marginBottom: 6,
        fontFamily: '"Geist Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        Sojori AI · {history.mixEngineVersion ?? 'v2.1'}
        {' · '}
        {baseSource === 'manuel'
          ? 'base manuel'
          : baseSource === 'listing'
            ? 'base listing'
            : 'base estimé'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {factors.map((f, i) => {
          const isBase = f.key === 'base';
          const after = Math.round(f.after ?? (isBase ? history?.base : 0) ?? 0);
          const delta = Math.round(f.valueMad ?? 0);
          const skipNeutral =
            !isBase &&
            Math.abs(delta) < 1 &&
            (f.key === 'floorNormal' || f.key === 'rounding') &&
            String(f.sub || '').includes('non atteints');

          if (skipNeutral) return null;

          return (
            <div key={`${f.key ?? i}`} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 11, fontWeight: isBase ? 800 : 650,
                  color: isBase ? T.text : T.text2,
                  lineHeight: 1.25,
                }}>
                  {factorTitle(f)}
                </div>
                {f.sub ? (
                  <div style={{
                    fontSize: 9.5, color: T.text3, lineHeight: 1.3, marginTop: 1,
                    fontFamily: '"Geist Mono", monospace',
                  }}>
                    {f.sub}
                  </div>
                ) : null}
              </div>
              <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                {isBase ? (
                  <span style={{ fontSize: 11, fontWeight: 800, fontFamily: '"Geist Mono", monospace', color: T.text }}>
                    {after} {currency}
                  </span>
                ) : (
                  <>
                    <div style={{
                      fontSize: 10.5, fontWeight: 700, fontFamily: '"Geist Mono", monospace',
                      color: delta > 0 ? T.success : delta < 0 ? T.error : T.text3,
                    }}>
                      {delta > 0 ? '+' : ''}{delta} {currency}
                    </div>
                    <div style={{ fontSize: 9, color: T.text4, fontFamily: '"Geist Mono", monospace' }}>
                      → {after}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TooltipBody({ inv, dateStr, currency }) {
  const history = inv.calculatedPriceHistory;
  const hasPilot =
    history?.source === 'pilot-v2' || (Array.isArray(history?.pilotFactors) && history.pilotFactors.length > 0);

  const calc =
    inv.calculatedPrice != null && inv.calculatedPrice !== undefined ? inv.calculatedPrice : null;
  const man = inv.manualPrice != null && inv.manualPrice !== undefined ? inv.manualPrice : null;
  const baseInv = inv.basePrice ?? 0;

  const mode = resolvePriceMode(inv);
  const manualActive = mode === 'manual';
  const dynamicActive = mode === 'dynamic';
  const total = priceOf(inv);

  return (
    <>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8,
        fontSize: 10, fontWeight: 700, color: T.text3,
        fontFamily: '"Geist Mono", monospace',
        letterSpacing: '0.04em', textTransform: 'uppercase',
        paddingBottom: 6, borderBottom: `1px solid ${T.border}`, marginBottom: 8,
      }}>
        <span>{dateStr}</span>
        <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>
          {inv.availableRoom != null ? `${inv.availableRoom} dispo` : ''}
          {isArchiveDay(inv) ? ' · hist.' : ''}
        </span>
      </div>

      {hasPilot ? (
        <PilotCascadeBlock history={history} currency={currency} />
      ) : null}

      {/* Résumé affiché — dynamique vs manuel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 10px', marginBottom: 6 }}>
        {calc != null ? (
          <>
            <span style={{ fontSize: 11.5, fontWeight: dynamicActive ? 800 : 500, color: dynamicActive ? T.ai : T.text4 }}>
              Prix dynamique
              {dynamicActive ? <span style={{ marginLeft: 4, fontSize: 8 }}>●</span> : null}
            </span>
            <span style={{
              fontSize: 12, fontWeight: dynamicActive ? 800 : 500,
              color: dynamicActive ? T.ai : T.text4,
              fontFamily: '"Geist Mono", monospace', textAlign: 'right',
            }}>
              {Math.round(calc)} {currency}
            </span>
          </>
        ) : null}
        {man != null ? (
          <>
            <span style={{ fontSize: 11.5, fontWeight: manualActive ? 800 : 500, color: manualActive ? T.warning : T.text4 }}>
              Prix manuel
              {manualActive ? <span style={{ marginLeft: 4, fontSize: 8 }}>●</span> : null}
            </span>
            <span style={{
              fontSize: 12, fontWeight: manualActive ? 800 : 500,
              color: manualActive ? T.warning : T.text4,
              fontFamily: '"Geist Mono", monospace', textAlign: 'right',
            }}>
              {Math.round(man)} {currency}
            </span>
          </>
        ) : null}
        {!hasPilot && baseInv > 0 ? (
          <>
            <span style={{ fontSize: 11, color: T.text3 }}>Prix base</span>
            <span style={{ fontSize: 11, fontFamily: '"Geist Mono", monospace', textAlign: 'right', color: T.text3 }}>
              {Math.round(baseInv)} {currency}
            </span>
          </>
        ) : null}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
        paddingTop: 6, borderTop: `1px solid ${T.border}`,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>
          Final · {PRICE_MODE_LABEL[mode]}
        </span>
        <span style={{
          fontSize: 15, fontWeight: 800,
          color: manualActive ? T.warning : dynamicActive ? T.ai : T.primary,
          fontFamily: '"Geist Mono", monospace',
        }}>
          {Math.round(total)} {currency}
        </span>
      </div>
    </>
  );
}

export default function TooltipBreakdown({ inv, dateStr, currency = 'EUR', anchorRef, open = false }) {
  const tipRef = useRef(null);
  const [coords, setCoords] = useState(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current || !tipRef.current) {
      setCoords(null);
      return undefined;
    }

    const reposition = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const tip = tipRef.current?.getBoundingClientRect();
      if (!anchor || !tip || tip.width < 1) return;
      setCoords(computeTooltipPosition(anchor, tip));
    };

    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, anchorRef, inv, dateStr, currency]);

  if (!open || !inv || !hasInventoryData(inv) || typeof document === 'undefined') return null;

  const panel = (
    <div
      ref={tipRef}
      role="tooltip"
      style={{
        position: 'fixed',
        top: coords?.top ?? -9999,
        left: coords?.left ?? -9999,
        zIndex: TOOLTIP_Z,
        minWidth: 240,
        maxWidth: 300,
        background: 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: `1px solid ${T.borderStrong}`,
        borderRadius: 10,
        padding: '10px 12px',
        boxShadow: '0 12px 40px rgba(20,17,10,0.18), 0 0 0 1px rgba(184,133,26,0.10)',
        animation: coords ? 'fadeIn 0.12s both' : 'none',
        pointerEvents: 'none',
        visibility: coords ? 'visible' : 'hidden',
      }}
    >
      <TooltipBody inv={inv} dateStr={dateStr} currency={currency} />
    </div>
  );

  return createPortal(panel, document.body);
}
