/** Métadonnées injectées au build Vite (Vercel fournit VERCEL_GIT_COMMIT_SHA). */
export type AppBuildInfo = {
  commitSha: string;
  builtAtIso: string;
  deployEnv: string;
  host: string;
  apiOrigin: string;
};

export type FrontRuntimeKind = 'local' | 'vercel-production' | 'vercel-preview' | 'other';

export type FrontRuntimeTag = {
  kind: FrontRuntimeKind;
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  border: string;
};

const FRONT_RUNTIME_TAGS: Record<FrontRuntimeKind, Omit<FrontRuntimeTag, 'kind'>> = {
  local: {
    label: 'Développement local',
    shortLabel: 'LOCAL',
    color: '#c46506',
    bg: 'rgba(196,101,6,0.12)',
    border: 'rgba(196,101,6,0.35)',
  },
  'vercel-production': {
    label: 'Vercel · Production',
    shortLabel: 'VERCEL',
    color: '#0a8f5e',
    bg: 'rgba(10,143,94,0.12)',
    border: 'rgba(10,143,94,0.35)',
  },
  'vercel-preview': {
    label: 'Vercel · Preview',
    shortLabel: 'PREVIEW',
    color: '#0673b3',
    bg: 'rgba(6,115,179,0.12)',
    border: 'rgba(6,115,179,0.35)',
  },
  other: {
    label: 'Autre hôte',
    shortLabel: 'HOST',
    color: '#7a756c',
    bg: 'rgba(122,117,108,0.12)',
    border: 'rgba(122,117,108,0.28)',
  },
};

function readMeta(key: string): string {
  const v = (import.meta.env as Record<string, string | undefined>)[key];
  return typeof v === 'string' ? v.trim() : '';
}

export function getFrontRuntimeKind(host?: string): FrontRuntimeKind {
  const h = (host ?? (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase();
  if (!h || h === 'localhost' || h === '127.0.0.1' || h.endsWith('.local')) return 'local';
  if (h === 'app.sojori.com') return 'vercel-production';
  if (h.endsWith('.vercel.app')) return 'vercel-preview';
  return 'other';
}

export function getFrontRuntimeTag(host?: string): FrontRuntimeTag {
  const kind = getFrontRuntimeKind(host);
  return { kind, ...FRONT_RUNTIME_TAGS[kind] };
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
