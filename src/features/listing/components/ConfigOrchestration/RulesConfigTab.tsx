// Règles de la propriété — listes multilingues (Rules / InfoUtils) — sauvegarde manuelle
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-toastify';
import { listingsService } from '../../../../services/listingsService';
import { menuBtnPrimary } from '../../../../components/listing/form-v2/components/ChatbotMenuConfig/menuTheme';
import { SOJORI_TOKENS as T } from './types';
import { Card, ConfigIntroBar, TYPO } from './SHARED';

const RULES_LANGS = ['fr', 'en', 'ary', 'ar', 'es', 'de', 'it'] as const;
type RulesLang = (typeof RULES_LANGS)[number];

const LANG_LABELS: Record<RulesLang, string> = {
  fr: 'FR',
  en: 'EN',
  ary: 'DAR',
  ar: 'AR',
  es: 'ES',
  de: 'DE',
  it: 'IT',
};

type LocalizedList = Partial<Record<RulesLang, string[]>> & { fr: string[] };

type RulesAndInfoState = {
  Rules: LocalizedList;
  InfoUtils: LocalizedList;
};

const EMPTY: RulesAndInfoState = { Rules: { fr: [] }, InfoUtils: { fr: [] } };

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x ?? ''));
}

function normalizeLocalizedList(raw: unknown): LocalizedList {
  if (Array.isArray(raw)) return { fr: asStringArray(raw) };
  if (!raw || typeof raw !== 'object') return { fr: [] };
  const obj = raw as Record<string, unknown>;
  const out: LocalizedList = { fr: asStringArray(obj.fr) };
  for (const iso of RULES_LANGS) {
    if (iso === 'fr') continue;
    if (iso in obj && obj[iso] != null) out[iso] = asStringArray(obj[iso]);
  }
  return out;
}

function normalizeRulesAndInfo(raw: unknown): RulesAndInfoState {
  if (!raw || typeof raw !== 'object') return { ...EMPTY, Rules: { fr: [] }, InfoUtils: { fr: [] } };
  const obj = raw as Record<string, unknown>;
  return {
    Rules: normalizeLocalizedList(obj.Rules),
    InfoUtils: normalizeLocalizedList(obj.InfoUtils),
  };
}

function listForLang(list: LocalizedList, lang: RulesLang): string[] {
  const frLen = (list.fr ?? []).length;
  const arr = list[lang] ?? [];
  if (lang === 'fr') return [...(list.fr ?? [])];
  // Pad/trim to FR length for editing alignment
  const next = arr.slice(0, frLen);
  while (next.length < frLen) next.push('');
  return next;
}

function filledCount(items: string[]): number {
  return items.filter((r) => r.trim()).length;
}

function trimLocalized(list: LocalizedList): LocalizedList {
  const frOriginal = list.fr ?? [];
  const keptIdx = frOriginal
    .map((s, i) => (s.trim() ? i : -1))
    .filter((i) => i >= 0);
  const fr = keptIdx.map((i) => frOriginal[i].trim());
  const out: LocalizedList = { fr };
  for (const iso of RULES_LANGS) {
    if (iso === 'fr') continue;
    const arr = list[iso];
    if (!arr) continue;
    out[iso] = keptIdx.map((i) => String(arr[i] ?? '').trim());
  }
  return out;
}

interface Props {
  listingId?: string;
  listingName?: string;
  ownerId?: string;
  templateOwnerKey?: string;
}

function LangSwitcher({
  lang,
  onChange,
}: {
  lang: RulesLang;
  onChange: (next: RulesLang) => void;
}) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const idx = RULES_LANGS.indexOf(lang);

  const cycle = (dir: -1 | 1) => {
    const next = RULES_LANGS[(idx + dir + RULES_LANGS.length) % RULES_LANGS.length];
    onChange(next);
  };

  return (
    <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', mr: 0.5 }}>
      <IconButton size="small" aria-label="Langue précédente" onClick={() => cycle(-1)} sx={{ p: 0.35 }}>
        <ChevronLeftIcon sx={{ fontSize: 18 }} />
      </IconButton>
      <Button
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          minWidth: 42,
          px: 0.75,
          py: 0.25,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.04em',
          textTransform: 'none',
          color: T.primaryDeep,
          bgcolor: T.primaryTint,
          border: `1px solid ${T.primary}`,
          borderRadius: 0.75,
        }}
      >
        {LANG_LABELS[lang]}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {RULES_LANGS.map((code) => (
          <MenuItem
            key={code}
            selected={code === lang}
            onClick={() => {
              onChange(code);
              setAnchor(null);
            }}
          >
            {LANG_LABELS[code]}
          </MenuItem>
        ))}
      </Menu>
      <IconButton size="small" aria-label="Langue suivante" onClick={() => cycle(1)} sx={{ p: 0.35 }}>
        <ChevronRightIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Stack>
  );
}

function StringListEditor({
  title,
  list,
  lang,
  placeholder,
  translating,
  onLangChange,
  onTranslate,
  onChangeList,
}: {
  title: string;
  list: LocalizedList;
  lang: RulesLang;
  placeholder: string;
  translating: boolean;
  onLangChange: (next: RulesLang) => void;
  onTranslate: () => void;
  onChangeList: (next: LocalizedList) => void;
}) {
  const items = useMemo(() => listForLang(list, lang), [list, lang]);
  const canTranslate = lang !== 'fr' && filledCount(list.fr ?? []) > 0;

  const updateItem = (index: number, value: string) => {
    const fr = [...(list.fr ?? [])];
    if (lang === 'fr') {
      fr[index] = value;
      onChangeList({ ...list, fr });
      return;
    }
    const current = listForLang(list, lang);
    current[index] = value;
    onChangeList({ ...list, [lang]: current });
  };

  const removeItem = (index: number) => {
    const next: LocalizedList = { fr: (list.fr ?? []).filter((_, i) => i !== index) };
    for (const iso of RULES_LANGS) {
      if (iso === 'fr') continue;
      const arr = list[iso];
      if (arr) next[iso] = arr.filter((_, i) => i !== index);
    }
    onChangeList(next);
  };

  const addItem = () => {
    const next: LocalizedList = { fr: [...(list.fr ?? []), ''] };
    for (const iso of RULES_LANGS) {
      if (iso === 'fr') continue;
      if (list[iso]) next[iso] = [...(list[iso] ?? []), ''];
    }
    onChangeList(next);
  };

  return (
    <Card
      icon="📋"
      title={title}
      meta={`${filledCount(items)} entrée${filledCount(items) !== 1 ? 's' : ''}`}
      headerExtra={
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <LangSwitcher lang={lang} onChange={onLangChange} />
          <IconButton
            size="small"
            aria-label="Traduire avec l'IA"
            disabled={!canTranslate || translating}
            onClick={onTranslate}
            title={
              lang === 'fr'
                ? 'Sélectionnez une autre langue pour traduire depuis le français'
                : 'Traduire depuis le français (IA)'
            }
            sx={{
              color: canTranslate ? T.primaryDeep : T.text4,
              bgcolor: canTranslate ? T.primaryTint : 'transparent',
              border: `1px solid ${canTranslate ? T.primary : T.border}`,
              borderRadius: 0.75,
              p: 0.45,
            }}
          >
            {translating ? <CircularProgress size={14} /> : <AutoAwesomeIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Stack>
      }
    >
      <Stack spacing={1.25}>
        {items.length === 0 && (
          <Typography sx={{ fontSize: 12, color: T.text3 }}>
            Aucune entrée — ajoutez une règle ou une info utile.
          </Typography>
        )}
        {items.map((item, index) => (
          <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={1}
              value={item}
              placeholder={lang === 'fr' ? placeholder : `${placeholder} (${LANG_LABELS[lang]})`}
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
  const [rulesLang, setRulesLang] = useState<RulesLang>('fr');
  const [infoLang, setInfoLang] = useState<RulesLang>('fr');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [translatingSection, setTranslatingSection] = useState<'Rules' | 'InfoUtils' | null>(null);

  const persist = useCallback(async () => {
    if (isOwnerTemplate && !templateOwnerKey) return;
    if (!isOwnerTemplate && !listingId) return;

    const normalized = {
      Rules: trimLocalized(rulesAndInfo.Rules),
      InfoUtils: trimLocalized(rulesAndInfo.InfoUtils),
    };

    setSavingState('saving');
    try {
      if (isOwnerTemplate && templateOwnerKey) {
        const res = await listingsService.putListingOwnerConfigTemplateSection(
          templateOwnerKey,
          'rulesAndInfo',
          normalized,
        );
        const body =
          (res as { success?: boolean; error?: string; data?: { rulesAndInfo?: unknown } }) ?? {};
        if (body.success === false) {
          throw new Error(body.error || 'Enregistrement refusé par le serveur');
        }
        const saved = body.data?.rulesAndInfo
          ? normalizeRulesAndInfo(body.data.rulesAndInfo)
          : normalized;
        setRulesAndInfo(saved);
      } else {
        let res = await listingsService.getListingRulesAndInfoConfig(listingId);
        if (res.notFound || (res.error && !res.data)) {
          await listingsService.createListingRulesAndInfo(listingId);
          res = await listingsService.getListingRulesAndInfoConfig(listingId);
        }
        const updateRes = await listingsService.updateListingRulesAndInfo(listingId, normalized);
        if (updateRes.error) throw new Error(updateRes.error);
        const savedRaw = (updateRes.data as { rulesAndInfo?: unknown })?.rulesAndInfo;
        setRulesAndInfo(savedRaw ? normalizeRulesAndInfo(savedRaw) : normalized);
      }
      setDirty(false);
      setSavingState('saved');
      window.setTimeout(() => setSavingState('idle'), 2200);
    } catch (e: unknown) {
      setSavingState('error');
      toast.error(e instanceof Error ? e.message : 'Erreur enregistrement');
    }
  }, [isOwnerTemplate, listingId, templateOwnerKey, rulesAndInfo]);

  const patchRulesAndInfo = useCallback(
    (updater: (prev: RulesAndInfoState) => RulesAndInfoState) => {
      setRulesAndInfo((prev) => updater(prev));
      setDirty(true);
      if (savingState === 'saved') setSavingState('idle');
    },
    [savingState],
  );

  const translateSection = useCallback(
    async (section: 'Rules' | 'InfoUtils', targetLang: RulesLang) => {
      if (targetLang === 'fr') return;
      const source = (rulesAndInfo[section].fr ?? []).map((s) => s.trim());
      if (!source.some(Boolean)) {
        toast.info('Ajoutez d’abord des entrées en français.');
        return;
      }
      setTranslatingSection(section);
      try {
        const result = await listingsService.translateRulesAndInfo({
          texts: source,
          targetLang,
          sourceLang: 'fr',
        });
        if (result.error) throw new Error(result.error);
        if (result.texts.length !== source.length) {
          throw new Error('Réponse de traduction invalide');
        }
        patchRulesAndInfo((prev) => ({
          ...prev,
          [section]: {
            ...prev[section],
            [targetLang]: result.texts,
          },
        }));
        toast.success(`Traduit en ${LANG_LABELS[targetLang]}`);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : 'Traduction impossible');
      } finally {
        setTranslatingSection(null);
      }
    },
    [rulesAndInfo, patchRulesAndInfo],
  );

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
          const payload = (res as { data?: { rulesAndInfo?: unknown } })?.data ?? res;
          const section = (payload as { rulesAndInfo?: unknown })?.rulesAndInfo;
          if (!cancelled) setRulesAndInfo(normalizeRulesAndInfo(section));
        } else {
          let res = await listingsService.getListingRulesAndInfoConfig(listingId);
          if (res.notFound || (res.error && !res.data)) {
            await listingsService.createListingRulesAndInfo(listingId);
            res = await listingsService.getListingRulesAndInfoConfig(listingId);
          }
          if (res.error && !res.data) throw new Error(res.error);
          const section = (res.data as { rulesAndInfo?: unknown })?.rulesAndInfo;
          if (!cancelled) setRulesAndInfo(normalizeRulesAndInfo(section));
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
        Ajoutez vos règles en français, traduisez via l&apos;icône IA, puis cliquez{' '}
        <b>Enregistrer</b> en bas de l&apos;onglet.
      </Typography>

      <Stack spacing={2}>
        <StringListEditor
          title="Règles de la propriété"
          list={rulesAndInfo.Rules}
          lang={rulesLang}
          placeholder="Ex. Les couples non mariés ne sont pas acceptés"
          translating={translatingSection === 'Rules'}
          onLangChange={setRulesLang}
          onTranslate={() => void translateSection('Rules', rulesLang)}
          onChangeList={(Rules) => patchRulesAndInfo((prev) => ({ ...prev, Rules }))}
        />
        <StringListEditor
          title="Infos utiles"
          list={rulesAndInfo.InfoUtils}
          lang={infoLang}
          placeholder="Ex. Numéro d'urgence conciergerie : +212 …"
          translating={translatingSection === 'InfoUtils'}
          onLangChange={setInfoLang}
          onTranslate={() => void translateSection('InfoUtils', infoLang)}
          onChangeList={(InfoUtils) => patchRulesAndInfo((prev) => ({ ...prev, InfoUtils }))}
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
