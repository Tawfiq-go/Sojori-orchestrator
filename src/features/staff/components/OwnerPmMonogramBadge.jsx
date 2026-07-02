import { initialsFromPublicName } from '../utils/pmProfileMediaUtils';

const DEFAULT_FROM = '#b8851a';
const DEFAULT_TO = '#876119';

export default function OwnerPmMonogramBadge({
  logoText,
  publicName,
  brandFrom,
  brandTo,
}) {
  const text = (logoText || initialsFromPublicName(publicName) || 'PM').slice(0, 4).toUpperCase();
  const from = brandFrom || DEFAULT_FROM;
  const to = brandTo || DEFAULT_TO;

  return (
    <div
      aria-hidden
      style={{
        width: 72,
        height: 72,
        borderRadius: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: 22,
        letterSpacing: '0.04em',
        color: '#fff',
        background: `linear-gradient(135deg, ${from}, ${to})`,
        boxShadow: '0 4px 14px rgba(20,17,10,0.12)',
        flexShrink: 0,
      }}
    >
      {text}
    </div>
  );
}
