import { useRef, useState, type ReactNode } from 'react';
import { toast } from 'react-toastify';
import { ReportLogoPreview } from './ReportLogoPreview';
import { uploadReportLogo } from '../services/reportLogoUpload';
import type { ProfitReportHeader } from '../types';

type Props = {
  value: ProfitReportHeader;
  onChange: (next: ProfitReportHeader) => void;
  disabled?: boolean;
  onLoadDefault?: () => void | Promise<void>;
  onSave?: () => void | Promise<void>;
  loadingDefault?: boolean;
  saving?: boolean;
  defaultOpen?: boolean;
};

function setField(
  header: ProfitReportHeader,
  onChange: (next: ProfitReportHeader) => void,
  key: keyof ProfitReportHeader,
  val: string,
) {
  onChange({ ...header, [key]: val });
}

function logoFallback(label: string, className?: string): ReactNode {
  return (
    <span className={className}>
      {(label.charAt(0) || '?').toUpperCase()}
    </span>
  );
}

export function ReportHeaderSection({
  value,
  onChange,
  disabled,
  onLoadDefault,
  onSave,
  loadingDefault,
  saving,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const displayName = value.companyName?.trim() || 'En-tête non configuré';
  const summaryBits = [value.email, value.phone].filter(Boolean);
  const summary = summaryBits.length ? summaryBits.join(' · ') : 'nom, email, logo…';
  const hasLogo = Boolean(value.logoUrl?.trim());

  const onLogoFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || disabled) return;
    setUploadingLogo(true);
    try {
      const url = await uploadReportLogo(file);
      onChange({ ...value, logoUrl: url });
      toast.success('Logo mis à jour');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload logo impossible');
    } finally {
      setUploadingLogo(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className={`report-header-section${open ? ' open' : ''}`}>
      <div className="report-header-bar">
        <button type="button" className="report-header-bar-toggle" onClick={() => setOpen((o) => !o)}>
          <span className="report-header-chevron">{open ? '▾' : '▸'}</span>
          <ReportLogoPreview
            canonicalUrl={value.logoUrl}
            className="report-header-bar-logo"
            empty={logoFallback(displayName, 'report-header-bar-logo report-header-bar-logo-fallback')}
            brokenFallback={logoFallback(displayName, 'report-header-bar-logo report-header-bar-logo-fallback')}
          />
          <span className="report-header-bar-text">
            <span className="report-header-bar-kicker">En-tête PDF</span>
            <span className="report-header-bar-summary">
              {displayName}
              <span className="report-header-bar-dot">·</span>
              {summary}
            </span>
          </span>
        </button>
        {!disabled && (onLoadDefault || onSave) ? (
          <div className="report-header-bar-actions">
            {onLoadDefault ? (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                disabled={loadingDefault || saving}
                title="Charger nom, contacts et logo depuis le profil PM"
                onClick={() => void onLoadDefault()}
              >
                {loadingDefault ? '…' : '↻ Profil'}
              </button>
            ) : null}
            {onSave ? (
              <button
                type="button"
                className="btn btn-prim btn-xs"
                disabled={saving || loadingDefault}
                onClick={() => void onSave()}
              >
                {saving ? '…' : 'Enregistrer'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="report-header-body">
          <div className="form-section-h">Logo rapport</div>
          <div className="report-header-logo-row">
            <ReportLogoPreview
              canonicalUrl={value.logoUrl}
              className="report-header-logo-preview"
              empty={<span className="report-header-logo-preview report-header-logo-empty">Aucun logo</span>}
              brokenFallback={logoFallback(displayName, 'report-header-logo-preview report-header-bar-logo-fallback')}
            />
            <div className="report-header-logo-meta">
              {hasLogo ? (
                <span className="report-header-logo-status">Logo enregistré</span>
              ) : (
                <span className="report-header-logo-status muted">Aucun logo — uploadez un fichier</span>
              )}
              {!disabled ? (
                <div className="report-header-logo-actions">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => void onLogoFile(e.target.files)}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    disabled={uploadingLogo}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploadingLogo ? 'Envoi…' : hasLogo ? 'Remplacer logo' : '+ Ajouter logo'}
                  </button>
                  {hasLogo ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      title="Retirer le logo"
                      onClick={() => setField(value, onChange, 'logoUrl', '')}
                    >
                      Retirer logo
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <p className="report-header-hint">
            « Profil » reprend l&apos;onglet <b>Équipe → Owners → Rapports P&L</b>. Logo custom possible ici
            uniquement pour ce rapport. L&apos;emplacement de stockage n&apos;est pas affiché.
          </p>

          <div className="report-header-fields-compact">
            <div className="fgrp compact">
              <div className="flabel">Nom société</div>
              <input
                className="fin fin-sm"
                value={value.companyName || ''}
                disabled={disabled}
                placeholder="Raison sociale"
                onChange={(e) => setField(value, onChange, 'companyName', e.target.value)}
              />
            </div>
            <div className="fgrp compact">
              <div className="flabel">Email</div>
              <input
                className="fin fin-sm"
                type="email"
                value={value.email || ''}
                disabled={disabled}
                placeholder="contact@…"
                onChange={(e) => setField(value, onChange, 'email', e.target.value)}
              />
            </div>
            <div className="fgrp compact">
              <div className="flabel">Téléphone</div>
              <input
                className="fin fin-sm"
                value={value.phone || ''}
                disabled={disabled}
                placeholder="+212 …"
                onChange={(e) => setField(value, onChange, 'phone', e.target.value)}
              />
            </div>
            <div className="fgrp compact">
              <div className="flabel">Site web</div>
              <input
                className="fin fin-sm"
                value={value.website || ''}
                disabled={disabled}
                placeholder="www.…"
                onChange={(e) => setField(value, onChange, 'website', e.target.value)}
              />
            </div>
            <div className="fgrp compact span2">
              <div className="flabel">Adresse</div>
              <input
                className="fin fin-sm"
                value={value.address || ''}
                disabled={disabled}
                placeholder="Rue, ville"
                onChange={(e) => setField(value, onChange, 'address', e.target.value)}
              />
            </div>
            <div className="fgrp compact span2">
              <div className="flabel">Slogan</div>
              <input
                className="fin fin-sm"
                value={value.tagline || ''}
                disabled={disabled}
                placeholder="Optionnel"
                onChange={(e) => setField(value, onChange, 'tagline', e.target.value)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ReportHeaderSection;
