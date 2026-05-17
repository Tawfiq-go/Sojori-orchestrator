import { createContext, useContext } from 'react';

/** Listing structure admin (GET /listing-structure) — badges R / * sur les champs. */
export const ListingFormStructureContext = createContext(null);

export function useListingFormStructure() {
  return useContext(ListingFormStructureContext);
}
