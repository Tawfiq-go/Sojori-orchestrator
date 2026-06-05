/**
 * Badge Last-Minute (⚡ LM)
 *
 * Affiche un badge pour indiquer qu'un bloc ou une séquence
 * a été créé/ré-ouvert en mode Last-Minute.
 */

import React from 'react'

interface Props {
  /** Taille du badge */
  size?: 'sm' | 'md' | 'lg'
  /** Style inline ou badge avec fond */
  variant?: 'inline' | 'badge'
  className?: string
}

export default function LMBadge({ size = 'sm', variant = 'badge', className = '' }: Props) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-2.5 py-1',
  }

  if (variant === 'inline') {
    return (
      <span className={`text-orange-600 font-semibold ${className}`} title="Last-Minute">
        ⚡ LM
      </span>
    )
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1
        bg-orange-100 text-orange-800
        border border-orange-300
        rounded font-semibold
        ${sizeClasses[size]}
        ${className}
      `}
      title="Last-Minute - Bloc créé/ré-ouvert en urgence"
    >
      <span className="text-orange-600">⚡</span>
      <span>LM</span>
    </span>
  )
}
