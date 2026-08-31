import { useEffect, useMemo, useState } from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import guestContractsService, { type GuestContractSummary } from '../../services/guestContractsService';
import listingsService from '../../services/listingsService';
import { parseGuestDocuments, signableDocuments } from '../../features/guestDocuments';

const T = {
  bg1: '#ffffff',
  bg3: '#f0eee8',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  border: 'rgba(20,17,10,0.07)',
  success: '#0a8f5e',
  warning: '#c46506',
};

export type EnregistrementStatus = {
  loading: boolean;
  hour: string | null;
  hourChosen: boolean;
  identityDone: number;
  identityTotal: number;
  identityComplete: boolean;
  contractsSigned: number;
  contractsTotal: number;
  contractsComplete: boolean;
  enregistrementDone: number;
  enregistrementNeeded: number;
  enregistrementComplete: boolean;
};

function hourOf(r: Record<string, unknown> | null | undefined): string | null {
  if (!r) return null;
  const raw = r.checkInTime ?? r.arrival_time ?? r.confirmedCheckInTime;
  if (raw == null || raw === '' || raw === false) return null;
  const s = String(raw);
  const m = s.match(/(\d{1,2}:\d{2})/);
  return m ? m[1].padStart(5, '0') : s.slice(0, 5);
}

function memberIdentityDone(m: Record<string, unknown>): boolean {
  const num = String(m.document_number || m.documentNumber || m.passport || '').trim();
  const front = String(m.document_front_download || m.document_front_scan || '').trim();
  return Boolean(num || front);
}

function expectedTotal(
  docs: Array<{ signerPolicy?: string }>,
  adultCount: number,
): number {
  const adults = Math.max(1, adultCount);
  return docs.reduce((n, d) => n + (d.signerPolicy === 'each_traveler' ? adults : 1), 0);
}

function liveProgress(
  contracts: GuestContractSummary[],
  fallbackTotal: number,
): { signed: number; total: number; complete: boolean } {
  const active = contracts.filter(c => c.status !== 'superseded');
  if (active.length === 0) {
    const total = Math.max(0, fallbackTotal);
    return { signed: 0, total, complete: total === 0 };
  }
  let signed = 0;
  let total = 0;
  for (const c of active) {
    const req = Math.max(1, Number(c.requiredSignerCount) || 1);
    const got =
      c.status === 'signed' || c.status === 'finalizing'
        ? req
        : Math.min(req, Math.max(0, Number(c.signatureCount) || 0));
    signed += got;
    total += req;
  }
  return { signed, total, complete: total > 0 && signed >= total };
}

export function useEnregistrementStatus(reservationDetails: Record<string, unknown> | null | undefined): EnregistrementStatus {
  const r = reservationDetails ?? {};
  const reservationId = String(r._id || r.id || '').trim();
  const listingId = String(
    r.listingId || r.listing_id || r.sojoriId || (r.listing as { _id?: string } | undefined)?._id || '',
  ).trim();
  const guestReg = (r.guestRegistration ?? {}) as {
    members?: Record<string, unknown>[];
    nbre_guest_to_register?: number;
  };
  const members = Array.isArray(guestReg.members) ? guestReg.members : [];
  const identityTotal =
    Number(guestReg.nbre_guest_to_register ?? r.adults ?? 0) || Math.max(members.length, 1);
  const identityDone = members.filter(memberIdentityDone).length;
  const identityComplete = identityTotal > 0 && identityDone >= identityTotal;
  const hour = hourOf(r);
  const hourChosen = r.arrival_time_chosen === true || r.confirmedCheckInTime === true || Boolean(hour);

  const [loading, setLoading] = useState(Boolean(reservationId));
  const [contractsSigned, setContractsSigned] = useState(0);
  const [contractsTotal, setContractsTotal] = useState(0);

  useEffect(() => {
    if (!reservationId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [listRes, orchRaw] = await Promise.all([
          guestContractsService.list(reservationId),
          listingId
            ? listingsService.getListingOrchestrationCompiled(listingId).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        const live = listRes.success && Array.isArray(listRes.data) ? listRes.data : [];
        const orch = orchRaw as {
          data?: { capabilities?: { registration?: { gestion?: Record<string, unknown> } } };
          capabilities?: { registration?: { gestion?: Record<string, unknown> } };
        } | null;
        const doc = orch && typeof orch === 'object' && 'data' in orch && orch.data ? orch.data : orch;
        const gestion = (doc?.capabilities?.registration?.gestion ?? {}) as Record<string, unknown>;
        const parsed = parseGuestDocuments(gestion.guestDocuments);
        const docs = parsed ? signableDocuments(parsed) : [];
        const fallback = docs.length
          ? expectedTotal(
              docs.map(d => ({ signerPolicy: d.signerPolicy })),
              identityTotal,
            )
          : 0;
        const progress = liveProgress(live, fallback);
        setContractsSigned(progress.signed);
        setContractsTotal(progress.total);
      } catch {
        if (!cancelled) {
          setContractsSigned(0);
          setContractsTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reservationId, listingId, identityTotal]);

  return useMemo(() => {
    const contractsComplete = contractsTotal > 0 && contractsSigned >= contractsTotal;
    let needed = 1;
    let done = identityComplete ? 1 : 0;
    if (contractsTotal > 0) {
      needed += 1;
      if (contractsComplete) done += 1;
    }
    return {
      loading,
      hour,
      hourChosen,
      identityDone,
      identityTotal,
      identityComplete,
      contractsSigned,
      contractsTotal,
      contractsComplete,
      enregistrementDone: done,
      enregistrementNeeded: needed,
      enregistrementComplete: needed > 0 && done >= needed,
    };
  }, [
    loading,
    hour,
    hourChosen,
    identityDone,
    identityTotal,
    identityComplete,
    contractsSigned,
    contractsTotal,
  ]);
}

type BannerProps = {
  status: EnregistrementStatus;
};

export function EnregistrementStatusBanner({ status: s }: BannerProps) {

  const scroll = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Paper
      sx={{
        p: 1.25,
        mb: 1.25,
        border: `1px solid ${T.border}`,
        borderRadius: 1.25,
        bgcolor: T.bg1,
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              color: T.text3,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Heure d’arrivée
          </Typography>
          <Chip
            size="small"
            label={s.hourChosen && s.hour ? `✅ ${s.hour}` : 'À choisir'}
            sx={{
              height: 22,
              fontSize: 11,
              fontWeight: 700,
              bgcolor: s.hourChosen ? 'rgba(10,143,94,0.12)' : T.bg3,
              color: s.hourChosen ? T.success : T.warning,
            }}
          />
        </Stack>
        <Box sx={{ borderTop: `1px solid ${T.border}`, pt: 1 }}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.75 }}>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: T.text3,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Enregistrement
            </Typography>
            <Chip
              size="small"
              label={
                s.enregistrementComplete
                  ? `✅ ${s.enregistrementDone}/${s.enregistrementNeeded}`
                  : `${s.enregistrementDone}/${s.enregistrementNeeded}`
              }
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 700,
                bgcolor: s.enregistrementComplete ? 'rgba(10,143,94,0.12)' : T.bg3,
                color: s.enregistrementComplete ? T.success : T.text2,
              }}
            />
          </Stack>
          <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
            <Chip
              size="small"
              clickable
              onClick={() => scroll('enregistrement-pieces')}
              label={`Pièces ${s.identityDone}/${s.identityTotal || '?'}`}
              sx={{ height: 22, fontSize: 11, fontWeight: 600, bgcolor: T.bg3, color: T.text }}
            />
            {s.contractsTotal > 0 || s.loading ? (
              <Chip
                size="small"
                clickable
                onClick={() => scroll('enregistrement-contrats')}
                label={s.loading ? 'Contrats…' : `Contrats ${s.contractsSigned}/${s.contractsTotal}`}
                sx={{ height: 22, fontSize: 11, fontWeight: 600, bgcolor: T.bg3, color: T.text }}
              />
            ) : null}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}
