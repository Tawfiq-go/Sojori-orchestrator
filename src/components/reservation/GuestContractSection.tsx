import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import listingsService from '../../services/listingsService';
import guestContractsService, {
  missingSigners,
  type GuestContractStatus,
  type GuestContractSummary,
} from '../../services/guestContractsService';
import {
  type GuestContractDocumentType,
  type GuestDocument,
  documentTypeForGuestDocument,
  documentTypeLabel,
  parseGuestDocuments,
  signableDocuments,
} from '../../features/guestDocuments';

const T = {
  primaryDeep: '#876119',
  bg1: '#ffffff',
  bg3: '#f0eee8',
  text2: '#55504a',
  text3: '#7a756c',
  text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)',
  success: '#0a8f5e',
  warning: '#c46506',
  error: '#c81e1e',
};

const STATUS_LABEL: Record<GuestContractStatus, string> = {
  pending_generation: 'Génération…',
  ready: 'Prêt',
  viewed: 'Consulté',
  partially_signed: 'Partiel',
  finalizing: 'Finalisation…',
  signed: 'Signé',
  declined: 'Refusé',
  superseded: 'Remplacé',
  failed: 'Échec',
};

const TYPE_ORDER: GuestContractDocumentType[] = ['moroccan_police_form', 'stay_contract'];

type ConfiguredContract = {
  documentType: GuestContractDocumentType;
  name: string;
};

function statusColor(status: GuestContractStatus) {
  if (status === 'signed') return T.success;
  if (status === 'failed') return T.error;
  if (status === 'viewed' || status === 'partially_signed') return T.warning;
  return T.text2;
}

function latestByType(list: GuestContractSummary[]): Map<string, GuestContractSummary> {
  const byType = new Map<string, GuestContractSummary>();
  for (const c of list) {
    if (c.status === 'superseded') continue;
    const prev = byType.get(c.documentType);
    if (!prev || (c.version ?? 0) > (prev.version ?? 0)) byType.set(c.documentType, c);
  }
  return byType;
}

function configuredFromDocs(docs: GuestDocument[]): ConfiguredContract[] {
  const seen = new Set<string>();
  const out: ConfiguredContract[] = [];
  for (const doc of signableDocuments(docs)) {
    const documentType = documentTypeForGuestDocument(doc);
    if (seen.has(documentType)) continue;
    seen.add(documentType);
    out.push({
      documentType,
      name: (doc.title || doc.name || documentTypeLabel(documentType)).trim(),
    });
  }
  return out.sort(
    (a, b) =>
      (TYPE_ORDER.indexOf(a.documentType) === -1 ? 99 : TYPE_ORDER.indexOf(a.documentType)) -
      (TYPE_ORDER.indexOf(b.documentType) === -1 ? 99 : TYPE_ORDER.indexOf(b.documentType)),
  );
}

type Props = {
  reservationId: string;
  listingId?: string | null;
  readOnly?: boolean;
  embedded?: boolean;
};

export function GuestContractSection({
  reservationId,
  listingId,
  readOnly = false,
  embedded = false,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [contracts, setContracts] = useState<GuestContractSummary[]>([]);
  const [configured, setConfigured] = useState<ConfiguredContract[]>([]);

  const load = useCallback(async () => {
    if (!reservationId) return;
    setLoading(true);
    try {
      const [listRes, orchRaw] = await Promise.all([
        guestContractsService.list(reservationId),
        listingId
          ? listingsService.getListingOrchestrationCompiled(String(listingId)).catch(() => null)
          : Promise.resolve(null),
      ]);
      setContracts(listRes.success && Array.isArray(listRes.data) ? listRes.data : []);

      const orch = orchRaw as {
        data?: { capabilities?: { registration?: { gestion?: Record<string, unknown> } } };
        capabilities?: { registration?: { gestion?: Record<string, unknown> } };
      } | null;
      const doc = orch && typeof orch === 'object' && 'data' in orch && orch.data ? orch.data : orch;
      const gestion = (doc?.capabilities?.registration?.gestion ?? {}) as Record<string, unknown>;
      const parsed = parseGuestDocuments(gestion.guestDocuments);
      if (parsed) {
        setConfigured(configuredFromDocs(parsed));
      } else {
        // Legacy: any generated contract types, or nothing configured
        const byType = latestByType(listRes.success && Array.isArray(listRes.data) ? listRes.data : []);
        setConfigured(
          [...byType.keys()]
            .map(documentType => ({
              documentType: documentType as GuestContractDocumentType,
              name: documentTypeLabel(documentType),
            }))
            .sort(
              (a, b) =>
                (TYPE_ORDER.indexOf(a.documentType) === -1 ? 99 : TYPE_ORDER.indexOf(a.documentType)) -
                (TYPE_ORDER.indexOf(b.documentType) === -1 ? 99 : TYPE_ORDER.indexOf(b.documentType)),
            ),
        );
      }
    } catch {
      setContracts([]);
      setConfigured([]);
    } finally {
      setLoading(false);
    }
  }, [reservationId, listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const byType = useMemo(() => latestByType(contracts), [contracts]);

  const ensureOne = async (documentType: GuestContractDocumentType) => {
    let contract = byType.get(documentType) ?? null;
    if (contract && contract.status !== 'failed') return contract;
    const res = await guestContractsService.ensure(reservationId, true, { documentType });
    if (!res.success) {
      toast.error(res.message || 'Génération impossible');
      return null;
    }
    contract =
      res.data?.contracts?.find(c => c.documentType === documentType) ??
      (res.data?.contract?.documentType === documentType ? res.data.contract : null) ??
      null;
    const listRes = await guestContractsService.list(reservationId);
    if (listRes.success && Array.isArray(listRes.data)) {
      setContracts(listRes.data);
      contract = latestByType(listRes.data).get(documentType) ?? contract;
    }
    return contract;
  };

  const withBusy = async (key: string, fn: () => Promise<void>) => {
    if (busyKey) return;
    setBusyKey(key);
    try {
      await fn();
    } finally {
      setBusyKey(null);
    }
  };

  const openWeb = (documentType: GuestContractDocumentType) =>
    void withBusy(`${documentType}:web`, async () => {
      const contract = await ensureOne(documentType);
      if (!contract) return;
      if (contract.status === 'signed') {
        toast.info('Déjà signé — utilisez PDF');
        return;
      }
      if (contract.status === 'finalizing') {
        toast.info('Finalisation en cours');
        return;
      }
      const signerId = missingSigners(contract)[0]?.signerId ?? contract.nextSignerId ?? undefined;
      const res = await guestContractsService.createAccessToken(contract.id, signerId || undefined);
      if (!res.success || !res.data?.url) {
        toast.error(res.message || 'Lien impossible');
        return;
      }
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    });

  const openPdf = (documentType: GuestContractDocumentType) =>
    void withBusy(`${documentType}:pdf`, async () => {
      const contract = await ensureOne(documentType);
      if (!contract) return;
      const variant = contract.status === 'signed' ? 'signed' : 'unsigned';
      const res = await guestContractsService.documentUrl(contract.id, variant);
      if (!res.success || !res.data?.url) {
        toast.error(res.message || 'PDF indisponible');
        return;
      }
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    });

  return (
    <Box
      sx={
        embedded
          ? { mt: 1.5, pt: 1.25, borderTop: `1px solid ${T.border}` }
          : {
              p: 1.5,
              mb: 1.75,
              border: `1px solid ${T.border}`,
              borderRadius: 1.5,
              bgcolor: T.bg1,
            }
      }
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 700,
            color: T.text3,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Contrats
        </Typography>
        {loading ? <CircularProgress size={14} /> : null}
      </Stack>

      {!loading && configured.length === 0 ? (
        <Typography sx={{ fontSize: 12.5, color: T.text4 }}>
          Aucun contrat avec signature web sur ce listing.
        </Typography>
      ) : null}

      <Stack spacing={0.75}>
        {configured.map(cfg => {
          const current = byType.get(cfg.documentType);
          const webBusy = busyKey === `${cfg.documentType}:web`;
          const pdfBusy = busyKey === `${cfg.documentType}:pdf`;
          const anyBusy = Boolean(busyKey);
          return (
            <Stack
              key={cfg.documentType}
              direction={{ xs: 'column', sm: 'row' }}
              sx={{
                alignItems: { sm: 'center' },
                justifyContent: 'space-between',
                gap: 1,
                px: 1.1,
                py: 0.85,
                borderRadius: 1.1,
                bgcolor: T.bg3,
                border: `1px solid ${T.border}`,
              }}
            >
              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.85, minWidth: 0, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.text2 }}>
                  {cfg.name}
                </Typography>
                {current ? (
                  <Chip
                    size="small"
                    label={STATUS_LABEL[current.status] ?? current.status}
                    sx={{
                      height: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: T.bg1,
                      color: statusColor(current.status),
                    }}
                  />
                ) : (
                  <Chip
                    size="small"
                    label="À générer"
                    sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: T.bg1, color: T.text3 }}
                  />
                )}
              </Stack>
              <Stack direction="row" sx={{ gap: 0.75, flexShrink: 0 }}>
                <Button
                  size="small"
                  variant="contained"
                  disabled={readOnly || anyBusy || current?.status === 'signed'}
                  onClick={() => openWeb(cfg.documentType)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: 12,
                    bgcolor: T.primaryDeep,
                    minHeight: 30,
                    px: 1.25,
                  }}
                >
                  {webBusy ? <CircularProgress size={14} color="inherit" /> : 'Ouvrir web'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={anyBusy}
                  onClick={() => openPdf(cfg.documentType)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: 12,
                    borderColor: T.border,
                    color: T.text2,
                    minHeight: 30,
                    px: 1.25,
                  }}
                >
                  {pdfBusy ? <CircularProgress size={14} /> : 'PDF'}
                </Button>
              </Stack>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}
