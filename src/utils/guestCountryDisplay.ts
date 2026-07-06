/** ISO 3166-1 alpha-2 → drapeau emoji (sans regex Unicode property — compatible Vite). */
export function isoToFlagEmoji(isoCode: string): string {
  const code = String(isoCode || '').trim().toUpperCase();
  if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) return '';
  const codePoints = [...code].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function isRegionalIndicatorCodePoint(cp: number): boolean {
  return cp >= 0x1f1e6 && cp <= 0x1f1ff;
}

function codePointsOf(str: string): number[] {
  const cps: number[] = [];
  for (let i = 0; i < str.length; ) {
    const cp = str.codePointAt(i);
    if (cp === undefined) break;
    cps.push(cp);
    i += cp > 0xffff ? 2 : 1;
  }
  return cps;
}

function splitLeadingFlagEmoji(str: string): { flag: string; rest: string } {
  const s = String(str || '').trim();
  const cps = codePointsOf(s);
  if (
    cps.length >= 2 &&
    isRegionalIndicatorCodePoint(cps[0]) &&
    isRegionalIndicatorCodePoint(cps[1])
  ) {
    const flag = String.fromCodePoint(cps[0], cps[1]);
    const rest = s.slice(flag.length).trim();
    return { flag, rest };
  }
  return { flag: '', rest: s };
}

function stripFlagEmojisFromText(text: string): string {
  const cps = codePointsOf(String(text || ''));
  const kept: number[] = [];
  for (let i = 0; i < cps.length; i++) {
    if (
      i + 1 < cps.length &&
      isRegionalIndicatorCodePoint(cps[i]) &&
      isRegionalIndicatorCodePoint(cps[i + 1])
    ) {
      i += 1;
      continue;
    }
    kept.push(cps[i]);
  }
  return kept.length ? String.fromCodePoint(...kept).trim() : '';
}

const NAME_TO_ISO: Record<string, string> = {
  maroc: 'MA',
  morocco: 'MA',
  france: 'FR',
  espagne: 'ES',
  spain: 'ES',
  'royaume-uni': 'GB',
  'united kingdom': 'GB',
  allemagne: 'DE',
  germany: 'DE',
  belgique: 'BE',
  belgium: 'BE',
  italie: 'IT',
  italy: 'IT',
  'états-unis': 'US',
  'etats-unis': 'US',
  usa: 'US',
  canada: 'CA',
  suisse: 'CH',
  switzerland: 'CH',
  algérie: 'DZ',
  algerie: 'DZ',
  tunisie: 'TN',
  tunisia: 'TN',
  sénégal: 'SN',
  senegal: 'SN',
  hungary: 'HU',
  hongrie: 'HU',
  bulgaria: 'BG',
  bulgarie: 'BG',
};

const LANGUAGE_NAME_TO_ISO: Record<string, string> = {
  french: 'FR',
  spanish: 'ES',
  german: 'DE',
  italian: 'IT',
  portuguese: 'PT',
  dutch: 'NL',
  arabic: 'MA',
  english: 'GB',
};

const LANG_CODE_TO_ISO: Record<string, string> = {
  fr: 'FR',
  es: 'ES',
  de: 'DE',
  it: 'IT',
  pt: 'PT',
  nl: 'NL',
  ar: 'MA',
  en: 'GB',
};

const PHONE_PREFIX_TO_ISO: Record<string, string> = {
  '33': 'FR',
  '212': 'MA',
  '213': 'DZ',
  '216': 'TN',
  '34': 'ES',
  '39': 'IT',
  '49': 'DE',
  '44': 'GB',
  '32': 'BE',
  '41': 'CH',
  '351': 'PT',
  '31': 'NL',
  '1': 'US',
};

const ISO_TO_LABEL: Record<string, string> = {
  MA: 'Maroc',
  FR: 'France',
  ES: 'Espagne',
  GB: 'Royaume-Uni',
  DE: 'Allemagne',
  BE: 'Belgique',
  IT: 'Italie',
  US: 'États-Unis',
  CA: 'Canada',
  CH: 'Suisse',
  DZ: 'Algérie',
  TN: 'Tunisie',
  SN: 'Sénégal',
  HU: 'Hongrie',
  BG: 'Bulgarie',
  PT: 'Portugal',
  NL: 'Pays-Bas',
};

function resolveIso(raw: string, codeField: string): string {
  if (codeField.length === 2 && /^[A-Za-z]{2}$/.test(codeField)) {
    return codeField.toUpperCase();
  }
  if (raw.length === 2 && /^[A-Za-z]{2}$/.test(raw)) {
    return raw.toUpperCase();
  }
  const cleaned = stripFlagEmojisFromText(raw).toLowerCase();
  if (NAME_TO_ISO[cleaned]) return NAME_TO_ISO[cleaned];
  return '';
}

function isoFromLanguage(lang: string): string {
  const raw = String(lang || '').trim();
  if (!raw) return '';
  if (raw.includes('-')) {
    const region = raw.split('-')[1]?.toUpperCase();
    if (region && region.length === 2) return region;
  }
  const lower = raw.toLowerCase();
  if (lower.length === 2 && LANG_CODE_TO_ISO[lower]) return LANG_CODE_TO_ISO[lower];
  if (LANGUAGE_NAME_TO_ISO[lower]) return LANGUAGE_NAME_TO_ISO[lower];
  return '';
}

function isoFromPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  for (const len of [3, 2, 1]) {
    const prefix = digits.slice(0, len);
    if (PHONE_PREFIX_TO_ISO[prefix]) return PHONE_PREFIX_TO_ISO[prefix];
  }
  return '';
}

function labelForIso(iso: string, fallback: string): string {
  const cleanFallback = stripFlagEmojisFromText(fallback);
  if (iso && ISO_TO_LABEL[iso]) return ISO_TO_LABEL[iso];
  if (cleanFallback && cleanFallback.length !== 2) return cleanFallback;
  if (iso) return iso;
  return cleanFallback || '—';
}

export type GuestCountryDisplayOptions = {
  guestLanguage?: string | null;
  phone?: string | null;
  nationality?: string | null;
};

/** Colonne Pays : drapeau + nom ; infère depuis langue / téléphone si pays absent (Airbnb). */
export function formatGuestCountryDisplay(
  guestCountry?: string | null,
  guestCountryCode?: string | null,
  options?: GuestCountryDisplayOptions,
): { flag: string; label: string } {
  let raw = String(guestCountry || '').trim();
  let codeField = String(guestCountryCode || '').trim();

  if (!raw && options?.nationality) {
    raw = String(options.nationality).trim();
  }

  if (!raw && !codeField) {
    const langIso = isoFromLanguage(String(options?.guestLanguage || ''));
    const phoneIso = isoFromPhone(String(options?.phone || ''));
    const inferred = langIso || phoneIso;
    if (inferred) {
      codeField = inferred;
      raw = ISO_TO_LABEL[inferred] || '';
    }
  }

  if (!raw && !codeField) {
    return { flag: '', label: '—' };
  }

  const { flag: embeddedFlag, rest } = splitLeadingFlagEmoji(raw);
  const iso = resolveIso(rest || raw, codeField);

  if (embeddedFlag) {
    return { flag: embeddedFlag, label: labelForIso(iso, rest || raw) };
  }

  if (iso) {
    return {
      flag: isoToFlagEmoji(iso),
      label: labelForIso(iso, rest || raw),
    };
  }

  const textOnly = stripFlagEmojisFromText(raw);
  return {
    flag: '',
    label: textOnly || '—',
  };
}
