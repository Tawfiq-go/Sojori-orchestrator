import { T } from './_shared';

export default function CalendarLandscapeHint() {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        padding: '8px 12px',
        borderRadius: 10,
        background: T.infoTint || 'rgba(6,115,179,0.10)',
        border: `1px solid ${T.border}`,
        color: T.text2,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.4,
      }}
    >
      <span aria-hidden>📱</span>
      <span>
        Pour une meilleure lecture du calendrier, tournez votre appareil en mode paysage.
      </span>
    </div>
  );
}
