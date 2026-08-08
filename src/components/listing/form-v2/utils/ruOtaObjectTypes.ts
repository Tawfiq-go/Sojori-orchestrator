/**
 * RU ListOTAPropertyTypes — ObjectTypeID (catégorie OTA Airbnb/Booking).
 * À ne PAS confondre avec ListPropTypes (PropertyTypeID = Studio / N bedroom).
 */
export const RU_OTA_OBJECT_TYPES = [
  { id: '3', label: 'Apartment' },
  { id: '35', label: 'Villa' },
  { id: '67', label: 'House' },
  { id: '72', label: 'Riad' },
  { id: '63', label: 'Aparthotel' },
  { id: '20', label: 'Hotel' },
] as const

export type RuOtaObjectTypeId = (typeof RU_OTA_OBJECT_TYPES)[number]['id']
