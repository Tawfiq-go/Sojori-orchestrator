/**
 * Shell & sections — formulaire Worker (design Sojori / Atelier)
 */
import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  Switch,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import { ArrowLeft } from 'lucide-react';
import {
  btnPrimarySx,
  btnGhostSx,
  tokens as T,
} from '../../../components/dashboard/DashboardV2.components';
import { TEAM_T } from '../../../components/team/teamHubTokens';
import {
  buildOwnerPermissionGroups,
  buildOwnerPermissionRows,
  categoryGrantState,
  isWorkerPageGranted,
  setCategoryPageGrants,
  setWorkerPageGrant,
  setWorkerGrantAction,
  setWorkerGrantRowAll,
  setWorkerGroupGrantAction,
  setWorkerGroupGrantRowAll,
  summarizeGroupGrant,
  workerGrantHasAction,
  WORKER_PAGE_ACTIONS,
} from '../../../utils/ownerRoutePermissions';

export const WF = { ...TEAM_T, ...T };

export const WORKER_FORM_SECTIONS = [
  { id: 'basic-info', label: 'Identité', icon: '👤' },
  { id: 'listings-access', label: 'Annonces', icon: '🏠' },
  { id: 'access-permissions', label: 'Permissions', icon: '🔐' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
];

export function isWildcardGrants(grants) {
  return Array.isArray(grants) && grants.some((g) => g?.feature === '*' || (g?.actions || []).includes('*'));
}

export function applyWorkerAdminAccess(setFieldValue, w, enabled) {
  const wasAdmin = !!w.isOwnerAdmin || isWildcardGrants(w.featureGrants);
  if (enabled) {
    if (!wasAdmin) {
      setFieldValue('worker._previousFeatureGrants', w.featureGrants || []);
    }
    setFieldValue('worker.isOwnerAdmin', true);
    setFieldValue('worker.ownerAccess', true);
    setFieldValue('worker.groupIds', []);
    setFieldValue('worker._groupGrants', []);
    setFieldValue('worker.featureGrants', [{ feature: '*', actions: ['*'] }]);
    return;
  }
  setFieldValue('worker.isOwnerAdmin', false);
  setFieldValue('worker.ownerAccess', false);
  setFieldValue('worker.featureGrants', wasAdmin ? w._previousFeatureGrants || [] : w.featureGrants || []);
  setFieldValue('worker._previousFeatureGrants', []);
}

export function hasPartialNotificationConfig(config, events = [], channelKey = 'dashboard') {
  const keys = (events || []).map((e) => e.key).filter(Boolean);
  if (!keys.length) return false;
  let on = 0;
  for (const key of keys) {
    const row = (Array.isArray(config) ? config : []).find((c) => c.key === key);
    if (row?.channels?.[channelKey]) on += 1;
  }
  return on > 0 && on < keys.length;
}

export function buildAllNotificationsConfig(events = [], channelKey = 'dashboard') {
  return (events || [])
    .filter((ev) => ev?.key)
    .map((ev) => ({
      key: ev.key,
      channels: { [channelKey]: true },
    }));
}

export function isNotificationsAllMode(config, events = [], channelKey = 'dashboard') {
  const keys = (events || []).map((e) => e.key).filter(Boolean);
  if (!keys.length) return false;
  const cfg = Array.isArray(config) ? config : [];
  return keys.every((key) => {
    const row = cfg.find((c) => c.key === key);
    return !!row?.channels?.[channelKey];
  });
}

export function WorkerAdminSwitch({ label, hint, checked, onChange, disabled }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
        p: 1.75,
        mb: 2,
        borderRadius: '12px',
        border: `1px solid ${checked ? WF.primary : WF.border}`,
        bgcolor: checked ? WF.primaryTint : WF.bg2,
        transition: 'all 0.18s',
      }}
    >
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: WF.text }}>{label}</Typography>
        {hint ? (
          <Typography sx={{ fontSize: 11.5, color: WF.text3, mt: 0.35, maxWidth: 520 }}>{hint}</Typography>
        ) : null}
      </Box>
      <Switch
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        sx={{
          '& .MuiSwitch-switchBase.Mui-checked': { color: WF.primaryDeep },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: WF.primary },
        }}
      />
    </Box>
  );
}

export function workerTextFieldSx() {
  return {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      bgcolor: WF.bg1,
      fontSize: 13,
      '& fieldset': { borderColor: WF.border },
      '&:hover fieldset': { borderColor: WF.borderStrong },
      '&.Mui-focused fieldset': { borderColor: WF.primary, borderWidth: 1.5 },
    },
    '& .MuiInputLabel-root': { fontSize: 13, color: WF.text3 },
  };
}

export function WorkerFormPage({ children }) {
  return (
    <Box
      sx={{
        maxWidth: 1080,
        mx: 'auto',
        py: { xs: 2, md: 3 },
        px: { xs: 1.5, md: 2 },
        minHeight: '100%',
        background: `linear-gradient(180deg, ${WF.bg2} 0%, ${WF.bg0} 220px)`,
        borderRadius: { md: 3 },
      }}
    >
      {children}
    </Box>
  );
}

export function WorkerFormHeader({ title, subtitle, onBack, onCancel, onSave, saveLabel = 'Enregistrer', saveDisabled = false, extraActions = null }) {
  return (
    <Box
      sx={{
        mb: 3,
        p: 2.5,
        borderRadius: '16px',
        border: `1px solid ${WF.border}`,
        bgcolor: WF.bg1,
        boxShadow: '0 4px 24px rgba(26,20,8,0.06)',
      }}
    >
      <Button
        onClick={onBack}
        sx={{
          color: WF.text3,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: 13,
          mb: 1.5,
          px: 0,
          minWidth: 0,
          '&:hover': { bgcolor: 'transparent', color: WF.text },
        }}
        startIcon={<ArrowLeft size={16} />}
      >
        Retour à l&apos;équipe
      </Button>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 800, letterSpacing: '-0.03em', color: WF.text, lineHeight: 1.15 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography sx={{ fontSize: 13, color: WF.text3, mt: 0.75 }}>{subtitle}</Typography>
          ) : null}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {extraActions}
          <Button sx={btnGhostSx} onClick={onCancel}>
            Annuler
          </Button>
          <Button sx={btnPrimarySx} onClick={onSave} disabled={saveDisabled}>
            {saveLabel}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export function WorkerFormLayout({ main, nav }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1fr 240px' },
        gap: 3,
        alignItems: 'start',
      }}
    >
      <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>{main}</Box>
      <Box sx={{ position: { lg: 'sticky' }, top: 96 }}>{nav}</Box>
    </Box>
  );
}

export function WorkerFormSection({ id, title, hint, icon, action, children }) {
  return (
    <Box
      id={id}
      sx={{
        mb: 2.5,
        bgcolor: WF.bg1,
        border: `1px solid ${WF.border}`,
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 2px 14px rgba(26,20,8,0.05)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1.5,
          px: 2.5,
          py: 2,
          borderBottom: `1px solid ${WF.border}`,
          background: `linear-gradient(135deg, ${WF.primaryTint} 0%, ${WF.bg1} 72%)`,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1.25, minWidth: 0 }}>
          {icon ? (
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '11px',
                bgcolor: WF.bg1,
                border: `1px solid ${WF.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                flexShrink: 0,
                boxShadow: '0 1px 0 rgba(20,17,10,0.04)',
              }}
            >
              {icon}
            </Box>
          ) : null}
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 15, fontWeight: 800, color: WF.text, letterSpacing: '-0.02em' }}>
              {title}
            </Typography>
            {hint ? (
              <Typography sx={{ fontSize: 12, color: WF.text3, mt: 0.35, lineHeight: 1.45 }}>{hint}</Typography>
            ) : null}
          </Box>
        </Box>
        {action}
      </Box>
      <Box sx={{ p: { xs: 2, md: 2.5 } }}>{children}</Box>
    </Box>
  );
}

export function WorkerFormNav({ sections = WORKER_FORM_SECTIONS, activeId, onJump }) {
  return (
    <Box
      sx={{
        bgcolor: WF.bg1,
        border: `1px solid ${WF.border}`,
        borderRadius: '14px',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid ${WF.border}`, bgcolor: WF.bg2 }}>
        <Typography
          sx={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: WF.text3,
          }}
        >
          Sections
        </Typography>
      </Box>
      <Box component="nav" sx={{ py: 0.75, px: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {sections.map((s, idx) => {
          const active = activeId === s.id;
          return (
            <Box
              key={s.id}
              component="button"
              type="button"
              onClick={() => onJump(s.id)}
              sx={{
                all: 'unset',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 1.1,
                px: 1.25,
                py: 1.15,
                borderRadius: '10px',
                fontSize: 12.5,
                fontWeight: active ? 700 : 500,
                color: active ? WF.primaryDeep : WF.text2,
                bgcolor: active ? WF.primaryTint : 'transparent',
                border: `1px solid ${active ? WF.primary : 'transparent'}`,
                transition: 'all 0.15s',
                '&:hover': { bgcolor: active ? WF.primaryTint : WF.bg2 },
              }}
            >
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: '7px',
                  fontSize: 10,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: active ? WF.primary : WF.bg2,
                  color: active ? '#fff' : WF.text3,
                }}
              >
                {idx + 1}
              </Box>
              <span style={{ fontSize: 15 }}>{s.icon}</span>
              {s.label}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export function WorkerFormActions({ onCancel, onSave, saveLabel = 'Enregistrer', saveDisabled = false }) {
  return (
    <Box
      sx={{
        mt: 2,
        pt: 2,
        borderTop: `1px solid ${WF.border}`,
        display: { md: 'none' },
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 1,
        justifyContent: 'flex-end',
      }}
    >
      <Button fullWidth sx={btnGhostSx} onClick={onCancel} disabled={saveDisabled}>
        Annuler
      </Button>
      <Button fullWidth sx={btnPrimarySx} onClick={onSave} disabled={saveDisabled}>
        {saveLabel}
      </Button>
    </Box>
  );
}

export function WorkerNotificationsPanel({
  events = [],
  config = [],
  notificationsAll = false,
  onNotificationsAllChange,
  onToggle,
  isOn,
  t = (x) => x,
}) {
  const grouped = (events || []).reduce((acc, ev) => {
    const cat = ev.category || 'other';
    (acc[cat] = acc[cat] || []).push(ev);
    return acc;
  }, {});

  return (
    <Box>
      <WorkerAdminSwitch
        label="Mode admin — toutes les notifications"
        hint="Reçoit chaque alerte dashboard. Désactivez pour choisir les événements ci-dessous."
        checked={notificationsAll}
        onChange={onNotificationsAllChange}
      />
      {notificationsAll ? (
        <Chip
          size="small"
          label="Toutes les notifications activées"
          sx={{ bgcolor: WF.successTint, color: WF.primaryDeep, fontWeight: 700, mb: 1 }}
        />
      ) : (
        <Box
          sx={{
            border: `1px solid ${WF.border}`,
            borderRadius: '12px',
            overflow: 'hidden',
            maxHeight: 420,
            overflowY: 'auto',
            mt: 1.5,
          }}
        >
          {Object.entries(grouped).map(([category, evts]) => (
            <Box key={category}>
              <Box sx={{ px: 2, py: 1, bgcolor: WF.bg2, borderBottom: `1px solid ${WF.border}` }}>
                <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: WF.text3 }}>
                  {t(category.charAt(0).toUpperCase() + category.slice(1))}
                </Typography>
              </Box>
              {evts.map((ev, idx) => (
                <FormControlLabel
                  key={ev.id || ev.key}
                  control={
                    <Checkbox
                      size="small"
                      checked={isOn(ev.key, 'dashboard', ev.defaultChannels)}
                      onChange={(_, v) => onToggle(ev.key, 'dashboard', v, ev.defaultChannels)}
                      sx={{ color: WF.text3, '&.Mui-checked': { color: WF.primaryDeep } }}
                    />
                  }
                  label={
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: WF.text }}>{t(ev.name)}</Typography>
                  }
                  sx={{
                    m: 0,
                    px: 2,
                    py: 0.85,
                    width: '100%',
                    borderBottom: idx < evts.length - 1 ? `1px solid ${WF.border}` : 'none',
                    '&:hover': { bgcolor: WF.bg2 },
                  }}
                />
              ))}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export function listingCityKey(listing) {
  const raw = listing?.cityId ?? listing?.city?._id ?? listing?.city;
  return raw != null ? String(raw) : '';
}

export function workerHasListingAccess(listing, selectedCityIds, selectedListingIds, disabled) {
  if (disabled) return { granted: true, viaCity: false };
  const id = String(listing?._id || '');
  if (selectedListingIds.includes(id)) return { granted: true, viaCity: false };
  const cityKey = listingCityKey(listing);
  if (cityKey && selectedCityIds.includes(cityKey)) return { granted: true, viaCity: true };
  return { granted: false, viaCity: false };
}

const chipSx = {
  height: 22,
  fontSize: 10.5,
  fontWeight: 600,
  maxWidth: 200,
  '& .MuiChip-label': { px: 0.75 },
  '& .MuiChip-deleteIcon': { fontSize: 14, ml: 0.25 },
};

export function WorkerListingPicker({
  cities = [],
  citiesLoading = false,
  selectedCityIds = [],
  onToggleCity,
  onRemoveCity,
  listings,
  loading,
  selectedIds,
  listingLabels = {},
  disabled,
  search,
  onSearchChange,
  onToggle,
  onRemoveListing,
  page,
  total,
  limit,
  onPrev,
  onNext,
  t,
  listingsOnly = false,
  listingsHint,
}) {
  const [accessMode, setAccessMode] = React.useState(listingsOnly ? 'listings' : 'cities');
  const selectedListingIds = Array.isArray(selectedIds) ? selectedIds.map(String) : [];
  const cityIds = Array.isArray(selectedCityIds) ? selectedCityIds.map(String) : [];

  const cityNameById = React.useMemo(() => {
    const map = {};
    (cities || []).forEach((c) => {
      const id = String(c._id || c.id || '');
      if (id) map[id] = c.name || c.label || id;
    });
    return map;
  }, [cities]);

  const selectedChips = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5, minHeight: disabled ? 0 : 4 }}>
      {disabled ? (
        <Chip size="small" label={t('All listings (admin)')} sx={{ ...chipSx, bgcolor: WF.successTint }} />
      ) : (
        <>
          {cityIds.map((id) => (
            <Chip
              key={`city-${id}`}
              size="small"
              label={cityNameById[id] || id}
              onDelete={() => onRemoveCity?.(id)}
              sx={{ ...chipSx, bgcolor: WF.infoTint, color: WF.primaryDeep }}
            />
          ))}
          {selectedListingIds.map((id) => (
            <Chip
              key={`listing-${id}`}
              size="small"
              label={listingLabels[id] || id.slice(-6)}
              onDelete={() => onRemoveListing?.(id)}
              sx={{ ...chipSx, bgcolor: WF.primaryTint, color: WF.primaryDeep }}
            />
          ))}
        </>
      )}
    </Box>
  );

  const modeTabs = (
    <Box
      sx={{
        display: 'inline-flex',
        gap: 0.25,
        p: 0.35,
        mb: 1.5,
        bgcolor: WF.bg2,
        border: `1px solid ${WF.border}`,
        borderRadius: '10px',
      }}
    >
      {[
        { key: 'cities', label: 'Par ville' },
        { key: 'listings', label: 'Par annonce' },
      ].map((tab) => (
        <Button
          key={tab.key}
          size="small"
          disabled={disabled}
          onClick={() => setAccessMode(tab.key)}
          sx={{
            ...(accessMode === tab.key ? btnPrimarySx : btnGhostSx),
            minHeight: 30,
            px: 1.5,
            fontSize: 12,
            boxShadow: 'none',
          }}
        >
          {tab.label}
        </Button>
      ))}
    </Box>
  );

  return (
    <Box>
      {listingsHint ? (
        <Typography sx={{ fontSize: 12, color: WF.text3, mb: 1.25, lineHeight: 1.45 }}>{listingsHint}</Typography>
      ) : null}
      {selectedChips}
      {!disabled && !listingsOnly ? modeTabs : null}

      {disabled ? null : !listingsOnly && accessMode === 'cities' ? (
        <Box
          sx={{
            border: `1px solid ${WF.border}`,
            borderRadius: '12px',
            overflow: 'auto',
            maxHeight: 320,
            bgcolor: WF.bg1,
          }}
        >
          {citiesLoading ? (
            <Typography sx={{ p: 3, textAlign: 'center', color: WF.text3, fontSize: 13 }}>
              {t('Loading...')}
            </Typography>
          ) : cities.length === 0 ? (
            <Typography sx={{ p: 3, textAlign: 'center', color: WF.text3, fontSize: 13 }}>
              Aucune ville configurée
            </Typography>
          ) : (
            cities.map((city, idx) => {
              const id = String(city._id || city.id);
              const checked = cityIds.includes(id);
              return (
                <FormControlLabel
                  key={id}
                  control={
                    <Checkbox
                      size="small"
                      checked={checked}
                      onChange={() => onToggleCity?.(id)}
                      sx={{ color: WF.text3, '&.Mui-checked': { color: WF.primary } }}
                    />
                  }
                  label={
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: WF.text }}>
                        {city.name || '—'}
                      </Typography>
                      {city.countryName ? (
                        <Typography sx={{ fontSize: 11, color: WF.text3 }}>{city.countryName}</Typography>
                      ) : null}
                    </Box>
                  }
                  sx={{
                    m: 0,
                    px: 1.5,
                    py: 0.75,
                    width: '100%',
                    borderBottom: idx < cities.length - 1 ? `1px solid ${WF.border}` : 'none',
                    alignItems: 'flex-start',
                    '&:hover': { bgcolor: WF.bg2 },
                  }}
                />
              );
            })
          )}
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
            <Box
              component="input"
              placeholder={t('Type to search listings')}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              sx={{
                flex: 1,
                minWidth: 200,
                px: 1.5,
                py: 1,
                fontSize: 13,
                borderRadius: '10px',
                border: `1px solid ${WF.border}`,
                bgcolor: WF.bg1,
                outline: 'none',
                '&:focus': { borderColor: WF.primary },
              }}
            />
          </Box>

          <Box
            sx={{
              border: `1px solid ${WF.border}`,
              borderRadius: '12px',
              overflow: 'hidden',
              maxHeight: 360,
              overflowY: 'auto',
            }}
          >
            {loading ? (
              <Typography sx={{ p: 3, textAlign: 'center', color: WF.text3, fontSize: 13 }}>
                {t('Loading...')}
              </Typography>
            ) : listings.length === 0 ? (
              <Typography sx={{ p: 3, textAlign: 'center', color: WF.text3, fontSize: 13 }}>
                {t('No listings found')}
              </Typography>
            ) : (
              listings.map((l, idx) => {
                const access = workerHasListingAccess(l, cityIds, selectedListingIds, disabled);
                const cityLabel = cityNameById[listingCityKey(l)] || l?.city || '';
                return (
                  <FormControlLabel
                    key={l._id}
                    control={
                      <Checkbox
                        size="small"
                        checked={access.granted}
                        disabled={access.viaCity}
                        onChange={() => !access.viaCity && onToggle?.(l._id)}
                        sx={{ color: WF.text3, '&.Mui-checked': { color: WF.primary } }}
                      />
                    }
                    label={
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: WF.text }} noWrap>
                          {l.name}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: WF.text3 }} noWrap>
                          {[cityLabel, l?.propertyUnit || l?.listingType].filter(Boolean).join(' · ') || '—'}
                        </Typography>
                        {access.viaCity ? (
                          <Typography sx={{ fontSize: 10, color: WF.primaryDeep, fontWeight: 600 }}>
                            Inclus via ville
                          </Typography>
                        ) : null}
                      </Box>
                    }
                    sx={{
                      m: 0,
                      px: 1.5,
                      py: 0.75,
                      width: '100%',
                      borderBottom: idx < listings.length - 1 ? `1px solid ${WF.border}` : 'none',
                      alignItems: 'flex-start',
                      bgcolor: access.granted ? WF.primaryTint : WF.bg1,
                      opacity: access.viaCity ? 0.85 : 1,
                      '&:hover': { bgcolor: access.granted ? WF.primaryTint : WF.bg2 },
                    }}
                  />
                );
              })
            )}
          </Box>

          {total > limit ? (
            <Box
              sx={{
                mt: 1.5,
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Button size="small" sx={btnGhostSx} disabled={page === 0} onClick={onPrev}>
                {t('Prev')}
              </Button>
              <Typography sx={{ fontSize: 11, color: WF.text3 }}>
                {t('Page')} {page + 1}
              </Typography>
              <Button size="small" sx={btnGhostSx} disabled={(page + 1) * limit >= total} onClick={onNext}>
                {t('Next')}
              </Button>
            </Box>
          ) : null}
        </>
      )}
    </Box>
  );
}

export function WorkerPermissionsTable({ children, maxHeight = 520 }) {
  return (
    <Box
      sx={{
        border: `1px solid ${WF.border}`,
        borderRadius: '12px',
        overflow: 'auto',
        maxHeight,
      }}
    >
      <Table size="small" stickyHeader sx={{ minWidth: 560 }}>
        {children}
      </Table>
    </Box>
  );
}

export function WorkerPermTableHead({ actions, allLabel = 'Tout', firstColumnLabel = 'Page' }) {
  return (
    <TableHead>
      <TableRow>
        <TableCell
          sx={{
            fontWeight: 800,
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: WF.text3,
            bgcolor: WF.bg2,
            borderBottom: `1px solid ${WF.border}`,
            minWidth: 200,
          }}
        >
          {firstColumnLabel}
        </TableCell>
        {actions.map((a) => (
          <TableCell
            key={a.key}
            align="center"
            sx={{
              fontWeight: 800,
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: WF.text3,
              bgcolor: WF.bg2,
              borderBottom: `1px solid ${WF.border}`,
              whiteSpace: 'nowrap',
            }}
          >
            {a.label}
          </TableCell>
        ))}
        <TableCell
          align="center"
          sx={{
            fontWeight: 800,
            fontSize: 10,
            textTransform: 'uppercase',
            color: WF.text3,
            bgcolor: WF.bg2,
            borderBottom: `1px solid ${WF.border}`,
          }}
        >
          {allLabel}
        </TableCell>
      </TableRow>
    </TableHead>
  );
}

export function WorkerPermSectionRow({ label, colSpan }) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        sx={{
          fontWeight: 800,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: WF.primaryDeep,
          bgcolor: WF.bg2,
          py: 1,
          borderBottom: `1px solid ${WF.border}`,
        }}
      >
        {label}
      </TableCell>
    </TableRow>
  );
}

export function WorkerPermFeatureRow({ label, subtitle, indent, children, allCell }) {
  return (
    <TableRow
      hover
      sx={{
        '& td': { borderBottom: `1px solid ${WF.border}`, py: 0.75 },
        '&:last-child td': { borderBottom: 0 },
      }}
    >
      <TableCell
        sx={{
          fontWeight: 600,
          fontSize: 12.5,
          color: WF.text,
          pl: indent ? 3 : 1.75,
          maxWidth: 280,
        }}
      >
        <Typography sx={{ fontSize: 12.5, fontWeight: indent ? 600 : 800, color: WF.text, lineHeight: 1.25 }}>
          {label}
        </Typography>
        {subtitle ? (
          <Typography
            component="code"
            sx={{
              fontSize: 10.5,
              color: WF.text3,
              mt: 0.35,
              lineHeight: 1.35,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              display: 'block',
              wordBreak: 'break-all',
            }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </TableCell>
      {children}
      <TableCell align="center">{allCell}</TableCell>
    </TableRow>
  );
}

const PERM_ACTIONS = [
  { key: 'get', label: 'Lecture' },
  { key: 'update', label: 'Écriture' },
  { key: 'create', label: 'Création' },
  { key: 'delete', label: 'Suppression' },
];

function WorkerSidebarToggleRow({ label, hint, checked, disabled, indent, bold, onChange }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        py: 0.85,
        px: indent ? 1.5 : 0.5,
        opacity: disabled && checked ? 0.72 : 1,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: bold ? 13.5 : 12.5,
            fontWeight: bold ? 800 : 600,
            color: disabled && checked ? WF.text3 : WF.text,
          }}
        >
          {label}
        </Typography>
        {hint ? (
          <Typography sx={{ fontSize: 11, color: WF.text3, mt: 0.2, lineHeight: 1.35 }}>{hint}</Typography>
        ) : null}
      </Box>
      <Switch
        size="small"
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        sx={{
          flexShrink: 0,
          '& .MuiSwitch-switchBase.Mui-checked': { color: WF.primaryDeep },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: WF.primary },
        }}
      />
    </Box>
  );
}

/**
 * Toggles sidebar Owner — catégorie ON = tous les sous-menus (grisés),
 * catégorie OFF = toggle par page (ex. Liste + Planning sans Paiements).
 */
export function WorkerSidebarAccessToggles({
  grants = [],
  disabled = false,
  onChange,
  groups: groupsProp,
  pageGrantActions,
}) {
  const categories = React.useMemo(
    () => groupsProp || buildOwnerPermissionGroups(),
    [groupsProp],
  );
  const grantActions = pageGrantActions || WORKER_PAGE_ACTIONS;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {categories.map((cat) => {
        const keys = cat.features.map((f) => f.featureKey);
        const { all: categoryAll } = categoryGrantState(grants, keys);
        const multi = keys.length > 1;
        const childrenLocked = multi && categoryAll;

        return (
          <Box
            key={cat.group}
            sx={{
              border: `1px solid ${categoryAll && multi ? WF.primary : WF.border}`,
              borderRadius: '12px',
              bgcolor: categoryAll && multi ? WF.primaryTint : WF.bg1,
              px: 1.5,
              py: 0.75,
            }}
          >
            {multi ? (
              <WorkerSidebarToggleRow
                bold
                label={cat.group}
                hint={
                  categoryAll
                    ? 'Toutes les pages — désactivez pour choisir page par page'
                    : 'Activez pour tout inclure, ou cochez chaque page ci-dessous'
                }
                checked={categoryAll}
                disabled={disabled}
                onChange={(on) => {
                  let next = grants;
                  for (const fk of keys) {
                    next = setWorkerGrantRowAll(next, fk, on, grantActions);
                  }
                  onChange(next);
                }}
              />
            ) : null}
            <Box
              sx={{
                borderTop: multi ? `1px solid ${WF.border}` : 'none',
                mt: multi ? 0.5 : 0,
                pt: multi ? 0.5 : 0,
              }}
            >
              {cat.features.map((feat) => (
                <WorkerSidebarToggleRow
                  key={feat.featureKey}
                  indent={multi}
                  label={multi ? feat.label : `${cat.group} — ${feat.label}`}
                  checked={isWorkerPageGranted(grants, feat.featureKey)}
                  disabled={disabled || childrenLocked}
                  onChange={(on) => onChange(setWorkerGrantRowAll(grants, feat.featureKey, on, grantActions))}
                />
              ))}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/**
 * Accès dashboard worker — admin complet OU toggles sidebar (section + pages).
 */
export function WorkerDashboardAccessPanel({
  worker: w,
  setFieldValue,
  grants,
  onGrantsChange,
  disabled = false,
}) {
  const isAdmin = !!w?.isOwnerAdmin || isWildcardGrants(grants);

  return (
    <Box>
      <WorkerAdminSwitch
        label="Accès admin dashboard"
        hint="Accès complet à toutes les pages Owner. Recommandé pour un responsable exploitation."
        checked={isAdmin}
        disabled={disabled}
        onChange={(on) => applyWorkerAdminAccess(setFieldValue, w, on)}
      />
      {isAdmin ? (
        <Chip
          size="small"
          label="Admin-level access — toutes les pages"
          sx={{ bgcolor: WF.primaryTint, color: WF.primaryDeep, fontWeight: 700 }}
        />
      ) : (
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontSize: 12, color: WF.text3, mb: 1.25, lineHeight: 1.45 }}>
            Ex. <strong>Réservations</strong> activé → Liste, Planning et Paiements inclus (grisés).
            Désactivé → choisissez uniquement Liste et Planning si besoin.
          </Typography>
          <WorkerSidebarAccessToggles
            grants={grants}
            disabled={disabled}
            onChange={onGrantsChange}
          />
        </Box>
      )}
    </Box>
  );
}

/**
 * Matrice permissions dashboard worker.
 * - compact : une ligne par catégorie (Réservations, Task…)
 * - full : catégorie + pages (Liste, Planning…)
 */
export function WorkerPermissionsMatrix({
  mode = 'full',
  grants = [],
  disabled = false,
  onChange,
  actions = PERM_ACTIONS,
  allLabel = 'Tout',
}) {
  const groups = React.useMemo(() => buildOwnerPermissionGroups(), []);
  const featureRows = React.useMemo(() => buildOwnerPermissionRows(), []);

  const renderActionCheckboxes = (featureKey, allowedActions) =>
    actions.map((a) => {
      const supported = allowedActions.has(a.key);
      return (
        <TableCell key={a.key} align="center">
          {supported ? (
            <Checkbox
              size="small"
              checked={workerGrantHasAction(grants, featureKey, a.key, disabled)}
              disabled={disabled}
              onChange={(_, v) => onChange(setWorkerGrantAction(grants, featureKey, a.key, v))}
              sx={{ color: WF.primary, '&.Mui-checked': { color: WF.primaryDeep } }}
            />
          ) : null}
        </TableCell>
      );
    });

  const renderAllCheckbox = (featureKeys, allowedKeys) => {
    const keys = actions.map((a) => a.key).filter((k) => allowedKeys.has(k));
    const allChecked = keys.length > 0 && keys.every((k) =>
      featureKeys.every((fk) => workerGrantHasAction(grants, fk, k, disabled)),
    );
    const someChecked = keys.some((k) =>
      featureKeys.some((fk) => workerGrantHasAction(grants, fk, k, disabled)),
    );
    return (
      <Checkbox
        size="small"
        checked={allChecked}
        indeterminate={!allChecked && someChecked}
        disabled={disabled || keys.length === 0}
        onChange={(_, v) =>
          onChange(setWorkerGroupGrantRowAll(grants, featureKeys, v, keys))
        }
        sx={{ color: WF.primary, '&.Mui-checked': { color: WF.primaryDeep } }}
      />
    );
  };

  const renderFeatureAllCheckbox = (featureKey, allowedKeys) => {
    const keys = actions.map((a) => a.key).filter((k) => allowedKeys.has(k));
    const allChecked = keys.length > 0 && keys.every((k) => workerGrantHasAction(grants, featureKey, k, disabled));
    const someChecked = keys.some((k) => workerGrantHasAction(grants, featureKey, k, disabled));
    return (
      <Checkbox
        size="small"
        checked={allChecked}
        indeterminate={!allChecked && someChecked}
        disabled={disabled || keys.length === 0}
        onChange={(_, v) => onChange(setWorkerGrantRowAll(grants, featureKey, v, keys))}
        sx={{ color: WF.primary, '&.Mui-checked': { color: WF.primaryDeep } }}
      />
    );
  };

  return (
    <WorkerPermissionsTable maxHeight={mode === 'full' ? 640 : 520}>
      <WorkerPermTableHead
        actions={actions}
        allLabel={allLabel}
        firstColumnLabel={mode === 'full' ? 'Page' : 'Catégorie'}
      />
      <TableBody>
        {mode === 'compact'
          ? groups.map((g) => {
              const featureKeys = g.features.map((f) => f.featureKey);
              const allowed = new Set(actions.map((a) => a.key));
              const subtitle = g.features.map((f) => f.label).join(' · ');
              return (
                <WorkerPermFeatureRow
                  key={`grp-${g.group}`}
                  label={g.group}
                  subtitle={subtitle}
                  indent={false}
                  allCell={renderAllCheckbox(featureKeys, allowed)}
                >
                  {actions.map((a) => {
                    const { all, some } = summarizeGroupGrant(grants, featureKeys, a.key, disabled);
                    return (
                      <TableCell key={a.key} align="center">
                        <Checkbox
                          size="small"
                          checked={all}
                          indeterminate={!all && some}
                          disabled={disabled}
                          onChange={(_, v) =>
                            onChange(setWorkerGroupGrantAction(grants, featureKeys, a.key, v))
                          }
                          sx={{ color: WF.primary, '&.Mui-checked': { color: WF.primaryDeep } }}
                        />
                      </TableCell>
                    );
                  })}
                </WorkerPermFeatureRow>
              );
            })
          : featureRows.map((row, idx) => {
              if (row.kind === 'section') {
                return (
                  <WorkerPermSectionRow
                    key={`sec-${row.key}-${idx}`}
                    label={row.label}
                    colSpan={actions.length + 2}
                  />
                );
              }
              const allowed = new Set(row.allowedActions || actions.map((a) => a.key));
              return (
                <WorkerPermFeatureRow
                  key={`feat-${row.featureKey}-${idx}`}
                  label={row.label}
                  indent={row.indent}
                  allCell={renderFeatureAllCheckbox(row.featureKey, allowed)}
                >
                  {renderActionCheckboxes(row.featureKey, allowed)}
                </WorkerPermFeatureRow>
              );
            })}
      </TableBody>
    </WorkerPermissionsTable>
  );
}
