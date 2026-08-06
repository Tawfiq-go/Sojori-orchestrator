/** Codes ISO affichés / utilisés pour les réponses IA OTA. */
const OTA_LANG_CODES = new Set(['fr', 'en', 'ar', 'es', 'de', 'it', 'pt', 'nl']);

const LANG_FLAG: Record<string, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  ar: '🇲🇦',
  es: '🇪🇸',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  nl: '🇳🇱',
};

export function normalizeOtaOriginalLanguage(raw: unknown): string | null {
  const code = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .slice(0, 2);
  if (!code) return null;
  if (code === 'dz') return 'ar';
  return OTA_LANG_CODES.has(code) ? code : null;
}

/**
 * Repli léger quand `originalLanguage` n'est pas encore en base (messages anciens).
 * Script arabe → ar ; sinon indices lexicaux pour les langues latines courantes.
 */
export function inferOtaOriginalLanguage(text: string): string | null {
  const raw = String(text || '').trim();
  if (raw.length < 2) return null;
  if (/[\u0600-\u06FF]/.test(raw)) return 'ar';

  const lower = raw.toLowerCase();
  const scores: Array<{ code: string; n: number }> = [
    {
      code: 'fr',
      n: countMatches(lower, /\b(je|vous|merci|bonjour|nous|pour|avec|une|des|est|pas|les|svp)\b/g),
    },
    {
      code: 'en',
      n: countMatches(lower, /\b(the|you|thank|thanks|please|with|have|this|that|are|was|hello|hi)\b/g),
    },
    {
      code: 'es',
      n: countMatches(lower, /\b(gracias|hola|por|favor|usted|nosotros|buenos|días|que)\b/g),
    },
    {
      code: 'de',
      n: countMatches(lower, /\b(danke|bitte|und|nicht|ich|sie|guten|tag|hallo)\b/g),
    },
    {
      code: 'it',
      n: countMatches(lower, /\b(grazie|ciao|per|prego|sono|questa|buongiorno)\b/g),
    },
  ];
  scores.sort((a, b) => b.n - a.n);
  if (scores[0].n >= 2 && scores[0].n > (scores[1]?.n || 0)) return scores[0].code;
  return null;
}

function countMatches(text: string, re: RegExp): number {
  return (text.match(re) || []).length;
}

export function otaLanguageFlag(code: string | null | undefined): string {
  const c = normalizeOtaOriginalLanguage(code);
  if (!c) return '🌐';
  return LANG_FLAG[c] || '🌐';
}

/** Badge compact : 🇬🇧 EN */
export function formatOtaOriginalLanguageBadge(code: string | null | undefined): string | null {
  const c = normalizeOtaOriginalLanguage(code);
  if (!c) return null;
  return `${otaLanguageFlag(c)} ${c.toUpperCase()}`;
}
