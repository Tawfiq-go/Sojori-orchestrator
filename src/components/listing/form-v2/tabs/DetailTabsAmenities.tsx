/**
 * Onglet Équipements — UI Claude Design branchée sur srv-listing.
 */
import { useCallback, useMemo } from 'react';
import { Box } from '@mui/material';
import AmenitiesTabUi from '../../amenities/AmenitiesTab';
import { useSojoriAmenitiesData } from '../../amenities/useSojoriAmenitiesData';
import type { Amenity, SelectedAmenity } from '../../amenities/_tokens';

interface ListingAmenityRow {
  _id: string;
  count: number;
  amenityData?: {
    name?: string | { fr?: string; en?: string };
    compositionRooms?: Array<{ roomId?: string | number }>;
    iconUrl?: string;
    basic?: boolean;
    SojoriSubcategory?: unknown[];
  };
}

interface AmenitiesTabProps {
  values: {
    listingAmenitiesIds?: ListingAmenityRow[];
    propertyUnit?: string;
  };
  onChange: (field: string, value: unknown) => void;
  listingId?: string;
}

function toSelected(items: ListingAmenityRow[] | undefined): SelectedAmenity[] {
  return (items ?? []).map((item) => ({
    _id: String(item._id),
    count: Math.max(1, Number(item.count) || 1),
    roomRentalIds: (item.amenityData?.compositionRooms ?? [])
      .map((r) => String(r.roomId ?? ''))
      .filter(Boolean),
  }));
}

function toListingRows(next: SelectedAmenity[], catalogById: Map<string, Amenity>): ListingAmenityRow[] {
  return next.map((s) => {
    const am = catalogById.get(s._id);
    return {
      _id: s._id,
      count: s.count,
      amenityData: am
        ? {
            name: { fr: am.nameFr, en: am.nameEn },
            iconUrl: am.iconUrl,
            basic: am.basic,
            SojoriSubcategory: am.categories.map((c) => ({ fr: c })),
            compositionRooms: (s.roomRentalIds ?? []).map((roomId) => ({ roomId })),
          }
        : undefined,
    };
  });
}

export default function AmenitiesTab({ values, onChange, listingId = '' }: AmenitiesTabProps) {
  const { catalog, catalogById, rooms, loading } = useSojoriAmenitiesData(listingId);

  const selected = useMemo(() => toSelected(values.listingAmenitiesIds), [values.listingAmenitiesIds]);

  const propertyUnit = values.propertyUnit === 'Single' ? 'Single' : 'Multi';

  const handleChange = useCallback(
    (next: SelectedAmenity[]) => {
      onChange('listingAmenitiesIds', toListingRows(next, catalogById));
    },
    [onChange, catalogById],
  );

  if (!listingId) {
    return (
      <Box sx={{ p: 2, color: 'text.secondary', fontSize: 13 }}>
        Enregistrez le listing avant de configurer les équipements.
      </Box>
    );
  }

  return (
    <AmenitiesTabUi
      catalog={catalog}
      rooms={rooms}
      value={selected}
      onChange={handleChange}
      propertyUnit={propertyUnit}
      loading={loading}
    />
  );
}
