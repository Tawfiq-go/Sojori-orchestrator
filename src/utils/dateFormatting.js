import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { fr } from 'date-fns/locale';

/**
 * Timezone utilisé pour l'affichage des dates dans l'application
 * Casablanca (Morocco) = UTC+1 (pas de changement d'heure)
 */
const CASABLANCA_TIMEZONE = 'Africa/Casablanca';

/** Mettre à true pour activer les logs timezone */
const TZ_DEBUG = false;

/**
 * Formate une date en tenant compte du timezone de Casablanca
 *
 * @param {string|Date} dateInput - Date à formater (string ISO ou objet Date)
 * @param {string} formatString - Format de sortie (ex: 'dd/MM/yyyy HH:mm:ss.SSS')
 * @returns {string} Date formatée en heure de Casablanca
 */
export const formatCasablancaDate = (dateInput, formatString = 'dd/MM/yyyy HH:mm:ss.SSS') => {
  if (!dateInput) return '';
  try {
    // Convertir en objet Date si c'est une string
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

    // Formater directement dans le timezone Casablanca
    const result = formatInTimeZone(date, CASABLANCA_TIMEZONE, formatString, {
      locale: fr
    });
    if (TZ_DEBUG && formatString?.includes('HH:mm')) {
      const utcHour = date.getUTCHours();
      const utcMin = date.getUTCMinutes();
    }
    return result;
  } catch (error) {
    return '';
  }
};

/**
 * Formats courts pour différents usages
 */
export const formatCasablancaDateTime = dateInput => formatCasablancaDate(dateInput, 'dd/MM/yyyy HH:mm:ss');
export const formatCasablancaDateTimeMs = dateInput => formatCasablancaDate(dateInput, 'dd/MM/yyyy HH:mm:ss.SSS');
export const formatCasablancaDateOnly = dateInput => formatCasablancaDate(dateInput, 'dd/MM/yyyy');
export const formatCasablancaTimeOnly = dateInput => formatCasablancaDate(dateInput, 'HH:mm:ss');
export const formatCasablancaTimeOnlyMs = dateInput => formatCasablancaDate(dateInput, 'HH:mm:ss.SSS');

/**
 * Format pour l'affichage humain (ex: "29 janvier 2026 à 14:31")
 */
export const formatCasablancaHuman = dateInput => formatCasablancaDate(dateInput, "dd MMMM yyyy 'à' HH:mm");
