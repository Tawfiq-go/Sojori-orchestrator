// Règles de la propriété — liste texte (Rules / InfoUtils) — sauvegarde manuelle
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, IconButton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-toastify';
import { listingsService } from '../../../../services/listingsService';
import { menuBtnPrimary } from '../../../../components/listing/form-v2/components/ChatbotMenuConfig/menuTheme';
import { SOJORI_TOKENS as T } from './types';
import { Card, ConfigIntroBar, TYPO } from './SHARED';

type RulesAndInfoState = {
  Rules: string[];
  InfoUtils: string[];
};

const EMPTY: RulesAndInfoState = { Rules: [], InfoUtils: [] };

interface Props {
  listingId?: string;
  listingName?: string;
  ownerId?: string;
  templateOwnerKey?: string;
}

function StringListEditor({
  title,
  items,
  placeholder,
  onChange,
}: {
  title: string;
  items: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  const updateItem = (index: number, value: string) => {
    onChange(items.map((item, i) => (i === index ? value : item)));
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([...items, '']);
  };

  const filledCount = items.filter((r) => r.trim()).length;

  return (
    <Card icon="📋" title={title} meta={`${filledCount} entrée${filledCount !== 1 ? 's' : ''}`}>
      <Stack spacing={1.25}>
        {items.length === 0 && (
          <Typography sx={{ fontSize: 12, color: T.text3 }}>
            Aucune entrée — ajoutez une règle ou une info utile.
          </Typography>
        )}
        {items.map((item, index) => (
          <Stack key={index} direction="row" spacing={1} alignItems="flex-start">
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={1}
              value={item}
              placeholder={placeholder}
              onChange={(e) => updateItem(index, e.target.value)}
              sx={{ '& .MuiInputBase-root': { fontSize: 13 } }}
            />
            <IconButton
              size="small"
              aria-label="Supprimer"
              onClick={() => removeItem(index)}
              sx={{ mt: 0.5, color: T.text3 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
        <Button
          startIcon={<AddIcon />}
          size="small"
          onClick={addItem}
          sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 600 }}
        >
          Ajouter
        </Button>
      </Stack>
    </Card>
  );
}

export default function RulesConfigTab({
  listingId = '',
  listingName = '',
  templateOwnerKey,
}: Props) {
  const isOwnerTemplate = Boolean(templateOwnerKey);
  const [rulesAndInfo, setRulesAndInfo] = useState<RulesAndInfoState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const persist = useCallback(async () => {
    if (isOwnerTemplate && !templateOwnerKey) return;
    if (!isOwnerTemplate && !listingId) return;

    const normalized = {
      Rules: rulesAndInfo.Rules.map((r) => r.trim()).filter(Boolean),
      InfoUtils: rulesAndInfo.InfoUtils.map((r) => r.trim()).filter(Boolean),
    };

    setSavingState('saving');
    try {
      if (isOwnerTemplate && templateOwnerKey) {
        const res = await listingsService.putListingOwnerConfigTemplateSection(
          templateOwnerKey,
          'rulesAndInfo',
          normalized,
        );
        const body = (res as { success?: boolean; error?: string; data?: { rulesAndInfo?: RulesAndInfoState } }) ?? {};
        if (body.success === false) {
          throw new Error(body.error || 'Enregistrement refusé par le serveur');
        }
        const saved = body.data?.rulesAndInfo ?? normalized;
        setRulesAndInfo({
          Rules: Array.isArray(saved.Rules) ? saved.Rules.map(String) : normalized.Rules,
          InfoUtils: Array.isArray(saved.InfoUtils) ? saved.InfoUtils.map(String) : normalized.InfoUtils,
        });
      } else {
        let res = await listingsService.getListingRulesAndInfoConfig(listingId);
        if (res.notFound || (res.error && !res.data)) {
          await listingsService.createListingRulesAndInfo(listingId);
          res = await listingsService.getListingRulesAndInfoConfig(listingId);
        }
        const updateRes = await listingsService.updateListingRulesAndInfo(listingId, normalized);
        if (updateRes.error) throw new Error(updateRes.error);
        const saved = (updateRes.data as { rulesAndInfo?: RulesAndInfoState })?.rulesAndInfo ?? normalized;
        setRulesAndInfo({
          Rules: Array.isArray(saved.Rules) ? saved.Rules.map(String) : normalized.Rules,
          InfoUtils: Array.isArray(saved.InfoUtils) ? saved.InfoUtils.map(String) : normalized.InfoUtils,
        });
      }
      setDirty(false);
      setSavingState('saved');
      window.setTimeout(() => setSavingState('idle'), 2200);
    } catch (e: unknown) {
      setSavingState('error');
      toast.error(e instanceof Error ? e.message : 'Erreur enregistrement');
    }
  }, [isOwnerTemplate, listingId, templateOwnerKey, rulesAndInfo]);

  const patchRulesAndInfo = useCallback((updater: (prev: RulesAndInfoState) => RulesAndInfoState) => {
    setRulesAndInfo((prev) => {
      const next = updater(prev);
      return next;
    });
    setDirty(true);
    if (savingState === 'saved') setSavingState('idle');
  }, [savingState]);

  useEffect(() => {
    if (isOwnerTemplate && !templateOwnerKey) return;
    if (!isOwnerTemplate && !listingId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      setDirty(false);
      try {
        if (isOwnerTemplate && templateOwnerKey) {
          const res = await listingsService.getListingOwnerConfigTemplate(templateOwnerKey);
          const payload =
            (res as { data?: { rulesAndInfo?: RulesAndInfoState } })?.data ?? res;
          const section = (payload as { rulesAndInfo?: RulesAndInfoState })?.rulesAndInfo;
          if (!cancelled) {
            setRulesAndInfo({
              Rules: Array.isArray(section?.Rules) ? [...section.Rules] : [],
              InfoUtils: Array.isArray(section?.InfoUtils) ? [...section.InfoUtils] : [],
            });
          }
        } else {
          let res = await listingsService.getListingRulesAndInfoConfig(listingId);
          if (res.notFound || (res.error && !res.data)) {
            await listingsService.createListingRulesAndInfo(listingId);
            res = await listingsService.getListingRulesAndInfoConfig(listingId);
          }
          if (res.error && !res.data) throw new Error(res.error);
          const section = (res.data as { rulesAndInfo?: RulesAndInfoState })?.rulesAndInfo;
          if (!cancelled) {
            setRulesAndInfo({
              Rules: Array.isArray(section?.Rules) ? [...section.Rules] : [],
              InfoUtils: Array.isArray(section?.InfoUtils) ? [...section.InfoUtils] : [],
            });
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Chargement impossible');
          setRulesAndInfo(EMPTY);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOwnerTemplate, listingId, templateOwnerKey]);

  if (!isOwnerTemplate && !listingId) {
    return <Alert severity="info">Enregistrez le listing d&apos;abord.</Alert>;
  }

  if (loading) {
    return (
      <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box>
      <ConfigIntroBar saveState={savingState === 'error' ? 'idle' : savingState}>
        {listingName
          ? `Règles de la propriété · ${listingName} — affichées dans le menu WhatsApp H.`
          : 'Règles de la propriété — affichées dans le menu WhatsApp H.'}
      </ConfigIntroBar>

      {loadError && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          {loadError}
        </Alert>
      )}

      <Typography sx={{ ...TYPO.caption, mb: 2 }}>
        Ajoutez vos règles puis cliquez <b>Enregistrer</b> en bas de l&apos;onglet.
      </Typography>

      <Stack spacing={2}>
        <StringListEditor
          title="Règles de la propriété"
          items={rulesAndInfo.Rules}
          placeholder="Ex. Les couples non mariés ne sont pas acceptés"
          onChange={(Rules) => patchRulesAndInfo((prev) => ({ ...prev, Rules }))}
        />
        <StringListEditor
          title="Infos utiles"
          items={rulesAndInfo.InfoUtils}
          placeholder="Ex. Numéro d'urgence conciergerie : +212 …"
          onChange={(InfoUtils) => patchRulesAndInfo((prev) => ({ ...prev, InfoUtils }))}
        />
      </Stack>

      <Stack direction="row" sx={{ mt: 2.5, justifyContent: 'flex-end', gap: 1 }}>
        {dirty && (
          <Typography sx={{ alignSelf: 'center', fontSize: 11.5, color: T.warning, fontWeight: 600 }}>
            Modifications non enregistrées
          </Typography>
        )}
        <Button
          variant="contained"
          disabled={!dirty || savingState === 'saving'}
          onClick={() => void persist()}
          sx={menuBtnPrimary}
        >
          {savingState === 'saving' ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </Stack>
    </Box>
  );
}
