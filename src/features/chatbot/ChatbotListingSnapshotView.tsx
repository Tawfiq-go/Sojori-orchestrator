import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import ChatbotHubShell from './ChatbotHubShell';
import * as fullchatbotApi from '../../services/fullchatbotApi';
import listingsService from '../../services/listingsService';
import FullChatbotSyncButton from '../../components/listing/FullChatbotSyncButton';
import ChatbotListingConfigEmbed from './ChatbotListingConfigEmbed';
import {
  getCachedChatbotListingSnapshots,
  invalidateChatbotListingSnapshotsCache,
  setCachedChatbotListingSnapshots,
  type ChatbotListingSnapshotRow,
} from '../../utils/chatbotListingSnapshotsCache';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || '??').toUpperCase();
}

function avatarColor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * 13) % 5;
  return h + 1;
}

export default function ChatbotListingSnapshotView() {
  const [searchParams] = useSearchParams();
  const { scopeFetchReady, filterOwnerIds } = useAdminOwnerApiScope();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ChatbotListingSnapshotRow[]>(
    () => getCachedChatbotListingSnapshots() ?? [],
  );
  const [isLoading, setIsLoading] = useState(() => !getCachedChatbotListingSnapshots());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [listReady, setListReady] = useState(() => Boolean(getCachedChatbotListingSnapshots()?.length));
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapshotUpdatedAt, setSnapshotUpdatedAt] = useState<string | undefined>();
  const loadRequestIdRef = useRef(0);

  const prefetchListing = useCallback(
    (listingId: string) => {
      void queryClient.prefetchQuery({
        queryKey: ['listing', listingId],
        queryFn: () => listingsService.getListingDocument(listingId),
        staleTime: 2 * 60 * 1000,
      });
      void queryClient.prefetchQuery({
        queryKey: ['fullchatbot-snapshot', listingId],
        queryFn: () => fullchatbotApi.getListingSnapshot(listingId),
        staleTime: 2 * 60 * 1000,
      });
    },
    [queryClient],
  );

  const fetchSnapshotList = useCallback(async (opts?: { isBootstrap?: boolean }) => {
    if (!scopeFetchReady) return;
    const requestId = ++loadRequestIdRef.current;
    const isBootstrap = opts?.isBootstrap ?? !listReady;

    if (isBootstrap) {
      setIsLoading(true);
      setListReady(false);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      let scopedListingIds: Set<string> | null = null;
      if (filterOwnerIds.length > 0) {
        const listingsRes = await listingsService.getListings({
          limit: 500,
          compact: true,
          useActiveFilter: false,
          filterOwnerId: filterOwnerIds,
        });
        scopedListingIds = new Set(listingsRes.data.items.map((l) => l.id));
      }

      const res = await fullchatbotApi.listListingSnapshots({ limit: 300, activeOnly: true });
      if (requestId !== loadRequestIdRef.current) return;
      let data = Array.isArray(res?.data) ? (res.data as ChatbotListingSnapshotRow[]) : [];
      if (scopedListingIds) {
        data = data.filter((row) => scopedListingIds!.has(String(row.listingId)));
      }
      setRows(data);
      setCachedChatbotListingSnapshots(data);
      setListReady(true);
    } catch (e) {
      if (requestId !== loadRequestIdRef.current) return;
      if (isBootstrap) setRows([]);
      setError(e instanceof Error ? e.message : 'Erreur chargement');
      if (!getCachedChatbotListingSnapshots()?.length) setListReady(true);
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [listReady, scopeFetchReady, filterOwnerIds.join(',')]);

  useEffect(() => {
    if (!scopeFetchReady) return;
    invalidateChatbotListingSnapshotsCache();
    void fetchSnapshotList({ isBootstrap: true });
  }, [scopeFetchReady, filterOwnerIds.join(','), fetchSnapshotList]);

  useEffect(() => {
    const fromUrl = searchParams.get('listingId')?.trim();
    if (!fromUrl) return;
    prefetchListing(fromUrl);
    if (rows.length === 0) {
      setSelectedId(fromUrl);
      return;
    }
    if (rows.some((r) => r.listingId === fromUrl)) {
      setSelectedId(fromUrl);
    }
  }, [searchParams, rows, prefetchListing]);

  useEffect(() => {
    if (!selectedId) {
      setSnapshotUpdatedAt(undefined);
      return;
    }
    const row = rows.find((r) => r.listingId === selectedId);
    setSnapshotUpdatedAt(row?.snapshotUpdatedAt);
  }, [selectedId, rows]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.name, r.city, r.listingId].filter(Boolean).some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [rows, search]);

  const handleRefresh = () => {
    invalidateChatbotListingSnapshotsCache();
    void fetchSnapshotList({ isBootstrap: false });
  };

  const showSidebarSpinner = (isLoading && !listReady) || (listReady && isRefreshing);

  return (
    <ChatbotHubShell crumb="Listing sync">
      <aside className="sidebar">
        <div className="sb-h">
          <h2>🏠 Listings</h2>
          <span className="ct">{rows.length}</span>
        </div>

        <div className="sb-search">
          <span className="ic">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, ville, id…"
          />
        </div>

        <div className="sb-list">
          {showSidebarSpinner && (
            <div className="cb-loading">{isRefreshing ? 'Mise à jour…' : 'Chargement…'}</div>
          )}
          {listReady && !showSidebarSpinner &&
            filtered.map((r) => {
              const active = r.listingId === selectedId;
              const color = avatarColor(r.listingId);
              return (
                <div
                  key={r.listingId}
                  className={`sb-item${active ? ' on' : ''}`}
                  onClick={() => setSelectedId(r.listingId)}
                  onMouseEnter={() => prefetchListing(r.listingId)}
                  onKeyDown={() => {}}
                  role="button"
                  tabIndex={0}
                >
                  <div className={`av c${color}`}>{initials(r.name || r.listingId)}</div>
                  <div className="info">
                    <div className="row1">
                      <span className="nm">{r.name || r.listingId}</span>
                      <span className="badge done">ACTIF</span>
                    </div>
                    <div className="row2">
                      <span className="listing">
                        {[r.city, r.propertyType].filter(Boolean).join(' · ') || '—'}
                        {r.bedrooms != null ? ` · ${r.bedrooms} ch.` : ''}
                        {r.maxGuests != null ? ` · ${r.maxGuests} pers.` : ''}
                      </span>
                      <span>{r.listingId.slice(-8)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          {listReady && !showSidebarSpinner && !filtered.length && (
            <div className="cb-empty">
              <span className="em">📭</span>
              Aucun listing actif synchronisé — lancez Sync FullChatbot.
            </div>
          )}
        </div>

        <div className="sb-foot" style={{ flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
          <span>📊 {filtered.length} actifs</span>
          <FullChatbotSyncButton variant="bulk" size="small" sx={{ width: '100%' }} />
          <button type="button" className="all" onClick={handleRefresh}>
            Actualiser →
          </button>
        </div>
      </aside>

      <div className="wrap cb-listing-main">
        {error && <div className="cb-error">{error}</div>}

        {!selectedId && (
          <div className="cb-empty">
            <span className="em">👈</span>
            Sélectionnez un listing — onglet Résumé propriété ou Orchestration.
          </div>
        )}

        {selectedId && (
          <ChatbotListingConfigEmbed
            listingId={selectedId}
            snapshotUpdatedAt={snapshotUpdatedAt}
          />
        )}
      </div>
    </ChatbotHubShell>
  );
}
