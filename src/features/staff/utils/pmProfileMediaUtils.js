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
