const STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  error: 'bg-orange-100 text-orange-800 border-orange-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
};

export function SeverityBadge({ severity }: { severity?: string }) {
  const key = (severity || 'info').toLowerCase();
  const cls = STYLES[key] || STYLES.info;
  return (
    <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${cls}`}>
      {(severity || 'info').toUpperCase()}
    </span>
  );
}
