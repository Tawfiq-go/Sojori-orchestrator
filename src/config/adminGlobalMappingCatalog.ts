/**
 * Mappings globaux plateforme (site, admin, devise, ordre catalogue) — section Administration.
 * Données principalement srv-admin (+ srv-calendar pour ordre listings).
 */

import type { MappingGroup } from './mappingTypes';

export const ADMIN_GLOBAL_MAPPING_GROUPS: MappingGroup[] = [
  {
    id: 'geo',
    label: 'Villes, pays & langues',
    description: 'Référentiels géographiques et contenus site — base srv-admin.',
    items: [
      {
        id: 'cities-countries',
        label: 'Pays & villes',
        description: 'CRUD pays et villes Sojori (rentalCityId / rentalCountryId).',
        path: '/admin/settings?tab=admin-config',
        target: 'orchestrator',
        legacyTabHint: 'Legacy : onglets Countries · Cities',
        tags: ['Sojori', 'ville'],
        apiHint: 'srv-admin countries · cities',
        database: 'srv-admin',
      },
      {
        id: 'cities-mapping',
        label: 'Mapping villes (site)',
        description: 'Ordre et visibilité villes sur le site / moteur de réservation.',
        path: '/admin/Settings?tab=admin-config',
        target: 'legacy',
        legacyTabHint: 'Onglet Cities Mapping',
        tags: ['Sojori', 'ville'],
        apiHint: 'citymapping · get-cities-mapping',
        database: 'srv-admin',
      },
      {
        id: 'languages',
        label: 'Langues',
        description: 'Langues plateforme ↔ rentalLanguageId RU.',
        path: '/admin/Settings?tab=admin-config',
        target: 'legacy',
        legacyTabHint: 'Onglet Languages',
        tags: ['RU', 'Sojori'],
        apiHint: 'languages',
        database: 'srv-admin',
      },
      {
        id: 'blogs-mapping',
        label: 'Mapping blogs',
        description: 'Ordre articles blog par ville.',
        path: '/admin/Settings?tab=admin-config',
        target: 'legacy',
        legacyTabHint: 'Onglet blogs Mapping',
        tags: ['Sojori'],
        apiHint: 'blogmapping',
        database: 'srv-admin',
      },
    ],
  },
  {
    id: 'currency',
    label: 'Devises & change',
    description: 'Configuration monétaire globale.',
    items: [
      {
        id: 'currency',
        label: 'Devises',
        description: 'Devises actives et taux (référentiel admin).',
        path: '/admin/setting/currency',
        target: 'orchestrator',
        tags: ['Sojori', 'currency'],
        apiHint: 'srv-admin currency',
        database: 'srv-admin',
      },
      {
        id: 'owner-city-currency',
        label: 'Mapping ville / devise par owner',
        description: 'rentals-cities-mapping par propriétaire (formulaire adresse listing).',
        path: '/admin/Settings?tab=admin-config',
        target: 'legacy',
        legacyTabHint: 'Configuré côté owner — API rentals-cities-mapping',
        tags: ['Sojori', 'owner'],
        apiHint: 'srv-listing user/rentals-cities-mapping',
        database: 'srv-listing',
      },
    ],
  },
  {
    id: 'catalog-order',
    label: 'Ordre catalogue & unités',
    description: 'Affichage global hors mapping RU champ par champ.',
    items: [
      {
        id: 'listing-order',
        label: 'Ordre des listings',
        description: 'Ordre d’affichage catalogue (staging / prod).',
        path: '/admin/Listing/listingMapping',
        target: 'legacy',
        tags: ['Sojori'],
        apiHint: 'srv-calendar listing-mapping',
        database: 'srv-calendar',
      },
      {
        id: 'unit-mapping',
        label: 'Unit mapping (immobilier)',
        description: 'Mapping unités projet / lots.',
        path: '/admin/Immobilier?tab=unit-mapping',
        target: 'legacy',
        tags: ['Sojori', 'unit'],
        apiHint: 'unitmapping',
        database: 'srv-listing',
      },
    ],
  },
];
