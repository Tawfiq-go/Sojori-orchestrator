/** LogApiRU — petits composants partagés (badges, pastilles, états). */
import { RU_CATEGORIES, RU_SLOW_MS, type UiDir, type UiStatus, uiStatusLabel } from './logApiRuMeta'
import type { LogApiRuCategory } from '../../services/logApiRuApi';

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
  return (
    <span className={`dir ${dir}`}>
      <span className="ar">{dir === 'push' ? '↑' : '↓'}</span>
      {dir === 'push' ? 'Push' : 'Pull'}
    </span>
  );
}

export function CatPill({ cat }: { cat: LogApiRuCategory }) {
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
        La requête vers <code>ru-log-apis</code> a échoué. Vérifiez la connexion au service channels.
      </div>
      <button type="button" className="retry" onClick={onRetry}>
        <span>↻</span>Réessayer
      </button>
    </div>
  );
}

export function msClass(ms: number | null | undefined): string {
  if (ms == null) return ''
  if (ms > RU_SLOW_MS) return 'slow'
  if (ms > 2000) return 'warn'
  return ''
}
