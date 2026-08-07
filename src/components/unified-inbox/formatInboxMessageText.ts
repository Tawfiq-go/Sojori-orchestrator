/**
 * Normalise le corps d'un message (OTA / orchestration / RU) pour affichage inbox.
 * - Saut de page Word / export : form feed \f → paragraphe vide
 * - HTML email / template : <br>, </p><p> → retours ligne
 * - Entités HTML courantes (y compris &lt;br&gt; échappé)
 */
function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const n = Number.parseInt(hex, 16);
      return Number.isFinite(n) ? String.fromCharCode(n) : '';
    })
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCharCode(n) : '';
    });
}

function htmlBreaksToNewlines(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<\/div>\s*<div[^>]*>/gi, '\n\n')
    .replace(/<\/?(p|div|li|tr|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '');
}

export function formatInboxMessageText(raw: string | undefined | null): string {
  if (raw == null) return '';
  let text = String(raw);

  // 1) Décoder les entités d'abord (&lt;br&gt; → <br>), puis nettoyer le HTML.
  text = decodeHtmlEntities(text);
  text = htmlBreaksToNewlines(text);
  // 2) Si un 2e tour d'entités apparaît (double-encodage), recommencer une fois.
  if (/&(?:nbsp|amp|lt|gt|quot|#\d+|#x[0-9a-f]+);/i.test(text)) {
    text = htmlBreaksToNewlines(decodeHtmlEntities(text));
  }

  // Saut de page (orchestration / export Word) — pas affichable en chat, on le lit comme un bloc
  text = text.replace(/\f/g, '\n\n');
  // Littéraux "\n" / "\r\n" parfois sérialisés tels quels
  text = text.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');

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
