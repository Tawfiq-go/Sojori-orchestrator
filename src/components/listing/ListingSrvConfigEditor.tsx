import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { listingsService } from '../../services/listingsService';
import {
  buildListingAccessCreateBody,
  buildListingConfigPutBody,
  isMongoListingId,
  type ListingConfigTab,
} from '../../utils/listingConfigTabApi';
import { btnGhostSx, btnPrimarySx, Panel, tokens as t } from '../dashboard/DashboardV2.components';

type ToastSeverity = 'success' | 'error' | 'info' | 'warning';

const API_HELP: Record<
  ListingConfigTab,
  { get: string; put: string; note?: string; hasSync: boolean; hasRemoteCreate: boolean }
> = {
  whatsapp: {
    get: 'GET /api/v1/listing/listing-chatbot-config/:listingId',
    put: 'PUT …/listing-chatbot-config/:listingId — { overrides }',
    note: 'Le serveur ne persiste que le tableau overrides (comme le dashboard).',
    hasSync: true,
    hasRemoteCreate: true,
  },
  concierge: {
    get: 'GET /api/v1/listing/concierge-config/:listingId',
    put: 'PUT …/concierge-config/:listingId — transportServices, groceryServices, customServices',
    hasSync: true,
    hasRemoteCreate: true,
  },
  support: {
    get: 'GET /api/v1/listing/listing-support-categories/:listingId',
    put: 'PUT …/listing-support-categories/:listingId — { categories }',
    hasSync: true,
    hasRemoteCreate: true,
  },
  rules: {
    get: 'GET /api/v1/listing/rules-and-info/:listingId',
    put: 'PUT …/rules-and-info/:listingId — { rulesAndInfo }',
    hasSync: true,
    hasRemoteCreate: true,
  },
  access: {
    get: 'GET /api/v1/listing/listing-access/:listingId',
    put: 'PUT …/listing-access/:listingId — listingName, receptionMode, instructions',
    note: 'POST création : corps complet (listingId, listingName, receptionMode, instructions).',
    hasSync: false,
    hasRemoteCreate: false,
  },
};

async function fetchConfig(tab: ListingConfigTab, listingId: string) {
  switch (tab) {
    case 'whatsapp':
      return listingsService.getListingChatbotConfig(listingId);
    case 'concierge':
      return listingsService.getListingConciergeConfig(listingId);
    case 'support':
      return listingsService.getListingSupportCategoriesConfig(listingId);
    case 'rules':
      return listingsService.getListingRulesAndInfoConfig(listingId);
    case 'access':
      return listingsService.getListingAccessConfig(listingId);
    default:
      return { data: null as unknown | null, error: 'Onglet inconnu' };
  }
}

async function putConfig(tab: ListingConfigTab, listingId: string, body: unknown) {
  switch (tab) {
    case 'whatsapp':
      return listingsService.updateListingChatbotOverrides(
        listingId,
        (body as { overrides: unknown[] }).overrides,
      );
    case 'concierge':
      return listingsService.updateListingConciergeServices(
        listingId,
        body as {
          transportServices: unknown[];
          groceryServices: unknown[];
          customServices: unknown[];
        },
      );
    case 'support':
      return listingsService.updateListingSupportCategories(
        listingId,
        (body as { categories: unknown[] }).categories,
      );
    case 'rules':
      return listingsService.updateListingRulesAndInfo(
        listingId,
        (body as { rulesAndInfo: unknown }).rulesAndInfo,
      );
    case 'access':
      return listingsService.updateListingAccess(listingId, body);
    default:
      return { data: null, error: 'Onglet inconnu' };
  }
}

async function createFromAdmin(tab: ListingConfigTab, listingId: string) {
  switch (tab) {
    case 'whatsapp':
      return listingsService.createListingChatbotConfig(listingId);
    case 'concierge':
      return listingsService.createListingConciergeConfig(listingId);
    case 'support':
      return listingsService.createListingSupportCategories(listingId);
    case 'rules':
      return listingsService.createListingRulesAndInfo(listingId);
    default:
      return { data: null, error: 'POST création non disponible pour cet onglet.' };
  }
}

async function syncFromAdmin(tab: ListingConfigTab, listingId: string) {
  switch (tab) {
    case 'whatsapp':
      return listingsService.syncListingChatbotConfig(listingId);
    case 'concierge':
      return listingsService.syncListingConciergeConfig(listingId);
    case 'support':
      return listingsService.syncListingSupportCategories(listingId);
    case 'rules':
      return listingsService.syncListingRulesAndInfo(listingId);
    default:
      return { data: null, error: 'Sync non disponible.' };
  }
}

export type ListingSrvConfigEditorProps = {
  tab: ListingConfigTab;
  listingId: string;
  listingName: string;
  onToast: (message: string, severity?: ToastSeverity) => void;
};

export function ListingSrvConfigEditor({ tab, listingId, listingName, onToast }: ListingSrvConfigEditorProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const meta = API_HELP[tab];
  const idOk = isMongoListingId(listingId);

  const reload = useCallback(async () => {
    if (!idOk) {
      setLoading(false);
      setLoadError('Identifiant listing invalide (ObjectId 24 hex).');
      setDraft('');
      return;
    }
    setLoading(true);
    setLoadError(null);
    setParseError(null);
    const res = await fetchConfig(tab, listingId);
    if (res.data != null) {
      setDraft(JSON.stringify(res.data, null, 2));
    } else {
      setLoadError(res.error ?? 'Données indisponibles.');
      if (tab === 'access') {
        setDraft(
          JSON.stringify(
            {
              listingId,
              listingName: listingName.trim() || 'Listing',
              receptionMode: { type: 'automatic' },
              instructions: [],
            },
            null,
            2,
          ),
        );
      } else {
        setDraft('');
      }
    }
    setLoading(false);
  }, [tab, listingId, listingName, idOk]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleSave = async () => {
    if (!idOk) {
      onToast('ID listing invalide.', 'error');
      return;
    }
    setParseError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft.trim() || 'null');
    } catch {
      setParseError('JSON invalide (parse).');
      return;
    }
    const built = buildListingConfigPutBody(tab, parsed);
    if (!built.ok) {
      setParseError(built.error);
      return;
    }
    setSaving(true);
    const res = await putConfig(tab, listingId, built.body);
    setSaving(false);
    if (res.error) {
      onToast(res.error, 'error');
      return;
    }
    onToast('Configuration enregistrée (PUT srv-listing).', 'success');
    if (res.data != null) {
      setDraft(JSON.stringify(res.data, null, 2));
    } else {
      void reload();
    }
  };

  const handleCreateFromAdmin = async () => {
    if (!idOk) {
      onToast('ID listing invalide.', 'error');
      return;
    }
    if (tab === 'access') {
      onToast('Accès : utilisez « Créer accès (POST) » avec le JSON du formulaire.', 'info');
      return;
    }
    setCreating(true);
    const res = await createFromAdmin(tab, listingId);
    setCreating(false);
    if (res.error) {
      onToast(res.error, 'error');
      return;
    }
    onToast('Configuration créée depuis l’admin (POST).', 'success');
    void reload();
  };

  const handleCreateAccess = async () => {
    if (!idOk) {
      onToast('ID listing invalide.', 'error');
      return;
    }
    setParseError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft.trim() || 'null');
    } catch {
      setParseError('JSON invalide (parse).');
      return;
    }
    const built = buildListingAccessCreateBody(parsed, listingId, listingName);
    if (!built.ok) {
      setParseError(built.error);
      return;
    }
    setCreating(true);
    const res = await listingsService.createListingAccess(built.body);
    setCreating(false);
    if (res.error) {
      onToast(res.error, 'error');
      return;
    }
    onToast('Accès créé (POST srv-listing).', 'success');
    void reload();
  };

  const handleSync = async () => {
    if (!idOk || !meta.hasSync) {
      return;
    }
    setSyncing(true);
    const res = await syncFromAdmin(tab, listingId);
    setSyncing(false);
    if (res.error) {
      onToast(res.error, 'error');
      return;
    }
    onToast('Synchronisation admin terminée (POST …/sync).', 'success');
    void reload();
  };

  const busy = loading || saving || creating || syncing;

  return (
    <Panel
      sx={{
        p: 2,
        mb: 2.5,
        borderColor: t.primary,
        borderWidth: 1,
        borderStyle: 'solid',
      }}
    >
      <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5, color: t.primary }}>
        srv-listing — même contrat que le dashboard admin
      </Typography>
      <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>{meta.get}</Typography>
      <Typography sx={{ fontSize: 11, color: t.text3, mb: 1 }}>{meta.put}</Typography>
      {meta.note && (
        <Typography sx={{ fontSize: 11, color: t.text3, mb: 1.5, fontStyle: 'italic' }}>
          {meta.note}
        </Typography>
      )}

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Button
          size="small"
          sx={btnGhostSx}
          disabled={busy || !idOk}
          onClick={() => {
            void reload();
          }}
        >
          Recharger
        </Button>
        <Button size="small" sx={btnPrimarySx} disabled={busy || !idOk} onClick={() => void handleSave()}>
          {saving ? 'Enregistrement…' : 'Sauvegarder (PUT)'}
        </Button>
        {meta.hasSync && (
          <Button size="small" sx={btnGhostSx} disabled={busy || !idOk} onClick={() => void handleSync()}>
            {syncing ? 'Sync…' : 'Sync admin (POST …/sync)'}
          </Button>
        )}
        {meta.hasRemoteCreate && (
          <Button
            size="small"
            sx={btnGhostSx}
            disabled={busy || !idOk}
            onClick={() => void handleCreateFromAdmin()}
          >
            {creating ? 'Création…' : 'Créer depuis admin (POST)'}
          </Button>
        )}
        {tab === 'access' && (
          <Button size="small" sx={btnGhostSx} disabled={busy || !idOk} onClick={() => void handleCreateAccess()}>
            {creating ? 'Création…' : 'Créer accès (POST)'}
          </Button>
        )}
      </Stack>

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
          <CircularProgress size={22} />
          <Typography sx={{ fontSize: 12, color: t.text3 }}>Chargement…</Typography>
        </Box>
      )}

      {!loading && loadError && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          {loadError}
          {tab === 'access' ? ' — modèle JSON proposé ci-dessous pour création.' : ''}
        </Alert>
      )}

      {parseError && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          {parseError}
        </Alert>
      )}

      {!loading && (
        <TextField
          fullWidth
          multiline
          minRows={20}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!idOk}
          sx={{
            '& .MuiInputBase-root': { bgcolor: t.bg2 },
            '& .MuiInputBase-input': {
              fontFamily: 'ui-monospace, monospace',
              fontSize: 12,
            },
          }}
          placeholder={idOk ? '{}' : 'ID invalide'}
        />
      )}
    </Panel>
  );
}
