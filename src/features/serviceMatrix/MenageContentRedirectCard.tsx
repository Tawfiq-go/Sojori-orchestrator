// Contenu ménage dans l'orchestration (éditeur en place) ; renvoi seulement en template.
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { V3 } from '../orchestrationListingV3/theme';
import ListingMenageTab from '../../components/listing/form-v2/tabs/ListingMenageTab';

type Props = {
  /** Listing courant — absent en mode template propriétaire. */
  listingId?: string;
  /** Template owner : pas de listing à ouvrir. */
  templateMode?: boolean;
};

export default function MenageContentRedirectCard({ listingId, templateMode = false }: Props) {
  const navigate = useNavigate();
  const canNavigate = !templateMode && Boolean(listingId);

  // Décision Tawfiq 2026-09-08 : l'orchestration se configure dans l'orchestration.
  // Dès qu'un listing est connu, le contenu ménage (types, cadence par type de
  // chambre, équipe, barème) s'édite ici même ; le renvoi ne reste que pour le
  // template propriétaire, qui n'a pas de listing.
  if (canNavigate) {
    return <ListingMenageTab listingId={String(listingId)} embedded />;
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
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: V3.t }}>
          Le contenu du ménage se configure sur chaque listing
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: V3.t3, lineHeight: 1.4 }}>
          Durées, prix, niveaux, linge et règles FdM
          {templateMode ? ' — dans l’orchestration de chaque listing.' : '.'}
          {' '}Ici : uniquement les activations (Gérer · Client · Tâche · Orchestrer).
        </Typography>
      </Box>
      {canNavigate ? (
        <Button
          size="small"
          variant="outlined"
          onClick={() => navigate(`/listings/${listingId}?level=detail&tab=menage`)}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            fontSize: 12,
            borderColor: V3.p,
            color: V3.pd,
            '&:hover': { borderColor: V3.pd, bgcolor: V3.pt },
          }}
        >
          Ouvrir l&apos;onglet Ménage
        </Button>
      ) : null}
    </Box>
  );
}
