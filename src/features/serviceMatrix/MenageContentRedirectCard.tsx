// Contenu ménage dans l'orchestration (éditeur en place) ; rappel seulement en template.
import { Box, Typography } from '@mui/material';
import { V3 } from '../orchestrationListingV3/theme';
import ListingMenageTab, {
  type MenageEditorFocus,
} from '../../components/listing/form-v2/tabs/ListingMenageTab';

type Props = {
  /** Listing courant — absent en mode template propriétaire. */
  listingId?: string;
  /** Template owner : pas de listing à ouvrir. */
  templateMode?: boolean;
  /** Focused slice for capability rows (stay / paid / checkout). */
  focus?: MenageEditorFocus;
};

const TEMPLATE_COPY: Record<
  MenageEditorFocus,
  { title: string; body: string }
> = {
  all: {
    title: 'Le contenu du ménage se configure sur chaque listing',
    body: 'Durées, prix, niveaux, linge et règles FdM',
  },
  stay: {
    title: 'Le ménage séjour (Recouche) se configure sur chaque listing',
    body: 'Cadence, paliers, durées / prix Recouche',
  },
  paid: {
    title: 'Le ménage payant se configure sur chaque listing',
    body: 'Durées / prix À la demande',
  },
  checkout: {
    title: 'Le ménage checkout se configure sur chaque listing',
    body: 'Durées / prix À blanc et déclenchement après checkout',
  },
};

export default function MenageContentRedirectCard({
  listingId,
  templateMode = false,
  focus = 'all',
}: Props) {
  const canNavigate = !templateMode && Boolean(listingId);
  const copy = TEMPLATE_COPY[focus] ?? TEMPLATE_COPY.all;

  // Décision Tawfiq 2026-09-08 : l'orchestration se configure dans l'orchestration.
  // Dès qu'un listing est connu, le contenu ménage s'édite ici même ; le rappel
  // ne reste que pour le template propriétaire, qui n'a pas de listing.
  if (canNavigate) {
    return <ListingMenageTab listingId={String(listingId)} embedded focus={focus} />;
  }

  return (
    <Box
      sx={{
        border: `1px dashed ${V3.bs}`,
        borderRadius: '12px',
        bgcolor: V3.alt,
        px: 2,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
      }}
    >
      <Typography sx={{ fontSize: 18, lineHeight: 1 }}>🧹</Typography>
      <Box sx={{ flex: 1, minWidth: 220 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: V3.t }}>{copy.title}</Typography>
        <Typography sx={{ fontSize: 11.5, color: V3.t3, lineHeight: 1.4 }}>
          {copy.body}
          {templateMode ? ' — dans l’orchestration de chaque listing.' : '.'}
          {' '}Ici : uniquement les activations (Gérer · Client · Tâche · Orchestrer).
        </Typography>
      </Box>
    </Box>
  );
}
