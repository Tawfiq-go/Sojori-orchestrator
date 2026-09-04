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
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { Add, ArrowDownward, ArrowUpward, DeleteOutlined, RestartAlt } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
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
  ADMIN_CUSTOM_QUESTION_LIMIT,
  OCR_SOURCE_PASSPORT_HINT,
  OWNER_CUSTOM_QUESTION_LIMIT,
  OWNER_FRIENDLY_FIELD_TYPES,
  OPTIONAL_VISUAL_PASSPORT_BINDINGS,
  PASSPORT_OCR_PROPERTIES,
  PASSPORT_OCR_PROPERTY_LABELS,
  RELIABLE_PASSPORT_BINDINGS,
  applyOcrBindingToField,
  canAddCustomQuestion,
  canonicalOwnerForDedicatedOcrProperty,
  completePresetSchema,
  coreProtectedFieldExplanation,
  countEnabledCustomQuestions,
  customQuestionLimitError,
  disabledBuiltinOcrHint,
  fieldsForOwnerCompletionTab,
  fieldsForOwnerPassportTab,
  formatCapacityCounter,
  gestionResetToInherited,
  gestionWithSchema,
  inheritanceStatusLabel,
  isCoreProtectedField,
  isDedicatedOcrProperty,
  newCustomField,
  ownerFacingFieldTypeLabel,
  ownerFacingFieldStatusLine,
  ownerFacingSourceBadge,
  parseRegistrationFormSchema,
  parseRegistrationFormSchemaStrict,
  findPassportPhotoField,
  presetConfirmMessage,
  registrationCapacityReport,
  registrationFieldTypeLabel,
  resolveEffectiveRegistrationForm,
  simplePresetSchema,
  type PassportOcrProperty,
  type RegistrationEditorRole,
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
type OwnerTab = 'passport' | 'completion';

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

function editorRoleFromUser(role: unknown): RegistrationEditorRole {
  const r = String(role || '').toLowerCase();
  return r === 'admin' || r === 'superadmin' ? 'admin' : 'owner';
}

export function RegistrationFormEditor({ listingId, ownerKey }: Props) {
  const { user } = useAuth();
  const role = editorRoleFromUser(user?.role);
  const isAdmin = role === 'admin';

  const [doc, setDoc] = useState<AnyOrchestrationDoc | null>(null);
  const [schema, setSchema] = useState<RegistrationFormSchema>(simplePresetSchema());
  const [origin, setOrigin] = useState('preset:simple');
  const [override, setOverride] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<RegistrationFieldDef | null>(null);
  const [tab, setTab] = useState<OwnerTab>('passport');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [presetConfirm, setPresetConfirm] = useState<'essential' | 'police' | null>(null);
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
      const resolved = ownerMode ? schemaFromDoc(d, d) : schemaFromDoc(d, owner);
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
    const enabledCustom = countEnabledCustomQuestions(nextSchema);
    const maxCustom = isAdmin ? ADMIN_CUSTOM_QUESTION_LIMIT : OWNER_CUSTOM_QUESTION_LIMIT;
    if (enabledCustom > maxCustom) {
      toast.error(customQuestionLimitError(role));
      return;
    }
    const parsed = parseRegistrationFormSchemaStrict(nextSchema);
    if (!parsed.ok || !parsed.schema) {
      toast.error(
        isAdmin
          ? parsed.errors[0] || parsed.errors.join('; ') || 'Formulaire invalide'
          : 'Le formulaire contient trop de champs. Désactivez une question avant d’en ajouter une autre.',
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
    const enabledCustom = fields.filter((f) => f.kind === 'custom' && f.enabled !== false).length;
    const maxCustom = isAdmin ? ADMIN_CUSTOM_QUESTION_LIMIT : OWNER_CUSTOM_QUESTION_LIMIT;
    if (enabledCustom > maxCustom) {
      toast.error(customQuestionLimitError(role));
      return;
    }
    const parsed = parseRegistrationFormSchema({
      version: 2,
      fields: fields.map((f, i) => ({ ...f, order: i })),
    });
    if (!parsed.ok || !parsed.schema) {
      toast.error(
        isAdmin
          ? parsed.errors.join('; ') || 'Formulaire invalide'
          : 'Le formulaire contient trop de champs. Désactivez une question avant d’en ajouter une autre.',
      );
      return;
    }
    setSchema(parsed.schema);
    setOverride(ownerMode ? false : true);
    void persist(parsed.schema, true);
  };

  const statusLabel = useMemo(
    () => inheritanceStatusLabel({ ownerMode, override, origin }),
    [ownerMode, override, origin],
  );

  const fields = [...schema.fields].sort((a, b) => a.order - b.order);
  const passportFields = fieldsForOwnerPassportTab(schema);
  const completionFields = fieldsForOwnerCompletionTab(schema);
  const photo = findPassportPhotoField(schema);
  const customCount = countEnabledCustomQuestions(schema);
  const customMax = isAdmin ? ADMIN_CUSTOM_QUESTION_LIMIT : OWNER_CUSTOM_QUESTION_LIMIT;
  const addCheck = canAddCustomQuestion(schema, role);
  const cap = registrationCapacityReport(schema);

  const applyPreset = (kind: 'essential' | 'police') => {
    const next = kind === 'police' ? completePresetSchema() : simplePresetSchema();
    updateFields(next.fields);
    setPresetConfirm(null);
  };

  const startAddCustom = () => {
    if (!addCheck.ok) {
      toast.error(addCheck.reason || customQuestionLimitError(role));
      return;
    }
    setTab('completion');
    setEditing(
      newCustomField({
        label: '',
        order: fields.length,
        required: false,
        enabled: true,
        screen: 'completion',
        valueSource: 'manual',
      }),
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Chargement…</Typography>
      </Box>
    );
  }

  const visibleRows = tab === 'passport' ? passportFields : completionFields;

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
      data-testid="registration-form-editor"
      data-editor-role={role}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>
        Formulaire d’enregistrement
      </Typography>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>{statusLabel}</Typography>

      <Alert severity="info" sx={{ fontSize: 12, mb: 1.5 }} data-testid="owner-flow-hint">
        Après la photo du document, le voyageur voit d’abord les informations du passeport, puis
        peut compléter l’enregistrement si besoin. Tout se passe dans WhatsApp.
        {' '}
        <strong>WhatsApp</strong> = le champ est proposé au client.
        {' '}
        <strong>Obligatoire</strong> = il doit le remplir pour valider (sinon il peut passer).
        Exemple : le n° d’entrée au Maroc peut être sur WhatsApp sans être obligatoire — le client
        l’a souvent seulement à l’arrivée.
      </Alert>

      {!ownerMode && (
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip
            size="small"
            label={override ? 'Personnalisé pour ce logement' : 'Configuration du propriétaire'}
            color={override ? 'warning' : 'default'}
          />
          {override && (
            <Button
              size="small"
              startIcon={<RestartAlt />}
              disabled={saving || !doc}
              onClick={() => void persist(schema, false)}
            >
              Revenir aux réglages du propriétaire
            </Button>
          )}
        </Stack>
      )}

      <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap' }}>
        <Button size="small" variant="outlined" disabled={saving} onClick={() => setPresetConfirm('essential')}>
          Essentiel
        </Button>
        <Button size="small" variant="outlined" disabled={saving} onClick={() => setPresetConfirm('police')}>
          Fiche de police
        </Button>
        <Button
          size="small"
          startIcon={<Add />}
          disabled={saving || !addCheck.ok}
          onClick={startAddCustom}
          data-testid="add-custom-question"
        >
          Ajouter une question
        </Button>
        {isAdmin && (
          <Button size="small" variant="text" onClick={() => setAdvancedOpen((v) => !v)} data-testid="toggle-advanced">
            {advancedOpen ? 'Masquer Avancé' : 'Avancé'}
          </Button>
        )}
      </Stack>

      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }} data-testid="custom-question-counter">
        Questions personnalisées : {customCount} sur {customMax}
      </Typography>
      {!addCheck.ok && customCount >= customMax && (
        <Alert severity="warning" sx={{ fontSize: 12, mb: 1.5 }} data-testid="custom-limit-message">
          {customQuestionLimitError(role)}
        </Alert>
      )}
      {!cap.ok && (
        <Alert severity={isAdmin ? 'error' : 'warning'} sx={{ fontSize: 12, mb: 1.5 }}>
          {isAdmin
            ? cap.errors.join(' ')
            : 'Le formulaire contient trop de champs. Désactivez une question avant d’en ajouter une autre.'}
        </Alert>
      )}

      {photo && (
        <Box
          sx={{
            border: '1px solid rgba(26,22,17,0.08)',
            borderRadius: 1.5,
            px: 1.25,
            py: 1,
            mb: 1.5,
            bgcolor: 'rgba(26,22,17,0.03)',
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{photo.label}</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>
            {ownerFacingSourceBadge(photo)} — {ownerFacingFieldStatusLine(photo)}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
            {coreProtectedFieldExplanation(photo)}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.75, alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={photo.enabled !== false}
                  disabled={saving}
                  onChange={(e) => {
                    updateFields(
                      fields.map((f) =>
                        f.id === photo.id
                          ? {
                              ...f,
                              enabled: e.target.checked,
                              required: e.target.checked ? photo.required : false,
                            }
                          : f,
                      ),
                    );
                  }}
                />
              }
              label={<Typography sx={{ fontSize: 11 }}>WhatsApp</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={photo.required && photo.enabled !== false}
                  disabled={saving || photo.enabled === false}
                  onChange={(e) => {
                    updateFields(
                      fields.map((f) =>
                        f.id === photo.id
                          ? { ...f, required: e.target.checked, enabled: true }
                          : f,
                      ),
                    );
                  }}
                />
              }
              label={<Typography sx={{ fontSize: 11 }}>Obligatoire</Typography>}
            />
          </Stack>
        </Box>
      )}

      <Tabs
        value={tab}
        onChange={(_, v: OwnerTab) => setTab(v)}
        sx={{ mb: 1.5, minHeight: 36 }}
        data-testid="owner-registration-tabs"
      >
        <Tab value="passport" label="Informations du passeport" sx={{ textTransform: 'none', minHeight: 36 }} />
        <Tab value="completion" label="Compléter l’enregistrement" sx={{ textTransform: 'none', minHeight: 36 }} />
      </Tabs>

      {tab === 'passport' ? (
        <Alert severity="info" sx={{ fontSize: 12, mb: 1.5 }} data-testid="passport-tab-help">
          Ces informations sont lues automatiquement sur le passeport. Le voyageur pourra les
          vérifier et les corriger.
          {OPTIONAL_VISUAL_PASSPORT_BINDINGS.some((b) =>
            passportFields.some((f) => f.binding === b && f.enabled !== false),
          )
            ? ' Certaines mentions (lieu de naissance, dates de délivrance) dépendent de la qualité du document et peuvent devoir être saisies à la main.'
            : ''}
        </Alert>
      ) : (
        <Alert severity="info" sx={{ fontSize: 12, mb: 1.5 }} data-testid="completion-tab-help">
          Ces informations ne figurent généralement pas sur le passeport. Activez{' '}
          <strong>WhatsApp</strong> pour les proposer au voyageur ;{' '}
          <strong>Obligatoire</strong> seulement s’il doit absolument les remplir
          (ex. n° d’entrée = WhatsApp sans obligatoire).
        </Alert>
      )}

      <Stack spacing={1} data-testid={`owner-tab-${tab}`}>
        {visibleRows.map((field) => {
          const index = fields.findIndex((f) => f.id === field.id);
          const protectedCore = isCoreProtectedField(field);
          const canMoveUp = index > 0 && fields[index - 1]?.binding !== 'passport_photo' && !saving;
          const canMoveDown =
            index >= 0 && index < fields.length - 1 && fields[index + 1]?.binding !== 'passport_photo' && !saving;
          return (
            <Box
              key={field.id}
              data-testid={`owner-field-row-${field.id}`}
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
                  {field.label || 'Sans titre'}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }} data-testid="owner-field-meta">
                  {ownerFacingSourceBadge(field)} — {ownerFacingFieldStatusLine(field)}
                  {field.kind === 'custom' ? ` — ${ownerFacingFieldTypeLabel(field.type)}` : ''}
                </Typography>
                {protectedCore && (
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
                    {coreProtectedFieldExplanation(field)}
                  </Typography>
                )}
                {tab === 'passport' &&
                  field.binding &&
                  (OPTIONAL_VISUAL_PASSPORT_BINDINGS as string[]).includes(field.binding) && (
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
                      Parfois lu sur le document — le voyageur pourra corriger si besoin.
                    </Typography>
                  )}
              </Box>
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <IconButton
                  size="small"
                  disabled={!canMoveUp}
                  onClick={() => {
                    const next = [...fields];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    updateFields(next);
                  }}
                >
                  <ArrowUpward fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={!canMoveDown}
                  onClick={() => {
                    const next = [...fields];
                    [next[index + 1], next[index]] = [next[index], next[index + 1]];
                    updateFields(next);
                  }}
                >
                  <ArrowDownward fontSize="small" />
                </IconButton>
                <FormControlLabel
                  sx={{ mr: 0 }}
                  control={
                    <Switch
                      size="small"
                      checked={field.enabled !== false}
                      disabled={saving}
                      onChange={(e) => {
                        updateFields(
                          fields.map((f) =>
                            f.id === field.id
                              ? {
                                  ...f,
                                  enabled: e.target.checked,
                                  required: e.target.checked ? f.required : false,
                                }
                              : f,
                          ),
                        );
                      }}
                    />
                  }
                  label={<Typography sx={{ fontSize: 11 }}>WhatsApp</Typography>}
                />
                <FormControlLabel
                  sx={{ mr: 0 }}
                  control={
                    <Switch
                      size="small"
                      checked={field.required && field.enabled !== false}
                      disabled={saving || field.enabled === false}
                      onChange={(e) => {
                        updateFields(
                          fields.map((f) =>
                            f.id === field.id
                              ? { ...f, required: e.target.checked, enabled: true }
                              : f,
                          ),
                        );
                      }}
                    />
                  }
                  label={<Typography sx={{ fontSize: 11 }}>Obligatoire</Typography>}
                />
                <Button size="small" onClick={() => setEditing(field)}>
                  Modifier
                </Button>
                <IconButton
                  size="small"
                  disabled={saving || (protectedCore && field.kind === 'builtin')}
                  title={
                    protectedCore
                      ? coreProtectedFieldExplanation(field)
                      : field.kind === 'builtin'
                        ? 'Désactiver'
                        : 'Supprimer'
                  }
                  onClick={() => {
                    if (field.kind === 'builtin') {
                      if (protectedCore) {
                        toast.info(coreProtectedFieldExplanation(field));
                        return;
                      }
                      updateFields(
                        fields.map((f) =>
                          f.id === field.id ? { ...f, enabled: false, required: false } : f,
                        ),
                      );
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
        {visibleRows.length === 0 && (
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            Aucun champ actif dans cet écran.
          </Typography>
        )}
      </Stack>

      {isAdmin && advancedOpen && (
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 1.5,
            border: '1px dashed rgba(26,22,17,0.25)',
            bgcolor: '#f7f5f1',
          }}
          data-testid="admin-advanced-panel"
        >
          <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.75 }}>Mode avancé (admin)</Typography>
          <Typography sx={{ fontSize: 12, mb: 0.5 }}>{formatCapacityCounter(cap.passport)}</Typography>
          <Typography sx={{ fontSize: 12, mb: 1 }}>{formatCapacityCounter(cap.completion)}</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1 }}>{OCR_SOURCE_PASSPORT_HINT}</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1 }}>
            Limite questions : {OWNER_CUSTOM_QUESTION_LIMIT} (owner) / {ADMIN_CUSTOM_QUESTION_LIMIT} (admin).
            Bindings fiables MRZ : {RELIABLE_PASSPORT_BINDINGS.join(', ')}.
          </Typography>
          <Stack spacing={0.75}>
            {fields.map((field) => (
              <Typography key={`adv-${field.id}`} sx={{ fontSize: 11, fontFamily: 'monospace' }}>
                {field.id} · {field.kind} · {registrationFieldTypeLabel(field)} · {field.screen || '—'} ·{' '}
                {field.valueSource || '—'}
                {field.ocrProperty ? ` · ocr=${field.ocrProperty}` : ''} · scope={field.scope}
                {field.enabled === false ? ' · disabled' : ''}
              </Typography>
            ))}
          </Stack>
        </Box>
      )}

      <FieldEditorDialog
        field={editing}
        allFields={fields}
        isAdmin={isAdmin}
        onClose={() => setEditing(null)}
        onSave={(nextField) => {
          const exists = fields.some((f) => f.id === nextField.id);
          const next = exists
            ? fields.map((f) => (f.id === nextField.id ? nextField : f))
            : [...fields, nextField];
          const enabledCustom = next.filter((f) => f.kind === 'custom' && f.enabled !== false).length;
          if (enabledCustom > customMax) {
            toast.error(customQuestionLimitError(role));
            return;
          }
          if (!isAdmin && nextField.kind === 'custom' && nextField.valueSource === 'ocr') {
            toast.error('Les questions personnalisées se remplissent manuellement.');
            return;
          }
          setEditing(null);
          updateFields(next);
        }}
      />

      <Dialog open={Boolean(presetConfirm)} onClose={() => setPresetConfirm(null)}>
        <DialogTitle>Appliquer un modèle</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13 }}>
            {presetConfirm ? presetConfirmMessage(presetConfirm) : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPresetConfirm(null)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={() => presetConfirm && applyPreset(presetConfirm)}
          >
            Appliquer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function FieldEditorDialog({
  field,
  allFields,
  isAdmin,
  onClose,
  onSave,
}: {
  field: RegistrationFieldDef | null;
  allFields: RegistrationFieldDef[];
  isAdmin: boolean;
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
      <DialogTitle>{custom ? 'Question personnalisée' : 'Information'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          {passportPhoto && (
            <Alert severity="info" sx={{ fontSize: 12 }}>
              {coreProtectedFieldExplanation(draft)}
            </Alert>
          )}
          <TextField
            label={custom ? 'Question affichée au voyageur' : 'Libellé'}
            size="small"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
          {custom && (
            <TextField
              select
              label="Type de réponse"
              size="small"
              value={draft.type === 'multi_select' ? 'select' : draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as RegistrationFieldType })}
            >
              {OWNER_FRIENDLY_FIELD_TYPES.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
          )}
          {isAdmin && !passportPhoto && (
            <>
              <TextField
                select
                label="Portée (admin)"
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
              <TextField
                select
                label="Écran (admin)"
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
              <TextField
                select
                label="Source (admin)"
                size="small"
                value={draft.valueSource === 'ocr' ? 'ocr' : 'manual'}
                onChange={(e) => setDraft(applySource(e.target.value as RegistrationValueSource))}
              >
                <MenuItem value="manual">Saisie manuelle</MenuItem>
                <MenuItem value="ocr">Passeport / OCR pris en charge</MenuItem>
              </TextField>
              {draft.valueSource === 'ocr' && custom && (
                <TextField
                  select
                  label="Propriété passeport / OCR"
                  size="small"
                  value={draft.ocrProperty || ''}
                  onChange={(e) => setDraft(applyOcrProperty(e.target.value as PassportOcrProperty))}
                >
                  {PASSPORT_OCR_PROPERTIES.map((prop) => (
                    <MenuItem key={prop} value={prop} disabled={takenOcr.has(prop)}>
                      {PASSPORT_OCR_PROPERTY_LABELS[prop]}
                      {takenOcr.has(prop) ? ' (déjà liée)' : ''}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              {typeAdjustedNotice && (
                <Alert severity="warning" sx={{ fontSize: 12 }}>
                  {typeAdjustedNotice}
                </Alert>
              )}
              {draft.valueSource === 'ocr' &&
                draft.ocrProperty &&
                disabledBuiltinOcrHint(allFields, draft.ocrProperty, draft.id) && (
                  <Alert severity="warning" sx={{ fontSize: 12 }}>
                    {disabledBuiltinOcrHint(allFields, draft.ocrProperty, draft.id)}
                  </Alert>
                )}
            </>
          )}
          {!isAdmin && custom && (
            <Alert severity="info" sx={{ fontSize: 12 }}>
              Cette question apparaîtra dans « Compléter l’enregistrement ». Elle n’est pas lue sur
              le passeport.
            </Alert>
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
                checked={draft.enabled !== false}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    enabled: e.target.checked,
                    required: e.target.checked ? draft.required : false,
                  })
                }
              />
            }
            label="WhatsApp (affiché au client)"
          />
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(draft.required) && draft.enabled !== false}
                disabled={draft.enabled === false}
                onChange={(e) => setDraft({ ...draft, required: e.target.checked, enabled: true })}
              />
            }
            label="Obligatoire pour le client"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          variant="contained"
          disabled={!String(draft.label || '').trim()}
          onClick={() =>
            onSave({
              ...draft,
              label: String(draft.label || '').trim(),
              ...(custom && !isAdmin
                ? { screen: 'completion', valueSource: 'manual', ocrProperty: undefined }
                : {}),
            })
          }
        >
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default RegistrationFormEditor;
