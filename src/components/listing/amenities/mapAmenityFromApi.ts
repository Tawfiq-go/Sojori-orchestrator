import type { Amenity, CategoryName, CompositionRoom } from './_tokens';
import { ALL_CATEGORIES } from './_tokens';

function pickName(n: unknown, prefer: 'fr' | 'en'): string {
  if (typeof n === 'string' && n.trim()) return n.trim();
  if (n && typeof n === 'object') {
    const o = n as Record<string, string>;
    if (prefer === 'fr') return o.fr || o.FR || o.en || o.EN || '';
    return o.en || o.EN || o.fr || o.FR || '';
  }
  return '';
}

function pickCategories(row: Record<string, unknown>): CategoryName[] {
  const subs = row.SojoriSubcategory;
  const out: string[] = [];
  if (Array.isArray(subs)) {
    for (const s of subs) {
      if (typeof s === 'string') out.push(s);
      else if (s && typeof s === 'object') {
        const o = s as Record<string, string>;
        out.push(o.fr || o.en || o.FR || o.EN || '');
      }
    }
  }
  if (typeof row.category === 'string' && row.category) out.push(row.category);
  const valid = new Set<string>(ALL_CATEGORIES);
  return [...new Set(out.filter((c) => valid.has(c)))] as CategoryName[];
}

function pickCompositionRoomIds(comp: unknown): string[] {
  if (!Array.isArray(comp)) return [];
  const ids = comp
    .map((r) => {
      if (!r || typeof r !== 'object') return '';
      const o = r as Record<string, unknown>;
      return String(o.roomId ?? o.rentalId ?? '');
    })
    .filter(Boolean);
  return [...new Set(ids)];
}

/** Filtre catalogue « par pièce » (aligné GET /amenities?roomIds=…) */
export function amenityMatchesRoom(
  amenity: Amenity,
  roomId: string | null,
  roomRentalIds: string[],
): boolean {
  const ids = amenity.compositionRoomIds.map(String);
  if (!ids.length) return false;
  const roomSet = new Set(roomRentalIds.map(String));
  if (roomId == null) {
    return ids.some((id) => roomSet.has(id));
  }
  const active = String(roomId);
  return ids.some((id) => id === active);
}

export function mapAmenityFromApi(row: Record<string, unknown>): Amenity {
  const comp = row.compositionRooms;
  const compositionRoomIds = pickCompositionRoomIds(comp);
  return {
    _id: String(row._id || row.id || ''),
    rentalAmenityId: Number(row.rentalAmenityId) || 0,
    nameFr: pickName(row.name, 'fr') || 'Équipement',
    nameEn: pickName(row.name, 'en') || pickName(row.name, 'fr') || 'Amenity',
    categories: pickCategories(row),
    basic: Boolean(row.basic),
    useBed: Boolean(row.useBed),
    needsRoomAssignment: compositionRoomIds.length > 0,
    compositionRoomIds,
    iconUrl: typeof row.iconUrl === 'string' ? row.iconUrl : undefined,
  };
}

export function mapCompositionRoom(row: Record<string, unknown>): CompositionRoom | null {
  if (row.enable === false) return null;
  const sojori = row.RoomNameSojori as Record<string, string> | undefined;
  return {
    rentalId: String(row.rentalId ?? ''),
    roomName: String(row.roomName ?? ''),
    nameFr: sojori?.fr || String(row.roomName ?? ''),
    nameEn: sojori?.en || String(row.roomName ?? ''),
    useBed: Boolean(row.useBed),
    order: Number(row.order) || 0,
  };
}
