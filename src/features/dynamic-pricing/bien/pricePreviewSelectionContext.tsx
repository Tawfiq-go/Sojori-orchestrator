import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ApplyPreviewDiffRowDto } from '../../../services/dynamicPricingApi';

export type PricePreviewSelectionContextValue = {
  selectedDates: Set<string>;
  toggleDate: (date: string, isFree: boolean) => void;
  toggleAllFree: (freeDates: string[]) => void;
  clearSelection: () => void;
  previewRows: ApplyPreviewDiffRowDto[];
  setPreviewRows: (rows: ApplyPreviewDiffRowDto[]) => void;
  listingId: string | null;
  setListingId: (id: string | null) => void;
  onPreviewReload: (() => void) | null;
  setOnPreviewReload: (fn: (() => void) | null) => void;
  /** Horodatage dernière modif prix/mode calendrier (inline, modal, apply). */
  lastCalendarUpdatedAt: string | null;
  touchCalendarUpdatedAt: (iso?: string | null) => void;
};

const PricePreviewSelectionContext = createContext<PricePreviewSelectionContextValue | null>(null);

export function PricePreviewSelectionProvider({ children }: { children: React.ReactNode }) {
  const [selectedDates, setSelectedDates] = useState<Set<string>>(() => new Set());
  const [previewRows, setPreviewRows] = useState<ApplyPreviewDiffRowDto[]>([]);
  const [listingId, setListingId] = useState<string | null>(null);
  const [onPreviewReload, setOnPreviewReloadState] = useState<(() => void) | null>(null);
  const [lastCalendarUpdatedAt, setLastCalendarUpdatedAt] = useState<string | null>(null);

  const toggleDate = useCallback((date: string, isFree: boolean) => {
    if (!isFree) return;
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }, []);

  const toggleAllFree = useCallback((freeDates: string[]) => {
    setSelectedDates((prev) => {
      const all = freeDates.length > 0 && freeDates.every((d) => prev.has(d));
      return all ? new Set() : new Set(freeDates);
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedDates(new Set()), []);

  const setOnPreviewReload = useCallback((fn: (() => void) | null) => {
    setOnPreviewReloadState(() => fn);
  }, []);

  const touchCalendarUpdatedAt = useCallback((iso?: string | null) => {
    const next = iso ?? new Date().toISOString();
    setLastCalendarUpdatedAt((prev) => {
      if (!prev) return next;
      return new Date(next).getTime() >= new Date(prev).getTime() ? next : prev;
    });
  }, []);

  React.useEffect(() => {
    setSelectedDates(new Set());
    setLastCalendarUpdatedAt(null);
  }, [listingId]);

  const value = useMemo(
    () => ({
      selectedDates,
      toggleDate,
      toggleAllFree,
      clearSelection,
      previewRows,
      setPreviewRows,
      listingId,
      setListingId,
      onPreviewReload,
      setOnPreviewReload,
      lastCalendarUpdatedAt,
      touchCalendarUpdatedAt,
    }),
    [
      selectedDates,
      toggleDate,
      toggleAllFree,
      clearSelection,
      previewRows,
      listingId,
      onPreviewReload,
      setOnPreviewReload,
      lastCalendarUpdatedAt,
      touchCalendarUpdatedAt,
    ],
  );

  return (
    <PricePreviewSelectionContext.Provider value={value}>
      {children}
    </PricePreviewSelectionContext.Provider>
  );
}

export function usePricePreviewSelection() {
  const ctx = useContext(PricePreviewSelectionContext);
  if (!ctx) {
    throw new Error('usePricePreviewSelection must be used within PricePreviewSelectionProvider');
  }
  return ctx;
}

export function usePricePreviewSelectionOptional() {
  return useContext(PricePreviewSelectionContext);
}
