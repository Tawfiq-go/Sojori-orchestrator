// Service client — formulaire contact · SLA · catégories (persisté listing_service_client_config)
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Stack, Typography, IconButton, Collapse, CircularProgress, Alert } from '@mui/material';
import { toast } from 'react-toastify';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { listingsService } from '../../../../services/listingsService';
import { SOJORI_TOKENS as T, CONFIG_ORCH_FONT } from './types';
import {
  SectionHeader,
  Card,
  FormRow,
  NumInput,
  TextInput,
  AddRowBtn,
  Toggle,
  TYPO,
  ConfigIntroBar,
} from './SHARED';
import ServiceClientWhatsAppMenuPanel from './ServiceClientWhatsAppMenuPanel';
import {
  DEFAULT_SLA_HOURS,
  DEFAULT_SLA_MESSAGE_FR,
  DEFAULT_SERVICE_CLIENT_SUBJECTS,
  formatSlaGuestMessage,
  mapApiSubjectsToUi,
  mapUiSubjectsToApi,
  type ServiceClientSubject,
} from './serviceClientDefaults';

export type { ServiceClientSubject };

interface Props {
  listingId: string;
  ownerId?: string;
}

function SortableSubjectRow({
  subject,
  defaultExpanded = false,
  onUpdate,
  onDelete,
}: {
  subject: ServiceClientSubject;
  defaultExpanded?: boolean;
  onUpdate: (patch: Partial<ServiceClientSubject>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subject.id,
  });

  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
      }}
      sx={{
        bgcolor: T.bg2,
        border: `1px solid ${T.border}`,
        borderRadius: 1.25,
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          gap: 1,
          p: '10px 12px',
          bgcolor: T.bg1,
          borderBottom: expanded ? `1px solid ${T.border}` : 0,
        }}
      >
        <Box
          {...attributes}
          {...listeners}
          sx={{
            color: T.text3,
            cursor: 'grab',
            fontSize: 14,
            flexShrink: 0,
            userSelect: 'none',
            '&:active': { cursor: 'grabbing' },
          }}
        >
          ⠿
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setExpanded((e) => !e)}>
          <Typography sx={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.005em', lineHeight: 1.3 }}>
            {subject.labelFr || 'Sans libellé'}
          </Typography>
          <Typography
            sx={{
              fontSize: 10.5,
              fontFamily: CONFIG_ORCH_FONT.mono,
              fontWeight: 600,
              color: T.text3,
              mt: 0.25,
            }}
          >
            id : {subject.id}
          </Typography>
        </Box>
        <Toggle on={subject.enabled} sm onChange={() => onUpdate({ enabled: !subject.enabled })} />
        <IconButton
          size="small"
          onClick={onDelete}
          aria-label="Supprimer"
          sx={{
            width: 26,
            height: 26,
            color: T.text3,
            fontSize: 13,
            '&:hover': { bgcolor: T.errorTint, color: T.error },
          }}
        >
          ✕
        </IconButton>
      </Stack>

      <Collapse in={expanded}>
        <Box sx={{ p: '12px 14px' }}>
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: T.text2, mb: 0.75 }}>
            Libellé <Box component="span" sx={{ color: T.error }}>*</Box>
          </Typography>
          <TextInput
            value={subject.labelFr}
            onChange={(e) => onUpdate({ labelFr: e.target.value })}
            placeholder="Libellé affiché dans le formulaire"
            style={{ padding: '8px 10px', fontSize: 12.5 }}
          />
        </Box>
      </Collapse>
    </Box>
  );
}

export default function ServiceClientConfigTab({ listingId, ownerId }: Props) {
  const [enabled, setEnabled] = useState(true);
  const [slaHours, setSlaHours] = useState(DEFAULT_SLA_HOURS);
  const [slaMessageFr, setSlaMessageFr] = useState(DEFAULT_SLA_MESSAGE_FR);
  const [subjects, setSubjects] = useState<ServiceClientSubject[]>(DEFAULT_SERVICE_CLIENT_SUBJECTS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSaveRef = useRef(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const persist = useCallback(
    async (patch: {
      enabled?: boolean;
      responseSlaHours?: number;
      slaGuestMessage?: { fr: string; en?: string; ar?: string };
      subjects?: ServiceClientSubject[];
    }) => {
      if (!listingId) return;
      setSavingState('saving');
      try {
        const body: Record<string, unknown> = {};
        if (patch.enabled !== undefined) body.enabled = patch.enabled;
        if (patch.responseSlaHours !== undefined) body.responseSlaHours = patch.responseSlaHours;
        if (patch.slaGuestMessage !== undefined) body.slaGuestMessage = patch.slaGuestMessage;
        if (patch.subjects !== undefined) body.subjects = mapUiSubjectsToApi(patch.subjects);

        const res = await listingsService.updateListingServiceClientConfig(listingId, body, ownerId);
        if (res.error) throw new Error(res.error);
        setSavingState('saved');
        window.setTimeout(() => setSavingState('idle'), 2200);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Erreur enregistrement';
        setSavingState('error');
        toast.error(msg);
      }
    },
    [listingId, ownerId],
  );

  const scheduleSave = useCallback(
    (patch: Parameters<typeof persist>[0]) => {
      if (skipSaveRef.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persist(patch);
      }, 700);
    },
    [persist],
  );

  const fetchConfig = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    setLoadError(null);
    skipSaveRef.current = true;
    try {
      let res = await listingsService.getListingServiceClientConfig(listingId, ownerId);
      if (res.notFound || (res.error && !res.data)) {
        await listingsService.createListingServiceClientConfig(listingId, ownerId);
        res = await listingsService.getListingServiceClientConfig(listingId, ownerId);
      }
      if (res.error && !res.data) {
        throw new Error(res.error);
      }
      const doc = res.data as Record<string, unknown> | null;
      if (doc) {
        setEnabled(doc.enabled !== false);
        setSlaHours(typeof doc.responseSlaHours === 'number' ? doc.responseSlaHours : DEFAULT_SLA_HOURS);
        const msg = doc.slaGuestMessage as { fr?: string } | undefined;
        setSlaMessageFr(msg?.fr || DEFAULT_SLA_MESSAGE_FR);
        setSubjects(mapApiSubjectsToUi(doc.subjects as Parameters<typeof mapApiSubjectsToUi>[0]));
      }
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Chargement impossible');
      setSubjects(DEFAULT_SERVICE_CLIENT_SUBJECTS);
    } finally {
      setLoading(false);
      window.setTimeout(() => {
        skipSaveRef.current = false;
      }, 100);
    }
  }, [listingId, ownerId]);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setSubjects((list) => {
      const oldIndex = list.findIndex((s) => s.id === active.id);
      const newIndex = list.findIndex((s) => s.id === over.id);
      const next = arrayMove(list, oldIndex, newIndex);
      scheduleSave({ subjects: next, enabled, responseSlaHours: slaHours });
      return next;
    });
  };

  const updateSubject = (id: string, patch: Partial<ServiceClientSubject>) => {
    setSubjects((list) => {
      const next = list.map((s) => (s.id === id ? { ...s, ...patch } : s));
      scheduleSave({ subjects: next, enabled, responseSlaHours: slaHours });
      return next;
    });
  };

  const deleteSubject = (id: string) => {
    setSubjects((list) => {
      const next = list.filter((s) => s.id !== id);
      scheduleSave({ subjects: next, enabled, responseSlaHours: slaHours });
      return next;
    });
  };

  const addSubject = () => {
    const n = Date.now();
    setSubjects((list) => {
      const next = [...list, { id: `subject_${n}`, labelFr: 'Nouvelle catégorie', enabled: true }];
      scheduleSave({ subjects: next, enabled, responseSlaHours: slaHours });
      return next;
    });
  };

  const slaPreview = formatSlaGuestMessage(slaMessageFr, slaHours);
  const subjectCount = subjects.length;
  const waBadge = enabled ? 'WA · OUI' : 'WA · NON';
  const waKind = enabled ? 'wa-yes' : 'wa-no';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} sx={{ color: T.primary }} />
      </Box>
    );
  }

  return (
    <Box>
      <ConfigIntroBar saveState={savingState === 'error' ? 'idle' : savingState}>
        Service Client · SLA et catégories enregistrés en base (listing_service_client_config)
      </ConfigIntroBar>

      {loadError && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: 12.5 }}>
          {loadError} — valeurs par défaut affichées. Réessayez après actualisation.
        </Alert>
      )}

      <SectionHeader
        icon="💌"
        title="Service client"
        badge={waBadge}
        badgeKind={waKind}
        subtitle={
          <>
            Formulaire de contact pour les voyageurs. Désactivé : le service n’apparaît plus dans le menu.
          </>
        }
        toggle={enabled}
        onToggleChange={() => {
          const next = !enabled;
          setEnabled(next);
          scheduleSave({ enabled: next, responseSlaHours: slaHours, subjects });
        }}
        toggleLabel="Activer SC"
      />

      <Card icon="📱" title="Menu WhatsApp" subtitle="Option L — fenêtre de disponibilité (Support K)">
        <ServiceClientWhatsAppMenuPanel
          listingId={listingId}
          ownerId={ownerId}
          enabled={enabled}
          onEnabledChange={(on) => {
            setEnabled(on);
            scheduleSave({ enabled: on, responseSlaHours: slaHours, subjects });
          }}
        />
      </Card>

      <Card icon="⏱️" title="SLA · délai de réponse" subtitle="Affiché au voyageur après envoi du formulaire">
        <FormRow compact label="Délai de réponse affiché">
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <Box sx={{ maxWidth: 100 }}>
              <NumInput
                value={slaHours}
                min={1}
                max={168}
                onChange={(e) => {
                  const h = Math.max(1, Number(e.target.value) || 1);
                  setSlaHours(h);
                  scheduleSave({
                    responseSlaHours: h,
                    slaGuestMessage: { fr: slaMessageFr, en: slaMessageFr },
                    enabled,
                    subjects,
                  });
                }}
              />
            </Box>
            <Typography
              sx={{
                fontSize: 10,
                fontWeight: 800,
                fontFamily: CONFIG_ORCH_FONT.mono,
                color: T.text3,
                letterSpacing: '0.06em',
              }}
            >
              HEURES
            </Typography>
          </Stack>
        </FormRow>
        <Box sx={{ mt: 2, p: 1.5, bgcolor: T.bg2, borderRadius: 1, border: `1px solid ${T.border}` }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.text3, mb: 0.75 }}>
            Aperçu WhatsApp
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: T.text2, lineHeight: 1.5 }}>{slaPreview}</Typography>
        </Box>
      </Card>

      <Card
        icon="🏷️"
        title={`Catégories d'objet · ${subjectCount}`}
        subtitle="Choix obligatoire dans le formulaire guest"
      >
        <Box sx={{ opacity: enabled ? 1 : 0.5, pointerEvents: enabled ? 'auto' : 'none' }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={subjects.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <Stack sx={{ gap: 1 }}>
                {subjects.map((sub, idx) => (
                  <SortableSubjectRow
                    key={sub.id}
                    subject={sub}
                    defaultExpanded={idx === 0}
                    onUpdate={(patch) => updateSubject(sub.id, patch)}
                    onDelete={() => deleteSubject(sub.id)}
                  />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>

          <AddRowBtn onClick={addSubject}>+ Ajouter une catégorie</AddRowBtn>
        </Box>
        {!enabled && (
          <Typography sx={{ ...TYPO.caption, mt: 1 }}>
            Activez « Activer SC » pour proposer le formulaire dans WhatsApp.
          </Typography>
        )}
      </Card>
    </Box>
  );
}
