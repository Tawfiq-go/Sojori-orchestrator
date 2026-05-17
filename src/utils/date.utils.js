/**
 * Date utilities with Casablanca timezone (Africa/Casablanca, GMT+1)
 */

const CASABLANCA_TZ = 'Africa/Casablanca'

/**
 * Format a date to Casablanca timezone
 * @param {Date|string} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string in Casablanca timezone
 */
export function formatDateCasablanca(date, options = {}) {
  if (!date) return ''

  const dateObj = date instanceof Date ? date : new Date(date)

  const defaultOptions = {
    timeZone: CASABLANCA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  }

  return new Intl.DateTimeFormat('fr-FR', defaultOptions).format(dateObj)
}

/**
 * Get hour in Casablanca timezone from a date
 * @param {Date|string} date
 * @returns {number} Hour (0-23) in Casablanca timezone
 */
export function getHourCasablanca(date) {
  if (!date) return null

  const dateObj = date instanceof Date ? date : new Date(date)

  const hourStr = new Intl.DateTimeFormat('fr-FR', {
    timeZone: CASABLANCA_TZ,
    hour: '2-digit',
    hour12: false,
  }).format(dateObj)

  return parseInt(hourStr, 10)
}

/**
 * Format time only (HH:mm) in Casablanca timezone
 * @param {Date|string} date
 * @returns {string} Time in format "HH:mm"
 */
export function formatTimeCasablanca(date) {
  if (!date) return ''

  const dateObj = date instanceof Date ? date : new Date(date)

  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: CASABLANCA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dateObj)
}

/**
 * Format date only (DD/MM/YYYY) in Casablanca timezone
 * @param {Date|string} date
 * @returns {string} Date in format "DD/MM/YYYY"
 */
export function formatDateOnlyCasablanca(date) {
  if (!date) return ''

  const dateObj = date instanceof Date ? date : new Date(date)

  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: CASABLANCA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(dateObj)
}

/**
 * Create a Date object with specific hour in Casablanca timezone
 * Returns UTC date that corresponds to the given hour in Casablanca
 *
 * IMPORTANT: Morocco switches between UTC+1 and UTC+0 during Ramadan!
 * This function dynamically calculates the correct offset for the given date.
 *
 * Example: 15h Casablanca → 14h UTC (when UTC+1) or 15h UTC (when UTC+0 during Ramadan)
 *
 * @param {Date|string} baseDate - Base date (year/month/day)
 * @param {number} hour - Hour in Casablanca timezone (0-23)
 * @returns {Date} Date object in UTC
 */
export function createDateWithHourCasablanca(baseDate, hour) {
  const base = baseDate instanceof Date ? baseDate : new Date(baseDate)

  // Get year, month, day in Casablanca timezone from the base date
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: CASABLANCA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(base)

  const year = parts.find(p => p.type === 'year').value
  const month = parts.find(p => p.type === 'month').value
  const day = parts.find(p => p.type === 'day').value

  // Create a temporary date at noon UTC on the target day to calculate offset
  const tempUTC = new Date(`${year}-${month}-${day}T12:00:00Z`)

  // Get what hour this represents in Casablanca timezone
  const casaHourStr = new Intl.DateTimeFormat('fr-FR', {
    timeZone: CASABLANCA_TZ,
    hour: '2-digit',
    hour12: false,
  }).format(tempUTC)

  const casaHour = parseInt(casaHourStr, 10)
  const utcHour = 12 // We used 12:00 UTC as reference

  // Calculate offset: how many hours ahead is Casablanca from UTC?
  // If casaHour=13 and utcHour=12, offset is +1 (UTC+1)
  // If casaHour=12 and utcHour=12, offset is 0 (UTC+0, during Ramadan)
  const offsetHours = casaHour - utcHour

  // Now create the final date: we want "hour" in Casablanca
  // So in UTC it should be "hour - offsetHours"
  const utcHourTarget = hour - offsetHours

  const isoString = `${year}-${month}-${day}T${String(utcHourTarget).padStart(2, '0')}:00:00Z`

  return new Date(isoString)
}
