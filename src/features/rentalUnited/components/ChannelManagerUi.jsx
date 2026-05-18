/** UI Channel Manager — design tokens Atelier (hors iframe RU). */
import { tokens as T } from '../../../components/dashboard/DashboardV2.components';

export function CmSpinner({ label = 'Chargement…' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 220,
        gap: 14,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: `3px solid ${T.bg3}`,
          borderTopColor: T.primary,
          animation: 'cm-spin 0.7s linear infinite',
        }}
      />
      <p style={{ margin: 0, fontSize: 13, color: T.text3, fontWeight: 500 }}>{label}</p>
      <style>{`@keyframes cm-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const CM_ALERT_PALETTES = {
  info: { bg: T.infoTint, border: 'rgba(6,115,179,0.25)', title: T.info, text: T.text2 },
  warning: { bg: T.warningTint, border: 'rgba(196,101,6,0.25)', title: T.warning, text: T.text2 },
  error: { bg: T.errorTint, border: 'rgba(200,30,30,0.25)', title: T.error, text: T.text2 },
  success: { bg: T.successTint, border: 'rgba(10,143,94,0.25)', title: T.success, text: T.text2 },
};

export function CmAlert({ variant = 'info', title, children }) {
  const palette = CM_ALERT_PALETTES[variant] || CM_ALERT_PALETTES.info;
  return (
    <div
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 12,
        padding: '16px 18px',
      }}
    >
      {title && (
        <h5 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: palette.title }}>
          {title}
        </h5>
      )}
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: palette.text }}>{children}</p>
    </div>
  );
}

export function CmOwnerPanel({ title, subtitle, children }) {
  return (
    <div
      style={{
        background: T.bg1,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: '20px 22px',
        boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>{title}</h2>
        {subtitle && (
          <p style={{ margin: '6px 0 0', fontSize: 13, color: T.text3, lineHeight: 1.45 }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

export function CmHint({ children }) {
  return (
    <p
      style={{
        margin: '14px 0 0',
        fontSize: 12,
        color: T.text4,
        lineHeight: 1.5,
        padding: '10px 12px',
        background: T.bg2,
        borderRadius: 8,
        border: `1px dashed ${T.border}`,
      }}
    >
      {children}
    </p>
  );
}
