/** Domaines Mongo `ChannelRuFieldMapping` (srv-channels) — alignés backend. */
export const RU_FIELD_MAP_DOMAIN = 'push_fill_company_details';
export const RU_API_CATALOG_DOMAIN = 'ru_api_catalog';

/** Libellés affichés dans l’UI (valeurs techniques inchangées côté API). */
export const RU_MAPPING_DOMAIN_OPTIONS = [
  {
    value: RU_FIELD_MAP_DOMAIN,
    label: 'Fiche entreprise (données envoyées vers Rentals United)',
  },
  {
    value: RU_API_CATALOG_DOMAIN,
    label: 'Liste des opérations RU (référence technique)',
  },
];

/**
 * Message lisible pour les erreurs API (évite « Request failed with status code 404 »).
 * @param {unknown} err
 * @param {string} [fallback]
 */
export function formatRuFieldMappingRequestError(err, fallback = 'Erreur réseau') {
  const st = err && typeof err === 'object' && 'response' in err ? err.response?.status : undefined;
  if (st === 404) {
    return "Cette fonction n’est pas encore disponible sur le serveur utilisé. En local : vérifiez que le proxy du dashboard pointe vers un environnement à jour (administration + canaux), ou demandez une mise à jour côté hébergement.";
  }
  const data = err && typeof err === 'object' && 'response' in err ? err.response?.data : undefined;
  const msg = typeof data?.error === 'string' ? data.error.trim() : '';
  if (msg) return msg;
  const m = err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' ? err.message : '';
  if (m.includes('Network Error')) return 'Connexion impossible — vérifiez le réseau.';
  if (m) return m;
  return fallback;
}
