import { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import type {
  PartnerService,
  PartnerServiceOptionChoice,
  PartnerServiceOptionGroup,
} from '../../../../services/partnersApi';
import {
  type BreakfastFormulaDraft,
  MAX_FORMULA_PHOTOS,
  cleanFormule,
  formulaPriceMad,
} from './breakfastFormulaHelpers';
import { pickUploadablePhotos, uploadPartnerPhotos } from './partnerPhotoUpload';

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function emptyChoice(): PartnerServiceOptionChoice {
  return { id: newId('c'), label: '', priceDeltaMad: 0 };
}

function emptyGroup(kind: 'simple' | 'multiple'): PartnerServiceOptionGroup {
  return {
    id: newId('g'),
    label: kind === 'simple' ? 'Choix' : 'Options',
    required: kind === 'simple',
    min: kind === 'simple' ? 1 : 0,
    max: kind === 'simple' ? 1 : 4,
    choices: [emptyChoice()],
  };
}

export function optionKind(g: PartnerServiceOptionGroup): 'simple' | 'multiple' {
  return Number(g.max ?? 1) > 1 ? 'multiple' : 'simple';
}

export function sanitizeOptionGroups(
  groups: PartnerServiceOptionGroup[],
): PartnerServiceOptionGroup[] {
  return groups
    .map((g) => ({
      ...g,
      id: g.id || newId('g'),
      label: (g.label || '').trim(),
      required: Boolean(g.required),
      min: Number(g.min ?? (g.required ? 1 : 0)),
      max: Math.max(1, Number(g.max ?? 1)),
      choices: (g.choices || [])
        .map((c) => ({
          ...c,
          id: c.id || newId('c'),
          label: (c.label || '').trim(),
          priceDeltaMad: Number(c.priceDeltaMad || 0),
        }))
        .filter((c) => c.label),
    }))
    .filter((g) => g.label && g.choices.length);
}

type FormulaDraft = BreakfastFormulaDraft;

export type BreakfastFormulasMode = 'breakfast' | 'card' | 'ambiance';

type Props = {
  /** breakfast = formules incluses (PDJ) ; card = carte payante Room service. */
  mode?: BreakfastFormulasMode;
  emptyText?: string;
  dishes: PartnerService[];
  drafts: Record<string, FormulaDraft>;
  includedIds: Set<string>;
  supplementIds: Set<string>;
  onToggleIncluded: (id: string, on: boolean) => void;
  onToggleSupplement: (id: string, on: boolean) => void;
  onDraftChange: (id: string, patch: Partial<FormulaDraft>) => void;
  /** Retire la formule du catalogue (active=false) — jamais de suppression physique ici. */
  onRemove?: (id: string) => void;
  /** Supprime définitivement (formule jamais commandée). */
  onDelete?: (id: string) => void;
  /** Phrase affichée sous l'interrupteur quand la formule changera d'onglet à l'enregistrement. */
  moveHint?: (id: string) => string | undefined;
  disabled?: boolean;
};

function OptionGroupCard({
  group,
  onChange,
  onRemove,
}: {
  group: PartnerServiceOptionGroup;
  onChange: (next: PartnerServiceOptionGroup) => void;
  onRemove: () => void;
}) {
  const kind = optionKind(group);
  return (
    <Box
      sx={{
        p: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'background.paper',
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Nom de l’option"
          value={group.label}
          onChange={(e) => onChange({ ...group, label: e.target.value })}
        />
        <IconButton size="small" onClick={onRemove} aria-label="Supprimer l’option">
          ×
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={kind}
          onChange={(_, v: 'simple' | 'multiple' | null) => {
            if (!v) return;
            onChange({
              ...group,
              max: v === 'multiple' ? Math.max(2, Number(group.max || 4)) : 1,
              min: v === 'simple' ? Math.max(1, Number(group.min || 1)) : 0,
              required: v === 'simple' ? true : group.required,
            });
          }}
        >
          <ToggleButton value="simple" sx={{ py: 0.15, px: 0.75, fontSize: 11, textTransform: 'none' }}>
            Simple
          </ToggleButton>
          <ToggleButton value="multiple" sx={{ py: 0.15, px: 0.75, fontSize: 11, textTransform: 'none' }}>
            Multi
          </ToggleButton>
        </ToggleButtonGroup>
        {kind === 'multiple' ? (
          <TextField
            size="small"
            type="number"
            label="Max"
            value={group.max ?? 4}
            onChange={(e) =>
              onChange({ ...group, max: Math.max(2, Number(e.target.value) || 2) })
            }
            sx={{ width: 72 }}
            slotProps={{ htmlInput: { min: 2, max: 12 } }}
          />
        ) : null}
        <FormControlLabel
          sx={{ ml: 0, mr: 0 }}
          control={
            <Checkbox
              size="small"
              checked={Boolean(group.required)}
              onChange={(_, checked) =>
                onChange({
                  ...group,
                  required: checked,
                  min: checked ? Math.max(1, Number(group.min || 1)) : 0,
                })
              }
            />
          }
          label={<Typography sx={{ fontSize: 11.5 }}>Oblig.</Typography>}
        />
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {(group.choices || []).map((c, ci) => (
          <Box key={c.id || ci} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <TextField
              size="small"
              placeholder="Choix"
              value={c.label}
              onChange={(e) =>
                onChange({
                  ...group,
                  choices: (group.choices || []).map((ch, k) =>
                    k === ci ? { ...ch, label: e.target.value } : ch,
                  ),
                })
              }
              sx={{ width: 96 }}
            />
            <IconButton
              size="small"
              onClick={() =>
                onChange({
                  ...group,
                  choices: (group.choices || []).filter((_, k) => k !== ci),
                })
              }
              aria-label="Supprimer le choix"
            >
              ×
            </IconButton>
          </Box>
        ))}
        <Button
          size="small"
          onClick={() => onChange({ ...group, choices: [...(group.choices || []), emptyChoice()] })}
          sx={{ textTransform: 'none', minWidth: 0, px: 0.75, fontSize: 11.5 }}
        >
          + Choix
        </Button>
      </Box>
    </Box>
  );
}

function FormulaRow({
  mode,
  dish,
  draft,
  included,
  withSupplement,
  onToggleIncluded,
  onToggleSupplement,
  onDraftChange,
  onRemove,
  onDelete,
  hint,
  disabled,
}: {
  mode: BreakfastFormulasMode;
  dish: PartnerService;
  draft: FormulaDraft;
  included: boolean;
  withSupplement: boolean;
  onToggleIncluded: (on: boolean) => void;
  onToggleSupplement: (on: boolean) => void;
  onDraftChange: (patch: Partial<FormulaDraft>) => void;
  onRemove?: () => void;
  onDelete?: () => void;
  hint?: string;
  disabled?: boolean;
}) {
  const [openOptions, setOpenOptions] = useState((draft.optionGroups || []).length > 0);
  const [uploading, setUploading] = useState(false);
  const groups = draft.optionGroups || [];
  const photos = draft.photos || [];
  const onPickPhotos = async (files: FileList | null) => {
    const { valid, rejected } = pickUploadablePhotos(files, MAX_FORMULA_PHOTOS - photos.length);
    rejected.forEach((msg) => toast.error(msg));
    if (!valid.length) return;
    setUploading(true);
    try {
      const urls = await uploadPartnerPhotos(valid);
      onDraftChange({ photos: [...photos, ...urls].slice(0, MAX_FORMULA_PHOTOS) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload échoué');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box
      sx={{
        py: 1.25,
        borderBottom: '1px solid',
        borderColor: 'divider',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Nom de la formule"
          value={draft.title}
          onChange={(e) => onDraftChange({ title: e.target.value })}
          slotProps={{ htmlInput: { 'aria-label': 'Nom de la formule', maxLength: 160 } }}
          sx={{ flex: 1, minWidth: 180, '& input': { fontWeight: 700, fontSize: 15 } }}
        />
        {mode === 'ambiance' ? null : (
        <TextField
          size="small"
          type="number"
          label="Prix MAD"
          value={draft.priceMad ?? formulaPriceMad(dish)}
          onChange={(e) => onDraftChange({ priceMad: Math.max(0, Number(e.target.value) || 0) })}
          slotProps={{ htmlInput: { min: 0, step: 10, 'aria-label': 'Prix de la formule en MAD' } }}
          sx={{ width: 120 }}
        />
        )}
        <FormControlLabel
          sx={{ mr: 0 }}
          control={
            <Switch
              size="small"
              checked={included}
              onChange={(_, on) => onToggleIncluded(on)}
            />
          }
          label={
            <Typography sx={{ fontSize: 13 }}>
              {mode === 'ambiance' ? 'Proposée dans WhatsApp' : 'Inclus au petit déjeuner'}
            </Typography>
          }
        />
        {onRemove ? (
          <Button
            size="small"
            color="error"
            onClick={onRemove}
            sx={{ textTransform: 'none', fontSize: 12 }}
            aria-label={`Retirer la formule ${dish.title}`}
          >
            Retirer
          </Button>
        ) : null}
        {onDelete ? (
          <Button
            size="small"
            color="error"
            onClick={onDelete}
            sx={{ textTransform: 'none', fontSize: 12 }}
            aria-label={`Supprimer la formule ${dish.title}`}
          >
            Supprimer
          </Button>
        ) : null}
      </Box>
      {hint ? (
        <Typography sx={{ mt: 0.5, fontSize: 12, color: 'warning.dark' }}>{hint}</Typography>
      ) : null}

      <TextField
        size="small"
        fullWidth
        multiline
        minRows={2}
        maxRows={4}
        placeholder="Description"
        value={draft.description}
        onChange={(e) => onDraftChange({ description: e.target.value })}
        sx={{ mt: 1 }}
      />
      {mode === 'ambiance' ? (
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            Formules (prix « dès » = la moins chère)
          </Typography>
          {(draft.formules || []).map((f, i) => (
            <Box key={`f-${i}`} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Nom de la formule (Essentiel, Chic…)"
                value={f.label}
                onChange={(e) => {
                  const next = (draft.formules || []).map((x, k) =>
                    k === i ? { ...x, label: e.target.value } : x,
                  );
                  onDraftChange({ formules: next });
                }}
                slotProps={{ htmlInput: { maxLength: 120, 'aria-label': `Formule ${i + 1}` } }}
                sx={{ flex: 1, minWidth: 160 }}
              />
              <TextField
                size="small"
                type="number"
                label="MAD"
                value={f.priceMad ?? 0}
                onChange={(e) => {
                  const next = (draft.formules || []).map((x, k) =>
                    k === i ? { ...x, priceMad: Math.max(0, Number(e.target.value) || 0) } : x,
                  );
                  onDraftChange({ formules: next });
                }}
                slotProps={{ htmlInput: { min: 0, step: 50, 'aria-label': `Prix formule ${i + 1}` } }}
                sx={{ width: 110 }}
              />
              <IconButton
                size="small"
                disabled={(draft.formules || []).length <= 1}
                onClick={() =>
                  onDraftChange({ formules: (draft.formules || []).filter((_, k) => k !== i) })
                }
                aria-label={`Supprimer la formule ${i + 1}`}
              >
                ×
              </IconButton>
            </Box>
          ))}
          <Button
            size="small"
            sx={{ alignSelf: 'flex-start', textTransform: 'none', fontSize: 12 }}
            onClick={() =>
              onDraftChange({
                formules: [...(draft.formules || []), { label: '', priceMad: 0 }],
              })
            }
          >
            + Formule
          </Button>
        </Box>
      ) : null}
      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
          Photos ({photos.length}/{MAX_FORMULA_PHOTOS})
        </Typography>
        {photos.map((url, i) => (
          <Box key={url} sx={{ position: 'relative' }}>
            <Box
              component="img"
              src={url}
              alt={`Photo ${i + 1} de ${dish.title}`}
              sx={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 1, display: 'block' }}
            />
            <IconButton
              size="small"
              onClick={() => onDraftChange({ photos: photos.filter((_, k) => k !== i) })}
              aria-label={`Supprimer la photo ${i + 1}`}
              sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', p: 0.25 }}
            >
              ×
            </IconButton>
          </Box>
        ))}
        {photos.length < MAX_FORMULA_PHOTOS ? (
          <Button
            component="label"
            size="small"
            disabled={uploading}
            sx={{ textTransform: 'none', fontSize: 12 }}
          >
            {uploading ? 'Envoi…' : '+ Photo'}
            <input
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                void onPickPhotos(e.target.files);
                e.target.value = '';
              }}
            />
          </Button>
        ) : null}
      </Box>

      <Box
        sx={{
          mt: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        {mode === 'breakfast' ? (
          <>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Supplément</Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={withSupplement ? 'with' : 'none'}
              onChange={(_, v: 'none' | 'with' | null) => {
                if (!v) return;
                onToggleSupplement(v === 'with');
              }}
            >
              <ToggleButton value="none" sx={{ py: 0.2, px: 1, fontSize: 11.5, textTransform: 'none' }}>
                Sans
              </ToggleButton>
              <ToggleButton value="with" sx={{ py: 0.2, px: 1, fontSize: 11.5, textTransform: 'none' }}>
                Avec
              </ToggleButton>
            </ToggleButtonGroup>
          </>
        ) : null}

        <Button
          size="small"
          onClick={() => setOpenOptions((v) => !v)}
          sx={{ textTransform: 'none', fontSize: 12.5 }}
        >
          {openOptions ? '▾' : '▸'} Options{groups.length ? ` (${groups.length})` : ''}
        </Button>
        <Button
          size="small"
          onClick={() => {
            onDraftChange({ optionGroups: [...groups, emptyGroup('simple')] });
            setOpenOptions(true);
          }}
          sx={{ textTransform: 'none', fontSize: 12 }}
        >
          + Simple
        </Button>
        <Button
          size="small"
          onClick={() => {
            onDraftChange({ optionGroups: [...groups, emptyGroup('multiple')] });
            setOpenOptions(true);
          }}
          sx={{ textTransform: 'none', fontSize: 12 }}
        >
          + Multi
        </Button>
      </Box>

      {openOptions ? (
        groups.length === 0 ? (
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1 }}>
            Aucune option. Ajoute un choix simple (1 parmi n) ou multi (plusieurs).
          </Typography>
        ) : (
          <Box
            sx={{
              mt: 1,
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
              },
              gap: 1,
            }}
          >
            {groups.map((g, gi) => (
              <OptionGroupCard
                key={g.id || gi}
                group={g}
                onChange={(next) =>
                  onDraftChange({
                    optionGroups: groups.map((x, j) => (j === gi ? next : x)),
                  })
                }
                onRemove={() =>
                  onDraftChange({ optionGroups: groups.filter((_, j) => j !== gi) })
                }
              />
            ))}
          </Box>
        )
      ) : null}
    </Box>
  );
}

const PREFERRED_TITLES = [
  'English',
  'Fassi',
  'Healthy',
  'Signature de chef',
  'Continental',
  'Beldi',
];

export function sortBreakfastDishes(rows: PartnerService[]): PartnerService[] {
  const rank = (title: string) => {
    const i = PREFERRED_TITLES.findIndex((t) => t.toLowerCase() === title.trim().toLowerCase());
    return i === -1 ? 100 + title.toLowerCase().charCodeAt(0) : i;
  };
  return [...rows].sort((a, b) => rank(a.title) - rank(b.title) || a.title.localeCompare(b.title, 'fr'));
}

export function draftFromDish(d: PartnerService): FormulaDraft {
  return {
    id: String(d.id),
    title: d.title,
    description: d.description || '',
    priceMad: formulaPriceMad(d),
    formules: (d.formules || []).map(cleanFormule),
    photos: (d.photos || []).slice(0, MAX_FORMULA_PHOTOS),
    optionGroups: (d.optionGroups || []).map((g) => ({
      ...g,
      choices: (g.choices || []).map((c) => ({ ...c })),
    })),
  };
}

export function ListingBreakfastFormulas({
  mode = 'breakfast',
  emptyText,
  dishes,
  drafts,
  includedIds,
  supplementIds,
  onToggleIncluded,
  onToggleSupplement,
  onDraftChange,
  onRemove,
  onDelete,
  moveHint,
  disabled,
}: Props) {
  if (!dishes.length) {
    return (
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 1 }}>
        {emptyText || 'Aucune formule petit déjeuner sur ce listing. Ajoutez-en une avec « Nouvelle formule ».'}
      </Typography>
    );
  }

  return (
    <Box>
      {dishes.map((d) => {
        const id = String(d.id);
        const draft = drafts[id] || draftFromDish(d);
        return (
          <FormulaRow
            key={id}
            mode={mode}
            dish={d}
            draft={draft}
            included={includedIds.has(id)}
            withSupplement={supplementIds.has(id)}
            onToggleIncluded={(on) => onToggleIncluded(id, on)}
            onToggleSupplement={(on) => onToggleSupplement(id, on)}
            onDraftChange={(patch) => onDraftChange(id, patch)}
            onRemove={onRemove ? () => onRemove(id) : undefined}
            onDelete={onDelete ? () => onDelete(id) : undefined}
            hint={moveHint ? moveHint(id) : undefined}
            disabled={disabled}
          />
        );
      })}
    </Box>
  );
}
