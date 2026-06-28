// Helpers UI — champs import RU / Airbnb (sections info, textes localisés, frais horaires)
import React, { useMemo, useState } from 'react';
import {
  Box,
  Stack,
  TextField,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Link,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Field, SectionH, T, sxInput } from '../tabs/_shared';
import { FieldIndicator } from '../components/FieldIndicator';
import { useListingFormStructure } from '../ListingFormStructureContext';
import listingsService from '../../../../services/listingsService';

export function asText(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

export function infoSectionToText(section) {
  if (!section || typeof section !== 'object') return '';
  const descs = Array.isArray(section.descriptions) ? section.descriptions : [];
  return descs
    .map((d) => (typeof d === 'object' && d ? d.fr || d.en || '' : ''))
    .filter(Boolean)
    .join('\n');
}

export function textToInfoSection(label, text, existing) {
  const lines = String(text || '')
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!lines.length) return undefined;
  const name = existing?.name || { fr: label, en: label };
  return {
    name,
    descriptions: lines.map((line) => ({ fr: line, en: line })),
    iconUrl: existing?.iconUrl || '',
  };
}

export function localizedRowsToText(rows) {
  if (!Array.isArray(rows)) return '';
  return rows
    .map((row) => {
      if (!row || typeof row !== 'object') return '';
      return row.value || row.locationDesc || row.notes || '';
    })
    .filter(Boolean)
    .join('\n\n---\n\n');
}

export function textToLocalizedRows(text, existing) {
  const blocks = String(text || '')
    .split(/\n\n---\n\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!blocks.length) return [];
  const template = Array.isArray(existing) && existing[0] ? { ...existing[0] } : { languageRuId: '4', value: '' };
  return blocks.map((value) => ({ ...template, value }));
}

export function rulesListToText(rulesAndInfo, key) {
  if (!rulesAndInfo || typeof rulesAndInfo !== 'object') return '';
  const list = rulesAndInfo[key];
  if (!Array.isArray(list)) return '';
  return list.map((line) => String(line)).filter(Boolean).join('\n');
}

export function textToRulesList(text) {
  return String(text || '')
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isRuPaymentMethodsArray(arr) {
  return (
    Array.isArray(arr) &&
    arr.some(
      (p) =>
        p &&
        typeof p === 'object' &&
        ('paymentMethodId' in p || 'rentalPaymentMethodId' in p || 'description' in p),
    )
  );
}

function resolveCatalogPaymentMethod(catalog, row) {
  if (!row || typeof row !== 'object') return null;
  const ruId = String(row.rentalPaymentMethodId ?? '').trim();
  const mongoId = String(row.paymentMethodId ?? '').trim();
  if (!Array.isArray(catalog)) return null;
  return (
    catalog.find((pm) => mongoId && String(pm._id) === mongoId) ||
    catalog.find((pm) => ruId && String(pm.rentalPaymentMethodId) === ruId) ||
    null
  );
}

/** Affichage structuré des paymentMethods[] du listing Mongo (post-import RU / OTA). */
export function RuPaymentMethodsDisplay({ rows, ruField = 'paymentMethods' }) {
  const { data: catalog = [] } = useQuery({
    queryKey: ['payment-methods-catalog'],
    queryFn: () => listingsService.getPaymentMethodsCatalog(),
    staleTime: 10 * 60 * 1000,
  });

  const list = Array.isArray(rows) ? rows.filter(Boolean) : [];

  return (
    <Field label="Moyens de paiement OTA" ruField={ruField} fullWidth>
      {list.length === 0 ? (
        <Typography sx={{ fontSize: 11.5, color: T.text4, fontStyle: 'italic' }}>
          Aucun moyen de paiement OTA enregistré.
        </Typography>
      ) : (
        <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Moyen</TableCell>
                <TableCell>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((row, idx) => {
                const catalogPm = resolveCatalogPaymentMethod(catalog, row);
                const label = catalogPm?.name || asText(row.description) || 'Paiement en ligne';
                const description = asText(row.description) || '—';
                return (
                  <TableRow key={idx}>
                    <TableCell sx={{ fontWeight: 600 }}>{label}</TableCell>
                    <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary', maxWidth: 420 }}>
                      {description}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Field>
  );
}

const RU_EXTERNAL_STATUS_LABELS = {
  0: 'Inconnu',
  1: 'Inactif',
  2: 'En attente',
  3: 'Hors ligne',
  4: 'En ligne',
};

function parseRuExternalListing(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const prop = raw.Property && typeof raw.Property === 'object' ? raw.Property : raw;
  const ext =
    prop.ExternalListing && typeof prop.ExternalListing === 'object'
      ? prop.ExternalListing
      : prop.externalListing;
  const ruId = prop['@_ID'] ?? prop.ID ?? prop.id ?? '';
  if (!ext && !ruId) return null;
  const statusNum = ext?.Status ?? ext?.status;
  const statusKey = statusNum != null ? Number(statusNum) : null;
  return {
    ruPropertyId: ruId ? String(ruId) : '',
    url: asText(ext?.Url || ext?.url),
    status: statusKey,
    statusLabel:
      statusKey != null && RU_EXTERNAL_STATUS_LABELS[statusKey]
        ? RU_EXTERNAL_STATUS_LABELS[statusKey]
        : statusKey != null
          ? `Statut ${statusKey}`
          : '—',
    description: asText(ext?.Description || ext?.description),
  };
}

/** Listing externe OTA — lien Airbnb / statut (sans ID technique côté client). */
export function RuExternalListingDisplay({ value, ruField = 'ruExternalListing', clientView = false }) {
  const parsed = useMemo(() => parseRuExternalListing(value), [value]);
  const label = clientView ? 'Statut diffusion (import RU)' : 'Annonce externe OTA';
  return (
    <Field label={label} ruField={ruField} fullWidth>
      {!parsed ? (
        <Typography sx={{ fontSize: 11.5, color: T.text4, fontStyle: 'italic' }}>
          Aucune annonce externe enregistrée.
        </Typography>
      ) : (
        <Paper variant="outlined" sx={{ p: 1.5 }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={parsed.statusLabel}
                color={parsed.status === 4 ? 'success' : 'default'}
                variant="outlined"
              />
            </Stack>
            {parsed.url ? (
              <Box>
                <Typography sx={{ fontSize: 10.5, color: T.text3, mb: 0.25 }}>Lien annonce</Typography>
                <Link href={parsed.url} target="_blank" rel="noopener noreferrer" sx={{ fontSize: 12.5, wordBreak: 'break-all' }}>
                  {parsed.url}
                </Link>
              </Box>
            ) : (
              <Typography sx={{ fontSize: 11.5, color: T.text4 }}>Lien annonce non renseigné</Typography>
            )}
            {!clientView && parsed.ruPropertyId ? (
              <Box>
                <Typography sx={{ fontSize: 10.5, color: T.text3, mb: 0.25 }}>ID propriété RU</Typography>
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>
                  {parsed.ruPropertyId}
                </Typography>
              </Box>
            ) : null}
            {parsed.description ? (
              <Box>
                <Typography sx={{ fontSize: 10.5, color: T.text3, mb: 0.25 }}>Description</Typography>
                <Typography sx={{ fontSize: 12.5 }}>{parsed.description}</Typography>
              </Box>
            ) : null}
          </Stack>
        </Paper>
      )}
    </Field>
  );
}

function otaStatusChipColor(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'online' || s === 'active' || s === 'connected' || s === 'live') return 'success';
  if (s === 'not_connected' || s === 'offline') return 'default';
  if (s === 'error' || s === 'failed') return 'error';
  return 'warning';
}

/** Snapshot canaux OTA — tableau (lecture ou édition des liens annonce). */
export function OtaChannelsSnapshotTable({
  snapshot,
  clientView = false,
  editable = false,
  onSnapshotChange,
}) {
  const [showAll, setShowAll] = useState(false);
  const [editingChannelKey, setEditingChannelKey] = useState(null);
  const [editUrlDraft, setEditUrlDraft] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelUrl, setNewChannelUrl] = useState('');
  const channels = Array.isArray(snapshot?.channels) ? snapshot.channels : [];
  const updatedAt = snapshot?.updatedAt ? new Date(snapshot.updatedAt) : null;
  const connected = channels.filter((c) => String(c?.status || '').toLowerCase() === 'online');
  const visible = showAll ? channels : connected;

  const patchChannels = (nextChannels) => {
    onSnapshotChange?.({
      ...(snapshot && typeof snapshot === 'object' ? snapshot : {}),
      updatedAt: snapshot?.updatedAt ?? new Date().toISOString(),
      channels: nextChannels,
    });
  };

  const updateChannel = (channelKey, patch) => {
    const next = channels.map((ch) => {
      const key = String(ch.channelId || ch.channelName || '');
      if (key !== channelKey) return ch;
      return { ...ch, ...patch };
    });
    patchChannels(next);
  };

  const handleAddManualChannel = () => {
    const name = newChannelName.trim();
    const url = newChannelUrl.trim();
    if (!name || !url) return;
    const channelId = `manual-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
    patchChannels([
      ...channels,
      {
        channelId,
        channelName: name,
        status: 'online',
        markup: null,
        url,
        contentStatus: null,
        ariStatus: null,
      },
    ]);
    setNewChannelName('');
    setNewChannelUrl('');
  };

  const startEditUrl = (channelKey, currentUrl) => {
    setEditingChannelKey(channelKey);
    setEditUrlDraft(currentUrl || '');
  };

  const commitEditUrl = (channelKey) => {
    updateChannel(channelKey, { url: editUrlDraft.trim() || null });
    setEditingChannelKey(null);
    setEditUrlDraft('');
  };

  const cancelEditUrl = () => {
    setEditingChannelKey(null);
    setEditUrlDraft('');
  };

  if (!channels.length && !editable) {
    return (
      <Typography sx={{ fontSize: 11.5, color: T.text4, fontStyle: 'italic' }}>
        {clientView
          ? 'Aucun canal connecté pour le moment.'
          : 'Aucun canal enregistré — utiliser « Vérifier connexion OTA ».'}
      </Typography>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }} useFlexGap>
        <Typography sx={{ fontSize: 11.5, color: T.text3 }}>
          {connected.length} canal(aux) connecté(s) · {channels.length} au total
          {updatedAt && Number.isFinite(updatedAt.getTime())
            ? ` · MAJ ${updatedAt.toLocaleString('fr-FR')}`
            : ''}
        </Typography>
        {channels.length > connected.length ? (
          <Button size="small" onClick={() => setShowAll((v) => !v)} sx={{ fontSize: 11 }}>
            {showAll ? 'Masquer non connectés' : `Afficher les ${channels.length - connected.length} non connectés`}
          </Button>
        ) : null}
      </Stack>
      {channels.length > 0 ? (
        <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Canal</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell sx={{ minWidth: 180 }}>Annonce</TableCell>
                {!clientView && !editable ? <TableCell align="right">Markup</TableCell> : null}
                {!clientView && !editable ? <TableCell>Contenu</TableCell> : null}
                {!clientView && !editable ? <TableCell>ARI</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((ch) => {
                const channelKey = String(ch.channelId || ch.channelName || '');
                const url = ch.url || '';
                return (
                  <TableRow key={channelKey}>
                    <TableCell sx={{ fontWeight: 600, fontSize: 12.5 }}>{ch.channelName || 'Canal'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={ch.status || '—'}
                        color={otaStatusChipColor(ch.status)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {editable && editingChannelKey === channelKey ? (
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <TextField
                            size="small"
                            fullWidth
                            placeholder="https://…"
                            value={editUrlDraft}
                            onChange={(e) => setEditUrlDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEditUrl(channelKey);
                              if (e.key === 'Escape') cancelEditUrl();
                            }}
                            sx={sxInput}
                            autoFocus
                          />
                          <Button
                            size="small"
                            onClick={() => commitEditUrl(channelKey)}
                            sx={{ textTransform: 'none', minWidth: 48, fontSize: 11 }}
                          >
                            OK
                          </Button>
                          <Button
                            size="small"
                            onClick={cancelEditUrl}
                            sx={{ textTransform: 'none', minWidth: 56, fontSize: 11, color: T.text3 }}
                          >
                            Annuler
                          </Button>
                        </Stack>
                      ) : (
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          {url ? (
                            <Link
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ fontSize: 12.5, fontWeight: 600 }}
                            >
                              Voir l&apos;annonce
                            </Link>
                          ) : (
                            <Typography sx={{ fontSize: 12, color: T.text4 }}>—</Typography>
                          )}
                          {editable ? (
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => startEditUrl(channelKey, url)}
                              sx={{
                                textTransform: 'none',
                                fontSize: 11.5,
                                fontWeight: 600,
                                minWidth: 0,
                                px: 0.75,
                                py: 0.25,
                              }}
                            >
                              Éditer
                            </Button>
                          ) : null}
                        </Stack>
                      )}
                    </TableCell>
                    {!clientView && !editable ? (
                      <TableCell align="right">{ch.markup != null ? `${ch.markup}%` : '—'}</TableCell>
                    ) : null}
                    {!clientView && !editable ? (
                      <TableCell sx={{ fontSize: 11.5 }}>{ch.contentStatus || '—'}</TableCell>
                    ) : null}
                    {!clientView && !editable ? (
                      <TableCell sx={{ fontSize: 11.5 }}>{ch.ariStatus || '—'}</TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      ) : null}
      {editable ? (
        <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 1, border: `1px dashed ${T.border}`, bgcolor: T.bg2 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 1 }}>Ajouter un lien annonce</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-start' }}>
            <TextField
              size="small"
              label="Canal"
              placeholder="ex. Airbnb, Booking.com"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              sx={{ ...sxInput, minWidth: { sm: 160 } }}
            />
            <TextField
              size="small"
              label="URL"
              placeholder="https://…"
              value={newChannelUrl}
              onChange={(e) => setNewChannelUrl(e.target.value)}
              sx={{ ...sxInput, flex: 1, minWidth: { sm: 240 } }}
            />
            <Button
              size="small"
              variant="outlined"
              disabled={!newChannelName.trim() || !newChannelUrl.trim()}
              onClick={handleAddManualChannel}
              sx={{ textTransform: 'none', whiteSpace: 'nowrap', mt: { sm: 0.25 } }}
            >
              Ajouter
            </Button>
          </Stack>
          <Typography sx={{ fontSize: 11, color: T.text4, mt: 1 }}>
            Les liens saisis manuellement sont conservés lors d&apos;une nouvelle vérification OTA si le canal
            ne renvoie pas d&apos;URL. Pensez à <strong>Sauvegarder</strong> l&apos;annonce.
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}

export function RuSyncStatusBadge({ syncToRentalUnited, rentalUnitedIds }) {
  const ids = Array.isArray(rentalUnitedIds) ? rentalUnitedIds.filter(Boolean) : [];
  const linked = ids.length > 0;
  const synced = syncToRentalUnited === true;
  let label = 'Non lié à RU';
  let color = 'default';
  if (linked && synced) {
    label = 'Synchronisé avec RU';
    color = 'success';
  } else if (linked) {
    label = 'IDs RU présents — sync à confirmer';
    color = 'warning';
  }
  return (
    <Stack spacing={0.75}>
      <Chip size="small" label={label} color={color} variant="outlined" sx={{ width: 'fit-content' }} />
      <Typography sx={{ fontSize: 11, color: T.text4, lineHeight: 1.45, maxWidth: 520 }}>
        Indicateur automatique (mis à <code>true</code> après import RU ou bouton « Sync RU ») — ce n&apos;est
        pas un réglage manuel. La sync réelle passe par l&apos;API{' '}
        <code>sync-with-rental-united</code>.
      </Typography>
    </Stack>
  );
}

export function JsonBlock({ data, maxHeight = 220, emptyLabel = '(vide)' }) {
  const pretty = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data ?? '');
    }
  }, [data]);
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return (
      <Typography sx={{ fontSize: 11.5, color: T.text4, fontStyle: 'italic' }}>
        {emptyLabel}
      </Typography>
    );
  }
  return (
    <Box
      component="pre"
      sx={{
        fontSize: 10.5,
        fontFamily: '"Geist Mono", monospace',
        bgcolor: T.bg2,
        border: `1px solid ${T.border}`,
        borderRadius: 1,
        p: 1.25,
        m: 0,
        maxHeight,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {pretty}
    </Box>
  );
}

export function InfoSectionField({ label, ruField, value, onChange, minRows = 2, hint }) {
  return (
    <Field label={label} ruField={ruField} fullWidth hint={hint}>
      <TextField
        fullWidth
        size="small"
        multiline
        minRows={minRows}
        value={infoSectionToText(value)}
        onChange={(e) => onChange(textToInfoSection(label, e.target.value, value))}
        sx={sxInput}
      />
    </Field>
  );
}

export function LocalizedRowsField({ label, ruField, value, onChange, minRows = 3, hint }) {
  return (
    <Field label={label} ruField={ruField} fullWidth hint={hint}>
      <TextField
        fullWidth
        size="small"
        multiline
        minRows={minRows}
        value={localizedRowsToText(value)}
        onChange={(e) => onChange(textToLocalizedRows(e.target.value, value))}
        sx={sxInput}
      />
    </Field>
  );
}

export function TimeFeesEditor({ label, rows, ruField, onChange, currency = 'MAD', hideHeader = false }) {
  const listingStructure = useListingFormStructure();
  const list = Array.isArray(rows) ? rows : [];
  const updateRow = (idx, patch) => {
    onChange(list.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };
  const addRow = () => onChange([...list, { fromHour: null, toHour: null, fee: null }]);
  const removeRow = (idx) => onChange(list.filter((_, i) => i !== idx));

  const formatHour = (h) => {
    if (h == null || h === '') return '—';
    const n = Number(h);
    if (!Number.isFinite(n)) return '—';
    return `${String(n).padStart(2, '0')}h00`;
  };

  return (
    <Box sx={{ mb: hideHeader ? 0 : 1.5 }}>
      {!hideHeader && label ? (
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75 }}>
          <SectionH>{label}</SectionH>
          {ruField ? <FieldIndicator field={ruField} listingStructure={listingStructure} dense /> : null}
        </Stack>
      ) : null}
      {list.length === 0 ? (
        <Typography sx={{ fontSize: 11.5, color: T.text4, mb: 1, lineHeight: 1.45 }}>
          Aucune tranche configurée.
        </Typography>
      ) : (
        <Paper variant="outlined" sx={{ overflowX: 'auto', mb: 1 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>De</TableCell>
                <TableCell>À</TableCell>
                <TableCell align="right">Frais ({currency})</TableCell>
                <TableCell width={48} />
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell sx={{ py: 0.75 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={row.fromHour ?? ''}
                      onChange={(e) =>
                        updateRow(idx, { fromHour: e.target.value === '' ? null : Number(e.target.value) })
                      }
                      sx={{ ...sxInput, width: 72 }}
                      inputProps={{ min: 0, max: 23 }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.75 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={row.toHour ?? ''}
                      onChange={(e) =>
                        updateRow(idx, { toHour: e.target.value === '' ? null : Number(e.target.value) })
                      }
                      sx={{ ...sxInput, width: 72 }}
                      inputProps={{ min: 0, max: 23 }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.75 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={row.fee ?? ''}
                      onChange={(e) =>
                        updateRow(idx, { fee: e.target.value === '' ? null : Number(e.target.value) })
                      }
                      sx={{ ...sxInput, width: 100 }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.75 }}>
                    <IconButton size="small" onClick={() => removeRow(idx)} sx={{ color: T.text4 }} aria-label="Supprimer">
                      ✕
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
      {list.length > 0 ? (
        <Typography sx={{ fontSize: 10.5, color: T.text4, mb: 0.75 }}>
          Lecture : {list.map((r, i) => `${formatHour(r.fromHour)}→${formatHour(r.toHour)} (${r.fee ?? 0} ${currency})`).join(' · ')}
        </Typography>
      ) : null}
      <Button size="small" onClick={addRow} sx={{ mt: 0.75, fontSize: 11 }}>
        + Ajouter une tranche
      </Button>
    </Box>
  );
}
