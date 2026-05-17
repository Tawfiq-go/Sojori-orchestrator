import { startOfDay, endOfDay, subDays } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/** Aligné sur `formatCasablancaDate` (Admin / Channels). */
export const CHANNEL_DEBUG_TZ = 'Africa/Casablanca';

/**
 * Paramètres query pour srv-channels (period=all ou from/to ISO).
 * @param {'today' | 'yesterday' | 'last7days' | 'all'} preset
 */
export function getChannelDebugDateQuery(preset) {
  if (preset === 'all') return { period: 'all' };
  const now = new Date();
  const zNow = toZonedTime(now, CHANNEL_DEBUG_TZ);
  if (preset === 'today') {
    const from = fromZonedTime(startOfDay(zNow), CHANNEL_DEBUG_TZ);
    const to = fromZonedTime(endOfDay(zNow), CHANNEL_DEBUG_TZ);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  if (preset === 'yesterday') {
    const zY = subDays(zNow, 1);
    const from = fromZonedTime(startOfDay(zY), CHANNEL_DEBUG_TZ);
    const to = fromZonedTime(endOfDay(zY), CHANNEL_DEBUG_TZ);
    return { from: from.toISOString(), to: to.toISOString() };
  }
  // 7 derniers jours = fenêtre **glissante** 168h (UTC) — alignée sur `createdAt` Mongo, évite les trous timezone Casablanca
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Libellé court pour l’UI (message vide, résumé). */
export function getChannelDebugDatePresetLabel(preset) {
  switch (preset) {
    case 'today':
      return "aujourd'hui (Casablanca)";
    case 'yesterday':
      return 'hier (Casablanca)';
    case 'last7days':
      return '7 derniers jours (glissant, 168h)';
    case 'all':
      return 'tout l’historique';
    default:
      return 'période sélectionnée';
  }
}

/**
 * Fenêtre approximative (heures) pour les agrégats monitoring RuCallApi (OAuth / calendar).
 * @param {'today' | 'yesterday' | 'last7days' | 'all'} preset
 */
export function getMonitoringRuApisHoursHint(preset) {
  if (preset === 'all') return 24 * 30;
  if (preset === 'today') return 30;
  if (preset === 'yesterday') return 48;
  return 24 * 7;
}
