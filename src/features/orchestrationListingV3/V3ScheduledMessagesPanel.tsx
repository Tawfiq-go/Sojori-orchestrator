import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Link, Stack, Switch, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { toast } from 'react-toastify';
import '../taskHub/staff-design/orchDesign.css';
import MessageCatalogPicker from '../taskHub/staff-design/MessageCatalogPicker';
import OrchConfigListCard from '../taskHub/staff-design/OrchConfigListCard';
import listingsService from '../../services/listingsService';
import type {
  CatalogMessage,
  MessageDeliveryChannel,
  ReferencePoint,
  ScheduledOrchestrationMessage,
} from '../taskHub/staff-design/types';
import { SCHEDULED_MESSAGE_EMOJI } from '../taskHub/staff-design/orchestrationJourneyOrder';
import { V3 } from './theme';
import {
  loadListingScheduledMessagesContext,
  saveListingScheduledMessages,
} from './listingScheduledMessagesApi';
import {
  emptyScheduledRule,
  loadOwnerScheduledMessagesContext,
  saveOwnerScheduledMessages,
} from './ownerScheduledMessagesApi';
import {
  shouldAutoSyncListingsAfterOwnerSave,
  syncAllListingsFromOwnerOrchestration,
} from './ownerOrchestrationListingSync';

const REF_OPTIONS: { value: ReferencePoint; label: string }[] = [
  { value: 'reservation_date', label: 'Réservation créée' },
  { value: 'check_in', label: 'Arrivée (check-in)' },
  { value: 'check_out', label: 'Départ (check-out)' },
  { value: 'task_created', label: 'Tâche créée' },
  { value: 'previous_step_done', label: 'Date tâche' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const hh = String(h).padStart(2, '0');
  return `${hh}:00`;
});

function sendModeLabel(ch: MessageDeliveryChannel): string {
  return ch === 'whatsapp' ? 'WhatsApp' : ch === 'email' ? 'Email' : 'OTA / Email';
}

function formatSubtitle(rule: ScheduledOrchestrationMessage, catalogLabel?: string): string {
  const ref = REF_OPTIONS.find(o => o.value === rule.trigger.reference)?.label ?? rule.trigger.reference;
  const abs = Math.abs(rule.trigger.delay.value);
  const sign = rule.trigger.delay.value >= 0 ? '+' : '−';
  const delay = rule.trigger.delay.unit === 'hours' ? `${sign}${abs}h` : `J${sign}${abs}`;
  const time =
    rule.trigger.delay.unit === 'days' && rule.trigger.time ? ` · ${rule.trigger.time}` : '';
  return `${catalogLabel ?? '—'} · ${ref} ${delay}${time} · ${sendModeLabel(rule.deliveryChannel)}`;
}

type Props = {
  scope: 'owner' | 'listing';
  ownerKey: string;
  listingId?: string;
  listingName?: string;
  isAdminTemplate?: boolean;
};

export default function V3ScheduledMessagesPanel({
  scope,
  ownerKey,
  listingId,
  listingName,
  isAdminTemplate = false,
}: Props) {
  const isListingScope = scope === 'listing';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [rules, setRules] = useState<ScheduledOrchestrationMessage[]>([]);
  const [catalog, setCatalog] = useState<CatalogMessage[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rulesSource, setRulesSource] = useState<'listing' | 'owner' | 'fulltask'>('listing');

  const load = useCallback(async () => {
    if (isListingScope && !listingId) {
      setRules([]);
      setCatalog([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const ctx = isListingScope
        ? await loadListingScheduledMessagesContext(listingId!, ownerKey)
        : await loadOwnerScheduledMessagesContext(ownerKey);
      setRules(ctx.rules);
      setCatalog(ctx.catalog);
      if (isListingScope && 'rulesSource' in ctx) {
        setRulesSource(ctx.rulesSource);
      } else {
        setRulesSource('listing');
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Impossible de charger les messages planifiés');
      setRules([]);
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, [isListingScope, listingId, ownerKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchRule = (id: string, patch: Partial<ScheduledOrchestrationMessage>) => {
    setRules(prev => prev.map(r => (r._id === id ? { ...r, ...patch } : r)));
  };

  const persistRules = async (nextRules: ScheduledOrchestrationMessage[], successMsg: string) => {
    if (isListingScope && listingId) {
      await saveListingScheduledMessages(listingId, nextRules, catalog);
      toast.success(successMsg);
    } else {
      await saveOwnerScheduledMessages(ownerKey, nextRules, catalog);
      let syncCount = 0;
      if (shouldAutoSyncListingsAfterOwnerSave(ownerKey, isAdminTemplate)) {
        try {
          syncCount = await syncAllListingsFromOwnerOrchestration(ownerKey);
        } catch (syncErr: unknown) {
          toast.warn(
            syncErr instanceof Error
              ? `Modèle PM OK — sync annonces : ${syncErr.message}`
              : 'Modèle PM OK — sync annonces échouée',
          );
        }
      }
      toast.success(
        syncCount > 0 ? `${successMsg} · ${syncCount} annonce(s) synchronisée(s)` : successMsg,
      );
    }
    await load();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await persistRules(rules, 'Messages planifiés enregistrés');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (ruleId: string, enabled: boolean) => {
    const next = rules.map(r => (r._id === ruleId ? { ...r, enabled } : r));
    setRules(next);
    if (isListingScope) {
      setSaving(true);
      try {
        await persistRules(next, enabled ? 'Message activé pour cette annonce' : 'Message désactivé pour cette annonce');
      } catch (e: unknown) {
        const err = e as { response?: { data?: { error?: string } }; message?: string };
        toast.error(err.response?.data?.error || err.message || 'Erreur');
        await load();
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSyncFromOwnerTemplate = async () => {
    if (!listingId) return;
    setSyncing(true);
    try {
      await listingsService.applyListingOrchestrationFromOwner(listingId);
      toast.success('Modèle PM appliqué sur cette annonce');
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Sync impossible');
    } finally {
      setSyncing(false);
    }
  };

  const handlePersistPreviewToListing = async () => {
    if (!listingId || rules.length === 0) return;
    setSyncing(true);
    try {
      await persistRules(
        rules,
        'Messages enregistrés sur l’annonce. Sync plan résa si besoin (ops / cron).',
      );
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message || 'Enregistrement impossible');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const listingLabel = listingName?.trim() || listingId || 'cette annonce';

  return (
    <Box className="so-orch-root" sx={{ px: { xs: 1, sm: 2 }, py: 1 }}>
      {isListingScope ? (
        <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
          <strong>Annonce : {listingLabel}</strong> — <strong>QUAND</strong> envoyer chaque message
          (timing, canal, actif/inactif) se configure <strong>ici sur l’annonce</strong>. Le{' '}
          <strong>plan réservation</strong> lit uniquement cette config listing (pas le modèle PM). Textes
          dans{' '}
          <Link component={RouterLink} to="/orchestration/config?tab=messages">
            Orchestration · Messages
          </Link>
          . Modèle PM par défaut :{' '}
          <Link component={RouterLink} to="/listings/orchestration-model?section=messages">
            Modèle orchestration
          </Link>
          .
          {rulesSource !== 'listing' && rules.length > 0 ? (
            <>
              {' '}
              <strong>Aperçu PM</strong> — enregistrez sur l’annonce pour alimenter les plans résa.
            </>
          ) : null}
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
          <strong>QUAND</strong> envoyer chaque message — niveau{' '}
          {isAdminTemplate ? 'Template Admin' : 'Property Manager'}. Textes dans{' '}
          <Link component={RouterLink} to="/orchestration/config?tab=messages">
            Orchestration · Messages
          </Link>
          . Sync PM → annonces : chaque listing reçoit la liste ; le PM peut désactiver par annonce.
        </Alert>
      )}

      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}
      >
        <Typography sx={{ fontSize: 14, color: V3.t2 }}>
          {rules.length} message(s) ·{' '}
          {isListingScope ? `Listing → Plan` : `Admin → Owner → Listing → Plan`}
        </Typography>
        <Stack direction="row" spacing={1}>
          {isListingScope && rules.length === 0 ? (
            <Button
              size="small"
              variant="outlined"
              disabled={syncing}
              onClick={() => void handleSyncFromOwnerTemplate()}
            >
              {syncing ? 'Sync…' : 'Charger depuis modèle PM'}
            </Button>
          ) : isListingScope && rulesSource !== 'listing' ? (
            <Button
              size="small"
              variant="contained"
              disabled={syncing || saving}
              onClick={() => void handlePersistPreviewToListing()}
            >
              {syncing ? 'Enregistrement…' : 'Enregistrer sur l’annonce'}
            </Button>
          ) : null}
          {isListingScope && rulesSource === 'listing' && rules.length > 0 ? (
            <Button size="small" variant="contained" disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          ) : null}
          {isListingScope && rules.length > 0 ? (
            <Button
              size="small"
              variant="outlined"
              disabled={syncing}
              onClick={() => void handleSyncFromOwnerTemplate()}
            >
              {syncing ? 'Sync…' : 'Réinitialiser depuis PM'}
            </Button>
          ) : null}
          {!isListingScope ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                const rule = emptyScheduledRule(catalog);
                setRules(prev => [...prev, rule]);
                setExpandedId(rule._id);
              }}
              disabled={catalog.length === 0}
            >
              + Ajouter
            </Button>
          ) : null}
          {!isListingScope ? (
            <Button size="small" variant="contained" disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {catalog.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Catalogue messages vide — voir{' '}
          <Link component={RouterLink} to="/orchestration/config">
            /orchestration/config
          </Link>
          .
        </Alert>
      ) : null}

      <Stack className="orch-config-list" sx={{ gap: 1 }}>
        {rules.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: V3.t3, py: 2 }}>
            {isListingScope
              ? 'Aucun message sur cette annonce. Appliquez le modèle orchestration PM pour hériter des messages planifiés.'
              : 'Aucun message planifié. Ajoutez une règle (ex. bienvenue J-1, consignes départ J0…).'}
          </Typography>
        ) : null}

        {rules.map(rule => {
          const cat = catalog.find(c => c.id === rule.catalogMessageId);
          const emoji = SCHEDULED_MESSAGE_EMOJI[rule.catalogMessageId] ?? '📨';
          const open = expandedId === rule._id;
          const statusChip = (
            <Chip
              size="small"
              label={rule.enabled ? 'Actif' : 'Inactif'}
              color={rule.enabled ? 'success' : 'default'}
              variant={rule.enabled ? 'filled' : 'outlined'}
              sx={{ height: 22, fontSize: 11, fontWeight: 700 }}
            />
          );

          return (
            <OrchConfigListCard
              key={rule._id}
              sortableId={rule._id}
              sortable={false}
              emoji={emoji}
              title={rule.label || cat?.label || 'Message plan'}
              subtitle={formatSubtitle(rule, cat?.label)}
              expanded={open}
              onToggleExpand={() => setExpandedId(open ? null : rule._id)}
              hideDelete={isListingScope}
              onDelete={
                isListingScope
                  ? undefined
                  : () => setRules(prev => prev.filter(r => r._id !== rule._id))
              }
              headerExtra={
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  {statusChip}
                  <Switch
                    size="small"
                    checked={rule.enabled}
                    disabled={saving}
                    onChange={(_, checked) => {
                      if (isListingScope) {
                        void handleToggleEnabled(rule._id, checked);
                      } else {
                        patchRule(rule._id, { enabled: checked });
                      }
                    }}
                  />
                </Stack>
              }
            >
              <div className="wf-card-main">
                <div className="row">
                  <div className="lbl">Libellé (plan)</div>
                  <input
                    className="input"
                    value={rule.label}
                    onChange={e => patchRule(rule._id, { label: e.target.value })}
                  />
                </div>

                <div className="wf-block">
                  <div className="wf-block-h">
                    <span className="wf-block-h-ic">💬</span>
                    <span className="wf-block-h-txt">MESSAGE (catalogue)</span>
                  </div>
                  <MessageCatalogPicker
                    catalog={catalog}
                    selectedId={rule.catalogMessageId || ''}
                    onChange={id => {
                      const entry = catalog.find(c => c.id === id);
                      patchRule(rule._id, {
                        catalogMessageId: id,
                        label: rule.label || entry?.label || rule.label,
                      });
                    }}
                    scope="reservation"
                    variant="select"
                  />
                </div>

                <TimingEditor rule={rule} onPatch={patch => patchRule(rule._id, patch)} />
              </div>
            </OrchConfigListCard>
          );
        })}
      </Stack>

      {!isListingScope && rules.some(r => !r.enabled) ? (
        <Typography sx={{ fontSize: 12, color: V3.t3, mt: 2 }}>
          Les messages « Inactif » au niveau PM ne sont pas copiés comme actifs sur les annonces après
          sync (valeur <code>enabled: false</code> conservée).
        </Typography>
      ) : null}
    </Box>
  );
}

function TimingEditor({
  rule,
  onPatch,
}: {
  rule: ScheduledOrchestrationMessage;
  onPatch: (patch: Partial<ScheduledOrchestrationMessage>) => void;
}) {
  return (
    <div className="wf-block">
      <div className="wf-block-h">
        <span className="wf-block-h-ic">⏰</span>
        <span className="wf-block-h-txt">TIMING ENVOI</span>
      </div>
      <div className="rel-table">
        <div
          className={`rel-table-h rel-table-h--timing${rule.trigger.delay.unit === 'hours' ? ' compact' : ''}`}
        >
          <span>RÉF</span>
          <span>J/H</span>
          <span>+/−</span>
          <span>VALEUR</span>
          {rule.trigger.delay.unit === 'days' ? <span>HEURE</span> : null}
          <span>CANAL</span>
        </div>
        <div
          className={`rel-row rel-row--timing${rule.trigger.delay.unit === 'hours' ? ' compact' : ''}`}
        >
          <select
            value={rule.trigger.reference}
            onChange={e =>
              onPatch({
                trigger: {
                  ...rule.trigger,
                  reference: e.target.value as ReferencePoint,
                },
              })
            }
          >
            {REF_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={rule.trigger.delay.unit}
            onChange={e =>
              onPatch({
                trigger: {
                  ...rule.trigger,
                  delay: {
                    ...rule.trigger.delay,
                    unit: e.target.value as 'hours' | 'days',
                  },
                },
              })
            }
          >
            <option value="hours">Heures</option>
            <option value="days">Jours</option>
          </select>
          <select
            value={rule.trigger.delay.value >= 0 ? '+' : '-'}
            onChange={e => {
              const sign = e.target.value === '+' ? 1 : -1;
              onPatch({
                trigger: {
                  ...rule.trigger,
                  delay: {
                    ...rule.trigger.delay,
                    value: sign * Math.abs(rule.trigger.delay.value),
                  },
                },
              });
            }}
          >
            <option value="+">Après (+)</option>
            <option value="-">Avant (−)</option>
          </select>
          <input
            type="number"
            min={0}
            value={Math.abs(rule.trigger.delay.value)}
            onChange={e => {
              const sign = rule.trigger.delay.value >= 0 ? 1 : -1;
              onPatch({
                trigger: {
                  ...rule.trigger,
                  delay: {
                    ...rule.trigger.delay,
                    value: sign * Number(e.target.value),
                  },
                },
              });
            }}
          />
          {rule.trigger.delay.unit === 'days' ? (
            <select
              value={rule.trigger.time || '09:00'}
              onChange={e =>
                onPatch({
                  trigger: { ...rule.trigger, time: e.target.value },
                })
              }
            >
              {HOUR_OPTIONS.map(h => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          ) : null}
          <select
            value={rule.deliveryChannel === 'whatsapp' ? 'whatsapp' : 'ota'}
            onChange={e =>
              onPatch({
                deliveryChannel: e.target.value === 'whatsapp' ? 'whatsapp' : 'ota',
              })
            }
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="ota">OTA / Email</option>
          </select>
        </div>
      </div>
    </div>
  );
}
