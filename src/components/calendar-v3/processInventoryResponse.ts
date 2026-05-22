import moment from 'moment';

export type ProcessedInventoryData = Record<
  string,
  Record<
    string,
    {
      name?: string;
      availability: Record<string, Record<string, unknown>>;
    }
  >
>;

/** Normalise la réponse get-inventory pour le calendrier V3. */
export function processInventoryResponse(inventory: unknown[]): ProcessedInventoryData {
  const processedData: ProcessedInventoryData = {};
  if (!Array.isArray(inventory)) return processedData;

  inventory.forEach((listing: { listingId: string; roomTypes?: unknown[] }) => {
    processedData[listing.listingId] = {};
    (listing.roomTypes || []).forEach((room: {
      roomTypeId: string;
      name?: string;
      availableRoomsByDay?: Array<Record<string, unknown>>;
    }) => {
      processedData[listing.listingId][room.roomTypeId] = {
        name: room.name,
        availability: (room.availableRoomsByDay || []).reduce(
          (dayAcc: Record<string, Record<string, unknown>>, day: Record<string, unknown>) => {
            const dateStr = moment(day.date as string | Date).format('YYYY-MM-DD');
            dayAcc[dateStr] = {
              isArchived: Boolean(day.isArchived),
              availableRoom: day.availableRoom,
              basePrice: day.basePrice,
              calculatedPrice: day.calculatedPrice,
              calculatedPriceHistory: day.calculatedPriceHistory,
              manualPrice: day.manualPrice,
              applyManual: day.applyManual,
              stopSell: day.stopSell,
              useDynamicPrice: day.useDynamicPrice,
              minStay: day.min_stay_arrival,
              maxStay: day.max_stay,
              closedArrival: day.closed_to_arrival,
              closedDeparture: day.closed_to_departure,
              reservations: day.reservations || [],
            };
            return dayAcc;
          },
          {},
        ),
      };
    });
  });

  return processedData;
}
