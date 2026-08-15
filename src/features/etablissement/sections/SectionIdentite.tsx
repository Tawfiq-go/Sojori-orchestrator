/**
 * SECTION 1 — IDENTITÉ : ce que l'établissement EST.
 *
 * Lecture seule pour l'instant : l'écriture passera par une route dédiée.
 * Tant qu'elle n'existe pas, on AFFICHE la vérité de la base plutôt que de
 * proposer des champs qui ne sauvegarderaient rien — c'est exactement le
 * piège du formulaire legacy (mairie, référent admin, enregistrement police :
 * saisissables, jamais persistés).
 */
import { Box, Stack, Typography } from '@mui/material';
import type { ListingStructure } from '../../../types/listings.types';
import listingsService from '../../../services/listingsService';
import EditableField from '../EditableField';
import { T, cardSx, kickerSx } from '../tokens';

type Props = { structure: ListingStructure; onChanged?: () => void };

export default function SectionIdentite({ structure, onChanged }: Props) {
  const b = structure.building;
  const isMulti = b.propertyUnit === 'Multi';

  /**
   * Fabrique le gestionnaire d'un champ du bâtiment.
   * `place` côté base = « quartier » à l'écran : on garde le nom réel du champ
   * ici pour que la whitelist serveur reconnaisse la clé.
   */
  const save = (field: string) => async (next: string) => {
    const r = await listingsService.patchListingConfiguration(b.id, {
      building: { [field]: next },
    });
    if (r.success) onChanged?.();
    return r.success;
  };

  return (
    <Stack spacing={1.75}>
      {/* Deux cartes côte à côte sur grand écran : l'identité est courte, la
          laisser seule sur 1800px de large donne un écran vide. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          gap: 1.75,
          alignItems: 'start',
        }}
      >
        <Box sx={cardSx}>
          <Typography sx={{ fontWeight: 750, fontSize: 15, color: T.ink, mb: 0.25 }}>
            L'établissement
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.ink3, mb: 2 }}>
            {isMulti
              ? "Le bâtiment : ce qui est vrai pour tout l'établissement."
              : 'Le logement dans son ensemble.'}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', xl: 'repeat(3, 1fr)' },
              gap: 2.5,
            }}
          >
            <EditableField label="Nom" value={b.name} onSave={save('name')} />
            <EditableField
              label="Nom interne"
              value={b.nickname}
              placeholder="non renseigné — usage interne"
              onSave={save('nickname')}
            />
            <EditableField
              label="Type d'établissement"
              value={b.propertyType}
              onSave={save('propertyType')}
            />
            <EditableField label="Ville" value={b.city} onSave={save('city')} />
            <EditableField label="Quartier" value={b.district} onSave={save('place')} />
            <EditableField label="Adresse" value={b.address} onSave={save('address')} />
          </Box>
        </Box>

        <Box sx={cardSx}>
          <Typography sx={{ fontWeight: 750, fontSize: 15, color: T.ink, mb: 2 }}>
            État
          </Typography>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ ...kickerSx, fontSize: 9.5, mb: 0.4 }}>Publication</Typography>
              <Box
                component="span"
                sx={{
                  display: 'inline-block',
                  px: 1,
                  py: 0.35,
                  borderRadius: '999px',
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: b.active ? T.ok : T.ink3,
                  bgcolor: b.active ? T.okBg : T.bg3,
                  border: `1px solid ${b.active ? T.ok : T.line}`,
                }}
              >
                {b.active ? '● Actif' : '○ Inactif'}
              </Box>
            </Box>
            <Box>
              <Typography sx={{ ...kickerSx, fontSize: 9.5, mb: 0.4 }}>Modèle</Typography>
              <Typography sx={{ fontSize: 13.5, color: T.ink, lineHeight: 1.5 }}>
                {isMulti
                  ? `${structure.totals.roomTypes} type(s) de chambre · ${structure.totals.physicalRooms} chambre(s)`
                  : 'Un logement, une unité de vente'}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Ce qui manque encore ici est nommé, pas caché — voir §6 Autres. */}
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
        Propriétaire, contacts, autorisation d'exploitation, taxe de séjour et devise ne sont
        pas encore repris ici — ils restent accessibles dans la section <b>Autres</b> et dans
        l'ancien formulaire.
      </Box>
    </Stack>
  );
}
