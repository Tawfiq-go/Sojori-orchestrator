import { useState, type ReactNode } from 'react';

type Props = {
  icon: string;
  title: string;
  countLabel: string;
  /** Ouvert au premier rendu (défaut : replié, comme /orchestration/plans). */
  defaultOpen?: boolean;
  /** Actions dans l'en-tête (checkbox, Désactiver…) — stopPropagation géré côté parent. */
  headerExtra?: ReactNode;
  children: ReactNode;
};

/** Bloc repliable niveau 2 — même pattern que SequencePlanCard /orchestration/plans. */
export default function OrchConfigCollapseBlock({
  icon,
  title,
  countLabel,
  defaultOpen = false,
  headerExtra,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`orch-l2-block${open ? ' open' : ''}`}>
      <button type="button" className="orch-l2-block-h" onClick={() => setOpen((o) => !o)}>
        <span className="orch-l2-em">{icon}</span>
        <span className="orch-l2-title">{title}</span>
        <span className="orch-l2-ct">{countLabel}</span>
        {headerExtra ? (
          <span className="orch-l2-extra" onClick={(e) => e.stopPropagation()} onKeyDown={() => {}} role="presentation">
            {headerExtra}
          </span>
        ) : null}
        <span className="orch-l2-arr">▶</span>
      </button>
      {open ? <div className="orch-l2-block-body">{children}</div> : null}
    </div>
  );
}
