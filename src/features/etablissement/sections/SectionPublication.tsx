/**
 * SECTION 5 — PUBLICATION : ce que chaque canal reçoit réellement.
 *
 * Booking et Airbnb ont des modèles INCOMPATIBLES, et c'est ce qui explique
 * toute la complexité du contenu :
 *   · Booking pense HÔTEL     → le bâtiment + ses types, sur deux niveaux
 *   · Airbnb pense LOGEMENT   → N annonces autonomes, une par type, chacune
 *                                composant bâtiment + type
 * Le site direct et WhatsApp lisent la même source, avec leurs propres besoins
 * (WhatsApp veut « Villa 05 », pas un titre marketing).
 *
 * Lecture seule : activer un canal reste une manipulation dans le portail du
 * channel manager. On montre l'état, on ne prétend pas le piloter d'ici.
 */
import { Box, Stack, Typography } from '@mui/material';
import type { ListingStructure } from '../../../types/listings.types';
import { T, cardSx, kickerSx } from '../tokens';

type Props = { structure: ListingStructure };

export default function SectionPublication({ structure }: Props) {
  const { building, totals, roomTypes } = structure;
  const isMulti = building.propertyUnit === 'Multi';
  const published = roomTypes.filter((rt) => rt.rentalUnitedId);
  const emptyTypes = roomTypes.filter((rt) => rt.sellableRooms === 0);

  const CANALS = [
    {
      name: 'Booking.com',
      recipe: isMulti
        ? "pense hôtel : reçoit le bâtiment et ses types de chambre, sur deux niveaux"
        : 'reçoit le logement comme une annonce unique',
      preview: isMulti
        ? `${building.name} · ${totals.roomTypes} type${totals.roomTypes > 1 ? 's' : ''} de chambre`
        : building.name,
    },
    {
      name: 'Airbnb',
      recipe: isMulti
        ? 'pense logement entier : une annonce autonome par type, composant bâtiment + type'
        : 'reçoit le logement tel quel',
      preview: isMulti
        ? roomTypes
            .slice(0, 2)
            .map((rt) => `${rt.otaDisplayName || rt.name} — ${building.name}`)
            .join(' · ') + (roomTypes.length > 2 ? ' …' : '')
        : building.name,
    },
    {
      name: 'Site direct',
      recipe: 'aucune contrainte de format — la vitrine de la marque',
      preview: isMulti
        ? `Page établissement + ${totals.roomTypes} unité${totals.roomTypes > 1 ? 's' : ''}`
        : building.name,
    },
    {
      name: 'WhatsApp',
      recipe: "le nom court de l'unité, pas un titre marketing",
      preview: isMulti
        ? roomTypes.flatMap((rt) => rt.rooms.map((r) => r.name)).slice(0, 3).join(' · ') || '—'
        : building.name,
    },
  ];

  return (
    <Stack spacing={1.75}>
      {/* Ce qui bloque une publication saine, avant la liste des canaux. */}
      {emptyTypes.length ? (
        <Box
          sx={{
            border: `1px solid ${T.err}`,
            bgcolor: T.errBg,
            borderRadius: `${T.radius}px`,
            p: 1.5,
            fontSize: 13,
            color: T.ink,
            lineHeight: 1.6,
          }}
        >
          <b>
            {emptyTypes.length} type{emptyTypes.length > 1 ? 's' : ''} en vente sans aucune chambre
            assignable.
          </b>{' '}
          {emptyTypes.map((t) => t.otaDisplayName || t.name).join(', ')} — un client peut réserver
          ce qui ne peut pas être livré.
        </Box>
      ) : null}

      {isMulti ? (
        <Typography sx={{ ...kickerSx }}>
          {published.length} / {totals.roomTypes} type{totals.roomTypes > 1 ? 's' : ''} relié
          {published.length > 1 ? 's' : ''} au channel manager
        </Typography>
      ) : null}

      {/* Les 4 canaux se comparent — côte à côte, pas empilés. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(360px, 1fr))' },
          gap: 1.75,
          alignItems: 'start',
        }}
      >
        {CANALS.map((c) => (
          <Box key={c.name} sx={cardSx}>
            <Typography sx={{ fontWeight: 750, fontSize: 14.5, color: T.ink, mb: 0.25 }}>{c.name}</Typography>
            <Typography sx={{ fontSize: 12, color: T.ink3, mb: 1 }}>{c.recipe}</Typography>
            <Box sx={{ p: 1.1, bgcolor: T.bg2, borderRadius: '8px', border: `1px solid ${T.line}` }}>
              <Typography sx={{ ...kickerSx, fontSize: 9, mb: 0.25 }}>Ce qu'il reçoit</Typography>
              <Typography
                sx={{ fontSize: 12.5, color: T.ink, fontFamily: c.name === 'WhatsApp' ? T.mono : 'inherit' }}
              >
                {c.preview}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Stack>
  );
}
