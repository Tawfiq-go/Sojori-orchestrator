// Catalogue conciergerie — modèles UI (FR) · chaque ajout est persisté dans ListingConciergeServices.customServices[]

export type ConciergePriceType =
  | 'ON_QUOTE'
  | 'FIXED'
  | 'PER_HOUR'
  | 'PER_PERSON'
  | 'PER_GROUP'
  | 'PER_PERSON_HOUR'
  | 'PER_GROUP_HOUR';

/** Options tarification — forfaits et combinaisons heure séparées */
export const CONCIERGE_PRICE_OPTIONS: { value: ConciergePriceType; label: string; group: 'forfait' | 'heure' }[] = [
  { value: 'ON_QUOTE', label: 'Sur devis', group: 'forfait' },
  { value: 'FIXED', label: 'Prix fixe', group: 'forfait' },
  { value: 'PER_HOUR', label: 'À l’heure (forfait)', group: 'forfait' },
  { value: 'PER_PERSON', label: 'Par personne (forfait)', group: 'forfait' },
  { value: 'PER_GROUP', label: 'Par groupe (forfait)', group: 'forfait' },
  { value: 'PER_PERSON_HOUR', label: 'Par personne et par heure', group: 'heure' },
  { value: 'PER_GROUP_HOUR', label: 'Par groupe et par heure', group: 'heure' },
];

export type ConciergeCatalogItem = {
  id: string;
  labelFr: string;
  descriptionFr: string;
  icon: string;
  priceType: ConciergePriceType;
  /** Prix fixe, horaire ou forfait groupe */
  price?: number;
  /** Prix par personne */
  pricePerPerson?: number;
  /** Capacité max (0 = non renseigné) */
  maxPersons?: number;
};

export type ConciergeCatalogCategory = {
  id: string;
  labelFr: string;
  icon: string;
  services: ConciergeCatalogItem[];
};

/** Emojis courants pour services personnalisés */
export const CONCIERGE_ICON_PICKER: string[] = [
  '✨', '🛎️', '💆', '🧖', '🧘', '🏋️', '👶', '🎈', '👨‍🍳', '🍽️',
  '🚗', '🚁', '🗺️', '🏜️', '🛥️', '🎿', '⛳', '🎾', '🏊',
  '🛍️', '👗', '💐', '🎭', '🎫', '📸', '🌅', '🐪', '🕌', '🏖️',
];

export const CONCIERGE_SERVICE_CATALOG: ConciergeCatalogCategory[] = [
  {
    id: 'wellness',
    labelFr: 'Bien-être & Spa',
    icon: '🧖',
    services: [
      { id: 'massage', labelFr: 'Massage', descriptionFr: 'Massage relaxant ou sportif à domicile', icon: '💆', priceType: 'FIXED', price: 350 },
      { id: 'spa', labelFr: 'SPA', descriptionFr: 'Soins spa et détente à la villa', icon: '🧖', priceType: 'ON_QUOTE' },
      { id: 'hammam', labelFr: 'Hammam', descriptionFr: 'Hammam traditionnel ou privatif', icon: '♨️', priceType: 'ON_QUOTE' },
      { id: 'yoga', labelFr: 'Yoga / Méditation', descriptionFr: 'Séance privée avec instructeur', icon: '🧘', priceType: 'PER_HOUR', price: 400 },
      { id: 'beauty', labelFr: 'Soins beauté', descriptionFr: 'Coiffure, manucure, soins à domicile', icon: '💅', priceType: 'ON_QUOTE' },
    ],
  },
  {
    id: 'sport',
    labelFr: 'Sport & Fitness',
    icon: '🏋️',
    services: [
      { id: 'gym', labelFr: 'Accès Gym', descriptionFr: 'Accès salle de sport partenaire', icon: '🏋️', priceType: 'FIXED', price: 150 },
      { id: 'coach', labelFr: 'Coach personnel', descriptionFr: 'Coaching sportif sur mesure', icon: '🏃', priceType: 'PER_HOUR', price: 500 },
      { id: 'tennis', labelFr: 'Tennis / Padel', descriptionFr: 'Réservation court et matériel', icon: '🎾', priceType: 'ON_QUOTE' },
      { id: 'golf', labelFr: 'Golf', descriptionFr: 'Green fee, cours ou accompagnement', icon: '⛳', priceType: 'ON_QUOTE' },
      { id: 'pool', labelFr: 'Cours de natation', descriptionFr: 'Cours privé en piscine', icon: '🏊', priceType: 'PER_HOUR', price: 450 },
    ],
  },
  {
    id: 'family',
    labelFr: 'Famille & Enfants',
    icon: '👶',
    services: [
      { id: 'kids_club', labelFr: 'Kids club', descriptionFr: 'Activités encadrées pour enfants', icon: '🎈', priceType: 'PER_GROUP', price: 800, maxPersons: 12 },
      { id: 'babysitting', labelFr: 'Babysitting', descriptionFr: 'Garde d\'enfants qualifiée', icon: '👶', priceType: 'PER_HOUR', price: 80 },
      { id: 'nanny_day', labelFr: 'Nounou journée', descriptionFr: 'Garde à la journée sur demande', icon: '🧸', priceType: 'ON_QUOTE' },
      { id: 'stroller', labelFr: 'Location poussette', descriptionFr: 'Équipement bébé à la demande', icon: '🍼', priceType: 'FIXED', price: 100 },
    ],
  },
  {
    id: 'gastronomy',
    labelFr: 'Gastronomie',
    icon: '👨‍🍳',
    services: [
      { id: 'chef', labelFr: 'Chef à domicile', descriptionFr: 'Repas préparé par un chef privé', icon: '👨‍🍳', priceType: 'ON_QUOTE' },
      { id: 'cooking_class', labelFr: 'Cours de cuisine', descriptionFr: 'Atelier culinaire à la villa', icon: '🍳', priceType: 'ON_QUOTE' },
      { id: 'breakfast_vip', labelFr: 'Petit-déjeuner VIP', descriptionFr: 'Service petit-déjeuner premium', icon: '🥐', priceType: 'FIXED', price: 250 },
      { id: 'bbq', labelFr: 'Barbecue privé', descriptionFr: 'Chef BBQ et service extérieur', icon: '🍖', priceType: 'ON_QUOTE' },
      { id: 'wine_tasting', labelFr: 'Dégustation vins', descriptionFr: 'Dégustation et accords mets-vins', icon: '🍷', priceType: 'ON_QUOTE' },
    ],
  },
  {
    id: 'experiences',
    labelFr: 'Expériences & Excursions',
    icon: '🗺️',
    services: [
      { id: 'excursion', labelFr: 'Excursion', descriptionFr: 'Sortie organisée sur mesure', icon: '🚌', priceType: 'PER_PERSON', pricePerPerson: 450, maxPersons: 8 },
      { id: 'balloon', labelFr: 'Montgolfière', descriptionFr: 'Vol en montgolfière au lever du soleil', icon: '🎈', priceType: 'ON_QUOTE' },
      { id: 'guide', labelFr: 'Guide touristique', descriptionFr: 'Guide privé FR / EN / AR', icon: '🗺️', priceType: 'PER_PERSON', pricePerPerson: 350, maxPersons: 6 },
      { id: 'desert_safari', labelFr: 'Safari désert', descriptionFr: 'Expédition désert avec dîner', icon: '🏜️', priceType: 'ON_QUOTE' },
      { id: 'boat', labelFr: 'Sortie bateau', descriptionFr: 'Croisière ou sortie mer privée', icon: '🛥️', priceType: 'ON_QUOTE' },
      { id: 'helicopter', labelFr: 'Vol hélicoptère', descriptionFr: 'Survol panoramique sur demande', icon: '🚁', priceType: 'ON_QUOTE' },
      { id: 'photo', labelFr: 'Shooting photo', descriptionFr: 'Photographe professionnel', icon: '📸', priceType: 'ON_QUOTE' },
    ],
  },
  {
    id: 'mobility',
    labelFr: 'Mobilité & Transport',
    icon: '🚗',
    services: [
      { id: 'driver', labelFr: 'Chauffeur privé', descriptionFr: 'Mise à disposition véhicule + chauffeur', icon: '🚗', priceType: 'PER_HOUR', price: 300, maxPersons: 4 },
      { id: 'car_rental', labelFr: 'Location voiture', descriptionFr: 'Véhicule avec ou sans chauffeur', icon: '🚙', priceType: 'ON_QUOTE' },
      { id: 'airport_vip', labelFr: 'Accueil aéroport VIP', descriptionFr: 'Fast track et transfert premium', icon: '✈️', priceType: 'ON_QUOTE' },
    ],
  },
  {
    id: 'lifestyle',
    labelFr: 'Shopping & Lifestyle',
    icon: '🛍️',
    services: [
      { id: 'personal_shopper', labelFr: 'Personal shopper', descriptionFr: 'Accompagnement shopping personnalisé', icon: '🛍️', priceType: 'ON_QUOTE' },
      { id: 'flowers', labelFr: 'Livraison fleurs', descriptionFr: 'Bouquet et décoration florale', icon: '💐', priceType: 'FIXED', price: 200 },
      { id: 'laundry_express', labelFr: 'Blanchisserie express', descriptionFr: 'Collecte et retour sous 24h', icon: '👔', priceType: 'FIXED', price: 120 },
      { id: 'tickets', labelFr: 'Billets & événements', descriptionFr: 'Réservation spectacles et événements', icon: '🎫', priceType: 'ON_QUOTE' },
    ],
  },
];

export function catalogItemToService(item: ConciergeCatalogItem, order: number) {
  return {
    id: item.id,
    labelFr: item.labelFr,
    descriptionFr: item.descriptionFr,
    icon: item.icon,
    priceType: item.priceType,
    price: item.price ?? 0,
    pricePerPerson: item.pricePerPerson ?? 0,
    maxPersons: item.maxPersons ?? 0,
    enabled: true,
    order,
    cityIds: 'all' as const,
  };
}

export function formatConciergePriceLabel(s: {
  priceType: ConciergePriceType;
  price: number;
  pricePerPerson: number;
  maxPersons?: number;
}): string {
  const max = s.maxPersons && s.maxPersons > 0 ? ` · max ${s.maxPersons} pers.` : '';
  switch (s.priceType) {
    case 'ON_QUOTE':
      return `Sur devis${max}`;
    case 'PER_HOUR':
      return `${s.price} MAD/h${max}`;
    case 'PER_PERSON':
      return `${s.pricePerPerson || s.price} MAD/pers.${max}`;
    case 'PER_GROUP':
      return `${s.price} MAD/groupe${max}`;
    case 'PER_PERSON_HOUR':
      return `${s.pricePerPerson || s.price} MAD/pers./h${max}`;
    case 'PER_GROUP_HOUR':
      return `${s.price} MAD/groupe/h${max}`;
    case 'FIXED':
    default:
      return `${s.price} MAD${max}`;
  }
}

export function findCatalogItem(serviceId: string): ConciergeCatalogItem | undefined {
  for (const cat of CONCIERGE_SERVICE_CATALOG) {
    const found = cat.services.find(s => s.id === serviceId);
    if (found) return found;
  }
  return undefined;
}
