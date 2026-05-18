// ════════════════════════════════════════════════════════════════════
// useAmenitiesData.ts — hook React Query / SWR-style pour brancher
// les APIs Sojori. Adaptable à ton SWR/React Query existant.
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ALL_CATEGORIES } from './_tokens';
import type { Amenity, CategoryName, CompositionRoom } from './_tokens';

export interface UseAmenitiesDataParams {
  listingId: string;
  /** Adapter / branche tes services existants */
  services: {
    fetchAmenities: (params: {
      categories?: CategoryName[];
      roomIds?: string[];
      basic?: boolean;
      search_text?: string;
      page?: number;
      limit?: number;
    }) => Promise<{ items: Amenity[]; total: number }>;
    fetchCategories: () => Promise<CategoryName[]>;
    fetchCompositionRooms: (listingId: string) => Promise<CompositionRoom[]>;
  };
}

export function useAmenitiesData({ listingId, services }: UseAmenitiesDataParams) {
  const [catalog, setCatalog] = useState<Amenity[]>([]);
  const [categories, setCategories] = useState<CategoryName[]>(ALL_CATEGORIES);
  const [rooms, setRooms] = useState<CompositionRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [a, c, r] = await Promise.all([
          services.fetchAmenities({ limit: 500 }),
          services.fetchCategories().catch(() => ALL_CATEGORIES),
          services.fetchCompositionRooms(listingId).catch(() => []),
        ]);
        if (!cancelled) {
          setCatalog(a.items);
          setCategories(c);
          setRooms(r);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [listingId, services]);

  // Indexes pratiques
  const catalogById = useMemo(() => {
    const m = new Map<string, Amenity>();
    catalog.forEach(a => m.set(a._id, a));
    return m;
  }, [catalog]);

  const roomNamesByRentalId = useMemo(() => {
    const m = new Map<string, string>();
    rooms.forEach(r => m.set(r.rentalId, r.nameFr || r.roomName));
    return m;
  }, [rooms]);

  // Filtrage / recherche
  const filter = useCallback((
    items: Amenity[],
    { search, basicOnly, category, hideUseBed = true }: {
      search?: string; basicOnly?: boolean; category?: CategoryName | 'all' | 'basic'; hideUseBed?: boolean;
    }
  ) => {
    let out = items;
    if (hideUseBed) out = out.filter(a => !a.useBed);     // useBed → flux séparé
    if (basicOnly) out = out.filter(a => a.basic);
    if (category && category !== 'all' && category !== 'basic') {
      out = out.filter(a => a.categories.includes(category as CategoryName));
    }
    if (category === 'basic') out = out.filter(a => a.basic);
    if (search) {
      const q = search.toLowerCase();
      out = out.filter(a => a.nameFr.toLowerCase().includes(q) || a.nameEn.toLowerCase().includes(q));
    }
    return out;
  }, []);

  return { catalog, catalogById, categories, rooms, roomNamesByRentalId, loading, filter };
}
