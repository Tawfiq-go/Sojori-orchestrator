import { useNavigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, FilterBar, FilterChip, ViewToggle, ListingsGrid, ListingCard,
  btnGhostSx, btnSmSx, btnPrimarySx,
} from '../components/dashboard/DashboardV2.components';
import { Button } from '@mui/material';

export function ListingsPage() {
  const navigate = useNavigate();

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Annonces']}>
      <PageHeader title="Annonces" count="42 actives">
        <ViewToggle
          options={[{value:'grid', label:'Grid'}, {value:'table', label:'Table'}, {value:'map', label:'Map'}]}
          value="grid"
        />
        <Button sx={{ ...btnGhostSx, ...btnSmSx }}>📥 Import OTA</Button>
        <Button sx={btnPrimarySx}>+ Nouvelle annonce</Button>
      </PageHeader>

      <FilterBar>
        <FilterChip label="Actives" active dropdown />
        <FilterChip label="Type" dropdown />
        <FilterChip label="Ville" dropdown />
        <FilterChip label="Performance" dropdown />
      </FilterBar>

      <ListingsGrid>
        <div onClick={() => navigate('/listings/villa-belvedere')}>
          <ListingCard photoColor="gold" name="Villa Belvédère" place="NICE · CÔTE D'AZUR · 4ch · 240m²"
            rating="4.92 · 47 avis" occupancy="87%" adr="€280" monthlyRev="€18k"
            channels={['airbnb', 'booking', 'vrbo', 'direct']} />
        </div>
        <div onClick={() => navigate('/listings/dar-sojori')}>
          <ListingCard photoColor="blue" name="Dar Sojori" place="MARRAKECH · MÉDINA · 6ch · riad"
            rating="4.85 · 32 avis" occupancy="92%" adr="€180" monthlyRev="€14k"
            channels={['airbnb', 'booking']} />
        </div>
        <div onClick={() => navigate('/listings/villa-atlas')}>
          <ListingCard photoColor="purple" name="Villa Atlas" place="MARRAKECH · PALMERAIE · 5ch · 320m²"
            rating="4.95 · 28 avis" occupancy="91%" adr="€420" monthlyRev="€22k"
            channels={['airbnb', 'booking', 'direct']} />
        </div>
        <ListingCard photoColor="green" name="Atlas Loft" place="MARRAKECH · GUÉLIZ · 2ch · 110m²"
          rating="4.78 · 19 avis" occupancy="78%" adr="€110" monthlyRev="€8k"
          channels={['airbnb']} />
        <ListingCard photoColor="pink" name="Médina House" place="MARRAKECH · MOUASSINE · 3ch · 145m²"
          rating="4.88 · 24 avis" occupancy="83%" adr="€145" monthlyRev="€11k"
          channels={['airbnb', 'booking', 'vrbo']} />
        <ListingCard photoColor="gold" draft name="Studio Côte Bleue" place="CALVI · CENTRE · 1ch · 45m² ✨ AI"
          draftAction={{ onClick: () => console.log('Finalize AI') }} />
      </ListingsGrid>
    </DashboardWrapper>
  );
}
