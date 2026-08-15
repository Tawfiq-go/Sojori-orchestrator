/**
 * SECTION 4 — ÉQUIPEMENTS : ce que l'établissement OFFRE.
 *
 * ⚠️ INCOHÉRENCE CONNUE, à ne pas reproduire silencieusement :
 * les deux mécanismes de partage ont aujourd'hui des défauts OPPOSÉS —
 *   · une photo du bâtiment non associée à un type n'est PAS publiée ;
 *   · un équipement du bâtiment non flaggué est publié PARTOUT.
 * Deux réglages présentés comme jumeaux, deux comportements inverses. Tant que
 * le backend n'est pas aligné, cette section le DIT plutôt que de le masquer.
 */
import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import type { ListingStructure } from '../../../types/listings.types';
import { T, cardSx, kickerSx } from '../tokens';

type Props = { structure: ListingStructure; doc: Record<string, unknown> | null };

/** Une ligne d'équipement telle que la porte le document listing. */
type AmenityRef = {
  _id?: unknown;
  count?: number;
  shareToAllRoomTypes?: boolean;
  roomTypeIds?: string[];
  amenityData?: { name?: unknown };
  name?: unknown;
};
type RtDoc = { _id?: string; amenitiesIds?: AmenityRef[] };

const arr = <TItem,>(v: unknown): TItem[] => (Array.isArray(v) ? (v as TItem[]) : []);

/**
 * Le nom d'un équipement est stocké de plusieurs façons selon son âge :
 * chaîne simple, objet multilingue, ou dénormalisé dans `amenityData`.
 * On tente dans cet ordre plutôt que d'afficher un identifiant brut.
 */
function amenityLabel(a: AmenityRef): string {
  const raw = a.amenityData?.name ?? a.name;
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    for (const k of ['fr', 'en', 'value', 'nameFr', 'nameEn']) {
      const v = o[k];
      if (typeof v === 'string' && v.trim()) return v;
    }
  }
  return '—';
}

/** Portée d'un équipement du bâtiment (règles réelles du push). */
function scopeOf(a: AmenityRef): { label: string; color: string } {
  if (a.shareToAllRoomTypes === true) return { label: 'Tous les types', color: T.ok };
  if (Array.isArray(a.roomTypeIds)) {
    if (a.roomTypeIds.length === 0) return { label: 'Bâtiment seul', color: T.ink3 };
    return { label: `${a.roomTypeIds.length} type(s)`, color: T.goldDeep };
  }
  // Ni flag ni ciblage : historique — partagé partout par défaut.
  return { label: 'Tous (défaut)', color: T.ink3 };
}

function Chip({ label, color, dim }: { label: string; color?: string; dim?: boolean }) {
  return (
    <Box
      sx={{
        px: 1,
        py: 0.4,
        borderRadius: '8px',
        fontSize: 12,
        fontWeight: 600,
        color: dim ? T.ink3 : T.ink,
        bgcolor: dim ? T.bg2 : T.bg1,
        border: `1px ${dim ? 'dashed' : 'solid'} ${color || T.line}`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Box>
  );
}

export default function SectionEquipements({ structure, doc }: Props) {
  const isMulti = structure.building.propertyUnit === 'Multi';
  const buildingAmenities = arr<AmenityRef>(doc?.listingAmenitiesIds);
  const roomTypeDocs = arr<RtDoc>(doc?.roomTypes);

  const [selType, setSelType] = useState<string>(structure.roomTypes[0]?.id ?? '');
  const rtStruct = structure.roomTypes.find((r) => r.id === selType);
  const rtDoc = roomTypeDocs.find((r) => String(r._id) === selType);
  const own = arr<AmenityRef>(rtDoc?.amenitiesIds);

  // Équipements du bâtiment qui atteignent CE type (mêmes règles que le push).
  const inherited = buildingAmenities.filter((a) => {
    if (!isMulti) return true;
    if (a.shareToAllRoomTypes === true) return true;
    if (Array.isArray(a.roomTypeIds)) return a.roomTypeIds.map(String).includes(selType);
    return true; // historique : partagé par défaut
  });

  return (
    <Stack spacing={1.75}>
      {/* ── Communs du bâtiment ── */}
      <Box sx={cardSx}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 1, mb: 0.25 }}>
          <Typography sx={{ fontWeight: 750, fontSize: 15, color: T.ink }}>
            {isMulti ? 'Équipements communs du bâtiment' : 'Équipements du logement'}
          </Typography>
          <Typography sx={{ fontFamily: T.mono, fontSize: 12.5, fontWeight: 800, color: T.ink2 }}>
            {buildingAmenities.length}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: 12, color: T.ink3, mb: 1.5 }}>
          {isMulti
            ? 'Valables pour tout l\'établissement — la portée indique quels types en héritent.'
            : 'Un seul niveau : tout appartient au logement.'}
        </Typography>

        {buildingAmenities.length ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {buildingAmenities.map((a, i) => {
              const s = scopeOf(a);
              return (
                <Stack
                  key={`${String(a._id)}-${i}`}
                  direction="row"
                  sx={{
                    alignItems: 'center',
                    gap: 0.6,
                    px: 1,
                    py: 0.45,
                    borderRadius: '8px',
                    border: `1px solid ${T.line}`,
                    bgcolor: T.bg1,
                  }}
                >
                  <Typography sx={{ fontSize: 12.5, color: T.ink }}>{amenityLabel(a)}</Typography>
                  {isMulti ? (
                    <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: s.color, letterSpacing: '0.3px' }}>
                      {s.label.toUpperCase()}
                    </Typography>
                  ) : null}
                </Stack>
              );
            })}
          </Box>
        ) : (
          <Typography sx={{ fontSize: 12.5, color: T.ink4, fontStyle: 'italic' }}>
            Aucun équipement renseigné.
          </Typography>
        )}
      </Box>

      {/* ── Par type : hérités vs propres ── */}
      {isMulti && structure.roomTypes.length ? (
        <Box sx={cardSx}>
          <Typography sx={{ fontWeight: 750, fontSize: 15, color: T.ink, mb: 1.25 }}>
            Ce que voit le client, type par type
          </Typography>

          <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
            {structure.roomTypes.map((rt) => {
              const on = rt.id === selType;
              return (
                <Box
                  key={rt.id}
                  component="button"
                  type="button"
                  onClick={() => setSelType(rt.id)}
                  aria-pressed={on}
                  sx={{
                    all: 'unset',
                    cursor: 'pointer',
                    px: 1.25,
                    py: 0.6,
                    borderRadius: '999px',
                    fontSize: 12.5,
                    fontWeight: on ? 750 : 600,
                    color: on ? T.ink : T.ink2,
                    bgcolor: on ? T.goldTint : T.bg2,
                    border: `1px solid ${on ? T.gold : T.line}`,
                    '&:focus-visible': { outline: `2px solid ${T.gold}`, outlineOffset: 2 },
                  }}
                >
                  {rt.otaDisplayName || rt.name}
                </Box>
              );
            })}
          </Stack>

          {/* Deux colonnes : hérité (lecture seule) vs propre. */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
              gap: 2.5,
              alignItems: 'start',
            }}
          >
            <Box>
              <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1, mb: 1 }}>
                <Typography sx={{ ...kickerSx, fontSize: 9.5 }}>Hérités du bâtiment</Typography>
                <Typography sx={{ fontSize: 10, color: T.ink4 }}>lecture seule</Typography>
              </Stack>
              {inherited.length ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {inherited.map((a, i) => (
                    <Chip key={`inh-${i}`} label={amenityLabel(a)} dim />
                  ))}
                </Box>
              ) : (
                <Typography sx={{ fontSize: 12, color: T.ink4, fontStyle: 'italic' }}>
                  Aucun équipement du bâtiment n'atteint ce type.
                </Typography>
              )}
            </Box>

            <Box>
              <Typography sx={{ ...kickerSx, fontSize: 9.5, mb: 1 }}>
                Propres à {rtStruct?.otaDisplayName || rtStruct?.name}
              </Typography>
              {own.length ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {own.map((a, i) => (
                    <Chip key={`own-${i}`} label={amenityLabel(a)} color={T.gold} />
                  ))}
                </Box>
              ) : (
                <Typography sx={{ fontSize: 12, color: T.ink4, fontStyle: 'italic' }}>
                  Rien de spécifique à ce type.
                </Typography>
              )}
            </Box>
          </Box>

          <Typography sx={{ fontSize: 12.5, color: T.ink2, mt: 2, pt: 1.5, borderTop: `1px solid ${T.line}` }}>
            Le client verra <b>{inherited.length + own.length} équipements</b> pour ce type :{' '}
            {inherited.length} commun{inherited.length > 1 ? 's' : ''} + {own.length} propre
            {own.length > 1 ? 's' : ''}.
          </Typography>
        </Box>
      ) : null}

      {isMulti ? (
        <Box
          sx={{
            border: `1px solid ${T.gold}`,
            bgcolor: T.goldTint,
            borderRadius: `${T.radius}px`,
            p: 1.5,
            fontSize: 12.5,
            color: T.ink,
            lineHeight: 1.7,
          }}
        >
          <b>Attention aux deux règles opposées.</b> Un équipement du bâtiment non marqué est
          publié <b>sur tous les types</b>. Une photo du bâtiment non associée n'est publiée{' '}
          <b>sur aucun</b>. C'est contre-intuitif et connu — vérifiez la section{' '}
          <b>Publication</b> avant de diffuser.
        </Box>
      ) : null}

      <Box
        sx={{
          border: `1px dashed ${T.lineStrong}`,
          borderRadius: `${T.radius}px`,
          p: 1.5,
          fontSize: 12.5,
          color: T.ink3,
          lineHeight: 1.6,
        }}
      >
        Affichage seul pour l'instant : l'édition se fait encore dans l'ancien formulaire
        (onglet Équipements pour les communs, Config Rooms pour ceux propres à un type).
      </Box>
    </Stack>
  );
}
