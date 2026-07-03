// Post-import RU : liste résas silencieuses + config listing (lecture seule) + lancer orchestration.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Typography,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { toast } from 'react-toastify';
import {
  finishListingImportOnboarding,
  launchImportOrchestration,
  listPendingImportOrchestrationReservations,
  loadListingOrchestrationActivation,
  logImportOnboarding,
  logImportOnboardingDiff,
  summarizeToggleMap,
} from '../../../../services/importOnboardingService';
import {
  countEffectiveActiveServices,
  displayActivationsFromServices,
} from '../../../../features/orchestrationListingV3/listingCapabilityActivation';
import { loadListingScheduledMessagesContext } from '../../../../features/orchestrationListingV3/listingScheduledMessagesApi';
import { sortScheduledRulesByJourney } from '../../../../features/taskHub/staff-design/orchestrationJourneyOrder';
import { CompactOrchestrationConfigGrid } from './CompactOrchestrationConfigGrid';
import { CompactImportMessagesGrid } from './CompactImportMessagesGrid';
import { T } from './_shared';

const ROW_GRID = {
  display: 'grid',
  gridTemplateColumns:
    '28px minmax(108px, 1.05fr) minmax(120px, 1.15fr) minmax(148px, 1fr) minmax(92px, 0.75fr) minmax(72px, 0.55fr) auto',
  alignItems: 'center',
  columnGap: 1.25,
  width: '100%',
  minWidth: 0,
};

const btnPrimary = {
  textTransform: 'none',
  fontWeight: 700,
  fontSize: 12.5,
  px: 1.75,
  py: 0.625,
  borderRadius: 1,
  boxShadow: '0 1px 2px rgba(135,97,25,0.28)',
  background: `linear-gradient(180deg, #cb9b2c 0%, ${T.primary} 100%)`,
  color: '#fff',
  whiteSpace: 'nowrap',
  '&:hover': { background: `linear-gradient(180deg, #d4a432 0%, ${T.primary} 100%)` },
  '&.Mui-disabled': { opacity: 0.55, color: '#fff' },
};

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function channelStyle(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('airbnb')) {
    return { bgcolor: 'rgba(255,56,92,0.10)', color: '#c13558', border: '1px solid rgba(255,56,92,0.22)' };
  }
  if (n.includes('booking')) {
    return { bgcolor: 'rgba(0,53,128,0.08)', color: '#003580', border: '1px solid rgba(0,53,128,0.18)' };
  }
  if (n.includes('direct') || n.includes('sojori')) {
    return { bgcolor: T.primaryTint, color: T.primaryDeep, border: `1px solid rgba(184,133,26,0.28)` };
  }
  return { bgcolor: T.bg2, color: T.text2, border: `1px solid ${T.border}` };
}

function statusStyle(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('confirm')) {
    return { bgcolor: T.successTint, color: T.success, border: `1px solid rgba(10,143,94,0.22)` };
  }
  if (s.includes('pending')) {
    return { bgcolor: T.warningTint, color: T.warning, border: `1px solid rgba(196,101,6,0.22)` };
  }
  return { bgcolor: T.bg2, color: T.text3, border: `1px solid ${T.border}` };
}

function HeaderCell({ children, align = 'left' }) {
  return (
    <Typography
      sx={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.07em',
        textTransform: 'uppercase',
        color: T.text4,
        textAlign: align,
      }}
    >
      {children}
    </Typography>
  );
}

function buildDefaultMessageEnabled(rules) {
  const out = {};
  for (const r of rules) {
    if (r.catalogMessageId) out[r.catalogMessageId] = r.enabled !== false;
  }
  return out;
}

function ReservationRowLine({
  row,
  launching,
  disabled,
  expanded,
  onToggleExpand,
  onLaunch,
  activeServices,
  activeMessages,
  messageCount,
}) {
  const ch = channelStyle(row.channelName);
  const st = statusStyle(row.status);

  return (
    <Box sx={ROW_GRID}>
      <IconButton
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand();
        }}
        aria-label={expanded ? 'Replier la config' : 'Déplier la config'}
        sx={{
          p: 0.25,
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          color: T.text3,
        }}
      >
        <ExpandMoreIcon sx={{ fontSize: 20 }} />
      </IconButton>

      <Typography
        sx={{
          fontFamily: '"Geist Mono", "SF Mono", monospace',
          fontSize: 12.5,
          fontWeight: 700,
          color: T.primaryDeep,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {row.reservationNumber}
      </Typography>

      <Typography
        sx={{
          fontSize: 13,
          fontWeight: 600,
          color: T.text,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {row.guestName || '—'}
      </Typography>

      <Typography
        sx={{
          fontSize: 12.5,
          color: T.text2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {fmtDate(row.arrivalDate)}
        <Box component="span" sx={{ mx: 0.5, color: T.text4 }}>
          →
        </Box>
        {fmtDate(row.departureDate)}
      </Typography>

      <Chip
        size="small"
        label={row.channelName || '—'}
        sx={{
          height: 22,
          fontSize: 10.5,
          fontWeight: 700,
          maxWidth: '100%',
          ...ch,
          '& .MuiChip-label': { px: 1 },
        }}
      />

      <Chip
        size="small"
        label={row.status || '—'}
        sx={{
          height: 22,
          fontSize: 10,
          fontWeight: 600,
          maxWidth: '100%',
          ...st,
          '& .MuiChip-label': { px: 0.75 },
        }}
      />

      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
        {!expanded && messageCount > 0 ? (
          <Typography sx={{ fontSize: 10, color: T.text4, whiteSpace: 'nowrap' }}>
            {activeServices}s · {activeMessages}m
          </Typography>
        ) : null}
        <Button
          size="small"
          variant="contained"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onLaunch(row.id);
          }}
          sx={btnPrimary}
        >
          {launching ? <CircularProgress size={14} color="inherit" /> : 'Lancer'}
        </Button>
      </Stack>
    </Box>
  );
}

export function PostImportOnboardingTab({ listingId, onFinished }) {
  const [rowsLoading, setRowsLoading] = useState(true);
  const [calendarSyncing, setCalendarSyncing] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [listingServices, setListingServices] = useState([]);
  const [listingOwnerId, setListingOwnerId] = useState('');
  const [messageRules, setMessageRules] = useState([]);
  const [messageCatalog, setMessageCatalog] = useState([]);
  const [launchingId, setLaunchingId] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const [expandedResaId, setExpandedResaId] = useState(null);

  const [resaActivations, setResaActivations] = useState({});
  const [resaMessageEnabled, setResaMessageEnabled] = useState({});

  const listingActivations = useMemo(
    () => displayActivationsFromServices(listingServices),
    [listingServices],
  );

  const defaultMessageEnabled = useMemo(
    () => buildDefaultMessageEnabled(messageRules),
    [messageRules],
  );

  const activeCount = useMemo(
    () => countEffectiveActiveServices(listingServices),
    [listingServices],
  );

  const activeMessageCountListing = useMemo(
    () => Object.values(defaultMessageEnabled).filter((v) => v === true).length,
    [defaultMessageEnabled],
  );

  useEffect(() => {
    logImportOnboarding('tab mount / listingActivations reset', {
      listingId,
      listingActivationsSummary: summarizeToggleMap(listingActivations),
      defaultMessagesSummary: summarizeToggleMap(defaultMessageEnabled, {}),
    });
    setResaActivations({});
    setResaMessageEnabled({});
    setExpandedResaId(null);
  }, [listingActivations, defaultMessageEnabled, listingId]);

  useEffect(() => {
    if (!listingId) return;
    logImportOnboarding('tab ready — filtre console: [import-onboarding]', { listingId });
  }, [listingId]);

  const getActivationsForResa = useCallback(
    (reservationId) => resaActivations[reservationId] ?? listingActivations,
    [resaActivations, listingActivations],
  );

  const getMessagesForResa = useCallback(
    (reservationId) => resaMessageEnabled[reservationId] ?? defaultMessageEnabled,
    [resaMessageEnabled, defaultMessageEnabled],
  );

  const countActiveForResa = useCallback(
    (reservationId) =>
      Object.values(getActivationsForResa(reservationId)).filter((v) => v === true).length,
    [getActivationsForResa],
  );

  const countActiveMessagesForResa = useCallback(
    (reservationId) =>
      Object.values(getMessagesForResa(reservationId)).filter((v) => v === true).length,
    [getMessagesForResa],
  );

  const handleToggleService = useCallback(
    (reservationId, key, checked) => {
      const base = resaActivations[reservationId] ?? listingActivations;
      const listingVal = listingActivations[key] === true;
      logImportOnboarding('toggle service', {
        reservationId,
        key,
        checked,
        wasListingDefault: listingVal,
        differsFromListing: listingVal !== checked,
        previous: base[key],
      });
      setResaActivations((prev) => {
        const baseState = prev[reservationId] ?? listingActivations;
        const next = { ...baseState, [key]: checked };
        return { ...prev, [reservationId]: next };
      });
    },
    [listingActivations, resaActivations],
  );

  const handleToggleMessage = useCallback(
    (reservationId, messageId, checked) => {
      const base = resaMessageEnabled[reservationId] ?? defaultMessageEnabled;
      const listingVal = defaultMessageEnabled[messageId] === true;
      logImportOnboarding('toggle message', {
        reservationId,
        messageId,
        checked,
        wasListingDefault: listingVal,
        differsFromListing: listingVal !== checked,
        previous: base[messageId],
      });
      setResaMessageEnabled((prev) => {
        const baseState = prev[reservationId] ?? defaultMessageEnabled;
        return { ...prev, [reservationId]: { ...baseState, [messageId]: checked } };
      });
    },
    [defaultMessageEnabled, resaMessageEnabled],
  );

  const loadListingConfig = useCallback(async () => {
    if (!listingId) return;
    setConfigLoading(true);
    try {
      const data = await loadListingOrchestrationActivation(listingId);
      setListingServices(data.services ?? []);
      setListingOwnerId(data.ownerId ?? '');
    } catch (e) {
      toast.error(
        `Config listing introuvable: ${e instanceof Error ? e.message : 'erreur'} — vérifiez l'onglet Orchestration`,
      );
      setListingServices([]);
      setListingOwnerId('');
    } finally {
      setConfigLoading(false);
    }
  }, [listingId]);

  const loadMessagesConfig = useCallback(async () => {
    if (!listingId || !listingOwnerId) {
      setMessageRules([]);
      setMessageCatalog([]);
      setMessagesLoading(false);
      return;
    }
    setMessagesLoading(true);
    try {
      const ctx = await loadListingScheduledMessagesContext(listingId, listingOwnerId);
      const rules = sortScheduledRulesByJourney(ctx.rules ?? []);
      logImportOnboarding('config messages', {
        listingId,
        ownerId: listingOwnerId,
        ruleCount: rules.length,
        messagesSummary: summarizeToggleMap(
          Object.fromEntries(
            rules.map((r) => [r.catalogMessageId ?? r.messageId ?? '', r.enabled !== false]),
          ),
          {},
        ),
        rules: rules.map((r) => ({
          messageId: r.messageId,
          catalogMessageId: r.catalogMessageId,
          label: r.label,
          enabled: r.enabled,
          channel: r.channel,
        })),
      });
      setMessageRules(rules);
      setMessageCatalog(ctx.catalog ?? []);
    } catch (e) {
      console.error('[import-onboarding] messages config failed', e);
      setMessageRules([]);
      setMessageCatalog([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [listingId, listingOwnerId]);

  const loadRows = useCallback(async (syncCalendar = false) => {
    if (!listingId) return;
    if (syncCalendar) setCalendarSyncing(true);
    else setRowsLoading(true);
    try {
      const data = await listPendingImportOrchestrationReservations(listingId, syncCalendar);
      setRows(data);
    } catch (e) {
      toast.error(`Impossible de charger les réservations: ${e instanceof Error ? e.message : 'erreur'}`);
      setRows([]);
    } finally {
      setRowsLoading(false);
      setCalendarSyncing(false);
    }
  }, [listingId]);

  useEffect(() => {
    void loadListingConfig();
    void loadRows();
  }, [loadListingConfig, loadRows]);

  useEffect(() => {
    void loadMessagesConfig();
  }, [loadMessagesConfig]);

  const handleLaunch = async (reservationId) => {
    const row = rows.find((r) => r.id === reservationId);
    const categoryEnabledResolved = getActivationsForResa(reservationId);
    const scheduledMessagesEnabledResolved = getMessagesForResa(reservationId);
    logImportOnboarding('Lancer — début', {
      reservationId,
      reservationNumber: row?.reservationNumber,
      guestName: row?.guestName,
    });
    logImportOnboardingDiff('Lancer — services (listing vs résa)', listingActivations, categoryEnabledResolved);
    logImportOnboarding('Lancer — messages résa', {
      reservationId,
      messagesSummary: summarizeToggleMap(scheduledMessagesEnabledResolved, {}),
    });
    setLaunchingId(reservationId);
    try {
      const result = await launchImportOrchestration(reservationId, {
        categoryEnabledResolved,
        scheduledMessagesEnabledResolved,
      });
      logImportOnboarding('Lancer — fin', { reservationId, result });
      if (result.success) {
        toast.success(`Orchestration lancée — ${result.reservationNumber ?? reservationId}`);
        await loadRows();
      } else {
        toast.error('Échec du lancement orchestration');
      }
    } catch (e) {
      console.error('[import-onboarding] Lancer — erreur', e);
      toast.error(`Lancement: ${e instanceof Error ? e.message : 'erreur'}`);
    } finally {
      setLaunchingId(null);
    }
  };

  const handleFinishImport = async () => {
    if (!listingId) return;
    setFinishing(true);
    try {
      await finishListingImportOnboarding(listingId);
      toast.success('Import terminé — onglet masqué');
      onFinished?.();
    } catch (e) {
      toast.error(`Terminer import: ${e instanceof Error ? e.message : 'erreur'}`);
    } finally {
      setFinishing(false);
    }
  };

  const launchDisabled = launchingId != null || configLoading;
  const isLaunchDisabledForResa = (reservationId) =>
    launchDisabled || countActiveForResa(reservationId) === 0;

  const sortedMessageRules = messageRules;

  return (
    <Stack spacing={2.5}>
      <Alert
        severity="info"
        sx={{
          borderRadius: 1.5,
          bgcolor: T.infoTint,
          color: T.text,
          border: `1px solid rgba(6,115,179,0.15)`,
          '& .MuiAlert-icon': { color: T.info },
        }}
      >
        Réservations importées <strong>silencieuses</strong>. Dépliez une ligne pour ajuster services
        et messages, puis <strong>Lancer</strong>. Le message bienvenue part <strong>+1h</strong> après
        lancement (ancre = maintenant) — envoi par le cron horaire, pas marqué « sauté ».
      </Alert>

      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 1.75,
          borderColor: T.border,
          bgcolor: T.bg1,
          boxShadow: '0 1px 0 rgba(20,17,10,0.04)',
        }}
      >
        <Stack direction="row" mb={2} gap={1} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 16, fontWeight: 800, color: T.text, letterSpacing: '-0.02em' }}>
              Réservations en attente
            </Typography>
            <Chip
              size="small"
              label={rows.length}
              sx={{
                height: 22,
                fontWeight: 800,
                bgcolor: T.bg2,
                color: T.text2,
                border: `1px solid ${T.border}`,
              }}
            />
            {configLoading ? (
              <CircularProgress size={16} sx={{ color: T.primary }} />
            ) : (
              <>
                <Chip
                  size="small"
                  label={`${activeCount} service(s) · listing`}
                  sx={{
                    height: 22,
                    fontWeight: 700,
                    bgcolor: T.primaryTint,
                    color: T.primaryDeep,
                    border: `1px solid rgba(184,133,26,0.22)`,
                  }}
                />
                {!messagesLoading && messageRules.length > 0 ? (
                  <Chip
                    size="small"
                    label={`${messageRules.length} message(s) · ${activeMessageCountListing} actif(s)`}
                    sx={{
                      height: 22,
                      fontWeight: 700,
                      bgcolor: T.infoTint,
                      color: T.info,
                      border: '1px solid rgba(6,115,179,0.18)',
                    }}
                  />
                ) : null}
              </>
            )}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              disabled={rowsLoading || calendarSyncing}
              onClick={() => loadRows(false)}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }}
            >
              Rafraîchir
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={rowsLoading || calendarSyncing}
              onClick={() => loadRows(true)}
              sx={{ textTransform: 'none', fontWeight: 600, fontSize: 12 }}
            >
              {calendarSyncing ? <CircularProgress size={14} sx={{ mr: 0.75 }} /> : null}
              Sync calendrier
            </Button>
            <Button
              variant="contained"
              onClick={handleFinishImport}
              disabled={finishing}
              sx={btnPrimary}
            >
              {finishing ? '…' : "Terminer l'import"}
            </Button>
          </Stack>
        </Stack>

        {rowsLoading && rows.length === 0 ? (
          <Box py={5} display="flex" justifyContent="center">
            <CircularProgress size={28} sx={{ color: T.primary }} />
          </Box>
        ) : rows.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: T.text2 }}>
            Aucune réservation en attente.
          </Typography>
        ) : (
          <Box>
            <Box
              sx={{
                ...ROW_GRID,
                px: 1.25,
                py: 0.75,
                mb: 0.75,
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              <Box />
              <HeaderCell>Résa</HeaderCell>
              <HeaderCell>Voyageur</HeaderCell>
              <HeaderCell>Séjour</HeaderCell>
              <HeaderCell>Source</HeaderCell>
              <HeaderCell>Statut</HeaderCell>
              <HeaderCell align="right">Action</HeaderCell>
            </Box>

            <Stack spacing={1.25}>
              {rows.map((r) => {
                const expanded = expandedResaId === r.id;
                return (
                  <Paper
                    key={r.id}
                    variant="outlined"
                    sx={{
                      borderColor: expanded ? 'rgba(184,133,26,0.35)' : T.border,
                      borderRadius: '10px',
                      bgcolor: T.bg1,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        px: 1.25,
                        py: 1,
                        overflowX: 'auto',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: T.bg2 },
                      }}
                      onClick={() => setExpandedResaId(expanded ? null : r.id)}
                    >
                      <ReservationRowLine
                        row={r}
                        launching={launchingId === r.id}
                        disabled={isLaunchDisabledForResa(r.id)}
                        expanded={expanded}
                        onToggleExpand={() => {
                          const next = expanded ? null : r.id;
                          if (next) {
                            logImportOnboarding('déplier résa', {
                              reservationId: r.id,
                              reservationNumber: r.reservationNumber,
                              servicesSummary: summarizeToggleMap(getActivationsForResa(r.id)),
                              messagesSummary: summarizeToggleMap(getMessagesForResa(r.id), {}),
                            });
                          }
                          setExpandedResaId(next);
                        }}
                        onLaunch={handleLaunch}
                        activeServices={countActiveForResa(r.id)}
                        activeMessages={countActiveMessagesForResa(r.id)}
                        messageCount={messageRules.length}
                      />
                    </Box>

                    <Collapse in={expanded} unmountOnExit>
                      <Box
                        sx={{
                          px: 1.25,
                          py: 1.25,
                          bgcolor: T.bg2,
                          borderTop: `1px solid ${T.border}`,
                        }}
                      >
                        <Stack spacing={2}>
                          <Box>
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                              mb={1}
                            >
                              <Typography
                                sx={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  letterSpacing: '0.07em',
                                  textTransform: 'uppercase',
                                  color: T.text4,
                                }}
                              >
                                Messages planifiés
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: T.text3 }}>
                                {messageRules.length} message(s) · Admin → Owner → Listing → Plan
                              </Typography>
                            </Stack>
                            {messagesLoading ? (
                              <Box py={1.5} display="flex" justifyContent="center">
                                <CircularProgress size={20} sx={{ color: T.primary }} />
                              </Box>
                            ) : (
                              <CompactImportMessagesGrid
                                rules={sortedMessageRules}
                                catalog={messageCatalog}
                                enabledByMessageId={getMessagesForResa(r.id)}
                                onToggle={(messageId, checked) =>
                                  handleToggleMessage(r.id, messageId, checked)
                                }
                              />
                            )}
                          </Box>

                          <Box>
                            <Typography
                              sx={{
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: '0.07em',
                                textTransform: 'uppercase',
                                color: T.text4,
                                mb: 1,
                              }}
                            >
                              Plan orchestration · services
                            </Typography>
                            {configLoading ? (
                              <Box py={1.5} display="flex" justifyContent="center">
                                <CircularProgress size={20} sx={{ color: T.primary }} />
                              </Box>
                            ) : listingServices.length === 0 ? (
                              <Alert severity="warning" sx={{ borderRadius: 1.5, py: 0.5 }}>
                                Config listing non chargée.
                              </Alert>
                            ) : (
                              <CompactOrchestrationConfigGrid
                                activations={getActivationsForResa(r.id)}
                                onToggle={(key, checked) => handleToggleService(r.id, key, checked)}
                              />
                            )}
                          </Box>
                        </Stack>
                      </Box>
                    </Collapse>
                  </Paper>
                );
              })}
            </Stack>
          </Box>
        )}
      </Paper>
    </Stack>
  );
}

export default PostImportOnboardingTab;
