import { useCallback, useEffect, useState } from 'react';
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

function statusColor(status: GuestContractStatus) {
  if (status === 'signed') return T.success;
  if (status === 'failed') return T.error;
  if (status === 'viewed' || status === 'partially_signed') return T.warning;
  return T.text2;
}

function currentContract(list: GuestContractSummary[]): GuestContractSummary | null {
  return list.find(c => c.status !== 'superseded') ?? list[0] ?? null;
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
  const [link, setLink] = useState('');

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

  const current = currentContract(contracts);
  const signed = current?.status === 'signed';
  const generated = Boolean(current) && current?.status !== 'failed';

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

  const handleGenerate = () =>
    void run(async () => {
      const res = await guestContractsService.ensure(reservationId, true);
      if (!res.success) {
        toast.error(res.message || 'Génération impossible');
        return;
      }
      toast.success('Contrat généré');
    });

  const handleRegenerate = () =>
    void run(async () => {
      if (!current) return;
      const res = await guestContractsService.regenerate(current.id, signed);
      if (!res.success) {
        toast.error(res.message || 'Régénération impossible');
        return;
      }
      toast.success(signed ? 'Nouvelle version créée' : 'Contrat régénéré');
    });

  const handleLink = (signerId?: string) =>
    void run(async () => {
      if (!current) return;
      const res = await guestContractsService.createAccessToken(current.id, signerId);
      if (!res.success || !res.data?.url) {
        toast.error(res.message || 'Lien impossible');
        return;
      }
      setLink(res.data.url);
      try {
        await navigator.clipboard.writeText(res.data.url);
        toast.success('Lien de signature copié');
      } catch {
        toast.success('Lien de signature créé');
      }
    });

  const openPdf = (variant: 'unsigned' | 'signed') =>
    void run(async () => {
      if (!current) return;
      const res = await guestContractsService.documentUrl(current.id, variant);
      if (!res.success || !res.data?.url) {
        toast.error(res.message || 'Document indisponible');
        return;
      }
      window.open(res.data.url, '_blank', 'noopener,noreferrer');
    });

  const openEvidence = () =>
    void run(async () => {
      if (!current) return;
      const res = await guestContractsService.evidence(current.id);
      if (!res.success || !res.data) {
        toast.error(res.message || 'Dossier de preuve indisponible');
        return;
      }
      setEvidence(res.data);
      setEvidenceOpen(true);
    });

  const pendingSigners = current && !signed ? missingSigners(current) : [];
  const uiStatus: GuestContractStatus | 'none' = current?.status ?? 'none';

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
        Contrat et signature
      </Typography>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1.25, flexWrap: 'wrap' }}>
        {loading ? (
          <CircularProgress size={16} />
        ) : (
          <Chip
            size="small"
            label={uiStatus === 'none' ? 'Non généré' : STATUS_LABEL[uiStatus]}
            sx={{
              fontWeight: 700,
              fontSize: 11,
              height: 22,
              bgcolor: T.bg3,
              color: uiStatus === 'none' ? T.text2 : statusColor(uiStatus),
            }}
          />
        )}
        <Typography sx={{ fontSize: 12, color: T.text3 }}>
          Signature électronique simple
          {current?.version ? ` · v${current.version}` : ''}
        </Typography>
      </Stack>
      {signed ? (
        <Alert severity="info" sx={{ mb: 1.25, py: 0.5, fontSize: 12.5 }}>
          Le PDF signé est immuable. Une nouvelle génération crée une nouvelle version.
        </Alert>
      ) : null}
      {link ? (
        <Typography sx={{ fontSize: 12, color: T.text3, mb: 1, wordBreak: 'break-all' }}>{link}</Typography>
      ) : null}
      <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
        {!generated ? (
          <Button size="small" variant="contained" disabled={busy || readOnly || !reservationId} onClick={handleGenerate} sx={{ textTransform: 'none', fontWeight: 700, bgcolor: T.primaryDeep }}>
            Générer
          </Button>
        ) : null}
        {generated && !signed && current?.status !== 'finalizing' ? (
          <Button size="small" variant="outlined" disabled={busy || readOnly} onClick={handleRegenerate} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Régénérer avant signature
          </Button>
        ) : null}
        {current?.status === 'finalizing' ? (
          <Button size="small" variant="outlined" disabled={busy || readOnly} onClick={handleRegenerate} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Relancer la finalisation
          </Button>
        ) : null}
        {signed ? (
          <Button size="small" variant="outlined" disabled={busy || readOnly} onClick={handleRegenerate} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Nouvelle version
          </Button>
        ) : null}
        {generated && !signed && current?.status !== 'finalizing' ? (
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
                Lien {[signer.firstName, signer.lastName].filter(Boolean).join(' ') || signer.signerId}
              </Button>
            ))
          ) : (
            <Button size="small" variant="outlined" disabled={busy || readOnly} onClick={() => handleLink(pendingSigners[0]?.signerId)} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Créer / copier le lien de signature
            </Button>
          )
        ) : null}
        {generated ? (
          <Button size="small" variant="outlined" disabled={busy} onClick={() => openPdf('unsigned')} sx={{ textTransform: 'none', fontWeight: 700 }}>
            PDF non signé
          </Button>
        ) : null}
        {signed ? (
          <Button size="small" variant="outlined" disabled={busy} onClick={() => openPdf('signed')} sx={{ textTransform: 'none', fontWeight: 700 }}>
            PDF signé
          </Button>
        ) : null}
        {signed ? (
          <Button size="small" variant="outlined" disabled={busy} onClick={openEvidence} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Dossier de preuve
          </Button>
        ) : null}
      </Stack>
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
                  Signataire {signer.declaredName} ({signer.signerId}) · {signer.signedAt} · consent {signer.consentVersion}
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
