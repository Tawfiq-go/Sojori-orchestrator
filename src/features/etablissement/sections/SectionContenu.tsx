/**
 * SECTION 3 — CONTENU : ce que l'établissement MONTRE.
 *
 * ⚠️ LA RÈGLE D'HÉRITAGE, à rendre visible partout :
 *   le BÂTIMENT donne · le TYPE complète · le canal reçoit la COMPOSITION.
 *
 * Trois pièges du modèle actuel, mesurés dans le code de production — cette
 * section les rend visibles au lieu de les subir :
 *
 * 1. Une seule photo ajoutée sur un type fait disparaître d'un coup toutes les
 *    photos héritées du bâtiment pour ce type.
 * 2. Une seule description saisie sur un type REMPLACE la description du
 *    bâtiment : quartier, règles et accès disparaissent de l'annonce publiée.
 * 3. Le bâtiment a 12 champs de texte structurés, un type n'a qu'un texte brut.
 *
 * Tant que le backend compose (au lieu de remplacer), cette section AFFICHE le
 * mécanisme et prévient — elle ne prétend pas l'avoir corrigé.
 */
import { useState } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import type { ListingStructure } from '../../../types/listings.types';
import { T, cardSx, kickerSx } from '../tokens';

type Props = { structure: ListingStructure; doc: Record<string, unknown> | null };

type Img = { url?: string; sortOrder?: number; roomTypeIds?: string[] };
type Desc = { languageRuId?: unknown; value?: string; headline?: string };
type RtDoc = {
  _id?: string;
  roomTypeName?: string;
  otaDisplayName?: string;
  roomTypeImages?: Img[];
  descriptions?: Desc[];
};

const arr = <TItem,>(v: unknown): TItem[] => (Array.isArray(v) ? (v as TItem[]) : []);

/** Vignette — on n'affiche que ce qui a une URL réelle. */
function Thumb({ img, inherited }: { img: Img; inherited?: boolean }) {
  if (!img.url) return null;
  return (
    <Tooltip arrow title={inherited ? 'Héritée du bâtiment' : 'Propre à ce type'}>
      <Box
        sx={{
          position: 'relative',
          width: 104,
          height: 78,
          borderRadius: '8px',
          overflow: 'hidden',
          border: `1.5px ${inherited ? 'dashed' : 'solid'} ${inherited ? T.lineStrong : T.line}`,
          bgcolor: T.bg2,
          flex: '0 0 auto',
        }}
      >
        <Box
          component="img"
          src={img.url}
          alt=""
          loading="lazy"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            // Une photo héritée est visible mais visiblement seconde.
            opacity: inherited ? 0.55 : 1,
          }}
        />
        {inherited ? (
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              right: 0,
              px: 0.5,
              py: 0.2,
              bgcolor: 'rgba(20,17,10,0.72)',
              color: '#fff',
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: '0.3px',
              textAlign: 'center',
            }}
          >
            DU BÂTIMENT
          </Box>
        ) : null}
      </Box>
    </Tooltip>
  );
}

function TextBlock({ label, value }: { label: string; value?: string }) {
  const empty = !value?.trim();
  return (
    <Box>
      <Typography sx={{ ...kickerSx, fontSize: 9.5, mb: 0.35 }}>{label}</Typography>
      <Typography
        sx={{
          fontSize: 13,
          color: empty ? T.ink4 : T.ink2,
          fontStyle: empty ? 'italic' : 'normal',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}
      >
        {empty ? 'non renseigné' : value}
      </Typography>
    </Box>
  );
}

export default function SectionContenu({ structure, doc }: Props) {
  const isMulti = structure.building.propertyUnit === 'Multi';
  const buildingImages = arr<Img>(doc?.listingImages);
  const descriptions = arr<Desc>(doc?.description);
  const roomTypeDocs = arr<RtDoc>(doc?.roomTypes);

  // FR = languageRuId 4 côté bâtiment (table de langues RU). On prend la 1re
  // ligne à défaut : mieux vaut afficher une langue que rien.
  const mainDesc = descriptions.find((d) => String(d.languageRuId) === '4') ?? descriptions[0];

  const [selType, setSelType] = useState<string>(structure.roomTypes[0]?.id ?? '');
  const rtStruct = structure.roomTypes.find((r) => r.id === selType);
  const rtDoc = roomTypeDocs.find((r) => String(r._id) === selType);
  const rtImages = arr<Img>(rtDoc?.roomTypeImages);
  const rtDesc = arr<Desc>(rtDoc?.descriptions)[0];

  /**
   * Photos du bâtiment visibles dans l'annonce de CE type.
   * Règle réelle du push : une image sans `roomTypeIds` est héritée seulement
   * si le type n'a AUCUNE galerie propre ; une image ciblée l'est si elle
   * mentionne ce type. C'est le comportement qu'on reflète ici, pas un idéal.
   */
  const typeHasOwn = rtImages.length > 0;
  const inheritedForType = buildingImages.filter((img) => {
    if (Array.isArray(img.roomTypeIds)) return img.roomTypeIds.map(String).includes(selType);
    return !typeHasOwn;
  });

  return (
    <Stack spacing={1.75}>
      {/* ── Contenu du BÂTIMENT ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gap: 1.75,
          alignItems: 'start',
        }}
      >
        <Box sx={cardSx}>
          <Typography sx={{ fontWeight: 750, fontSize: 15, color: T.ink, mb: 0.25 }}>
            Textes du {isMulti ? 'bâtiment' : 'logement'}
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.ink3, mb: 2 }}>
            {descriptions.length} langue{descriptions.length > 1 ? 's' : ''} renseignée
            {descriptions.length > 1 ? 's' : ''}
          </Typography>
          <Stack spacing={2}>
            <TextBlock label="Titre court" value={mainDesc?.headline} />
            <TextBlock label="Présentation" value={mainDesc?.value} />
          </Stack>
        </Box>

        <Box sx={cardSx}>
          <Stack
            direction="row"
            sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 1, mb: 1.5 }}
          >
            <Typography sx={{ fontWeight: 750, fontSize: 15, color: T.ink }}>
              Photos du {isMulti ? 'bâtiment' : 'logement'}
            </Typography>
            <Typography sx={{ fontFamily: T.mono, fontSize: 12.5, fontWeight: 800, color: T.ink2 }}>
              {buildingImages.length}
            </Typography>
          </Stack>
          {buildingImages.length ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {buildingImages.slice(0, 24).map((img, i) => (
                <Thumb key={`${img.url}-${i}`} img={img} />
              ))}
            </Box>
          ) : (
            <Typography sx={{ fontSize: 12.5, color: T.ink4, fontStyle: 'italic' }}>
              Aucune photo.
            </Typography>
          )}
        </Box>
      </Box>

      {/* ── Contenu par TYPE (Multi seulement) ── */}
      {isMulti && structure.roomTypes.length ? (
        <Box sx={cardSx}>
          <Typography sx={{ fontWeight: 750, fontSize: 15, color: T.ink, mb: 1.25 }}>
            Contenu propre à un type
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

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
              gap: 2.5,
              alignItems: 'start',
            }}
          >
            <Box>
              <TextBlock label="Texte de ce type" value={rtDesc?.value} />
              {/* La règle de composition, montrée sur le cas réel affiché. */}
              <Box
                sx={{
                  mt: 1.5,
                  p: 1.25,
                  bgcolor: T.bg2,
                  borderRadius: '8px',
                  border: `1px solid ${T.line}`,
                }}
              >
                <Typography sx={{ ...kickerSx, fontSize: 9, mb: 0.4 }}>
                  Ce que recevra Airbnb pour {rtStruct?.otaDisplayName || rtStruct?.name}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.6 }}>
                  {rtDesc?.value?.trim() ? (
                    <>
                      le texte de ce type — <b>et non celui du bâtiment</b>, qui sera remplacé.
                    </>
                  ) : (
                    <>
                      le texte du bâtiment, faute de texte propre à ce type.
                    </>
                  )}
                </Typography>
              </Box>
            </Box>

            <Box>
              <Stack
                direction="row"
                sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 1, mb: 1 }}
              >
                <Typography sx={{ ...kickerSx, fontSize: 9.5 }}>Photos de l'annonce</Typography>
                <Typography sx={{ fontFamily: T.mono, fontSize: 12, fontWeight: 800, color: T.ok }}>
                  {rtImages.length + inheritedForType.length} publiée
                  {rtImages.length + inheritedForType.length > 1 ? 's' : ''}
                </Typography>
              </Stack>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {rtImages.map((img, i) => (
                  <Thumb key={`own-${img.url}-${i}`} img={img} />
                ))}
                {inheritedForType.slice(0, 12).map((img, i) => (
                  <Thumb key={`inh-${img.url}-${i}`} img={img} inherited />
                ))}
              </Box>
              {!rtImages.length && !inheritedForType.length ? (
                <Typography sx={{ fontSize: 12.5, color: T.err, fontStyle: 'italic' }}>
                  Aucune photo ne partira dans l'annonce de ce type.
                </Typography>
              ) : null}
            </Box>
          </Box>
        </Box>
      ) : null}

      {/* Les falaises, nommées — un hôtelier doit savoir avant de saisir. */}
      {isMulti ? (
        <Box
          sx={{
            border: `1px solid ${T.err}`,
            bgcolor: T.errBg,
            borderRadius: `${T.radius}px`,
            p: 1.5,
            fontSize: 12.5,
            color: T.ink,
            lineHeight: 1.7,
          }}
        >
          <b>À savoir avant d'écrire un texte sur un type.</b> Aujourd'hui, dès qu'un type reçoit
          sa propre description, elle <b>remplace</b> celle du bâtiment dans l'annonce publiée —
          le quartier, les règles et l'accès disparaissent. Même effet pour les photos : une seule
          photo propre à un type retire les photos héritées du bâtiment.
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
        Affichage seul pour l'instant : l'édition des textes et des photos se fait encore dans
        l'ancien formulaire (onglets Infos bâtiment et Photos).
      </Box>
    </Stack>
  );
}
