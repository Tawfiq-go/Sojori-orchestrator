import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../../../components/DashboardWrapper';
import { FinancesModule, useFinancesAccess } from '../FinancesModule';
import {
  fetchDefaultPmReportHeader,
  fetchPmBusinessConfig,
  savePmBusinessConfig,
  type PmBusinessListingCost,
} from '../financesApi';
import { useFinancesOwnerScope } from '../useFinancesOwnerScope';
import { ReportLogoPreview } from '../components/ReportLogoPreview';
import { uploadReportLogo } from '../services/reportLogoUpload';
import { normalizeProfitReportHeader } from '../utils/profitReportHeader';
import type { ProfitReportHeader } from '../types';
import { updateOwner } from '../../staff/services/serverApi.task';

const PAGE_TITLE = 'En-tête & logo P&L';

/**
 * Identité PDF/HTML par défaut des rapports P&L.
 * + modèle business (gestion | sous-location) et loyers par listing.
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
  const [businessModel, setBusinessModel] = useState<'gestion' | 'sous_location'>('gestion');
  const [listingCosts, setListingCosts] = useState<PmBusinessListingCost[]>([]);
  const [savingBiz, setSavingBiz] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const load = async () => {
    if (needsOwnerPick || !ownerId) {
      setDraft(normalizeProfitReportHeader());
      setListingCosts([]);
      setBusinessModel('gestion');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [row, biz] = await Promise.all([
        fetchDefaultPmReportHeader({ ownerId }),
        fetchPmBusinessConfig({ ownerId }).catch(() => null),
      ]);
      setDraft(normalizeProfitReportHeader(row || undefined));
      if (biz) {
        setBusinessModel(biz.businessModel === 'sous_location' ? 'sous_location' : 'gestion');
        setListingCosts(biz.listings || []);
      }
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

  const setCostField = (listingId: string, key: 'rent' | 'wifi' | 'electricity', raw: string) => {
    const n = Math.max(0, Number(String(raw).replace(',', '.')) || 0);
    setListingCosts((prev) =>
      prev.map((row) => (row.listingId === listingId ? { ...row, [key]: n } : row)),
    );
  };

  const onSaveBusiness = async () => {
    if (!ownerId || !canWrite) return;
    setSavingBiz(true);
    try {
      const saved = await savePmBusinessConfig(
        {
          businessModel,
          listings: listingCosts.map((l) => ({
            listingId: l.listingId,
            rent: l.rent,
            wifi: l.wifi,
            electricity: l.electricity,
          })),
        },
        { ownerId },
      );
      setBusinessModel(saved.businessModel);
      setListingCosts(saved.listings || []);
      toast.success(
        saved.businessModel === 'sous_location'
          ? 'Modèle sous-location + loyers enregistrés'
          : 'Modèle gestion enregistré',
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement modèle impossible');
    } finally {
      setSavingBiz(false);
    }
  };

  const displayName = draft.companyName?.trim() || 'Non configuré';
  const hasLogo = Boolean(draft.logoUrl?.trim());
  const totals = listingCosts.reduce(
    (acc, r) => ({
      rent: acc.rent + (Number(r.rent) || 0),
      wifi: acc.wifi + (Number(r.wifi) || 0),
      electricity: acc.electricity + (Number(r.electricity) || 0),
    }),
    { rent: 0, wifi: 0, electricity: 0 },
  );

  return (
    <>
      <div className="ph">
        <div>
          <h1>{PAGE_TITLE}</h1>
          <p className="sub">
            Logo / marque PDF · et modèle PM (<b>gestion</b> ou <b>sous-location</b>) avec loyers par bien.
          </p>
        </div>
        <div className="ph-actions">
          <Link className="btn btn-ghost" to="/finances/reports">
            ← Rapports P&L
          </Link>
          {canWrite && !needsOwnerPick ? (
            <button
              type="button"
              className="btn btn-prim"
              disabled={saving || loading || uploading}
              onClick={() => void onSave()}
            >
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
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-h">
              <span className="ct">Modèle business PM</span>
              <span className="sub">gestion = % landlords · sous-location = loyer fixe par bien</span>
            </div>
            <div className="card-b">
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${businessModel === 'gestion' ? 'btn-prim' : 'btn-ghost'}`}
                  disabled={!canWrite}
                  onClick={() => setBusinessModel('gestion')}
                >
                  Gestion (commissions)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${businessModel === 'sous_location' ? 'btn-prim' : 'btn-ghost'}`}
                  disabled={!canWrite}
                  onClick={() => setBusinessModel('sous_location')}
                >
                  Sous-location (loyers)
                </button>
              </div>

              {businessModel === 'sous_location' ? (
                <>
                  <div className="report-table-scroll">
                    <table className="ledger-table">
                      <thead>
                        <tr>
                          <th>Bien</th>
                          <th className="num">Loyer / mois</th>
                          <th className="num">Internet</th>
                          <th className="num">Électricité</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listingCosts.map((row) => (
                          <tr key={row.listingId}>
                            <td className="report-listing-cell" title={row.listingName}>
                              {row.listingName || row.listingId}
                            </td>
                            <td className="num">
                              <input
                                className="fin fin-sm"
                                style={{ width: 96, textAlign: 'right' }}
                                disabled={!canWrite}
                                value={row.rent}
                                onChange={(e) => setCostField(row.listingId, 'rent', e.target.value)}
                              />
                            </td>
                            <td className="num">
                              <input
                                className="fin fin-sm"
                                style={{ width: 80, textAlign: 'right' }}
                                disabled={!canWrite}
                                value={row.wifi}
                                onChange={(e) => setCostField(row.listingId, 'wifi', e.target.value)}
                              />
                            </td>
                            <td className="num">
                              <input
                                className="fin fin-sm"
                                style={{ width: 80, textAlign: 'right' }}
                                disabled={!canWrite}
                                value={row.electricity}
                                onChange={(e) =>
                                  setCostField(row.listingId, 'electricity', e.target.value)
                                }
                              />
                            </td>
                          </tr>
                        ))}
                        {!listingCosts.length ? (
                          <tr>
                            <td colSpan={4} className="sub">
                              Aucun listing actif pour ce PM.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                      {listingCosts.length ? (
                        <tfoot>
                          <tr>
                            <td>
                              <b>Total mensuel</b>
                            </td>
                            <td className="num">
                              <b>{totals.rent.toLocaleString('fr-FR')} MAD</b>
                            </td>
                            <td className="num">
                              <b>{totals.wifi.toLocaleString('fr-FR')}</b>
                            </td>
                            <td className="num">
                              <b>{totals.electricity.toLocaleString('fr-FR')}</b>
                            </td>
                          </tr>
                        </tfoot>
                      ) : null}
                    </table>
                  </div>
                  <p className="sub" style={{ marginTop: 8 }}>
                    Ces montants alimentent le P&L (loyers dus) — pas les commissions landlords.
                  </p>
                </>
              ) : (
                <p className="sub">
                  Mode gestion : le P&L utilise les contrats landlords (%). Les loyers fixes listing ne sont
                  déduits que si le modèle est « sous-location ».
                </p>
              )}

              {canWrite && !needsOwnerPick ? (
                <button
                  type="button"
                  className="btn btn-prim"
                  style={{ marginTop: 12 }}
                  disabled={savingBiz}
                  onClick={() => void onSaveBusiness()}
                >
                  {savingBiz ? '…' : 'Enregistrer modèle & loyers'}
                </button>
              ) : null}
            </div>
          </div>

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
                  PNG ou JPG · fond transparent recommandé.
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
                  <input
                    className="fin fin-sm"
                    value={draft.email || ''}
                    disabled
                    readOnly
                    title="Compte utilisateur"
                  />
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
        </>
      )}
    </>
  );
}

export default FinancesBrandingPage;
