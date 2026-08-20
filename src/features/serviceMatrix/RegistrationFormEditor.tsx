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
  OCR_SOURCE_PASSPORT_HINT,
  PASSPORT_OCR_PROPERTIES,
  PASSPORT_OCR_PROPERTY_LABELS,
  applyMaxPassportExtraction,
  applyOcrBindingToField,
  canAddDynamicRegistrationField,
  canonicalOwnerForDedicatedOcrProperty,
  completePresetSchema,
  disabledBuiltinOcrHint,
  enabledFields,
  formatCapacityCounter,
  gestionResetToInherited,
  gestionWithSchema,
  isDedicatedOcrProperty,
  newCustomField,
  parseRegistrationFormSchema,
  parseRegistrationFormSchemaStrict,
  registrationCapacityReport,
  registrationFieldTypeLabel,
  resolveEffectiveRegistrationForm,
  simplePresetSchema,
  type PassportOcrProperty,
  type RegistrationFieldDef,
  type RegistrationFieldType,
  type RegistrationFormSchema,
  type RegistrationScreenPlacement,
  type RegistrationValueSource,
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
    const parsed = parseRegistrationFormSchemaStrict(nextSchema);
    if (!parsed.ok || !parsed.schema) {
      toast.error(
        parsed.errors[0] || parsed.errors.join('; ') || 'Formulaire invalide',
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
      version: 2,
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
        L’enregistrement reste entièrement dans WhatsApp Flow : photo du document, puis
        « Informations du passeport », puis « Complétez votre enregistrement » s’il y a des
        champs. Aucun lien vers un formulaire externe n’est envoyé. {OCR_SOURCE_PASSPORT_HINT}
      </Alert>
      {(() => {
        const cap = registrationCapacityReport(schema);
        return (
          <Stack spacing={0.5} sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
              {formatCapacityCounter(cap.passport)}
            </Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
              {formatCapacityCounter(cap.completion)}
            </Typography>
            {!cap.ok && (
              <Alert severity="error" sx={{ fontSize: 12 }}>
                {cap.errors.join(' ')}
              </Alert>
            )}
          </Stack>
        );
      })()}
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
          variant="outlined"
          disabled={saving}
          onClick={() => updateFields(applyMaxPassportExtraction(schema).fields)}
        >
          Passeport — extraction maximale
        </Button>
        <Button
          size="small"
          startIcon={<Add />}
          disabled={saving || !canAddDynamicRegistrationField(schema)}
          onClick={() => {
            if (!canAddDynamicRegistrationField(schema)) {
              toast.error(
                registrationCapacityReport(schema).errors[0] ||
                  'Capacité WhatsApp de l’écran « Compléter l’enregistrement » atteinte.',
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
        {fields.map((field, index) => {
          const photo = field.binding === 'passport_photo';
          const canMoveUp = !photo && index > 0 && fields[index - 1]?.binding !== 'passport_photo' && !saving;
          const canMoveDown =
            !photo && index < fields.length - 1 && fields[index + 1]?.binding !== 'passport_photo' && !saving;
          const screenLabel =
            field.screen === 'upload' || photo
              ? 'photo'
              : field.screen === 'passport'
                ? 'passeport'
                : 'compléter';
          const sourceLabel =
            field.valueSource === 'ocr' && field.ocrProperty
              ? `OCR · ${PASSPORT_OCR_PROPERTY_LABELS[field.ocrProperty]}`
              : 'saisie manuelle';
          return (
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
              bgcolor: photo ? 'rgba(26,22,17,0.03)' : undefined,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                {field.label}
                {field.enabled !== false && field.required ? ' *' : ''}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                {field.kind === 'builtin' ? 'intégré' : 'personnalisé'} ·{' '}
                {registrationFieldTypeLabel(field)} ·{' '}
                {field.scope === 'per_stay' ? 'une fois / séjour' : 'par voyageur'} · {screenLabel} ·{' '}
                {sourceLabel}
                {field.enabled === false ? ' · désactivé' : ''}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              {!photo && (
                <>
              <IconButton size="small" disabled={!canMoveUp} onClick={() => {
                const next = [...fields];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                updateFields(next);
              }}>
                <ArrowUpward fontSize="small" />
              </IconButton>
              <IconButton size="small" disabled={!canMoveDown} onClick={() => {
                const next = [...fields];
                [next[index + 1], next[index]] = [next[index], next[index + 1]];
                updateFields(next);
              }}>
                <ArrowDownward fontSize="small" />
              </IconButton>
                </>
              )}
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
          );
        })}
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
        allFields={fields}
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
  allFields,
  onClose,
  onSave,
}: {
  field: RegistrationFieldDef | null;
  allFields: RegistrationFieldDef[];
  onClose: () => void;
  onSave: (field: RegistrationFieldDef) => void;
}) {
  const [draft, setDraft] = useState<RegistrationFieldDef | null>(field);
  const [typeAdjustedNotice, setTypeAdjustedNotice] = useState<string | null>(null);
  useEffect(() => {
    setDraft(field);
    setTypeAdjustedNotice(null);
  }, [field]);
  if (!draft) return null;
  const custom = draft.kind === 'custom';
  const passportPhoto = draft.binding === 'passport_photo';
  const takenOcr = new Set(
    PASSPORT_OCR_PROPERTIES.filter((prop) => {
      if (isDedicatedOcrProperty(prop)) {
        const owner = canonicalOwnerForDedicatedOcrProperty({ version: 2, fields: allFields }, prop);
        return Boolean(owner && owner.id !== draft.id);
      }
      return allFields.some(
        (f) =>
          f.id !== draft.id &&
          f.enabled !== false &&
          f.valueSource === 'ocr' &&
          f.ocrProperty === prop,
      );
    }),
  );
  const applyScreen = (screen: RegistrationScreenPlacement): RegistrationFieldDef => {
    if (passportPhoto) return { ...draft, screen: 'upload' };
    if (draft.valueSource === 'ocr') return { ...draft, screen: 'passport' };
    if (screen === 'upload') return { ...draft, screen: 'completion' };
    return { ...draft, screen };
  };
  const applySource = (valueSource: RegistrationValueSource): RegistrationFieldDef => {
    if (valueSource === 'manual') {
      setTypeAdjustedNotice(null);
      return { ...draft, valueSource: 'manual', ocrProperty: undefined };
    }
    const fallback =
      draft.ocrProperty && PASSPORT_OCR_PROPERTIES.includes(draft.ocrProperty)
        ? draft.ocrProperty
        : draft.binding && PASSPORT_OCR_PROPERTIES.includes(draft.binding as PassportOcrProperty)
          ? (draft.binding as PassportOcrProperty)
          : undefined;
    if (!fallback) {
      return { ...draft, valueSource: 'ocr', screen: 'passport' };
    }
    const applied = applyOcrBindingToField(draft, fallback, allFields);
    setTypeAdjustedNotice(applied.notice || null);
    return applied.field;
  };
  const applyOcrProperty = (ocrProperty: PassportOcrProperty): RegistrationFieldDef => {
    const applied = applyOcrBindingToField(draft, ocrProperty, allFields);
    setTypeAdjustedNotice(applied.notice || null);
    return applied.field;
  };
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{custom ? 'Question personnalisée' : 'Champ intégré'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          {passportPhoto && (
            <Alert severity="info" sx={{ fontSize: 12 }}>
              Photo / document d’identité. Ce champ déclenche l’OCR WhatsApp. Le type ne peut pas
              être changé en texte générique. Désactivez-le seulement si la photo n’est pas
              demandée.
            </Alert>
          )}
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
                disabled={draft.valueSource === 'ocr'}
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
          {passportPhoto && (
            <TextField
              label="Type"
              size="small"
              value="photo/document"
              disabled
            />
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
          {!passportPhoto && (
            <TextField
              select
              label="Afficher dans"
              size="small"
              value={draft.screen === 'passport' || draft.valueSource === 'ocr' ? 'passport' : 'completion'}
              disabled={draft.valueSource === 'ocr'}
              onChange={(e) =>
                setDraft(applyScreen(e.target.value as RegistrationScreenPlacement))
              }
            >
              <MenuItem value="passport">Informations du passeport</MenuItem>
              <MenuItem value="completion">Compléter l’enregistrement</MenuItem>
            </TextField>
          )}
          {!passportPhoto && (
            <TextField
              select
              label="Source de la valeur"
              size="small"
              value={draft.valueSource === 'ocr' ? 'ocr' : 'manual'}
              onChange={(e) => setDraft(applySource(e.target.value as RegistrationValueSource))}
            >
              <MenuItem value="manual">Saisie manuelle</MenuItem>
              <MenuItem value="ocr">Champ passeport/OCR pris en charge</MenuItem>
            </TextField>
          )}
          {!passportPhoto && draft.valueSource === 'ocr' && custom && (
            <TextField
              select
              label="Propriété passeport / OCR"
              size="small"
              value={draft.ocrProperty || ''}
              onChange={(e) => setDraft(applyOcrProperty(e.target.value as PassportOcrProperty))}
              helperText={OCR_SOURCE_PASSPORT_HINT}
            >
              {PASSPORT_OCR_PROPERTIES.map((prop) => (
                <MenuItem key={prop} value={prop} disabled={takenOcr.has(prop)}>
                  {PASSPORT_OCR_PROPERTY_LABELS[prop]}
                  {takenOcr.has(prop) ? ' (déjà liée)' : ''}
                </MenuItem>
              ))}
            </TextField>
          )}
          {!passportPhoto && draft.valueSource === 'ocr' && !custom && draft.ocrProperty && (
            <Alert severity="info" sx={{ fontSize: 12 }}>
              Propriété OCR fixe pour ce champ intégré : {PASSPORT_OCR_PROPERTY_LABELS[draft.ocrProperty]}.
            </Alert>
          )}
          {!passportPhoto && draft.valueSource === 'ocr' && (
            <Alert severity="info" sx={{ fontSize: 12 }}>
              {OCR_SOURCE_PASSPORT_HINT}
            </Alert>
          )}
          {typeAdjustedNotice && (
            <Alert severity="warning" sx={{ fontSize: 12 }}>
              {typeAdjustedNotice}
            </Alert>
          )}
          {draft.valueSource === 'ocr' && draft.ocrProperty && disabledBuiltinOcrHint(allFields, draft.ocrProperty, draft.id) && (
            <Alert severity="warning" sx={{ fontSize: 12 }}>
              {disabledBuiltinOcrHint(allFields, draft.ocrProperty, draft.id)}
            </Alert>
          )}
          {!passportPhoto && draft.valueSource !== 'ocr' && draft.screen === 'passport' && (
            <Alert severity="info" sx={{ fontSize: 12 }}>
              Ce champ restera en saisie manuelle sur l’écran passeport. L’OCR ne le remplira pas.
            </Alert>
          )}
          {!passportPhoto && (
            <TextField
              label="Texte d’aide (optionnel)"
              size="small"
              value={draft.helperText || ''}
              onChange={(e) => setDraft({ ...draft, helperText: e.target.value })}
            />
          )}
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
