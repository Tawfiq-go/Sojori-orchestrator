import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listingsService } from '../../../../services/listingsService';

function throwIfNotFound(result: { notFound?: boolean; error?: string }) {
  if (result.notFound) {
    const err = new Error(result.error || 'Configuration not found') as Error & { notFound?: boolean };
    err.notFound = true;
    throw err;
  }
  if (result.error) throw new Error(result.error);
}

export function useListingConciergeConfig(listingId?: string) {
  return useQuery({
    queryKey: ['listingConciergeConfig', listingId],
    queryFn: async () => {
      if (!listingId) return null;
      const result = await listingsService.getListingConciergeConfig(listingId);
      throwIfNotFound(result);
      return result.data ?? null;
    },
    enabled: Boolean(listingId),
    retry: (c, e) => !(e as { notFound?: boolean })?.notFound && c < 1,
  });
}

export function useListingConciergeSyncStatus(listingId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['listingConciergeSync', listingId],
    queryFn: async () => {
      if (!listingId) return null;
      const result = await listingsService.getListingConciergeSyncStatus(listingId);
      if (result.notFound) return null;
      if (result.error && !result.data) throw new Error(result.error);
      return result.data ?? null;
    },
    enabled: Boolean(listingId) && options?.enabled !== false,
    retry: 1,
  });
}

export function useUpdateListingConciergeServices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      listingId: string;
      transportServices: unknown[];
      groceryServices: unknown[];
      customServices: unknown[];
    }) => {
      const result = await listingsService.updateListingConciergeServices(args.listingId, {
        transportServices: args.transportServices,
        groceryServices: args.groceryServices,
        customServices: args.customServices,
      });
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['listingConciergeConfig', v.listingId] }),
  });
}

export function useCreateListingConciergeConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId }: { listingId: string }) => {
      const result = await listingsService.createListingConciergeConfig(listingId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['listingConciergeConfig', v.listingId] });
      qc.invalidateQueries({ queryKey: ['listingConciergeSync', v.listingId] });
    },
  });
}

export function useSyncListingConciergeConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId }: { listingId: string }) => {
      const result = await listingsService.syncListingConciergeConfig(listingId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['listingConciergeConfig', v.listingId] });
      qc.invalidateQueries({ queryKey: ['listingConciergeSync', v.listingId] });
    },
  });
}

export function useListingSupportCategories(listingId?: string) {
  return useQuery({
    queryKey: ['listingSupportCategories', listingId],
    queryFn: async () => {
      if (!listingId) return null;
      const result = await listingsService.getListingSupportCategoriesConfig(listingId);
      throwIfNotFound(result);
      return result.data ?? null;
    },
    enabled: Boolean(listingId),
    retry: (c, e) => !(e as { notFound?: boolean })?.notFound && c < 1,
  });
}

export function useListingSupportSyncStatus(listingId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['listingSupportSync', listingId],
    queryFn: async () => {
      if (!listingId) return null;
      const result = await listingsService.getListingSupportSyncStatus(listingId);
      if (result.notFound) return null;
      if (result.error && !result.data) throw new Error(result.error);
      return result.data ?? null;
    },
    enabled: Boolean(listingId) && options?.enabled !== false,
    retry: 1,
  });
}

export function useUpdateListingSupportCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, categories }: { listingId: string; categories: unknown[] }) => {
      const result = await listingsService.updateListingSupportCategories(listingId, categories);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['listingSupportCategories', v.listingId] }),
  });
}

export function useCreateListingSupportCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId }: { listingId: string }) => {
      const result = await listingsService.createListingSupportCategories(listingId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['listingSupportCategories', v.listingId] });
      qc.invalidateQueries({ queryKey: ['listingSupportSync', v.listingId] });
    },
  });
}

export function useSyncListingSupportCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId }: { listingId: string }) => {
      const result = await listingsService.syncListingSupportCategories(listingId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['listingSupportCategories', v.listingId] });
      qc.invalidateQueries({ queryKey: ['listingSupportSync', v.listingId] });
    },
  });
}

export function useListingRulesAndInfo(listingId?: string) {
  return useQuery({
    queryKey: ['listingRulesAndInfo', listingId],
    queryFn: async () => {
      if (!listingId) return null;
      const result = await listingsService.getListingRulesAndInfoConfig(listingId);
      throwIfNotFound(result);
      return result.data ?? null;
    },
    enabled: Boolean(listingId),
    retry: (c, e) => !(e as { notFound?: boolean })?.notFound && c < 1,
  });
}

export function useListingRulesSyncStatus(listingId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['listingRulesSync', listingId],
    queryFn: async () => {
      if (!listingId) return null;
      const result = await listingsService.getListingRulesSyncStatus(listingId);
      if (result.notFound) return null;
      if (result.error && !result.data) throw new Error(result.error);
      return result.data ?? null;
    },
    enabled: Boolean(listingId) && options?.enabled !== false,
    retry: 1,
  });
}

export function useUpdateListingRulesAndInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, rulesAndInfo }: { listingId: string; rulesAndInfo: unknown }) => {
      const result = await listingsService.updateListingRulesAndInfo(listingId, rulesAndInfo);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['listingRulesAndInfo', v.listingId] }),
  });
}

export function useCreateListingRulesAndInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId }: { listingId: string }) => {
      const result = await listingsService.createListingRulesAndInfo(listingId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['listingRulesAndInfo', v.listingId] });
      qc.invalidateQueries({ queryKey: ['listingRulesSync', v.listingId] });
    },
  });
}

export function useSyncListingRulesAndInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId }: { listingId: string }) => {
      const result = await listingsService.syncListingRulesAndInfo(listingId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['listingRulesAndInfo', v.listingId] });
      qc.invalidateQueries({ queryKey: ['listingRulesSync', v.listingId] });
    },
  });
}

export function useListingAccess(listingId?: string) {
  return useQuery({
    queryKey: ['listingAccess', listingId],
    queryFn: async () => {
      if (!listingId) return null;
      const result = await listingsService.getListingAccessConfig(listingId);
      throwIfNotFound(result);
      return result.data ?? null;
    },
    enabled: Boolean(listingId),
    retry: (c, e) => !(e as { notFound?: boolean })?.notFound && c < 1,
  });
}

export function useUpdateListingAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, data }: { listingId: string; data: unknown }) => {
      const result = await listingsService.updateListingAccess(listingId, data);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['listingAccess', v.listingId] }),
  });
}

export function useCreateListingAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: unknown) => {
      const result = await listingsService.createListingAccess(data);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['listingAccess'] }),
  });
}
