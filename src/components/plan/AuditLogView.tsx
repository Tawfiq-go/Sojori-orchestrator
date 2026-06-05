/**
 * Vue audit log orchestration v2
 *
 * Affiche le journal complet des événements du plan :
 * - Envois messages/relances
 * - Transitions assignation
 * - Créations Last-Minute
 * - Changements statut plan
 */

import React, { useMemo, useState } from 'react'
import type { AuditEntry } from '../../types/planOrchestrationV2'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Props {
  auditLog: AuditEntry[]
  className?: string
}

type AuditTypeFilter = 'all' | 'messages' | 'assignations' | 'lm' | 'status_changes'

const AUDIT_TYPE_LABELS: Record<string, string> = {
  message_sent: '💬 Message envoyé',
  relance_sent: '🔔 Relance envoyée',
  relance_skipped: '⏭️ Relance sautée',
  assignation_opened: '🔓 Assignation ouverte',
  assignation_found: '✅ Staff trouvé',
  assignation_accepted: '👍 Staff accepté',
  assignation_failed: '❌ Assignation échouée',
  reminder_sent: '⏰ Rappel staff envoyé',
  escalade_triggered: '🚨 Escalade déclenchée',
  lm_relance_created: '⚡ Relance LM créée',
  lm_assignation_reopened: '⚡ Assignation LM ré-ouverte',
  status_change: '🔄 Changement statut',
}

function getAuditTypeCategory(type: string): AuditTypeFilter {
  if (type.includes('message') || type.includes('relance')) return 'messages'
  if (type.includes('assignation')) return 'assignations'
  if (type.includes('lm_')) return 'lm'
  if (type === 'status_change') return 'status_changes'
  return 'all'
}

export default function AuditLogView({ auditLog, className = '' }: Props) {
  const [filter, setFilter] = useState<AuditTypeFilter>('all')

  const filteredLog = useMemo(() => {
    if (filter === 'all') return auditLog

    return auditLog.filter((entry) => {
      const category = getAuditTypeCategory(entry.type)
      return category === filter
    })
  }, [auditLog, filter])

  const sortedLog = useMemo(() => {
    return [...filteredLog].sort((a, b) => {
      const dateA = typeof a.at === 'string' ? new Date(a.at) : a.at
      const dateB = typeof b.at === 'string' ? new Date(b.at) : b.at
      return dateB.getTime() - dateA.getTime() // Plus récent en premier
    })
  }, [filteredLog])

  if (auditLog.length === 0) {
    return (
      <div className={`text-gray-500 text-sm italic p-4 ${className}`}>
        Aucune entrée d'audit disponible
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 text-sm rounded ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Tout ({auditLog.length})
        </button>
        <button
          onClick={() => setFilter('messages')}
          className={`px-3 py-1 text-sm rounded ${
            filter === 'messages'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Messages
        </button>
        <button
          onClick={() => setFilter('assignations')}
          className={`px-3 py-1 text-sm rounded ${
            filter === 'assignations'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Assignations
        </button>
        <button
          onClick={() => setFilter('lm')}
          className={`px-3 py-1 text-sm rounded ${
            filter === 'lm'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          ⚡ Last-Minute
        </button>
        <button
          onClick={() => setFilter('status_changes')}
          className={`px-3 py-1 text-sm rounded ${
            filter === 'status_changes'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Statuts plan
        </button>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {sortedLog.map((entry, idx) => {
          const date = typeof entry.at === 'string' ? new Date(entry.at) : entry.at
          const typeLabel = AUDIT_TYPE_LABELS[entry.type] || entry.type
          const isLM = entry.type.includes('lm_')

          return (
            <div
              key={idx}
              className={`
                flex gap-3 p-3 rounded border
                ${isLM ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}
              `}
            >
              {/* Timeline dot */}
              <div className="flex-shrink-0 mt-1">
                <div
                  className={`
                    w-2 h-2 rounded-full
                    ${isLM ? 'bg-orange-500' : 'bg-blue-500'}
                  `}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-sm">{typeLabel}</div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {format(date, 'dd MMM yyyy · HH:mm', { locale: fr })}
                  </div>
                </div>

                {/* Target */}
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                    {entry.target}
                  </span>
                </div>

                {/* Transitions */}
                {(entry.from || entry.to) && (
                  <div className="text-sm text-gray-600 mt-1">
                    {entry.from && <span className="line-through">{entry.from}</span>}
                    {entry.from && entry.to && <span className="mx-1">→</span>}
                    {entry.to && <span className="font-semibold">{entry.to}</span>}
                  </div>
                )}

                {/* Reason */}
                {entry.reason && (
                  <div className="text-sm text-gray-500 italic mt-1">
                    Raison : {entry.reason}
                  </div>
                )}

                {/* Meta */}
                {entry.meta && Object.keys(entry.meta).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      Détails techniques
                    </summary>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(entry.meta, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
