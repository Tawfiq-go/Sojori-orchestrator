/**
 * Rail « Vos documents » de l'onglet Documents voyageurs — une ligne par document,
 * lisible sans ouvrir : état (vert / orange / gris), ce qui est configuré, ce qui manque.
 * Helpers purs, testés sans DOM.
 */
import type { GuestDocument } from '../../../../features/guestDocuments';

export type GlanceTone = 'ok' | 'warn' | 'off';

export type DocumentGlanceRow = {
  id: string;
  name: string;
  tone: GlanceTone;
  /** « active · 12 champs · envoi après enregistrement » */
  status: string;
  /** Ce qui manque pour être complet (orange), sinon vide. */
  missing: string[];
  requiresSignature: boolean;
};

const SIGNER_LABEL: Record<string, string> = {
  primary_guest: 'voyageur principal',
  each_traveler: 'chaque voyageur',
};

function join(parts: Array<string | false | null | undefined>): string {
  return parts.filter((p): p is string => Boolean(p && String(p).trim())).join(' · ');
}

export function documentGlanceRow(doc: GuestDocument): DocumentGlanceRow {
  const missing: string[] = [];
  if (!doc.enabled) {
    return {
      id: doc.id,
      name: doc.name,
      tone: 'off',
      status: 'désactivé',
      missing,
      requiresSignature: false,
    };
  }
  if (doc.kind === 'police_form') {
    const n = (doc.fieldKeys || []).length;
    if (n === 0) missing.push('aucun champ');
    return {
      id: doc.id,
      name: doc.name,
      tone: missing.length ? 'warn' : 'ok',
      status: join([
        'active',
        n ? `${n} champ${n > 1 ? 's' : ''}` : null,
        doc.includeFormulaire ? 'formulaire police' : null,
        doc.autoSendAfterRegistration ? 'envoi après enregistrement' : 'envoi manuel',
      ]),
      missing,
      requiresSignature: doc.requiresSignature === true,
    };
  }
  const clauses = (doc.clauses || []).length;
  const unit = doc.kind === 'short_term_rental' ? 'article' : 'clause';
  if (clauses === 0) missing.push(`aucun ${unit}`);
  const emptyClauses = (doc.clauses || []).filter(
    (c) => !String(c.bodyFr || c.bodyEn || '').trim(),
  ).length;
  if (clauses > 0 && emptyClauses > 0) missing.push(`${emptyClauses} ${unit}${emptyClauses > 1 ? 's' : ''} vide${emptyClauses > 1 ? 's' : ''}`);
  const signer = doc.requiresSignature
    ? `signature ${SIGNER_LABEL[doc.signerPolicy] || 'voyageur'}`
    : 'sans signature';
  return {
    id: doc.id,
    name: doc.name,
    tone: missing.length ? 'warn' : 'ok',
    status: join([
      `${clauses} ${unit}${clauses > 1 ? 's' : ''}`,
      signer,
      doc.requiredBeforeArrival ? 'avant l’arrivée' : null,
      doc.blocksAccess ? 'bloque l’accès' : null,
      doc.autoSendAfterRegistration ? 'envoi après enregistrement' : null,
    ]),
    missing,
    requiresSignature: doc.requiresSignature === true,
  };
}

export function documentsGlance(documents: GuestDocument[]): {
  rows: DocumentGlanceRow[];
  toSign: number;
  incomplete: number;
} {
  const rows = documents.map(documentGlanceRow);
  return {
    rows,
    toSign: rows.filter((r) => r.tone !== 'off' && r.requiresSignature).length,
    incomplete: rows.filter((r) => r.tone === 'warn').length,
  };
}
