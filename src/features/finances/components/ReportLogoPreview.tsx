import { useEffect, useState, type ReactNode } from 'react';
import {
  getListingMediaSignedUrl,
  isListingsBucketUrl,
  stripListingMediaQuery,
} from '../services/listingMediaApi';

type Props = {
  canonicalUrl?: string;
  className?: string;
  empty?: ReactNode;
  brokenFallback?: ReactNode;
  alt?: string;
};

async function signedUrlWithRetry(canonicalUrl: string, attempts = 3): Promise<string> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await getListingMediaSignedUrl(canonicalUrl);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => window.setTimeout(r, 400 * (i + 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Lecture logo impossible');
}

/** Aperçu logo — même logique que « Voir HTML » (signé + retry auth). */
export function ReportLogoPreview({
  canonicalUrl,
  className,
  empty,
  brokenFallback,
  alt = '',
}: Props) {
  const raw = stripListingMediaQuery(String(canonicalUrl || '').trim());
  const [src, setSrc] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBroken(false);
    setSrc(null);

    if (!raw) return undefined;

    void (async () => {
      try {
        if (isListingsBucketUrl(raw)) {
          const signed = await signedUrlWithRetry(raw);
          if (!cancelled) setSrc(signed);
          return;
        }
        if (!cancelled) setSrc(raw);
      } catch {
        // Secours : URL publique directe (upload get_link)
        if (!cancelled) setSrc(raw);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [raw]);

  if (!raw) {
    return empty ?? null;
  }
  if (broken) {
    return brokenFallback ?? empty ?? null;
  }
  if (!src) {
    return <span className={`${className ?? ''} report-logo-loading`} aria-hidden>…</span>;
  }
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}

export default ReportLogoPreview;
