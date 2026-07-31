/** LogApiMews — petits composants partagés (badges, pastilles, états). */
import { RU_CATEGORIES, type UiDir, type UiStatus, uiStatusLabel } from './logApiMewsMeta'
import type { LogApiMewsCategory } from '../../services/logApiMewsApi';

export function StatusBadge({
  status,
  label,
  statusCode,
}: {
  status: UiStatus
  label?: string
  statusCode?: string
}) {
  const text = label ?? uiStatusLabel(status, statusCode)
  return (
    <span className={`badge ${status}`}>
      <span className="dot" />
      {text}
    </span>
  )
}

export function DirBadge({ dir }: { dir: UiDir }) {
  const arrow = dir === 'push' ? '↑' : dir === 'pull' ? '↓' : '↯';
  const label = dir === 'push' ? 'Push' : dir === 'pull' ? 'Pull' : 'Webhook';
  return (
    <span className={`dir ${dir}`}>
      <span className="ar">{arrow}</span>
      {label}
    </span>
  );
}

export function CatPill({ cat }: { cat: LogApiMewsCategory }) {
  const c = RU_CATEGORIES[cat] || RU_CATEGORIES.other;
  return (
    <span className="catpill">
      <span className="cd" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty">
      <div className="em">🗂</div>
      <div className="t">{title}</div>
      <div className="d">{detail}</div>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="errstate">
      <div className="em">⚠️</div>
      <div className="t">Impossible de charger les échanges</div>
      <div className="d">
        La requête vers <code>mews-log-apis</code> a échoué. Vérifiez la connexion au service channels.
      </div>
      <button type="button" className="retry" onClick={onRetry}>
        <span>↻</span>Réessayer
      </button>
    </div>
  );
}

