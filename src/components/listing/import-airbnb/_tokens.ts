// ════════════════════════════════════════════════════════════════════
// Sojori · Import Airbnb Modal · Atelier 2026
// _tokens.ts — palette + keyframes + types partagés (1 seul import)
// ════════════════════════════════════════════════════════════════════
export const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a',
  primaryTint: 'rgba(184,133,26,0.10)', primaryTint2: 'rgba(184,133,26,0.20)',
  orange: '#E6B022', orangeBg: 'rgba(255,107,53,0.10)',
  bg0: '#f6f5f1', bg1: '#fff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)', borderStrong: 'rgba(20,17,10,0.14)',
  success: '#22c55e', successTint: 'rgba(34,197,94,0.12)',
  error:   '#dc2626', errorTint:   'rgba(220,38,38,0.10)',
  info:    '#0673b3', infoTint:    'rgba(6,115,179,0.12)',
  airbnb:  '#FF5A5F',
} as const;

// Inject once globally (App.tsx ou index.css). Idempotent.
export const KEYFRAMES = `
@keyframes sj-fadeIn { from {opacity:0; transform:translateY(8px)} to {opacity:1; transform:none} }
@keyframes sj-slideUp { from {opacity:0; transform:translateY(16px)} to {opacity:1; transform:none} }
@keyframes sj-pulse-orange { 0%,100% {box-shadow:0 0 0 0 rgba(255,107,53,0.55)} 50% {box-shadow:0 0 0 8px rgba(255,107,53,0)} }
@keyframes sj-shimmer { 0% {background-position:-200% 0} 100% {background-position:200% 0} }
@keyframes sj-shake { 0%,100% {transform:translateX(0)} 25% {transform:translateX(-4px)} 75% {transform:translateX(4px)} }
@keyframes sj-check-draw { from {stroke-dashoffset:24} to {stroke-dashoffset:0} }
@keyframes sj-line-flow { from {background-position:0 -16px} to {background-position:0 16px} }
@keyframes sj-scale-in { 0% {transform:scale(0.8); opacity:0} 60% {transform:scale(1.06)} 100% {transform:scale(1); opacity:1} }
@keyframes sj-pulse-soft { 0%,100% {opacity:0.9} 50% {opacity:0.5} }
@keyframes sj-spin { to {transform:rotate(360deg)} }

@media (prefers-reduced-motion: reduce) {
  [class*="sj-anim-"] { animation: none !important; }
  .sj-progress-fill { animation: none !important; background-size: 100% 100% !important; }
}
`;

/* ─── Types (alignés API Sojori-orchestrator) ─────────────────────── */
export interface Owner {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  airbnbPropertiesCount?: number;
}

export interface RuProperty {
  ruPropertyId: string;       // identifiant RU (#4021713)
  name: string;
  city?: string;
  suggestedCityId?: string;
  suggestedCityName?: string;
  guests?: number;
  alreadyImported: boolean;
  importable: boolean;        // false si non éligible
  /** false = doublon Airbnb / archive RU — préférer un bien actif avec photos */
  isActive?: boolean;
  isArchived?: boolean;
  photoUrl?: string;
  photoGradient?: 1 | 2 | 3 | 4 | 5; // fallback gradient
}

export interface SojoriCity {
  _id: string;
  name: string;
  country?: string;
  flag?: string;
}

export type StepKey =
  | 'pull_spec' | 'pull_prices' | 'pull_calendar' | 'pull_external'
  | 'build_payload' | 'reupload_images' | 'create_listing'
  | 'wait_inventory' | 'apply_inventory' | 'check'
  | 'post_import_sync' | 'apply_orchestration';

export type StepStatus = 'pending' | 'running' | 'done' | 'error';

export interface StepState {
  key: StepKey;
  status: StepStatus;
  errorMessage?: string;
  meta?: Record<string, unknown>;   // ex: { photosTotal: 5, photosDone: 3 }
}

export interface ImportProgress {
  currentBatchIndex: number;     // 0-based
  totalBatch: number;            // ex: 5 annonces
  currentPropertyName?: string;
  steps: StepState[];            // 11 entrées dans l'ordre canonique
  completed: boolean;
  hasError: boolean;
}

export interface ImportResultItem {
  ruPropertyId: string;
  propertyName: string;
  city?: string;
  success: boolean;
  listingId?: string;            // SJ-LIST-XXXX si success
  errorMessage?: string;
}

export const STEPS_ORDER: StepKey[] = [
  'pull_spec', 'pull_prices', 'pull_calendar', 'pull_external',
  'build_payload', 'reupload_images', 'create_listing',
  'wait_inventory', 'apply_inventory',
  'post_import_sync', 'apply_orchestration', 'check',
];

export const STEPS_LABELS: Record<StepKey, { label: string; sub: string }> = {
  pull_spec:        { label: 'Lecture de la fiche Airbnb',  sub: 'Récupération du titre, description, capacité, adresse.' },
  pull_prices:      { label: 'Lecture des tarifs',           sub: 'Saisons, prix de base, règles tarifaires.' },
  pull_calendar:    { label: 'Lecture des disponibilités',   sub: 'Jours bloqués et règles min/max nuits.' },
  pull_external:    { label: 'Enrichissement contenu',       sub: 'Textes et médias complémentaires.' },
  build_payload:    { label: 'Préparation Sojori',           sub: 'Mapping vers la fiche listing.' },
  reupload_images:  { label: 'Import des photos',            sub: 'Téléchargement et rattachement des images.' },
  create_listing:   { label: 'Création du listing',          sub: 'Listing et type de logement principal.' },
  wait_inventory:   { label: 'Préparation du calendrier',    sub: 'Création de l\'inventaire calendrier.' },
  apply_inventory:  { label: 'Mise à jour calendrier',       sub: 'Prix et disponibilités injectés.' },
  check: {
    label: 'Check',
    sub: 'Vérification RU : paiement carte et image principale.',
  },
  post_import_sync: {
    label: 'Synchronisation réservations RU',
    sub: 'Import des réservations, leads, messages et avis liés au bien (peut prendre 1–2 min).',
  },
  apply_orchestration: {
    label: 'Configuration orchestration',
    sub: 'Template propriétaire · capacités, messages plan, concierge (filtré par la ville Sojori choisie).',
  },
};

/* ─── Helper : initiales staff/owner ─────────────────────────────── */
export function initials(name?: string | null) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[p.length - 1]?.[0] || '')).toUpperCase();
}

/* ─── Helper : pourcentage global ────────────────────────────────── */
export function computeProgress(steps: StepState[]): number {
  if (!steps.length) return 0;
  const done = steps.filter(s => s.status === 'done').length;
  const running = steps.filter(s => s.status === 'running').length;
  return Math.round(((done + running * 0.5) / steps.length) * 100);
}
