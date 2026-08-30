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
  contractLogoOriginLabel,
  resolveEffectiveContractLogoPreview,
} from './contractLogoInheritance';
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
  /** Listing documents tab: logo / en-tête only — signature lives on each contract. */
  logoOnly?: boolean;
};

type AnyDoc = ListingOrchestrationDoc | OwnerOrchestrationDoc;

/** PDF company chrome — matches srv-listing applyCompanyHeaderOverride. */
type CompanyHeaderFields = {
  address: string;
  city: string;
  postalCode: string;
  email: string;
  phone: string;
  website: string;
};

const EMPTY_COMPANY_HEADER: CompanyHeaderFields = {
  address: '',
  city: '',
  postalCode: '',
  email: '',
  phone: '',
  website: '',
};

function parseCompanyHeader(raw: unknown): Partial<CompanyHeaderFields> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const rec = raw as Record<string, unknown>;
  const out: Partial<CompanyHeaderFields> = {};
  for (const key of Object.keys(EMPTY_COMPANY_HEADER) as (keyof CompanyHeaderFields)[]) {
    if (key in rec && typeof rec[key] === 'string') out[key] = String(rec[key]).trim();
  }
  return out;
}

function mergeCompanyHeader(
  base: CompanyHeaderFields,
  override: Partial<CompanyHeaderFields>,
): CompanyHeaderFields {
  return {
    address: override.address !== undefined ? override.address : base.address,
    city: override.city !== undefined ? override.city : base.city,
    postalCode: override.postalCode !== undefined ? override.postalCode : base.postalCode,
    email: override.email !== undefined ? override.email : base.email,
    phone: override.phone !== undefined ? override.phone : base.phone,
    website: override.website !== undefined ? override.website : base.website,
  };
}

function companyHeaderLines(h: CompanyHeaderFields): string[] {
  const line1 = [h.address, [h.postalCode, h.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const line2 = [h.email, h.phone, h.website].filter(Boolean).join(' · ');
  return [line1, line2].filter(Boolean);
}

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

export function ContractSignatureConfig({ listingId, ownerKey, logoOnly = false }: Props) {
  const [doc, setDoc] = useState<AnyDoc | null>(null);
  const [value, setValue] = useState<ContractSignatureConfigValue>(DEFAULT_CONTRACT_SIGNATURE);
  const [origin, setOrigin] = useState<ContractSignatureOrigin>('default');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolvedOwnerId, setResolvedOwnerId] = useState<string | null>(null);
  const [ownerLogoUrl, setOwnerLogoUrl] = useState('');
  const [listingOverrideUrl, setListingOverrideUrl] = useState('');
  const [establishmentName, setEstablishmentName] = useState('');
  const [listingName, setListingName] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const [headerBase, setHeaderBase] = useState<CompanyHeaderFields>(EMPTY_COMPANY_HEADER);
  const [headerOverride, setHeaderOverride] = useState<Partial<CompanyHeaderFields>>({});
  const [headerDraft, setHeaderDraft] = useState<CompanyHeaderFields>(EMPTY_COMPANY_HEADER);
  const [headerDirty, setHeaderDirty] = useState(false);
  const [headerSaving, setHeaderSaving] = useState(false);
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
      setOwnerLogoUrl(logo);
      setEstablishmentName(publicName || company || '');
      return {
        email: typeof account?.email === 'string' ? String(account.email).trim() : '',
        phone: typeof account?.phone === 'string' ? String(account.phone).trim() : '',
        website:
          typeof (pm.directBooking as { website?: unknown } | undefined)?.website === 'string'
            ? String((pm.directBooking as { website?: string }).website).trim()
            : typeof pm.website === 'string'
              ? String(pm.website).trim()
              : '',
      };
    } catch {
      setOwnerLogoUrl('');
      setEstablishmentName('');
      return { email: '', phone: '', website: '' };
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

      const rawListingLogo =
        gestion.contractLogo && typeof gestion.contractLogo === 'object'
          ? (gestion.contractLogo as { logoImage?: unknown }).logoImage
          : null;
      setListingOverrideUrl(
        typeof rawListingLogo === 'string' ? rawListingLogo.trim() : '',
      );

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
      let ownerContact = { email: '', phone: '', website: '' };
      if (oid) ownerContact = await loadOwnerBranding(oid);
      else {
        setOwnerLogoUrl('');
        setEstablishmentName('');
      }

      // Listing name + address for header (PDF company chrome).
      let listingAddress = '';
      let listingCity = '';
      let listingPostal = '';
      let listingWebsite = '';
      if (!ownerMode && listingId) {
        try {
          const listingRes = await listingsService.getListingById(listingId);
          const listing = listingRes?.data as
            | {
                nickname?: string;
                name?: string;
                address?: string;
                city?: string;
                zipcode?: string;
                postalCode?: string;
                website?: string;
              }
            | undefined;
          const ln =
            String(listing?.nickname || listing?.name || '')
              .trim() || '';
          setListingName(ln);
          listingAddress = String(listing?.address || '').trim();
          listingCity = String(listing?.city || '').trim();
          listingPostal = String(listing?.zipcode || listing?.postalCode || '').trim();
          listingWebsite = String(listing?.website || '').trim();
        } catch {
          setListingName('');
        }
      } else {
        setListingName('');
      }

      const base: CompanyHeaderFields = {
        address: listingAddress,
        city: listingCity,
        postalCode: listingPostal,
        email: ownerContact.email,
        phone: ownerContact.phone,
        website: listingWebsite || ownerContact.website,
      };
      const override = parseCompanyHeader(gestion.companyHeader);
      setHeaderBase(base);
      setHeaderOverride(override);
      setHeaderDraft(mergeCompanyHeader(base, override));
      setHeaderDirty(false);
    } catch {
      setDoc(null);
      setResolvedOwnerId(null);
      setOwnerLogoUrl('');
      setListingOverrideUrl('');
      setEstablishmentName('');
      setListingName('');
      setOrigin('default');
      setHeaderBase(EMPTY_COMPANY_HEADER);
      setHeaderOverride({});
      setHeaderDraft(EMPTY_COMPANY_HEADER);
      setHeaderDirty(false);
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

  const persistOwnerLogo = async (url: string) => {
    if (!resolvedOwnerId) {
      toast.error('Propriétaire introuvable pour enregistrer le logo');
      return;
    }
    await updateOwner(resolvedOwnerId, { pmProfile: { logoImage: url } });
    setOwnerLogoUrl(url);
  };

  const persistListingLogoOverride = async (url: string | null) => {
    if (!doc || ownerMode || !listingId) return;
    const existingGestion = (doc.capabilities?.registration?.gestion ?? {}) as Record<
      string,
      unknown
    >;
    const gestion = { ...existingGestion };
    if (url && url.trim()) {
      gestion.contractLogo = { logoImage: url.trim() };
    } else {
      delete gestion.contractLogo;
    }
    await saveListingGestion({
      listingId,
      capabilityKey: 'registration',
      gestion,
      doc: doc as ListingOrchestrationDoc,
    });
    setListingOverrideUrl(url?.trim() || '');
  };

  const persistCompanyHeader = async (next: CompanyHeaderFields | null) => {
    if (!doc || ownerMode || !listingId || headerSaving) return;
    setHeaderSaving(true);
    try {
      const existingGestion = (doc.capabilities?.registration?.gestion ?? {}) as Record<
        string,
        unknown
      >;
      const gestion = { ...existingGestion };
      if (next) {
        gestion.companyHeader = { ...next };
      } else {
        delete gestion.companyHeader;
      }
      await saveListingGestion({
        listingId,
        capabilityKey: 'registration',
        gestion,
        doc: doc as ListingOrchestrationDoc,
      });
      if (next) {
        setHeaderOverride({ ...next });
        setHeaderDraft({ ...next });
      } else {
        setHeaderOverride({});
        setHeaderDraft({ ...headerBase });
      }
      setHeaderDirty(false);
      toast.success(next ? 'En-tête PDF enregistré' : 'En-tête rétabli (héritage listing / propriétaire)');
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement en-tête impossible');
    } finally {
      setHeaderSaving(false);
    }
  };

  const setHeaderField = (key: keyof CompanyHeaderFields, val: string) => {
    setHeaderDraft(prev => ({ ...prev, [key]: val }));
    setHeaderDirty(true);
  };

  const onLogoFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || logoBusy) return;
    if (ownerMode && !resolvedOwnerId) return;
    if (!ownerMode && (!doc || !listingId)) return;
    setLogoBusy(true);
    try {
      const url = await uploadReportLogo(file);
      if (ownerMode) {
        await persistOwnerLogo(url);
        toast.success(ownerLogoUrl ? 'Logo propriétaire remplacé' : 'Logo propriétaire enregistré');
      } else {
        await persistListingLogoOverride(url);
        toast.success(listingOverrideUrl ? 'Logo annonce remplacé' : 'Logo annonce enregistré');
        void load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload logo impossible');
    } finally {
      setLogoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onRemoveLogo = async () => {
    if (logoBusy) return;
    setLogoBusy(true);
    try {
      if (ownerMode) {
        if (!resolvedOwnerId) return;
        await persistOwnerLogo('');
        toast.success('Logo propriétaire retiré');
      } else {
        await persistListingLogoOverride(null);
        toast.success('Override retiré — retour au logo propriétaire');
        void load();
      }
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

  const logoPreview = resolveEffectiveContractLogoPreview({
    listingOverrideUrl: ownerMode ? '' : listingOverrideUrl,
    ownerUrl: ownerLogoUrl,
    listingName: ownerMode ? '' : listingName,
    establishmentName,
  });
  const hasEffectiveLogo = Boolean(logoPreview.effectiveUrl);
  const hasListingOverride = Boolean(listingOverrideUrl.trim());
  const displayName = logoPreview.textFallback;
  const secondaryName =
    establishmentName.trim() &&
    establishmentName.trim() !== displayName
      ? establishmentName.trim()
      : '';
  const originChipLabel = `Configuration effective : ${contractSignatureOriginLabel(origin)}`;
  const logoChipLabel = contractLogoOriginLabel(logoPreview.origin);

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
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
          {logoOnly ? 'En-tête des documents' : 'Contrat et signature'}
        </Typography>
        <Chip
          size="small"
          label={originChipLabel}
          variant="outlined"
          sx={{ height: 22, fontSize: 11 }}
          color={origin === 'listing' ? 'warning' : origin === 'owner' ? 'info' : 'default'}
        />
      </Stack>

      {!logoOnly && (
        <>
          <Alert severity="info" sx={{ mb: 0.75, fontSize: 12.5, py: 0.5 }}>
            L&apos;envoi WhatsApp automatique exige les deux options activées (contrat + envoi auto).
          </Alert>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 1.5, lineHeight: 1.4 }}>
            Signature électronique simple (loi n° 43-20) — non avancée ni qualifiée.
          </Typography>
        </>
      )}
      {logoOnly && (
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 1.5, lineHeight: 1.4 }}>
          Logo et coordonnées imprimés en en-tête de tous les PDF (héritage listing / propriétaire,
          surcharge possible ici).
        </Typography>
      )}

      {logoOnly && !ownerMode ? (
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
            Aperçu en-tête PDF
          </Typography>
          <Stack direction="row" spacing={1.25} alignItems="flex-start">
            <Box
              sx={{
                width: 44,
                height: 44,
                flexShrink: 0,
                '& img': { width: 44, height: 44, objectFit: 'contain', display: 'block' },
              }}
            >
              <ReportLogoPreview
                canonicalUrl={logoPreview.effectiveUrl}
                alt={displayName}
                empty={<LogoFallback name={displayName} />}
                brokenFallback={<LogoFallback name={displayName} />}
              />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{displayName}</Typography>
              {companyHeaderLines(headerDraft).length ? (
                companyHeaderLines(headerDraft).map(line => (
                  <Typography
                    key={line}
                    sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.4, mt: 0.15 }}
                  >
                    {line}
                  </Typography>
                ))
              ) : (
                <Typography sx={{ fontSize: 11.5, color: 'warning.main', mt: 0.25 }}>
                  Aucune coordonnée — renseignez adresse / e-mail ci-dessous.
                </Typography>
              )}
            </Box>
          </Stack>
        </Box>
      ) : null}

      {logoOnly && !ownerMode ? (
        <Box
          sx={{
            mb: 1.5,
            p: 1.25,
            borderRadius: 1,
            bgcolor: 'rgba(26,22,17,0.02)',
            border: '1px solid rgba(26,22,17,0.08)',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>Coordonnées en-tête</Typography>
            <Chip
              size="small"
              label={
                Object.keys(headerOverride).length > 0
                  ? 'Surcharge logement'
                  : 'Hérité listing / propriétaire'
              }
              variant="outlined"
              sx={{ height: 22, fontSize: 11 }}
              color={Object.keys(headerOverride).length > 0 ? 'warning' : 'default'}
            />
          </Stack>
          <Stack spacing={1}>
            <TextField
              size="small"
              fullWidth
              label="Adresse"
              value={headerDraft.address}
              placeholder={headerBase.address || 'Rue, n°…'}
              disabled={!doc || headerSaving}
              onChange={e => setHeaderField('address', e.target.value)}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                size="small"
                fullWidth
                label="Code postal"
                value={headerDraft.postalCode}
                placeholder={headerBase.postalCode || ''}
                disabled={!doc || headerSaving}
                onChange={e => setHeaderField('postalCode', e.target.value)}
              />
              <TextField
                size="small"
                fullWidth
                label="Ville"
                value={headerDraft.city}
                placeholder={headerBase.city || ''}
                disabled={!doc || headerSaving}
                onChange={e => setHeaderField('city', e.target.value)}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                size="small"
                fullWidth
                label="E-mail"
                value={headerDraft.email}
                placeholder={headerBase.email || ''}
                disabled={!doc || headerSaving}
                onChange={e => setHeaderField('email', e.target.value)}
              />
              <TextField
                size="small"
                fullWidth
                label="Téléphone"
                value={headerDraft.phone}
                placeholder={headerBase.phone || ''}
                disabled={!doc || headerSaving}
                onChange={e => setHeaderField('phone', e.target.value)}
              />
            </Stack>
            <TextField
              size="small"
              fullWidth
              label="Site web"
              value={headerDraft.website}
              placeholder={headerBase.website || 'https://…'}
              disabled={!doc || headerSaving}
              onChange={e => setHeaderField('website', e.target.value)}
            />
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.25 }}>
            <Button
              size="small"
              variant="contained"
              disabled={!doc || !headerDirty || headerSaving}
              onClick={() => void persistCompanyHeader(headerDraft)}
            >
              {headerSaving ? 'Enregistrement…' : 'Enregistrer l’en-tête'}
            </Button>
            {Object.keys(headerOverride).length > 0 || headerDirty ? (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                disabled={!doc || headerSaving}
                onClick={() => {
                  if (Object.keys(headerOverride).length > 0) {
                    void persistCompanyHeader(null);
                  } else {
                    setHeaderDraft({ ...headerBase });
                    setHeaderDirty(false);
                  }
                }}
              >
                Revenir à l’héritage
              </Button>
            ) : null}
          </Stack>
        </Box>
      ) : null}

      <Box
        sx={{
          mb: 1.5,
          p: 1.25,
          borderRadius: 1,
          bgcolor: 'rgba(26,22,17,0.02)',
          border: '1px solid rgba(26,22,17,0.08)',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
            {ownerMode ? 'Logo propriétaire' : 'Logo du contrat'}
          </Typography>
          <Chip
            size="small"
            label={logoChipLabel}
            variant="outlined"
            sx={{ height: 22, fontSize: 11 }}
            color={
              logoPreview.origin === 'listing'
                ? 'warning'
                : logoPreview.origin === 'owner'
                  ? 'info'
                  : 'default'
            }
          />
        </Stack>
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
              canonicalUrl={logoPreview.effectiveUrl}
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
              {ownerMode
                ? 'Logo optionnel — défaut pour tous les logements sans override. Même asset que les rapports P&L.'
                : logoPreview.origin === 'listing'
                  ? 'Override annonce — ce logo remplace le logo propriétaire pour ce logement uniquement.'
                  : logoPreview.origin === 'owner'
                    ? 'Hérité du propriétaire — aucun override stocké sur l’annonce.'
                    : 'Sans logo image — le PDF affichera le nom du logement (ou le nom d’établissement).'}
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
            disabled={
              logoBusy ||
              saving ||
              (ownerMode ? !resolvedOwnerId : !doc)
            }
            onClick={() => fileRef.current?.click()}
          >
            {logoBusy
              ? 'Envoi…'
              : ownerMode
                ? hasEffectiveLogo
                  ? 'Remplacer'
                  : 'Uploader'
                : hasListingOverride
                  ? 'Remplacer l’override'
                  : 'Uploader un override'}
          </Button>
          {ownerMode && hasEffectiveLogo ? (
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
          {!ownerMode && hasListingOverride ? (
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              disabled={!doc || logoBusy || saving}
              onClick={() => void onRemoveLogo()}
            >
              Revenir au logo propriétaire
            </Button>
          ) : null}
        </Stack>
        {ownerMode && !resolvedOwnerId ? (
          <Typography sx={{ fontSize: 11, color: 'warning.main', mt: 0.75 }}>
            Propriétaire introuvable — logo non modifiable ici.
          </Typography>
        ) : null}
      </Box>

      {logoOnly ? null : (
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
              canonicalUrl={logoPreview.effectiveUrl}
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
            {secondaryName ? (
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{secondaryName}</Typography>
            ) : null}
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              {hasEffectiveLogo
                ? `Logo · ${logoChipLabel}`
                : `Texte · ${displayName}`}
            </Typography>
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
      )}

      {logoOnly ? null : (
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
            label="Qui doit signer ?"
            value={value.signerPolicy}
            disabled={saving || !doc}
            helperText={
              value.signerPolicy === 'each_traveler'
                ? 'Un lien WhatsApp personnel est envoyé à chaque voyageur adulte. Les mineurs sont couverts par le voyageur principal / tuteur.'
                : 'Un seul lien : le voyageur principal signe pour toute la réservation (y compris les mineurs).'
            }
            onChange={e =>
              void save({
                ...value,
                signerPolicy: e.target.value as ContractSignatureConfigValue['signerPolicy'],
              })
            }
          >
            <MenuItem value="primary_guest">
              <Box sx={{ py: 0.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                  Le voyageur principal signe pour toute la réservation
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', whiteSpace: 'normal' }}>
                  Un seul lien de signature. Les fiches voyageurs portent la mention « signature du
                  voyageur principal pour la réservation ».
                </Typography>
              </Box>
            </MenuItem>
            <MenuItem value="each_traveler">
              <Box sx={{ py: 0.5 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                  Chaque voyageur adulte signe sa propre fiche
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', whiteSpace: 'normal' }}>
                  Un lien unique par adulte, avec son nom. La signature d’un voyageur n’apparaît que
                  sur sa page.
                </Typography>
              </Box>
            </MenuItem>
          </TextField>
        </FormControl>
        <Alert severity="info" sx={{ fontSize: 12, py: 0.5 }}>
          Cette règle est figée dans chaque contrat au moment de la génération. Modifier ici
          n&apos;affecte que les futurs contrats — régénérez un contrat non signé pour appliquer le
          nouveau choix. Un contrat déjà signé reste immuable.
        </Alert>
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
      )}
    </Box>
  );
}
