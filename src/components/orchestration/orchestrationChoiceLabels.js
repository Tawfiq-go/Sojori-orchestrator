/**
 * Libellés unifiés pour tous les types Choice (arrivée, départ, ménage).
 * Référence structure = CHOICE_ARRIVAL ; CHOICE_DEPARTURE et CLEANING_* = même design, particularités = libellés.
 * Voir REFERENCE_WORKFLOWS.md pour NOTIFICATION / DECLARATION / CHOICE.
 */

/**
 * @param {string} [categoryType] - ex. CHOICE_ARRIVAL, CHOICE_DEPARTURE, CLEANING_PAID, CLIENT_REQUEST
 * @param {string} [category] - ex. arrival_choose, departure_choose, cleaning_paid, client_request
 * @param {string} [displayLabel] - localized display name (used for CLIENT_REQUEST: 'Support', 'Transport', etc.)
 * @returns {{ cardTitle: string, cardSubtitle: string, defineHourLabel: string, defineHourShort: string }}
 */
export function getChoiceCardLabels(categoryType, category, displayLabel) {
  const ct = categoryType || ''
  const cat = (category || '').toLowerCase()
  if (ct === 'CHOICE_DEPARTURE' || cat === 'departure_choose') {
    return { cardTitle: 'Timeslot', cardSubtitle: 'Départ', defineHourLabel: 'Définir heure départ', defineHourShort: 'départ' }
  }
  if (ct.startsWith('CLEANING_') || cat.includes('cleaning')) {
    const cleaningLabel = ct === 'CLEANING_PAID' ? 'Ménage payant' : ct === 'CLEANING_SOJORI' ? 'Ménage Sojori' : 'Ménage inclus'
    return { cardTitle: 'Timeslot', cardSubtitle: cleaningLabel, defineHourLabel: 'Définir créneau', defineHourShort: 'créneau' }
  }
  if (ct === 'CLIENT_REQUEST' || cat === 'client_request') {
    // displayLabel is the localized name: 'Support', 'Transport', 'Courses', 'Conciergerie', etc.
    const typeLabel = displayLabel || 'Demande client'
    const typeShort = typeLabel.toLowerCase().trim()
    return { cardTitle: 'Timeslot', cardSubtitle: typeLabel, defineHourLabel: `Définir heure ${typeShort}`, defineHourShort: typeShort }
  }
  return { cardTitle: 'Timeslot', cardSubtitle: 'Arrivée', defineHourLabel: 'Définir heure arrivée', defineHourShort: 'arrivée' }
}

/**
 * Libellé de date de référence pour Config / Deadline (avant arrivée | avant départ | avant ménage).
 * @param {{ category?: string, categoryType?: string }} workflow
 * @returns {'arrivée' | 'départ' | 'ménage'}
 */
export function getReferenceDateLabel(workflow) {
  const cat = (workflow?.category || '').toLowerCase()
  const ct = (workflow?.categoryType || '').toUpperCase()
  if (ct === 'CHOICE_DEPARTURE' || ct === 'DECLARATION_DEPARTURE' || cat === 'departure_choose' || cat === 'departure_declare') return 'départ'
  if (ct.startsWith('CLEANING_') || cat.includes('cleaning')) return 'ménage'
  if (ct.startsWith('CLIENT_REQUEST') || (workflow?.type || '').toLowerCase() === 'customer_request') return 'exécution'
  return 'arrivée'
}

/**
 * Libellé condition pour cartes Declaration (référence DECLARATION_REGISTRATION).
 * Utilisé dans le bloc "Prochain envoi (relance)" pour Registration / Declarer arrivée / Declarer départ.
 * @param {{ categoryType?: string }} workflow
 * @returns {string}
 */
export function getDeclarationConditionLabel(workflow) {
  const ct = (workflow?.categoryType || '').toUpperCase()
  if (ct === 'DECLARATION_ARRIVAL') return 'si arrivée non déclarée'
  if (ct === 'DECLARATION_DEPARTURE') return 'si départ non déclaré'
  return 'si enregistrement pas terminé'
}
