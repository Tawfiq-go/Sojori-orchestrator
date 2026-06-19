/** Catégories RU (préfixe avant « : ») → libellés bilingues + groupe Sojori. */
const RU_IMAGE_CATEGORY: Record<string, { fr: string; en: string; categorySojori: string }> = {
  'Main Image': { fr: 'Image principale', en: 'Main image', categorySojori: 'Divers' },
  'Property Plan': { fr: 'Plan du logement', en: 'Property plan', categorySojori: 'Divers' },
  Interior: { fr: 'Intérieur', en: 'Interior', categorySojori: 'Espaces de vie' },
  Exterior: { fr: 'Extérieur', en: 'Exterior', categorySojori: 'Extérieur & jardin' },
  Pool: { fr: 'Piscine', en: 'Pool', categorySojori: 'Extérieur & jardin' },
  Rooms: { fr: 'Pièces', en: 'Rooms', categorySojori: 'Chambres' },
  Dining: { fr: 'Repas', en: 'Dining', categorySojori: 'Cuisine & buanderie' },
  Activities: { fr: 'Activités', en: 'Activities', categorySojori: 'Loisirs & divertissement' },
  Spa: { fr: 'Spa', en: 'Spa', categorySojori: 'Loisirs & divertissement' },
  Other: { fr: 'Autre', en: 'Other', categorySojori: 'Divers' },
}

/** Sous-libellés RU (partie après « : ») ou libellés sans catégorie. */
const RU_IMAGE_SUBLABEL_FR: Record<string, string> = {
  'ATM/Banking on site': 'Distributeur / banque sur place',
  Aerobics: 'Aérobic',
  'Alcoholic drinks': 'Boissons alcoolisées',
  'American breakfast': 'Petit-déjeuner américain',
  Animals: 'Animaux',
  Arcade: 'Salle d’arcade',
  Archery: 'Tir à l’arc',
  'Asian breakfast': 'Petit-déjeuner asiatique',
  BBQ: 'Barbecue',
  Ballroom: 'Salle de bal',
  Bar: 'Bar',
  'Basketball court': 'Terrain de basket',
  Bathroom: 'Salle de bain',
  'Bathroom amenities': 'Articles de salle de bain',
  Beach: 'Plage',
  'Beach ocean sea view': 'Vue mer / océan',
  Bed: 'Lit',
  Billiard: 'Billard',
  'Birds eye': 'Vue aérienne',
  'Birthday party area': 'Espace anniversaire',
  Boating: 'Navigation / bateau',
  Breakfast: 'Petit-déjeuner',
  'Buffet breakfast': 'Petit-déjeuner buffet',
  'Bunk bed': 'Lit superposé',
  'Business facilities': 'Espace business',
  Cafe: 'Café',
  Canoeing: 'Canoë',
  Casino: 'Casino',
  'Certificate award': 'Certificat / récompense',
  Chapel: 'Chapelle',
  'Check-in/out kiosk': 'Bornes check-in / check-out',
  'Children activities': 'Activités enfants',
  'Children playground': 'Aire de jeux enfants',
  'Childrens area': 'Espace enfants',
  'City shuttle': 'Navette ville',
  'City view': 'Vue ville',
  'Coffee service': 'Service café',
  'Coffee/Tea facilities': 'Machine café / thé',
  'Communal kitchen': 'Cuisine commune',
  'Concierge desk': 'Conciergerie',
  'Continental breakfast': 'Petit-déjeuner continental',
  Cot: 'Lit bébé',
  'Couples dining': 'Repas en couple',
  Cycling: 'Vélo',
  Darts: 'Fléchettes',
  'Day care': 'Garde d’enfants',
  'Deep soaking bathtub': 'Baignoire immersion',
  Delicatessen: 'Épicerie fine',
  Detail: 'Détail',
  Dining: 'Repas',
  Dinner: 'Dîner',
  Diving: 'Plongée',
  Dock: 'Quai / ponton',
  Drinks: 'Boissons',
  'English/Irish breakfast': 'Petit-déjeuner anglais / irlandais',
  Entertainment: 'Divertissement',
  Entrance: 'Entrée',
  'Equipment storage': 'Local à équipements',
  Facial: 'Soin visage',
  'Family dining': 'Repas en famille',
  Fireplace: 'Cheminée',
  Fishing: 'Pêche',
  'Fitness centre facilities': 'Salle de fitness',
  'Fitness studio': 'Studio fitness',
  Food: 'Nourriture',
  'Food and drinks': 'Nourriture et boissons',
  'Food close up': 'Gros plan nourriture',
  'Food court': 'Aire de restauration',
  Fountain: 'Fontaine',
  'Gated community': 'Résidence sécurisée',
  Gazebo: 'Gazebo / tonnelle',
  'Gift shop': 'Boutique cadeaux',
  Golf: 'Golf',
  'Golf cart': 'Voiturette de golf',
  Hallway: 'Couloir',
  Hiking: 'Randonnée',
  'Horse riding': 'Équitation',
  'Hot spring bath': 'Bain de source chaude',
  Hunting: 'Chasse',
  'Indoor golf driving range': 'Practice de golf intérieur',
  'Indoor spa tub': 'Bain à remous intérieur',
  'Indoor wedding': 'Mariage intérieur',
  'Indoor/Outdoor pool': 'Piscine intérieure / extérieure',
  'Infinity pool': 'Piscine à débordement',
  Interior: 'Intérieur',
  'Italian breakfast': 'Petit-déjeuner italien',
  'Jetted tub': 'Baignoire balnéo',
  Karaoke: 'Karaoké',
  Kitchen: 'Cuisine',
  Lake: 'Lac',
  'Lake view': 'Vue lac',
  Landmark: 'Point de repère',
  'Lap pool': 'Piscine couloir',
  'Laundry room': 'Buanderie',
  'Living area': 'Espace de vie',
  Lobby: 'Hall',
  'Lobby/Sitting area': 'Hall / salon',
  'Location map': 'Plan d’accès',
  'Logo sign': 'Enseigne / logo',
  Lounge: 'Salon',
  Lunch: 'Déjeuner',
  'Main Image': 'Image principale',
  Marina: 'Marina',
  Massage: 'Massage',
  Meals: 'Repas',
  'Meeting/Conference room': 'Salle de réunion',
  Microwave: 'Micro-ondes',
  Minibar: 'Minibar',
  Minigolf: 'Minigolf',
  'Mosquito nets': 'Moustiquaires',
  'Mountain view': 'Vue montagne',
  'Natural pool': 'Piscine naturelle',
  Nightclub: 'Discothèque',
  'Non alcoholic drinks': 'Boissons sans alcool',
  'On site shops': 'Commerces sur place',
  Other: 'Autre',
  'Outdoor banquet area': 'Banquet extérieur',
  'Outdoor dining': 'Repas en extérieur',
  'Outdoor pool': 'Piscine extérieure',
  'Outdoor rock climbing': 'Escalade extérieure',
  'Outdoor spa tub': 'Bain à remous extérieur',
  'Outdoor wedding area': 'Mariage en extérieur',
  Parking: 'Parking',
  Pets: 'Animaux domestiques',
  Pilates: 'Pilates',
  'Pool view': 'Vue piscine',
  'Pool waterfall': 'Cascade piscine',
  'Poolside bar': 'Bar au bord de la piscine',
  'Pro shop': 'Pro-shop',
  Property: 'Propriété',
  'Property Plan': 'Plan du logement',
  'Property amenity': 'Équipement du logement',
  'Property grounds': 'Terrain de la propriété',
  'RV or truck parking': 'Parking camping-car / camion',
  Reception: 'Réception',
  'Reception hall': 'Hall de réception',
  Refrigerator: 'Réfrigérateur',
  Restaurant: 'Restaurant',
  'River view': 'Vue rivière',
  'Rock climbing wall indoor': 'Mur d’escalade intérieur',
  Room: 'Chambre',
  'Room changing table': 'Table à langer',
  'Room service dining': 'Room service',
  'Ropes course team building': 'Parcours accrobranche',
  Safe: 'Coffre-fort',
  Sauna: 'Sauna',
  'Shopping area': 'Zone commerçante',
  Shower: 'Douche',
  Sink: 'Lavabo',
  'Ski hill': 'Piste de ski',
  'Ski school': 'École de ski',
  'Ski sports': 'Sports de ski',
  Skiing: 'Ski',
  'Snack bar': 'Snack-bar',
  Snorkeling: 'Plongée avec tuba',
  Snowboarding: 'Snowboard',
  Solarium: 'Solarium',
  'Spa treatment': 'Soin spa',
  'Spa tub': 'Bain spa',
  Sports: 'Sports',
  'Sports bar': 'Bar sportif',
  Squash: 'Squash',
  Staircase: 'Escalier',
  'Steam room': 'Hammam',
  'Street view': 'Vue rue',
  'Supermakret grocery shop': 'Supermarché / épicerie',
  'Swimming pool': 'Piscine',
  'TV and multimedia': 'TV et multimédia',
  'Table tennis': 'Ping-pong',
  'Tennis court': 'Court de tennis',
  Toilet: 'Toilettes',
  'Treatment room': 'Salle de soins',
  'Turkish bath': 'Bain turc',
  'Vichy shower': 'Douche Vichy',
  'View from property': 'Vue depuis la propriété',
  'View from room': 'Vue depuis la chambre',
  'Water park': 'Parc aquatique',
  Waterslide: 'Toboggan aquatique',
  Windsurfing: 'Planche à voile',
  Yoga: 'Yoga',
}

export type LocalizedRuImageCaption = {
  nameSojoriEn: string
  nameSojoriFr: string
  categorySojori: string
}

function translateSubLabel(subEn: string): string {
  const key = subEn.trim()
  return RU_IMAGE_SUBLABEL_FR[key] || key
}

function formatBilingual(categoryKey: string, subEn: string): LocalizedRuImageCaption {
  const cat = RU_IMAGE_CATEGORY[categoryKey] || {
    fr: categoryKey,
    en: categoryKey,
    categorySojori: 'Divers',
  }
  const subFr = translateSubLabel(subEn)
  const subEnClean = subEn.trim()
  return {
    nameSojoriEn: subEnClean ? `${cat.en}: ${subEnClean}` : cat.en,
    nameSojoriFr: subEnClean ? `${cat.fr} : ${subFr}` : cat.fr,
    categorySojori: cat.categorySojori,
  }
}

/** RU ImageCaption / nameRu → libellés Sojori FR + EN propres. */
export function localizeRuImageCaption(ruCaption: string): LocalizedRuImageCaption {
  const raw = String(ruCaption || '').trim()
  if (!raw) {
    return { nameSojoriEn: '', nameSojoriFr: '', categorySojori: 'Divers' }
  }

  const colonIdx = raw.indexOf(': ')
  if (colonIdx >= 0) {
    return formatBilingual(raw.slice(0, colonIdx), raw.slice(colonIdx + 2))
  }

  const standaloneFr = RU_IMAGE_SUBLABEL_FR[raw]
  if (standaloneFr) {
    const cat = RU_IMAGE_CATEGORY[raw]
    return {
      nameSojoriEn: raw,
      nameSojoriFr: standaloneFr,
      categorySojori: cat?.categorySojori || 'Divers',
    }
  }

  const cat = RU_IMAGE_CATEGORY[raw]
  if (cat) {
    return { nameSojoriEn: cat.en, nameSojoriFr: cat.fr, categorySojori: cat.categorySojori }
  }

  return { nameSojoriEn: raw, nameSojoriFr: raw, categorySojori: 'Divers' }
}

