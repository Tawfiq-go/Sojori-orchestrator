/**
 * Compact owner-template policy editor for guest documents.
 * Full content editing stays on the Listing Documents page.
 */
import { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress, Switch, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import listingsService from '../../services/listingsService';
import {
  saveOwnerGestion,
  type OwnerOrchestrationDoc,
} from '../orchestrationListingV3/ownerOrchestrationApi';
import {
  applyDocumentPolicyPatch,
  canBlockAccess,
  documentsFromGestion,
  type GuestDocument,
} from '../guestDocuments';
import {
  DEFAULT_CONTRACT_SIGNATURE,
  parseContractSignature,
} from './contractSignatureDefaults';
import { V3 } from '../orchestrationListingV3/theme';

type Props = {
  ownerKey?: string;
};

export default function OwnerGuestDocumentsPolicyEditor({ ownerKey }: Props) {
  const [doc, setDoc] = useState<OwnerOrchestrationDoc | null>(null);
  const [documents, setDocuments] = useState<GuestDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!ownerKey) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const raw = (await listingsService.getOwnerOrchestrationCompiled(ownerKey)) as
        | { data?: unknown }
        | OwnerOrchestrationDoc
        | null;
      const d = (raw && typeof raw === 'object' && 'data' in raw && raw.data
        ? raw.data
        : raw) as OwnerOrchestrationDoc | null;
      setDoc(d);
      const gestion = (d?.capabilities?.registration?.gestion ?? {}) as Record<string, unknown>;
      const cs = parseContractSignature(gestion.contractSignature);
      setDocuments(documentsFromGestion(gestion, cs ?? DEFAULT_CONTRACT_SIGNATURE));
    } catch {
      setDoc(null);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [ownerKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (nextDocs: GuestDocument[]) => {
    if (!ownerKey || !doc || saving) return;
    setSaving(true);
    const existingGestion = (doc.capabilities?.registration?.gestion ?? {}) as Record<
      string,
      unknown
    >;
    try {
      await saveOwnerGestion({
        ownerKey,
        capabilityKey: 'registration',
        gestion: { ...existingGestion, guestDocuments: nextDocs },
        doc,
      });
      setDocuments(nextDocs);
      toast.success('Politique documents propriétaire enregistrée');
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const patchDoc = (id: string, patch: Parameters<typeof applyDocumentPolicyPatch>[1]) => {
    const next = documents.map((d) => (d.id === id ? applyDocumentPolicyPatch(d, patch) : d));
    setDocuments(next);
    void persist(next);
  };

  if (!ownerKey) return null;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.5 }}>
        <CircularProgress size={16} />
        <Typography sx={{ fontSize: 12.5, color: V3.t3 }}>Documents…</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mt: 1.5,
        border: `1px solid ${V3.b}`,
        borderRadius: 2,
        bgcolor: '#fff',
        px: 2,
        py: 1.5,
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 750, mb: 0.5 }}>
        Documents voyageurs (défauts propriétaire)
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: V3.t3, mb: 1.25, lineHeight: 1.4 }}>
        Activez et réglez obligatoire / bloque l’accès. Le texte des contrats se configure
        dans l’onglet Documents de chaque listing.
      </Typography>
      <Box sx={{ display: 'grid', gap: 1 }}>
        {documents.map((item) => {
          const blockOk = canBlockAccess(item);
          return (
            <Box
              key={item.id}
              sx={{
                border: `1px solid ${V3.b}`,
                borderRadius: 1.5,
                px: 1.5,
                py: 1,
                bgcolor: item.enabled ? V3.card : V3.alt,
              }}
            >
              <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{item.name}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 0.5, alignItems: 'center' }}>
                <RowSwitch
                  label="Actif"
                  checked={item.enabled}
                  disabled={saving || !doc}
                  onChange={(v) => patchDoc(item.id, { enabled: v })}
                />
                <RowSwitch
                  label="Obligatoire avant l’arrivée"
                  checked={item.requiredBeforeArrival}
                  disabled={saving || !doc || !item.enabled}
                  onChange={(v) => patchDoc(item.id, { requiredBeforeArrival: v })}
                />
                <RowSwitch
                  label="Bloque l’accès"
                  checked={item.blocksAccess}
                  disabled={saving || !doc || !blockOk}
                  onChange={(v) => patchDoc(item.id, { blocksAccess: v })}
                />
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function RowSwitch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      <Switch size="small" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <Typography sx={{ fontSize: 11, color: V3.t2 }}>{label}</Typography>
    </Box>
  );
}
