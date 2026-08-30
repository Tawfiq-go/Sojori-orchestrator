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
  Stack,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import guestContractsService, {
  missingSigners,
  type GuestContractEvidenceSummary,
  type GuestContractStatus,
  type GuestContractSummary,
} from '../../services/guestContractsService';
import { documentTypeLabel } from '../../features/guestDocuments';

const T = {
  primaryDeep: '#876119',
  bg1: '#ffffff',
  bg3: '#f0eee8',
  text2: '#55504a',
  text3: '#7a756c',
  border: 'rgba(20,17,10,0.07)',
  success: '#0a8f5e',
  warning: '#c46506',
  error: '#c81e1e',
};

const STATUS_LABEL: Record<GuestContractStatus, string> = {
  pending_generation: 'Génération…',
  ready: 'Prêt à signer',
  viewed: 'Consulté',
  partially_signed: 'Partiellement signé',
  finalizing: 'Finalisation…',
  signed: 'Signé',
  declined: 'Refusé',
  superseded: 'Remplacé',
  failed: 'Échec',
};

const TYPE_ORDER = ['moroccan_police_form', 'stay_contract'];

function statusColor(status: GuestContractStatus) {
  if (status === 'signed') return T.success;
  if (status === 'failed') return T.error;
  if (status === 'viewed' || status === 'partially_signed') return T.warning;
  return T.text2;
}

/** Latest non-superseded contract per documentType (police + disclaimer). */
function currentContractsByType(list: GuestContractSummary[]): GuestContractSummary[] {
  const byType = new Map<string, GuestContractSummary>();
  for (const c of list) {
    if (c.status === 'superseded') continue;
    const prev = byType.get(c.documentType);
    if (!prev || (c.version ?? 0) > (prev.version ?? 0)) byType.set(c.documentType, c);
  }
  return [...byType.values()].sort(
    (a, b) =>
      (TYPE_ORDER.indexOf(a.documentType) === -1 ? 99 : TYPE_ORDER.indexOf(a.documentType)) -
      (TYPE_ORDER.indexOf(b.documentType) === -1 ? 99 : TYPE_ORDER.indexOf(b.documentType)),
  );
}

type Props = {
  reservationId: string;
  readOnly?: boolean;
};

export function GuestContractSection({ reservationId, readOnly = false }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [contracts, setContracts] = useState<GuestContractSummary[]>([]);
  const [evidence, setEvidence] = useState<GuestContractEvidenceSummary | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [links, setLinks] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!reservationId) return;
    setLoading(true);
    try {
      const res = await guestContractsService.list(reservationId);
      setContracts(res.success && Array.isArray(res.data) ? res.data : []);
    } catch {
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [reservationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentList = useMemo(() => currentContractsByType(contracts), [contracts]);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateAll = () =>
    void run(async () => {
      const res = await guestContractsService.ensure(reservationId, true, { ensureAll: true });
      if (!res.success) {
        toast.error(res.message || 'Génération impossible');
        return;
      }
      const n = res.data?.contracts?.length ?? (res.data?.contract ? 1 : 0);
      toast.success(n > 1 ? `${n} documents générés` : 'Contrat généré');
    });

  return (
    <Box
      sx={{
        p: 2,
        mb: 1.75,
        border: `1px solid ${T.border}`,
        borderRadius: 1.5,
        bgcolor: T.bg1,
      }}
    >
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 700,
          color: T.text3,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          mb: 0.75,
        }}
      >
        Contrats et signature
      </Typography>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1.25, flexWrap: 'wrap' }}>
        {loading ? <CircularProgress size={16} /> : null}
        <Typography sx={{ fontSize: 12, color: T.text3 }}>
          Signature électronique simple
          {currentList.length
            ? ` · ${currentList.length} document${currentList.length > 1 ? 's' : ''}`
            : ''}
        </Typography>
      </Stack>

      {currentList.length === 0 && !loading ? (
        <Stack spacing={1.25}>
          <Typography sx={{ fontSize: 12.5, color: T.text3 }}>
            Aucun document généré. La fiche de police et le disclaimer (si Actif + Signature web sur
            le listing) seront créés ensemble.
          </Typography>
          <Button
            size="small"
            variant="contained"
            disabled={busy || readOnly || !reservationId}
            onClick={handleGenerateAll}
            sx={{ textTransform: 'none', fontWeight: 700, bgcolor: T.primaryDeep, alignSelf: 'flex-start' }}
          >
            Générer les documents à signer
          </Button>
        </Stack>
      ) : null}

      {currentList.map(current => (
        <ContractCard
          key={current.id}
          current={current}
          busy={busy}
          readOnly={readOnly}
          link={links[current.id] || ''}
          onBusy={run}
          onLink={url => setLinks(prev => ({ ...prev, [current.id]: url }))}
          onEvidence={ev => {
            setEvidence(ev);
            setEvidenceOpen(true);
          }}
        />
      ))}

      {currentList.length > 0 && currentList.length < 2 && !readOnly ? (
        <Button
          size="small"
          variant="outlined"
          disabled={busy}
          onClick={handleGenerateAll}
          sx={{ textTransform: 'none', fontWeight: 700, mt: 1 }}
        >
          Générer / compléter les documents manquants
        </Button>
      ) : null}

      <Dialog open={evidenceOpen} onClose={() => setEvidenceOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Dossier de preuve</DialogTitle>
        <DialogContent>
          {evidence ? (
            <Stack spacing={0.75} sx={{ fontSize: 13, mt: 1 }}>
              <div>Contrat : {evidence.contractId}</div>
              <div>Type : {evidence.documentType}</div>
              <div>Template : {evidence.templateVersion}</div>
              <div>Hash snapshot : {evidence.sourceSnapshotHash}</div>
              <div>Hash PDF présenté : {evidence.unsignedSha256}</div>
              <div>Hash PDF signé : {evidence.signedSha256}</div>
              <div>Hash preuve : {evidence.evidenceSha256}</div>
              {(evidence.signers ?? []).map(signer => (
                <div key={signer.signerId}>
                  Signataire {signer.declaredName} ({signer.signerId}) · {signer.signedAt} · consent{' '}
                  {signer.consentVersion}
                </div>
              ))}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEvidenceOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function deliveryLabel(status: string) {
  if (status === 'sent') return 'Envoyé';
  if (status === 'failed') return 'Échec envoi';
  if (status === 'sending') return 'Envoi…';
  return 'En attente';
}

function formatSentAt(value: string | Date) {
  try {
    return new Date(value).toLocaleString('fr-MA');
  } catch {
    return String(value);
  }
}

function ContractCard({
  current,
  busy,
  readOnly,
  link,
  onBusy,
  onLink,
  onEvidence,
}: {
  current: GuestContractSummary;
  busy: boolean;
  readOnly: boolean;
  link: string;
  onBusy: (fn: () => Promise<void>) => Promise<void>;
  onLink: (url: string) => void;
  onEvidence: (ev: GuestContractEvidenceSummary) => void;
}) {
  const signed = current.status === 'signed';
  const generated = current.status !== 'failed';
  const pendingSigners = !signed ? missingSigners(current) : [];
  const deliveries = current.linkDeliveries ?? [];
  const title = documentTypeLabel(current.documentType);

  const handleRegenerate = () =>
    void onBusy(async () => {
      const res = await guestContractsService.regenerate(current.id, signed);
      if (!res.success) {
        toast.error(res.message || 'Régénération impossible');
        return;
      }
      toast.success(signed ? 'Nouvelle version créée' : 'Document régénéré');
    });

  const handleLink = (signerId?: string) =>
    void onBusy(async () => {
      const res = await guestContractsService.createAccessToken(current.id, signerId);
      if (!res.success || !res.data?.url) {
        toast.error(res.message || 'Lien impossible');
        return;
      }
      onLink(res.data.url);
      try {
        await navigator.clipboard.writeText(res.data.url);
        toast.success(`Lien « ${title} » copié`);
      } catch {
        toast.success(`Lien « ${title} » créé`);
      }
    });

  const openPdf = (variant: 'unsigned' | 'signed') =>
    void onBusy(async () => {
      const res = await guestContractsService.documentUrl(current.id, variant);
      if (!res.success || !res.data?.url) {
        toast.error(res.message || 'PDF indisponible');
        return;
      }
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    });

  const openEvidence = () =>
    void onBusy(async () => {
      const res = await guestContractsService.evidence(current.id);
      if (!res.success || !res.data) {
        toast.error(res.message || 'Preuve indisponible');
        return;
      }
      onEvidence(res.data);
    });

  const handleRetryDelivery = (deliveryId: string) =>
    void onBusy(async () => {
      const res = await guestContractsService.retryLinkDelivery(current.id, deliveryId);
      if (!res.success) {
        toast.error(res.message || 'Nouvel envoi impossible');
        return;
      }
      toast.success('Envoi relancé');
    });

  return (
    <Box
      sx={{
        border: `1px solid ${T.border}`,
        borderRadius: 1.25,
        p: 1.5,
        mb: 1.25,
        bgcolor: T.bg3,
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>{title}</Typography>
        <Chip
          size="small"
          label={STATUS_LABEL[current.status]}
          sx={{
            fontWeight: 700,
            fontSize: 11,
            height: 22,
            bgcolor: T.bg1,
            color: statusColor(current.status),
          }}
        />
        <Typography sx={{ fontSize: 11.5, color: T.text3 }}>v{current.version}</Typography>
      </Stack>

      {signed ? (
        <Alert severity="info" sx={{ mb: 1, py: 0.5, fontSize: 12.5 }}>
          PDF signé immuable. « Nouvelle version » crée un nouveau document.
        </Alert>
      ) : null}

      <Typography sx={{ fontSize: 12, color: T.text3, mb: 1 }}>
        Qui signe :{' '}
        <strong>
          {current.signerPolicy === 'each_traveler'
            ? 'chaque voyageur adulte'
            : 'voyageur principal'}
        </strong>
        {current.expectedSignerIds?.length
          ? ` · ${current.expectedSignerIds.length} signataire(s)`
          : ''}
      </Typography>

      {deliveries.length ? (
        <Stack spacing={0.75} sx={{ mb: 1 }}>
          {deliveries.map(delivery => (
            <Stack
              key={delivery.id}
              direction="row"
              sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
            >
              <Chip
                size="small"
                label={deliveryLabel(delivery.status)}
                sx={{
                  fontWeight: 700,
                  fontSize: 11,
                  height: 22,
                  bgcolor: T.bg1,
                  color:
                    delivery.status === 'failed'
                      ? T.error
                      : delivery.status === 'sent'
                        ? T.success
                        : T.warning,
                }}
              />
              <Typography sx={{ fontSize: 12, color: T.text3 }}>
                {delivery.signerLabel || delivery.signerId}
                {delivery.recipientMasked ? ` · ${delivery.recipientMasked}` : ''}
                {delivery.sentAt ? ` · ${formatSentAt(delivery.sentAt)}` : ''}
                {delivery.status === 'failed' && delivery.lastError ? ` · ${delivery.lastError}` : ''}
              </Typography>
              {delivery.status === 'failed' && delivery.retryable !== false && !readOnly ? (
                <Button
                  size="small"
                  variant="text"
                  disabled={busy}
                  onClick={() => handleRetryDelivery(delivery.id)}
                  sx={{ textTransform: 'none', fontWeight: 700, minWidth: 0 }}
                >
                  Réessayer
                </Button>
              ) : null}
            </Stack>
          ))}
        </Stack>
      ) : null}

      {link ? (
        <Typography sx={{ fontSize: 12, color: T.text3, mb: 1, wordBreak: 'break-all' }}>
          {link}
        </Typography>
      ) : null}

      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
        {generated && !signed && current.status !== 'finalizing' ? (
          <Button
            size="small"
            variant="outlined"
            disabled={busy || readOnly}
            onClick={handleRegenerate}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Régénérer
          </Button>
        ) : null}
        {current.status === 'finalizing' || signed ? (
          <Button
            size="small"
            variant="outlined"
            disabled={busy || readOnly}
            onClick={handleRegenerate}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {signed ? 'Nouvelle version' : 'Relancer finalisation'}
          </Button>
        ) : null}
        {generated && !signed && current.status !== 'finalizing' ? (
          pendingSigners.length > 1 ? (
            pendingSigners.map(signer => (
              <Button
                key={signer.signerId}
                size="small"
                variant="outlined"
                disabled={busy || readOnly}
                onClick={() => handleLink(signer.signerId)}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Lien{' '}
                {[signer.firstName, signer.lastName].filter(Boolean).join(' ') || signer.signerId}
              </Button>
            ))
          ) : (
            <Button
              size="small"
              variant="contained"
              disabled={busy || readOnly}
              onClick={() => handleLink(pendingSigners[0]?.signerId)}
              sx={{ textTransform: 'none', fontWeight: 700, bgcolor: T.primaryDeep }}
            >
              Lien de signature
            </Button>
          )
        ) : null}
        {generated ? (
          <Button
            size="small"
            variant="outlined"
            disabled={busy}
            onClick={() => openPdf('unsigned')}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            PDF
          </Button>
        ) : null}
        {signed ? (
          <Button
            size="small"
            variant="outlined"
            disabled={busy}
            onClick={() => openPdf('signed')}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            PDF signé
          </Button>
        ) : null}
        {signed ? (
          <Button
            size="small"
            variant="outlined"
            disabled={busy}
            onClick={openEvidence}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Preuve
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
