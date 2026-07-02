/** Nombre max de photos vitrine sur /pm/[slug] (sojori-vente slice(0, 8)). */
export const PM_VITRINE_MAX_PHOTOS = 8;

/** Specs affichées dans le formulaire PM (aligné upload listing + hero sojori-vente). */
export const PM_VITRINE_IMAGE_SPECS = {
  formats: 'JPEG, PNG ou WebP',
  accept: 'image/jpeg,image/png,image/webp',
  maxFileSizeMb: 5,
  cover: { width: 1920, height: 1080, ratio: '16:9' },
  gallery: { minWidth: 1024, minHeight: 768 },
};

export const PM_VITRINE_IMAGE_HINT = `Format ${PM_VITRINE_IMAGE_SPECS.formats} · max ${PM_VITRINE_IMAGE_SPECS.maxFileSizeMb} Mo/fichier · couverture ${PM_VITRINE_IMAGE_SPECS.cover.width}×${PM_VITRINE_IMAGE_SPECS.cover.height} (${PM_VITRINE_IMAGE_SPECS.cover.ratio}) · galerie min ${PM_VITRINE_IMAGE_SPECS.gallery.minWidth}×${PM_VITRINE_IMAGE_SPECS.gallery.minHeight}`;

/** Initiales marketplace (2 lettres) depuis le nom public — aligné srv-listing initialsFromName. */
export function initialsFromPublicName(name = '') {
  return (
    String(name || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'SJ'
  );
}

/** Texte affiché dans le badge logo sojori-vente (pas une image). */
export function resolvePmLogoText(logoText, publicName) {
  const custom = String(logoText ?? '').trim().slice(0, 2).toUpperCase();
  if (custom) return custom;
  return initialsFromPublicName(publicName);
}

/** Normalise une entrée pmProfile.images (string ou objet upload legacy). */
export function normalizePmImageUrl(raw) {
  if (raw == null) return '';
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (!s || s === 'undefined' || s === 'null') return '';
    return s;
  }
  if (typeof raw === 'object') {
    const s = String(
      raw.urlOptimized || raw.url || raw.urlOriginal || raw.urlThumbnail || raw.Location || '',
    ).trim();
    if (!s || s === 'undefined' || s === 'null') return '';
    return s;
  }
  return '';
}

export function normalizePmImageList(images) {
  if (!Array.isArray(images)) return [];
  return images.map(normalizePmImageUrl).filter(Boolean);
}

export function getPmLogoUrl(images) {
  const list = normalizePmImageList(images);
  return list[0] || '';
}

export function extractUrlsFromUploadResult(result) {
  if (!result) return [];
  if (typeof result.url === 'string') {
    const u = normalizePmImageUrl(result.url);
    return u ? [u] : [];
  }
  if (Array.isArray(result.files)) {
    return result.files.map((f) => normalizePmImageUrl(f)).filter(Boolean);
  }
  if (Array.isArray(result)) {
    return result.map((f) => normalizePmImageUrl(f)).filter(Boolean);
  }
  if (Array.isArray(result.urls)) {
    return result.urls.map((f) => normalizePmImageUrl(f)).filter(Boolean);
  }
  return [];
}
