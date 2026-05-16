// ════════════════════════════════════════════════════════════════════
// TooltipBreakdown.jsx — glassmorphism · Base/Dynamique/Manuel/Prix
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { T, priceOf } from './_shared';

export default function TooltipBreakdown({ inv, dateStr, currency = 'EUR', placement = 'left' }) {
  if (!inv) return null;
  const base = inv.basePrice ?? 0;
  const dyn = inv.useDynamicPrice ? inv.calculatedPrice : null;
  const man = (inv.manualPrice !== null && inv.manualPrice !== undefined) ? inv.manualPrice : null;
  const total = priceOf(inv);

  return (
    <div role="tooltip" style={{
      position: 'absolute', zIndex: 100,
      ...(placement === 'left'  ? { right: 'calc(100% + 12px)', top: 0 } : { left: 'calc(100% + 12px)', top: 0 }),
      minWidth: 220, maxWidth: 280,
      background: 'rgba(255,255,255,0.85)',
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
      </div>

      <Row label="Base" value={`${base.toFixed(0)} ${currency}`} />
      {dyn !== null && <Row label="⚡ Dynamique" value={`${dyn.toFixed(0)} ${currency}`} accent={T.ai} />}
      {man !== null && <Row label="✏ Manuel"     value={`${man.toFixed(0)} ${currency}`} accent={T.warning} />}

      <div style={{
        paddingTop: 8, marginTop: 8, borderTop: `1px solid ${T.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Prix final</span>
        <span style={{
          fontSize: 15, fontWeight: 800, color: T.primary,
          fontFamily: '"Geist Mono", monospace',
        }}>{total.toFixed(0)} {currency}</span>
      </div>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <span style={{ fontSize: 12, color: T.text3, fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: 12, color: accent || T.text,
        fontFamily: '"Geist Mono", monospace', fontWeight: 600,
      }}>{value}</span>
    </div>
  );
}
