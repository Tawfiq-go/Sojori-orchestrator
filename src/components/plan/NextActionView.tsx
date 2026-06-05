/**
 * Next Action - Prochaine action à venir du plan
 *
 * Affiche la prochaine action planifiée (message, relance, assignation, etc.)
 * avec son heure d'exécution prévue (tick horaire suivant).
 */

import React from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { NextAction } from '../../utils/planDerivations'
import { getActionTypeIcon } from '../../utils/planStatusMappers'

interface Props {
  nextAction: NextAction
  className?: string
}

export default function NextActionView({ nextAction, className = '' }: Props) {
  if (!nextAction.type || !nextAction.scheduledAt || !nextAction.executionAt) {
    return (
      <div className={`text-gray-500 text-sm italic p-4 ${className}`}>
        Aucune action à venir
      </div>
    )
  }

  const icon = getActionTypeIcon(nextAction.type)
  const scheduledDate = nextAction.scheduledAt
  const executionDate = nextAction.executionAt
  const now = new Date()

  const isPast = executionDate < now
  const isNear = executionDate.getTime() - now.getTime() < 3600000 // < 1h

  return (
    <div
      className={`
        border rounded-lg p-4
        ${isPast ? 'bg-orange-50 border-orange-300' : 'bg-blue-50 border-blue-200'}
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icône */}
        <div className="text-2xl flex-shrink-0">{icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 mb-1">
            Prochaine action
          </div>

          <div className="text-sm text-gray-700 mb-2">
            {nextAction.label}
          </div>

          {/* Timing */}
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Programmé :</span>
              <span className="font-mono text-gray-900">
                {format(scheduledDate, 'dd MMM yyyy · HH:mm', { locale: fr })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-500">Exécution :</span>
              <span
                className={`
                  font-mono font-semibold
                  ${isPast ? 'text-orange-700' : isNear ? 'text-blue-700' : 'text-gray-900'}
                `}
              >
                {format(executionDate, 'dd MMM yyyy · HH:mm', { locale: fr })}
              </span>
              <span className="text-gray-500 text-xs">
                ({formatDistanceToNow(executionDate, { addSuffix: true, locale: fr })})
              </span>
            </div>
          </div>

          {/* Note cron horaire */}
          <div className="mt-3 text-xs text-gray-500 border-t border-gray-200 pt-2">
            💡 Le cron s'exécute chaque heure à H:00 (ex: 14:00, 15:00, etc.)
          </div>
        </div>

        {/* Badge statut */}
        {isPast && (
          <div className="flex-shrink-0">
            <span className="px-2 py-1 text-xs font-semibold bg-orange-200 text-orange-800 rounded">
              En retard
            </span>
          </div>
        )}

        {isNear && !isPast && (
          <div className="flex-shrink-0">
            <span className="px-2 py-1 text-xs font-semibold bg-blue-200 text-blue-800 rounded">
              Imminent
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
