import { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Autocomplete, CircularProgress,
  Box, Typography, Alert, Chip, Checkbox, FormControl,
  InputLabel, Select, MenuItem, LinearProgress, Stack, IconButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { toast } from 'react-toastify';
import apiClient from '../../services/apiClient';
import { getToken } from '../../utils/authUtils';
import { MICROSERVICE_BASE_URL } from '../../config/backendServer.config';
import {
  fetchRuOwnerProperties,
  importRuProperty,
  importRuPropertyBatch,
} from '../../services/channelsDashboardApi';
import { useRuImportProgress, getRuImportProgressPercent } from '../../hooks/useRuImportProgress';
import { useAuth } from '../../hooks/useAuth';

const USER_API = MICROSERVICE_BASE_URL.SRV_USER;

interface RuImportDialogProps {
  open: boolean;
  onClose: () => void;
  cities?: Array<{ _id: string; name?: string | { en?: string; FR?: string } }>;
  onImported?: () => void;
}

function resolveCityLabel(c: { _id: string; name?: string | { en?: string; FR?: string } }): string {
  const n = c.name;
  if (typeof n === 'string') return n;
  if (n && typeof n === 'object') return n.en || n.FR || c._id;
  return c._id;
}

function isAdminRole(role?: string): boolean {
  const r = (role || '').toLowerCase();
  return r === 'superadmin' || r === 'admin';
}

export function RuImportDialog({ open, onClose, cities = [], onImported }: RuImportDialogProps) {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);

  const [step, setStep] = useState(1);

  const [ownerOptions, setOwnerOptions] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [loadingOwners, setLoadingOwners] = useState(false);

  const [properties, setProperties] = useState([]);
  /** Si lookup KO, ne pas se fier au décompte « importable ». */
  const [ruMappingLookup, setRuMappingLookup] = useState(null);
  const [propsLoading, setPropsLoading] = useState(false);
  const [propsError, setPropsError] = useState('');
  const [selected, setSelected] = useState(new Set());

  const [selectedCity, setSelectedCity] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const {
    progressData,
    progressError,
    resetProgress,
    runTrackedImport,
  } = useRuImportProgress();

  const loadOwnerProperties = useCallback(async (owner) => {
    if (!owner) return;
    setStep(2);
    setPropsLoading(true);
    setPropsError('');
    setProperties([]);
    setRuMappingLookup(null);
    setSelected(new Set());
    try {
      const res = await fetchRuOwnerProperties(owner._id);
      if (!res.data?.success) {
        setPropsError(res.data?.error || 'Failed to fetch RU properties');
        return;
      }
      setProperties(res.data.properties || []);
      setRuMappingLookup(res.data.ruMappingLookup ?? null);
    } catch (e) {
      setPropsError(e?.response?.data?.error || e?.message || 'Network error');
    } finally {
      setPropsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedOwner(null);
      setOwnerSearch('');
      setOwnerOptions([]);
      setProperties([]);
      setRuMappingLookup(null);
      setSelected(new Set());
      setSelectedCity('');
      setImportResults(null);
      setPropsError('');
      resetProgress();
      return;
    }
    if (!isAdmin && user?.id) {
      const ownerAsSelection = { _id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, ruOwnerId: (user as { ruOwnerId?: string }).ruOwnerId };
      setSelectedOwner(ownerAsSelection);
      loadOwnerProperties(ownerAsSelection);
    }
  }, [open, isAdmin, user, loadOwnerProperties, resetProgress]);

  const fetchOwners = useCallback(async (q = '') => {
    setLoadingOwners(true);
    try {
      const token = getToken();
      const params = new URLSearchParams({ roles: 'Owner', limit: '50', page: '0', paged: 'true' });
      if (q.trim()) params.set('search_text', q.trim());
      const res = await apiClient.get(`${USER_API}/user/get-account?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 10000,
      });
      const data = res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
      setOwnerOptions(data);
    } catch {
      setOwnerOptions([]);
    } finally {
      setLoadingOwners(false);
    }
  }, []);

  useEffect(() => {
    if (open && isAdmin) fetchOwners('');
  }, [open, isAdmin, fetchOwners]);

  useEffect(() => {
    if (!isAdmin) return;
    const t = setTimeout(() => fetchOwners(ownerSearch), 300);
    return () => clearTimeout(t);
  }, [ownerSearch, isAdmin, fetchOwners]);

  const handleOwnerSelected = async (owner) => {
    setSelectedOwner(owner);
    if (!owner) return;
    loadOwnerProperties(owner);
  };

  const toggleProp = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAllImportable = () => {
    setSelected(new Set(properties.filter((p) => !p.alreadyImported).map((p) => p.ruPropertyId)));
  };

  const handleImport = async () => {
    if (!selectedOwner || !selectedCity || selected.size === 0) return;
    setImporting(true);
    try {
      const ids = [...selected];
      let data;
      if (ids.length === 1) {
        const { response } = await runTrackedImport({
          prefix: 'orchestrator-import',
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
          prefix: 'orchestrator-batch',
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
      setStep(3);
      if (data.succeeded > 0) toast.success(`${data.succeeded} listing(s) imported successfully`);
      if (data.failed > 0) toast.error(`${data.failed} listing(s) failed`);
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const notImported = properties.filter((p) => !p.alreadyImported);
  const progressSteps = Array.isArray(progressData?.steps) ? progressData.steps : [];
  const currentProgressStep = progressSteps.find((item) => item.status === 'running')
    || progressSteps.find((item) => item.status === 'error')
    || null;
  const progressPercent = getRuImportProgressPercent(progressData);

  return (
    <Dialog open={open} onClose={importing ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Import from Rental United</Typography>
          <Typography variant="caption" color="text.secondary">
            Pull properties from RU and create Listings + Calendar in Sojori
          </Typography>
        </Box>
        <IconButton onClick={onClose} disabled={importing} size="small"><Close /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: 300 }}>
        {/* Step 1: Select Owner (admin only) */}
        {step === 1 && isAdmin && (
          <Box>
            <Typography variant="subtitle2" mb={1.5}>Select an owner</Typography>
            <Autocomplete
              options={ownerOptions}
              value={selectedOwner}
              onChange={(_e, val) => handleOwnerSelected(val)}
              onInputChange={(_e, val) => setOwnerSearch(val)}
              loading={loadingOwners}
              getOptionLabel={(o) => `${o.firstName || ''} ${o.lastName || ''} — ${o.email || ''}`.trim()}
              isOptionEqualToValue={(a, b) => a._id === b._id}
              renderOption={(props, o) => (
                <li {...props} key={o._id}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>{o.firstName} {o.lastName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {o.email} {o.ruOwnerId ? `· RU#${o.ruOwnerId}` : ''}
                    </Typography>
                  </Box>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Search owner by name or email..."
                  size="small"
                />
              )}
              noOptionsText={loadingOwners ? 'Loading...' : 'No owners found'}
            />
          </Box>
        )}
        {/* Step 1: Owner loading (non-admin auto-detect) */}
        {step === 1 && !isAdmin && (
          <Box textAlign="center" py={4}>
            <CircularProgress />
            <Typography variant="caption" display="block" mt={1}>Loading your RU properties...</Typography>
          </Box>
        )}

        {/* Step 2: Properties + City + Confirm */}
        {step === 2 && (
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Box>
                <Typography variant="subtitle2">
                  {selectedOwner?.firstName} {selectedOwner?.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedOwner?.email} {selectedOwner?.ruOwnerId ? `· RU#${selectedOwner.ruOwnerId}` : ''}
                </Typography>
              </Box>
              {isAdmin && (
                <Button size="small" onClick={() => { setStep(1); setSelectedOwner(null); setProperties([]); setRuMappingLookup(null); setSelected(new Set()); }}>
                  Change owner
                </Button>
              )}
            </Stack>

            {propsLoading && <Box textAlign="center" py={4}><CircularProgress /><Typography variant="caption" display="block" mt={1}>Fetching properties from RU...</Typography></Box>}
            {propsError && <Alert severity="error" sx={{ mb: 2 }}>{propsError}</Alert>}
            {!propsLoading && properties.length > 0 && ruMappingLookup && !ruMappingLookup.ok && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Impossible de joindre srv-listing pour savoir quels RU sont déjà mappés — les badges peuvent être faux.
                {ruMappingLookup.httpStatus != null && ` (HTTP ${ruMappingLookup.httpStatus})`}
                {ruMappingLookup.error ? ` ${ruMappingLookup.error}` : ''}
              </Alert>
            )}

            {!propsLoading && properties.length > 0 && (
              <>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="caption" color="text.secondary">
                    {properties.length} properties — {notImported.length} importable
                  </Typography>
                  {notImported.length > 0 && (
                    <Button size="small" onClick={selectAllImportable} sx={{ fontSize: '0.7rem' }}>
                      Select all ({notImported.length})
                    </Button>
                  )}
                </Stack>

                <Box sx={{ maxHeight: 250, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 1, mb: 2 }}>
                  {properties.map((p) => (
                    <Box key={p.ruPropertyId} sx={{
                      display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1,
                      borderBottom: '1px solid #f1f5f9',
                      opacity: p.alreadyImported ? 0.5 : 1,
                      bgcolor: selected.has(p.ruPropertyId) ? '#fff7ed' : 'transparent',
                    }}>
                      {!p.alreadyImported ? (
                        <Checkbox size="small" checked={selected.has(p.ruPropertyId)} onChange={() => toggleProp(p.ruPropertyId)} sx={{ '&.Mui-checked': { color: '#FF6B35' } }} />
                      ) : <Box sx={{ width: 38 }} />}
                      <Box flex={1} minWidth={0}>
                        <Typography variant="body2" fontWeight={500} noWrap>{p.name}</Typography>
                        <Typography variant="caption" color="text.secondary">RU #{p.ruPropertyId}</Typography>
                        {p.sojoriListingId && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>
                            Sojori listing: {p.sojoriListingId}
                          </Typography>
                        )}
                      </Box>
                      {p.alreadyImported
                        ? <Chip label="Already imported" size="small" color="success" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                        : <Chip label="Ready" size="small" color="info" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                      }
                    </Box>
                  ))}
                </Box>

                {selected.size > 0 && (
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel>Sojori City</InputLabel>
                    <Select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} label="Sojori City">
                      {cities.map((c) => (
                        <MenuItem key={c._id} value={c._id}>{resolveCityLabel(c)}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {importing && (
                  <Box
                    mb={2}
                    sx={{
                      border: '1px solid #fed7aa',
                      borderRadius: 2,
                      bgcolor: '#fff7ed',
                      p: 2,
                      '@keyframes ruImportPulse': {
                        '0%': { transform: 'scale(1)', opacity: 0.85 },
                        '50%': { transform: 'scale(1.18)', opacity: 1 },
                        '100%': { transform: 'scale(1)', opacity: 0.85 },
                      },
                      '@keyframes ruImportShimmer': {
                        '0%': { backgroundPosition: '-200% 0' },
                        '100%': { backgroundPosition: '200% 0' },
                      },
                    }}
                  >
                    <LinearProgress
                      variant="determinate"
                      value={progressPercent}
                      sx={{
                        mb: 1.5,
                        height: 8,
                        borderRadius: 999,
                        bgcolor: 'rgba(255,255,255,0.75)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: '#FF6B35',
                          backgroundImage: 'linear-gradient(90deg, rgba(255,107,53,1) 0%, rgba(251,191,36,0.95) 50%, rgba(255,107,53,1) 100%)',
                          backgroundSize: '200% 100%',
                          animation: 'ruImportShimmer 1.8s linear infinite',
                        },
                      }}
                    />
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#9a3412' }}>
                        {currentProgressStep?.label || progressData?.lastMessage || 'Initialisation de l’import RU'}
                      </Typography>
                      <Chip
                        label={`${progressPercent}%`}
                        size="small"
                        sx={{ bgcolor: '#fff', color: '#9a3412', fontWeight: 700 }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                      {currentProgressStep?.detail || currentProgressStep?.subtitle || 'Préparation des appels backend et du mapping.'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      {progressData?.summary?.totalProperties > 1
                        ? `Bien ${progressData?.currentProperty?.index || 1}/${progressData?.summary?.totalProperties} en cours — ${progressData?.currentProperty?.listingName || `RU #${progressData?.currentProperty?.ruPropertyId || ''}`}`
                        : `Importing ${selected.size} propert${selected.size === 1 ? 'y' : 'ies'}... This may take a few minutes.`}
                    </Typography>
                    {progressError && (
                      <Alert severity="warning" sx={{ mb: 1.5 }}>
                        {progressError}
                      </Alert>
                    )}

                    <Stack spacing={0.75}>
                      {progressSteps.map((stepItem, index) => {
                        const isCurrent = stepItem.status === 'running';
                        const isDone = stepItem.status === 'done' || stepItem.status === 'skipped';
                        const isError = stepItem.status === 'error';

                        return (
                          <Box key={stepItem.key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: isError ? '#dc2626' : isDone ? '#22c55e' : isCurrent ? '#FF6B35' : '#e5e7eb',
                                color: '#fff',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                animation: isCurrent ? 'ruImportPulse 1.2s ease-in-out infinite' : 'none',
                                flexShrink: 0,
                              }}
                            >
                              {isDone ? '✓' : isError ? '!' : index + 1}
                            </Box>
                            <Box minWidth={0}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: isError ? '#b91c1c' : isCurrent ? '#9a3412' : isDone ? '#166534' : '#6b7280',
                                  fontWeight: isCurrent ? 700 : 500,
                                  display: 'block',
                                }}
                              >
                                {stepItem.label}
                              </Typography>
                              {stepItem.detail && (
                                <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
                                  {stepItem.detail}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                )}
              </>
            )}

            {!propsLoading && properties.length === 0 && !propsError && (
              <Alert severity="info">No properties found for this owner in Rental United.</Alert>
            )}
          </Box>
        )}

        {/* Step 3: Results */}
        {step === 3 && importResults && (
          <Box>
            <Alert severity={importResults.succeeded === importResults.total ? 'success' : 'warning'} sx={{ mb: 2 }}>
              {importResults.succeeded === importResults.total
                ? `All ${importResults.total} properties imported successfully!`
                : `${importResults.succeeded}/${importResults.total} imported (${importResults.failed} failed)`
              }
            </Alert>

            {(importResults.results || []).map((r) => (
              <Box key={r.ruPropertyId} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderBottom: '1px solid #f1f5f9' }}>
                <Chip label={r.success ? 'OK' : 'FAIL'} size="small" color={r.success ? 'success' : 'error'} sx={{ fontSize: '0.65rem', minWidth: 50 }} />
                <Box flex={1}>
                  <Typography variant="body2" fontWeight={500}>RU #{r.ruPropertyId}</Typography>
                  {r.listingId && <Typography variant="caption" color="text.secondary">Listing: {r.listingId}</Typography>}
                  {r.calendarEntriesUpdated != null && <Typography variant="caption" color="text.secondary" ml={1}>{r.calendarEntriesUpdated} calendar entries</Typography>}
                </Box>
                {r.errors?.length > 0 && <Typography variant="caption" color="error">{r.errors.join('; ')}</Typography>}
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        {step === 3 ? (
          <>
            <Button onClick={() => { resetProgress(); setStep(2); setSelected(new Set()); setImportResults(null); }}>Import more</Button>
            <Button variant="contained" onClick={() => { onImported?.(); }} sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#E55A2B' } }}>
              Done
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} disabled={importing}>Cancel</Button>
            {step === 2 && selected.size > 0 && (
              <Button variant="contained" onClick={handleImport} disabled={importing || !selectedCity}
                sx={{ bgcolor: '#FF6B35', '&:hover': { bgcolor: '#E55A2B' } }}>
                {importing ? 'Importing...' : `Import ${selected.size} propert${selected.size === 1 ? 'y' : 'ies'}`}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
