import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchRuOwnerProperties,
  importRuProperty,
  importRuPropertyBatch,
} from '../../services/channelsDashboardApi';
import useRuImportProgress, {
  getRuImportProgressPercent,
} from '../../features/channels/hooks/useRuImportProgress';
import axios from 'axios';
import { MICROSERVICE_BASE_URL } from '../../config/authConfig';
import { getToken } from '../../utils/authUtils';

const USER_API = MICROSERVICE_BASE_URL.SRV_USER;

export default function RuImportWizard() {
  const [step, setStep] = useState(1);

  const [owners, setOwners] = useState([]);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);

  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [citiesLoading, setCitiesLoading] = useState(false);

  const [properties, setProperties] = useState([]);
  /** Si false, les badges « Already imported » ne sont pas fiables (lookup listing KO). */
  const [ruMappingLookup, setRuMappingLookup] = useState(null);
  const [propsLoading, setPropsLoading] = useState(false);
  const [propsError, setPropsError] = useState('');
  const [selected, setSelected] = useState(new Set());

  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [importError, setImportError] = useState('');
  const {
    progressData,
    progressError,
    runTrackedImport,
  } = useRuImportProgress();

  const fetchOwners = useCallback(async (q = '') => {
    setOwnersLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams({ roles: 'Owner', limit: '50', page: '0', paged: 'true' });
      if (q.trim()) params.set('search_text', q.trim());
      const res = await axios.get(`${USER_API}/user/get-account?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      const list = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
      setOwners(Array.isArray(list) ? list : []);
    } catch {
      setOwners([]);
    } finally {
      setOwnersLoading(false);
    }
  }, []);

  useEffect(() => { fetchOwners(''); }, [fetchOwners]);

  useEffect(() => {
    const t = setTimeout(() => fetchOwners(ownerSearch), 300);
    return () => clearTimeout(t);
  }, [ownerSearch, fetchOwners]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCitiesLoading(true);
      try {
        const token = getToken();
        const res = await axios.get(`${MICROSERVICE_BASE_URL.CITY}?limit=100&page=1`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        if (!cancelled) {
          const list = res.data?.data || res.data || [];
          setCities(Array.isArray(list) ? list : []);
        }
      } catch { /* ignore */ }
      if (!cancelled) setCitiesLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSelectOwner = (owner) => {
    setSelectedOwner(owner);
    setOwnerSearch('');
    setOwners([]);
    setProperties([]);
    setRuMappingLookup(null);
    setSelected(new Set());
    setImportResults(null);
    setImportError('');
    setStep(2);
  };

  const handleFetchProperties = async () => {
    if (!selectedOwner) return;
    setPropsLoading(true);
    setPropsError('');
    setProperties([]);
    setRuMappingLookup(null);
    setSelected(new Set());
    try {
      const res = await fetchRuOwnerProperties(selectedOwner._id);
      const data = res.data;
      if (!data.success) {
        setPropsError(data.error || 'Failed to fetch properties');
        return;
      }
      setProperties(data.properties || []);
      setRuMappingLookup(data.ruMappingLookup ?? null);
    } catch (e) {
      setPropsError(e?.response?.data?.error || e?.message || 'Network error');
    } finally {
      setPropsLoading(false);
    }
  };

  const toggleSelect = (rpId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rpId)) next.delete(rpId);
      else next.add(rpId);
      return next;
    });
  };

  const selectAll = () => {
    const notImported = properties.filter((p) => !p.alreadyImported).map((p) => p.ruPropertyId);
    setSelected(new Set(notImported));
  };

  const handleImport = async () => {
    if (!selectedOwner || !selectedCity || selected.size === 0) return;
    setImporting(true);
    setImportError('');
    setImportResults(null);
    try {
      const ids = [...selected];
      let data;
      if (ids.length === 1) {
        const { response } = await runTrackedImport({
          prefix: 'dashboard-import',
          runImportRequest: (correlationId) => importRuProperty({
            ownerId: selectedOwner._id,
            ruPropertyId: ids[0],
            cityId: selectedCity,
            correlationId,
          }),
        });
        const res = response;
        data = { total: 1, succeeded: res.data.success ? 1 : 0, failed: res.data.success ? 0 : 1, results: [{ ruPropertyId: ids[0], ...res.data }] };
      } else {
        const { response } = await runTrackedImport({
          prefix: 'dashboard-batch',
          runImportRequest: (correlationId) => importRuPropertyBatch({
            ownerId: selectedOwner._id,
            cityId: selectedCity,
            ruPropertyIds: ids,
            correlationId,
          }),
        });
        data = response.data;
      }
      setImportResults(data);
      setStep(4);
      if (data.succeeded > 0) handleFetchProperties();
    } catch (e) {
      setImportError(e?.response?.data?.error || e?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const ownerLabel = selectedOwner
    ? `${selectedOwner.firstName || ''} ${selectedOwner.lastName || ''} (${selectedOwner.email || ''})`.trim()
    : '';
  const progressSteps = Array.isArray(progressData?.steps) ? progressData.steps : [];
  const currentProgressStep = progressSteps.find((item) => item.status === 'running')
    || progressSteps.find((item) => item.status === 'error')
    || null;
  const progressPercent = getRuImportProgressPercent(progressData);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Import RU Properties to Sojori</h2>
        <p className="text-xs text-slate-500 mb-4">
          Pull properties from Rental United and create Listings + Calendar in Sojori
        </p>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { n: 1, label: 'Owner' },
            { n: 2, label: 'Properties' },
            { n: 3, label: 'Import' },
            { n: 4, label: 'Results' },
          ].map((s) => (
            <div key={s.n} className="flex items-center gap-1.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step >= s.n ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>{s.n}</div>
              <span className={`text-xs font-medium ${step >= s.n ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
              {s.n < 4 && <div className={`w-8 h-0.5 ${step > s.n ? 'bg-orange-500' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Select Owner */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">1. Select Owner</h3>
        {selectedOwner ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-orange-50 border border-orange-200 rounded px-3 py-2 text-sm text-orange-800 font-medium">
              {ownerLabel}
              {selectedOwner.ruOwnerId && <span className="text-xs text-orange-500 ml-2">RU #{selectedOwner.ruOwnerId}</span>}
            </div>
            <button type="button" onClick={() => { setSelectedOwner(null); setStep(1); setProperties([]); setSelected(new Set()); setImportResults(null); }}
              className="text-xs text-slate-500 hover:text-red-500 underline">Change</button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              placeholder="Search owner by name or email..."
              value={ownerSearch}
              onChange={(e) => setOwnerSearch(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
            />
            {ownersLoading && <div className="absolute right-3 top-2.5 text-xs text-slate-400">Loading...</div>}
            {owners.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto">
                {owners.map((o) => (
                  <button key={o._id} type="button" onClick={() => handleSelectOwner(o)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 border-b border-slate-100 last:border-b-0">
                    <span className="font-medium">{o.firstName} {o.lastName}</span>
                    <span className="text-slate-500 ml-2">{o.email}</span>
                    {o.ruOwnerId && <span className="text-xs text-orange-500 ml-2">RU #{o.ruOwnerId}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Fetch & Select Properties */}
      {step >= 2 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800">2. RU Properties</h3>
            <button type="button" onClick={handleFetchProperties} disabled={propsLoading}
              className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50">
              {propsLoading ? 'Loading...' : properties.length > 0 ? 'Refresh' : 'Fetch from RU'}
            </button>
          </div>

          {propsError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">{propsError}</div>}

          {properties.length > 0 && ruMappingLookup && !ruMappingLookup.ok && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-3">
              <strong>Attention :</strong> impossible de vérifier les listings Sojori déjà liés (srv-listing). Toutes les lignes
              peuvent apparaître « Ready » par erreur. Corrige la connectivité / secret interne, puis rafraîchis.
              {ruMappingLookup.httpStatus != null && ` (HTTP ${ruMappingLookup.httpStatus})`}
              {ruMappingLookup.error && ` — ${ruMappingLookup.error}`}
            </div>
          )}

          {properties.length > 0 && (
            <>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs text-slate-500">{properties.length} properties found</span>
                <button type="button" onClick={selectAll} className="text-xs text-orange-600 hover:underline">Select all importable</button>
              </div>
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="w-8 px-2 py-2" />
                      <th className="px-3 py-2 text-slate-600 font-semibold">RU ID</th>
                      <th className="px-3 py-2 text-slate-600 font-semibold">Name</th>
                      <th className="px-3 py-2 text-slate-600 font-semibold">Status / Sojori</th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties.map((p) => (
                      <tr key={p.ruPropertyId} className={`border-t border-slate-100 ${p.alreadyImported ? 'opacity-50 bg-slate-50' : 'hover:bg-orange-50'}`}>
                        <td className="px-2 py-2 text-center">
                          {!p.alreadyImported && (
                            <input type="checkbox" checked={selected.has(p.ruPropertyId)}
                              onChange={() => toggleSelect(p.ruPropertyId)} className="accent-orange-500" />
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-700">{p.ruPropertyId}</td>
                        <td className="px-3 py-2 font-medium text-slate-900">{p.name}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-0.5">
                            {p.alreadyImported
                              ? <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 rounded px-2 py-0.5 text-[10px] font-semibold">Already imported</span>
                              : <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 rounded px-2 py-0.5 text-[10px] font-semibold">Ready to import</span>}
                            {p.sojoriListingId && (
                              <span className="text-[10px] text-slate-500 font-mono" title="ObjectId listing Sojori">id: {p.sojoriListingId}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {selected.size > 0 && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium">{selected.size} selected for import</span>
                  <button type="button" onClick={() => setStep(3)}
                    className="px-4 py-2 text-xs font-semibold bg-orange-500 text-white rounded hover:bg-orange-600">
                    Next: Configure &amp; Import
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Step 3: Configure City & Launch Import */}
      {step >= 3 && !importResults && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">3. Configure &amp; Import</h3>

          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-700 mb-1">Sojori City</label>
            <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              disabled={citiesLoading}>
              <option value="">-- Select city --</option>
              {cities.map((c) => (
                <option key={c._id} value={c._id}>{c.name?.en || c.name?.FR || c.name || c._id}</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-4">
            <div className="text-xs text-slate-600 space-y-1">
              <div><strong>Owner:</strong> {ownerLabel}</div>
              <div><strong>Properties to import:</strong> {selected.size}</div>
              <div><strong>IDs:</strong> {[...selected].join(', ')}</div>
            </div>
          </div>

          {importError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">{importError}</div>}
          {importing && (
            <div className="mb-4 rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {currentProgressStep?.label || progressData?.lastMessage || 'Initialisation de l’import RU'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {currentProgressStep?.detail || currentProgressStep?.subtitle || 'Préparation des appels backend.'}
                  </div>
                </div>
                <div className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-orange-700 shadow-sm">
                  {progressPercent}%
                </div>
              </div>

              <div className="mb-3 h-2 overflow-hidden rounded-full bg-orange-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 animate-pulse"
                  style={{ width: `${Math.max(progressPercent, 6)}%` }}
                />
              </div>

              <div className="text-xs text-slate-600 mb-3">
                {progressData?.summary?.totalProperties > 1
                  ? `Bien ${progressData?.currentProperty?.index || 1}/${progressData?.summary?.totalProperties} — ${progressData?.currentProperty?.listingName || `RU #${progressData?.currentProperty?.ruPropertyId || ''}`}`
                  : `Import en cours pour RU #${progressData?.currentProperty?.ruPropertyId || [...selected][0] || ''}`}
              </div>

              {progressError && (
                <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {progressError}
                </div>
              )}

              <div className="space-y-2">
                {progressSteps.map((stepItem, index) => {
                  const isCurrent = stepItem.status === 'running';
                  const isDone = stepItem.status === 'done' || stepItem.status === 'skipped';
                  const isError = stepItem.status === 'error';

                  return (
                    <div key={stepItem.key} className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                          isError ? 'bg-red-600' : isDone ? 'bg-green-600' : isCurrent ? 'bg-orange-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      >
                        {isDone ? '✓' : isError ? '!' : index + 1}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-semibold ${isError ? 'text-red-700' : isCurrent ? 'text-orange-700' : isDone ? 'text-green-700' : 'text-slate-500'}`}>
                          {stepItem.label}
                        </div>
                        {stepItem.detail && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {stepItem.detail}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button type="button" onClick={handleImport} disabled={importing || !selectedCity}
            className="w-full px-4 py-2.5 text-sm font-bold bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 transition-colors">
            {importing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Importing {selected.size} properties...
              </span>
            ) : `Import ${selected.size} propert${selected.size === 1 ? 'y' : 'ies'}`}
          </button>
        </div>
      )}

      {/* Step 4: Results */}
      {importResults && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">4. Import Results</h3>

          <div className={`rounded p-3 mb-4 ${importResults.succeeded === importResults.total ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className="text-sm font-semibold mb-1">
              {importResults.succeeded === importResults.total
                ? `All ${importResults.total} properties imported successfully`
                : `${importResults.succeeded}/${importResults.total} imported (${importResults.failed} failed)`
              }
            </div>
          </div>

          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-3 py-2 text-slate-600 font-semibold">RU ID</th>
                  <th className="px-3 py-2 text-slate-600 font-semibold">Status</th>
                  <th className="px-3 py-2 text-slate-600 font-semibold">Listing ID</th>
                  <th className="px-3 py-2 text-slate-600 font-semibold">Calendar</th>
                  <th className="px-3 py-2 text-slate-600 font-semibold">Errors</th>
                </tr>
              </thead>
              <tbody>
                {(importResults.results || []).map((r) => (
                  <tr key={r.ruPropertyId} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono">{r.ruPropertyId}</td>
                    <td className="px-3 py-2">
                      {r.success
                        ? <span className="text-green-700 bg-green-50 rounded px-2 py-0.5 text-[10px] font-semibold">OK</span>
                        : <span className="text-red-700 bg-red-50 rounded px-2 py-0.5 text-[10px] font-semibold">FAIL</span>
                      }
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-600">{r.listingId || '-'}</td>
                    <td className="px-3 py-2">{r.calendarEntriesUpdated != null ? `${r.calendarEntriesUpdated} entries` : '-'}</td>
                    <td className="px-3 py-2 text-red-600">{r.errors?.length ? r.errors.join('; ') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button type="button" onClick={() => { setStep(2); setSelected(new Set()); setImportResults(null); setImportError(''); }}
              className="px-4 py-2 text-xs font-medium bg-slate-100 text-slate-700 rounded hover:bg-slate-200">
              Import more
            </button>
            <button type="button" onClick={() => { setSelectedOwner(null); setStep(1); setProperties([]); setSelected(new Set()); setImportResults(null); }}
              className="px-4 py-2 text-xs font-medium bg-slate-100 text-slate-700 rounded hover:bg-slate-200">
              New owner
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
