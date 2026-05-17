import React, { useCallback, useEffect, useState } from 'react';
import { ListPlus, Plus, Trash2 } from 'lucide-react';

import {
  RU_API_CATALOG_DOMAIN,
  RU_FIELD_MAP_DOMAIN,
  RU_MAPPING_DOMAIN_OPTIONS,
} from '../constants/ruFieldMappingDomains';

function newRowKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `vm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function rowsFromValueMappings(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr.map((e) => ({
    key: newRowKey(),
    sojoriValue: String(e?.sojoriValue ?? '').trim(),
    ruCode: String(e?.ruCode ?? '').trim(),
    label: e?.label != null ? String(e.label).trim() : '',
  }));
}

function emptyForm(defaultDomain) {
  const isFill = defaultDomain === RU_FIELD_MAP_DOMAIN;
  return {
    domain: defaultDomain || RU_FIELD_MAP_DOMAIN,
    ruFieldPath: '',
    sojoriStoragePath: '',
    outboundRuFieldPath: '',
    includedInOutboundPush: isFill,
    notes: '',
    sortOrder: 0,
    active: true,
  };
}

/**
 * Modal Add / Edit pour une ligne `ChannelRuFieldMapping`.
 * Édition des `valueMappings` par **lignes** (ajout / suppression) + option JSON pour import en masse.
 */
export function RuFieldMappingCrudDialog({ open, mode, initial, defaultDomain, onClose, onSubmit, submitting }) {
  const [f, setF] = useState(() => emptyForm(defaultDomain));
  const [mappingRows, setMappingRows] = useState([]);
  const [jsonError, setJsonError] = useState('');
  const [advancedJsonOpen, setAdvancedJsonOpen] = useState(false);
  const [jsonDraft, setJsonDraft] = useState('[]');

  const applyJsonToRows = useCallback(() => {
    const raw = (jsonDraft || '').trim();
    if (!raw) {
      setMappingRows([]);
      setJsonError('');
      return;
    }
    try {
      const p = JSON.parse(raw);
      if (!Array.isArray(p)) {
        setJsonError('Le JSON doit être un tableau d’objets { sojoriValue, ruCode, label? }.');
        return;
      }
      const next = p
        .map((e) => ({
          key: newRowKey(),
          sojoriValue: String(e?.sojoriValue ?? '').trim(),
          ruCode: String(e?.ruCode ?? '').trim(),
          label: e?.label != null ? String(e.label).trim() : '',
        }))
        .filter((e) => e.sojoriValue && e.ruCode);
      setMappingRows(next);
      setJsonError('');
    } catch {
      setJsonError('JSON invalide.');
    }
  }, [jsonDraft]);

  const syncJsonDraftFromRows = useCallback(() => {
    const payload = mappingRows
      .filter((r) => r.sojoriValue.trim() && r.ruCode.trim())
      .map((r) => ({
        sojoriValue: r.sojoriValue.trim(),
        ruCode: r.ruCode.trim(),
        ...(r.label.trim() ? { label: r.label.trim() } : {}),
      }));
    setJsonDraft(JSON.stringify(payload, null, 2));
    setJsonError('');
  }, [mappingRows]);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setJsonError('');
      setAdvancedJsonOpen(false);
      setF({
        domain: initial.domain || RU_FIELD_MAP_DOMAIN,
        ruFieldPath: initial.ruFieldPath || '',
        sojoriStoragePath: initial.sojoriStoragePath || '',
        outboundRuFieldPath: initial.outboundRuFieldPath || '',
        includedInOutboundPush: !!initial.includedInOutboundPush,
        notes: initial.notes || '',
        sortOrder: Number.isFinite(Number(initial.sortOrder)) ? Number(initial.sortOrder) : 0,
        active: initial.active !== false,
      });
      const rows = rowsFromValueMappings(initial.valueMappings);
      setMappingRows(rows);
      setJsonDraft(JSON.stringify(rows.map(({ key: _k, ...rest }) => rest), null, 2));
    } else {
      setJsonError('');
      setAdvancedJsonOpen(false);
      setF(emptyForm(defaultDomain || RU_FIELD_MAP_DOMAIN));
      setMappingRows([]);
      setJsonDraft('[]');
    }
  }, [open, mode, initial, defaultDomain]);

  if (!open) return null;

  const isCatalogDomain = f.domain === RU_API_CATALOG_DOMAIN;
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const addMappingRow = () => {
    setMappingRows((prev) => [...prev, { key: newRowKey(), sojoriValue: '', ruCode: '', label: '' }]);
  };

  const removeMappingRow = (key) => {
    setMappingRows((prev) => prev.filter((r) => r.key !== key));
  };

  const updateMappingRow = (key, field, value) => {
    setMappingRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  };

  const handleSubmit = () => {
    const valueMappings = mappingRows
      .map((r) => ({
        sojoriValue: String(r.sojoriValue ?? '').trim(),
        ruCode: String(r.ruCode ?? '').trim(),
        ...(String(r.label ?? '').trim() ? { label: String(r.label).trim() } : {}),
      }))
      .filter((e) => e.sojoriValue && e.ruCode);

    setJsonError('');
    void onSubmit({
      ...f,
      ruFieldPath: f.ruFieldPath.trim(),
      sojoriStoragePath: f.sojoriStoragePath.trim(),
      outboundRuFieldPath: (f.outboundRuFieldPath || '').trim(),
      valueMappings,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ru-mapping-dialog-title"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 id="ru-mapping-dialog-title" className="text-sm font-bold text-slate-900">
            {mode === 'edit' ? 'Modifier une correspondance' : 'Nouvelle correspondance'}
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Liez un champ Rentals United à un nom reconnu dans Sojori. Enrichissez la table libellé → code ligne par
            ligne (ou import JSON).
          </p>
        </div>
        <div className="p-4 space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Catégorie *</label>
            <select
              className="channels-select w-full h-9 text-xs"
              value={f.domain}
              onChange={(e) => {
                const d = e.target.value;
                set('domain', d);
                if (d === RU_API_CATALOG_DOMAIN) set('includedInOutboundPush', false);
              }}
            >
              {RU_MAPPING_DOMAIN_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Code RU *</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs"
              placeholder={
                isCatalogDomain
                  ? 'ex. nom de l’opération côté RU'
                  : 'ex. identifiant du champ côté Rentals United'
              }
              value={f.ruFieldPath}
              onChange={(e) => set('ruFieldPath', e.target.value)}
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nom Sojori *</label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs"
              placeholder={
                isCatalogDomain
                  ? 'ex. référence utilisée dans Sojori pour cette opération'
                  : 'ex. nom du champ tel qu’il est enregistré dans Sojori'
              }
              value={f.sojoriStoragePath}
              onChange={(e) => set('sojoriStoragePath', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ru-map-included"
              className="h-4 w-4 accent-orange-500"
              checked={!!f.includedInOutboundPush}
              disabled={isCatalogDomain}
              onChange={(e) => set('includedInOutboundPush', e.target.checked)}
            />
            <label htmlFor="ru-map-included" className={`text-slate-700 ${isCatalogDomain ? 'opacity-50' : ''}`}>
              Inclure dans l’envoi vers Rentals United (fiche entreprise uniquement)
            </label>
          </div>
          {!isCatalogDomain && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Champ XML RU pour le code (ex. ContactInfo.NationalityId)
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs font-mono"
                  placeholder="ex. ContactInfo.NationalityId"
                  value={f.outboundRuFieldPath}
                  onChange={(e) => set('outboundRuFieldPath', e.target.value)}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Le libellé stocké côté Sojori est mappé vers ce code dans le XML envoyé à RU.
                </p>
              </div>

              <div className="border border-slate-200 rounded-md overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">Table libellé Sojori → code RU</span>
                  <button
                    type="button"
                    onClick={addMappingRow}
                    disabled={submitting}
                    className="inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
                  >
                    <Plus size={14} />
                    Ajouter une ligne
                  </button>
                </div>
                <div className="overflow-x-auto max-h-[min(38vh,320px)] overflow-y-auto">
                  <table className="w-full text-xs min-w-[520px]">
                    <thead className="sticky top-0 bg-white text-slate-600 border-b border-slate-100">
                      <tr>
                        <th className="text-left px-2 py-2 font-medium w-[32%]">Valeur Sojori *</th>
                        <th className="text-left px-2 py-2 font-medium w-[22%]">Code RU *</th>
                        <th className="text-left px-2 py-2 font-medium w-[28%]">Libellé affichage</th>
                        <th className="text-center px-2 py-2 font-medium w-[56px]"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappingRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                            Aucune ligne. Utilisez « Ajouter une ligne » ou l’import JSON ci-dessous.
                          </td>
                        </tr>
                      ) : (
                        mappingRows.map((row) => (
                          <tr key={row.key} className="border-t border-slate-100 align-top">
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                                placeholder="ex. France"
                                value={row.sojoriValue}
                                disabled={submitting}
                                onChange={(e) => updateMappingRow(row.key, 'sojoriValue', e.target.value)}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                className="w-full border border-slate-300 rounded px-2 py-1 text-xs font-mono"
                                placeholder="ex. 504"
                                value={row.ruCode}
                                disabled={submitting}
                                onChange={(e) => updateMappingRow(row.key, 'ruCode', e.target.value)}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="text"
                                className="w-full border border-slate-300 rounded px-2 py-1 text-xs"
                                placeholder="optionnel"
                                value={row.label}
                                disabled={submitting}
                                onChange={(e) => updateMappingRow(row.key, 'label', e.target.value)}
                              />
                            </td>
                            <td className="px-1 py-1.5 text-center">
                              <button
                                type="button"
                                title="Supprimer la ligne"
                                disabled={submitting}
                                onClick={() => removeMappingRow(row.key)}
                                className="inline-flex items-center justify-center w-8 h-7 rounded border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-500 px-3 py-2 border-t border-slate-100 bg-slate-50/80">
                  Les lignes avec valeur Sojori ou code RU vide sont ignorées à l’enregistrement. Correspondance insensible
                  à la casse côté push (normalisation espaces).
                </p>
              </div>

              <div className="border border-dashed border-slate-300 rounded-md">
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 flex items-center gap-2"
                  onClick={() => {
                    setAdvancedJsonOpen((v) => {
                      const next = !v;
                      if (next) syncJsonDraftFromRows();
                      return next;
                    });
                  }}
                >
                  <ListPlus size={16} className="text-slate-500 shrink-0" />
                  {advancedJsonOpen ? 'Masquer l’import / export JSON' : 'Import ou export JSON (lot)'}
                </button>
                {advancedJsonOpen && (
                  <div className="p-3 space-y-2 border-t border-slate-200">
                    <textarea
                      className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs font-mono min-h-[140px]"
                      placeholder='[{"sojoriValue":"France","ruCode":"123","label":"France"}]'
                      value={jsonDraft}
                      disabled={submitting}
                      onChange={(e) => {
                        setJsonDraft(e.target.value);
                        setJsonError('');
                      }}
                    />
                    {jsonError ? <p className="text-[11px] text-red-600">{jsonError}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={applyJsonToRows}
                        className="h-8 px-3 rounded text-xs font-semibold bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50"
                      >
                        Appliquer JSON au tableau
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={syncJsonDraftFromRows}
                        className="h-8 px-3 rounded text-xs font-semibold border border-slate-300 text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Remplir JSON depuis le tableau
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ordre d&apos;affichage</label>
            <input
              type="number"
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs max-w-[120px]"
              value={f.sortOrder}
              onChange={(e) => set('sortOrder', Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Note (facultatif)</label>
            <textarea
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-xs min-h-[72px]"
              placeholder="Rappel pour votre équipe (ex. règle métier, cas particulier)"
              value={f.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ru-map-active"
              className="h-4 w-4 accent-orange-500"
              checked={!!f.active}
              onChange={(e) => set('active', e.target.checked)}
            />
            <label htmlFor="ru-map-active" className="text-slate-700">
              Actif
            </label>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-slate-200 flex flex-wrap justify-end gap-2 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-8 px-3 rounded text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={submitting || !f.ruFieldPath.trim()}
            onClick={handleSubmit}
            className="h-8 px-3 rounded text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {submitting ? '…' : mode === 'edit' ? 'Mettre à jour' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}
