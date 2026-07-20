import { useNavigate } from 'react-router-dom';
import { Button, Stack } from '@mui/material';
import ListingActiveAdminToggle from './ListingActiveAdminToggle';
import { isPersistedListingId } from '../../utils/listingId';

const btnGhost = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: 12,
  px: 1.5,
  py: 0.75,
  color: '#14110a',
  border: '1px solid rgba(20,17,10,0.12)',
  bgcolor: '#fff',
  borderRadius: 1,
  boxShadow: 'none',
  '&:hover': { bgcolor: '#fafaf7', borderColor: 'rgba(20,17,10,0.2)' },
};

/** Actions en tête du formulaire listing (retour liste, fiche catalogue, statut admin). */
export default function ListingFormHeaderActions({
  listingId,
  showListingActiveToggle = false,
  listingActive = true,
  onListingActiveChange,
}) {
  const navigate = useNavigate();
  const persisted = isPersistedListingId(listingId);

  return (
    <Stack
      direction="row"
      spacing={1}
      flexWrap="wrap"
      alignItems="center"
      justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
      sx={{ flexShrink: 0, minWidth: { sm: 200 } }}
    >
      <Button sx={btnGhost} onClick={() => navigate('/listings?tab=active')}>
        ← Annonces
      </Button>
      {persisted ? (
        <Button sx={btnGhost} onClick={() => navigate(`/catalogue/listings/${listingId}`)}>
          Voir fiche
        </Button>
      ) : null}
      {showListingActiveToggle ? (
        <ListingActiveAdminToggle
          listingId={listingId}
          active={listingActive}
          onActiveChange={onListingActiveChange}
        />
      ) : null}
    </Stack>
  );
}
