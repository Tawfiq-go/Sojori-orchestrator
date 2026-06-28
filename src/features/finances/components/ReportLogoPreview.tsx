import { useEffect, useState, type ReactNode } from 'react';
import { fetchListingMediaBlob } from '../services/listingMediaApi';

type Props = {
  canonicalUrl?: string;
  className?: string;
  empty?: ReactNode;
  alt?: string;
};

/** Aperçu logo sans exposer l’URL GCS dans le DOM (blob local). */
export function ReportLogoPreview({ canonicalUrl, className, empty, alt = '' }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setBroken(false);
    setSrc(null);

    const raw = String(canonicalUrl || '').trim();
    if (!raw) return undefined;

    void fetchListingMediaBlob(raw)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setBroken(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [canonicalUrl]);

  if (!String(canonicalUrl || '').trim()) {
    return empty ?? null;
  }
  if (broken) {
    return <span className={`${className ?? ''} report-logo-broken`}>Logo</span>;
  }
  if (!src) {
    return <span className={`${className ?? ''} report-logo-loading`}>…</span>;
  }
  return <img className={className} src={src} alt={alt} referrerPolicy="no-referrer" />;
}

export default ReportLogoPreview;
