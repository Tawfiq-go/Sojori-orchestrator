import { useMemo } from 'react';
import { listingsService } from '../../../services/listingsService';
import { mapAmenityFromApi, mapCompositionRoom } from './mapAmenityFromApi';
import { useAmenitiesData } from './useAmenitiesData';
import type { CategoryName } from './_tokens';

export function useSojoriAmenitiesData(listingId: string) {
  const services = useMemo(
    () => ({
      fetchAmenities: async (params: {
        categories?: CategoryName[];
        roomIds?: string[];
        basic?: boolean;
        search_text?: string;
        limit?: number;
      }) => {
        const result = await listingsService.getAmenitiesCatalogPage({
          page: 0,
          limit: params.limit ?? 500,
          paged: false,
          searchText: params.search_text,
          categories: params.categories,
          roomIds: params.roomIds,
        });
        return {
          items: result.items.map((row) => mapAmenityFromApi(row)),
          total: result.total,
        };
      },
      fetchCategories: async (): Promise<CategoryName[]> => {
        const cats = await listingsService.getPredefinedCategories();
        return cats.filter((c) => c && c !== 'All Categories' && c !== 'Basic') as CategoryName[];
      },
      fetchCompositionRooms: async () => {
        const doc = await listingsService.getRoomComposition();
        const rooms = (doc?.rooms ?? [])
          .map((r) => mapCompositionRoom(r as Record<string, unknown>))
          .filter((r): r is NonNullable<typeof r> => Boolean(r));
        return rooms.sort((a, b) => a.order - b.order);
      },
    }),
    [],
  );

  return useAmenitiesData({ listingId, services });
}
