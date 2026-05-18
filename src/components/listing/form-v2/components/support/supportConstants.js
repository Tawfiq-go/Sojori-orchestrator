export const CATEGORY_GROUP_LABELS = {
  technical: '🔧 Technique',
  access: '🔑 Accès & Sécurité',
  equipment: '📦 Équipements',
  lost_found: '🔎 Objets trouvés / perdus',
  nuisance: '🔊 Nuisances',
  information: '❓ Informations',
  emergency: '🚨 Urgences',
  other: '💬 Autres',
};

export const PRIORITY_COLORS = {
  urgent: '#D32F2F',
  high: '#F57C00',
  normal: '#388E3C',
};

export function emptyCategoryForm(displayOrder = 1) {
  return {
    id: `custom_${Date.now()}`,
    enabled: true,
    category: 'other',
    name: { fr: '', en: '', ar: '' },
    description: { fr: '', en: '', ar: '' },
    icon: '💬',
    displayOrder,
    priority: 'normal',
    requiresPhoto: false,
    requiresPMValidation: false,
    alertPM: false,
    estimatedResponseTime: { fr: '2 heures', en: '2 hours', ar: 'ساعتان' },
    autoResponse: { fr: '', en: '', ar: '' },
    troubleshootingSteps: {},
    fields: {
      description: {
        type: 'textarea',
        required: true,
        label: { fr: 'Description', en: 'Description', ar: 'الوصف' },
        placeholder: {
          fr: 'Décrivez votre demande',
          en: 'Describe your request',
          ar: 'صف طلبك',
        },
      },
    },
    relatedToAmenities: false,
  };
}

export function cleanEmptyStrings(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const cleaned = {};
  for (const key in obj) {
    if (obj[key] !== '') cleaned[key] = obj[key];
  }
  return cleaned;
}

export function cleanCategoriesForSave(categories) {
  return categories.map((cat) => ({
    ...cat,
    name: cleanEmptyStrings(cat.name),
    description: cleanEmptyStrings(cat.description),
    estimatedResponseTime: cleanEmptyStrings(cat.estimatedResponseTime),
    autoResponse: cat.autoResponse ? cleanEmptyStrings(cat.autoResponse) : undefined,
  }));
}
