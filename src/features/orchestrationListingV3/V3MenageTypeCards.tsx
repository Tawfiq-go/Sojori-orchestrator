import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Box, Stack, Switch, TextField, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import listingsService from '../../services/listingsService';
import {
  normalizeMenageOps,
  parseMenageOpsFromSources,
  type MenageOpsConfig,
} from '../listing/components/ConfigOrchestration/menageOpsTypes';
import { V3 } from './theme';
import type { BaremeViewState } from './menageBareme';
import {
  formatTierRange,
  levelDurationsSubtitle,
  parseFrequencyTiers,
  real30j,
  type Real30j,
} from './menageTypeCards';

type Props = {
  listingId: string;
  /** Doc listing (menageOps, frequency…). */
  listingValues: Record<string, unknown>;
  /** État barème partagé (réel 30 j par niveau). */
  baremeView: BaremeViewState | null;
  /** Remonte le doc local après écriture (menageOps). */
  onListingPatch?: (patch: Record<string, unknown>) => void;
};

const cardSx = {
  border: `1px solid ${V3.b}`,
  borderRadius: '14px',
  bgcolor: V3.card,
  overflow: 'hidden',
};

const sectionLabelSx = {
  fontSize: 10,
  fontWeight: 800,
  color: V3.t4,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
} as const;

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    fontSize: 13,
    bgcolor: '#fff',
    '& fieldset': { borderColor: V3.b },
    '&:hover fieldset': { borderColor: V3.bs },
    '&.Mui-focused fieldset': { borderColor: V3.p },
  },
  '& .MuiInputLabel-root': { fontSize: 12 },
};

/** Cartes de types ménage — maquette validée. Écrit menageOps via le même
 *  canal que MenageOpsPanel (updateListingProperty), champ par champ. */
export default function V3MenageTypeCards({
  listingId,
  listingValues,
  baremeView,
  onListingPatch,
}: Props) {
  const [cfg, setCfg] = useState<MenageOpsConfig>(() =>
    parseMenageOpsFromSources(undefined, listingValues),
  );
  const savedRef = useRef<MenageOpsConfig>(cfg);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ recouche: true });

  useEffect(() => {
    const next = parseMenageOpsFromSources(undefined, listingValues);
    setCfg(next);
    savedRef.current = next;
  }, [listingValues]);

  /** Édition locale sans écriture (champs texte pendant la frappe). */
  const edit = (mutate: (c: MenageOpsConfig) => MenageOpsConfig) => {
    setCfg(prev => mutate(prev));
  };

  /** Écriture serveur (blur / toggle) — optimistic + rollback, comme la Politique. */
  const commit = (mutate?: (c: MenageOpsConfig) => MenageOpsConfig) => {
    const next = normalizeMenageOps(mutate ? mutate(cfg) : cfg);
    if (JSON.stringify(next) === JSON.stringify(savedRef.current)) {
      setCfg(next);
      return;
    }
    const prev = savedRef.current;
    setCfg(next);
    setSaving(true);
    listingsService
      .updateListingProperty(listingId, {
        menageOps: next,
        includedAlways: next.included.always === true,
      })
      .then(() => {
        savedRef.current = next;
        onListingPatch?.({ menageOps: next, includedAlways: next.included.always === true });
      })
      .catch((e: unknown) => {
        setCfg(prev);
        toast.error(e instanceof Error ? e.message : 'Impossible d’enregistrer la config ménage');
      })
      .finally(() => setSaving(false));
  };

  const tiers = parseFrequencyTiers(listingValues.frequency);
  const flex = cfg.flexibility;
  const cadenceAlways = cfg.included.always === true;
  const cadenceEvery = Math.max(1, Number(cfg.included.everyNDays) || 1);
  const recoucheBadge = !cfg.included.enabled
    ? { label: 'Off', tone: 'or' as const }
    : cadenceAlways && cadenceEvery >= 2
      ? { label: 'Incluse · jours alternés', tone: 'teal' as const }
      : cadenceAlways
        ? { label: 'Incluse · tous les jours', tone: 'teal' as const }
        : { label: 'Incluse · paliers', tone: 'teal' as const };
  const recoucheSubtitle = cadenceAlways
    ? cadenceEvery >= 2
      ? 'Un passage un jour sur deux pendant le séjour · hors arrivée / départ · le guest choisit l’heure'
      : 'Un passage chaque jour pendant le séjour · hors arrivée / départ · le guest choisit l’heure'
    : 'Proposée par l’occupation · paliers selon la durée du séjour · au-delà du quota : payante';

  return (
    <Stack sx={{ gap: 1.5 }}>
      {saving && (
        <Typography sx={{ fontSize: 10.5, color: V3.t4, fontFamily: 'monospace', textAlign: 'right' }}>
          Enregistrement…
        </Typography>
      )}

      {/* ── Recouche · pendant le séjour (dépliée) ─────────────────── */}
      <TypeCard
        emoji="🧹"
        title="Recouche · pendant le séjour"
        subtitle={recoucheSubtitle}
        badges={[recoucheBadge]}
        enabled={cfg.included.enabled}
        onToggle={v => commit(c => ({ ...c, included: { ...c.included, enabled: v } }))}
        expanded={expanded.recouche === true}
        onExpand={() => setExpanded(e => ({ ...e, recouche: !e.recouche }))}
        accent
      >
        {/* Cadence */}
        <Section
          label="Cadence pendant le séjour"
          caption="Tous les jours, jours alternés, ou paliers selon la durée. Hors jour d’arrivée et de départ."
        >
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {(
              [
                { id: 'daily', label: 'Tous les jours' },
                { id: 'alt', label: 'Jours alternés' },
                { id: 'tiers', label: 'Paliers' },
              ] as const
            ).map(opt => {
              const active =
                opt.id === 'tiers'
                  ? !cadenceAlways
                  : cadenceAlways && (opt.id === 'alt' ? cadenceEvery >= 2 : cadenceEvery <= 1);
              return (
                <Box
                  key={opt.id}
                  onClick={() =>
                    commit(c => ({
                      ...c,
                      included: {
                        ...c.included,
                        always: opt.id !== 'tiers',
                        everyNDays: opt.id === 'alt' ? 2 : 1,
                      },
                    }))
                  }
                  sx={{
                    px: 1.25,
                    py: 0.6,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 800,
                    border: `1px solid ${active ? V3.p : V3.b}`,
                    bgcolor: active ? V3.pt : '#fff',
                    color: active ? V3.pd : V3.t2,
                  }}
                >
                  {opt.label}
                </Box>
              );
            })}
          </Box>
        </Section>

        {/* Durée & crédits */}
        <Section label="Durée & crédits par niveau" caption="1 crédit = 1 minute · alimente le barème">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
            {(['normal', 'grand'] as const).map(level => (
              <LevelCard
                key={level}
                title={level === 'normal' ? 'Normal' : 'Grand'}
                real={real30j(baremeView, 'cleaning_stay', level)}
                duration={cfg.included[level].durationMinutes}
                onDuration={v =>
                  edit(c => ({
                    ...c,
                    included: { ...c.included, [level]: { ...c.included[level], durationMinutes: v } },
                  }))
                }
                price={cfg.paid[level].price}
                onPrice={v =>
                  edit(c => ({
                    ...c,
                    paid: { ...c.paid, [level]: { ...c.paid[level], price: v } },
                  }))
                }
                onBlur={() => commit()}
              />
            ))}
          </Box>
        </Section>

        {/* Facturation — paliers (masqués en cadence tous les jours / alternés) */}
        <Section
          label="Facturation — la frontière inclus / payant"
          caption={
            cadenceAlways
              ? 'Paliers inactifs : la cadence ci-dessus fixe les jours de passage.'
              : undefined
          }
        >
          <Box sx={{ opacity: cadenceAlways ? 0.45 : 1, pointerEvents: cadenceAlways ? 'none' : 'auto' }}>
          {tiers.length > 0 ? (
            <Box sx={{ border: `1px solid ${V3.b}`, borderRadius: '10px', overflow: 'hidden' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, px: 1.25, py: 0.75, bgcolor: V3.alt }}>
                {['Palier séjour', 'Recouches incluses', 'Au-delà'].map(h => (
                  <Typography key={h} sx={sectionLabelSx}>{h}</Typography>
                ))}
              </Box>
              {tiers.map((t, i) => (
                <Box
                  key={`${t.startDay}-${t.endDay}`}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 1,
                    px: 1.25,
                    py: 0.75,
                    borderTop: `1px solid ${V3.b}`,
                    bgcolor: i % 2 === 0 ? '#fff' : V3.alt,
                  }}
                >
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: V3.t }}>{formatTierRange(t)}</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: V3.pd, fontFamily: 'monospace' }}>
                    {t.numberOfCleaning}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: V3.t2 }}>
                    {cfg.paid.normal.price > 0 ? `payante — ${cfg.paid.normal.price} MAD` : 'payante'}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography sx={{ fontSize: 12, color: V3.t3, fontStyle: 'italic' }}>
              Paliers configurés dans Orchestration (Ménage inclus · paliers &amp; créneaux).
            </Typography>
          )}
          </Box>

          <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap', mt: 1.25 }}>
            {(['towels', 'sheets'] as const).map(opt => (
              <Stack key={opt} direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
                <Switch
                  size="small"
                  checked={cfg.included.options[opt].enabled}
                  onChange={e =>
                    commit(c => ({
                      ...c,
                      included: {
                        ...c.included,
                        options: {
                          ...c.included.options,
                          [opt]: { ...c.included.options[opt], enabled: e.target.checked },
                        },
                      },
                    }))
                  }
                />
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: V3.t2 }}>
                  {opt === 'towels' ? 'Serviettes' : 'Draps'}
                </Typography>
                <TextField
                  size="small"
                  type="number"
                  label="MAD"
                  disabled={!cfg.included.options[opt].enabled}
                  value={cfg.included.options[opt].price}
                  onChange={e =>
                    edit(c => ({
                      ...c,
                      included: {
                        ...c.included,
                        options: {
                          ...c.included.options,
                          [opt]: {
                            ...c.included.options[opt],
                            price: Math.max(0, Number(e.target.value) || 0),
                          },
                        },
                      },
                    }))
                  }
                  onBlur={() => commit()}
                  sx={{ ...fieldSx, width: 90 }}
                />
              </Stack>
            ))}
          </Stack>
        </Section>

        {/* Contenu du ménage */}
        <Section label="Contenu du ménage">
          <Stack sx={{ gap: 0.5 }}>
            {[
              { icon: '📋', label: 'Checklist staff par catégories', desc: 'configurée dans Orchestration' },
              { icon: '⚠️', label: 'Déclarations problèmes', desc: 'blocages & signalements FdM' },
              { icon: '🧺', label: 'Dotation linge', desc: 'serviettes & draps du logement' },
            ].map(row => (
              <Stack
                key={row.label}
                direction="row"
                sx={{
                  alignItems: 'center',
                  gap: 1,
                  px: 1.25,
                  py: 0.875,
                  borderRadius: '10px',
                  border: `1px solid ${V3.b}`,
                  bgcolor: V3.alt,
                }}
              >
                <Box sx={{ fontSize: 14 }}>{row.icon}</Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: V3.t, flex: 1 }}>
                  {row.label}
                </Typography>
                <Typography sx={{ fontSize: 11, color: V3.t4 }}>{row.desc}</Typography>
                <Box sx={{ fontSize: 12, color: V3.t4, opacity: 0.45 }}>›</Box>
              </Stack>
            ))}
          </Stack>
        </Section>

        {/* Exécution FdM */}
        <Section label="Exécution FdM">
          <Stack sx={{ gap: 0.25 }}>
            <ToggleRow
              label="Photos autorisées"
              checked={flex.fdmCanSendImages}
              onChange={v =>
                commit(c => ({
                  ...c,
                  flexibility: {
                    ...c.flexibility,
                    fdmCanSendImages: v,
                    ...(v ? {} : { imagesRequired: false }),
                  },
                }))
              }
            />
            <ToggleRow
              label="Photos obligatoires"
              checked={flex.imagesRequired}
              disabled={!flex.fdmCanSendImages}
              onChange={v => commit(c => ({ ...c, flexibility: { ...c.flexibility, imagesRequired: v } }))}
            />
            <ToggleRow
              label="Changement Normal ↔ Grand — validation superviseur"
              checked={flex.canChangeLevel && flex.supervisorOrAdminValidates}
              onChange={v =>
                commit(c => ({
                  ...c,
                  flexibility: {
                    ...c.flexibility,
                    canChangeLevel: v,
                    ...(v ? { supervisorOrAdminValidates: true } : {}),
                  },
                }))
              }
            />
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1, py: 0.5 }}>
              <Typography sx={{ fontSize: 12.5, color: V3.t2, fontWeight: 600, flex: 1 }}>
                Jours visibles Flow FdM
              </Typography>
              <TextField
                size="small"
                type="number"
                value={cfg.fdmVisibleDays}
                onChange={e =>
                  edit(c => ({ ...c, fdmVisibleDays: Math.min(7, Math.max(1, Number(e.target.value) || 1)) }))
                }
                onBlur={() => commit()}
                slotProps={{ htmlInput: { min: 1, max: 7 } }}
                sx={{ ...fieldSx, width: 76 }}
              />
              <Typography sx={{ fontSize: 11, color: V3.t4 }}>j</Typography>
            </Stack>
          </Stack>
        </Section>
      </TypeCard>

      {/* ── À blanc · au départ ────────────────────────────────────── */}
      <TypeCard
        emoji="🧼"
        title="À blanc · au départ"
        subtitle={`${levelDurationsSubtitle(cfg.checkout)} · proposée à chaque départ ou turnover`}
        badges={[{ label: 'Incluse', tone: 'teal' }]}
        enabled={cfg.checkout.enabled}
        onToggle={v => commit(c => ({ ...c, checkout: { ...c.checkout, enabled: v } }))}
        expanded={expanded.checkout === true}
        onExpand={() => setExpanded(e => ({ ...e, checkout: !e.checkout }))}
      >
        <Section label="Durée & prix par niveau">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
            {(['normal', 'grand'] as const).map(level => (
              <LevelCard
                key={level}
                title={level === 'normal' ? 'Normal' : 'Grand'}
                real={real30j(baremeView, 'cleaning_checkout', level)}
                duration={cfg.checkout[level].durationMinutes}
                onDuration={v =>
                  edit(c => ({
                    ...c,
                    checkout: { ...c.checkout, [level]: { ...c.checkout[level], durationMinutes: v } },
                  }))
                }
                price={cfg.checkout[level].price}
                priceLabel="Prix (MAD)"
                onPrice={v =>
                  edit(c => ({
                    ...c,
                    checkout: { ...c.checkout, [level]: { ...c.checkout[level], price: v } },
                  }))
                }
                onBlur={() => commit()}
              />
            ))}
          </Box>
        </Section>
      </TypeCard>

      {/* ── À la demande ───────────────────────────────────────────── */}
      <TypeCard
        emoji="✨"
        title="À la demande"
        subtitle={`${levelDurationsSubtitle(cfg.paid)} · à la demande du guest`}
        badges={[
          { label: 'NOUVEAU', tone: 'violet' },
          { label: 'Payante', tone: 'or' },
        ]}
        enabled={cfg.paid.enabled}
        onToggle={v => commit(c => ({ ...c, paid: { ...c.paid, enabled: v } }))}
        expanded={expanded.paid === true}
        onExpand={() => setExpanded(e => ({ ...e, paid: !e.paid }))}
      >
        <Section label="Durée & prix par niveau">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
            {(['normal', 'grand'] as const).map(level => (
              <LevelCard
                key={level}
                title={level === 'normal' ? 'Normal' : 'Grand'}
                real={null}
                duration={cfg.paid[level].durationMinutes}
                onDuration={v =>
                  edit(c => ({
                    ...c,
                    paid: { ...c.paid, [level]: { ...c.paid[level], durationMinutes: v } },
                  }))
                }
                price={cfg.paid[level].price}
                priceLabel="Prix (MAD)"
                onPrice={v =>
                  edit(c => ({
                    ...c,
                    paid: { ...c.paid, [level]: { ...c.paid[level], price: v } },
                  }))
                }
                onBlur={() => commit()}
              />
            ))}
          </Box>
        </Section>
      </TypeCard>

      {/* ── Urgent ─────────────────────────────────────────────────── */}
      <TypeCard
        emoji="⚡"
        title="Urgent"
        subtitle="Geste superviseur (SM) · notification FdM immédiate, toujours — ignore le digest"
        badges={[{ label: 'Notif immédiate', tone: 'or' }]}
        enabled
        toggleDisabled
        expanded={false}
      />

      <Typography sx={{ fontSize: 11, color: V3.t4 }}>
        Ménage journalier et Contrôle mini-bar ne figurent plus ici — le journalier est couvert par
        la cadence de la Recouche, le mini-bar a sa propre configuration.
      </Typography>
    </Stack>
  );
}

/* ─── Sous-composants ─────────────────────────────────────────── */

type BadgeTone = 'teal' | 'or' | 'violet';

const BADGE_TONES: Record<BadgeTone, { bg: string; color: string; border?: string }> = {
  teal: { bg: V3.taskT, color: V3.task },
  or: { bg: V3.pt, color: V3.pd, border: V3.pt2 },
  violet: { bg: V3.orchT, color: V3.orch },
};

function TypeCard({
  emoji,
  title,
  subtitle,
  badges = [],
  enabled,
  onToggle,
  toggleDisabled = false,
  expanded,
  onExpand,
  accent = false,
  children,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  badges?: { label: string; tone: BadgeTone }[];
  enabled: boolean;
  onToggle?: (v: boolean) => void;
  toggleDisabled?: boolean;
  expanded: boolean;
  onExpand?: () => void;
  accent?: boolean;
  children?: ReactNode;
}) {
  return (
    <Box sx={{ ...cardSx, borderColor: expanded && accent ? V3.p : V3.b }}>
      <Stack
        direction="row"
        onClick={onExpand}
        sx={{
          px: 1.75,
          py: 1.25,
          gap: 1,
          alignItems: 'center',
          cursor: onExpand ? 'pointer' : 'default',
          bgcolor: expanded ? V3.alt : '#fff',
          '&:hover': onExpand ? { bgcolor: V3.alt } : undefined,
        }}
      >
        <Box
          sx={{
            fontSize: 11,
            color: V3.t4,
            width: 14,
            flexShrink: 0,
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 140ms ease',
            opacity: onExpand ? 1 : 0.35,
          }}
        >
          ›
        </Box>
        <Box sx={{ fontSize: 16, flexShrink: 0 }}>{emoji}</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: V3.t }}>{title}</Typography>
            {badges.map(b => {
              const tone = BADGE_TONES[b.tone];
              return (
                <Box
                  key={b.label}
                  sx={{
                    px: 0.875,
                    py: '1px',
                    borderRadius: '99px',
                    bgcolor: tone.bg,
                    color: tone.color,
                    border: tone.border ? `1px solid ${tone.border}` : 'none',
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {b.label}
                </Box>
              );
            })}
          </Stack>
          <Typography sx={{ fontSize: 11, color: V3.t3, mt: 0.25 }}>{subtitle}</Typography>
        </Box>
        <Switch
          size="small"
          checked={enabled}
          disabled={toggleDisabled}
          onClick={e => e.stopPropagation()}
          onChange={e => onToggle?.(e.target.checked)}
          sx={{ flexShrink: 0 }}
        />
      </Stack>
      {expanded && children ? (
        <Box sx={{ px: 1.75, pb: 1.75, pt: 0.5, borderTop: `1px solid ${V3.b}` }}>{children}</Box>
      ) : null}
    </Box>
  );
}

function Section({
  label,
  caption,
  children,
}: {
  label: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <Box sx={{ mt: 1.5 }}>
      <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
        <Typography sx={sectionLabelSx}>{label}</Typography>
        {caption ? (
          <Typography sx={{ fontSize: 10.5, color: V3.t4 }}>{caption}</Typography>
        ) : null}
      </Stack>
      {children}
    </Box>
  );
}

function ToggleRow({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, py: 0.25, opacity: disabled ? 0.5 : 1 }}>
      <Typography sx={{ fontSize: 12.5, color: V3.t2, fontWeight: 600, flex: 1 }}>{label}</Typography>
      <Switch size="small" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
    </Stack>
  );
}

function LevelCard({
  title,
  real,
  duration,
  onDuration,
  price,
  priceLabel = 'Prix (si payante)',
  onPrice,
  onBlur,
}: {
  title: string;
  real: Real30j | null;
  duration: number;
  onDuration: (v: number) => void;
  price: number;
  priceLabel?: string;
  onPrice: (v: number) => void;
  onBlur: () => void;
}) {
  return (
    <Box sx={{ p: 1.25, borderRadius: '10px', border: `1px solid ${V3.b}`, bgcolor: V3.alt }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: V3.t, flex: 1 }}>{title}</Typography>
        {real ? (
          <Typography
            sx={{
              fontSize: 10.5,
              fontFamily: 'monospace',
              fontWeight: 700,
              color: real.tone === 'ok' ? V3.task : real.tone === 'ecart' ? V3.pd : V3.t4,
            }}
          >
            réel 30 j : {real.avgMin} min{real.tone === 'ok' ? ' ✓' : ''}
          </Typography>
        ) : null}
      </Stack>
      <Stack direction="row" sx={{ gap: 1 }}>
        <TextField
          size="small"
          type="number"
          label="Durée (min)"
          value={duration}
          onChange={e => onDuration(Math.max(0, Number(e.target.value) || 0))}
          onBlur={onBlur}
          slotProps={{ htmlInput: { min: 15 } }}
          sx={{ ...fieldSx, width: 110 }}
        />
        <TextField
          size="small"
          type="number"
          label={priceLabel}
          value={price}
          onChange={e => onPrice(Math.max(0, Number(e.target.value) || 0))}
          onBlur={onBlur}
          slotProps={{ htmlInput: { min: 0 } }}
          sx={{ ...fieldSx, width: 130 }}
        />
      </Stack>
    </Box>
  );
}
