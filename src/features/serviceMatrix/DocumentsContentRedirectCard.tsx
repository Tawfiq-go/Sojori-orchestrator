// Contenu documents dans l'orchestration (éditeur en place) ; rappel seulement en template.
import { Box, Typography } from '@mui/material';
import { V3 } from '../orchestrationListingV3/theme';
import ListingDocumentsTab from '../../components/listing/form-v2/tabs/ListingDocumentsTab';

type Props = {
  /** Listing courant — absent en mode template propriétaire. */
  listingId?: string;
  /** Template owner : pas de listing à ouvrir. */
  templateMode?: boolean;
};

export default function DocumentsContentRedirectCard({ listingId, templateMode = false }: Props) {
  const canNavigate = !templateMode && Boolean(listingId);

  // Décision Tawfiq 2026-09-08 : l'orchestration se configure dans l'orchestration.
  // Dès qu'un listing est connu, fiche de police et contrats s'éditent ici même ;
  // le rappel ne reste que pour le template propriétaire, qui n'a pas de listing.
  if (canNavigate) {
    return <ListingDocumentsTab listingId={String(listingId)} embedded />;
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
      <Typography sx={{ fontSize: 18, lineHeight: 1 }}>📄</Typography>
      <Box sx={{ flex: 1, minWidth: 220 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: V3.t }}>
          Fiche de police et contrats se configurent sur chaque listing
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: V3.t3, lineHeight: 1.4 }}>
          Nom, titre, contenu, champs et signature web
          {templateMode ? ' — dans l’orchestration de chaque listing.' : '.'}
          {' '}Ici : uniquement les activations (Gérer · Client · Tâche · Orchestrer) et la
          politique d’enregistrement du modèle.
        </Typography>
      </Box>
    </Box>
  );
}
