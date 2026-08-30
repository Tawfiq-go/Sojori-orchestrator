import type { GuestDocument, GuestDocumentSignerPolicy, SigningFormat } from './catalog';
import { SIGNING_FORMATS } from './catalog';

export type SigningFormatMeta = {
  id: SigningFormat;
  title: string;
  summary: string;
  example: string;
};

export const SIGNING_FORMAT_META: SigningFormatMeta[] = [
  {
    id: 'airbnb',
    title: 'Format Airbnb',
    summary: 'Tout en même temps — un lien, une signature.',
    example: 'Fiches police + disclaimer + contrat LCD → 1 PDF · 1 signature (voyageur principal).',
  },
  {
    id: 'hotel',
    title: 'Format Hôtel',
    summary: 'Chaque voyageur signe sa fiche ; disclaimer et contrat à part.',
    example: '3 adultes → 3 fiches + disclaimer + contrat LCD → plusieurs liens.',
  },
  {
    id: 'hotel_light',
    title: 'Format Hôtel light',
    summary: 'Disclaimer (+ contrat) avec le 1er voyageur ; les autres à part.',
    example: 'Fiche #1 + disclaimer + LCD ensemble ; fiches des autres voyageurs séparées.',
  },
];

export function parseSigningFormat(raw: unknown): SigningFormat {
  return typeof raw === 'string' && (SIGNING_FORMATS as string[]).includes(raw)
    ? (raw as SigningFormat)
    : 'airbnb';
}

export function inferSigningFormat(docs: GuestDocument[]): SigningFormat {
  const police = docs.find((d) => d.kind === 'police_form' && d.enabled && d.requiresSignature);
  const others = docs.filter(
    (d) => d.kind !== 'police_form' && d.enabled && d.requiresSignature,
  );
  if (!police) return 'airbnb';
  if (police.signerPolicy === 'each_traveler') {
    const othersPrimary = others.every((d) => d.signerPolicy === 'primary_guest');
    return othersPrimary ? 'hotel' : 'hotel';
  }
  return 'airbnb';
}

/** Apply business format → per-document signerPolicy (legacy field kept for back-compat). */
export function applySigningFormat(
  docs: GuestDocument[],
  format: SigningFormat,
): GuestDocument[] {
  const policePolicy: GuestDocumentSignerPolicy =
    format === 'airbnb' ? 'primary_guest' : 'each_traveler';
  const otherPolicy: GuestDocumentSignerPolicy = 'primary_guest';
  return docs.map((d) => {
    if (!d.enabled || !d.requiresSignature) return d;
    if (d.kind === 'police_form') return { ...d, signerPolicy: policePolicy };
    return { ...d, signerPolicy: otherPolicy };
  });
}

/** Rough preview for N adults (disclaimer + optional LCD count as 1 each when enabled). */
export function previewSigningCount(
  format: SigningFormat,
  adultCount: number,
  opts: { police: boolean; disclaimer: boolean; rental: boolean },
): { links: number; label: string } {
  const n = Math.max(1, adultCount);
  const clauseDocs = (opts.disclaimer ? 1 : 0) + (opts.rental ? 1 : 0);
  if (!opts.police && clauseDocs === 0) return { links: 0, label: 'Aucun document à signer' };
  if (format === 'airbnb') {
    return {
      links: 1,
      label: `Avec ${n} adulte${n > 1 ? 's' : ''} → 1 document · 1 lien · 1 signature`,
    };
  }
  if (format === 'hotel_light') {
    const otherSheets = opts.police ? Math.max(0, n - 1) : 0;
    const primaryBundle = clauseDocs > 0 || opts.police ? 1 : 0;
    const links = primaryBundle + otherSheets;
    return {
      links,
      label: `Avec ${n} adulte${n > 1 ? 's' : ''} → ~${links} lien${links > 1 ? 's' : ''} (1er + docs ensemble, autres fiches à part)`,
    };
  }
  const policeLinks = opts.police ? n : 0;
  const links = policeLinks + clauseDocs;
  return {
    links,
    label: `Avec ${n} adulte${n > 1 ? 's' : ''} → ~${links} lien${links > 1 ? 's' : ''} (chacun à part)`,
  };
}
