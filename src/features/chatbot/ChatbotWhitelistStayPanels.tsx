import type { ReactNode } from 'react';
import { useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { CHATBOT_T as T } from './chatbotTokens';
import { hourNumberToTimeInput } from '../../utils/listingTimeHelpers';

export type GuestContextTimeChoiceDetail = {
  time?: string | null;
  chosen?: boolean;
  source?: string;
  taskId?: string | null;
  feeMad?: number;
};

export type GuestContextDetail = {
  registration?: { total?: number; registered?: number; complete?: boolean };
  arrival?: {
    choose?: GuestContextTimeChoiceDetail;
    declare?: { yes?: boolean; time?: string | null };
  };
  departure?: {
    choose?: GuestContextTimeChoiceDetail;
    declare?: { yes?: boolean; time?: string | null };
  };
  cleaningFree?: { offered?: number; used?: number; remaining?: number };
  cleaningPaid?: { chosen?: boolean; time?: string | null };
  openTasks?: Array<{
    taskCode?: string;
    type?: string;
    status?: string;
    priority?: string;
    summary?: string;
    categoryId?: string;
    categoryCode?: string;
    categoryLabel?: string;
    categoryTitle?: string;
    categoryIcon?: string;
    categoryGroup?: string;
    createdAt?: string;
  }>;
};

export type ListingSupportCategory = {
  id?: string;
  icon?: string;
  enabled?: boolean;
  name?: { fr?: string; en?: string } | string;
};

export type ListingSnapshotDetail = {
  name?: string;
  city?: string;
  addressShort?: string;
  property?: {
    propertyType?: string;
    propertyUnit?: string;
    maxGuests?: number;
    personCapacity?: number;
    bedrooms?: number;
    bathrooms?: number;
    beds?: number;
    surface?: number;
    floor?: number;
    totalFloors?: number;
  };
  roomType?: { id?: string; name?: string };
  descriptions?: {
    fr?: { headline?: string; body?: string };
    en?: { headline?: string; body?: string };
  };
  checkIn?: { defaultStart?: number; defaultEnd?: number };
  checkOut?: { defaultTime?: number };
  legacyAccess?: { doorCode?: string; wifiUsername?: string; wifiPassword?: string };
  support?: { categories?: ListingSupportCategory[] };
  flags?: Record<string, boolean>;
  cleaning?: {
    frequency?: Array<{ startDay: number; endDay: number; numberOfCleaning: number }>;
    tsClean?: Array<{ start: number; end: number; default?: boolean }>;
    includedDescriptionFr?: string;
    paidConfig?: {
      enabled?: boolean;
      frequency?: 'all_days' | 'per_week';
      perWeekCount?: number;
      availableWeekdays?: number[];
      serviceTypes?: Array<{
        id?: string;
        enabled?: boolean;
        labelFr?: string;
        price?: number;
        timeslots?: Array<{ start: number; end: number; default?: boolean }>;
      }>;
    };
  };
};

export type { ListingCleaningSnapshot } from './utils/computeStayCleaningPreview';

function metric(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  return String(value);
}

function propertyTypeLabel(value?: string): string {
  if (!value) return '—';
  if (value === 'Apartment') return 'Appartement';
  if (value === 'House') return 'Maison';
  return value;
}

function timeSourceLabel(source?: string): string {
  if (source === 'guest') return 'voyageur';
  if (source === 'admin') return 'admin';
  if (source === 'default') return 'défaut listing';
  return source || '—';
}

function formatTimeChoice(choice?: GuestContextTimeChoiceDetail): string {
  const t = choice?.time?.trim();
  if (!t) return 'Non définie';
  if (choice?.chosen) {
    const fee =
      choice.feeMad != null && choice.feeMad > 0 ? ` · +${choice.feeMad} MAD` : '';
    return `✅ ${t} (${timeSourceLabel(choice.source)})${fee}`;
  }
  return `${t} (défaut listing · en attente confirmation)`;
}

function formatTaskIdRef(taskId?: string | null): string | null {
  if (!taskId?.trim()) return null;
  const id = taskId.trim();
  return id.length > 12 ? `…${id.slice(-12)}` : id;
}

function formatDeclare(yes?: boolean, time?: string | null): string {
  if (!yes) return 'Non déclaré';
  return time?.trim() ? `Oui · ${time.trim()}` : 'Oui';
}

function JourneyRow({
  icon,
  label,
  value,
  ok,
  meta,
}: {
  icon: string;
  label: string;
  value: string;
  ok?: boolean;
  meta?: string | null;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.25,
        p: 1.25,
        borderRadius: 1.25,
        border: `1px solid ${T.border}`,
        bgcolor: ok === undefined ? T.bg1 : ok ? 'rgba(10,143,94,0.08)' : 'rgba(196,101,6,0.08)',
      }}
    >
      <Typography sx={{ fontSize: 20, lineHeight: 1.2 }}>{icon}</Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 12, color: T.text3, fontWeight: 600 }}>{label}</Typography>
        <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: T.text, whiteSpace: 'pre-wrap' }}>
          {value}
        </Typography>
        {meta ? (
          <Typography
            sx={{
              fontSize: 10.5,
              fontFamily: 'Geist Mono, monospace',
              color: T.text3,
              mt: 0.35,
            }}
          >
            {meta}
          </Typography>
        ) : null}
      </Box>
      {ok !== undefined && (
        <Chip
          size="small"
          label={ok ? 'OK' : 'En attente'}
          sx={{
            fontWeight: 700,
            fontSize: 10.5,
            bgcolor: ok ? 'rgba(10,143,94,0.12)' : 'rgba(196,101,6,0.12)',
            color: ok ? T.success : T.warning,
          }}
        />
      )}
    </Box>
  );
}

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        sx={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: T.text3,
          mb: 1,
        }}
      >
        {title}
      </Typography>
      <Stack spacing={0.75}>{children}</Stack>
    </Box>
  );
}

function InfoLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      <Typography sx={{ fontSize: 12, color: T.text3, minWidth: 140 }}>{label}</Typography>
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: T.text, flex: 1 }}>{value}</Typography>
    </Box>
  );
}

function categoryNameFromListing(cat: ListingSupportCategory, lang = 'fr'): string {
  const n = cat.name;
  if (typeof n === 'string') return n;
  if (n && typeof n === 'object') return n[lang as 'fr'] ?? n.fr ?? n.en ?? 'Catégorie';
  return 'Catégorie';
}

function resolveSupportCategoryLabel(
  task: NonNullable<GuestContextDetail['openTasks']>[number],
  categories: ListingSupportCategory[],
): string {
  if (task.categoryLabel?.trim()) return task.categoryLabel.trim();
  if (task.categoryTitle?.trim()) {
    return task.categoryTitle.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, '').trim();
  }
  const key = task.categoryId ?? task.categoryCode;
  if (key && categories.length) {
    const hit = categories.find((c) => String(c.id) === key);
    if (hit) {
      const icon = hit.icon ? `${hit.icon} ` : '';
      return `${icon}${categoryNameFromListing(hit)}`.trim();
    }
  }
  return 'Support';
}

function formatSupportTaskDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function supportStatusChip(status?: string): { label: string; color: string; bg: string } {
  const s = String(status || 'new').toLowerCase();
  if (s === 'doing' || s === 'confirmed') {
    return { label: 'En cours', color: T.info, bg: 'rgba(37,99,235,0.1)' };
  }
  if (s === 'waiting_guest') {
    return { label: 'Attente client', color: T.warning, bg: 'rgba(196,101,6,0.12)' };
  }
  if (s === 'pending_partner') {
    return { label: 'Attente partenaire', color: T.warning, bg: 'rgba(196,101,6,0.12)' };
  }
  return { label: 'Ouverte', color: T.warning, bg: 'rgba(196,101,6,0.12)' };
}

function priorityDot(priority?: string): string {
  if (priority === 'critical') return '🔴';
  if (priority === 'urgent' || priority === 'high') return '🟡';
  return '🟢';
}

const SUPPORT_PREVIEW_COUNT = 3;

function SupportOpenTasksPanel({
  tasks,
  categories,
}: {
  tasks: NonNullable<GuestContextDetail['openTasks']>;
  categories: ListingSupportCategory[];
}) {
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const sorted = [...tasks].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
  const visible = showAll ? sorted : sorted.slice(0, SUPPORT_PREVIEW_COUNT);
  const hiddenCount = Math.max(0, sorted.length - SUPPORT_PREVIEW_COUNT);

  return (
    <Box
      sx={{
        mt: 0.5,
        borderRadius: 1.5,
        border: `1px solid ${T.border}`,
        overflow: 'hidden',
        bgcolor: T.bg1,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1.25,
          py: 1,
          bgcolor: 'rgba(230,74,25,0.06)',
          borderBottom: expanded ? `1px solid ${T.border}` : 'none',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.text, flex: 1 }}>
          🆘 Demandes support ({sorted.length})
        </Typography>
        <Chip
          size="small"
          label={`${sorted.filter((t) => String(t.status).toLowerCase() === 'new').length} ouverte(s)`}
          sx={{ height: 22, fontSize: 10, fontWeight: 700 }}
        />
        <IconButton
          size="small"
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
          aria-label={expanded ? 'Replier' : 'Déplier'}
        >
          <ExpandMoreIcon fontSize="small" />
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <Stack spacing={1} sx={{ p: 1.25 }}>
          {visible.map((task) => {
            const catLabel = resolveSupportCategoryLabel(task, categories);
            const st = supportStatusChip(task.status);
            const when = formatSupportTaskDate(task.createdAt);
            const desc = task.summary?.trim();
            return (
              <Box
                key={task.taskCode || `${catLabel}-${when}`}
                sx={{
                  p: 1.25,
                  borderRadius: 1.25,
                  border: `1px solid ${T.border}`,
                  bgcolor: '#fff',
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.text, flex: 1, minWidth: 160 }}>
                    {catLabel}
                  </Typography>
                  <Chip
                    size="small"
                    label={st.label}
                    sx={{ height: 22, fontSize: 10, fontWeight: 700, bgcolor: st.bg, color: st.color }}
                  />
                </Stack>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center',  mt: 0.75, flexWrap: 'wrap' }}>
                  <Typography
                    sx={{
                      fontFamily: 'Geist Mono, monospace',
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: T.primaryDeep,
                    }}
                  >
                    {task.taskCode || '—'}
                  </Typography>
                  {(task.categoryId ?? task.categoryCode) ? (
                    <Typography sx={{ fontSize: 10.5, color: T.text3, fontFamily: 'Geist Mono, monospace' }}>
                      {task.categoryId ?? task.categoryCode}
                    </Typography>
                  ) : null}
                  <Typography sx={{ fontSize: 11 }}>{priorityDot(task.priority)}</Typography>
                  {when ? (
                    <Typography sx={{ fontSize: 10.5, color: T.text3 }}>{when}</Typography>
                  ) : null}
                </Stack>
                {desc ? (
                  <Box sx={{ mt: 0.75 }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase' }}>
                      Description
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 12.5,
                        color: T.text2,
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {desc}
                    </Typography>
                  </Box>
                ) : null}
              </Box>
            );
          })}
          {hiddenCount > 0 && !showAll ? (
            <Typography
              component="button"
              type="button"
              onClick={() => setShowAll(true)}
              sx={{
                fontSize: 12,
                fontWeight: 600,
                color: T.primaryDeep,
                border: 'none',
                bgcolor: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                p: 0.5,
              }}
            >
              + Voir {hiddenCount} autre{hiddenCount > 1 ? 's' : ''} demande{hiddenCount > 1 ? 's' : ''}
            </Typography>
          ) : null}
          {showAll && hiddenCount > 0 ? (
            <Typography
              component="button"
              type="button"
              onClick={() => setShowAll(false)}
              sx={{
                fontSize: 12,
                fontWeight: 600,
                color: T.text3,
                border: 'none',
                bgcolor: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                p: 0.5,
              }}
            >
              Replier la liste
            </Typography>
          ) : null}
        </Stack>
      </Collapse>
    </Box>
  );
}

export function GuestJourneyDetailPanel({
  gc,
  listingSnapshot,
}: {
  gc: GuestContextDetail | null | undefined;
  listingSnapshot?: ListingSnapshotDetail | null;
}) {
  if (!gc) {
    return (
      <Typography sx={{ fontSize: 13, color: T.text3, py: 2 }}>
        Parcours séjour pas encore synchronisé (fulltask guest_context).
      </Typography>
    );
  }

  const rows = [
    {
      icon: '👥',
      label: 'Enregistrement voyageurs',
      value: `${gc.registration?.registered ?? 0} / ${gc.registration?.total ?? '?'}`,
      ok: Boolean(gc.registration?.complete),
    },
    {
      icon: '🛬',
      label: 'Heure arrivée (choisie)',
      value: formatTimeChoice(gc.arrival?.choose),
      ok: Boolean(gc.arrival?.choose?.chosen),
      meta: gc.arrival?.choose?.taskId
        ? `arrival_choose · ${formatTaskIdRef(gc.arrival.choose.taskId)}`
        : null,
    },
    {
      icon: '📍',
      label: 'Arrivée déclarée',
      value: formatDeclare(gc.arrival?.declare?.yes, gc.arrival?.declare?.time),
      ok: Boolean(gc.arrival?.declare?.yes),
    },
    {
      icon: '🛫',
      label: 'Heure départ (choisie)',
      value: formatTimeChoice(gc.departure?.choose),
      ok: Boolean(gc.departure?.choose?.chosen),
      meta: gc.departure?.choose?.taskId
        ? `departure_choose · ${formatTaskIdRef(gc.departure.choose.taskId)}`
        : null,
    },
    {
      icon: '🚪',
      label: 'Départ déclaré',
      value: formatDeclare(gc.departure?.declare?.yes, gc.departure?.declare?.time),
      ok: Boolean(gc.departure?.declare?.yes),
    },
    {
      icon: '🧹',
      label: 'Ménage gratuit',
      value: `${gc.cleaningFree?.used ?? 0} utilisé · ${gc.cleaningFree?.remaining ?? 0} restant / ${gc.cleaningFree?.offered ?? 0} offert`,
      ok: (gc.cleaningFree?.remaining ?? 0) > 0 || (gc.cleaningFree?.offered ?? 0) === 0,
    },
    {
      icon: '💳',
      label: 'Ménage payant',
      value: gc.cleaningPaid?.chosen
        ? `Choisi${gc.cleaningPaid.time ? ` · ${gc.cleaningPaid.time}` : ''}`
        : 'Non choisi',
      ok: Boolean(gc.cleaningPaid?.chosen),
    },
  ];

  const openTasks = Array.isArray(gc.openTasks) ? gc.openTasks : [];
  const supportTasks = openTasks.filter((t) => String(t.type) === 'support');
  const otherTasks = openTasks.filter((t) => String(t.type) !== 'support');
  const supportCategories = listingSnapshot?.support?.categories ?? [];

  return (
    <Stack spacing={1}>
      {rows.map((r) => (
        <JourneyRow key={r.label} icon={r.icon} label={r.label} value={r.value} ok={r.ok} meta={r.meta} />
      ))}
      {supportTasks.length > 0 ? (
        <SupportOpenTasksPanel tasks={supportTasks} categories={supportCategories} />
      ) : null}
      {otherTasks.length > 0 ? (
        <InfoBlock title="Autres demandes ouvertes">
          {otherTasks.slice(0, 5).map((task) => (
            <InfoLine
              key={`${task.taskCode}-${task.type}`}
              label={task.taskCode || task.type || 'Task'}
              value={`${task.status || '—'}${task.summary ? ` · ${task.summary}` : ''}`}
            />
          ))}
        </InfoBlock>
      ) : null}
    </Stack>
  );
}

export function ListingInfoPanel({ snap }: { snap: ListingSnapshotDetail | null | undefined }) {
  if (!snap) {
    return (
      <Typography sx={{ fontSize: 13, color: T.text3, py: 2 }}>
        Snapshot listing non synchronisé — relancer Sync FullChatbot depuis le listing.
      </Typography>
    );
  }

  const p = snap.property ?? {};
  const checkInStart = hourNumberToTimeInput(snap.checkIn?.defaultStart);
  const checkInEnd = hourNumberToTimeInput(snap.checkIn?.defaultEnd);
  const checkOut = hourNumberToTimeInput(snap.checkOut?.defaultTime);
  const wifiUser = snap.legacyAccess?.wifiUsername;
  const wifiPass = snap.legacyAccess?.wifiPassword;

  return (
    <Stack spacing={2}>
      <InfoBlock title="🏠 Informations générales">
        <InfoLine label="Nom annonce (OTA)" value={snap.name || '—'} />
        <InfoLine label="Type de bien" value={propertyTypeLabel(p.propertyType)} />
        <InfoLine label="Unité de propriété" value={p.propertyUnit || 'Single'} />
        <InfoLine
          label="Room type"
          value={
            snap.roomType?.name || snap.roomType?.id ? (
              <>
                {snap.roomType?.name || '—'}
                {snap.roomType?.id ? (
                  <Typography
                    component="span"
                    sx={{ display: 'block', fontFamily: 'Geist Mono, monospace', fontSize: 11, color: T.text3 }}
                  >
                    {snap.roomType.id}
                  </Typography>
                ) : null}
              </>
            ) : (
              '—'
            )
          }
        />
        <InfoLine label="Capacité standard" value={metric(p.personCapacity)} />
        <InfoLine label="Capacité max" value={metric(p.maxGuests)} />
        <InfoLine label="Surface (m²)" value={metric(p.surface)} />
        <InfoLine
          label="Étage / immeuble"
          value={
            p.floor != null || p.totalFloors != null
              ? `${metric(p.floor)} / ${metric(p.totalFloors)}`
              : '—'
          }
        />
        <InfoLine label="Ville" value={snap.city || '—'} />
        <InfoLine label="Adresse" value={snap.addressShort || '—'} />
      </InfoBlock>

      <InfoBlock title="🛏 Chambres & lits">
        <Stack direction="row" sx={{ gap: 3, flexWrap: 'wrap' }}>
          <Box>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase' }}>
              Chambres
            </Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{metric(p.bedrooms)}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase' }}>
              Salles de bain
            </Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{metric(p.bathrooms)}</Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase' }}>
              Lits
            </Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{metric(p.beds)}</Typography>
          </Box>
        </Stack>
      </InfoBlock>

      <InfoBlock title="🕐 Horaires par défaut (listing)">
        <InfoLine
          label="Check-in"
          value={
            checkInStart || checkInEnd
              ? `${checkInStart || '—'} → ${checkInEnd || '—'}`
              : '—'
          }
        />
        <InfoLine label="Check-out" value={checkOut || '—'} />
      </InfoBlock>

      <InfoBlock title="📶 Accès & WiFi">
        <InfoLine label="WiFi utilisateur" value={wifiUser || '—'} />
        <InfoLine label="WiFi mot de passe" value={wifiPass || '—'} />
        {snap.legacyAccess?.doorCode ? (
          <InfoLine label="Code porte" value={snap.legacyAccess.doorCode} />
        ) : null}
      </InfoBlock>

      {(snap.descriptions?.fr?.headline ||
        snap.descriptions?.fr?.body ||
        snap.descriptions?.en?.headline ||
        snap.descriptions?.en?.body) && (
        <InfoBlock title="📝 Descriptions">
          {snap.descriptions?.fr?.headline ? (
            <InfoLine label="🇫🇷 Résumé court" value={snap.descriptions.fr.headline} />
          ) : null}
          {snap.descriptions?.fr?.body ? (
            <InfoLine label="🇫🇷 Description" value={snap.descriptions.fr.body} />
          ) : null}
          {snap.descriptions?.en?.headline ? (
            <InfoLine label="🇬🇧 Headline" value={snap.descriptions.en.headline} />
          ) : null}
          {snap.descriptions?.en?.body ? (
            <InfoLine label="🇬🇧 Description" value={snap.descriptions.en.body} />
          ) : null}
        </InfoBlock>
      )}
    </Stack>
  );
}

const JOURNEY_TASK_TYPES = new Set([
  'registration',
  'arrival_choose',
  'arrival_declare',
  'departure_choose',
  'departure_declare',
  'cleaning_free',
  'cleaning_paid',
]);

const JOURNEY_TYPE_ORDER: Record<string, number> = {
  registration: 1,
  arrival_choose: 2,
  arrival_declare: 3,
  cleaning_free: 4,
  cleaning_paid: 5,
  departure_choose: 6,
  departure_declare: 7,
};

function formatTaskPlannedDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}

function taskTypeLabel(type?: string): string {
  const labels: Record<string, string> = {
    registration: '📝 Enregistrement',
    arrival_choose: '🛬 Choisir arrivée',
    arrival_declare: '🛬 Déclarer arrivée',
    departure_choose: '🛫 Choisir départ',
    departure_declare: '🛫 Déclarer départ',
    cleaning_free: '🧹 Ménage gratuit',
    cleaning_paid: '✨ Ménage payant',
  };
  return labels[String(type || '')] || String(type || '—');
}

function taskSubline(task: {
  type?: string;
  adults?: number;
  nbreGuestValidated?: number;
  plannedTime?: string | null;
}): string | null {
  const typ = String(task.type || '');
  if (typ === 'registration' && task.adults != null) {
    const done = task.nbreGuestValidated ?? 0;
    return `${done}/${task.adults} enreg.`;
  }
  return null;
}

export function OrchestrationTasksPanel({
  tasks,
  loading,
}: {
  tasks: Array<{
    itemNumber?: string;
    type?: string;
    subType?: string;
    startDate?: string;
    taskStatus?: string;
    plannedTime?: string | null;
    hourSource?: string;
    adults?: number;
    nbreGuestValidated?: number;
    source?: string;
  }>;
  loading?: boolean;
}) {
  const journeyTasks = tasks
    .filter((t) => JOURNEY_TASK_TYPES.has(String(t.type || t.subType || '')))
    .sort((a, b) => {
      const ta = String(a.type || a.subType || '');
      const tb = String(b.type || b.subType || '');
      const oa = JOURNEY_TYPE_ORDER[ta] ?? 99;
      const ob = JOURNEY_TYPE_ORDER[tb] ?? 99;
      if (oa !== ob) return oa - ob;
      const da = a.startDate ? new Date(a.startDate).getTime() : 0;
      const db = b.startDate ? new Date(b.startDate).getTime() : 0;
      return da - db;
    });

  if (loading) {
    return (
      <Typography sx={{ fontSize: 13, color: T.text3, py: 2 }}>
        Chargement des tâches orchestration…
      </Typography>
    );
  }

  if (journeyTasks.length === 0) {
    return (
      <Typography sx={{ fontSize: 13, color: T.text3, py: 2 }}>
        Aucune tâche parcours séjour pour cette réservation.
      </Typography>
    );
  }

  return (
    <Box sx={{ overflowX: 'auto', mt: 2 }}>
      <Typography
        sx={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: T.text3,
          mb: 1,
        }}
      >
        Tâches orchestration (aligné /tasks)
      </Typography>
      <Box component="table" sx={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', fontSize: 12 }}>
        <Box component="thead">
          <Box component="tr" sx={{ bgcolor: T.bg2 }}>
            {['Code', 'Type', 'Prévu', 'Heure', 'Statut'].map((h) => (
              <Box
                component="th"
                key={h}
                sx={{
                  textAlign: 'left',
                  px: 1,
                  py: 0.75,
                  fontSize: 10,
                  fontWeight: 700,
                  color: T.text3,
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                {h}
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {journeyTasks.map((task) => {
            const typ = String(task.type || task.subType || '');
            const sub = taskSubline(task);
            const status = task.taskStatus === 'CREATED' ? 'Créée' : task.taskStatus || '—';
            return (
              <Box
                component="tr"
                key={String(task.itemNumber)}
                sx={{ '& > td': { borderBottom: `1px solid ${T.border}`, px: 1, py: 0.85, verticalAlign: 'top' } }}
              >
                <Box component="td">
                  <Typography sx={{ fontFamily: 'Geist Mono, monospace', fontSize: 11, fontWeight: 700, color: T.primaryDeep }}>
                    {task.itemNumber || '—'}
                  </Typography>
                </Box>
                <Box component="td">
                  <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{taskTypeLabel(typ)}</Typography>
                  {sub ? (
                    <Typography sx={{ fontSize: 10.5, color: T.text3, mt: 0.25 }}>{sub}</Typography>
                  ) : null}
                </Box>
                <Box component="td">
                  <Typography sx={{ fontSize: 12 }}>{formatTaskPlannedDate(task.startDate)}</Typography>
                </Box>
                <Box component="td">
                  {task.plannedTime ? (
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        color:
                          task.hourSource === 'client'
                            ? T.success
                            : task.hourSource === 'admin'
                              ? T.warning
                              : T.info,
                      }}
                    >
                      {task.plannedTime}
                    </Typography>
                  ) : (
                    <Typography sx={{ fontSize: 12, color: T.text4 }}>—</Typography>
                  )}
                </Box>
                <Box component="td">
                  <Chip
                    size="small"
                    label={status}
                    sx={{ height: 20, fontSize: 10, fontWeight: 600 }}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
