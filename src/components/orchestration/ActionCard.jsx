import React from 'react'
import { getStatusBadge, getTechnicalPlanStatusChip } from './workflowUtils'
import {
  resolveActionCardTone,
  getActionCardSkinClasses,
  getActionCardTitleTextClass,
  TONE_ALERT,
  TONE_NEUTRAL,
  TONE_OK,
} from './orchestrationStatusPresentation'

const ActionCard = ({ cardId, title, status, icon, statusIcon, summary, details, selectedCard, setSelectedCard, onSelectCard, cardBorderVariant, isLate, reservationNumber, workflow }) => {
  const techChip = getTechnicalPlanStatusChip(status)
  const isSelected = selectedCard === cardId
  const handleClick = () => {
    if (onSelectCard) {
      onSelectCard(isSelected ? null : cardId, isSelected ? null : details)
    } else if (setSelectedCard) {
      setSelectedCard(isSelected ? null : cardId)
    }
  }

  let cardTone = resolveActionCardTone(status, cardBorderVariant, isLate)
  if (cardTone === TONE_NEUTRAL && status != null && status !== '') {
    const statusBadge = getStatusBadge(status)
    if (statusBadge.color === 'red') cardTone = TONE_ALERT
    else if (statusBadge.color === 'green' || statusBadge.color === 'blue') cardTone = TONE_OK
  }

  const getStatusClasses = () => {
    let skin = getActionCardSkinClasses(cardTone)
    if ((status === 'IN_PROGRESS' || status === 'ACTIVE') && cardTone === TONE_NEUTRAL) {
      skin = `${skin} animate-pulse`
    }
    return skin
  }

  return (
    <div>
      {/* Button cliquable - Ultra compact (catégories = taille avant) */}
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isSelected}
        aria-label={isSelected ? `${title} (sélectionné)` : title}
        className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg shadow-sm border-2 transition-all min-w-[70px] max-w-[104px] cursor-default hover:scale-105
          ${getStatusClasses()}
          ${isSelected ? 'ring-4 ring-blue-600 ring-offset-2 scale-105 shadow-xl border-blue-600 bg-blue-100' : ''}`}
      >
        <div
          className={`w-full text-center text-[6.5px] leading-tight font-mono font-bold tracking-tight px-0.5 py-0.5 rounded ${techChip.chipClass}`}
          title={`Statut plan: ${techChip.label}`}
        >
          {techChip.label}
        </div>
        <div className="flex items-center gap-0.5">
          <span className="text-lg">{icon}</span>
          <span className="text-sm">{statusIcon}</span>
          {isSelected && <span className="text-[9px] font-bold text-blue-600">●</span>}
        </div>
        <div className="flex flex-col items-center gap-0.5 w-full">
          <span className={`text-[10px] font-medium text-center leading-tight ${getActionCardTitleTextClass(cardTone)}`}>
            {title}
          </span>
        </div>
        {summary && (
          <div className="text-[10px] text-gray-600 text-center w-full">
            {summary}
          </div>
        )}
      </button>

      {/* Détails affichés dans le panneau à côté (pas inline) */}
    </div>
  )
}

export default ActionCard
