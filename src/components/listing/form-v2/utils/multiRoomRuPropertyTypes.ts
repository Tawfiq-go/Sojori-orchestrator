/**
 * TYPE RU pour Config Rooms Multi = dico **`Pull_ListPropTypes_RQ`**
 * (Studio, One Bedroom…) → `Push_PutProperty_RQ/Property/PropertyTypeID`.
 *
 * Source Sojori : collection **RoomTypeConfig** (sync `syncpropertyTypes`),
 * **pas** PropertyType (Hotel / Riad / Private room — autre dico, IDs invalides → RU 170).
 *
 * @see https://developer.rentalsunited.com/ — List property types
 * @see docs/RU/OFFICIAL_API_REFERENCE_LINKS.md
 */

/** IDs ListPropTypes usuels pour un riad / hôtel (Studio → 10 chambres). */
export const MULTI_ROOM_LIST_PROP_TYPE_IDS = new Set([
  1, // Studio
  2, // One Bedroom
  3, // Two Bedroom
  4, // Three Bedroom
  12, // Four Bedroom
  11, // Five Bedroom
  26, // Six Bedroom
  27, // Seven Bedroom
  28, // Eight Bedroom
  29, // Nine Bedroom
  30, // Ten Bedroom
]);

/** @deprecated alias — préférer MULTI_ROOM_LIST_PROP_TYPE_IDS */
export const MULTI_ROOM_RU_PROPERTY_TYPE_IDS = MULTI_ROOM_LIST_PROP_TYPE_IDS;

export type RuPropertyTypeOption = {
  _id: string;
  name: string;
  rentalPropertyTypeId?: number;
  manageRoomType?: boolean;
};

export type RoomTypeConfigOption = {
  _id: string;
  type?: string;
  name?: string;
  rentalPropertyTypeId?: number;
};

/**
 * Options TYPE RU Multi depuis RoomTypeConfig (ListPropTypes).
 * Fallback : filtre PropertyType seulement si les IDs matchent ListPropTypes.
 */
export function multiRoomTypeRuOptions(args: {
  roomTypeConfigs?: RoomTypeConfigOption[];
  propertyTypes?: RuPropertyTypeOption[];
}): RuPropertyTypeOption[] {
  const fromConfigs = (args.roomTypeConfigs || [])
    .map((r) => {
      const id = Number(r.rentalPropertyTypeId);
      if (!Number.isFinite(id) || !MULTI_ROOM_LIST_PROP_TYPE_IDS.has(id)) return null;
      return {
        _id: String(r._id),
        name: String(r.type || r.name || `Type ${id}`),
        rentalPropertyTypeId: id,
      } satisfies RuPropertyTypeOption;
    })
    .filter(Boolean) as RuPropertyTypeOption[];

  if (fromConfigs.length > 0) {
    return fromConfigs.sort(
      (a, b) => Number(a.rentalPropertyTypeId) - Number(b.rentalPropertyTypeId),
    );
  }

  return filterMultiRoomPropertyTypes(args.propertyTypes || []);
}

/** Filtre PropertyType Mongo si jamais les IDs ListPropTypes y sont présents. */
export function filterMultiRoomPropertyTypes(
  rows: RuPropertyTypeOption[],
): RuPropertyTypeOption[] {
  return (rows || [])
    .filter((r) => {
      const id = Number(r.rentalPropertyTypeId);
      return Number.isFinite(id) && MULTI_ROOM_LIST_PROP_TYPE_IDS.has(id);
    })
    .sort((a, b) => Number(a.rentalPropertyTypeId) - Number(b.rentalPropertyTypeId));
}
