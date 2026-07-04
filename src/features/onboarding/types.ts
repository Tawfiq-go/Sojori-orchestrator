export type WizardPath = 'A' | 'B';

export type WizardPanelKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

export type WizardStaffCityScope = 'all' | 'selected';

/** @deprecated — utiliser scopeAll + cities + listingIds */
export type WizardListingScope = 'all' | 'selected';

export interface WizardStaffTaskConfig {
  contractType: 'employee' | 'freelance';
  allowedTaskTypes: string[];
  isOpsAdmin: boolean;
  maxTasksPerDay: number;
  /** true = toutes les annonces du PM */
  scopeAll: boolean;
  cities: string[];
  listingIds: string[];
  /** @deprecated migration */
  cityScope?: WizardStaffCityScope;
  listingScope?: WizardListingScope;
  daysOfWeek: number[];
  timeStart: string;
  timeEnd: string;
}

export type WizardWaNotifCategory =
  | 'reservation'
  | 'inboxOta'
  | 'divers'
  | 'tasksCreated'
  | 'tasksCancelled';

export interface WizardAdminWhatsappConfig {
  language: string;
  banned: boolean;
  /** Menus WA · lettre · N → R → W */
  menuPermissions: Record<string, 'read' | 'write' | 'none'>;
  /** Notifications push par catégorie (agrégat — détail dans pushNotifications) */
  notifCategories: Record<WizardWaNotifCategory, boolean>;
  /** Clés push srv-fulltask (réservation, inbox OTA, tâches…) */
  pushNotifications: Record<string, boolean>;
  scopeAll: boolean;
  cities: string[];
  listingIds: string[];
  cityScope?: WizardStaffCityScope;
  listingScope?: WizardListingScope;
}

export type WizardFeatureGrant = {
  feature?: string;
  actions?: string[];
};

export interface WizardDashboardMemberConfig {
  isAdmin: boolean;
  scopeAll: boolean;
  cities: string[];
  listingIds: string[];
  cityScope?: WizardStaffCityScope;
  listingScope?: WizardListingScope;
  featureGrants: WizardFeatureGrant[];
}

export interface WizardStaffRow {
  id: string;
  firstName: string;
  lastName: string;
  whatsapp: string;
  email: string;
  /** Un même contact peut cumuler plusieurs rôles */
  roles: {
    taskStaff: boolean;
    adminWhatsapp: boolean;
    dashboardEmail: boolean;
  };
  taskStaff: WizardStaffTaskConfig;
  adminWhatsapp: WizardAdminWhatsappConfig;
  dashboard: WizardDashboardMemberConfig;
}

/** @deprecated v1 — conservé pour merge */
export interface WizardAdminNotifs {
  support: boolean;
  serviceClient: boolean;
  conciergerie: boolean;
  menage: boolean;
  arrivées: boolean;
}

export interface WizardDashboardGuest {
  id: string;
  name: string;
  email: string;
}

export interface WizardMenuAccess {
  dashboard: boolean;
  calendar: boolean;
  reservations: boolean;
  listings: boolean;
  dynamicPricing: boolean;
  orchestration: boolean;
  tasks: boolean;
  inboxClients: boolean;
  inboxStaff: boolean;
  finances: boolean;
  analytics: boolean;
}

export interface WizardCapabilities {
  welcome: boolean;
  registration: boolean;
  support: boolean;
  serviceClient: boolean;
  arrivalChoose: boolean;
  departureChoose: boolean;
  arrivalDeclare: boolean;
  departureDeclare: boolean;
  transport: boolean;
  groceries: boolean;
  concierge: boolean;
  cleaningFree: boolean;
  cleaningPaid: boolean;
  cleaningSojori: boolean;
  accessCodes: boolean;
  wifi: boolean;
  rules: boolean;
}

export interface WizardJxSettings {
  /** Préréglage global — passe en custom si une ligne est modifiée */
  preset: 'standard' | 'early' | 'secure' | 'custom';
  menuActive: string;
  welcome: string;
  registration: string;
  arrivalChoose: string;
  departureChoose: string;
  arrivalDeclare: string;
  departureDeclare: string;
  support: string;
  serviceClient: string;
  transport: string;
  groceries: string;
  concierge: string;
  cleaning: string;
  accessCodes: string;
  wifi: string;
  rules: string;
  codesAfterRegistration: boolean;
}

export interface WizardConditions {
  registrationBeforeArrival: boolean;
  arrivalBeforeCodes: boolean;
  registrationBeforeStaff: boolean;
  arrivalBeforeStaff: boolean;
  preset: 'secure' | 'flexible' | 'minimal';
}

export type WizardStaffAssignMode = 'with_client_choice' | 'last_minute' | 'standard';

export type WizardWorkflowPreset = 'reactive' | 'balanced' | 'proactive';

/** Surcharges par type de workflow (clé = taskType snake_case). */
export type WizardServiceDeadlineOverride = {
  clientReminderDays?: number[];
  /** Heure d'envoi des relances client (HH:mm) */
  clientReminderTime?: string;
  staffAssignStyle?: 'immediate' | 'days_before' | 'with_client' | 'none';
  staffAssignDaysBefore?: number;
  /** Auto-accepté : tâche assignée sans acceptation staff (défaut : partenaires en immédiat) */
  staffAutoAssign?: boolean;
  staffReminderDays?: number[];
  escalationEnabled?: boolean;
};

export interface WizardDeadlines {
  /** Préréglage global délais & relances (défaut équilibré). */
  workflowPreset?: WizardWorkflowPreset;
  /** Surcharges ligne par ligne après personnalisation. */
  perService?: Record<string, WizardServiceDeadlineOverride>;
  /** Tolérance acceptation staff (heures) — défaut 3. */
  acceptToleranceHours?: number;
  /** @deprecated — conservé pour brouillons v1 ; dérivé du preset si absent */
  staffAssignMode: WizardStaffAssignMode;
  /** @deprecated */
  staffAssignDaysBefore: number;
  /** @deprecated — préférer escalationEnabled par service */
  escalateAdminJ1: boolean;
  /** Heure de relance / escalade admin le J-1. */
  adminEscalationHour: '11' | '14';
}

export interface WizardPanel0 {
  hasAirbnb: boolean;
  cities: string[];
  expectedListings: number;
}

export interface WizardPanel1 {
  staff: WizardStaffRow[];
  staffApplyMode: 'additive';
}

export interface WizardPanel2 {
  guests: WizardDashboardGuest[];
  menuAccess: WizardMenuAccess;
}

export type WizardCleaningFreeTier = {
  startDay: number;
  endDay: number;
  numberOfCleaning: number;
};

export type WizardOrchestrationQuickConfig = {
  cleaningModes: { free: boolean; paid: boolean; sojori: boolean };
  cleaningFreeTiers: WizardCleaningFreeTier[];
  /** Navette aéroport — prix MAD par ville PM */
  transportAirportByCity: Record<string, number>;
  /** IDs catalogue conciergerie onboarding */
  conciergeServiceIds: string[];
};

export interface WizardPanel3 {
  capabilities: WizardCapabilities;
  /** Fenêtres J-X + conditions dérivées — même écran que capabilities */
  jx?: WizardJxSettings;
  /** Réglages métier rapides (ménage, transport, conciergerie) */
  quickConfig?: WizardOrchestrationQuickConfig;
  pack: 'essential' | 'standard' | 'complete' | 'premium';
  /** À l'apply : remplace entièrement le template orchestration owner */
  orchestrationApplyMode: 'replace';
}

export interface WizardPanel4 {
  jx: WizardJxSettings;
}

export interface WizardPanel5 {
  conditions: WizardConditions;
}

export interface WizardPanel6 {
  deadlines: WizardDeadlines;
}

export interface WizardPanel7 {
  ruCorrelationId?: string;
  selectedRuIds?: number[];
  /** Snapshot pour récap / reprise — ville RU + mapping Sojori par annonce */
  selectedRuPreview?: Array<{
    ruPropertyId: string;
    name: string;
    /** Ville telle que RU (affichage) */
    ruCity?: string;
    cityId?: string;
    cityName?: string;
  }>;
  /** @deprecated — dérivé si toutes les annonces partagent la même ville Sojori */
  selectedCityId?: string;
  selectedCityName?: string;
  importSubtab?: 'selection' | 'import' | 'results';
  /** Import RU reporté à plus tard (wizard validé sans sélection). */
  importSkippedLater?: boolean;
  /** RU déjà importés (rempli après batch post-récap). */
  importedRuIds?: number[];
}

export interface WizardPanels {
  '0'?: WizardPanel0;
  '1'?: WizardPanel1;
  '2'?: WizardPanel2;
  '3'?: WizardPanel3;
  '4'?: WizardPanel4;
  '5'?: WizardPanel5;
  '6'?: WizardPanel6;
  '7'?: WizardPanel7;
}

export interface WizardDraft {
  version: number;
  currentPanel: number;
  lastSavedAt?: string;
  path: WizardPath;
  panels: WizardPanels;
  panelsValidated: number[];
  /** Étapes « Suite » cochées manuellement (staff, plan, …). */
  suiteCompleted?: string[];
  /** Journal des apply Suite (orchestration, staff…). */
  applyLog?: {
    orchestrationAt?: string;
    staffAt?: string;
    guestsAt?: string;
    orchestrationSummary?: string;
    staffSummary?: string;
    importSummary?: string;
    adminWaAt?: string;
    adminWaSummary?: string;
    adminWaRecapLines?: string[];
    staffOpsAt?: string;
    staffOpsSummary?: string;
    staffOpsRecapLines?: string[];
    dashboardAt?: string;
    dashboardSummary?: string;
    dashboardRecapLines?: string[];
    staffRecapLines?: string[];
    orchestrationRecapLines?: string[];
    orchestrationAuditLines?: string[];
    importRecapLines?: string[];
    suiteRunAt?: string;
  };
}

export const WIZARD_STEP_LABELS = [
  'Profil',
  'Équipe',
  'Orchestration',
  'Go live',
] as const;

export const CITY_OPTIONS = ['Marrakech', 'Casablanca', 'Agadir', 'Tanger', 'Essaouira', 'Rabat'];
