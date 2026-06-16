import type { ReactNode } from 'react';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Surligne toutes les occurrences du mot-clé (insensible à la casse). */
export function highlightInboxKeyword(text: string, keyword: string): ReactNode {
  const kw = keyword.trim();
  if (!kw || !text) return text;
  const parts = text.split(new RegExp(`(${escapeRegex(kw)})`, 'gi'));
  if (parts.length <= 1) return text;
  return parts.map((part, i) =>
    part.toLowerCase() === kw.toLowerCase() ? (
      <mark
        key={`${i}-${part.slice(0, 8)}`}
        style={{
          background: '#fef08a',
          color: 'inherit',
          padding: '0 2px',
          borderRadius: 2,
        }}
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function messageMatchesKeyword(text: string | undefined, keyword: string): boolean {
  const kw = keyword.trim();
  if (!kw || !text) return false;
  return text.toLowerCase().includes(kw.toLowerCase());
}
