import { lazy, type ComponentType } from 'react';

const CHUNK_RELOAD_KEY = 'sojori-chunk-reload-at';
const RELOAD_COOLDOWN_MS = 60_000;

/**
 * Un chunk hashé d'une ancienne version n'existe plus après un déploiement
 * Vercel : le serveur renvoie index.html (text/html) et l'import dynamique
 * échoue ("Failed to fetch dynamically imported module").
 */
export function isStaleChunkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /dynamically imported module|Importing a module script failed|module script.*MIME|Loading chunk .* failed/i.test(
    msg,
  );
}

/**
 * Recharge la page une seule fois (garde-fou 60 s en sessionStorage) pour
 * récupérer le nouvel index et ses chunks. Retourne true si le reload part.
 */
export function reloadOnceForStaleChunk(): boolean {
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
  } catch {
    /* sessionStorage indisponible : on recharge quand même une fois */
  }
  if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
  try {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  window.location.reload();
  return true;
}

/**
 * Remplaçant de React.lazy : si le chargement du chunk échoue parce que le
 * navigateur tourne encore sur une ancienne version, on recharge la page au
 * lieu de faire planter l'ErrorBoundary.
 */
export function lazyWithReload<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(() =>
    factory().catch((err: unknown) => {
      if (isStaleChunkError(err) && reloadOnceForStaleChunk()) {
        // La page recharge — on suspend le rendu indéfiniment en attendant.
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }),
  );
}
