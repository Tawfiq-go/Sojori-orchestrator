import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Add, ArrowDownward, ArrowUpward, DeleteOutlined, RestartAlt } from '@mui/icons-material';
import { toast } from 'react-toastify';
import listingsService from '../../services/listingsService';
import {
  saveListingGestion,
  type ListingOrchestrationDoc,
} from '../orchestrationListingV3/listingOrchestrationApi';
import {
  saveOwnerGestion,
  type OwnerOrchestrationDoc,
} from '../orchestrationListingV3/ownerOrchestrationApi';
import {
  REGISTRATION_FLOW_DYNAMIC_FIELD_LIMIT,
  canAddDynamicRegistrationField,
  completePresetSchema,
  dynamicFlowSlotCount,
  enabledFields,
  gestionResetToInherited,
  gestionWithSchema,
  newCustomField,
  parseRegistrationFormSchema,
  resolveEffectiveRegistrationForm,
  simplePresetSchema,
  type RegistrationFieldDef,
  type RegistrationFieldType,
  type RegistrationFormSchema,
} from '../registration/formSchema';

type Props = {
  listingId?: string;
  ownerKey?: string;
};

type AnyOrchestrationDoc = ListingOrchestrationDoc | OwnerOrchestrationDoc;

const FIELD_TYPES: { id: RegistrationFieldType; label: string }[] = [
  { id: 'short_text', label: 'Texte court' },
  { id: 'long_text', label: 'Texte long' },
  { id: 'date', label: 'Date' },
  { id: 'time', label: 'Heure' },
  { id: 'select', label: 'Liste' },
  { id: 'multi_select', label: 'Liste multiple' },
  { id: 'boolean', label: 'Oui / Non' },
];

function unwrapDoc(raw: unknown): AnyOrchestrationDoc | null {
  const r = raw as { data?: unknown } | AnyOrchestrationDoc | null;
  if (r && typeof r === 'object' && 'data' in r && r.data) return r.data as AnyOrchestrationDoc;
  return (r as AnyOrchestrationDoc) ?? null;
}

function schemaFromDoc(doc: AnyOrchestrationDoc | null, ownerDoc?: AnyOrchestrationDoc | null): {
  schema: RegistrationFormSchema;
  origin: string;
  override: boolean;
} {
  const listingGestion = (doc?.capabilities?.registration?.gestion ?? {}) as Record<string, unknown>;
  const ownerGestion = (ownerDoc?.capabilities?.registration?.gestion ?? {}) as Record<string, unknown>;
  const effective = resolveEffectiveRegistrationForm({ listingGestion, ownerGestion });
  return { schema: effective.schema, origin: effective.origin, override: effective.override };
}

export function RegistrationFormEditor({ listingId, ownerKey }: Props) {
  const [doc, setDoc] = useState<AnyOrchestrationDoc | null>(null);
  const [schema, setSchema] = useState<RegistrationFormSchema>(simplePresetSchema());
  const [origin, setOrigin] = useState('preset:simple');
  const [override, setOverride] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<RegistrationFieldDef | null>(null);
  const ownerMode = !listingId && Boolean(ownerKey);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = ownerMode
        ? await listingsService.getOwnerOrchestrationCompiled(ownerKey as string)
        : await listingsService.getListingOrchestrationCompiled(listingId as string);
      const d = unwrapDoc(raw);
      setDoc(d);
      let owner: AnyOrchestrationDoc | null = null;
      if (!ownerMode && d?.ownerId) {
        try {
          owner = unwrapDoc(await listingsService.getOwnerOrchestrationCompiled(String(d.ownerId)));
        } catch {
          owner = null;
        }
      }
      const resolved = ownerMode
        ? schemaFromDoc(d, d)
        : schemaFromDoc(d, owner);
      if (ownerMode) {
        const parsed = parseRegistrationFormSchema(
          (d?.capabilities?.registration?.gestion as { registrationFormSchema?: unknown } | undefined)
            ?.registrationFormSchema,
        );
        setSchema(parsed.schema ?? resolved.schema);
        setOrigin(parsed.schema ? 'owner' : resolved.origin);
        setOverride(false);
      } else {
        setSchema(resolved.schema);
        setOrigin(resolved.origin);
        setOverride(resolved.override);
      }
    } catch {
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [listingId, ownerKey, ownerMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (nextSchema: RegistrationFormSchema, asOverride: boolean) => {
    if (!doc || saving) return;
    const parsed = parseRegistrationFormSchema(nextSchema);
    if (!parsed.ok || !parsed.schema) {
      toast.error(
        parsed.errors.some((e) => /10|extra WhatsApp Flow/i.test(e))
          ? `Maximum ${REGISTRATION_FLOW_DYNAMIC_FIELD_LIMIT} champs supplémentaires dans le Flow WhatsApp.`
          : parsed.errors.join('; ') || 'Formulaire invalide',
      );
      return;
    }
    setSaving(true);
    const existingGestion = (doc.capabilities?.registration?.gestion ?? {}) as Record<string, unknown>;
    const gestion = asOverride || ownerMode
      ? gestionWithSchema(existingGestion, nextSchema, ownerMode ? undefined : { override: true })
      : gestionResetToInherited(existingGestion);
    try {
      if (ownerMode) {
        await saveOwnerGestion({
          ownerKey: ownerKey as string,
          capabilityKey: 'registration',
          gestion,
          doc: doc as OwnerOrchestrationDoc,
        });
      } else {
        await saveListingGestion({
          listingId: listingId as string,
          capabilityKey: 'registration',
          gestion,
          doc: doc as ListingOrchestrationDoc,
        });
      }
      toast.success('Formulaire d’enregistrement enregistré');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const updateFields = (fields: RegistrationFieldDef[]) => {
    const parsed = parseRegistrationFormSchema({
      version: 1,
      fields: fields.map((f, i) => ({ ...f, order: i })),
    });
    if (!parsed.ok || !parsed.schema) {
      toast.error(parsed.errors.join('; ') || 'Formulaire invalide');
      return;
    }
    setSchema(parsed.schema);
    setOverride(ownerMode ? false : true);
    void persist(parsed.schema, true);
  };

  const inheritLabel = useMemo(() => {
    if (ownerMode) return 'Modèle owner — s’applique par défaut à toutes les annonces.';
    if (override) return 'Cette annonce a un formulaire spécifique.';
    if (origin === 'owner') return 'Hérite du formulaire owner.';
    if (origin === 'preset:complete') return 'Hérite du préréglage fiche police.';
    return 'Hérite du préréglage passeport (simple).';
  }, [ownerMode, override, origin]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Chargement…</Typography>
      </Box>
    );
  }

  const fields = [...schema.fields].sort((a, b) => a.order - b.order);

  return (
    <Box
      sx={{
        border: '1px solid rgba(26,22,17,0.10)',
        borderRadius: 2,
        px: 2,
        py: 1.5,
        mt: 1.5,
        background: '#fff',
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>
        Formulaire d’enregistrement
      </Typography>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>{inheritLabel}</Typography>
      <Alert severity="info" sx={{ fontSize: 12, mb: 1.5 }}>
        Ces champs s’affichent directement dans le Flow WhatsApp d’enregistrement. Le voyageur
        reste dans WhatsApp — aucun lien vers un formulaire externe n’est envoyé.
      </Alert>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 1 }}>
        Champs supplémentaires : {dynamicFlowSlotCount(schema)} / {REGISTRATION_FLOW_DYNAMIC_FIELD_LIMIT}
      </Typography>
      {!ownerMode && (
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
          <Chip size="small" label={override ? 'Override annonce' : 'Hérité'} color={override ? 'warning' : 'default'} />
          {override && (
            <Button
              size="small"
              startIcon={<RestartAlt />}
              disabled={saving || !doc}
              onClick={() => void persist(schema, false)}
            >
              Revenir au formulaire owner
            </Button>
          )}
        </Stack>
      )}
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
        <Button size="small" variant="outlined" disabled={saving} onClick={() => updateFields(simplePresetSchema().fields)}>
          Préréglage simple
        </Button>
        <Button size="small" variant="outlined" disabled={saving} onClick={() => updateFields(completePresetSchema().fields)}>
          Préréglage fiche police
        </Button>
        <Button
          size="small"
          startIcon={<Add />}
          disabled={saving || !canAddDynamicRegistrationField(schema)}
          onClick={() => {
            if (!canAddDynamicRegistrationField(schema)) {
              toast.error(
                `Maximum ${REGISTRATION_FLOW_DYNAMIC_FIELD_LIMIT} champs supplémentaires dans le Flow WhatsApp.`,
              );
              return;
            }
            const field = newCustomField({
              label: 'Nouvelle question',
              order: fields.length,
              required: false,
              enabled: true,
            });
            setEditing(field);
          }}
        >
          Ajouter un champ
        </Button>
      </Stack>
      <Stack spacing={1}>
        {fields.map((field, index) => (
          <Box
            key={field.id}
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 1,
              alignItems: 'center',
              border: '1px solid rgba(26,22,17,0.08)',
              borderRadius: 1.5,
              px: 1.25,
              py: 1,
              opacity: field.enabled === false ? 0.55 : 1,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                {field.label}
                {field.required ? ' *' : ''}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                {field.kind === 'builtin' ? 'intégré' : 'personnalisé'} · {field.type} ·{' '}
                {field.scope === 'per_stay' ? 'une fois / séjour' : 'par voyageur'}
                {field.enabled === false ? ' · désactivé' : ''}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <IconButton size="small" disabled={index === 0 || saving} onClick={() => {
                const next = [...fields];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                updateFields(next);
              }}>
                <ArrowUpward fontSize="small" />
              </IconButton>
              <IconButton size="small" disabled={index === fields.length - 1 || saving} onClick={() => {
                const next = [...fields];
                [next[index + 1], next[index]] = [next[index], next[index + 1]];
                updateFields(next);
              }}>
                <ArrowDownward fontSize="small" />
              </IconButton>
              <FormControlLabel
                sx={{ mr: 0 }}
                control={
                  <Switch
                    size="small"
                    checked={field.required && field.enabled !== false}
                    disabled={saving}
                    onChange={(e) => {
                      const next = fields.map((f) =>
                        f.id === field.id ? { ...f, required: e.target.checked, enabled: true } : f,
                      );
                      updateFields(next);
                    }}
                  />
                }
                label={<Typography sx={{ fontSize: 11 }}>Requis</Typography>}
              />
              <Button size="small" onClick={() => setEditing(field)}>
                Modifier
              </Button>
              <IconButton
                size="small"
                disabled={saving}
                onClick={() => {
                  if (field.kind === 'builtin') {
                    updateFields(fields.map((f) => (f.id === field.id ? { ...f, enabled: false, required: false } : f)));
                  } else {
                    updateFields(fields.filter((f) => f.id !== field.id));
                  }
                }}
              >
                <DeleteOutlined fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
        ))}
      </Stack>
      <Box sx={{ mt: 2, p: 1.5, bgcolor: '#fafaf7', borderRadius: 1.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.75 }}>Aperçu voyageur</Typography>
        {enabledFields(schema).map((f) => (
          <Typography key={f.id} sx={{ fontSize: 12, color: 'text.secondary' }}>
            {f.required ? '●' : '○'} {f.label}{' '}
            <em>({f.scope === 'per_stay' ? 'séjour' : 'voyageur'})</em>
          </Typography>
        ))}
      </Box>
      <FieldEditorDialog
        field={editing}
        onClose={() => setEditing(null)}
        onSave={(nextField) => {
          const exists = fields.some((f) => f.id === nextField.id);
          const next = exists
            ? fields.map((f) => (f.id === nextField.id ? nextField : f))
            : [...fields, nextField];
          setEditing(null);
          updateFields(next);
        }}
      />
    </Box>
  );
}

function FieldEditorDialog({
  field,
  onClose,
  onSave,
}: {
  field: RegistrationFieldDef | null;
  onClose: () => void;
  onSave: (field: RegistrationFieldDef) => void;
}) {
  const [draft, setDraft] = useState<RegistrationFieldDef | null>(field);
  useEffect(() => setDraft(field), [field]);
  if (!draft) return null;
  const custom = draft.kind === 'custom';
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{custom ? 'Question personnalisée' : 'Champ intégré'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          <TextField
            label="Libellé"
            size="small"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
          {custom && (
            <FormControl fullWidth size="small">
              <TextField
                select
                label="Type"
                size="small"
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value as RegistrationFieldType })}
              >
                {FIELD_TYPES.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
            </FormControl>
          )}
          <TextField
            select
            label="Portée"
            size="small"
            value={draft.scope}
            onChange={(e) =>
              setDraft({ ...draft, scope: e.target.value as RegistrationFieldDef['scope'] })
            }
            disabled={!custom}
          >
            <MenuItem value="per_traveler">Par voyageur</MenuItem>
            <MenuItem value="per_stay">Une fois par séjour</MenuItem>
          </TextField>
          {(draft.type === 'select' || draft.type === 'multi_select') && (
            <TextField
              label="Options (une par ligne, valeur|libellé)"
              size="small"
              multiline
              minRows={3}
              value={(draft.options ?? []).map((o) => `${o.value}|${o.label}`).join('\n')}
              onChange={(e) => {
                const options = e.target.value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => {
                    const [value, label] = line.split('|');
                    return { value: (value || label || '').trim(), label: (label || value || '').trim() };
                  });
                setDraft({ ...draft, options });
              }}
            />
          )}
          <FormControlLabel
            control={
              <Switch
                checked={draft.required}
                onChange={(e) => setDraft({ ...draft, required: e.target.checked, enabled: true })}
              />
            }
            label="Requis"
          />
          <FormControlLabel
            control={
              <Switch
                checked={draft.enabled !== false}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              />
            }
            label="Activé"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" onClick={() => onSave(draft)}>
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RegistrationFormEditor;
