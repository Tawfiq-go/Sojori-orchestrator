import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../../../components/DashboardWrapper';
import { FinancesModule, useFinancesAccess } from '../FinancesModule';
import { fetchDefaultPmReportHeader } from '../financesApi';
import { useFinancesOwnerScope } from '../useFinancesOwnerScope';
import { ReportLogoPreview } from '../components/ReportLogoPreview';
import { uploadReportLogo } from '../services/reportLogoUpload';
import { normalizeProfitReportHeader } from '../utils/profitReportHeader';
import type { ProfitReportHeader } from '../types';
import { updateOwner } from '../../staff/services/serverApi.task';

const PAGE_TITLE = 'En-tête & logo P&L';

/**
 * Identité PDF/HTML par défaut des rapports P&L (ex-onglet Owners → Rapports P&L).
 * Les brouillons peuvent surcharger pour un seul rapport.
 */
export function FinancesBrandingPage() {
  return (
    <DashboardWrapper breadcrumb={['Finances', PAGE_TITLE]} hidePageHeader>
      <FinancesModule>
        <FinancesBrandingContent />
      </FinancesModule>
    </DashboardWrapper>
  );
}

function FinancesBrandingContent() {
  const { canWrite } = useFinancesAccess();
  const { ownerId, needsOwnerPick } = useFinancesOwnerScope();
  const [draft, setDraft] = useState<ProfitReportHeader>(normalizeProfitReportHeader());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const load = async () => {
    if (needsOwnerPick || !ownerId) {
      setDraft(normalizeProfitReportHeader());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await fetchDefaultPmReportHeader({ ownerId });
      setDraft(normalizeProfitReportHeader(row || undefined));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [ownerId, needsOwnerPick]);

  const setField = (key: keyof ProfitReportHeader, val: string) => {
    setDraft((prev) => ({ ...prev, [key]: val }));
  };

  const persistBrand = async (header: ProfitReportHeader, opts?: { quiet?: boolean }) => {
    if (!ownerId || !canWrite) return;
    const company = (header.companyName || header.publicName || '').trim();
    await updateOwner(ownerId, {
      phone: header.phone || '',
      address: header.address || '',
      pmProfile: {
        publicName: company,
        tagline: header.tagline || '',
        logoImage: header.logoUrl || '',
        logoText: header.logoText || company.charAt(0).toUpperCase() || '',
      },
    });
    if (!opts?.quiet) toast.success('En-tête & logo enregistrés');
  };

  const onLogoFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !canWrite || !ownerId) return;
    setUploading(true);
    try {
      const url = await uploadReportLogo(file);
      const next = { ...draftRef.current, logoUrl: url };
      setDraft(next);
      await persistBrand(next, { quiet: true });
      toast.success('Nouveau logo enregistré');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload logo impossible');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onRemoveLogo = async () => {
    if (!canWrite || !ownerId) return;
    setUploading(true);
    try {
      const next = { ...draftRef.current, logoUrl: '' };
      setDraft(next);
      await persistBrand(next, { quiet: true });
      toast.success('Logo retiré');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Suppression logo impossible');
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (!ownerId || !canWrite) return;
    setSaving(true);
    try {
      await persistBrand(draftRef.current);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const displayName = draft.companyName?.trim() || 'Non configuré';
  const hasLogo = Boolean(draft.logoUrl?.trim());

  return (
    <>
      <div className="ph">
        <div>
          <h1>{PAGE_TITLE}</h1>
          <p className="sub">
            Logo, nom de société et contacts affichés en haut des PDF/HTML des rapports P&L. Un brouillon
            peut garder un override pour <b>ce rapport seulement</b>.
          </p>
        </div>
        <div className="ph-actions">
          <Link className="btn btn-ghost" to="/finances/reports">
            ← Rapports P&L
          </Link>
          {canWrite && !needsOwnerPick ? (
            <button type="button" className="btn btn-prim" disabled={saving || loading || uploading} onClick={() => void onSave()}>
              {saving ? '…' : 'Enregistrer texte & contacts'}
            </button>
          ) : null}
        </div>
      </div>

      {needsOwnerPick ? (
        <div className="inote info">
          <span className="i">ℹ️</span>
          Sélectionnez un <b>propriétaire PM</b> dans la barre du haut.
        </div>
      ) : null}

      {!canWrite ? (
        <div className="ro-banner">
          <div className="ic">👁</div>
          <div>Lecture seule — l’en-tête PDF est géré par le gestionnaire.</div>
        </div>
      ) : null}

      {loading ? (
        <div className="empty">
          <div className="spinner" />
        </div>
      ) : (
        <div className="card">
          <div className="card-b">
            <div className="branding-preview-row">
              <ReportLogoPreview
                canonicalUrl={draft.logoUrl}
                className="report-header-logo-preview"
                empty={
                  <span className="report-header-logo-preview report-header-bar-logo-fallback">
                    {(displayName.charAt(0) || '?').toUpperCase()}
                  </span>
                }
                brokenFallback={
                  <span className="report-header-logo-preview report-header-bar-logo-fallback">
                    {(displayName.charAt(0) || '?').toUpperCase()}
                  </span>
                }
              />
              <div className="branding-preview-text">
                <div className="branding-preview-name">{displayName}</div>
                {draft.tagline ? <div className="sub">{draft.tagline}</div> : null}
                <div className="sub" style={{ marginTop: 4 }}>
                  {[draft.email, draft.phone].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
            </div>

            <div className="flabel" style={{ marginTop: 8 }}>
              Logo des rapports PDF / HTML
            </div>
            <div className="report-header-logo-row branding-logo-controls">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                hidden
                onChange={(e) => void onLogoFile(e.target.files)}
              />
              {canWrite ? (
                <div className="report-header-logo-actions">
                  <button
                    type="button"
                    className="btn btn-prim btn-sm"
                    disabled={uploading || saving}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? 'Envoi…' : hasLogo ? 'Remplacer le logo' : '+ Ajouter un logo'}
                  </button>
                  {hasLogo ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={uploading || saving}
                      onClick={() => void onRemoveLogo()}
                    >
                      Supprimer le logo
                    </button>
                  ) : null}
                </div>
              ) : (
                <span className="sub">{hasLogo ? 'Logo présent' : 'Aucun logo'}</span>
              )}
              <p className="sub" style={{ margin: '6px 0 0', fontSize: 11, width: '100%' }}>
                PNG ou JPG · fond transparent recommandé. Remplacer / supprimer enregistre tout de suite. Sans
                image → initiale du nom.
              </p>
            </div>

            <div className="report-header-fields-compact" style={{ marginTop: 16 }}>
              <div className="fgrp compact">
                <div className="flabel">Nom société / marque</div>
                <input
                  className="fin fin-sm"
                  value={draft.companyName || ''}
                  disabled={!canWrite}
                  onChange={(e) => setField('companyName', e.target.value)}
                />
              </div>
              <div className="fgrp compact">
                <div className="flabel">Slogan</div>
                <input
                  className="fin fin-sm"
                  value={draft.tagline || ''}
                  disabled={!canWrite}
                  onChange={(e) => setField('tagline', e.target.value)}
                />
              </div>
              <div className="fgrp compact">
                <div className="flabel">Email</div>
                <input className="fin fin-sm" value={draft.email || ''} disabled readOnly title="Compte utilisateur" />
              </div>
              <div className="fgrp compact">
                <div className="flabel">Téléphone</div>
                <input
                  className="fin fin-sm"
                  value={draft.phone || ''}
                  disabled={!canWrite}
                  onChange={(e) => setField('phone', e.target.value)}
                />
              </div>
              <div className="fgrp compact span2">
                <div className="flabel">Adresse</div>
                <input
                  className="fin fin-sm"
                  value={draft.address || ''}
                  disabled={!canWrite}
                  onChange={(e) => setField('address', e.target.value)}
                />
              </div>
            </div>

            <div className="inote info" style={{ marginTop: 16 }}>
              <span className="i">ℹ️</span>
              <div>
                Ces infos sont copiées à la <b>génération</b> d’un rapport. Sur un brouillon :{' '}
                <b>Ce rapport</b> = override ponctuel · <b>Marque PM</b> = met à jour cette page.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default FinancesBrandingPage;
