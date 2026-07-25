/**
 * Drawer résa planning — miroir de useTaskDetailDrawer (reste sur le cockpit).
 */
import { useCallback, useState } from 'react';
import type { ListingRow, ReservationRow, TimelineItem } from '../../components/calendar-views/_shared';
import PlanningReservationDrawer, {
  type PlanningReservationFocus,
} from './PlanningReservationDrawer';

export type PlanningReservationSelection = {
  reservation: ReservationRow;
  listing: Pick<ListingRow, 'listingId' | 'listingName' | 'city'>;
  focus?: PlanningReservationFocus;
};

export function usePlanningReservationDrawer(opts?: {
  onTaskClick?: (item: TimelineItem) => void;
  onInitiateWhatsApp?: (selection: PlanningReservationSelection) => void | Promise<void>;
  canInitiateWhatsApp?: (selection: PlanningReservationSelection) => boolean;
}) {
  const [selection, setSelection] = useState<PlanningReservationSelection | null>(null);
  const [initiateBusy, setInitiateBusy] = useState(false);

  const openReservation = useCallback(
    (
      reservation: ReservationRow,
      listing: Pick<ListingRow, 'listingId' | 'listingName' | 'city'>,
      focus: PlanningReservationFocus = 'overview',
    ) => {
      setSelection({ reservation, listing, focus });
    },
    [],
  );

  const close = useCallback(() => setSelection(null), []);

  const handleInitiate = useCallback(async () => {
    if (!selection || !opts?.onInitiateWhatsApp) return;
    setInitiateBusy(true);
    try {
      await opts.onInitiateWhatsApp(selection);
    } finally {
      setInitiateBusy(false);
    }
  }, [selection, opts]);

  const drawer = selection ? (
    <PlanningReservationDrawer
      reservation={selection.reservation}
      listing={selection.listing}
      focus={selection.focus}
      onClose={close}
      onTaskClick={(item: TimelineItem) => {
        opts?.onTaskClick?.(item);
      }}
      onInitiateWhatsApp={opts?.onInitiateWhatsApp ? () => void handleInitiate() : undefined}
      initiateBusy={initiateBusy}
      canInitiateWhatsApp={
        opts?.canInitiateWhatsApp ? opts.canInitiateWhatsApp(selection) : false
      }
    />
  ) : null;

  return { openReservation, close, drawer, selection };
}

/** Retrouve une résa dans les lignes StayView par id / n°. */
export function findReservationInListings(
  listings: ListingRow[],
  routeId: string,
): PlanningReservationSelection | null {
  const key = String(routeId || '').trim();
  if (!key) return null;
  for (const listing of listings) {
    for (const reservation of listing.reservations || []) {
      if (reservation.reservationId === key || reservation.reservationNumber === key) {
        return {
          reservation,
          listing: {
            listingId: listing.listingId,
            listingName: listing.listingName,
            city: listing.city,
          },
        };
      }
    }
  }
  return null;
}
