/** Métadonnées injectées au build Vite (Vercel fournit VERCEL_GIT_COMMIT_SHA). */
export type AppBuildInfo = {
  commitSha: string;
  builtAtIso: string;
  deployEnv: string;
  host: string;
  apiOrigin: string;
};

function readMeta(key: string): string {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  return typeof v === 'string' ? v.trim() : '';
}

export function getAppBuildInfo(): AppBuildInfo {
  const commitSha = readMeta('VITE_APP_BUILD_SHA') || 'local';
  const builtAtIso = readMeta('VITE_APP_BUILD_AT');
  const deployEnv = readMeta('VITE_APP_DEPLOY_ENV');
  const apiOrigin =
    readMeta('VITE_API_URL') || readMeta('VITE_API_BASE_URL') || 'https://dev.sojori.com';

  return {
    commitSha,
    builtAtIso,
    deployEnv,
    host: typeof window !== 'undefined' ? window.location.host : '',
    apiOrigin: apiOrigin.replace(/\/+$/, ''),
  };
}

export function formatBuildDeployedAt(iso: string): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}
