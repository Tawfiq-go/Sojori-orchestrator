import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { resolveRuImportedFields } from '../../../utils/resolveRuImportedFields';

const ListingFormImportedContext = createContext<Set<string>>(new Set());

export function ListingFormImportedProvider({
  listingRaw,
  children,
}: {
  listingRaw: Record<string, unknown> | null | undefined;
  children: ReactNode;
}) {
  const fields = useMemo(() => resolveRuImportedFields(listingRaw ?? undefined), [listingRaw]);
  return (
    <ListingFormImportedContext.Provider value={fields}>{children}</ListingFormImportedContext.Provider>
  );
}

export function useRuImportedFields(): Set<string> {
  return useContext(ListingFormImportedContext);
}

export function useIsRuImportedField(field: string | undefined): boolean {
  const set = useRuImportedFields();
  if (!field) return false;
  return set.has(field);
}
