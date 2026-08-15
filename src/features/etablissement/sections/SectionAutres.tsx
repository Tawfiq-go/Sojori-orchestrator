/**
 * SECTION 6 — AUTRES : le bac de récupération, assumé.
 *
 * ⚠️ RAISON D'ÊTRE (agent futur, ne supprime pas cette section « pour faire
 * propre ») : l'ancien formulaire (components/listing/form-v2, 12 onglets)
 * porte des dizaines de réglages que les 5 premières sections ne reprennent
 * pas encore. Les faire disparaître de l'écran donnerait l'illusion d'une
 * refonte terminée et ferait perdre des réglages en production.
 *
 * Cette section les NOMME tous, dit où ils vivent aujourd'hui, et distingue
 * ce qui relève du propriétaire de ce qui relève de l'administrateur.
 * Elle rétrécit à mesure que les autres sections absorbent ses lignes.
 *
 * ⚠️ Quatre champs sont marqués « non sauvegardé » : ils sont saisissables
 * dans l'ancien formulaire mais ne sont PAS persistés (vérifié dans
 * l'adaptateur d'API). Ne les présente jamais comme fonctionnels.
 */
import { Box, Stack, Typography } from '@mui/material';
import type { ListingStructure } from '../../../types/listings.types';
import { T, cardSx, kickerSx } from '../tokens';

type Props = { structure: ListingStructure };

type Entry = {
  label: string;
  where: string;
  /** true = réglage administrateur (pas exposé au propriétaire). */
  admin?: boolean;
  /** true = saisissable mais JAMAIS persisté dans l'ancien formulaire. */
  broken?: boolean;
};

const GROUPS: Array<{ title: string; hint: string; items: Entry[] }> = [
  {
    title: 'Conditions commerciales',
    hint: "ce qui engage l'argent — et déclenche les litiges",
    items: [
      { label: 'Frais de ménage', where: 'Fees & Deposits' },
      { label: 'Arrhes / acompte', where: 'Fees & Deposits' },
      { label: 'Caution', where: 'Fees & Deposits' },
      { label: "Politique d'annulation", where: 'Fees & Deposits' },
      { label: 'Moyens de paiement acceptés', where: 'Direct booking' },
      { label: 'Taxe de séjour', where: 'Fees & Deposits' },
      { label: 'Devise de vente', where: 'Config Rooms', admin: true },
    ],
  },
  {
    title: 'Règles de séjour',
    hint: 'attendu par les canaux sous forme structurée, pas en texte libre',
    items: [
      { label: "Horaires d'arrivée et de départ", where: 'Disponibilité & séjour' },
      { label: 'Séjour minimum et maximum', where: 'Disponibilité & séjour' },
      { label: 'Préavis de réservation', where: 'Disponibilité & séjour' },
      { label: 'Animaux admis', where: 'Disponibilité & séjour' },
      { label: 'Enfants admis', where: 'Disponibilité & séjour' },
      { label: 'Fumeurs', where: 'Disponibilité & séjour' },
      { label: 'Événements et fêtes', where: 'Disponibilité & séjour' },
      { label: 'Réservation instantanée', where: 'Disponibilité & séjour' },
    ],
  },
  {
    title: 'Administratif',
    hint: "obligations légales et rattachement de l'établissement",
    items: [
      { label: "Autorisation d'exploitation", where: 'License' },
      { label: 'Commune de rattachement', where: 'License', broken: true },
      { label: 'Référent administratif', where: 'License', broken: true },
      { label: 'Enregistrement des voyageurs', where: 'License', broken: true },
      { label: 'Propriétaire', where: 'Direct booking · OTA' },
    ],
  },
  {
    title: 'Distribution et diffusion',
    hint: 'où le bien est visible, et par quel chemin',
    items: [
      { label: 'Visibilité par canal Sojori', where: 'Direct booking' },
      { label: 'Remises par canal', where: 'Direct booking' },
      { label: 'Remises long séjour et dernière minute', where: 'Config Rooms' },
      { label: 'Connexion au channel manager', where: 'OTA', admin: true },
      { label: "Trace d'import externe", where: 'Trace import RU', admin: true },
      { label: 'Ordre des photos Airbnb', where: 'Photos', broken: true },
    ],
  },
  {
    title: 'Services annexes',
    hint: 'ce qui se vend en plus de la nuitée',
    items: [{ label: 'Expériences et prestations', where: 'Expériences' }],
  },
];

function Row({ e }: { e: Entry }) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 1,
        py: 0.6,
        borderBottom: `1px solid ${T.line}`,
        flexWrap: 'wrap',
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 13, color: T.ink }}>{e.label}</Typography>
        {e.admin ? (
          <Box
            component="span"
            sx={{
              px: 0.6,
              py: 0.1,
              borderRadius: '999px',
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.4px',
              color: T.info,
              bgcolor: T.infoBg,
              border: `1px solid ${T.info}`,
            }}
          >
            ADMIN
          </Box>
        ) : null}
        {e.broken ? (
          <Box
            component="span"
            sx={{
              px: 0.6,
              py: 0.1,
              borderRadius: '999px',
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.4px',
              color: T.err,
              bgcolor: T.errBg,
              border: `1px solid ${T.err}`,
            }}
          >
            NON SAUVEGARDÉ
          </Box>
        ) : null}
      </Stack>
      <Typography sx={{ fontSize: 11.5, color: T.ink3, fontFamily: T.mono }}>{e.where}</Typography>
    </Stack>
  );
}

export default function SectionAutres({ structure }: Props) {
  const total = GROUPS.reduce((s, g) => s + g.items.length, 0);
  const broken = GROUPS.flatMap((g) => g.items).filter((e) => e.broken).length;

  return (
    <Stack spacing={1.75}>
      <Box sx={cardSx}>
        <Typography sx={{ fontWeight: 750, fontSize: 15, color: T.ink, mb: 0.5 }}>
          Ce qui n'est pas encore repris ici
        </Typography>
        <Typography sx={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.6 }}>
          {total} réglages vivent encore dans l'ancien formulaire. Ils sont listés ici avec leur
          emplacement actuel — cette section rétrécira à mesure qu'ils seront repris dans les
          sections précédentes.
        </Typography>
      </Box>

      {broken > 0 ? (
        <Box
          sx={{
            border: `1px solid ${T.err}`,
            bgcolor: T.errBg,
            borderRadius: `${T.radius}px`,
            p: 1.5,
            fontSize: 12.5,
            color: T.ink,
            lineHeight: 1.6,
          }}
        >
          <b>{broken} réglages sont saisissables mais ne sont pas enregistrés</b> dans l'ancien
          formulaire : ce qui y est tapé est perdu au rechargement. Ils sont marqués ci-dessous.
        </Box>
      ) : null}

      {/* Cinq groupes de longueurs inégales : `auto-fill` les répartit sans
          laisser de colonne vide, et chacun reste lisible (≥ 420px). */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fill, minmax(420px, 1fr))' },
          gap: 1.75,
          alignItems: 'start',
        }}
      >
        {GROUPS.map((g) => (
          <Box key={g.title} sx={cardSx}>
            <Typography sx={{ fontWeight: 750, fontSize: 14, color: T.ink }}>{g.title}</Typography>
            <Typography sx={{ fontSize: 11.5, color: T.ink3, mb: 1 }}>{g.hint}</Typography>
            {g.items.map((e) => (
              <Row key={e.label} e={e} />
            ))}
          </Box>
        ))}
      </Box>

      <Typography sx={{ fontSize: 11.5, color: T.ink4, textAlign: 'center' }}>
        Établissement {structure.building.propertyUnit === 'Multi' ? 'multi-unités' : 'à unité unique'}
      </Typography>
    </Stack>
  );
}
