import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { toast } from 'react-toastify';
import listingsService from '../../services/listingsService';
import {
  saveListingGestion,
  type ListingOrchestrationDoc,
} from '../orchestrationListingV3/listingOrchestrationApi';
import {
  saveOwnerGestion,
  type OwnerOrchestrationDoc,
} from '../orchestrationListingV3/ownerOrchestrationApi';
import { ReportLogoPreview } from '../finances/components/ReportLogoPreview';
import { uploadReportLogo } from '../finances/services/reportLogoUpload';
import { getAccounById, updateOwner } from '../staff/services/serverApi.task';

import {
  contractSignatureOriginLabel,
  DEFAULT_CONTRACT_SIGNATURE,
  parseContractSignature,
  parseContractSignatureOrigin,
  type ContractSignatureConfigValue,
  type ContractSignatureOrigin,
} from './contractSignatureDefaults';

type Props = {
  listingId?: string;
  ownerKey?: string;
};

type AnyDoc = ListingOrchestrationDoc | OwnerOrchestrationDoc;

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function LogoFallback({ name }: { name: string }) {
  const label = name.trim() || 'Établissement';
  return (
    <Box
      sx={{
        width: 56,
        height: 56,
        borderRadius: 1,
        bgcolor: 'rgba(26,22,17,0.06)',
        border: '1px solid rgba(26,22,17,0.10)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 0.25,
        px: 0.5,
      }}
    >
      <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1, color: 'text.primary' }}>
        {initialsFromName(label)}
      </Typography>
      {!name.trim() ? (
        <Typography sx={{ fontSize: 9, color: 'text.secondary', textAlign: 'center', lineHeight: 1.1 }}>
          Sans logo
        </Typography>
      ) : null}
    </Box>
  );
}

export function ContractSignatureConfig({ listingId, ownerKey }: Props) {
  const [doc, setDoc] = useState<AnyDoc | null>(null);
  const [value, setValue] = useState<ContractSignatureConfigValue>(DEFAULT_CONTRACT_SIGNATURE);
  const [origin, setOrigin] = useState<ContractSignatureOrigin>('default');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolvedOwnerId, setResolvedOwnerId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [establishmentName, setEstablishmentName] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const ownerMode = !listingId && Boolean(ownerKey);

  const loadOwnerBranding = useCallback(async (ownerId: string) => {
    try {
      const res = await getAccounById(ownerId);
      const account = (res as { data?: { account?: Record<string, unknown> } })?.data?.account;
      const pm = (account?.pmProfile && typeof account.pmProfile === 'object'
        ? account.pmProfile
        : {}) as Record<string, unknown>;
      const logo = typeof pm.logoImage === 'string' ? pm.logoImage.trim() : '';
      const publicName = typeof pm.publicName === 'string' ? pm.publicName.trim() : '';
      const company =
        typeof account?.companyName === 'string' ? String(account.companyName).trim() : '';
      setLogoUrl(logo);
      setEstablishmentName(publicName || company || '');
    } catch {
      setLogoUrl('');
      setEstablishmentName('');
    }
  }, []);

  const resolveOwnerId = useCallback(
    async (orchestrationDoc: AnyDoc | null): Promise<string | null> => {
      if (ownerMode) {
        const key = String(ownerKey || '').trim();
        if (!key || key === 'global') return null;
        return key;
      }
      const fromDoc = orchestrationDoc && 'ownerId' in orchestrationDoc
        ? String((orchestrationDoc as ListingOrchestrationDoc).ownerId || '').trim()
        : '';
      if (fromDoc) return fromDoc;
      if (!listingId) return null;
      try {
        const listingRes = await listingsService.getListingById(listingId);
        const oid = listingRes.data?.ownerId ? String(listingRes.data.ownerId).trim() : '';
        return oid || null;
      } catch {
        return null;
      }
    },
    [listingId, ownerKey, ownerMode],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = (ownerMode
        ? await listingsService.getOwnerOrchestrationCompiled(ownerKey as string)
        : await listingsService.getListingOrchestrationCompiled(listingId as string)) as
        | { data?: unknown }
        | AnyDoc
        | null;
      const d = (raw && typeof raw === 'object' && 'data' in raw && raw.data
        ? raw.data
        : raw) as AnyDoc | null;
      setDoc(d ?? null);
      const gestion = (d?.capabilities?.registration?.gestion ?? {}) as Record<string, unknown>;
      const compiled = (d as { contractSignature?: unknown } | null)?.contractSignature;
      const compiledRec =
        compiled && typeof compiled === 'object' ? (compiled as Record<string, unknown>) : null;
      setValue(parseContractSignature(gestion.contractSignature ?? compiled));

      let nextOrigin = parseContractSignatureOrigin(compiledRec?.origin);
      const hasListingOverride =
        !ownerMode &&
        gestion.contractSignature != null &&
        typeof gestion.contractSignature === 'object';
      if (hasListingOverride) {
        nextOrigin = 'listing';
      } else if (compiledRec?.origin == null) {
        // Listing without override → inherited; owner without saved block → defaults.
        nextOrigin = ownerMode ? 'default' : 'owner';
        if (
          ownerMode &&
          gestion.contractSignature != null &&
          typeof gestion.contractSignature === 'object'
        ) {
          nextOrigin = 'owner';
        }
      }
      setOrigin(nextOrigin);

      const oid = await resolveOwnerId(d);
      setResolvedOwnerId(oid);
      if (oid) await loadOwnerBranding(oid);
      else {
        setLogoUrl('');
        setEstablishmentName('');
      }
    } catch {
      setDoc(null);
      setResolvedOwnerId(null);
      setLogoUrl('');
      setEstablishmentName('');
      setOrigin('default');
    } finally {
      setLoading(false);
    }
  }, [listingId, ownerKey, ownerMode, resolveOwnerId, loadOwnerBranding]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (next: ContractSignatureConfigValue) => {
    if (!doc || saving) return;
    setSaving(true);
    const existingGestion = (doc.capabilities?.registration?.gestion ?? {}) as Record<string, unknown>;
    const gestion = { ...existingGestion, contractSignature: next };
    try {
      if (ownerMode) {
        await saveOwnerGestion({
          ownerKey: ownerKey as string,
          capabilityKey: 'registration',
          gestion,
          doc: doc as OwnerOrchestrationDoc,
        });
      } else {
        await saveListingGestion({
          listingId: listingId as string,
          capabilityKey: 'registration',
          gestion,
          doc: doc as ListingOrchestrationDoc,
        });
      }
      setValue(next);
      toast.success(
        next.enabled ? 'Contrat et signature activés' : 'Contrat et signature désactivés',
      );
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const persistLogo = async (url: string) => {
    if (!resolvedOwnerId) {
      toast.error('Propriétaire introuvable pour enregistrer le logo');
      return;
    }
    await updateOwner(resolvedOwnerId, { pmProfile: { logoImage: url } });
    setLogoUrl(url);
  };

  const onLogoFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !resolvedOwnerId || logoBusy) return;
    setLogoBusy(true);
    try {
      const url = await uploadReportLogo(file);
      await persistLogo(url);
      toast.success(logoUrl ? 'Logo remplacé' : 'Logo enregistré');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload logo impossible');
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onRemoveLogo = async () => {
    if (!resolvedOwnerId || logoBusy) return;
    setLogoBusy(true);
    try {
      await persistLogo('');
      toast.success('Logo retiré');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Suppression logo impossible');
    } finally {
      setLogoBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Chargement…</Typography>
      </Box>
    );
  }

  const hasLogo = Boolean(logoUrl.trim());
  const displayName = establishmentName.trim() || 'Établissement';
  const originChipLabel = `Configuration effective : ${contractSignatureOriginLabel(origin)}`;

  return (
    <Box
      sx={{
        mt: 2,
        p: 1.5,
        border: '1px solid rgba(26,22,17,0.10)',
        borderRadius: 1.5,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.75, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Contrat et signature</Typography>
        <Chip
          size="small"
          label={originChipLabel}
          variant="outlined"
          sx={{ height: 22, fontSize: 11 }}
          color={origin === 'listing' ? 'warning' : origin === 'owner' ? 'info' : 'default'}
        />
      </Stack>

      <Alert severity="info" sx={{ mb: 0.75, fontSize: 12.5, py: 0.5 }}>
        L&apos;envoi WhatsApp automatique exige les deux options activées (contrat + envoi auto).
      </Alert>
      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 1.5, lineHeight: 1.4 }}>
        Signature électronique simple (loi n° 43-20) — non avancée ni qualifiée.
      </Typography>

      <Box
        sx={{
          mb: 1.5,
          p: 1.25,
          borderRadius: 1,
          bgcolor: 'rgba(26,22,17,0.02)',
          border: '1px solid rgba(26,22,17,0.08)',
        }}
      >
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, mb: 1 }}>Logo propriétaire</Typography>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              flexShrink: 0,
              '& img': { width: 56, height: 56, objectFit: 'contain', display: 'block' },
            }}
          >
            <ReportLogoPreview
              canonicalUrl={logoUrl}
              alt={displayName}
              empty={<LogoFallback name={displayName} />}
              brokenFallback={<LogoFallback name={displayName} />}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 13, fontWeight: 600 }}>
              {displayName}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
              Logo propriétaire (pmProfile.logoImage) — même asset que les rapports P&amp;L. Hérité
              par tous les logements.
            </Typography>
          </Box>
        </Stack>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          hidden
          onChange={e => void onLogoFile(e.target.files)}
        />
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            size="small"
            variant="contained"
            disabled={!resolvedOwnerId || logoBusy || saving}
            onClick={() => fileRef.current?.click()}
          >
            {logoBusy ? 'Envoi…' : hasLogo ? 'Remplacer' : 'Uploader'}
          </Button>
          {hasLogo ? (
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              disabled={!resolvedOwnerId || logoBusy || saving}
              onClick={() => void onRemoveLogo()}
            >
              Retirer
            </Button>
          ) : null}
        </Stack>
        {!resolvedOwnerId ? (
          <Typography sx={{ fontSize: 11, color: 'warning.main', mt: 0.75 }}>
            Propriétaire introuvable — logo non modifiable ici.
          </Typography>
        ) : null}
      </Box>

      <Box
        sx={{
          mb: 1.5,
          p: 1.25,
          borderRadius: 1,
          border: '1px dashed rgba(26,22,17,0.14)',
          bgcolor: '#faf9f7',
        }}
      >
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>
          Aperçu document (fiche hôtel)
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              '& img': { width: 36, height: 36, objectFit: 'contain', display: 'block' },
            }}
          >
            <ReportLogoPreview
              canonicalUrl={logoUrl}
              alt=""
              empty={
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 0.75,
                    bgcolor: 'rgba(26,22,17,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {initialsFromName(displayName)}
                </Box>
              }
              brokenFallback={
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 0.75,
                    bgcolor: 'rgba(26,22,17,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {initialsFromName(displayName)}
                </Box>
              }
            />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>{displayName}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Fiche de séjour</Typography>
          </Box>
        </Stack>
        <Stack spacing={0.35}>
          {[
            'Voyageur principal',
            'Dates de séjour',
            'Pièce d’identité',
            'Signature électronique simple',
          ].map(label => (
            <Box
              key={label}
              sx={{
                height: 18,
                borderRadius: 0.5,
                bgcolor: 'rgba(26,22,17,0.05)',
                display: 'flex',
                alignItems: 'center',
                px: 0.75,
              }}
            >
              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{label}</Typography>
            </Box>
          ))}
        </Stack>
        {value.establishmentNotice ? (
          <Typography
            sx={{
              mt: 1,
              fontSize: 10,
              fontStyle: 'italic',
              color: 'text.secondary',
              lineHeight: 1.35,
            }}
          >
            {value.establishmentNotice}
          </Typography>
        ) : null}
      </Box>

      <Stack spacing={1.25}>
        <FormControlLabel
          control={
            <Switch
              checked={value.enabled}
              disabled={saving || !doc}
              onChange={e => void save({ ...value, enabled: e.target.checked })}
            />
          }
          label="Activer le contrat et la signature (pilote manuel dashboard)"
        />
        <FormControlLabel
          control={
            <Switch
              checked={value.autoSendAfterRegistration}
              disabled={saving || !doc || !value.enabled}
              onChange={e => void save({ ...value, autoSendAfterRegistration: e.target.checked })}
            />
          }
          label="Générer et envoyer automatiquement après l’enregistrement"
        />
        <FormControl size="small" fullWidth>
          <TextField
            select
            size="small"
            label="Type de document"
            value={value.documentType}
            disabled={saving || !doc}
            onChange={e =>
              void save({
                ...value,
                documentType: e.target.value as ContractSignatureConfigValue['documentType'],
              })
            }
          >
            <MenuItem value="stay_contract">Contrat de séjour</MenuItem>
            {value.documentType === 'moroccan_police_form' ? (
              <MenuItem value="moroccan_police_form" disabled>
                Fiche de police (non officiel)
              </MenuItem>
            ) : null}
          </TextField>
        </FormControl>
        {value.documentType === 'moroccan_police_form' ? (
          <Alert severity="warning" sx={{ fontSize: 12.5 }}>
            La fiche de police marocaine n&apos;est pas un formulaire officiel pour ce pilote.
            Revenez au contrat de séjour.
          </Alert>
        ) : null}
        <FormControl size="small" fullWidth>
          <TextField
            select
            size="small"
            label="Politique de signataire"
            value={value.signerPolicy}
            disabled={saving || !doc}
            onChange={e =>
              void save({
                ...value,
                signerPolicy: e.target.value as ContractSignatureConfigValue['signerPolicy'],
              })
            }
          >
            <MenuItem value="primary_guest">Voyageur principal uniquement</MenuItem>
            <MenuItem value="each_traveler">Chaque voyageur</MenuItem>
          </TextField>
        </FormControl>
        <TextField
          size="small"
          multiline
          minRows={2}
          label="Mention / règlement de l’établissement"
          helperText="Texte affiché en pied de fiche. Modifiable sans nouveau déploiement."
          value={value.establishmentNotice}
          disabled={saving || !doc}
          onBlur={() => void save(value)}
          onChange={e => setValue({ ...value, establishmentNotice: e.target.value })}
        />
        <Accordion
          disableGutters
          elevation={0}
          sx={{
            border: '1px solid rgba(26,22,17,0.08)',
            borderRadius: '8px !important',
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 40, px: 1.25 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>Avancé (interne)</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 1.25, pt: 0, pb: 1.25 }}>
            <TextField
              size="small"
              fullWidth
              label="Template ID"
              helperText="Identifiant interne, non imprimé sur le PDF voyageur"
              value={value.templateId}
              disabled={saving || !doc}
              onBlur={() => void save(value)}
              onChange={e => setValue({ ...value, templateId: e.target.value })}
            />
          </AccordionDetails>
        </Accordion>
      </Stack>
    </Box>
  );
}
