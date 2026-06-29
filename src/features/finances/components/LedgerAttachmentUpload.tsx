import { useEffect, useRef, useState } from 'react';
import {
  attachmentFileLabel,
  downloadLedgerAttachment,
  fetchLedgerAttachmentBlob,
  getLedgerAttachmentSignedUrl,
  isLedgerAttachmentPdf,
  uploadLedgerAttachment,
} from '../services/ledgerAttachmentApi';

type ItemState =
  | { status: 'loading' }
  | { status: 'ready'; previewUrl: string; isBlob: boolean }
  | { status: 'error'; message: string };

type Props = {
  ownerId: string | null;
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
  hint?: string;
  /** compact = formulaire · gallery = drawer aperçu large */
  variant?: 'compact' | 'gallery';
};

export function LedgerAttachmentUpload({
  ownerId,
  value,
  onChange,
  disabled,
  hint,
  variant = 'compact',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [itemState, setItemState] = useState<Record<string, ItemState>>({});
  const [lightbox, setLightbox] = useState<{ url: string; label: string; isPdf: boolean } | null>(null);
  const blobUrlsRef = useRef<string[]>([]);

  const isGallery = variant === 'gallery';
  const previewMaxHeight = isGallery ? 'min(58vh, 480px)' : '200px';

  useEffect(() => {
    if (!ownerId || !value.length) {
      setItemState({});
      return;
    }
    let cancelled = false;
    const blobUrls: string[] = [];

    void Promise.all(
      value.map(async (url) => {
        try {
          const blob = await fetchLedgerAttachmentBlob(url, ownerId);
          const previewUrl = URL.createObjectURL(blob);
          blobUrls.push(previewUrl);
          return [url, { status: 'ready' as const, previewUrl, isBlob: true }] as const;
        } catch (proxyErr) {
          try {
            const signed = await getLedgerAttachmentSignedUrl(url, ownerId);
            return [url, { status: 'ready' as const, previewUrl: signed, isBlob: false }] as const;
          } catch (signedErr) {
            const msg =
              signedErr instanceof Error
                ? signedErr.message
                : proxyErr instanceof Error
                  ? proxyErr.message
                  : 'Lecture impossible';
            return [url, { status: 'error' as const, message: msg }] as const;
          }
        }
      }),
    ).then((pairs) => {
      if (cancelled) {
        for (const u of blobUrls) URL.revokeObjectURL(u);
        return;
      }
      for (const u of blobUrlsRef.current) URL.revokeObjectURL(u);
      blobUrlsRef.current = blobUrls;
      const next: Record<string, ItemState> = {};
      for (const p of pairs) {
        if (p) next[p[0]] = p[1];
      }
      setItemState(next);
    });

    return () => {
      cancelled = true;
    };
  }, [value, ownerId]);

  useEffect(() => {
    return () => {
      for (const u of blobUrlsRef.current) URL.revokeObjectURL(u);
      blobUrlsRef.current = [];
    };
  }, []);

  const pickAndUpload = async (files: FileList | null) => {
    if (!files?.length || busy || disabled) return;
    setBusy(true);
    setError('');
    const next = [...value];
    try {
      for (const file of Array.from(files)) {
        const url = await uploadLedgerAttachment(file, ownerId);
        if (!next.includes(url)) next.push(url);
      }
      onChange(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload impossible');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const openAttachment = async (canonicalUrl: string, label: string, isPdf: boolean) => {
    const state = itemState[canonicalUrl];
    if (state?.status === 'ready') {
      if (isPdf) {
        window.open(state.previewUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      setLightbox({ url: state.previewUrl, label, isPdf });
      return;
    }
    if (opening) return;
    setOpening(canonicalUrl);
    setError('');
    try {
      const signed = await getLedgerAttachmentSignedUrl(canonicalUrl, ownerId);
      window.open(signed, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ouverture impossible');
    } finally {
      setOpening(null);
    }
  };

  const handleDownload = async (canonicalUrl: string, label: string) => {
    if (downloading) return;
    setDownloading(canonicalUrl);
    setError('');
    try {
      await downloadLedgerAttachment(canonicalUrl, ownerId, label);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Téléchargement impossible');
    } finally {
      setDownloading(null);
    }
  };

  const remove = (url: string) => {
    onChange(value.filter((u) => u !== url));
  };

  return (
    <>
      <div className="fgrp">
        <div className="flabel">Justificatif (PDF ou image)</div>
        {hint ? (
          <p className="sub" style={{ margin: '0 0 8px', fontSize: 12 }}>
            {hint}
          </p>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          style={{ display: 'none' }}
          disabled={disabled || busy}
          onChange={(e) => void pickAndUpload(e.target.files)}
        />
        {!disabled ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={disabled || busy || !ownerId}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? 'Envoi…' : '+ Ajouter un fichier'}
            </button>
            <span className="sub" style={{ fontSize: 12 }}>
              Zone privée — non visible publiquement
            </span>
          </div>
        ) : null}
        {value.length > 0 ? (
          <div style={{ marginTop: 10, display: 'grid', gap: isGallery ? 16 : 10 }}>
            {value.map((url, idx) => {
              const isPdf = isLedgerAttachmentPdf(url);
              const label = attachmentFileLabel(url, idx);
              const state = itemState[url];
              const ready = state?.status === 'ready';
              const failed = state?.status === 'error';
              const loading = !state || state.status === 'loading';

              return (
                <div
                  key={url}
                  style={{
                    border: '1px solid var(--b, #e5e7eb)',
                    borderRadius: 12,
                    padding: isGallery ? 14 : 10,
                    background: 'var(--surface2, #fafafa)',
                  }}
                >
                  {!isPdf && ready ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: 0, width: '100%', height: 'auto', marginBottom: 10, display: 'block' }}
                      disabled={!!opening}
                      onClick={() => void openAttachment(url, label, false)}
                      title="Agrandir l'image"
                    >
                      <img
                        src={state.previewUrl}
                        alt={label}
                        style={{
                          display: 'block',
                          width: '100%',
                          maxHeight: previewMaxHeight,
                          objectFit: 'contain',
                          borderRadius: 8,
                          background: '#fff',
                          cursor: 'zoom-in',
                        }}
                      />
                    </button>
                  ) : null}
                  {isPdf && ready ? (
                    <div
                      style={{
                        marginBottom: 10,
                        padding: '24px 16px',
                        textAlign: 'center',
                        background: '#fff',
                        borderRadius: 8,
                        border: '1px dashed var(--b, #e5e7eb)',
                      }}
                    >
                      <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
                      <div className="sub">{label}</div>
                    </div>
                  ) : null}
                  {loading ? (
                    <div className="sub" style={{ marginBottom: 10, padding: '12px 0' }}>
                      ⏳ Chargement de l&apos;aperçu…
                    </div>
                  ) : null}
                  {failed ? (
                    <div className="inote warn" style={{ marginBottom: 10, padding: '8px 10px' }}>
                      <span className="i">⚠️</span>
                      {state.message}
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span>{isPdf ? '📄' : ready ? '🖼️' : loading ? '⏳' : '⚠️'}</span>
                    <span className="sub mono" style={{ fontSize: 12 }} title={url}>
                      {label}
                    </span>
                    <div style={{ flex: 1 }} />
                    {ready || !loading ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={!!opening || loading}
                          onClick={() => void openAttachment(url, label, isPdf)}
                        >
                          {opening === url ? 'Ouverture…' : isPdf ? 'Ouvrir PDF' : 'Agrandir'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={!!downloading || loading || !ownerId}
                          onClick={() => void handleDownload(url, label)}
                        >
                          {downloading === url ? '…' : 'Télécharger'}
                        </button>
                      </>
                    ) : null}
                    {!disabled ? (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(url)}>
                        Retirer
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          disabled ? <p className="sub" style={{ marginTop: 8 }}>Aucun justificatif.</p> : null
        )}
        {error ? (
          <div className="inote warn" style={{ marginTop: 8 }}>
            <span className="i">⚠️</span>
            {error}
          </div>
        ) : null}
      </div>

      {lightbox ? (
        <div
          className="modal on"
          style={{ zIndex: 85 }}
          role="dialog"
          aria-modal
          aria-label={lightbox.label}
          onClick={() => setLightbox(null)}
        >
          <div
            className="modal-box wide"
            style={{ width: 'min(96vw, 920px)', background: 'var(--bg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-h" style={{ padding: '12px 16px' }}>
              <span className="ct">{lightbox.label}</span>
              <button type="button" className="dr-close" onClick={() => setLightbox(null)} aria-label="Fermer">
                ✕
              </button>
            </div>
            <div style={{ padding: 16, overflow: 'auto', maxHeight: 'calc(90vh - 64px)', textAlign: 'center' }}>
              <img
                src={lightbox.url}
                alt={lightbox.label}
                style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 120px)', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default LedgerAttachmentUpload;
