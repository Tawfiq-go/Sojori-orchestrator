/**
 * Labels Multi (hôtel + type + unité) — Single inchangé si pas de roomType/room.
 */

export type RoomTypeNameSource = {
  roomTypeName?: string | null;
  roomTypes?: { roomTypeName?: string | null; name?: string | null } | null;
  roomName?: string | null;
  roomId?: string | null;
} | null | undefined;

/** Nom du type de chambre depuis une résa (liste, batch, détail). */
export function pickRoomTypeName(source: RoomTypeNameSource): string | undefined {
  const direct = String(source?.roomTypeName || '').trim();
  if (direct) return direct;
  const nested = String(
    source?.roomTypes?.roomTypeName || source?.roomTypes?.name || '',
  ).trim();
  return nested || undefined;
}

/** Nom unité inventaire (chambre 101 / Villa 1) — Mews ; absent RU. */
export function pickRoomUnitName(source: RoomTypeNameSource): string | undefined {
  const n = String(source?.roomName || '').trim();
  return n || undefined;
}

/**
 * « Hôtel · Suite · 101 » selon ce qui est connu.
 * N’invente rien pour Single (pas de type / room → label hôtel seul).
 */
export function formatHotelRoomLabel(
  hotelName: string | null | undefined,
  roomTypeName?: string | null,
  roomUnitName?: string | null,
): string {
  const hotel = String(hotelName || '').trim() || '—';
  const type = String(roomTypeName || '').trim();
  const unit = String(roomUnitName || '').trim();
  const parts: string[] = [hotel];
  if (type && type.toLowerCase() !== hotel.toLowerCase()) parts.push(type);
  if (unit && unit.toLowerCase() !== type.toLowerCase() && unit.toLowerCase() !== hotel.toLowerCase()) {
    parts.push(unit);
  }
  return parts.join(' · ');
}
