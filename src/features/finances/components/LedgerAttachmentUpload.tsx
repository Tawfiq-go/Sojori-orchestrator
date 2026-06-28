import { useEffect, useRef, useState } from 'react';
import {
  attachmentFileLabel,
  getLedgerAttachmentSignedUrl,
  isLedgerAttachmentPdf,
  uploadLedgerAttachment,
} from '../services/ledgerAttachmentApi';

type Props = {
  ownerId: string | null;
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
  hint?: string;
};

export function LedgerAttachmentUpload({ ownerId, value, onChange, disabled, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [signedByUrl, setSignedByUrl] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!ownerId || !value.length) {
      setSignedByUrl({});
      return;
    }
    let cancelled = false;
    void Promise.all(
      value.map(async (url) => {
        try {
          const signed = await getLedgerAttachmentSignedUrl(url, ownerId);
          return [url, signed] as const;
        } catch {
          return null;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const p of pairs) {
        if (p) next[p[0]] = p[1];
      }
      setSignedByUrl(next);
    });
    return () => {
      cancelled = true;
    };
  }, [value, ownerId]);

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

  const openAttachment = async (canonicalUrl: string) => {
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

  const remove = (url: string) => {
    onChange(value.filter((u) => u !== url));
  };

  return (
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
      {value.length > 0 ? (
        <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
          {value.map((url, idx) => {
            const isPdf = isLedgerAttachmentPdf(url);
            const signed = signedByUrl[url];
            return (
              <div
                key={url}
                style={{
                  border: '1px solid var(--b, #e5e7eb)',
                  borderRadius: 10,
                  padding: 10,
                  background: 'var(--surface2, #fafafa)',
                }}
              >
                {!isPdf && signed ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: 0, width: '100%', height: 'auto', marginBottom: 8 }}
                    disabled={!!opening}
                    onClick={() => void openAttachment(url)}
                    title="Ouvrir l'image en grand"
                  >
                    <img
                      src={signed}
                      alt={attachmentFileLabel(url, idx)}
                      style={{
                        display: 'block',
                        width: '100%',
                        maxHeight: 200,
                        objectFit: 'contain',
                        borderRadius: 8,
                        background: '#fff',
                      }}
                    />
                  </button>
                ) : null}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>{isPdf ? '📄' : signed ? '🖼️' : '⏳'}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={!!opening || !signed}
                    onClick={() => void openAttachment(url)}
                  >
                    {opening === url ? 'Ouverture…' : isPdf ? 'Ouvrir le PDF' : signed ? 'Ouvrir' : 'Chargement…'}
                  </button>
                  <span className="sub" style={{ fontSize: 12 }}>
                    {attachmentFileLabel(url, idx)}
                  </span>
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
      ) : null}
      {error ? (
        <div className="inote warn" style={{ marginTop: 8 }}>
          <span className="i">⚠️</span>
          {error}
        </div>
      ) : null}
    </div>
  );
}

export default LedgerAttachmentUpload;
