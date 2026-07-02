/** LogApiRU — filtres du journal + catégorisation action → catégorie (miroir backend). */
import type { LogApiRuCategory, LogApiRuDirFilter, LogApiRuStatusFilter } from '../../services/logApiRuApi';

export interface LogApiRuFilters {
  status: LogApiRuStatusFilter;
  dir: LogApiRuDirFilter;
  category: LogApiRuCategory | '';
  action: string;
  ownerId: string;
  minDur: string;
  q: string;
  correlationId: string;
}

export const EMPTY_FILTERS: LogApiRuFilters = {
  status: '',
  dir: '',
  category: '',
  action: '',
  ownerId: '',
  minDur: '',
  q: '',
  correlationId: '',
};

/** Miroir de LOGAPIRU_CATEGORY_ACTIONS (srv-channels internalDashboard.ts). */
const CATEGORY_ACTIONS: Record<Exclude<LogApiRuCategory, 'other'>, string[]> = {
  calendar: [
    'Push_PutPrices_RQ',
    'Push_PutAvbUnits_RQ',
    'Push_PutLongStayDiscounts_RQ',
    'Push_PutLastMinuteDiscounts_RQ',
    'Push_PutSeasons_RQ',
    'Pull_ListPropertyAvailabilityCalendar_RQ',
    'Pull_ListPropertyPrices_RQ',
  ],
  reservation: [
    'Pull_ListReservations_RQ',
    'Pull_GetReservationDetails_RQ',
    'Push_PutConfirmedReservationMulti_RQ',
    'Push_ConfirmReservation_RQ',
    'Push_RejectRequest_RQ',
    'Push_ModifyStay_RQ',
    'Push_CancelReservation_RQ',
  ],
  listing: [
    'ListingOtaSync_From_Channels',
    'Pull_ListProperties_RQ',
    'Pull_ListSpecProp_RQ',
    'Pull_GetMinStay_RQ',
    'Pull_GetPropertyExternalListing_RQ',
    'Push_PutProperty_RQ',
    'Push_PutBuilding_RQ',
    'Push_PutComposition_RQ',
    'Push_PutDescription_RQ',
    'Push_PutImage_RQ',
    'Push_PutLocation_RQ',
    'Push_PutPaymentMethods_RQ',
    'Push_PutMinStay_RQ',
    'Push_PutChangeOver_RQ',
  ],
  owner: [
    'Push_FillCompanyDetails_RQ',
    'Push_CreateUser_RQ',
    'Push_ArchiveUser_RQ',
    'Pull_ListMyUsers_RQ',
    'LNM_PutHandlerUrl_RQ',
    'subscribeJsonWebhook',
  ],
  lead: ['Pull_GetLeads_RQ'],
  messaging: ['RU_REST_GET_api_messaging_threads', 'RU_REST_GET_api_messaging_threads_x_messages'],
  distribution: [
    'Pull_ListSalesChannels_RQ',
    'CM_Pull_PropertiesStatus_RQ',
    'CM_Pull_PropertySalesChannels_RQ',
    'CM_ChangePropertySalesChannel_RQ',
  ],
  dictionary: ['Pull_ListAmenities_RQ', 'Pull_ListLanguages_RQ', 'Pull_ListLocations_RQ'],
} as Record<Exclude<LogApiRuCategory, 'other'>, string[]>;

const ACTION_TO_CATEGORY = new Map<string, LogApiRuCategory>();
for (const [cat, actions] of Object.entries(CATEGORY_ACTIONS)) {
  for (const a of actions) ACTION_TO_CATEGORY.set(a, cat as LogApiRuCategory);
}

export function categoryOfAction(action: string): LogApiRuCategory {
  return ACTION_TO_CATEGORY.get(action) || 'other';
}

/** Toutes les actions connues, pour le select « Toute action » du journal. */
export function knownActions(): string[] {
  return [...ACTION_TO_CATEGORY.keys()];
}
