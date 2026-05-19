// Friendly orchestration config cards (aligned with sojori-dashboard, sojori-orchestrator tokens)
import React from 'react';

const THEMES = {
  rule: {
    border: 'rgba(109, 40, 217, 0.28)',
    title: '#6d28d9',
    bg: 'linear-gradient(180deg, rgba(109,40,217,0.06), var(--bg-paper) 72%)',
  },
  channel: {
    border: 'rgba(10, 143, 94, 0.32)',
    title: 'var(--success)',
    bg: 'linear-gradient(180deg, var(--success-tint), var(--bg-paper) 72%)',
  },
  relance: {
    border: 'rgba(6, 115, 179, 0.28)',
    title: 'var(--info)',
    bg: 'linear-gradient(180deg, var(--info-tint), var(--bg-paper) 72%)',
  },
  listing: {
    border: 'var(--accent-border)',
    title: 'var(--accent-deep)',
    bg: 'linear-gradient(180deg, var(--accent-bg), var(--bg-paper) 72%)',
  },
  staff: {
    border: 'rgba(196, 101, 6, 0.28)',
    title: 'var(--warning)',
    bg: 'linear-gradient(180deg, var(--warning-tint), var(--bg-paper) 72%)',
  },
  muted: {
    border: 'var(--border-strong)',
    title: 'var(--text-muted)',
    bg: 'var(--bg-paper)',
  },
};

function ConfigCard({ card }) {
  const theme = THEMES[card.theme] || THEMES.muted;
  if (!card.bullets?.length) return null;

  return (
    <div
      style={{
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11.5,
          fontWeight: 700,
          color: theme.title,
          marginBottom: 6,
        }}
      >
        {card.icon && <span style={{ fontSize: 13 }}>{card.icon}</span>}
        <span>{card.title}</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.55, paddingLeft: 4 }}>
        {card.bullets.map((line, i) => (
          <div key={i} style={{ marginBottom: 3 }}>
            {line.kind === 'divider' ? (
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}>
                <strong style={{ color: 'var(--text-h)' }}>{line.label}: </strong>
                <span style={line.accent ? { color: 'var(--info)' } : undefined}>{line.value}</span>
              </div>
            ) : (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>• </span>
                <strong style={{ color: 'var(--text-h)' }}>{line.label}: </strong>
                <span
                  style={{
                    fontFamily: line.mono ? 'var(--mono)' : 'inherit',
                    fontSize: line.mono ? 10.5 : 'inherit',
                    color: line.accent ? 'var(--info)' : 'var(--text)',
                  }}
                >
                  {line.value}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OrchestrationConfigCards({ cards }) {
  if (!cards?.length) {
    return (
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
        Aucune configuration détaillée pour cette étape.
      </div>
    );
  }

  return (
    <div>
      {cards.map((card) => (
        <ConfigCard key={card.id} card={card} />
      ))}
    </div>
  );
}
