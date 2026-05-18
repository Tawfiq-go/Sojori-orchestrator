/** Migre clientFields booléens → objets { required, type, label }. */
export function migrateClientFields(clientFields) {
  if (!clientFields || typeof clientFields !== 'object') return {};
  const migrated = {};
  for (const [key, value] of Object.entries(clientFields)) {
    if (typeof value === 'object' && value !== null && 'required' in value) {
      migrated[key] = value;
    } else if (typeof value === 'boolean') {
      const fieldLabels = {
        numberOfPeople: { fr: 'Nombre de personnes', en: 'Number of people', ar: 'عدد الأشخاص' },
        arrivalDateTime: { fr: "Date et heure d'arrivée", en: 'Arrival date and time', ar: 'تاريخ ووقت الوصول' },
        flightNumber: { fr: 'Numéro de vol', en: 'Flight number', ar: 'رقم الرحلة' },
        customRequest: { fr: 'Demande personnalisée', en: 'Custom request', ar: 'طلب مخصص' },
        shoppingList: { fr: 'Liste de courses', en: 'Shopping list', ar: 'قائمة التسوق' },
      };
      migrated[key] = {
        required: value,
        type: key === 'shoppingList' || key === 'customRequest' ? 'textarea' : 'text',
        label: fieldLabels[key] || { fr: key, en: key, ar: key },
      };
    }
  }
  return migrated;
}

export function migrateServiceList(services, pricingDefault) {
  return (services || []).map((service) => ({
    ...service,
    clientFields: migrateClientFields(service.clientFields),
    pricing: { type: pricingDefault, ...service.pricing },
  }));
}
