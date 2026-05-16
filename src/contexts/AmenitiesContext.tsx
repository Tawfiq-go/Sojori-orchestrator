import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { listingsService } from '../services/listingsService';

interface Amenity {
  _id: string;
  name: string | { en?: string; fr?: string; ar?: string };
  iconUrl?: string;
  compositionRooms?: Array<{
    roomId: string;
    roomType: string;
  }>;
  SojoriSubcategory?: string[];
  basic?: boolean;
  category?: string;
}

interface RoomComposition {
  rooms: Array<{
    rentalId: string;
    roomName: string;
    RoomNameSojori?: { en?: string; fr?: string; ar?: string };
    enable: boolean;
    instancesCount?: number;
  }>;
}

interface AmenitiesFetchResult {
  success: boolean;
  data: Amenity[];
  total: number;
}

interface AmenitiesContextType {
  fetchAmenities: (
    page: number,
    limit: number,
    useBed: boolean,
    searchQuery?: string,
    categories?: string[],
    roomIds?: Array<string | number>,
  ) => Promise<AmenitiesFetchResult>;
  fetchRoomComposition: () => Promise<RoomComposition | null>;
  getAmenitiesByIds: (ids: string[], listingId?: string) => Promise<Amenity[]>;
  getPredefinedCategories: () => Promise<string[]>;
  loading: boolean;
  cache: Map<string, any>;
}

const AmenitiesContext = createContext<AmenitiesContextType | undefined>(undefined);

export function AmenitiesProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(false);
  const [cache] = useState(new Map<string, any>());

  const fetchAmenities = useCallback(
    async (
      page: number,
      limit: number,
      _useBed: boolean,
      searchQuery?: string,
      categories?: string[],
      roomIds?: Array<string | number>,
    ): Promise<AmenitiesFetchResult> => {
      try {
        setLoading(true);
        const result = await listingsService.getAmenitiesCatalogPage({
          page,
          limit,
          searchText: searchQuery,
          categories,
          roomIds,
          paged: true,
        });

        return {
          success: true,
          data: result.items as unknown as Amenity[],
          total: result.total,
        };
      } catch (error) {
        console.error('Error fetching amenities:', error);
        return {
          success: false,
          data: [],
          total: 0,
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchRoomComposition = useCallback(async (): Promise<RoomComposition | null> => {
    const cacheKey = 'room-composition-global';
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const result = await listingsService.getRoomComposition();
    if (result) {
      cache.set(cacheKey, result);
    }
    return result;
  }, [cache]);

  const getAmenitiesByIds = useCallback(
    async (ids: string[], listingId?: string): Promise<Amenity[]> => {
      if (ids.length === 0) return [];

      const cacheKey = `amenities-${listingId || 'none'}-${ids.sort().join(',')}`;
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }

      const result = await listingsService.getAmenitiesByIds(ids, listingId);
      const typed = result as unknown as Amenity[];
      cache.set(cacheKey, typed);
      return typed;
    },
    [cache],
  );

  const getPredefinedCategories = useCallback(async (): Promise<string[]> => {
    const cacheKey = 'predefined-categories';
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    try {
      const categories = await listingsService.getPredefinedCategories();
      cache.set(cacheKey, categories);
      return categories;
    } catch (error) {
      console.error('Error fetching predefined categories:', error);
      return ['All Categories', 'Basic'];
    }
  }, [cache]);

  const value: AmenitiesContextType = {
    fetchAmenities,
    fetchRoomComposition,
    getAmenitiesByIds,
    getPredefinedCategories,
    loading,
    cache,
  };

  return (
    <AmenitiesContext.Provider value={value}>
      {children}
    </AmenitiesContext.Provider>
  );
}

export function useAmenities() {
  const context = useContext(AmenitiesContext);
  if (context === undefined) {
    throw new Error('useAmenities must be used within an AmenitiesProvider');
  }
  return context;
}
