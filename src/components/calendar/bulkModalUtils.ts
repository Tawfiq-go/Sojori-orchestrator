export function dateRangeFromSelection(selectedDates: string[]) {
  const sorted = [...selectedDates].sort();
  return {
    date_from: sorted[0],
    date_to: sorted[sorted.length - 1],
    count: sorted.length,
  };
}

export function basePayload(listingId: string, selectedDates: string[]) {
  const { date_from, date_to } = dateRangeFromSelection(selectedDates);
  return { roomTypeId: listingId, date_from, date_to };
}
