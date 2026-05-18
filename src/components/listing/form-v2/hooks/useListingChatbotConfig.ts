import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listingsService } from '../../../../services/listingsService';

export function useListingChatbotConfig(listingId?: string) {
  return useQuery({
    queryKey: ['listingChatbotConfig', listingId],
    queryFn: async () => {
      if (!listingId) return null;
      const result = await listingsService.getListingChatbotConfig(listingId);
      if (result.notFound) {
        const err = new Error(result.error || 'Configuration not found') as Error & { notFound?: boolean };
        err.notFound = true;
        throw err;
      }
      if (result.error) throw new Error(result.error);
      return result.data ?? null;
    },
    enabled: Boolean(listingId),
    retry: (count, error) => {
      if (error && typeof error === 'object' && 'notFound' in error && (error as { notFound?: boolean }).notFound) {
        return false;
      }
      return count < 1;
    },
  });
}

export function useListingChatbotSyncStatus(listingId?: string) {
  return useQuery({
    queryKey: ['listingChatbotSync', listingId],
    queryFn: async () => {
      if (!listingId) return null;
      const result = await listingsService.getListingChatbotSyncStatus(listingId);
      if (result.error && !result.data) throw new Error(result.error);
      return result.data ?? null;
    },
    enabled: Boolean(listingId),
    retry: 1,
  });
}

export function useCreateListingChatbotConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId }: { listingId: string }) => {
      const result = await listingsService.createListingChatbotConfig(listingId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['listingChatbotConfig', variables.listingId] });
      queryClient.invalidateQueries({ queryKey: ['listingChatbotSync', variables.listingId] });
    },
  });
}

export function useSyncListingChatbotConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId }: { listingId: string }) => {
      const result = await listingsService.syncListingChatbotConfig(listingId);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['listingChatbotConfig', variables.listingId] });
      queryClient.invalidateQueries({ queryKey: ['listingChatbotSync', variables.listingId] });
    },
  });
}

export function useUpdateListingChatbotOverrides() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, overrides }: { listingId: string; overrides: unknown[] }) => {
      const result = await listingsService.updateListingChatbotOverrides(listingId, overrides);
      if (result.error) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['listingChatbotConfig', variables.listingId] });
    },
  });
}
