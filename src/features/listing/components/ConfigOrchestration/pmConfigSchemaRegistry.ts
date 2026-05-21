/**
 * Champs « design Claude » vs chemins Mongo réels (srv-listing).
 * inSchema: false → bordure rouge dans l’UI Config Orch. NEW
 */
export type PmConfigTabKey =
  | 'support-config'
  | 'concierge-config'
  | 'cleaning-config'
  | 'transport-config'
  | 'grocery-config'
  | 'service-client-config'
  | 'messages-config'
  | 'whatsapp-config'
  | 'orchestration-config';

export type SchemaFieldDef = {
  id: string;
  label: string;
  designPath: string;
  schemaPath: string | null;
  inSchema: boolean;
  note?: string;
};

export const PM_CONFIG_SCHEMA_FIELDS: Record<PmConfigTabKey, SchemaFieldDef[]> = {
  'support-config': [
    { id: 'wa-menu-support', label: 'Activer Support', designPath: 'menu WhatsApp', schemaPath: 'listing_chatbot_config.menuOptions', inSchema: true, note: 'Onglet Menu WhatsApp — pas dans Support' },
    { id: 'cat-name-fr', label: 'Label FR', designPath: 'categories[].label.fr', schemaPath: 'categories[].name.fr', inSchema: true, note: 'Design: label · BD: name' },
    { id: 'cat-icon', label: 'Icône', designPath: 'categories[].icon', schemaPath: 'categories[].icon', inSchema: true },
    { id: 'cat-order', label: 'Ordre', designPath: 'categories[].order', schemaPath: 'categories[].displayOrder', inSchema: true },
    { id: 'cat-urgency', label: 'Urgence défaut', designPath: 'categories[].defaultUrgency', schemaPath: 'categories[].priority', inSchema: true, note: 'normal | high | urgent' },
    { id: 'cat-guest-priority', label: 'Choix urgence voyageur', designPath: 'categories[].guestCanChoosePriority', schemaPath: 'categories[].fields.__sojori.guestCanChoosePriority', inSchema: true },
    { id: 'cat-fields', label: 'Champs dynamiques', designPath: '—', schemaPath: 'categories[].fields', inSchema: true, note: 'Prévu BD · UI à venir' },
  ],
  'concierge-config': [
    { id: 'wa-menu', label: 'Activer conciergerie', designPath: 'menu WhatsApp', schemaPath: 'orchestration_custom · chatbot', inSchema: true, note: 'Pas de toggle global ici' },
    { id: 'catalog', label: 'Bibliothèque (mockup)', designPath: 'conciergeServiceCatalog', schemaPath: null, inSchema: false, note: 'Catalogue UI · pas en Mongo' },
    { id: 'services', label: 'Services', designPath: 'concierge.services[]', schemaPath: 'customServices[]', inSchema: true, note: 'UI FR · EN/AR = copie FR' },
    { id: 'formulas', label: 'Formules / prix', designPath: 'services[].formulas[]', schemaPath: 'customServices[].pricing', inSchema: true, note: 'forfait · hourly_per_person · hourly_per_group' },
    { id: 'cat-max', label: 'Max personnes', designPath: 'maxPersons', schemaPath: 'customServices[].capacity.maxPassengers', inSchema: true, note: 'Facultatif' },
    { id: 'availability', label: 'Disponibilités', designPath: 'concierge.availability', schemaPath: 'customServices[].availability', inSchema: true },
  ],
  'cleaning-config': [
    { id: 'included', label: 'Ménage inclus', designPath: 'freeCleaning', schemaPath: 'orchestration_cleaning_free · frequency[] · TS_CLEAN[]', inSchema: true },
    { id: 'included-desc', label: 'Description inclus', designPath: 'includedDescriptionFr', schemaPath: 'includedCleaningDescription.fr', inSchema: true },
    { id: 'included-extras', label: 'Options payantes inclus', designPath: 'includedExtras[]', schemaPath: 'includedCleaningExtras[]', inSchema: true },
    { id: 'paid', label: 'Ménage payant', designPath: 'paidCleaningConfig', schemaPath: 'paidCleaningConfig', inSchema: true },
    { id: 'paid-wa-label', label: 'Menu WA « Ménage payant »', designPath: 'libellé fixe FR', schemaPath: 'chatbot / flow', inSchema: true, note: 'Hardcodé · pas modifiable ici' },
    { id: 'paid-days', label: 'Jours permis', designPath: 'availableWeekdays', schemaPath: 'paidCleaningConfig.availableWeekdays', inSchema: true },
    { id: 'paid-types', label: 'Types ménage payant', designPath: 'serviceTypes[]', schemaPath: 'paidCleaningConfig.serviceTypes[]', inSchema: true },
  ],
  'transport-config': [
    { id: 'wa-menu', label: 'Activer Transport', designPath: 'menu WhatsApp', schemaPath: 'orchestration_transport · listing_chatbot_config', inSchema: true, note: 'Pas de toggle global ici' },
    { id: 'routes', label: 'Routes', designPath: 'routes[]', schemaPath: 'transportServices[]', inSchema: true },
    { id: 'route-label', label: 'Nom route (FR)', designPath: 'labelFr', schemaPath: 'transportServices[].name.fr', inSchema: true, note: 'EN/AR = copie FR' },
    { id: 'route-property', label: 'Logement (listing)', designPath: 'propertyPlace', schemaPath: 'transportServices[].route.propertyName · propertyAddress · propertyLat/Lng', inSchema: true, note: 'Arrivée/départ verrouillé' },
    { id: 'route-external', label: 'Point externe', designPath: 'externalLabel', schemaPath: 'transportServices[].route.externalLabel', inSchema: true, note: 'Libellé libre (ex. Aéroport Marrakech)' },
    { id: 'route-journey', label: 'Type trajet', designPath: 'journeyTag', schemaPath: 'transportServices[].route.journeyTag', inSchema: true },
    { id: 'route-price', label: 'Prix', designPath: 'price · priceType', schemaPath: 'transportServices[].pricing', inSchema: true },
    { id: 'route-duration', label: 'Durée', designPath: 'estimatedDuration', schemaPath: 'transportServices[].route.estimatedDuration', inSchema: true },
    { id: 'route-capacity', label: 'Max passagers', designPath: 'maxPassengers', schemaPath: 'transportServices[].capacity.maxPassengers', inSchema: true },
  ],
  'grocery-config': [
    { id: 'wa-menu', label: 'Activer Courses', designPath: 'menu WhatsApp', schemaPath: 'orchestration_grocery · chatbot', inSchema: true, note: 'Pas de toggle ici' },
    { id: 'service-fee', label: 'Frais de service', designPath: 'groceries.serviceFee', schemaPath: 'groceryServices[].pricing.serviceFee', inSchema: true },
    { id: 'currency', label: 'Devise', designPath: 'groceries.currency', schemaPath: 'groceryServices[].pricing.currency', inSchema: true },
    { id: 'days', label: 'Jours disponibles', designPath: 'availability.daysOfWeek', schemaPath: null, inSchema: false, note: 'BD: availability type fenêtre · pas day pills' },
    { id: 'slots', label: 'Créneaux horaires', designPath: 'availability.timeSlots', schemaPath: null, inSchema: false },
    { id: 'lead-time', label: 'Délai minimum', designPath: 'deliveryLeadTimeHours', schemaPath: null, inSchema: false },
    { id: 'note', label: 'Note voyageur', designPath: 'noteToGuest', schemaPath: 'groceryServices[].description.fr', inSchema: true, note: 'Texte libre · pas de catalogue' },
    { id: 'products', label: 'Catalogue produits', designPath: 'products[]', schemaPath: null, inSchema: false, note: 'Retiré du design — texte libre uniquement' },
  ],
  'service-client-config': [
    { id: 'sla', label: 'SLA réponse', designPath: 'responseSlaHours', schemaPath: null, inSchema: false },
    { id: 'subjects', label: 'Objets', designPath: 'subjects[]', schemaPath: null, inSchema: false, note: 'Collection dédiée à créer' },
  ],
  'messages-config': [
    { id: 'message-fr', label: 'Instructions départ', designPath: 'messageFr', schemaPath: 'messageCheckout[0]', inSchema: true, note: 'FR seul · EN[1]=copie au save listing' },
  ],
  'whatsapp-config': [
    { id: 'menu', label: 'Menu voyageur', designPath: 'menuOptions[]', schemaPath: 'listing_chatbot_config.menuOptions', inSchema: true },
    { id: 'overrides', label: 'Overrides listing', designPath: 'overrides[]', schemaPath: 'listing_chatbot_config.overrides', inSchema: true },
    { id: 'sync', label: 'Sync propriétaire', designPath: '—', schemaPath: 'listing_chatbot_config.sync', inSchema: true },
  ],
  'orchestration-config': [
    { id: 'flags', label: 'Flags orchestration', designPath: 'orchestration_*', schemaPath: 'listing.orchestration_*', inSchema: true },
    { id: 'auto-clean', label: 'Ménage auto checkout', designPath: 'autoCleaningAfterCheckout', schemaPath: 'cleaningOrchestration.enabled', inSchema: true },
    { id: 'slots-in', label: 'Créneaux arrivée', designPath: 'checkInSlots[]', schemaPath: 'timeslot / listing', inSchema: true, note: 'Partiel · voir onglet Ménage legacy' },
  ],
};

export function countSchemaGaps(tab: PmConfigTabKey): { inSchema: number; mockup: number } {
  const fields = PM_CONFIG_SCHEMA_FIELDS[tab] || [];
  return {
    inSchema: fields.filter(f => f.inSchema).length,
    mockup: fields.filter(f => !f.inSchema).length,
  };
}
