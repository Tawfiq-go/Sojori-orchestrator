/** Conditions « conditional_and_time » — valeurs stockées en CSV dans availability.requires */
export const REQUIRES_CONDITION_OPTIONS = [
  { value: 'E_completed', label: 'E — Enregistrement voyageurs' },
  { value: 'D1_completed', label: 'D1 — Heure d\'arrivée choisie' },
  { value: 'D2_completed', label: 'D2 — Heure de départ choisie' },
  { value: 'D3_completed', label: 'D3 — Heure d\'arrivée déclarée' },
  { value: 'D4_completed', label: 'D4 — Heure de départ déclarée' },
];

export function parseRequiresCsv(requires) {
  if (!requires || typeof requires !== 'string') return [];
  return requires.split(',').map((s) => s.trim()).filter(Boolean);
}

export function joinRequiresCsv(values) {
  return [...new Set(values.filter(Boolean))].join(',');
}
