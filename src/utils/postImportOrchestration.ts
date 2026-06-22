/** Champs minimaux pour détecter une resa en attente de lancement orchestration post-import RU. */
export type PostImportReservationLike = {
  orchestrationLaunch?: {
    status?: 'pending' | 'launched' | string | null;
    importListingId?: string | null;
  } | null;
  listing?: {
    _id?: string;
    importOnboarding?: { active?: boolean } | null;
  } | null;
};

/** Resa importée RU dont le PM n'a pas encore cliqué « Lancer orchestration ». */
export function isPostImportOrchestrationPending(r: PostImportReservationLike): boolean {
  if (r.orchestrationLaunch?.status !== 'pending') return false;
  if (r.listing?.importOnboarding?.active === true) return true;
  return Boolean(r.orchestrationLaunch?.importListingId);
}

export const POST_IMPORT_LISTING_TOOLTIP =
  'Import RU — orchestration en attente. Ouvrez le listing → onglet « Lancer orchestration ».';
