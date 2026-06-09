/**
 * Registre des capacités — source de vérité front (aligné spec v2 + srv-fulltask TASK_TYPES).
 * @see docs/design/Sojori-Service-Matrix-v2.html
 */

import type { CapabilityColumnMode } from './types';

export type CapabilityGroupId =
  | 'cleaning'
  | 'journey'
  | 'communication'
  | 'concierge'
  | 'info';

export interface CapabilityDefinition {
  key: string;
  label: string;
  emoji: string;
  group: CapabilityGroupId;
  groupLabel: string;
  /** srv-fulltask taskTypeId — null si pas de workflow tâche */
  taskType: string | null;
  /** workflow list key prefix wf: */
  workflowKey: string | null;
  menuCodes: string[];
  orchestrationFlag: string | null;
  columns: {
    managed: CapabilityColumnMode;
    client: CapabilityColumnMode;
    orchestrated: CapabilityColumnMode;
    task: CapabilityColumnMode;
    execution: CapabilityColumnMode;
  };
  gestionHint: string;
  whatsappHint: string;
  orchestrationExpertPath: string;
}

export const CAPABILITY_GROUPS: Record<CapabilityGroupId, string> = {
  cleaning: 'Ménage',
  journey: 'Arrivée & départ',
  communication: 'Communication',
  concierge: 'Conciergerie',
  info: 'Infos séjour',
};

export const CAPABILITY_REGISTRY: CapabilityDefinition[] = [
  {
    key: 'menu_navigation',
    label: 'Menu WhatsApp',
    emoji: '📱',
    group: 'communication',
    groupLabel: 'Communication',
    taskType: null,
    workflowKey: null,
    menuCodes: ['A', 'B', 'C', 'D', 'J'],
    orchestrationFlag: null,
    columns: { managed: 'yes', client: 'yes', orchestrated: 'na', task: 'na', execution: 'na' },
    gestionHint: 'Navigation · menu principal · langue · parcours · sous-menus',
    whatsappHint: 'Options A · B · C · D · J — structure du parcours voyageur',
    orchestrationExpertPath: '/tasks/orchestration-config?tab=messages',
  },
  {
    key: 'cleaning_free',
    label: 'Ménage gratuit',
    emoji: '🧹',
    group: 'cleaning',
    groupLabel: 'Ménage',
    taskType: 'cleaning_free',
    workflowKey: 'wf:cleaning_free',
    menuCodes: ['I'],
    orchestrationFlag: 'orchestration_cleaning_free',
    columns: { managed: 'yes', client: 'yes', orchestrated: 'yes', task: 'yes', execution: 'yes' },
    gestionHint: 'Paliers durée · créneaux horaires · message voyageur',
    whatsappHint: 'Option I · fenêtre disponibilité',
    orchestrationExpertPath: '/tasks/orchestration-config?tab=workflows',
  },
  {
    key: 'cleaning_paid',
    label: 'Ménage payant',
    emoji: '✨',
    group: 'cleaning',
    groupLabel: 'Ménage',
    taskType: 'cleaning_paid',
    workflowKey: 'wf:cleaning_paid',
    menuCodes: ['I'],
    orchestrationFlag: 'orchestration_cleaning_paid',
    columns: { managed: 'yes', client: 'yes', orchestrated: 'yes', task: 'yes', execution: 'yes' },
    gestionHint: 'paidCleaningConfig · types · jours · tarifs',
    whatsappHint: 'Option I (demande ménage) · même entrée menu que inclus',
    orchestrationExpertPath: '/tasks/orchestration-config?tab=workflows',
  },
  {
    key: 'cleaning_sojori',
    label: 'Ménage Sojori auto',
    emoji: '🧼',
    group: 'cleaning',
    groupLabel: 'Ménage',
    taskType: 'checkout_cleaning',
    workflowKey: 'wf:checkout_cleaning',
    menuCodes: [],
    orchestrationFlag: 'orchestration_cleaning_sojori',
    columns: { managed: 'yes', client: 'na', orchestrated: 'yes', task: 'yes', execution: 'yes' },
    gestionHint: 'cleaningOrchestration · J+ checkout · checklist',
    whatsappHint: 'N/A — automatisation staff post-checkout',
    orchestrationExpertPath: '/tasks/orchestration-config?tab=workflows',
  },
  {
    key: 'arrival_choose',
    label: 'Choisir arrivée',
    emoji: '🛬',
    group: 'journey',
    groupLabel: 'Arrivée & départ',
    taskType: 'arrival_choose',
    workflowKey: 'wf:arrival_choose',
    menuCodes: ['D1'],
    orchestrationFlag: 'orchestration_choose_arrival',
    columns: { managed: 'yes', client: 'yes', orchestrated: 'yes', task: 'yes', execution: 'yes' },
    gestionHint: 'TS_CHECKIN · heures par défaut',
    whatsappHint: 'Option D1 · fenêtre',
    orchestrationExpertPath: '/tasks/orchestration-config?tab=workflows',
  },
  {
    key: 'departure_choose',
    label: 'Choisir départ',
    emoji: '🛫',
    group: 'journey',
    groupLabel: 'Arrivée & départ',
    taskType: 'departure_choose',
    workflowKey: 'wf:departure_choose',
    menuCodes: ['D2'],
    orchestrationFlag: 'orchestration_choose_departure',
    columns: { managed: 'yes', client: 'yes', orchestrated: 'yes', task: 'yes', execution: 'yes' },
    gestionHint: 'TS_CHECKOUT · heure checkout',
    whatsappHint: 'Option D2 · fenêtre',
    orchestrationExpertPath: '/tasks/orchestration-config?tab=workflows',
  },
  {
    key: 'arrival_declare',
    label: 'Déclarer arrivée',
    emoji: '📍',
    group: 'journey',
    groupLabel: 'Arrivée & départ',
    taskType: 'arrival_declare',
    workflowKey: 'wf:arrival_declare',
    menuCodes: ['D3'],
    orchestrationFlag: 'orchestration_declare_arrival',
    columns: { managed: 'yes', client: 'yes', orchestrated: 'yes', task: 'yes', execution: 'yes' },
    gestionHint: 'Créneaux · marge avant check-in',
    whatsappHint: 'Option D3',
    orchestrationExpertPath: '/tasks/orchestration-config?tab=workflows',
  },
  {
    key: 'departure_declare',
    label: 'Déclarer départ',
    emoji: '📍',
    group: 'journey',
    groupLabel: 'Arrivée & départ',
    taskType: 'departure_declare',
    workflowKey: 'wf:departure_declare',
    menuCodes: ['D4'],
    orchestrationFlag: 'orchestration_declare_departure',
    columns: { managed: 'yes', client: 'yes', orchestrated: 'yes', task: 'yes', execution: 'yes' },
    gestionHint: 'Fenêtre déclaration départ',
    whatsappHint: 'Option D4',
    orchestrationExpertPath: '/tasks/orchestration-config?tab=workflows',
  },
  {
    key: 'registration',
    label: 'Enregistrement voyageurs',
    emoji: '👥',
    group: 'journey',
    groupLabel: 'Arrivée & départ',
    taskType: 'registration',
    workflowKey: 'wf:registration',
    menuCodes: ['E'],
    orchestrationFlag: 'orchestration_registration',
    columns: { managed: 'yes', client: 'yes', orchestrated: 'yes', task: 'yes', execution: 'yes' },
    gestionHint: 'Flow enregistrement · champs obligatoires',
    whatsappHint: 'Option E · guest_registration',
    orchestrationExpertPath: '/tasks/orchestration-config?tab=workflows',
  },
  {
    key: 'support',
    label: 'Support',
    emoji: '🆘',
    group: 'communication',
    groupLabel: 'Communication',
    taskType: 'support',
    workflowKey: 'wf:support',
    menuCodes: ['K'],
    orchestrationFlag: 'orchestration_support',
    columns: { managed: 'yes', client: 'yes', orchestrated: 'yes', task: 'yes', execution: 'yes' },
    gestionHint: 'Catégories · urgence · champs',
    whatsappHint: 'Option K · contact_support',
    orchestrationExpertPath: '/tasks/orchestration-config?tab=workflows',
  },
  {
    key: 'service_client',
    label: 'Service client',
    emoji: '💌',
    group: 'communication',
    groupLabel: 'Communication',
    taskType: 'service_client',
    workflowKey: 'wf:service_client',
    menuCodes: ['L'],
    orchestrationFlag: 'orchestration_service_client',
    columns: { managed: 'yes', client: 'yes', orchestrated: 'yes', task: 'yes', execution: 'yes' },
    gestionHint: 'SLA · objets · formulaire',
    whatsappHint: 'Option L · contact_service_client',
    orchestrationExpertPath: '/tasks/orchestration-config?tab=workflows',
  },
  {
    key: 'transport',
    label: 'Transport',
    emoji: '🚗',
    group: 'concierge',
    groupLabel: 'Conciergerie',
    taskType: 'transport',
    workflowKey: 'wf:transport',
    menuCodes: ['J1'],
    orchestrationFlag: 'orchestration_transport',
    columns: { managed: 'yes', client: 'yes', orchestrated: 'yes', task: 'yes', execution: 'yes' },
    gestionHint: 'Routes · prix · villes',
    whatsappHint: 'Option J1 · request_transport',
    orchestrationExpertPath: '/tasks/orchestration-config?tab=workflows',
  },
  {
    key: 'groceries',
    label: 'Courses',
    emoji: '🛒',
    group: 'concierge',
    groupLabel: 'Conciergerie',
    taskType: 'groceries',
    workflowKey: 'wf:groceries',
    menuCodes: ['J2'],
    orchestrationFlag: 'orchestration_grocery',
    columns: { managed: 'yes', client: 'yes', orchestrated: 'yes', task: 'yes', execution: 'yes' },
    gestionHint: 'Frais · note · devise',
    whatsappHint: 'Option J2 · request_shopping',
    orchestrationExpertPath: '/tasks/orchestration-config?tab=workflows',
  },
  {
    key: 'concierge',
    label: 'Conciergerie custom',
    emoji: '🛎️',
    group: 'concierge',
    groupLabel: 'Conciergerie',
    taskType: 'concierge',
    workflowKey: 'wf:concierge',
    menuCodes: ['J3'],
    orchestrationFlag: 'orchestration_custom',
    columns: { managed: 'yes', client: 'yes', orchestrated: 'yes', task: 'yes', execution: 'yes' },
    gestionHint: 'customServices · formules · villes',
    whatsappHint: 'Option J3 · request_custom_service',
    orchestrationExpertPath: '/tasks/orchestration-config?tab=workflows',
  },
  {
    key: 'access',
    label: 'Accès & codes',
    emoji: '🔐',
    group: 'info',
    groupLabel: 'Infos séjour',
    taskType: null,
    workflowKey: null,
    menuCodes: ['F'],
    orchestrationFlag: null,
    columns: { managed: 'yes', client: 'yes', orchestrated: 'na', task: 'na', execution: 'na' },
    gestionHint: 'Mode réception · instructions par zone',
    whatsappHint: 'Option F · show_access_info',
    orchestrationExpertPath: '/tasks/orchestration-config?tab=messages',
  },
  {
    key: 'property_wifi',
    label: 'Propriété & WiFi',
    emoji: '🏠',
    group: 'info',
    groupLabel: 'Infos séjour',
    taskType: null,
    workflowKey: null,
    menuCodes: ['G'],
    orchestrationFlag: null,
    columns: { managed: 'yes', client: 'yes', orchestrated: 'na', task: 'na', execution: 'na' },
    gestionHint: 'Infos logement · WiFi listing',
    whatsappHint: 'Option G · show_property_info',
    orchestrationExpertPath: '/tasks/orchestration-config?tab=messages',
  },
  {
    key: 'house_rules',
    label: 'Règles & infos',
    emoji: '📋',
    group: 'info',
    groupLabel: 'Infos séjour',
    taskType: null,
    workflowKey: null,
    menuCodes: ['H'],
    orchestrationFlag: null,
    columns: { managed: 'yes', client: 'yes', orchestrated: 'yes', task: 'na', execution: 'na' },
    gestionHint: 'Rules · InfoUtils · listing_rules_and_info',
    whatsappHint: 'Option H · show_house_rules',
    orchestrationExpertPath: '/tasks/orchestration-config?tab=messages',
  },
];

export function getCapabilityDefinition(key: string): CapabilityDefinition | undefined {
  return CAPABILITY_REGISTRY.find(c => c.key === key);
}

export function defaultExecutionState(): import('./types').CapabilityExecutionState {
  return {
    clientReminders: false,
    staffAssignment: false,
    staffReminders: false,
    pmEscalation: false,
  };
}

export function defaultCapabilityRowState(def: CapabilityDefinition): import('./types').CapabilityRowState {
  return {
    key: def.key,
    managed: def.key !== 'cleaning_sojori',
    clientEnabled: def.columns.client !== 'na',
    orchestrated: def.columns.orchestrated !== 'na',
    taskEnabled: def.columns.task !== 'na',
    execution: defaultExecutionState(),
    status: 'incomplete',
    inherited: true,
  };
}
