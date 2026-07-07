// ════════════════════════════════════════════════════════════════════
// TooltipBreakdown.jsx — cascade Sojori AI + prix actif (portal, z-index élevé)
// ════════════════════════════════════════════════════════════════════
import React, { useLayoutEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { T, priceOf, isArchiveDay, hasInventoryData, resolvePriceMode, PRICE_MODE_LABEL } from './_shared';

const TOOLTIP_Z = 10150;
const VIEWPORT_PAD = 10;
/** Sous la barre nav + toolbar calendrier + légende sticky */
const SAFE_TOP = 132;

function normalizeFactorLabel(label) {
  return String(label || '')
    .replace(/\(estimate\)/gi, '')
    .replace(/estimate/gi, 'marché')
    .replace(/\s+/g, ' ')
    .trim();
}

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

function TooltipBody({ inv, dateStr, currency }) {
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
    <>
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
        minWidth: 220,
        maxWidth: 280,
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
