import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Drawer,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import listingsService from '../../../../services/listingsService';
import {
  saveListingGestion,
  type ListingOrchestrationDoc,
} from '../../../../features/orchestrationListingV3/listingOrchestrationApi';
import { V3 } from '../../../../features/orchestrationListingV3/theme';
import RegistrationFormEditor from '../../../../features/serviceMatrix/RegistrationFormEditor';
import { ContractSignatureConfig } from '../../../../features/serviceMatrix/ContractSignatureConfig';
import {
  DEFAULT_CONTRACT_SIGNATURE,
  parseContractSignature,
  type ContractSignatureConfigValue,
} from '../../../../features/serviceMatrix/contractSignatureDefaults';
import {
  type FieldBadgeKind,
  type GuestDocument,
  type GuestDocumentFieldGroup,
  MAX_GUEST_DOCUMENTS,
  POLICE_FORM_DOCUMENT_ID,
  SOURCE_GROUPS,
  applyDocumentPolicyPatch,
  canBlockAccess,
  disclaimerContract,
  documentsFromGestion,
  fieldDef,
  fieldsInGroup,
  assembleContent,
  groupsUsed,
  newClause,
  shortTermRentalContract,
  syncContractSignatureFromDocuments,
} from '../../../../features/guestDocuments';

type Props = {
  listingId?: string | null;
};

type Starter = 'disclaimer' | 'short_term_rental';

const CHIP: Record<(typeof SOURCE_GROUPS)[number]['color'], { bg: string; fg: string; bd: string }> = {
  or: { bg: V3.pt, fg: V3.pd, bd: V3.pt2 },
  ok: { bg: V3.waT, fg: V3.wa, bd: 'rgba(10,143,94,0.22)' },
  info: { bg: V3.clientT, fg: V3.client, bd: 'rgba(6,115,179,0.22)' },
  orch: { bg: V3.orchT, fg: V3.orch, bd: 'rgba(124,58,237,0.22)' },
};

const BADGE: Record<FieldBadgeKind, { bg: string; fg: string }> = {
  ocr: { bg: V3.bg, fg: V3.t4 },
  dual: { bg: 'rgba(6,115,179,0.09)', fg: V3.client },
  strict: { bg: V3.warnT, fg: V3.warn },
  guest: { bg: V3.waT, fg: V3.wa },
  res: { bg: V3.bg, fg: V3.t4 },
  listing: { bg: V3.bg, fg: V3.t4 },
  system: { bg: V3.bg, fg: V3.t4 },
  note: { bg: V3.waT, fg: V3.wa },
};

function unwrapDoc(raw: unknown): ListingOrchestrationDoc | null {
  const r = raw as { data?: unknown } | ListingOrchestrationDoc | null;
  if (r && typeof r === 'object' && 'data' in r && r.data) return r.data as ListingOrchestrationDoc;
  return (r as ListingOrchestrationDoc) ?? null;
}

export default function ListingDocumentsTab({ listingId }: Props) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [doc, setDoc] = useState<ListingOrchestrationDoc | null>(null);
  const [documents, setDocuments] = useState<GuestDocument[]>([]);
  const [contractSignature, setContractSignature] = useState<ContractSignatureConfigValue>(
    DEFAULT_CONTRACT_SIGNATURE,
  );
  const [dirty, setDirty] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [draft, setDraft] = useState<GuestDocument | null>(null);
  const [starter, setStarter] = useState<Starter>('disclaimer');

  const load = useCallback(async () => {
    if (!listingId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const raw = (await listingsService.getListingOrchestrationCompiled(String(listingId))) as
        | { data?: unknown }
        | ListingOrchestrationDoc
        | null;
      const d = unwrapDoc(raw);
      setDoc(d);
      const gestion = (d?.capabilities?.registration?.gestion ?? {}) as Record<string, unknown>;
      const compiled = (d as { contractSignature?: unknown } | null)?.contractSignature;
      const cs = parseContractSignature(gestion.contractSignature ?? compiled);
      setContractSignature(cs);
      setDocuments(documentsFromGestion(gestion, cs));
      setDirty(false);
    } catch {
      setDoc(null);
      setDocuments([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (nextDocs: GuestDocument[]) => {
    if (!listingId || !doc) return false;
    setSaving(true);
    const existingGestion = (doc.capabilities?.registration?.gestion ?? {}) as Record<string, unknown>;
    const nextSignature = syncContractSignatureFromDocuments(nextDocs, contractSignature);
    try {
      await saveListingGestion({
        listingId: String(listingId),
        capabilityKey: 'registration',
        gestion: {
          ...existingGestion,
          guestDocuments: nextDocs,
          contractSignature: nextSignature,
        },
        doc,
      });
      setContractSignature(nextSignature);
      setDocuments(nextDocs);
      setDirty(false);
      void load();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateDoc = (id: string, patch: Partial<GuestDocument>) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const policyKeys = [
          'enabled',
          'requiredBeforeArrival',
          'requiresSignature',
          'blocksAccess',
          'autoSendAfterRegistration',
          'signerPolicy',
        ] as const;
        const hasPolicy = policyKeys.some((k) => k in patch);
        const next = hasPolicy
          ? applyDocumentPolicyPatch(d, patch)
          : { ...d, ...patch };
        return { ...next, content: assembleContent(next) };
      }),
    );
    setDirty(true);
  };

  const openCreate = (kind: Starter = 'disclaimer') => {
    if (documents.length >= MAX_GUEST_DOCUMENTS) {
      toast.error(`Maximum ${MAX_GUEST_DOCUMENTS} documents.`);
      return;
    }
    if (kind === 'disclaimer' && documents.some((d) => d.kind === 'contract')) {
      toast.error('Disclaimer déjà présent.');
      return;
    }
    if (kind === 'short_term_rental' && documents.some((d) => d.kind === 'short_term_rental')) {
      toast.error('Contrat LCD déjà présent.');
      return;
    }
    setStarter(kind);
    setDraft(kind === 'short_term_rental' ? shortTermRentalContract() : disclaimerContract());
    setExpandedId(null);
    setDrawerOpen(true);
  };

  const applyStarter = (kind: Starter) => {
    setStarter(kind);
    setDraft(kind === 'short_term_rental' ? shortTermRentalContract() : disclaimerContract());
  };

  const createContract = async () => {
    if (!draft?.name.trim() || !draft.title.trim()) {
      toast.error('Nom interne et titre imprimé sont requis.');
      return;
    }
    const created = {
      ...draft,
      name: draft.name.trim(),
      title: draft.title.trim(),
      content: assembleContent({ ...draft, name: draft.name.trim(), title: draft.title.trim() }),
    };
    const next = [...documents, created];
    setDocuments(next);
    setDrawerOpen(false);
    setDraft(null);
    setExpandedId(created.id);
    const ok = await persist(next);
    if (ok) toast.success('Contrat créé');
    else setDirty(true);
  };

  const removeContract = async (id: string) => {
    if (id === POLICE_FORM_DOCUMENT_ID) return;
    const next = documents.filter((d) => d.id !== id);
    setExpandedId(null);
    const ok = await persist(next);
    if (ok) toast.success('Contrat supprimé');
    else {
      setDocuments(next);
      setDirty(true);
    }
  };

  const glance = useMemo(() => {
    const police = documents.find((d) => d.kind === 'police_form');
    const contracts = documents.filter((d) => d.kind === 'contract');
    return {
      total: documents.length,
      policeOn: police?.enabled === true,
      contracts: contracts.length,
      signed: documents.filter((d) => d.enabled && d.requiresSignature).length,
    };
  }, [documents]);

  const police = documents.find((d) => d.kind === 'police_form');
  const contracts = documents.filter((d) => d.kind === 'contract');
  const rentals = documents.filter((d) => d.kind === 'short_term_rental');
  const hasDisclaimer = contracts.length > 0;
  const hasRental = rentals.length > 0;
  const maxed = documents.length >= MAX_GUEST_DOCUMENTS;

  if (!listingId) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 13, color: V3.t3 }}>
          Enregistrez d’abord le listing pour configurer les documents voyageurs.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ py: 4, display: 'flex', justifyContent: 'center', color: V3.t3, fontSize: 13 }}>
        Chargement…
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box sx={{ p: 2, display: 'grid', gap: 1.25, justifyItems: 'start' }}>
        <Typography sx={{ fontSize: 13, color: V3.er }}>
          Impossible de charger la configuration des documents. Réessayez pour éviter
          d’écraser une configuration existante.
        </Typography>
        <Button size="small" onClick={() => void load()} sx={ghostBtnSx}>
          Réessayer
        </Button>
      </Box>
    );
  }

  if (!doc) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 13, color: V3.t3 }}>
          Activez d’abord l’orchestration de ce listing pour enregistrer les documents voyageurs.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, width: '100%', pb: { xs: 10, md: 2 } }}>
      <Typography sx={{ fontSize: 11, fontWeight: 750, letterSpacing: '0.14em', textTransform: 'uppercase', color: V3.t4 }}>
        Listing
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 750, mt: 0.5, lineHeight: 1.2 }}>
        Documents voyageurs
      </Typography>
      <Typography sx={{ fontSize: 13, color: V3.t3, mt: 0.75, maxWidth: '70ch' }}>
        Chaque document récupère ses champs depuis la pièce, WhatsApp ou la réservation.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '18px',
          alignItems: 'start',
          width: '100%',
          maxWidth: 1440,
          mt: 2.5,
          '@media (min-width:1100px)': { gridTemplateColumns: '340px minmax(0, 1fr)' },
        }}
      >
        <Stack sx={{ gap: '11px' }}>
          <RailCard title="En un coup d’œil">
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.4 }}>
              <GlanceStat value={String(glance.total)} label="documents" />
              <GlanceStat value={glance.policeOn ? 'on' : 'off'} label="fiche police" />
              <GlanceStat value={String(glance.contracts)} label="contrats" />
              <GlanceStat value={String(glance.signed)} label="à signer" />
            </Box>
          </RailCard>

          <RailCard title="Origines">
            <Stack sx={{ gap: 1.1 }}>
              {SOURCE_GROUPS.map((g) => (
                <Box key={g.id} sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 1.1, rowGap: 0.25 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      mt: '5px',
                      bgcolor: CHIP[g.color].fg,
                    }}
                  />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700 }}>
                    {g.icon} {g.short}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: V3.t3, lineHeight: 1.4, gridColumn: 2 }}>
                    {g.hint}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </RailCard>

          <RailCard title="Signature">
            <Typography sx={{ fontSize: 12, color: V3.t2, lineHeight: 1.45, mb: 1 }}>
              La signature se fait sur le lien web sécurisé, pas dans WhatsApp.
            </Typography>
            <ContractSignatureConfig listingId={String(listingId)} logoOnly />
          </RailCard>
        </Stack>

        <Box sx={{ minWidth: 0 }}>
          <Box
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 9,
              bgcolor: V3.bg,
              py: 1.25,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexWrap: 'wrap',
            }}
          >
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: V3.t2 }}>
              Documents <Box component="b" sx={{ color: V3.t, fontWeight: 750 }}>({documents.length})</Box>
            </Typography>
            {dirty && (
              <Button
                size="small"
                disabled={saving}
                onClick={() => void persist(documents)}
                sx={ghostBtnSx}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            )}
            <Button
              size="small"
              disabled={maxed || saving || (hasDisclaimer && hasRental)}
              onClick={() => openCreate(hasDisclaimer ? 'short_term_rental' : 'disclaimer')}
              sx={{ ...priBtnSx, ml: 'auto', display: { xs: 'none', md: 'inline-flex' } }}
            >
              {!hasDisclaimer
                ? '＋ Disclaimer'
                : !hasRental
                  ? '＋ Contrat LCD'
                  : 'Types complets'}
            </Button>
          </Box>
          {maxed && (
            <Typography sx={{ fontSize: 11.5, color: V3.t4, mb: 1 }}>
              Maximum {MAX_GUEST_DOCUMENTS} documents (fiche police, disclaimer, contrat LCD).
            </Typography>
          )}

          <Stack sx={{ gap: 1.1 }}>
            {police && (
              <DocumentCard
                document={police}
                expanded={expandedId === police.id}
                listingId={String(listingId)}
                locked
                onToggleExpand={() => setExpandedId(expandedId === police.id ? null : police.id)}
                onChange={(patch) => updateDoc(police.id, patch)}
                onDone={() => {
                  setExpandedId(null);
                  if (dirty) void persist(documents);
                }}
              />
            )}

            {contracts.length > 0 ? (
              <>
                <Typography
                  sx={{
                    fontSize: 10.5,
                    fontWeight: 750,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: V3.t4,
                    mt: 1,
                  }}
                >
                  Disclaimer
                </Typography>
                {contracts.map((item) => (
                  <DocumentCard
                    key={item.id}
                    document={item}
                    expanded={expandedId === item.id}
                    listingId={String(listingId)}
                    onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    onChange={(patch) => updateDoc(item.id, patch)}
                    onRemove={() => void removeContract(item.id)}
                    onDone={() => {
                      setExpandedId(null);
                      if (dirty) void persist(documents);
                    }}
                  />
                ))}
              </>
            ) : (
              <Box
                sx={{
                  border: `1.5px dashed ${V3.bs}`,
                  borderRadius: '12px',
                  px: 2.75,
                  py: 3,
                  textAlign: 'center',
                  bgcolor: V3.alt,
                  display: 'grid',
                  gap: 1.1,
                  justifyItems: 'center',
                }}
              >
                <Typography sx={{ fontSize: 14.5, fontWeight: 800 }}>Disclaimer</Typography>
                <Typography sx={{ fontSize: 12.5, color: V3.t3, maxWidth: '46ch', lineHeight: 1.55 }}>
                  Règles villa / responsabilité (piscine, coffre, parking…).
                </Typography>
                <Button size="small" onClick={() => openCreate('disclaimer')} sx={priBtnSx}>
                  ＋ Ajouter le disclaimer
                </Button>
              </Box>
            )}

            {rentals.length > 0 ? (
              <>
                <Typography
                  sx={{
                    fontSize: 10.5,
                    fontWeight: 750,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: V3.t4,
                    mt: 1,
                  }}
                >
                  Location courte durée (Maroc)
                </Typography>
                {rentals.map((item) => (
                  <DocumentCard
                    key={item.id}
                    document={item}
                    expanded={expandedId === item.id}
                    listingId={String(listingId)}
                    onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    onChange={(patch) => updateDoc(item.id, patch)}
                    onRemove={() => void removeContract(item.id)}
                    onDone={() => {
                      setExpandedId(null);
                      if (dirty) void persist(documents);
                    }}
                  />
                ))}
              </>
            ) : (
              <Box
                sx={{
                  border: `1.5px dashed ${V3.bs}`,
                  borderRadius: '12px',
                  px: 2.75,
                  py: 3,
                  textAlign: 'center',
                  bgcolor: V3.alt,
                  display: 'grid',
                  gap: 1.1,
                  justifyItems: 'center',
                }}
              >
                <Typography sx={{ fontSize: 14.5, fontWeight: 800 }}>
                  Contrat location courte durée
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: V3.t3, maxWidth: '46ch', lineHeight: 1.55 }}>
                  Modèle type Maroc (Loi 80-14) : parties, durée, caution, occupation, fiche de police.
                </Typography>
                <Button size="small" onClick={() => openCreate('short_term_rental')} sx={priBtnSx}>
                  ＋ Ajouter le contrat LCD
                </Button>
              </Box>
            )}
          </Stack>
        </Box>
      </Box>

      <Button
        onClick={() => openCreate(hasDisclaimer ? 'short_term_rental' : 'disclaimer')}
        disabled={maxed || (hasDisclaimer && hasRental)}
        sx={{
          display: { xs: 'block', md: 'none' },
          position: 'fixed',
          left: 14,
          right: 14,
          bottom: 14,
          zIndex: 30,
          bgcolor: V3.p,
          border: `1px solid ${V3.pd}`,
          color: '#fff',
          borderRadius: '12px',
          py: 1.5,
          fontWeight: 700,
          fontSize: 14,
          textTransform: 'none',
          boxShadow: '0 6px 20px rgba(20,17,10,.16)',
          '&:hover': { bgcolor: V3.pd },
        }}
      >
        {!hasDisclaimer ? '＋ Disclaimer' : !hasRental ? '＋ Contrat LCD' : 'Types complets'}
      </Button>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setDraft(null);
        }}
        PaperProps={{
          sx: {
            width: { xs: '100vw', sm: 540 },
            bgcolor: V3.card,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box sx={{ px: 2.25, py: 1.85, borderBottom: `1px solid ${V3.b}`, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          <Box>
            <Typography sx={{ fontSize: 11, fontWeight: 750, letterSpacing: '0.14em', textTransform: 'uppercase', color: V3.t4 }}>
              Nouveau
            </Typography>
            <Typography sx={{ fontSize: 17, fontWeight: 800, mt: 0.5 }}>Nouveau contrat</Typography>
          </Box>
          <Button
            onClick={() => {
              setDrawerOpen(false);
              setDraft(null);
            }}
            sx={{ ml: 'auto', minWidth: 30, width: 30, height: 30, bgcolor: V3.bg, color: V3.t3 }}
          >
            ✕
          </Button>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto', px: 2.25, py: 2, display: 'grid', gap: 2.1 }}>
          {draft && (
            <>
              <SectionLabel>Identité du document</SectionLabel>
              <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
                <StarterChip
                  label="Disclaimer"
                  on={starter === 'disclaimer'}
                  onClick={() => applyStarter('disclaimer')}
                />
                <StarterChip
                  label="Contrat LCD (Maroc)"
                  on={starter === 'short_term_rental'}
                  onClick={() => applyStarter('short_term_rental')}
                />
                <StarterChip label="Fiche de police · déjà présente" on={false} disabled />
              </Stack>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.4 }}>
                <Field label="Nom interne">
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Disclaimer villa"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    sx={inputSx}
                  />
                </Field>
                <Field label="Titre imprimé">
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Guest Disclaimer"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    sx={inputSx}
                  />
                </Field>
              </Box>
              <WhoBlock document={draft} onChange={(patch) => setDraft({ ...draft, ...patch })} />
              <FieldsBlock
                document={draft}
                onChange={(patch) => setDraft({ ...draft, ...patch })}
              />
              <BodyBlock
                document={draft}
                onChange={(patch) => setDraft({ ...draft, ...patch })}
              />
            </>
          )}
        </Box>
        <Box sx={{ borderTop: `1px solid ${V3.b}`, px: 2.25, py: 1.5, display: 'flex', gap: 1.1, justifyContent: 'flex-end', bgcolor: V3.alt }}>
          <Button
            onClick={() => {
              setDrawerOpen(false);
              setDraft(null);
            }}
            sx={ghostBtnSx}
          >
            Annuler
          </Button>
          <Button
            disabled={!draft?.name.trim() || saving}
            onClick={() => void createContract()}
            sx={priBtnSx}
          >
            Créer le contrat
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
}

function DocumentCard({
  document: item,
  expanded,
  listingId,
  locked = false,
  onToggleExpand,
  onChange,
  onRemove,
  onDone,
}: {
  document: GuestDocument;
  expanded: boolean;
  listingId: string;
  locked?: boolean;
  onToggleExpand: () => void;
  onChange: (patch: Partial<GuestDocument>) => void;
  onRemove?: () => void;
  onDone: () => void;
}) {
  const srcs = groupsUsed(item.fieldKeys);
  const isPolice = item.kind === 'police_form';

  return (
    <Box
      sx={{
        bgcolor: item.enabled ? V3.card : V3.alt,
        border: expanded ? `1.5px solid ${V3.p}` : `1px solid ${V3.b}`,
        borderRadius: '12px',
        overflow: 'hidden',
        '&:hover': { borderColor: expanded ? V3.p : V3.bs },
      }}
    >
      <Box
        onClick={onToggleExpand}
        sx={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: 1.5,
          alignItems: 'center',
          px: 1.85,
          py: 1.25,
          cursor: 'pointer',
          minHeight: 72,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '9px',
            bgcolor: V3.pt,
            display: 'grid',
            placeItems: 'center',
            fontSize: 15,
          }}
        >
          {isPolice ? '🪪' : '✍️'}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: item.enabled ? V3.t : V3.t3 }}>
              {item.name || (isPolice ? 'Fiche de police' : 'Contrat')}
            </Typography>
            {locked && (
              <Box
                sx={{
                  fontSize: 9,
                  fontWeight: 750,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  bgcolor: V3.bg,
                  color: V3.t4,
                  borderRadius: '4px',
                  px: 0.75,
                  py: 0.25,
                  fontFamily: 'monospace',
                }}
              >
                non supprimable
              </Box>
            )}
            {item.enabled && !item.requiredBeforeArrival && <PolicyBadge label="Optionnel" tone="muted" />}
            {item.enabled && item.requiredBeforeArrival && <PolicyBadge label="Obligatoire" tone="warn" />}
            {item.enabled && item.blocksAccess && <PolicyBadge label="Bloque l’accès" tone="danger" />}
          </Stack>
          {item.title && item.title !== item.name && (
            <Typography sx={{ fontSize: 12, color: V3.t3 }}>{item.title}</Typography>
          )}
          <Stack direction="row" sx={{ gap: 0.6, flexWrap: 'wrap', alignItems: 'center', mt: 0.5 }}>
            {srcs.length ? (
              srcs.map((id) => {
                const g = SOURCE_GROUPS.find((x) => x.id === id)!;
                return (
                  <Box
                    key={id}
                    sx={{
                      fontSize: 10,
                      fontWeight: 700,
                      borderRadius: '5px',
                      px: 0.85,
                      py: 0.3,
                      bgcolor: CHIP[g.color].bg,
                      color: CHIP[g.color].fg,
                    }}
                  >
                    {g.icon} {g.short}
                  </Box>
                );
              })
            ) : (
              <Box sx={{ fontSize: 10, fontWeight: 700, borderRadius: '5px', px: 0.85, py: 0.3, bgcolor: 'rgba(200,30,30,0.08)', color: V3.er }}>
                aucun champ
              </Box>
            )}
            <Typography sx={{ fontSize: 11, color: item.requiresSignature ? V3.t2 : V3.t4 }}>
              {item.requiresSignature
                ? `Signature web · ${item.signerPolicy === 'each_traveler' ? 'chaque adulte' : 'principal'}`
                : 'Sans signature'}
            </Typography>
          </Stack>
        </Box>
        <Stack direction="row" alignItems="center" gap={1.2} onClick={(e) => e.stopPropagation()}>
          <Switch
            size="small"
            checked={item.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
            sx={switchSx}
          />
          <Typography sx={{ fontSize: 16, color: V3.t4, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .18s' }}>
            ›
          </Typography>
        </Stack>
      </Box>

      {expanded && (
        <Box sx={{ borderTop: `1px solid ${V3.b}`, p: 1.85, display: 'grid', gap: 2, bgcolor: V3.alt }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.4 }}>
            <Field label="Nom interne">
              <TextField size="small" fullWidth value={item.name} onChange={(e) => onChange({ name: e.target.value })} sx={inputSx} />
            </Field>
            <Field label="Titre imprimé">
              <TextField size="small" fullWidth value={item.title} onChange={(e) => onChange({ title: e.target.value })} sx={inputSx} />
            </Field>
          </Box>
          <WhoBlock document={item} onChange={onChange} />
          <FieldsBlock document={item} onChange={onChange} />
          <BodyBlock document={item} onChange={onChange} />
          {isPolice && (
            <details>
              <summary
                style={{
                  cursor: 'pointer',
                  padding: '11px 13px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  background: '#fff',
                  border: `1px solid ${V3.b}`,
                  borderRadius: 10,
                  listStyle: 'none',
                }}
              >
                💬 Régler ce que le voyageur voit dans WhatsApp
              </summary>
              <Box sx={{ mt: 1 }}>
                <RegistrationFormEditor listingId={listingId} />
              </Box>
            </details>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, borderTop: `1px solid ${V3.b}`, pt: 1.6 }}>
            {locked ? (
              <Typography sx={{ fontSize: 11.5, color: V3.t4 }}>
                La fiche de police ne peut pas être supprimée.
              </Typography>
            ) : (
              <Button onClick={onRemove} sx={{ textTransform: 'none', color: V3.er, fontWeight: 650, fontSize: 12, textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                Supprimer ce contrat
              </Button>
            )}
            <Button onClick={onDone} sx={priBtnSx}>
              Terminé
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

function WhoBlock({
  document: item,
  onChange,
}: {
  document: GuestDocument;
  onChange: (patch: Partial<GuestDocument>) => void;
}) {
  const blockEnabled = canBlockAccess(item);
  return (
    <Box>
      <SectionLabel>Qui / signature</SectionLabel>
      <ToggleRow label="Actif" checked={item.enabled} onChange={(v) => onChange({ enabled: v })} />
      <ToggleRow
        label="Signature web"
        checked={item.requiresSignature}
        onChange={(v) => onChange({ requiresSignature: v })}
      />
      {item.enabled && (
        <>
          <ToggleRow
            label="Obligatoire avant l’arrivée"
            checked={item.requiredBeforeArrival}
            onChange={(v) => onChange({ requiredBeforeArrival: v })}
          />
          <Typography sx={{ fontSize: 11, color: V3.t4, mt: -0.5, mb: 0.75, lineHeight: 1.4 }}>
            Compte dans la progression Enregistrement x/y. Sinon le document reste disponible
            mais optionnel (« À faire · optionnel »).
          </Typography>
          {blockEnabled ? (
            <>
              <ToggleRow
                label="Bloque l’accès"
                checked={item.blocksAccess}
                onChange={(v) => onChange({ blocksAccess: v })}
              />
              <Typography sx={{ fontSize: 11, color: V3.t4, mt: -0.5, mb: 0.75, lineHeight: 1.4 }}>
                Verrouille les codes (menu F) tant que ce document n’est pas entièrement signé.
              </Typography>
            </>
          ) : (
            <Typography sx={{ fontSize: 11, color: V3.t4, mb: 0.75, lineHeight: 1.4 }}>
              « Bloque l’accès » nécessite un document actif, obligatoire, avec signature web.
            </Typography>
          )}
        </>
      )}
      {item.requiresSignature && (
        <>
          <Stack sx={{ gap: 0.75, mt: 0.75 }}>
            <RadioRow
              on={item.signerPolicy === 'primary_guest'}
              label="Voyageur principal"
              hint="1 lien"
              onClick={() => onChange({ signerPolicy: 'primary_guest' })}
            />
            <RadioRow
              on={item.signerPolicy === 'each_traveler'}
              label="Chaque adulte"
              hint="hôtel"
              onClick={() => onChange({ signerPolicy: 'each_traveler' })}
            />
          </Stack>
          <ToggleRow
            label="Envoyer le lien après l'enregistrement"
            checked={item.autoSendAfterRegistration}
            onChange={(v) => onChange({ autoSendAfterRegistration: v })}
          />
        </>
      )}
    </Box>
  );
}

function PolicyBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'muted' | 'warn' | 'danger';
}) {
  const colors =
    tone === 'danger'
      ? { bg: 'rgba(200,30,30,0.08)', fg: V3.er }
      : tone === 'warn'
        ? { bg: V3.warnT, fg: V3.warn }
        : { bg: V3.bg, fg: V3.t4 };
  return (
    <Box
      sx={{
        fontSize: 9,
        fontWeight: 750,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        bgcolor: colors.bg,
        color: colors.fg,
        borderRadius: '4px',
        px: 0.75,
        py: 0.25,
        fontFamily: 'monospace',
      }}
    >
      {label}
    </Box>
  );
}

function FieldsBlock({
  document: item,
  onChange,
}: {
  document: GuestDocument;
  onChange: (patch: Partial<GuestDocument>) => void;
}) {
  const toggle = (key: string, on: boolean) => {
    onChange({
      fieldKeys: on
        ? item.fieldKeys.includes(key)
          ? item.fieldKeys
          : [...item.fieldKeys, key]
        : item.fieldKeys.filter((k) => k !== key),
    });
  };

  return (
    <Box>
      <SectionLabel>Ce contrat récupère</SectionLabel>
      {item.fieldKeys.length === 0 ? (
        <Typography sx={{ fontSize: 11.5, color: V3.t4, mb: 1 }}>
          Aucun champ. Cochez ci-dessous — le contrat sera vide.
        </Typography>
      ) : (
        <Stack direction="row" sx={{ gap: 0.6, flexWrap: 'wrap', mb: 1 }}>
          {item.fieldKeys.map((key) => {
            const def = fieldDef(key);
            if (!def) return null;
            const g = SOURCE_GROUPS.find((x) => x.id === def.group)!;
            return (
              <Box
                key={key}
                onClick={() => toggle(key, false)}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.6,
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: '6px',
                  px: 1,
                  py: 0.4,
                  cursor: 'pointer',
                  bgcolor: CHIP[g.color].bg,
                  color: CHIP[g.color].fg,
                  border: `1px solid ${CHIP[g.color].bd}`,
                }}
              >
                {def.label}
                <Box component="span" sx={{ opacity: 0.55 }}>
                  ×
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
      <Stack sx={{ gap: 0.85 }}>
        {SOURCE_GROUPS.map((g, i) => (
          <FieldSourceGroup
            key={g.id}
            group={g.id}
            selected={item.fieldKeys}
            defaultOpen={i === 0}
            onToggle={toggle}
          />
        ))}
      </Stack>
    </Box>
  );
}

function FieldSourceGroup({
  group,
  selected,
  defaultOpen,
  onToggle,
}: {
  group: GuestDocumentFieldGroup;
  selected: string[];
  defaultOpen?: boolean;
  onToggle: (key: string, on: boolean) => void;
}) {
  const meta = SOURCE_GROUPS.find((g) => g.id === group)!;
  const fields = fieldsInGroup(group);
  const onCount = fields.filter((f) => selected.includes(f.key)).length;

  return (
    <Box component="details" open={defaultOpen} sx={{ border: `1px solid ${V3.b}`, borderRadius: '10px', bgcolor: V3.card, overflow: 'hidden' }}>
      <Box
        component="summary"
        sx={{
          listStyle: 'none',
          cursor: 'pointer',
          px: 1.5,
          py: 1.2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.1,
          '&::-webkit-details-marker': { display: 'none' },
        }}
      >
        <Typography sx={{ fontSize: 12.5, fontWeight: 750, flex: 1 }}>
          {meta.icon} {meta.name}
        </Typography>
        {onCount > 0 && (
          <Box sx={{ fontSize: 10.5, fontFamily: 'monospace', fontWeight: 600, bgcolor: V3.pt, color: V3.pd, borderRadius: '10px', px: 0.85, py: 0.2 }}>
            {onCount}
          </Box>
        )}
        <Typography sx={{ fontSize: 16, color: V3.t4 }}>›</Typography>
      </Box>
      <Box sx={{ borderTop: `1px solid ${V3.b}` }}>
        {fields.map((field) => {
          const on = selected.includes(field.key);
          const badge = BADGE[field.badgeKind];
          return (
            <Box
              key={field.key}
              component="label"
              sx={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: 1.1,
                alignItems: 'center',
                px: 1.5,
                py: 0.85,
                cursor: 'pointer',
                bgcolor: on ? V3.alt : 'transparent',
                borderBottom: `1px solid ${V3.b}`,
                '&:last-child': { borderBottom: 'none' },
                '&:hover': { bgcolor: V3.pt },
              }}
            >
              <Checkbox
                size="small"
                checked={on}
                onChange={(e) => onToggle(field.key, e.target.checked)}
                sx={{ p: 0, color: V3.bs, '&.Mui-checked': { color: V3.p } }}
              />
              <Typography sx={{ fontSize: 12.5, fontWeight: on ? 700 : 600, color: on ? V3.t : V3.t2 }}>
                {field.label}
              </Typography>
              <Box
                sx={{
                  fontSize: 10,
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  borderRadius: '4px',
                  px: 0.75,
                  py: 0.25,
                  bgcolor: badge.bg,
                  color: badge.fg,
                  whiteSpace: 'nowrap',
                }}
              >
                {field.badge}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function BodyBlock({
  document: item,
  onChange,
}: {
  document: GuestDocument;
  onChange: (patch: Partial<GuestDocument>) => void;
}) {
  const clauses = item.clauses ?? [];
  const isPolice = item.kind === 'police_form';

  const setClause = (id: string, patch: Partial<(typeof clauses)[number]>) => {
    onChange({
      clauses: clauses.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };

  return (
    <Box sx={{ display: 'grid', gap: 1.75 }}>
      <Box
        sx={{
          border: `1px solid ${V3.b}`,
          borderRadius: '10px',
          bgcolor: V3.card,
          px: 1.75,
          py: 1.5,
        }}
      >
        <Typography sx={{ fontSize: 10.5, fontWeight: 750, letterSpacing: '0.12em', textTransform: 'uppercase', color: V3.t4, mb: 0.75 }}>
          Aperçu du titre
        </Typography>
        <Typography sx={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
          {item.title.trim() || 'Titre imprimé'}
        </Typography>
        {item.fieldKeys.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.75, mt: 1.25 }}>
            {item.fieldKeys.map((key) => {
              const def = fieldDef(key);
              return (
                <Typography key={key} sx={{ fontSize: 12, color: V3.t2 }}>
                  <Box component="span" sx={{ fontWeight: 700, color: V3.t }}>
                    {def?.label ?? key}
                  </Box>
                  {' : '}
                  <Box component="span" sx={{ color: V3.pd, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11 }}>
                    {`{{${key}}}`}
                  </Box>
                </Typography>
              );
            })}
          </Box>
        )}
      </Box>

      <Box>
        <SectionLabel>{isPolice ? 'Mention (pied de fiche)' : 'Articles — titre en gras'}</SectionLabel>
        {isPolice ? (
          <TextField
            fullWidth
            multiline
            minRows={2}
            value={item.notice}
            onChange={(e) => onChange({ notice: e.target.value })}
            sx={inputSx}
            helperText="Court texte en bas de la fiche, comme sur un hôtel."
          />
        ) : (
          <Stack sx={{ gap: 1.1 }}>
            {clauses.map((clause, index) => (
              <Box
                key={clause.id}
                sx={{ border: `1px solid ${V3.b}`, borderRadius: '10px', bgcolor: V3.card, p: 1.5, display: 'grid', gap: 1 }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography sx={{ fontSize: 11, fontWeight: 750, color: V3.t4 }}>
                    Article {index + 1}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => onChange({ clauses: clauses.filter((c) => c.id !== clause.id) })}
                    sx={{ textTransform: 'none', color: V3.er, fontSize: 12 }}
                  >
                    Retirer
                  </Button>
                </Stack>
                <TextField
                  size="small"
                  fullWidth
                  label="Titre (gras)"
                  value={clause.title}
                  onChange={(e) => setClause(clause.id, { title: e.target.value })}
                  sx={{
                    ...inputSx,
                    '& .MuiInputBase-input': { fontWeight: 800, fontSize: 14.5 },
                  }}
                />
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  minRows={3}
                  label="Texte FR"
                  value={clause.bodyFr}
                  onChange={(e) => setClause(clause.id, { bodyFr: e.target.value })}
                  sx={inputSx}
                />
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  label="Texte EN"
                  value={clause.bodyEn}
                  onChange={(e) => setClause(clause.id, { bodyEn: e.target.value })}
                  sx={inputSx}
                />
              </Box>
            ))}
            <Button
              size="small"
              onClick={() => onChange({ clauses: [...clauses, newClause()] })}
              sx={{ ...ghostBtnSx, alignSelf: 'flex-start' }}
            >
              ＋ Ajouter un article
            </Button>
          </Stack>
        )}
      </Box>

      <Box>
        <SectionLabel>Clôture / signature</SectionLabel>
        <TextField
          fullWidth
          multiline
          minRows={3}
          value={item.closing}
          onChange={(e) => onChange({ closing: e.target.value })}
          sx={inputSx}
          helperText="Phrase de confirmation, date et lieu — pas le bloc d’identité."
        />
      </Box>
    </Box>
  );
}

function RailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: V3.rail, border: `1px solid ${V3.b}`, borderRadius: '12px', px: 1.85, py: 1.6 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 750, letterSpacing: '0.12em', textTransform: 'uppercase', color: V3.t4, mb: 1.25 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function GlanceStat({ value, label }: { value: string; label: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 15, fontWeight: 600, fontFamily: 'ui-monospace, Menlo, monospace' }}>{value}</Typography>
      <Typography sx={{ fontSize: 10, fontWeight: 750, letterSpacing: '0.09em', textTransform: 'uppercase', color: V3.t4, mt: 0.15 }}>
        {label}
      </Typography>
    </Box>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: 10.5, fontWeight: 750, letterSpacing: '0.12em', textTransform: 'uppercase', color: V3.t4, mb: 1.1, display: 'block' }}>
      {children}
    </Typography>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: V3.t2, mb: 0.5 }}>{label}</Typography>
      {children}
    </Box>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.85 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: V3.t2 }}>{label}</Typography>
      <Switch size="small" checked={checked} onChange={(e) => onChange(e.target.checked)} sx={switchSx} />
    </Stack>
  );
}

function RadioRow({
  on,
  label,
  hint,
  onClick,
}: {
  on: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.1,
        border: `1px solid ${on ? V3.p : V3.bs}`,
        borderRadius: '9px',
        px: 1.35,
        py: 1,
        bgcolor: on ? V3.pt : V3.card,
        cursor: 'pointer',
      }}
    >
      <Box
        sx={{
          width: 15,
          height: 15,
          borderRadius: '50%',
          border: `1.6px solid ${on ? V3.p : V3.bs}`,
          position: 'relative',
          '&::after': on
            ? { content: '""', position: 'absolute', inset: '3px', borderRadius: '50%', bgcolor: V3.p }
            : {},
        }}
      />
      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: on ? V3.pd : V3.t2 }}>
        {label}{' '}
        <Box component="small" sx={{ color: V3.t4, fontWeight: 500 }}>
          {hint}
        </Box>
      </Typography>
    </Box>
  );
}

function StarterChip({
  label,
  on,
  disabled,
  onClick,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      disabled={disabled}
      onClick={onClick}
      sx={{
        border: `1px ${disabled ? 'dashed' : 'solid'} ${on ? V3.p : V3.bs}`,
        bgcolor: on ? V3.pt : V3.card,
        color: disabled ? V3.t4 : on ? V3.pd : V3.t2,
        borderRadius: '18px',
        fontSize: 12,
        fontWeight: on ? 750 : 650,
        px: 1.75,
        py: 0.75,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {label}
    </Box>
  );
}

const priBtnSx = {
  textTransform: 'none',
  fontWeight: 700,
  fontSize: 13,
  bgcolor: V3.p,
  color: '#fff',
  border: `1px solid ${V3.pd}`,
  borderRadius: '9px',
  px: 2.1,
  py: 1,
  '&:hover': { bgcolor: V3.pd },
  '&.Mui-disabled': { bgcolor: V3.bs, color: V3.t4, borderColor: 'transparent' },
} as const;

const ghostBtnSx = {
  textTransform: 'none',
  fontWeight: 650,
  fontSize: 12.5,
  color: V3.t2,
  border: `1px solid ${V3.bs}`,
  borderRadius: '9px',
  bgcolor: V3.card,
  '&:hover': { bgcolor: V3.alt },
} as const;

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '9px',
    bgcolor: V3.card,
    fontSize: 13,
    '& fieldset': { borderColor: V3.bs },
    '&:hover fieldset': { borderColor: V3.p },
    '&.Mui-focused fieldset': { borderColor: V3.p },
  },
} as const;

const switchSx = {
  '& .MuiSwitch-switchBase.Mui-checked': { color: '#fff' },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: V3.wa, opacity: 1 },
} as const;
