/** Options séjour natives (piscine, beds) — mêmes champs visuels que les ambiances. */
export const STAY_OPTION_POOL = {
  title: 'Piscine privée',
  category: 'Réservation',
  choiceLabel: 'Choix simple',
  daysLabel: 'Toutes les nuits du séjour',
  description:
    'Votre villa bénéficie d’une piscine privée, disponible sur demande au tarif supplémentaire.',
  defaultPriceMad: 1000,
} as const;

export const STAY_OPTION_BEDS = {
  title: 'Beds piscine',
  category: 'Réservation',
  choiceLabel: 'Choix multiple',
  daysLabel: 'Arrivée → départ, au jour',
  description: 'Réservez vos beds piscine, au jour, de l’arrivée au départ.',
  defaultPriceMad: 200,
} as const;
