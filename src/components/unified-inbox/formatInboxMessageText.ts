/**
 * Normalise le corps d'un message (OTA / orchestration / RU) pour affichage inbox.
 * - Saut de page Word / export : form feed \f → paragraphe vide
 * - HTML email / template : <br>, </p><p> → retours ligne
 * - Entités HTML courantes
 */
export function formatInboxMessageText(raw: string | undefined | null): string {
  if (raw == null) return '';
  let text = String(raw);

  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  text = text.replace(/<\/div>\s*<div[^>]*>/gi, '\n\n');
  text = text.replace(/<[^>]+>/g, '');

  text = text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCharCode(n) : '';
    });

  // Saut de page (orchestration / export Word) — pas affichable en chat, on le lit comme un bloc
  text = text.replace(/\f/g, '\n\n');

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Lignes vides excessives (garde au plus 2 \n consécutifs)
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/** Aperçu une ligne pour la liste de threads */
export function inboxMessagePreview(raw: string | undefined | null, maxLen = 120): string {
  const flat = formatInboxMessageText(raw).replace(/\s+/g, ' ').trim();
  if (!flat) return '';
  return flat.length > maxLen ? `${flat.slice(0, maxLen)}…` : flat;
}
