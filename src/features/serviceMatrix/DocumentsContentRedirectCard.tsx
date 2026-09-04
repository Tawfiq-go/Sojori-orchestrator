import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { V3 } from '../orchestrationListingV3/theme';
import {
  documentsFromGestion,
  summarizeDocumentPolicies,
  type DocumentPolicySummary,
} from '../guestDocuments';
import listingsService from '../../services/listingsService';
import { parseContractSignature } from './contractSignatureDefaults';

type Props = {
  listingId?: string;
  templateMode?: boolean;
  policySummary?: DocumentPolicySummary | null;
};

function formatPolicySummary(summary: DocumentPolicySummary | null | undefined): string {
  if (!summary) {
    return 'Politique documents : configurez chaque document dans l’onglet Documents.';
  }
  const { requiredCount, blockingCount } = summary;
  if (requiredCount === 0 && blockingCount === 0) {
    return 'Aucun document obligatoire · aucun ne bloque l’accès';
  }
  const req =
    requiredCount === 0
      ? 'Aucun document obligatoire'
      : requiredCount === 1
        ? '1 document obligatoire'
        : `${requiredCount} documents obligatoires`;
  const block =
    blockingCount === 0
      ? 'aucun ne bloque l’accès'
      : blockingCount === 1
        ? '1 bloque l’accès'
        : `${blockingCount} bloquent l’accès`;
  return `${req} · ${block}`;
}

export default function DocumentsContentRedirectCard({
  listingId,
  templateMode = false,
  policySummary = null,
}: Props) {
  const navigate = useNavigate();
  const canNavigate = !templateMode && Boolean(listingId);
  const [loadedSummary, setLoadedSummary] = useState<DocumentPolicySummary | null>(policySummary);

  useEffect(() => {
    if (policySummary) {
      setLoadedSummary(policySummary);
      return;
    }
    if (!listingId || templateMode) return;
    let cancelled = false;
    void (async () => {
      try {
        const raw = (await listingsService.getListingOrchestrationCompiled(String(listingId))) as {
          data?: {
            capabilities?: { registration?: { gestion?: Record<string, unknown> } };
            contractSignature?: unknown;
          };
        } | null;
        const d = raw && typeof raw === 'object' && 'data' in raw && raw.data ? raw.data : raw;
        const gestion = (d?.capabilities?.registration?.gestion ?? {}) as Record<string, unknown>;
        const cs = parseContractSignature(gestion.contractSignature ?? d?.contractSignature);
        const docs = documentsFromGestion(gestion, cs);
        if (!cancelled) setLoadedSummary(summarizeDocumentPolicies(docs));
      } catch {
        if (!cancelled) setLoadedSummary(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId, templateMode, policySummary]);

  return (
    <Box
      sx={{
        border: `1px dashed ${V3.bs}`,
        borderRadius: '12px',
        bgcolor: V3.alt,
        px: 2,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
      }}
    >
      <Typography sx={{ fontSize: 18, lineHeight: 1 }}>📄</Typography>
      <Box sx={{ flex: 1, minWidth: 220 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: V3.t }}>
          Fiche de police et contrats se configurent dans l&apos;onglet Documents du listing
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: V3.t3, lineHeight: 1.4, mt: 0.35 }}>
          {formatPolicySummary(loadedSummary)}
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: V3.t3, lineHeight: 1.4, mt: 0.35 }}>
          Nom, titre, contenu, champs et signature web
          {templateMode ? ' — dans l’onglet Documents de chaque listing.' : '.'}
          {' '}Ici : activations (Gérer · Client · Tâche · Orchestrer) et politique d’enregistrement.
        </Typography>
      </Box>
      {canNavigate ? (
        <Button
          size="small"
          variant="outlined"
          onClick={() =>
            navigate(`/listings/${listingId}?level=detail&tab=documents`, {
              state: { listingFormNavToken: Date.now() },
            })
          }
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            fontSize: 12,
            borderColor: V3.p,
            color: V3.pd,
            '&:hover': { borderColor: V3.pd, bgcolor: V3.pt },
          }}
        >
          Ouvrir l&apos;onglet Documents
        </Button>
      ) : null}
    </Box>
  );
}
