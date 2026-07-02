import React, { useState } from 'react';

/** Bloc d’aide repliable — fermé par défaut pour gagner de la place verticale. */
export function OwnerFormCollapsible({
  title,
  badge,
  defaultOpen = false,
  className = '',
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`owner-form-collapsible${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        className="owner-form-collapsible-trigger"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="owner-form-collapsible-title">{title}</span>
        {badge ? <span className="owner-form-collapsible-badge">{badge}</span> : null}
        <span className="owner-form-collapsible-chevron" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open ? <div className="owner-form-collapsible-body">{children}</div> : null}
    </div>
  );
}

export default OwnerFormCollapsible;
