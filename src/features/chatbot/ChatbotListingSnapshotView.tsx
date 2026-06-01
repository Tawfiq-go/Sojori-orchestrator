import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChatbotHubShell from './ChatbotHubShell';
import * as fullchatbotApi from '../../services/fullchatbotApi';
import FullChatbotSyncButton from '../../components/listing/FullChatbotSyncButton';
import ChatbotListingConfigEmbed from './ChatbotListingConfigEmbed';

type SnapshotRow = {
  listingId: string;
  name?: string;
  city?: string;
  country?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  active?: boolean;
  snapshotUpdatedAt?: string;
};

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
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapshotUpdatedAt, setSnapshotUpdatedAt] = useState<string | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fullchatbotApi.listListingSnapshots({ limit: 300, activeOnly: true });
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const fromUrl = searchParams.get('listingId')?.trim();
    if (!fromUrl || rows.length === 0) return;
    if (rows.some((r) => r.listingId === fromUrl)) {
      setSelectedId(fromUrl);
    }
  }, [searchParams, rows]);

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
          {loading && <div className="cb-loading">Chargement…</div>}
          {!loading &&
            filtered.map((r) => {
              const active = r.listingId === selectedId;
              const color = avatarColor(r.listingId);
              return (
                <div
                  key={r.listingId}
                  className={`sb-item${active ? ' on' : ''}`}
                  onClick={() => setSelectedId(r.listingId)}
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
          {!loading && !filtered.length && (
            <div className="cb-empty">
              <span className="em">📭</span>
              Aucun listing actif synchronisé — lancez Sync FullChatbot.
            </div>
          )}
        </div>

        <div className="sb-foot" style={{ flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
          <span>📊 {filtered.length} actifs</span>
          <FullChatbotSyncButton variant="bulk" size="small" sx={{ width: '100%' }} />
          <button type="button" className="all" onClick={load}>
            Actualiser →
          </button>
        </div>
      </aside>

      <div className="wrap cb-listing-main">
        {error && <div className="cb-error">{error}</div>}

        {!selectedId && (
          <div className="cb-empty">
            <span className="em">👈</span>
            Sélectionnez un listing — onglet Résumé propriété ou Config Orch. NEW (11 onglets).
          </div>
        )}

        {selectedId && (
          <ChatbotListingConfigEmbed
            listingId={selectedId}
            snapshotUpdatedAt={snapshotUpdatedAt}
            defaultTab="access-config"
          />
        )}
      </div>
    </ChatbotHubShell>
  );
}
