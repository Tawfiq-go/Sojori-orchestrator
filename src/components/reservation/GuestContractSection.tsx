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

const TYPE_ORDER: GuestContractDocumentType[] = [
  'moroccan_police_form',
  'stay_contract',
  'short_term_rental',
];

export type RegisteredContractTraveler = {
  index: number;
  name: string;
};

type ConfiguredContract = {
  documentType: GuestContractDocumentType;
  name: string;
  signerPolicy: 'primary_guest' | 'each_traveler';
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
      signerPolicy: doc.signerPolicy === 'each_traveler' ? 'each_traveler' : 'primary_guest',
    });
  }
  return out.sort(
    (a, b) =>
      (TYPE_ORDER.indexOf(a.documentType) === -1 ? 99 : TYPE_ORDER.indexOf(a.documentType)) -
      (TYPE_ORDER.indexOf(b.documentType) === -1 ? 99 : TYPE_ORDER.indexOf(b.documentType)),
  );
}

function registrationFingerprint(travelers: RegisteredContractTraveler[]): string {
  return travelers
    .map(t => `${t.index}:${t.name.replace(/\s+/g, ' ').trim().toLowerCase()}`)
    .filter(s => !s.endsWith(':'))
    .join('|');
}

function contractFingerprint(contract: GuestContractSummary | null | undefined): string {
  if (!contract) return '';
  return (contract.travelers ?? [])
    .map(t => {
      const name = [t.firstName, t.lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      return name ? `${t.travelerIndex}:${name.toLowerCase()}` : '';
    })
    .filter(Boolean)
    .join('|');
}

/** Only surface a contract when its frozen travelers still match live registration. */
function liveContract(
  contract: GuestContractSummary | null | undefined,
  registered: RegisteredContractTraveler[] | undefined,
): GuestContractSummary | null {
  if (!contract || contract.status === 'superseded') return null;
  if (registered === undefined) return contract;
  if (registered.length === 0) return null;
  return contractFingerprint(contract) === registrationFingerprint(registered) ? contract : null;
}

function formatLabel(configured: ConfiguredContract[]): string {
  const hasPolice = configured.some(c => c.documentType === 'moroccan_police_form');
  const hasStay = configured.some(c => c.documentType === 'stay_contract');
  const allPrimary = configured.every(c => c.signerPolicy === 'primary_guest');
  const policeEach = configured.some(
    c => c.documentType === 'moroccan_police_form' && c.signerPolicy === 'each_traveler',
  );
  if (hasPolice && hasStay && allPrimary) return 'Airbnb · fiches + disclaimer';
  if (policeEach) return 'Hôtel · par voyageur';
  return 'Selon listing';
}

type Props = {
  reservationId: string;
  listingId?: string | null;
  readOnly?: boolean;
  embedded?: boolean;
  /** Live named members from guest registration — contracts must follow these people. */
  registeredTravelers?: RegisteredContractTraveler[];
};

export function GuestContractSection({
  reservationId,
  listingId,
  readOnly = false,
  embedded = false,
  registeredTravelers,
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
        const byType = latestByType(listRes.success && Array.isArray(listRes.data) ? listRes.data : []);
        setConfigured(
          [...byType.keys()]
            .map(documentType => {
              const c = byType.get(documentType);
              return {
                documentType: documentType as GuestContractDocumentType,
                name: documentTypeLabel(documentType),
                signerPolicy:
                  c?.signerPolicy === 'each_traveler'
                    ? ('each_traveler' as const)
                    : ('primary_guest' as const),
              };
            })
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

  const named = useMemo(() => {
    if (registeredTravelers !== undefined) {
      return registeredTravelers.filter(t => t.name.trim());
    }
    const fromContract =
      contracts.find(c => (c.travelers?.length ?? 0) > 0)?.travelers ?? [];
    return fromContract
      .map(t => ({
        index: t.travelerIndex,
        name: [t.firstName, t.lastName].filter(Boolean).join(' ').trim(),
      }))
      .filter(t => t.name);
  }, [registeredTravelers, contracts]);

  const principal = named[0]?.name || 'Voyageur principal';

  const signRows = useMemo(() => {
    const rows: {
      key: string;
      who: string;
      doc: string;
      documentType: GuestContractDocumentType;
    }[] = [];

    for (const cfg of configured) {
      if (cfg.documentType === 'moroccan_police_form' && cfg.signerPolicy === 'each_traveler') {
        if (named.length === 0) continue;
        named.forEach(t => {
          rows.push({
            key: `police-${t.index}`,
            who: t.name,
            doc: 'Fiche',
            documentType: 'moroccan_police_form',
          });
        });
      } else if (cfg.documentType === 'moroccan_police_form') {
        if (registeredTravelers !== undefined && named.length === 0) continue;
        rows.push({
          key: 'police-primary',
          who: principal,
          doc: named.length > 1 ? `Fiches (${named.length})` : 'Fiche',
          documentType: 'moroccan_police_form',
        });
      } else {
        if (registeredTravelers !== undefined && named.length === 0) continue;
        rows.push({
          key: cfg.documentType,
          who: principal,
          doc: cfg.name.replace(/^Guest\s+/i, ''),
          documentType: cfg.documentType,
        });
      }
    }

    return rows;
  }, [configured, named, principal, registeredTravelers]);

  const ensureOne = async (
    documentType: GuestContractDocumentType,
    opts?: { force?: boolean },
  ) => {
    const existing = liveContract(byType.get(documentType), registeredTravelers);
    if (
      existing &&
      existing.status !== 'failed' &&
      existing.status !== 'pending_generation' &&
      existing.unsignedSha256 &&
      opts?.force !== true
    ) {
      return existing;
    }
    const res = await guestContractsService.ensure(reservationId, true, { documentType });
    if (!res.success) {
      toast.error(res.message || 'Génération impossible');
      return null;
    }
    let contract =
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action contrat impossible');
    } finally {
      setBusyKey(null);
    }
  };

  const paintWaitingTab = (tab: Window | null, title: string) => {
    if (!tab || tab.closed) return;
    try {
      tab.document.title = title;
      tab.document.body.innerHTML = `<p style="font:14px system-ui;padding:24px;color:#555">${title}…</p>`;
    } catch {
      /* cross-origin or closed */
    }
  };

  /** Prefer navigating a tab opened in the click gesture; always surface a clickable toast. */
  const deliverUrl = async (url: string, preopened: Window | null, kind: 'web' | 'pdf') => {
    let opened = false;
    if (preopened && !preopened.closed) {
      try {
        preopened.location.href = url;
        opened = true;
      } catch {
        opened = false;
      }
    }
    if (!opened) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
      opened = true;
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
    toast.success(
      kind === 'pdf'
        ? 'PDF prêt — onglet ouvert (lien aussi copié)'
        : 'Lien prêt — onglet ouvert (lien aussi copié)',
      { autoClose: 4000 },
    );
  };

  const openWeb = (documentType: GuestContractDocumentType, rowKey: string) => {
    const tab = window.open('about:blank', '_blank');
    paintWaitingTab(tab, 'Préparation du lien de signature');
    toast.info('Préparation du lien…', { toastId: `gc-web-${rowKey}`, autoClose: 2500 });
    void withBusy(`${rowKey}:web`, async () => {
      try {
        if (registeredTravelers !== undefined && named.length === 0) {
          tab?.close();
          toast.info('Enregistrez d’abord un voyageur');
          return;
        }
        const contract = await ensureOne(documentType);
        if (!contract) {
          tab?.close();
          return;
        }
        if (contract.status === 'signed') {
          tab?.close();
          toast.info('Déjà signé — utilisez PDF');
          return;
        }
        if (contract.status === 'finalizing') {
          tab?.close();
          toast.info('Finalisation en cours');
          return;
        }
        const travelerMatch = /^police-(\d+)$/.exec(rowKey);
        const preferredSigner = travelerMatch ? `traveler:${travelerMatch[1]}` : undefined;
        const signerId =
          preferredSigner ||
          missingSigners(contract)[0]?.signerId ||
          contract.nextSignerId ||
          undefined;
        let res = await guestContractsService.createAccessToken(contract.id, signerId || undefined);
        if (!res.success && preferredSigner) {
          res = await guestContractsService.createAccessToken(contract.id);
        }
        if (!res.success || !res.data?.url) {
          tab?.close();
          toast.error(res.message || 'Lien impossible');
          return;
        }
        await deliverUrl(res.data.url, tab, 'web');
      } catch (err) {
        tab?.close();
        throw err;
      }
    });
  };

  const openPdf = (documentType: GuestContractDocumentType, rowKey: string) => {
    const tab = window.open('about:blank', '_blank');
    paintWaitingTab(tab, 'Préparation du PDF');
    toast.info('Préparation du PDF…', { toastId: `gc-pdf-${rowKey}`, autoClose: 2500 });
    void withBusy(`${rowKey}:pdf`, async () => {
      try {
        if (registeredTravelers !== undefined && named.length === 0) {
          tab?.close();
          toast.info('Enregistrez d’abord un voyageur');
          return;
        }
        const contract = await ensureOne(documentType);
        if (!contract) {
          tab?.close();
          return;
        }
        const variant = contract.status === 'signed' ? 'signed' : 'unsigned';
        const res = await guestContractsService.documentUrl(contract.id, variant);
        if (!res.success || !res.data?.url) {
          tab?.close();
          toast.error(res.message || 'PDF indisponible');
          return;
        }
        await deliverUrl(res.data.url, tab, 'pdf');
      } catch (err) {
        tab?.close();
        throw err;
      }
    });
  };
  return (
    <Box
      sx={
        embedded
          ? { mt: 1, pt: 1, borderTop: `1px solid ${T.border}` }
          : {
              p: 1.25,
              mb: 1.25,
              border: `1px solid ${T.border}`,
              borderRadius: 1.25,
              bgcolor: T.bg1,
            }
      }
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, mb: 0.75, flexWrap: 'wrap' }}>
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
        {configured.length > 0 ? (
          <Chip
            size="small"
            label={formatLabel(configured)}
            sx={{ height: 20, fontSize: 10, fontWeight: 700, bgcolor: T.bg3, color: T.text2 }}
          />
        ) : null}
        {loading ? <CircularProgress size={12} /> : null}
      </Stack>

      {!loading && configured.length === 0 ? (
        <Typography sx={{ fontSize: 12, color: T.text4 }}>
          Aucun contrat signature web sur ce listing.
        </Typography>
      ) : null}

      {!loading && configured.length > 0 && registeredTravelers !== undefined && named.length === 0 ? (
        <Typography sx={{ fontSize: 12, color: T.text4 }}>
          Aucun voyageur enregistré — les contrats apparaîtront avec les personnes enregistrées.
        </Typography>
      ) : null}

      <Stack spacing={0.4}>
        {signRows.map(row => {
          const raw = byType.get(row.documentType);
          const current = liveContract(raw, registeredTravelers);
          const webBusy = busyKey === `${row.key}:web`;
          const pdfBusy = busyKey === `${row.key}:pdf`;
          const anyBusy = Boolean(busyKey);
          return (
            <Stack
              key={row.key}
              direction="row"
              sx={{
                alignItems: 'center',
                gap: 0.75,
                px: 0.85,
                py: 0.45,
                borderRadius: 1,
                bgcolor: T.bg3,
                border: `1px solid ${T.border}`,
                minHeight: 34,
              }}
            >
              <Typography
                sx={{
                  fontSize: 12.5,
                  fontWeight: 750,
                  color: T.text2,
                  flex: '1 1 120px',
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.who}
              </Typography>
              <Typography
                sx={{
                  fontSize: 11,
                  color: T.text3,
                  flex: '0 1 110px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                {row.doc}
              </Typography>
              {current ? (
                <Chip
                  size="small"
                  label={STATUS_LABEL[current.status] ?? current.status}
                  sx={{
                    height: 18,
                    fontSize: 9.5,
                    fontWeight: 700,
                    bgcolor: T.bg1,
                    color: statusColor(current.status),
                    flexShrink: 0,
                  }}
                />
              ) : (
                <Chip
                  size="small"
                  label="—"
                  sx={{ height: 18, fontSize: 9.5, fontWeight: 700, bgcolor: T.bg1, color: T.text4 }}
                />
              )}
              <Button
                size="small"
                variant="contained"
                disabled={readOnly || anyBusy || current?.status === 'signed'}
                onClick={() => openWeb(row.documentType, row.key)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 11,
                  bgcolor: T.primaryDeep,
                  minHeight: 26,
                  px: 1,
                  flexShrink: 0,
                }}
              >
                {webBusy ? <CircularProgress size={12} color="inherit" /> : 'Lien'}
              </Button>
              <Button
                size="small"
                variant="text"
                disabled={anyBusy}
                onClick={() => openPdf(row.documentType, row.key)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 11,
                  color: T.text2,
                  minHeight: 26,
                  minWidth: 0,
                  px: 0.75,
                  flexShrink: 0,
                }}
              >
                {pdfBusy ? <CircularProgress size={12} /> : 'PDF'}
              </Button>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}
