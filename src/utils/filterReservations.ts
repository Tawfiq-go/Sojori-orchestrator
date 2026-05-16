// ════════════════════════════════════════════════════════════════════
// Sojori — Reservation Filtering Utilities
// Filter out cancelled reservations
// ════════════════════════════════════════════════════════════════════

import type { Reservation } from '../types/reservations.types';

/**
 * Filter out cancelled reservations
 * Excludes: CancelledByAdmin, Cancelled, CancelledByGuest
 */
export function filterActiveReservations(reservations: Reservation[]): Reservation[] {
  return reservations.filter((res) => {
    const status = res.status?.toLowerCase();
    return (
      status !== 'cancelledbyadmin' &&
      status !== 'cancelled' &&
      status !== 'cancelledbyguest'
    );
  });
}

/**
 * Filter reservations for planning view
 * Shows only: Confirmed, Pending (excludes Cancelled and Completed)
 */
export function filterPlanningReservations(reservations: Reservation[]): Reservation[] {
  return reservations.filter((res) => {
    const status = res.status?.toLowerCase();
    return (
      status === 'confirmed' ||
      status === 'pending'
    );
  });
}

/**
 * Check if a reservation is cancelled
 */
export function isReservationCancelled(reservation: Reservation): boolean {
  const status = reservation.status?.toLowerCase();
  return (
    status === 'cancelledbyadmin' ||
    status === 'cancelled' ||
    status === 'cancelledbyguest'
  );
}

/**
 * Check if a reservation is active (not cancelled)
 */
export function isReservationActive(reservation: Reservation): boolean {
  return !isReservationCancelled(reservation);
}
