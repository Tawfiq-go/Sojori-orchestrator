import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { V3 } from '../orchestrationListingV3/theme';

type Props = {
  listingId?: string;
  templateMode?: boolean;
};

export default function DocumentsContentRedirectCard({ listingId, templateMode = false }: Props) {
  const navigate = useNavigate();
  const canNavigate = !templateMode && Boolean(listingId);

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
          Fiche de police et contrats se configurent dans l&apos;onglet Documents du listing
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: V3.t3, lineHeight: 1.4 }}>
          Nom, titre, contenu, champs (pièce / résa / les deux) et signature web
          {templateMode ? ' — dans l’onglet Documents de chaque listing.' : '.'}
          {' '}Ici : uniquement les activations (Gérer · Client · Tâche · Orchestrer) et le
          verrou pré-arrivée.
        </Typography>
      </Box>
      {canNavigate ? (
        <Button
          size="small"
          variant="outlined"
          onClick={() => navigate(`/listings/${listingId}?level=detail&tab=documents`)}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            fontSize: 12,
            borderColor: V3.p,
            color: V3.pd,
            '&:hover': { borderColor: V3.pd, bgcolor: V3.pt },
          }}
        >
          Ouvrir l&apos;onglet Documents
        </Button>
      ) : null}
    </Box>
  );
}
