import { useMemo } from 'react';
import { listingsService } from '../../../services/listingsService';
import { mapAmenityFromApi, mapCompositionRoom } from './mapAmenityFromApi';
import { useAmenitiesData } from './useAmenitiesData';
import type { CategoryName } from './_tokens';

function filterCatalogItems(
  items: ReturnType<typeof mapAmenityFromApi>[],
  params: {
    categories?: CategoryName[];
    roomIds?: string[];
    basic?: boolean;
    search_text?: string;
    limit?: number;
  },
) {
  let out = items;
  if (params.basic) out = out.filter((a) => a.basic);
  if (params.search_text?.trim()) {
    const q = params.search_text.trim().toLowerCase();
    out = out.filter(
      (a) => a.nameFr.toLowerCase().includes(q) || a.nameEn.toLowerCase().includes(q),
    );
  }
  if (params.categories?.length) {
    const set = new Set(params.categories);
    out = out.filter((a) => a.categories.some((c) => set.has(c as CategoryName)));
  }
  if (params.roomIds?.length) {
    const roomSet = new Set(params.roomIds.map(String));
    out = out.filter(
      (a) =>
        a.compositionRoomIds.length === 0 ||
        a.compositionRoomIds.some((id) => roomSet.has(String(id))),
    );
  }
  if (params.limit && params.limit > 0) {
    out = out.slice(0, params.limit);
  }
  return out;
}

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
        const catalog = await listingsService.getListingCatalogForPm();
        if (catalog.categories.length > 0) {
          let items = catalog.categories.flatMap((cat) =>
            cat.amenities.map((row) =>
              mapAmenityFromApi({
                ...row,
                categoryFr: cat.nameFr,
                SojoriSubcategory: [{ fr: cat.nameFr, en: cat.nameEn }],
              }),
            ),
          );
          items = filterCatalogItems(items, params);
          return { items, total: items.length };
        }

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
        const catalog = await listingsService.getListingCatalogForPm();
        if (catalog.categories.length > 0) {
          return catalog.categories.map((c) => c.nameFr) as CategoryName[];
        }
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
