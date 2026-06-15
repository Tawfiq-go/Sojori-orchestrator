/**
 * Mapping API/Webhooks RU + REST proxy (srv-channels → RU) pour l’onglet Debug Channels.
 */

function escapeRegex(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Valeur `ChannelBookingIngress.ruEventKey` pour le filtre Mongo / GET /ingress.
 * Les résas RU stockent les racines XML (`LNM_*`), pas les libellés marketing du dashboard.
 * À garder aligné avec `mapSemanticIngressRuEventKey` dans srv-channels `internalDashboard.ts`.
 */
export function ingressWebhookRuEventKeyFilter(apiName) {
  const k = String(apiName || '').trim();
  const upsert = ['LNM_PutConfirmedReservation_RQ', 'LNM_PutUnconfirmedReservation_RQ'];
  const reservationAliases = {
    NewReservation: { $in: upsert },
    ModifiedReservation: { $in: upsert },
    CancelledReservation: 'LNM_CancelReservation_RQ',
    NewLead: 'LNM_PutLeadReservation_RQ',
  };
  if (reservationAliases[k] != null) return reservationAliases[k];
  const messaging = ['NewMessage', 'ModifiedMessage', 'ReadMessage', 'NewThread'];
  if (messaging.includes(k)) {
    return { $regex: `^${escapeRegex(k)}$`, $options: 'i' };
  }
  return k;
}

export const RU_API_MAPPING = {
  pull: [
    { name: 'Pull_ListAmenities_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Dictionnaires' },
    { name: 'Pull_ListAmenitiesAvailableForRooms_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Dictionnaires' },
    { name: 'Pull_ListPropTypes_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Dictionnaires' },
    { name: 'Pull_ListOTAPropTypes_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Dictionnaires' },
    { name: 'Pull_ListDepositTypes_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Dictionnaires' },
    { name: 'Pull_ListPaymentMethods_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Dictionnaires' },
    { name: 'Pull_ListStatuses_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Dictionnaires' },
    { name: 'Pull_ListImageTypes_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Dictionnaires' },
    { name: 'Pull_ListLanguages_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Dictionnaires' },
    { name: 'Pull_GetLocationDetails_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Dictionnaires' },
    { name: 'Pull_ListLocations_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Dictionnaires' },
    { name: 'Pull_ListCurrencies_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Dictionnaires' },
    { name: 'Pull_ListProperties_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Listings' },
    { name: 'Pull_ListSpecProp_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Listings' },
    { name: 'Pull_GetMinStay_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Listings' },
    { name: 'Pull_ListReservations_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Calendrier', category: 'Calendar' },
    { name: 'Pull_GetReservationDetails_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Réservations' },
    { name: 'Pull_GetLeads_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Réservations' },
    { name: 'Pull_ListMyUsers_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'User', category: 'Users' },
    { name: 'Pull_ListSalesChannels_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Distribution', category: 'Channel Manager' },
    { name: 'CM_Pull_PropertiesStatus_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Distribution', category: 'Channel Manager' },
    { name: 'CM_Pull_PropertySalesChannels_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Distribution', category: 'Channel Manager' },
  ],
  push: [
    { name: 'Push_PutProperty_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Listings' },
    { name: 'Push_PutBuilding_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Listings' },
    { name: 'Push_PutComposition_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Listings' },
    { name: 'Push_PutDescription_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Listings' },
    { name: 'Push_PutImage_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Listings' },
    { name: 'Push_PutLocation_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Listings' },
    { name: 'Push_PutPaymentMethods_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Listings' },
    { name: 'Push_PutMinStay_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Listings' },
    { name: 'Push_PutChangeOver_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Listings' },
    { name: 'Push_PutPrices_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Calendrier', category: 'Calendar' },
    { name: 'Push_PutAvbUnits_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Calendrier', category: 'Calendar' },
    { name: 'Push_PutLongStayDiscounts_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Calendrier', category: 'Calendar' },
    { name: 'Push_PutLastMinuteDiscounts_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Calendrier', category: 'Calendar' },
    { name: 'Push_PutSeasons_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Calendrier', category: 'Calendar' },
    { name: 'Push_ConfirmReservation_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Réservations' },
    { name: 'Push_RejectRequest_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Réservations' },
    { name: 'Push_PutConfirmedReservationMulti_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Réservations' },
    { name: 'Push_CancelReservation_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Réservations' },
    { name: 'Push_CreateUser_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'User', category: 'Owner RU' },
    { name: 'Push_FillCompanyDetails_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'User', category: 'Owner RU' },
    { name: 'Push_ArchiveUser_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'User', category: 'Owner RU' },
    { name: 'LNM_PutHandlerUrl_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'User', category: 'Users' },
    { name: 'CM_ChangePropertySalesChannel_RQ', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Distribution', category: 'Channel Manager' },
  ],
  oauth: [
    { name: 'GetMasterToken', collection: 'RuCallApi', service: 'srv-user', visibleIn: 'OAuth', category: 'OAuth PMS' },
    { name: 'GetUserToken', collection: 'RuCallApi', service: 'srv-user', visibleIn: 'OAuth', category: 'OAuth PMS' },
  ],
  webhooks: [
    { name: 'NewMessage', collection: 'ChannelBookingIngress', service: 'srv-channels', visibleIn: 'Messages', category: 'Messaging', field: 'ruMessaging' },
    { name: 'ModifiedMessage', collection: 'ChannelBookingIngress', service: 'srv-channels', visibleIn: 'Messages', category: 'Messaging', field: 'ruMessaging' },
    { name: 'ReadMessage', collection: 'ChannelBookingIngress', service: 'srv-channels', visibleIn: 'Messages', category: 'Messaging', field: 'ruMessaging' },
    { name: 'NewThread', collection: 'ChannelBookingIngress', service: 'srv-channels', visibleIn: 'Messages', category: 'Messaging', field: 'ruMessaging' },
    { name: 'GuestReview', collection: 'ChannelBookingIngress', service: 'srv-channels', visibleIn: 'Reviews', category: 'Reviews', field: 'ruMessaging' },
    { name: 'AirbnbGuestReview', collection: 'ChannelBookingIngress', service: 'srv-channels', visibleIn: 'Reviews', category: 'Reviews', field: 'ruMessaging' },
    { name: 'NewReservation', collection: 'ChannelBookingIngress', service: 'srv-channels', visibleIn: 'Réservations', category: 'Reservations', field: 'canonicalRuBookingV2' },
    { name: 'ModifiedReservation', collection: 'ChannelBookingIngress', service: 'srv-channels', visibleIn: 'Réservations', category: 'Reservations', field: 'canonicalRuBookingV2' },
    { name: 'CancelledReservation', collection: 'ChannelBookingIngress', service: 'srv-channels', visibleIn: 'Réservations', category: 'Reservations', field: 'canonicalRuBookingV2' },
    { name: 'NewLead', collection: 'ChannelBookingIngress', service: 'srv-channels', visibleIn: 'Réservations', category: 'Reservations', field: 'canonicalRuBookingV2' },
  ],
  /**
   * REST RU sortant (srv-reservations → srv-channels proxy → RU).
   * `name` = valeur exacte du champ Mongo `action` (voir `stableRestAuditAction` côté srv-channels).
   */
  rest: [
    { name: 'RU_REST_GET_api_messaging_threads', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Messagerie REST' },
    { name: 'RU_REST_GET_api_messaging_threads_x', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Messagerie REST' },
    { name: 'RU_REST_GET_api_messaging_threads_x_messages', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Messagerie REST' },
    { name: 'RU_REST_POST_api_messaging_threads_x_messages', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Messagerie REST' },
    { name: 'RU_REST_PUT_api_messaging_threads_x_messages_markasread', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Messagerie REST' },
    { name: 'RU_REST_GET_api_messaging_messages_x', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Messagerie REST' },
    { name: 'RU_REST_GET_api_reviews_thread_x', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Avis REST' },
    { name: 'RU_REST_GET_api_reviews_thread_x_messages', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Avis REST' },
    { name: 'RU_REST_POST_api_reviews_airbnb_review', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Avis REST' },
    { name: 'RU_REST_POST_api_reviews_vrbo_rateguest', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Avis REST' },
    { name: 'RU_REST_POST_api_reviews_airbnb_reviewreply', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Avis REST' },
    { name: 'RU_REST_POST_api_reviews_bcom_reviewreply', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Avis REST' },
    { name: 'RU_REST_POST_api_reviews_vrbo_reviewreply', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Avis REST' },
    { name: 'RU_REST_POST_api_reviews_expedia_reviewreply', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Avis REST' },
    { name: 'RU_REST_GET_api_airbnb_specialOffers', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Leads / Airbnb' },
    { name: 'RU_REST_POST_api_airbnb_specialOffers', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Leads / Airbnb' },
    { name: 'RU_REST_PUT_api_airbnb_specialOffers', collection: 'ChannelRuApiCall', service: 'srv-channels', visibleIn: 'Debug', category: 'Leads / Airbnb' },
  ],
};

/**
 * Obtenir le filtre MongoDB pour une API spécifique
 */
export function getMongoFilterForApi(apiName, collection) {
  // Pour ChannelRuApiCall et RuCallApi
  if (collection === 'ChannelRuApiCall' || collection === 'RuCallApi') {
    return { action: apiName };
  }

  // Pour ChannelBookingIngress (webhooks)
  if (collection === 'ChannelBookingIngress') {
    const webhook = RU_API_MAPPING.webhooks.find(w => w.name === apiName);
    if (webhook) {
      const ruEventKey = ingressWebhookRuEventKeyFilter(apiName);
      const base = { ruEventKey };
      if (webhook.field === 'ruMessaging') {
        return { ...base, ruMessaging: { $exists: true, $ne: null } };
      }
      return base;
    }
  }

  return { action: apiName };
}

/**
 * Obtenir la couleur de badge par statut
 */
export function getBadgeColor(api) {
  if (api.visibleIn) return 'green'; // Déjà affiché
  if (api.collection === 'RuCallApi') return 'orange'; // À migrer
  return 'red'; // Manquant
}

/**
 * Stats globales
 */
export function getApiStats() {
  const allApis = [
    ...RU_API_MAPPING.pull,
    ...RU_API_MAPPING.push,
    ...RU_API_MAPPING.oauth,
    ...RU_API_MAPPING.webhooks,
    ...(RU_API_MAPPING.rest || []),
  ];

  const visible = allApis.filter(a => a.visibleIn).length;
  const toMigrate = allApis.filter(a => !a.visibleIn && a.collection === 'RuCallApi').length;
  const missing = allApis.filter(a => !a.visibleIn && a.collection !== 'RuCallApi').length;

  return {
    total: allApis.length,
    visible,
    toMigrate,
    missing,
  };
}
