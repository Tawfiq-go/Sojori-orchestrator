import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './SojoriPrimButton.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  loading?: boolean;
  compact?: boolean;
};

/** Bouton primaire Sojori (dégradé or) — aligné taskHub .btn-prim, sans MUI. */
export default function SojoriPrimButton({
  children,
  loading = false,
  compact = false,
  disabled,
  className = '',
  type = 'button',
  ...rest
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`sojori-prim-btn${compact ? ' sojori-prim-btn--compact' : ''}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      {loading ? <span className="sojori-prim-btn__spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
