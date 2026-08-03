/**
 * PDF « Fiche individuelle de police » - format administratif Maroc
 * (grilles / cases à remplir), + bandeau établissement (logo owner, téléphone, listing).
 *
 * Helvetica/Times StandardFonts : WinAnsi (accents FR OK).
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from 'pdf-lib';
import { memberFieldValue } from './registrationLevel';

export type FichePoliceBrand = {
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
};

export type FichePoliceMeta = {
  reservationLabel?: string;
  listingName?: string;
  checkIn?: string;
  checkOut?: string;
  brand?: FichePoliceBrand;
};

const C = {
  ink: rgb(0.08, 0.08, 0.1),
  muted: rgb(0.35, 0.35, 0.38),
  line: rgb(0.15, 0.15, 0.18),
  boxBg: rgb(0.98, 0.98, 0.985),
  headerBg: rgb(0.95, 0.95, 0.96),
  brand: rgb(0.53, 0.38, 0.1),
  white: rgb(1, 1, 1),
};

function txt(input: unknown): string {
  return String(input ?? '')
    .replace(/\u2028|\u2029/g, ' ')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/\u2014|\u2013/g, '-')
    .replace(/\u2026/g, '...')
    .trim();
}

function fmtDate(raw: string): string {
  const s = txt(raw);
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('fr-FR');
  return s;
}

function genderLabel(raw: string): string {
  const g = txt(raw).toLowerCase();
  if (g === 'm' || g === 'male' || g === 'homme' || g === 'h') return 'Masculin';
  if (g === 'f' || g === 'female' || g === 'femme') return 'Féminin';
  return txt(raw);
}

type BoxOpts = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  value?: string;
  font: PDFFont;
  bold: PDFFont;
  size?: number;
};

function drawFieldBox(page: PDFPage, opts: BoxOpts) {
  const { x, y, w, h, label, value, font, bold } = opts;
  const size = opts.size ?? 9;
  page.drawRectangle({
    x,
    y: y - h,
    width: w,
    height: h,
    borderColor: C.line,
    borderWidth: 0.9,
    color: C.boxBg,
  });
  page.drawText(label.toUpperCase(), {
    x: x + 4,
    y: y - 11,
    size: 6.5,
    font: bold,
    color: C.muted,
  });
  const v = txt(value);
  if (v) {
    page.drawText(v.slice(0, 78), {
      x: x + 4,
      y: y - h + 8,
      size,
      font,
      color: C.ink,
    });
  }
}

async function embedLogo(doc: PDFDocument, logoUrl?: string): Promise<PDFImage | null> {
  const url = txt(logoUrl);
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf[0] === 0xff && buf[1] === 0xd8) return doc.embedJpg(buf);
    // png signature
    if (buf[0] === 0x89 && buf[1] === 0x50) return doc.embedPng(buf);
    // try png then jpg
    try {
      return await doc.embedPng(buf);
    } catch {
      return await doc.embedJpg(buf);
    }
  } catch {
    return null;
  }
}

function memberDisplayName(m: Record<string, unknown>): string {
  const first = memberFieldValue(m, 'first_name');
  const last = memberFieldValue(m, 'last_name');
  return [first, last].filter(Boolean).join(' ') || 'Voyageur';
}

export async function generateFichePolicePdfBytes(
  members: Record<string, unknown>[],
  meta: FichePoliceMeta = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  const pageW = 595.28;
  const pageH = 841.89;
  const margin = 36;
  const contentW = pageW - margin * 2;

  const logo = await embedLogo(doc, meta.brand?.logoUrl);

  const travelers = members.filter((m) => {
    const fn = memberFieldValue(m, 'first_name');
    const ln = memberFieldValue(m, 'last_name');
    const docn = memberFieldValue(m, 'document_number');
    return Boolean(fn || ln || docn);
  });
  const list = travelers.length ? travelers : [{}];

  for (let i = 0; i < list.length; i++) {
    const m = list[i] || {};
    const page = doc.addPage([pageW, pageH]);
    let y = pageH - margin;

    // -- Bandeau établissement (config owner) --
    page.drawRectangle({
      x: margin,
      y: y - 52,
      width: contentW,
      height: 52,
      color: C.headerBg,
      borderColor: C.line,
      borderWidth: 0.8,
    });

    let textX = margin + 10;
    if (logo) {
      const maxH = 36;
      const maxW = 72;
      const scale = Math.min(maxW / logo.width, maxH / logo.height);
      const lw = logo.width * scale;
      const lh = logo.height * scale;
      page.drawImage(logo, {
        x: margin + 8,
        y: y - 44,
        width: lw,
        height: lh,
      });
      textX = margin + 8 + lw + 10;
    }

    const company = txt(meta.brand?.companyName) || "Établissement d'hébergement";
    page.drawText(company.slice(0, 48), {
      x: textX,
      y: y - 18,
      size: 11,
      font: bold,
      color: C.ink,
    });
    const contactBits = [
      txt(meta.brand?.phone) ? `Tél. ${txt(meta.brand?.phone)}` : '',
      txt(meta.brand?.email) || '',
    ].filter(Boolean);
    if (contactBits.length) {
      page.drawText(contactBits.join('  ·  ').slice(0, 70), {
        x: textX,
        y: y - 32,
        size: 8,
        font,
        color: C.muted,
      });
    }
    if (txt(meta.brand?.address)) {
      page.drawText(txt(meta.brand?.address).slice(0, 70), {
        x: textX,
        y: y - 44,
        size: 7.5,
        font,
        color: C.muted,
      });
    }

    // Listing name right
    const listing = txt(meta.listingName) || '-';
    const listingLabel = 'LOGEMENT';
    page.drawText(listingLabel, {
      x: pageW - margin - 160,
      y: y - 16,
      size: 6.5,
      font: bold,
      color: C.muted,
    });
    // wrap listing name roughly
    page.drawText(listing.slice(0, 32), {
      x: pageW - margin - 160,
      y: y - 30,
      size: 9,
      font: bold,
      color: C.brand,
    });
    if (listing.length > 32) {
      page.drawText(listing.slice(32, 64), {
        x: pageW - margin - 160,
        y: y - 42,
        size: 9,
        font: bold,
        color: C.brand,
      });
    }

    y -= 68;

    // -- En-tête officiel --
    page.drawText('ROYAUME DU MAROC', {
      x: margin,
      y,
      size: 10,
      font: serifBold,
      color: C.ink,
    });
    y -= 14;
    page.drawText("MINISTÈRE DE L'INTÉRIEUR  -  SÛRETÉ NATIONALE", {
      x: margin,
      y,
      size: 8,
      font,
      color: C.muted,
    });
    y -= 18;

    page.drawText('FICHE INDIVIDUELLE DE POLICE', {
      x: margin,
      y,
      size: 16,
      font: serifBold,
      color: C.ink,
    });
    y -= 14;
    page.drawText(
      "À remplir pour chaque voyageur - établissements d'hébergement touristique",
      {
        x: margin,
        y,
        size: 8,
        font,
        color: C.muted,
      },
    );
    y -= 8;
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageW - margin, y },
      thickness: 1.2,
      color: C.line,
    });
    y -= 16;

    // Meta séjour
    const gap = 6;
    const half = (contentW - gap) / 2;
    const rowH = 28;
    drawFieldBox(page, {
      x: margin,
      y,
      w: half,
      h: rowH,
      label: 'N° réservation',
      value: txt(meta.reservationLabel),
      font,
      bold,
    });
    drawFieldBox(page, {
      x: margin + half + gap,
      y,
      w: half,
      h: rowH,
      label: 'Voyageur',
      value: `${i + 1} / ${list.length}`,
      font,
      bold,
    });
    y -= rowH + gap;
    drawFieldBox(page, {
      x: margin,
      y,
      w: half,
      h: rowH,
      label: "Date d'arrivée",
      value: fmtDate(meta.checkIn || ''),
      font,
      bold,
    });
    drawFieldBox(page, {
      x: margin + half + gap,
      y,
      w: half,
      h: rowH,
      label: 'Date de départ',
      value: fmtDate(meta.checkOut || ''),
      font,
      bold,
    });
    y -= rowH + 14;

    page.drawText('IDENTITÉ', {
      x: margin,
      y,
      size: 9,
      font: bold,
      color: C.ink,
    });
    y -= 10;

    const third = (contentW - gap * 2) / 3;
    drawFieldBox(page, {
      x: margin,
      y,
      w: half,
      h: rowH,
      label: 'Nom',
      value: memberFieldValue(m, 'last_name'),
      font,
      bold,
      size: 11,
    });
    drawFieldBox(page, {
      x: margin + half + gap,
      y,
      w: half,
      h: rowH,
      label: 'Prénom(s)',
      value: memberFieldValue(m, 'first_name'),
      font,
      bold,
      size: 11,
    });
    y -= rowH + gap;

    drawFieldBox(page, {
      x: margin,
      y,
      w: third,
      h: rowH,
      label: 'Date de naissance',
      value: fmtDate(memberFieldValue(m, 'birth_date')),
      font,
      bold,
    });
    drawFieldBox(page, {
      x: margin + third + gap,
      y,
      w: third * 2 + gap,
      h: rowH,
      label: 'Lieu de naissance',
      value: memberFieldValue(m, 'place_of_birth'),
      font,
      bold,
    });
    y -= rowH + gap;

    drawFieldBox(page, {
      x: margin,
      y,
      w: third,
      h: rowH,
      label: 'Nationalité',
      value: memberFieldValue(m, 'nationality'),
      font,
      bold,
    });
    drawFieldBox(page, {
      x: margin + third + gap,
      y,
      w: third,
      h: rowH,
      label: 'Sexe',
      value: genderLabel(String(m.gender || '')),
      font,
      bold,
    });
    drawFieldBox(page, {
      x: margin + (third + gap) * 2,
      y,
      w: third,
      h: rowH,
      label: 'Profession',
      value: memberFieldValue(m, 'profession'),
      font,
      bold,
    });
    y -= rowH + 14;

    page.drawText('DOMICILE HABITUEL', {
      x: margin,
      y,
      size: 9,
      font: bold,
      color: C.ink,
    });
    y -= 10;

    drawFieldBox(page, {
      x: margin,
      y,
      w: contentW,
      h: rowH,
      label: 'Adresse',
      value: memberFieldValue(m, 'domicile') || String(m.address || ''),
      font,
      bold,
    });
    y -= rowH + gap;
    drawFieldBox(page, {
      x: margin,
      y,
      w: half,
      h: rowH,
      label: 'Ville',
      value: memberFieldValue(m, 'city'),
      font,
      bold,
    });
    drawFieldBox(page, {
      x: margin + half + gap,
      y,
      w: half,
      h: rowH,
      label: 'Pays de résidence',
      value:
        memberFieldValue(m, 'country') ||
        String(m.country_of_residence || m.residence_country || ''),
      font,
      bold,
    });
    y -= rowH + 14;

    page.drawText("PIÈCE D'IDENTITÉ", {
      x: margin,
      y,
      size: 9,
      font: bold,
      color: C.ink,
    });
    y -= 10;

    drawFieldBox(page, {
      x: margin,
      y,
      w: third,
      h: rowH,
      label: 'Type',
      value: String(m.document_type || 'passport').toLowerCase() === 'id_card' ? 'CIN / ID' : 'Passeport',
      font,
      bold,
    });
    drawFieldBox(page, {
      x: margin + third + gap,
      y,
      w: third * 2 + gap,
      h: rowH,
      label: 'N° du document',
      value: memberFieldValue(m, 'document_number'),
      font,
      bold,
      size: 11,
    });
    y -= rowH + gap;
    drawFieldBox(page, {
      x: margin,
      y,
      w: half,
      h: rowH,
      label: 'Délivré le',
      value: fmtDate(memberFieldValue(m, 'document_issued_on')),
      font,
      bold,
    });
    drawFieldBox(page, {
      x: margin + half + gap,
      y,
      w: half,
      h: rowH,
      label: 'Délivré à',
      value: memberFieldValue(m, 'document_issued_at'),
      font,
      bold,
    });
    y -= rowH + 14;

    page.drawText('DÉPLACEMENT', {
      x: margin,
      y,
      size: 9,
      font: bold,
      color: C.ink,
    });
    y -= 10;

    drawFieldBox(page, {
      x: margin,
      y,
      w: half,
      h: rowH,
      label: 'Venant de (provenance)',
      value: memberFieldValue(m, 'coming_from'),
      font,
      bold,
    });
    drawFieldBox(page, {
      x: margin + half + gap,
      y,
      w: half,
      h: rowH,
      label: 'Allant à (destination)',
      value: memberFieldValue(m, 'going_to'),
      font,
      bold,
    });
    y -= rowH + gap;
    drawFieldBox(page, {
      x: margin,
      y,
      w: half,
      h: rowH,
      label: 'Téléphone',
      value: memberFieldValue(m, 'phone'),
      font,
      bold,
    });
    drawFieldBox(page, {
      x: margin + half + gap,
      y,
      w: half,
      h: rowH,
      label: 'E-mail',
      value: memberFieldValue(m, 'email'),
      font,
      bold,
    });
    y -= rowH + 22;

    // Signatures
    const sigH = 56;
    drawFieldBox(page, {
      x: margin,
      y,
      w: half,
      h: sigH,
      label: 'Signature du voyageur',
      value: '',
      font,
      bold,
    });
    drawFieldBox(page, {
      x: margin + half + gap,
      y,
      w: half,
      h: sigH,
      label: "Cachet / signature de l'hébergeur",
      value: '',
      font,
      bold,
    });
    y -= sigH + 18;

    page.drawText(
      `Document généré par Sojori - ${memberDisplayName(m)} - à vérifier avant dépôt / télédéclaration.`,
      {
        x: margin,
        y: margin + 8,
        size: 7,
        font,
        color: C.muted,
      },
    );
    page.drawText(`Page ${i + 1}/${list.length}`, {
      x: pageW - margin - 48,
      y: margin + 8,
      size: 7,
      font,
      color: C.muted,
    });
  }

  return doc.save();
}

export async function downloadFichePolicePdf(
  members: Record<string, unknown>[],
  meta: FichePoliceMeta,
  filename?: string,
): Promise<void> {
  const bytes = await generateFichePolicePdfBytes(members, meta);
  const blob = new Blob(
    [bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer],
    { type: 'application/pdf' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeResa = txt(meta.reservationLabel || 'reservation').replace(/[^\w.-]+/g, '-');
  a.download = filename || `fiche-police-${safeResa || 'resa'}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
