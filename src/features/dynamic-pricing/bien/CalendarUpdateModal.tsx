import React, { useEffect, useState } from 'react';
import {
  Dialog,
  Box,
  Stack,
  Typography,
  Button,
  IconButton,
  LinearProgress,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { T } from '../_tokens';
import type { PilotApplyReportDto } from '../../../services/dynamicPricingApi';

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
  activeModeLabel: string;
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
  onClose,
  onRun,
}: CalendarUpdateModalProps) {
  const [phase, setPhase] = useState<Phase>('confirm');
  const [report, setReport] = useState<PilotApplyReportDto | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      onClose={phase === 'running' ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: 2, maxHeight: '90vh' } },
      }}
      disableEscapeKeyDown={phase === 'running'}
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
              de publication canaux. Cascade : <b>estimation brute</b> → <b>bornes</b> → <b>× occupation</b> →{' '}
              <b>events</b>.
            </Typography>
            {!hasEstimate ? (
              <Box sx={{ p: 1.25, mb: 2, borderRadius: 1, bgcolor: T.errorTint, border: `1px solid ${T.error}` }}>
                <Typography sx={{ fontSize: 12, color: T.error, fontWeight: 600 }}>
                  Estimation Sojori manquante — lancez ⟳ « Estimation Sojori » avant d’appliquer.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ p: 1.5, mb: 2, borderRadius: 1.25, bgcolor: T.bg2, border: `1px solid ${T.border}` }}>
                <ReportRow label="Estimation marché" value={formatSnapshot(estimateSnapshotAt)} highlight />
                <ReportRow label="Mode occupation" value={activeModeLabel} />
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

        {phase === 'done' && report && (
          <>
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center', mb: 0.5 }}>
              <CheckCircleIcon sx={{ color: T.success, fontSize: 24 }} />
              <Typography sx={{ fontSize: 14, fontWeight: 800, color: T.success }}>
                Calendrier mis à jour
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 11, color: T.text3, mb: 1.5 }}>
              Récap ci-dessous — fermez avec le bouton « Fermer » quand vous avez terminé la lecture.
            </Typography>
            <Box sx={{ p: 1.5, borderRadius: 1.25, bgcolor: T.goldTint, border: `1px solid ${T.gold}`, mb: 1.5 }}>
              <ReportRow
                label="Dates envoyées au calendrier (prix G7)"
                value={`${report.daysPayloadPriceDays ?? report.daysPricePushed} j`}
              />
              <ReportRow
                label="Dates réellement mises à jour"
                value={`${report.daysCalendarDatesUpdated ?? report.daysChanged} j`}
                highlight
              />
              <ReportRow
                label="Lignes inventaire écrites (× chambres)"
                value={report.daysChanged}
              />
              {(report.roomTypesTouched ?? 0) > 1 && (
                <Typography sx={{ fontSize: 10.5, color: T.text3, mt: 0.5, lineHeight: 1.45 }}>
                  {report.roomTypesTouched} types de chambre : une date peut compter plusieurs lignes inventaire.
                </Typography>
              )}
              {(report.daysPayloadMissingInventory ?? 0) > 0 && (
                <ReportRow
                  label="Dates absentes de l'inventaire Mongo"
                  value={`${report.daysPayloadMissingInventory} j`}
                  highlight
                />
              )}
              {(report.daysSkippedInCalendar ?? 0) > 0 && (
                <ReportRow
                  label="Ignorés côté calendrier (réservés…)"
                  value={`${report.daysSkippedInCalendar} j`}
                />
              )}
              <ReportRow
                label="Publication canaux"
                value={report.ruPublishQueued ? 'En file ✓ (plage des dates écrites)' : '—'}
              />
            </Box>
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
                    Min stay temporaire (restauré si résa annulée) :
                  </Typography>
                  {report.gapRanges.map((g) => (
                    <Typography
                      key={`${g.startDate}-${g.endDate}`}
                      sx={{ fontSize: 11, color: T.text2, fontFamily: '"Geist Mono", monospace' }}
                    >
                      {g.startDate} → {g.endDate} : {g.nights} n. libres → min stay{' '}
                      <b>{g.suggestedMinStay ?? g.nights}</b> (réf. client {g.minNightsRequired} n.)
                    </Typography>
                  ))}
                </Box>
              ) : null}
              {(report.daysGapSignaled ?? 0) > 0 && report.gapSignalRanges?.length ? (
                <Box sx={{ mt: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, mb: 0.5 }}>
                    Trous 1 nuit (signalés — action manuelle si besoin) :
                  </Typography>
                  {report.gapSignalRanges.map((g) => (
                    <Typography
                      key={`sig-${g.startDate}-${g.endDate}`}
                      sx={{ fontSize: 11, color: T.text2, fontFamily: '"Geist Mono", monospace' }}
                    >
                      {g.startDate} → {g.endDate} ({g.nights} n. &lt; min {g.minNightsRequired} n.)
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
            <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: T.text3, textTransform: 'uppercase', mb: 0.75 }}>
              Sources & calcul
            </Typography>
            <Box sx={{ p: 1.5, mb: 1.5, borderRadius: 1.25, bgcolor: T.bg2, border: `1px solid ${T.border}` }}>
              <ReportRow label="Estimate marché" value={formatSnapshot(report.estimateSnapshotAt)} />
              <ReportRow label="Moteur" value={report.mixEngineVersion} />
              <ReportRow label="Mode" value={`${report.activeModeLabel} (×${report.modeMultiplier})`} />
              <ReportRow label="Grille calculée" value={`${report.daysComputed} j`} />
            </Box>
            <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: T.text3, textTransform: 'uppercase', mb: 0.75 }}>
              Appliqué au calendrier
            </Typography>
            <Box sx={{ p: 1.5, mb: 1.5, borderRadius: 1.25, bgcolor: T.bg1, border: `1px solid ${T.border}` }}>
              <ReportRow label="Prix (calculatedPrice)" value={`${report.daysPricePushed} j`} highlight />
              <ReportRow label="Min stay (events)" value={`${report.daysMinStayPushed} j`} />
              <ReportRow
                label="Min stay trous (auto)"
                value={`${report.daysGapMinStayAdjusted ?? 0} j`}
                highlight={(report.daysGapMinStayAdjusted ?? 0) > 0}
              />
              <ReportRow
                label="Trous 1 nuit (signalés)"
                value={`${report.daysGapSignaled ?? 0} j`}
              />
            </Box>
            <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: T.text3, textTransform: 'uppercase', mb: 0.75 }}>
              Répartition preview (365 j)
            </Typography>
            <Box sx={{ p: 1.5, borderRadius: 1.25, bgcolor: T.bg2, border: `1px solid ${T.border}` }}>
              <ReportRow label="Plancher atteint" value={report.daysAtFloor} />
              <ReportRow label="Plafond atteint" value={report.daysAtCeiling} />
              <ReportRow label="Jours event" value={report.daysWithEvent} />
              <ReportRow label="ADR moyen poussé" value={`${report.avgPriceMad.toLocaleString('fr-FR')} MAD`} />
            </Box>
            <Divider sx={{ my: 1.5 }} />
            <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: T.text3, textTransform: 'uppercase', mb: 0.75 }}>
              Non modifiés (réservé uniquement)
            </Typography>
            <Box sx={{ p: 1.5, borderRadius: 1.25, bgcolor: T.bg2, border: `1px solid ${T.border}` }}>
              <ReportRow label="Jours réservés (protégés)" value={report.daysSkippedReserved} />
              <ReportRow label="Autres skips moteur" value={report.daysSkippedOther} />
              <Typography sx={{ fontSize: 10.5, color: T.text3, mt: 1, lineHeight: 1.45 }}>
                Les jours manuels reçoivent quand même calculatedPrice + breakdown (hover calendrier § Tarif).
              </Typography>
            </Box>
          </>
        )}
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
