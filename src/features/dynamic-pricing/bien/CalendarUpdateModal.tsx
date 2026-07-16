import React, { useEffect, useState } from 'react';
import {
  Dialog,
  Box,
  Stack,
  Typography,
  Button,
  IconButton,
  LinearProgress,
  Collapse,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { T } from '../_tokens';
import type { ApplyNarrativeDto, PilotApplyReportDto } from '../../../services/dynamicPricingApi';

export type CalendarUpdateModalProps = {
  open: boolean;
  listingName: string;
  hasEstimate: boolean;
  estimateSnapshotAt: string | null;
  applyPrice: boolean;
  applyMinStay: boolean;
  floor: number;
  ceiling: number;
  gapBlockEnabled: boolean;
  gapBlockMinNights: number;
  eventsCount: number;
  /** Coefficient mode (Prudent / Équilibré / Agressif) — pas le taux d’occupation */
  activeModeLabel: string;
  modeEnabled?: boolean;
  occupancyBandsEnabled?: boolean;
  occupancyLowMax?: number;
  occupancyLowAdj?: number;
  occupancyHighMin?: number;
  occupancyHighAdj?: number;
  lastMinuteEnabled?: boolean;
  lastMinuteWindowDays?: number;
  lastMinuteDiscountPct?: number;
  onClose: () => void;
  onRun: () => Promise<PilotApplyReportDto>;
};

type Phase = 'confirm' | 'running' | 'done' | 'error';

function formatSnapshot(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function formatDayFr(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function ReportRow({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 2, py: 0.5 }}>
      <Typography sx={{ fontSize: 12, color: T.text2 }}>{label}</Typography>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: highlight ? 800 : 600,
          color: highlight ? T.goldDeep : T.text,
          fontFamily: '"Geist Mono", monospace',
          textAlign: 'right',
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

function fmtPct(n: number): string {
  return `${n > 0 ? '+' : ''}${n} %`;
}

function RecapCollapse({
  n,
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  n: number;
  title: string;
  summary: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasBody = Boolean(children);
  return (
    <Box
      sx={{
        borderRadius: 1,
        border: `1px solid ${T.border}`,
        bgcolor: T.bg1,
        overflow: 'hidden',
      }}
    >
      <Box
        component={hasBody ? 'button' : 'div'}
        type={hasBody ? 'button' : undefined}
        onClick={hasBody ? () => setOpen((v) => !v) : undefined}
        sx={{
          display: 'flex',
          width: '100%',
          alignItems: 'flex-start',
          gap: 1,
          p: 1.1,
          textAlign: 'left',
          border: 'none',
          bgcolor: 'transparent',
          cursor: hasBody ? 'pointer' : 'default',
          font: 'inherit',
          color: 'inherit',
          '&:hover': hasBody ? { bgcolor: T.bg2 } : undefined,
        }}
      >
        <Box
          sx={{
            minWidth: 22,
            height: 22,
            borderRadius: '50%',
            bgcolor: T.goldTint,
            border: `1px solid ${T.gold}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            mt: 0.1,
          }}
        >
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: T.goldDeep }}>{n}</Typography>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: T.text }}>{title}</Typography>
          <Typography sx={{ fontSize: 11.5, color: T.text2, lineHeight: 1.45, mt: 0.15 }}>
            {summary}
          </Typography>
        </Box>
        {hasBody ? (
          <ExpandMoreIcon
            sx={{
              fontSize: 20,
              color: T.text3,
              mt: 0.15,
              flexShrink: 0,
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          />
        ) : null}
      </Box>
      {hasBody ? (
        <Collapse in={open}>
          <Box sx={{ px: 1.25, pb: 1.25, pt: 0, borderTop: `1px solid ${T.border}` }}>
            {children}
          </Box>
        </Collapse>
      ) : null}
    </Box>
  );
}

function NarrativeRecap({
  narrative,
  report,
}: {
  narrative: ApplyNarrativeDto;
  report: PilotApplyReportDto;
}) {
  const occSummary =
    narrative.occupancyMonths.length === 0
      ? 'Aucun mois calculé'
      : narrative.occupancyMonths.length === 1
        ? (() => {
            const m = narrative.occupancyMonths[0]!;
            const adj =
              m.adjustmentPct == null
                ? 'inchangé'
                : `${fmtPct(m.adjustmentPct)}`;
            return `${m.monthLabel} : ${m.occupancyPct} % → ${adj}`;
          })()
        : `${narrative.occupancyMonths.length} mois · clique pour le détail`;

  const lm = narrative.lastMinute;
  const lmSummary = !lm.enabled
    ? 'Désactivée'
    : lm.daysHit === 0
      ? `Fenêtre ${lm.windowDays} j · ${fmtPct(lm.discountPct)} — aucune nuit hit`
      : `Fenêtre ${lm.windowDays} j · ${fmtPct(lm.discountPct)} sur ${lm.daysHit} nuit(s)${
          lm.ranges.length > 1 ? ` · ${lm.ranges.length} plages` : ''
        }`;

  return (
    <Box
      sx={{
        p: 1.25,
        mb: 1.5,
        borderRadius: 1.25,
        bgcolor: T.bg2,
        border: `1px solid ${T.border}`,
      }}
    >
      <Stack sx={{ gap: 0.75 }}>
        <RecapCollapse
          n={1}
          title="Prix de base"
          summary={narrative.base.label}
          defaultOpen
        >
          <Stack sx={{ pt: 1, gap: 0.25 }}>
            <ReportRow label="Source" value={narrative.base.label} highlight />
            {narrative.base.source === 'estimate' ? (
              <ReportRow label="Snapshot" value={formatSnapshot(narrative.base.snapshotAt)} />
            ) : null}
            {narrative.base.source === 'manual_base' && narrative.base.manualBasePriceMad != null ? (
              <ReportRow
                label="Montant fixe"
                value={`${narrative.base.manualBasePriceMad.toLocaleString('fr-FR')} MAD`}
              />
            ) : null}
          </Stack>
        </RecapCollapse>

        <RecapCollapse
          n={2}
          title="Mode"
          summary={`${narrative.mode.label} (×${narrative.mode.multiplier})`}
        />

        <RecapCollapse n={3} title="Occupation (par mois)" summary={occSummary} defaultOpen>
          <Stack sx={{ pt: 1, gap: 0.25 }}>
            {narrative.occupancyMonths.length === 0 ? (
              <Typography sx={{ fontSize: 11.5, color: T.text3 }}>Aucun mois dans la grille.</Typography>
            ) : (
              narrative.occupancyMonths.map((m) => (
                <ReportRow
                  key={m.monthKey}
                  label={m.monthLabel}
                  value={
                    m.adjustmentPct == null
                      ? `${m.occupancyPct} % · inchangé · ${m.days} j`
                      : `${m.occupancyPct} % → ${fmtPct(m.adjustmentPct)} · ${m.days} j`
                  }
                  highlight={m.adjustmentPct != null && m.adjustmentPct !== 0}
                />
              ))
            )}
          </Stack>
        </RecapCollapse>

        <RecapCollapse
          n={4}
          title="Bornes"
          summary={`Plancher ${narrative.bounds.floor.toLocaleString('fr-FR')} · plafond ${narrative.bounds.ceiling.toLocaleString('fr-FR')} MAD`}
        />

        <RecapCollapse n={5} title="Dernière minute" summary={lmSummary} defaultOpen={lm.daysHit > 0}>
          <Stack sx={{ pt: 1, gap: 0.5 }}>
            <ReportRow label="Fenêtre" value={`${lm.windowDays} j`} />
            <ReportRow label="Ajustement" value={fmtPct(lm.discountPct)} highlight />
            <ReportRow label="Nuits touchées" value={`${lm.daysHit} j`} highlight={lm.daysHit > 0} />
            {lm.ranges.length > 0 ? (
              <Box sx={{ mt: 0.5 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, mb: 0.5 }}>
                  Intervalles appliqués
                </Typography>
                {lm.ranges.map((r) => (
                  <Typography
                    key={`${r.startDate}-${r.endDate}`}
                    sx={{
                      fontSize: 11.5,
                      color: T.text2,
                      fontFamily: '"Geist Mono", monospace',
                      lineHeight: 1.55,
                    }}
                  >
                    {r.startDate === r.endDate
                      ? `${formatDayFr(r.startDate)} → ${fmtPct(r.discountPct)}`
                      : `du ${formatDayFr(r.startDate)} au ${formatDayFr(r.endDate)} → ${fmtPct(r.discountPct)} (${r.days} j)`}
                  </Typography>
                ))}
              </Box>
            ) : (
              <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.25 }}>
                Aucune nuit dans la fenêtre (réservée ou hors période).
              </Typography>
            )}
          </Stack>
        </RecapCollapse>

        {narrative.eventsCount > 0 ? (
          <RecapCollapse
            n={6}
            title="Events"
            summary={`${narrative.eventsCount} event(s) configuré(s)`}
          />
        ) : null}

        <RecapCollapse
          n={narrative.eventsCount > 0 ? 7 : 6}
          title="Résultat grille"
          summary={`ADR ${report.avgPriceMad.toLocaleString('fr-FR')} MAD · ${report.daysAtFloor} j au plancher`}
        >
          <Stack sx={{ pt: 1, gap: 0.25 }}>
            <ReportRow
              label="ADR moyen (grille)"
              value={`${report.avgPriceMad.toLocaleString('fr-FR')} MAD`}
            />
            <ReportRow label="Nuits au plancher" value={String(report.daysAtFloor)} />
            <ReportRow label="Nuits au plafond" value={String(report.daysAtCeiling)} />
            <ReportRow label="Nuits dernière minute" value={String(report.daysLastMinute)} />
          </Stack>
        </RecapCollapse>
      </Stack>
    </Box>
  );
}

export default function CalendarUpdateModal({
  open,
  listingName,
  hasEstimate,
  estimateSnapshotAt,
  applyPrice,
  applyMinStay,
  floor,
  ceiling,
  gapBlockEnabled,
  gapBlockMinNights,
  eventsCount,
  activeModeLabel,
  modeEnabled = true,
  occupancyBandsEnabled = true,
  occupancyLowMax = 30,
  occupancyLowAdj = -10,
  occupancyHighMin = 70,
  occupancyHighAdj = 15,
  lastMinuteEnabled = true,
  lastMinuteWindowDays = 10,
  lastMinuteDiscountPct = -15,
  onClose,
  onRun,
}: CalendarUpdateModalProps) {
  const [phase, setPhase] = useState<Phase>('confirm');
  const [report, setReport] = useState<PilotApplyReportDto | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const modeSummary = modeEnabled ? activeModeLabel : `${activeModeLabel} (OFF · ×1)`;
  const occupancySummary = occupancyBandsEnabled
    ? `≤ ${occupancyLowMax}% → ${fmtPct(occupancyLowAdj)} · ≥ ${occupancyHighMin}% → ${fmtPct(occupancyHighAdj)} (taux = réservés ÷ jours du mois)`
    : 'OFF';
  const lastMinuteSummary = lastMinuteEnabled
    ? `${lastMinuteWindowDays} j · ${fmtPct(lastMinuteDiscountPct)}`
    : 'OFF';

  useEffect(() => {
    if (!open) return;
    setPhase('confirm');
    setReport(null);
    setErrorMsg(null);
  }, [open]);

  const handleRun = async () => {
    setPhase('running');
    setErrorMsg(null);
    try {
      const r = await onRun();
      setReport(r);
      setPhase('done');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (phase === 'running') return;
        onClose();
      }}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: 2, maxHeight: '90vh' } },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', p: 2, borderBottom: `1px solid ${T.border}` }}>
        <Typography sx={{ fontWeight: 800, flex: 1 }}>Mise à jour calendrier</Typography>
        {phase !== 'running' ? (
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        ) : null}
      </Stack>

      <Box sx={{ p: 2.5, overflowY: 'auto', maxHeight: 'calc(90vh - 140px)' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.5 }}>{listingName}</Typography>

        {phase === 'confirm' && (
          <>
            <Typography sx={{ fontSize: 12, color: T.text2, lineHeight: 1.55, mb: 2 }}>
              Envoie les prix calculés vers le calendrier Sojori (<code>Inventory</code>) puis la file
              de publication canaux. Cascade : <b>base</b> → <b>mode</b> → <b>taux d’occupation</b> →{' '}
              <b>bornes</b> → <b>events</b> → <b>dernière minute</b>.
            </Typography>
            {!hasEstimate ? (
              <Box sx={{ p: 1.25, mb: 2, borderRadius: 1, bgcolor: T.errorTint, border: `1px solid ${T.error}` }}>
                <Typography sx={{ fontSize: 12, color: T.error, fontWeight: 600 }}>
                  Estimation prix de marché manquante — actualisez l’estimation avant d’appliquer.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ p: 1.5, mb: 2, borderRadius: 1.25, bgcolor: T.bg2, border: `1px solid ${T.border}` }}>
                <ReportRow label="Estimation marché" value={formatSnapshot(estimateSnapshotAt)} highlight />
                <ReportRow label="Coefficient mode" value={modeSummary} />
                <ReportRow
                  label="Taux d’occupation"
                  value={occupancySummary}
                  highlight={occupancyBandsEnabled}
                />
                <ReportRow
                  label="Dernière minute"
                  value={lastMinuteSummary}
                  highlight={lastMinuteEnabled}
                />
                <ReportRow label="Bornes" value={`${floor.toLocaleString('fr-FR')} – ${ceiling.toLocaleString('fr-FR')} MAD`} />
                <ReportRow label="Sync prix" value={applyPrice ? 'Oui' : 'Non'} />
                <ReportRow label="Sync min stay" value={applyMinStay ? 'Oui' : 'Non'} />
                <ReportRow
                  label="Trous entre résas"
                  value={gapBlockEnabled ? `combler trous · ref. min ${gapBlockMinNights} n.` : 'OFF'}
                />
                <ReportRow label="Events actifs" value={String(eventsCount)} />
              </Box>
            )}
          </>
        )}

        {phase === 'running' && (
          <Box sx={{ py: 3 }}>
            <Typography sx={{ fontSize: 12, color: T.text2, mb: 2 }}>
              Calcul moteur Sojori + écriture calendrier + publication canaux…
            </Typography>
            <LinearProgress sx={{ borderRadius: 1, '& .MuiLinearProgress-bar': { bgcolor: T.gold } }} />
          </Box>
        )}

        {phase === 'error' && errorMsg && (
          <Stack direction="row" sx={{ gap: 1, alignItems: 'flex-start', py: 1 }}>
            <ErrorIcon sx={{ color: T.error, fontSize: 22 }} />
            <Typography sx={{ fontSize: 12, color: T.error, fontWeight: 600 }}>{errorMsg}</Typography>
          </Stack>
        )}

        {phase === 'done' && report && (() => {
          const updated =
            report.daysCalendarDatesUpdated ?? report.daysChanged ?? 0;
          const sent = report.daysPayloadPriceDays ?? report.daysPricePushed ?? 0;
          const alreadyAligned = updated === 0 && sent > 0;
          return (
          <>
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center', mb: 0.5 }}>
              <CheckCircleIcon sx={{ color: T.success, fontSize: 24 }} />
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: T.success }}>
                {alreadyAligned ? 'Calendrier déjà à jour' : 'Calendrier mis à jour'}
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 12, color: T.text2, mb: 1.5, lineHeight: 1.45 }}>
              {alreadyAligned
                ? `Les ${sent} nuits du pilote sont déjà en place — aucun nouveau prix à écrire, pas de republication canaux.`
                : `${updated} nuit${updated > 1 ? 's' : ''} avec un prix (ou min stay) différent ont été écrites.`}
            </Typography>
            <Box sx={{ p: 1.5, borderRadius: 1.25, bgcolor: T.goldTint, border: `1px solid ${T.gold}`, mb: 1.5 }}>
              <ReportRow
                label="Nuits calculées par le pilote"
                value={`${sent} j`}
              />
              <ReportRow
                label="Nuits réellement modifiées"
                value={`${updated} j`}
                highlight
              />
              {!alreadyAligned ? (
                <ReportRow
                  label="Publication canaux"
                  value={report.ruPublishQueued ? 'En file ✓' : '—'}
                />
              ) : (
                <Typography sx={{ fontSize: 11, color: T.text3, mt: 0.75, lineHeight: 1.45 }}>
                  Airbnb / Booking ne sont rappelés que si un prix change vraiment.
                </Typography>
              )}
              {(report.daysSkippedReserved ?? 0) > 0 && (
                <ReportRow
                  label="Nuits réservées (protégées)"
                  value={`${report.daysSkippedReserved} j`}
                />
              )}
            </Box>
            {!alreadyAligned ? (
            <Box
              sx={{
                p: 1.5,
                mb: 1.5,
                borderRadius: 1.25,
                bgcolor: report.gapsFilled > 0 ? T.warningTint : T.successTint,
                border: `1px solid ${report.gapsFilled > 0 ? T.warning : T.success}`,
              }}
            >
              <ReportRow
                label="Trous — min stay abaissé"
                value={
                  (report.daysGapMinStayAdjusted ?? 0) > 0
                    ? `${report.daysGapMinStayAdjusted} j · ${report.gapsFilled} plage(s)`
                    : '0'
                }
                highlight={(report.daysGapMinStayAdjusted ?? 0) > 0}
              />
              {(report.daysGapMinStayReleased ?? 0) > 0 && (
                <ReportRow
                  label="Trous libérés (min stay restauré)"
                  value={`${report.daysGapMinStayReleased} j`}
                  highlight
                />
              )}
              {report.gapsFilled > 0 && report.gapRanges?.length ? (
                <Box sx={{ mt: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.warning, mb: 0.5 }}>
                    Min stay temporaire :
                  </Typography>
                  {report.gapRanges.map((g) => (
                    <Typography
                      key={`${g.startDate}-${g.endDate}`}
                      sx={{ fontSize: 11, color: T.text2, fontFamily: '"Geist Mono", monospace' }}
                    >
                      {g.startDate} → {g.endDate} : {g.nights} n. libres → min stay{' '}
                      <b>{g.suggestedMinStay ?? g.nights}</b>
                    </Typography>
                  ))}
                </Box>
              ) : null}
              {(report.daysGapMinStayAdjusted ?? 0) === 0 && (report.daysGapSignaled ?? 0) === 0 && (
                <Typography sx={{ fontSize: 11, color: T.success, fontWeight: 600, mt: 0.5 }}>
                  Aucun trou court entre deux réservations.
                </Typography>
              )}
            </Box>
            ) : null}
            <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: T.text3, textTransform: 'uppercase', mb: 0.75 }}>
              Ce qui s’est passé
            </Typography>
            {report.narrative ? (
              <NarrativeRecap narrative={report.narrative} report={report} />
            ) : (
              <Box sx={{ p: 1.5, mb: 1.5, borderRadius: 1.25, bgcolor: T.bg2, border: `1px solid ${T.border}` }}>
                <Typography sx={{ fontSize: 11.5, color: T.warning, mb: 1, fontWeight: 600 }}>
                  Récap détaillé indisponible (backend sans narrative) — résumé basique :
                </Typography>
                <ReportRow label="Estimation marché" value={formatSnapshot(report.estimateSnapshotAt)} />
                <ReportRow
                  label="Mode"
                  value={`${report.activeModeLabel} (×${report.modeMultiplier})`}
                />
                <ReportRow label="Occupation" value={occupancySummary} />
                <ReportRow label="Dernière minute" value={lastMinuteSummary} />
                <ReportRow label="ADR moyen (grille)" value={`${report.avgPriceMad.toLocaleString('fr-FR')} MAD`} />
                <ReportRow label="Nuits au plancher" value={String(report.daysAtFloor)} />
              </Box>
            )}
            <Typography sx={{ fontSize: 11, color: T.text3, lineHeight: 1.45 }}>
              Ce récit est enregistré dans l’audit à chaque mise à jour du calendrier.
            </Typography>
          </>
          );
        })()}
      </Box>

      <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1, p: 2, borderTop: `1px solid ${T.border}` }}>
        {phase === 'confirm' && (
          <>
            <Button onClick={onClose} sx={{ textTransform: 'none' }}>Annuler</Button>
            <Button
              variant="contained"
              disabled={!hasEstimate}
              onClick={() => void handleRun()}
              sx={{
                textTransform: 'none',
                fontWeight: 800,
                bgcolor: T.gold,
                color: T.text,
                '&:hover': { bgcolor: T.goldDeep },
              }}
            >
              Lancer la mise à jour
            </Button>
          </>
        )}
        {(phase === 'done' || phase === 'error') && (
          <Button
            variant="contained"
            onClick={onClose}
            sx={{ textTransform: 'none', fontWeight: 800, bgcolor: T.gold, color: T.text }}
          >
            Fermer
          </Button>
        )}
      </Stack>
    </Dialog>
  );
}
