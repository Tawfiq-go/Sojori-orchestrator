/**
 * ════════════════════════════════════════════════════════════════════════════
 * CONFIGURATION D'UN ÉTABLISSEMENT — écran unique, 6 sections
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Parcours : liste des établissements (comme /listings?tab=active) → clic →
 * formulaire de configuration (?listing=…).
 *
 * ⚠️ MODULE GREENFIELD : zéro import depuis form-v2.
 * ════════════════════════════════════════════════════════════════════════════
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import listingsService from '../../services/listingsService';
import type { ListingStructure, ListingSummary } from '../../types/listings.types';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import { T, kickerSx } from './tokens';
import SectionIdentite from './sections/SectionIdentite';
import SectionStructure from './sections/SectionStructure';
import SectionContenu from './sections/SectionContenu';
import SectionEquipements from './sections/SectionEquipements';
import SectionPublication from './sections/SectionPublication';
import SectionAutres from './sections/SectionAutres';

export type SectionId =
  | 'identite'
  | 'structure'
  | 'contenu'
  | 'equipements'
  | 'publication'
  | 'autres';

const SECTIONS: Array<{ id: SectionId; n: number; label: string; verb: string }> = [
  { id: 'identite', n: 1, label: 'Identité', verb: "ce que l'établissement EST" },
  { id: 'structure', n: 2, label: 'Structure', verb: "ce qu'il contient" },
  { id: 'contenu', n: 3, label: 'Contenu', verb: "ce qu'il MONTRE" },
  { id: 'equipements', n: 4, label: 'Équipements', verb: "ce qu'il OFFRE" },
  { id: 'publication', n: 5, label: 'Publication', verb: 'ce que chaque canal reçoit' },
  { id: 'autres', n: 6, label: 'Autres', verb: 'réglages non encore reclassés' },
];

const CARD_GRADIENTS = [
  'linear-gradient(135deg, #fde68a, #d97706)',
  'linear-gradient(135deg, #a5f3fc, #0e7490)',
  'linear-gradient(135deg, #ddd6fe, #7c3aed)',
  'linear-gradient(135deg, #86efac, #16a34a)',
  'linear-gradient(135deg, #fbcfe8, #db2777)',
];

type ListingOption = {
  id: string;
  name: string;
  propertyUnit: string;
  city?: string | null;
  coverImageUrl?: string;
  status?: string;
  ownerName?: string;
};

function toOption(l: ListingSummary): ListingOption {
  return {
    id: l.id,
    name: l.name || '—',
    propertyUnit: l.propertyUnit || 'Single',
    city: l.city || null,
    coverImageUrl: l.coverImageUrl || '',
    status: l.status,
    ownerName: l.ownerName,
  };
}

export default function EtablissementPage() {
  const [params, setParams] = useSearchParams();
  const listingId = params.get('listing') ?? '';
  const section = (params.get('section') as SectionId) || 'identite';
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();

  const [options, setOptions] = useState<ListingOption[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);

  const [structure, setStructure] = useState<ListingStructure | null>(null);
  /**
   * Document listing brut : porte le CONTENU (photos, équipements,
   * descriptions) que /structure ne renvoie pas. Volontairement `Record` non
   * typé — le document legacy a des dizaines de champs, on ne fige que ceux
   * qu'on lit réellement, dans les sections.
   */
  const [doc, setDoc] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Liste des établissements (même source que /listings?tab=active) ──
  useEffect(() => {
    if (!scopeFetchReady) {
      setOptions([]);
      setListLoading(false);
      return;
    }
    let alive = true;
    setListLoading(true);
    setListError(null);
    void listingsService
      .getListings({
        page: 0,
        limit: 200,
        staging: false,
        useActiveFilter: true,
        active: activeOnly,
        name: search.trim() || undefined,
        filterOwnerId: requestOwnerId || undefined,
        forListingsOverview: true,
      })
      .then((r) => {
        if (!alive) return;
        const items = r.data?.items ?? [];
        setOptions(items.map(toOption).filter((o) => o.id));
      })
      .catch((e) => {
        if (!alive) return;
        setOptions([]);
        setListError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (alive) setListLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [scopeFetchReady, requestOwnerId, activeOnly, search]);

  const reload = useCallback(async () => {
    if (!listingId) {
      setStructure(null);
      setDoc(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Deux sources complémentaires, chargées ensemble :
      //  · /structure  → l'arbre types → chambres + la capacité VENDABLE
      //  · /by-id      → le contenu (photos, équipements, descriptions), que
      //                  /structure ne porte pas volontairement.
      const [s, d] = await Promise.all([
        listingsService.getListingStructure(listingId),
        listingsService.getListingDocument(listingId),
      ]);
      if (!s) {
        throw new Error(
          "La structure n'a pas pu être chargée (route /structure indisponible).",
        );
      }
      setStructure(s);
      // Le contenu est secondaire : son absence ne doit pas vider l'écran.
      setDoc(d);
    } catch (e) {
      setStructure(null);
      setDoc(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const isMulti = structure?.building.propertyUnit === 'Multi';
  const current = useMemo(
    () => options.find((o) => o.id === listingId) ?? null,
    [options, listingId],
  );

  const setSection = (next: SectionId) => {
    const p = new URLSearchParams(params);
    p.set('section', next);
    setParams(p, { replace: true });
    window.scrollTo(0, 0);
  };

  const setListing = (next: ListingOption | null) => {
    const p = new URLSearchParams(params);
    if (next) {
      p.set('listing', next.id);
      p.set('section', 'identite');
    } else {
      p.delete('listing');
      p.delete('section');
    }
    setParams(p, { replace: true });
    window.scrollTo(0, 0);
  };

  // ── Vue liste (pas de ?listing) ──
  if (!listingId) {
    return (
      <Box sx={{ bgcolor: T.bg0, minHeight: '100%', p: { xs: 2, md: 3 } }}>
        <Box sx={{ maxWidth: 1800, mx: 'auto' }}>
          <Typography sx={{ ...kickerSx, mb: 0.5 }}>Annonces / Configuration</Typography>
          <Typography sx={{ fontWeight: 750, fontSize: 22, color: T.ink, lineHeight: 1.2, mb: 0.5 }}>
            Configuration
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: T.ink3, mb: 2.5 }}>
            Choisissez un établissement pour ouvrir son formulaire de configuration.
          </Typography>

          <Stack direction="row" sx={{ gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Rechercher par nom…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 240, flex: '1 1 220px', maxWidth: 360 }}
            />
            <Button
              size="small"
              variant={activeOnly ? 'contained' : 'outlined'}
              onClick={() => setActiveOnly(true)}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Actives
            </Button>
            <Button
              size="small"
              variant={!activeOnly ? 'contained' : 'outlined'}
              onClick={() => setActiveOnly(false)}
              sx={{ textTransform: 'none', fontWeight: 700 }}
            >
              Inactives
            </Button>
            <Typography sx={{ fontSize: 12, color: T.ink3, ml: 'auto' }}>
              {listLoading ? 'Chargement…' : `${options.length} établissement${options.length !== 1 ? 's' : ''}`}
            </Typography>
          </Stack>

          {listError ? (
            <Alert severity="warning" sx={{ mb: 2, fontSize: 13.5 }}>
              {listError}
            </Alert>
          ) : null}

          {!scopeFetchReady ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 14, color: T.ink3 }}>
                Sélectionnez un property manager dans le filtre admin pour afficher ses établissements.
              </Typography>
            </Box>
          ) : listLoading ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <CircularProgress size={24} sx={{ color: T.gold }} />
            </Box>
          ) : options.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 14, color: T.ink3 }}>
                {search.trim()
                  ? 'Aucun établissement ne correspond à cette recherche.'
                  : `Aucun établissement ${activeOnly ? 'actif' : 'inactif'}.`}
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 280px))',
                gap: 2,
                justifyContent: 'flex-start',
              }}
            >
              {options.map((o, index) => {
                const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
                const isHotel = o.propertyUnit === 'Multi';
                return (
                  <Box
                    key={o.id}
                    component="button"
                    type="button"
                    onClick={() => setListing(o)}
                    sx={{
                      all: 'unset',
                      cursor: 'pointer',
                      width: 280,
                      maxWidth: '100%',
                      border: `1px solid ${T.line}`,
                      borderRadius: '14px',
                      overflow: 'hidden',
                      bgcolor: T.bg1,
                      boxShadow: '0 8px 24px rgba(26,20,8,0.06)',
                      textAlign: 'left',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 28px rgba(26,20,8,0.1)',
                      },
                      '&:focus-visible': { outline: `2px solid ${T.gold}`, outlineOffset: 2 },
                    }}
                  >
                    <Box
                      sx={{
                        height: 140,
                        background: o.coverImageUrl
                          ? `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.40)), url(${o.coverImageUrl}) center/cover`
                          : gradient,
                      }}
                    />
                    <Box sx={{ p: 2 }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{o.name}</Typography>
                      <Typography sx={{ mt: 0.5, fontSize: 12, color: T.ink3 }}>
                        {isHotel ? 'Hôtel' : 'Logement'}
                        {o.city ? ` · ${o.city}` : ''}
                      </Typography>
                      {o.ownerName ? (
                        <Typography sx={{ mt: 0.75, fontSize: 12, color: T.ink2 }}>
                          {o.ownerName}
                        </Typography>
                      ) : null}
                      <Typography
                        sx={{
                          mt: 1.5,
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: T.goldDeep,
                        }}
                      >
                        Ouvrir la configuration →
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  // ── Vue formulaire (?listing=…) ──
  return (
    <Box sx={{ bgcolor: T.bg0, minHeight: '100%', p: { xs: 2, md: 3 } }}>
      <Box sx={{ maxWidth: 1800, mx: 'auto' }}>
        <Typography sx={{ ...kickerSx, mb: 0.5 }}>Annonces / Configuration</Typography>
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: 2 }}
        >
          <Box>
            <Button
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={() => setListing(null)}
              sx={{ textTransform: 'none', fontWeight: 600, color: T.ink2, mb: 0.75, ml: -0.5 }}
            >
              Établissements
            </Button>
            <Typography sx={{ fontWeight: 750, fontSize: 22, color: T.ink, lineHeight: 1.2 }}>
              {structure?.building.name || current?.name || 'Établissement'}
            </Typography>
            {structure ? (
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                <Box
                  component="span"
                  sx={{
                    px: 0.9,
                    py: 0.2,
                    borderRadius: '999px',
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.4px',
                    color: isMulti ? T.goldDeep : T.ink2,
                    bgcolor: isMulti ? T.goldTint : T.bg3,
                    border: `1px solid ${isMulti ? T.gold : T.line}`,
                  }}
                >
                  {isMulti ? 'HÔTEL' : 'LOGEMENT'}
                </Box>
                <Typography sx={{ fontSize: 12.5, color: T.ink3 }}>
                  {[structure.building.city, structure.building.propertyType]
                    .filter(Boolean)
                    .join(' · ')}
                </Typography>
              </Stack>
            ) : null}
          </Box>

          <Autocomplete
            options={options}
            value={current}
            onChange={(_, next) => setListing(next)}
            getOptionLabel={(o) => o.name}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            size="small"
            sx={{ width: { xs: '100%', sm: 340 } }}
            renderOption={(props, o) => (
              <Box component="li" {...props} key={o.id}>
                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{o.name}</Typography>
                  <Typography sx={{ fontSize: 11, color: T.ink3 }}>
                    {o.propertyUnit === 'Multi' ? 'Hôtel' : 'Logement'}
                    {o.city ? ` · ${o.city}` : ''}
                  </Typography>
                </Box>
              </Box>
            )}
            renderInput={(p) => <TextField {...p} placeholder="Changer d'établissement…" />}
          />
        </Stack>

        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            overflowX: 'auto',
            pb: 1,
            mb: 2,
            borderBottom: `1px solid ${T.line}`,
            '&::-webkit-scrollbar': { display: 'none' },
            scrollbarWidth: 'none',
          }}
        >
          {SECTIONS.map((s) => {
            const on = s.id === section;
            return (
              <Box
                key={s.id}
                component="button"
                type="button"
                onClick={() => setSection(s.id)}
                aria-current={on ? 'page' : undefined}
                sx={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 1,
                  borderRadius: `${T.radius}px`,
                  whiteSpace: 'nowrap',
                  bgcolor: on ? T.goldTint : 'transparent',
                  border: `1px solid ${on ? T.gold : 'transparent'}`,
                  '&:hover': { bgcolor: on ? T.goldTint : T.bg2 },
                  '&:focus-visible': { outline: `2px solid ${T.gold}`, outlineOffset: 2 },
                }}
              >
                <Box
                  component="span"
                  sx={{
                    fontFamily: T.mono,
                    fontSize: 11,
                    fontWeight: 800,
                    color: on ? T.goldDeep : T.ink4,
                  }}
                >
                  {s.n}
                </Box>
                <Box component="span" sx={{ fontSize: 13.5, fontWeight: on ? 750 : 600, color: on ? T.ink : T.ink2 }}>
                  {s.label}
                </Box>
              </Box>
            );
          })}
        </Box>

        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress size={24} sx={{ color: T.gold }} />
          </Box>
        ) : error ? (
          <Alert severity="warning" sx={{ fontSize: 13.5 }}>
            {error}
          </Alert>
        ) : structure ? (
          <>
            {section === 'identite' ? (
              <SectionIdentite structure={structure} onChanged={() => void reload()} />
            ) : null}
            {section === 'structure' ? (
              <SectionStructure structure={structure} onChanged={() => void reload()} />
            ) : null}
            {section === 'contenu' ? <SectionContenu structure={structure} doc={doc} /> : null}
            {section === 'equipements' ? (
              <SectionEquipements structure={structure} doc={doc} />
            ) : null}
            {section === 'publication' ? <SectionPublication structure={structure} /> : null}
            {section === 'autres' ? <SectionAutres structure={structure} /> : null}
          </>
        ) : null}
      </Box>
    </Box>
  );
}
