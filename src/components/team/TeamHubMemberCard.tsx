import '../../features/taskHub/staff-design/staffDesign.css';

type TeamHubMemberCardProps = {
  initials: string;
  title: string;
  subtitle?: string;
  badge?: string;
  chips?: string[];
  metaLines?: Array<{ label: string; value: string }>;
  active?: boolean;
  inactive?: boolean;
  avatarClass?: string;
  onClick?: () => void;
  onEdit?: () => void;
  onLifecycle?: () => void;
  onDelete?: () => void;
};

export function TeamHubMemberCard({
  initials,
  title,
  subtitle,
  badge,
  chips = [],
  metaLines = [],
  active = true,
  inactive = false,
  avatarClass = 'av',
  onClick,
  onEdit,
  onLifecycle,
  onDelete,
}: TeamHubMemberCardProps) {
  return (
    <div
      className={`staff-card${active ? ' on' : ''}${inactive ? ' off' : ''}`}
      onClick={onClick}
      onKeyDown={() => {}}
      role="button"
      tabIndex={0}
    >
      <div className="row1">
        <div className={avatarClass}>
          {initials}
          <span className={`dot ${inactive ? 'red' : 'green'}`} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="nm">
            {title}
            {badge ? <span className="admin">{badge}</span> : null}
          </div>
          {subtitle ? <div className="role">{subtitle}</div> : null}
        </div>
        <div className="actions">
          {onLifecycle ? (
            <button
              type="button"
              className="edit-btn"
              title="Suivi onboarding"
              aria-label="Suivi onboarding"
              style={{ borderColor: '#E6B022', color: '#B8881A' }}
              onClick={(e) => {
                e.stopPropagation();
                onLifecycle();
              }}
            >
              ◆
            </button>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              className="edit-btn"
              title="Modifier"
              aria-label="Modifier"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              ✏
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              🗑
            </button>
          ) : null}
        </div>
      </div>
      {chips.length > 0 && (
        <div className="tasks">
          {chips.map((c) => (
            <span key={c} className="task-chip active">
              {c}
            </span>
          ))}
        </div>
      )}
      {metaLines.map((line) => (
        <div key={line.label} className="meta-line">
          <span style={{ textTransform: 'uppercase', fontSize: 9.5, fontWeight: 700 }}>{line.label}</span>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--t)' }}>{line.value}</span>
        </div>
      ))}
    </div>
  );
}

export function TeamHubCardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="so-staff-root" style={{ padding: 0, minHeight: 0, background: 'transparent' }}>
      <div className="staff-grid">{children}</div>
    </div>
  );
}

export default TeamHubMemberCard;
