import { useMemo, useState, type ReactNode } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Chip, Collapse, IconButton, Stack, Typography } from '@mui/material';
import { CHATBOT_T as T } from './chatbotTokens';
import {
  computeStayCleaningPreview,
  type ListingCleaningSnapshot,
  type StayCleaningDay,
} from './utils/computeStayCleaningPreview';

function CollapseSection({
  title,
  subtitle,
  count,
  countColor,
  defaultOpen = true,
  children,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  countColor?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Box
      sx={{
        borderRadius: 1.5,
        border: `1px solid ${T.border}`,
        overflow: 'hidden',
        bgcolor: '#fff',
      }}
    >
      <Box
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.25,
          py: 1,
          cursor: 'pointer',
          bgcolor: T.bg1,
          borderBottom: open ? `1px solid ${T.border}` : 'none',
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.text, flex: 1 }}>{title}</Typography>
        {count != null ? (
          <Chip
            size="small"
            label={count}
            sx={{
              height: 22,
              fontWeight: 800,
              fontSize: 11,
              bgcolor: countColor ?? 'rgba(10,143,94,0.12)',
              color: countColor ? '#fff' : T.success,
            }}
          />
        ) : null}
        <IconButton
          size="small"
          sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          aria-label={open ? 'Replier' : 'Déplier'}
        >
          <ExpandMoreIcon fontSize="small" />
        </IconButton>
      </Box>
      {subtitle ? (
        <Typography sx={{ fontSize: 11, color: T.text3, px: 1.25, py: 0.75, bgcolor: T.bg1 }}>{subtitle}</Typography>
      ) : null}
      <Collapse in={open}>
        <Box sx={{ p: 1.25 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}

function SummaryChip({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'gold' | 'muted' | 'warn' }) {
  const bg =
    tone === 'green'
      ? 'rgba(10,143,94,0.1)'
      : tone === 'gold'
        ? 'rgba(184,133,26,0.12)'
        : tone === 'warn'
          ? 'rgba(196,101,6,0.1)'
          : T.bg1;
  const color =
    tone === 'green' ? T.success : tone === 'gold' ? T.primaryDeep : tone === 'warn' ? T.warning : T.text2;
  return (
    <Box
      sx={{
        px: 1.25,
        py: 1,
        borderRadius: 1.25,
        border: `1px solid ${T.border}`,
        bgcolor: bg,
        minWidth: 120,
        flex: '1 1 140px',
      }}
    >
      <Typography sx={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 800, color, mt: 0.25, fontFamily: 'Geist Mono, monospace' }}>
        {value}
      </Typography>
    </Box>
  );
}

function DayRow({ day, badge }: { day: StayCleaningDay; badge: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        py: 0.75,
        px: 1,
        borderRadius: 1,
        border: `1px solid ${T.border}`,
        bgcolor: T.bg1,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.text }}>
          {day.dateLabel}
          <Typography component="span" sx={{ fontSize: 11, color: T.text3, ml: 0.75, fontWeight: 600 }}>
            J{day.dayOfStay} · {day.weekdayLabel}
          </Typography>
        </Typography>
        {day.blockReason ? (
          <Typography sx={{ fontSize: 11, color: T.warning, mt: 0.25 }}>{day.blockReason}</Typography>
        ) : null}
      </Box>
      <Chip size="small" label={badge} sx={{ fontWeight: 700, fontSize: 10, height: 22 }} />
    </Box>
  );
}

function DayList({ days, empty, badge }: { days: StayCleaningDay[]; empty: string; badge: string }) {
  if (days.length === 0) {
    return (
      <Typography sx={{ fontSize: 12, color: T.text3, fontStyle: 'italic' }}>{empty}</Typography>
    );
  }
  return (
    <Stack spacing={0.75}>
      {days.map((d) => (
        <DayRow key={d.date} day={d} badge={badge} />
      ))}
    </Stack>
  );
}

export function ChatbotCleaningSchedulePanel({
  checkIn,
  checkOut,
  cleaning,
  guestCleaningFree,
  freeCleaningEnabled = true,
  paidCleaningEnabled = true,
}: {
  checkIn?: string | Date | null;
  checkOut?: string | Date | null;
  cleaning?: ListingCleaningSnapshot | null;
  guestCleaningFree?: { offered?: number; used?: number; remaining?: number };
  freeCleaningEnabled?: boolean;
  paidCleaningEnabled?: boolean;
}) {
  const preview = useMemo(() => {
    if (!checkIn || !checkOut) return null;
    return computeStayCleaningPreview({
      checkIn,
      checkOut,
      cleaning,
      freeCleaningEnabled,
      paidCleaningEnabled,
    });
  }, [checkIn, checkOut, cleaning, freeCleaningEnabled, paidCleaningEnabled]);

  if (!preview) {
    return (
      <Typography sx={{ fontSize: 13, color: T.text3 }}>
        Dates de séjour manquantes — impossible de calculer le plan ménage.
      </Typography>
    );
  }

  const gcUsed = guestCleaningFree?.used ?? 0;
  const gcOffered = guestCleaningFree?.offered ?? preview.freeOffered;
  const gcRemaining = guestCleaningFree?.remaining ?? Math.max(0, gcOffered - gcUsed);

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>
          Synthèse calcul (config listing → séjour)
        </Typography>
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          <SummaryChip label="Nuits" value={String(preview.nights)} />
          <SummaryChip label="Jours milieu séjour" value={String(preview.midStayDayCount)} tone="muted" />
          <SummaryChip label="Gratuits (calc.)" value={String(preview.freeDayCount)} tone="green" />
          <SummaryChip label="Payants éligibles" value={String(preview.paidEligibleCount)} tone="gold" />
          <SummaryChip label="Jours bloqués" value={String(preview.paidBlockedDays.length)} tone="warn" />
        </Stack>
      </Box>

      {preview.tierLabel ? (
        <Typography sx={{ fontSize: 12, color: T.text2 }}>
          Palier <b>frequency[]</b> : {preview.tierLabel}
          {cleaning?.includedDescriptionFr ? ` · ${cleaning.includedDescriptionFr}` : ''}
        </Typography>
      ) : (
        <Typography sx={{ fontSize: 12, color: T.warning }}>
          Aucun palier frequency[] pour {preview.nights} nuit{preview.nights > 1 ? 's' : ''} — 0 ménage inclus calculé.
        </Typography>
      )}

      <Typography sx={{ fontSize: 11.5, color: T.text3 }}>
        Guest context : {gcUsed} utilisé · {gcRemaining} restant / {gcOffered} offert (fulltask)
      </Typography>

      <CollapseSection
        title="⏰ Créneaux horaires (TS_CLEAN)"
        subtitle="Créneaux proposés pour les ménages inclus / flow WhatsApp"
        count={preview.tsCleanSlots.length}
        defaultOpen
      >
        <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
          {preview.tsCleanSlots.map((s) => (
            <Chip
              key={s.label}
              size="small"
              label={s.default ? `⭐ ${s.label}` : s.label}
              sx={{
                fontWeight: 700,
                fontFamily: 'Geist Mono, monospace',
                bgcolor: s.default ? 'rgba(10,143,94,0.1)' : T.bg1,
              }}
            />
          ))}
        </Stack>
      </CollapseSection>

      <CollapseSection
        title="🟢 Ménages inclus (gratuits)"
        subtitle="Répartition uniforme entre arrivée et départ (jours exclus : arrivée & départ)"
        count={preview.freeDays.filter((d) => d.kind === 'free_included').length}
        countColor="rgba(10,143,94,0.85)"
        defaultOpen
      >
        <DayList
          days={preview.freeDays}
          empty="Aucun jour inclus calculé pour ce séjour."
          badge="Inclus"
        />
      </CollapseSection>

      <CollapseSection
        title="💵 Ménages payants — jours éligibles"
        subtitle={preview.paidFrequencyLabel}
        count={preview.paidEligibleCount}
        countColor="rgba(184,133,26,0.9)"
        defaultOpen
      >
        <Typography sx={{ fontSize: 11.5, color: T.text3, mb: 1 }}>
          Jours autorisés : <b>{preview.paidWeekdaysLabel}</b>
          {preview.minPaidPriceMad != null ? ` · dès ${preview.minPaidPriceMad} MAD` : ''}
          {preview.paidPerWeekMax != null ? ` · plafond ${preview.paidPerWeekMax} / semaine (choix guest)` : ''}
        </Typography>
        <DayList
          days={preview.paidEligibleDays}
          empty="Aucun jour payant éligible (tous inclus ou bloqués)."
          badge="Payant"
        />
      </CollapseSection>

      {preview.paidBlockedDays.length > 0 ? (
        <CollapseSection
          title="🚫 Jours non proposés en payant"
          subtitle="Hors jours autorisés ou ménage payant désactivé"
          count={preview.paidBlockedDays.length}
          countColor="rgba(120,120,120,0.85)"
          defaultOpen={false}
        >
          <DayList days={preview.paidBlockedDays} empty="" badge="Bloqué" />
        </CollapseSection>
      ) : null}
    </Stack>
  );
}
