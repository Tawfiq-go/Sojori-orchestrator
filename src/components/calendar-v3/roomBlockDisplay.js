/**
 * Affichage Sojori des CalendarBlocks à l’unité (roomId).
 * Wording 100 % Sojori — jamais « Mews » / « mews_block » à l’écran.
 */

/** @typedef {'interne' | 'non_pret' | 'travaux'} RoomBlockCategory */

/**
 * Catégorie visuelle — priorité au TYPE PMS (note sync / champs),
 * puis heuristique sur le libellé.
 * @param {string | null | undefined} title
 * @param {{ pmsType?: string | null, note?: string | null, mewsType?: string | null } | string | null} [optsOrNote]
 * @returns {RoomBlockCategory}
 */
export function inferRoomBlockCategory(title, optsOrNote) {
  const opts =
    optsOrNote && typeof optsOrNote === 'object' && !Array.isArray(optsOrNote)
      ? optsOrNote
      : { note: typeof optsOrNote === 'string' ? optsOrNote : null }

  const rawType = String(opts.pmsType || opts.mewsType || '').trim()
  const note = String(opts.note || '')
  // note sync : « source: mews-block · type: InternalUse · … »
  const noteType =
    rawType ||
    (/type:\s*(InternalUse|OutOfOrder|OutOfService)/i.exec(note)?.[1] || '')

  const pms = noteType.toLowerCase()
  if (pms === 'internaluse') return 'interne'

  const t = String(title || '').toLowerCase()
  if (
    t.includes('invit') ||
    t.includes('interne') ||
    t.includes('internal') ||
    t.includes('usage interne')
  ) {
    return 'interne'
  }
  if (
    t.includes('pas prêt') ||
    t.includes('pas pret') ||
    t.includes('not ready') ||
    t.includes('non prêt') ||
    t.includes('non pret')
  ) {
    return 'non_pret'
  }
  if (pms === 'outoforder' || pms === 'outofservice') return 'travaux'
  return 'travaux'
}

/** Libellé Sojori de la catégorie (jamais le type technique). */
export function roomBlockCategoryLabel(category) {
  switch (category) {
    case 'interne':
      return 'Usage interne'
    case 'non_pret':
      return 'Non prêt'
    default:
      return 'Travaux'
  }
}

/**
 * Styles barre — ambre / gris clair / hachures.
 * @param {RoomBlockCategory} category
 */
export function roomBlockCategoryVisual(category) {
  if (category === 'interne') {
    return {
      wash: 'rgba(217, 119, 6, 0.22)',
      accent: '#d97706',
      text: '#92400e',
      hatch: false,
    }
  }
  if (category === 'non_pret') {
    return {
      wash: 'rgba(148, 163, 184, 0.28)',
      accent: '#64748b',
      text: '#334155',
      hatch: false,
    }
  }
  return {
    wash: 'repeating-linear-gradient(-45deg, rgba(100,116,139,0.28), rgba(100,116,139,0.28) 3px, rgba(148,163,184,0.12) 3px, rgba(148,163,184,0.12) 6px)',
    accent: '#475569',
    text: '#1e293b',
    hatch: true,
  }
}

/** Bloc synchronisé depuis le PMS (non éditable côté Sojori). */
export function isPmsSyncedRoomBlock(block) {
  if (!block) return false
  if (block.mewsBlockId) return true
  return String(block.type || '') === 'mews_block'
}

/** YYYY-MM-DD depuis Date / ISO. */
export function blockIsoDay(v) {
  if (v == null || v === '') return ''
  if (typeof v === 'string') {
    const s = v.trim()
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
    const t = Date.parse(s)
    return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : ''
  }
  if (v instanceof Date && Number.isFinite(v.getTime())) {
    return v.toISOString().slice(0, 10)
  }
  const t = Date.parse(String(v))
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : ''
}

/** dateTo inclusive → jour exclusif pour géométrie Gantt (comme départ résa). */
export function blockExclusiveEndIso(dateToInclusive) {
  const iso = blockIsoDay(dateToInclusive)
  if (!iso) return ''
  const t = Date.parse(`${iso}T00:00:00Z`)
  if (!Number.isFinite(t)) return ''
  return new Date(t + 86400000).toISOString().slice(0, 10)
}

/**
 * Blocs avec roomId pour une chambre donnée.
 * @param {Record<string, any> | any[]} blocksByIdOrList
 * @param {string} roomId
 */
export function filterBlocksForRoom(blocksByIdOrList, roomId) {
  const rid = String(roomId || '').trim()
  if (!rid || rid.includes(':unassigned') || rid.includes(':unit:')) return []
  const list = Array.isArray(blocksByIdOrList)
    ? blocksByIdOrList
    : Object.values(blocksByIdOrList || {})
  return list.filter((b) => {
    if (!b || String(b.status || 'active') === 'released') return false
    const br = String(b.roomId?._id || b.roomId?.$oid || b.roomId || '').trim()
    return Boolean(br) && br === rid
  })
}

/** Un bloc couvre-t-il ce jour (dateFrom/dateTo inclusifs) ? */
export function dayHasRoomBlock(blocks, iso) {
  if (!Array.isArray(blocks) || !iso) return false
  return blocks.some((b) => {
    const from = blockIsoDay(b.dateFrom)
    const to = blockIsoDay(b.dateTo)
    return Boolean(from && to && from <= iso && iso <= to)
  })
}

/**
 * Tooltip Sojori (pas de type technique).
 * @param {any} block
 */
export function roomBlockTooltip(block, { canRelease = false } = {}) {
  const title = String(block?.title || 'Blocage').trim() || 'Blocage'
  const cat = inferRoomBlockCategory(title, { note: block?.note })
  const catLabel = roomBlockCategoryLabel(cat)
  const from = blockIsoDay(block?.dateFrom)
  const to = blockIsoDay(block?.dateTo)
  const dates = from && to ? `${from} → ${to}` : ''
  const parts = [title, dates, catLabel]
  if (canRelease) parts.push('cliquer pour libérer')
  return parts.filter(Boolean).join(' · ')
}

/**
 * Chevauchement plage [from,to] inclusive avec résas (départ exclusif) ou blocs existants.
 * @param {{ reservations?: any[], blocks?: any[], dateFrom: string, dateTo: string }} args
 */
export function roomRangeOverlapMessage({ reservations = [], blocks = [], dateFrom, dateTo }) {
  const from = blockIsoDay(dateFrom)
  const to = blockIsoDay(dateTo)
  if (!from || !to || to < from) return 'Plage de dates invalide.'
  for (const r of reservations || []) {
    const arr = blockIsoDay(r.arrivalDate)
    const dep = blockIsoDay(r.departureDate)
    if (!arr || !dep) continue
    // chevauchement nuits : [arr, dep) ∩ [from, to] non vide
    if (arr <= to && from < dep) {
      const guest = r.guestName || r.guestFirstName || 'Réservation'
      return `Impossible : chevauche une réservation (${guest}, ${arr} → ${dep}).`
    }
  }
  for (const b of blocks || []) {
    const bf = blockIsoDay(b.dateFrom)
    const bt = blockIsoDay(b.dateTo)
    if (!bf || !bt) continue
    if (bf <= to && from <= bt) {
      const t = String(b.title || 'blocage').trim()
      return `Impossible : chevauche un blocage existant (« ${t} », ${bf} → ${bt}).`
    }
  }
  return null
}
