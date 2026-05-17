/**
 * MappingTab — CRUD mappings RU + dictionnaires (legacy tab=Mapping)
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tokens as T } from '../dashboard/DashboardV2.components';
import { RuFieldMappingCrudDialog } from '../../features/channels/components/RuFieldMappingCrudDialog';
import { RU_FIELD_MAP_DOMAIN } from '../../features/channels/constants/ruFieldMappingDomains';
import {
  fetchChannelsRuFieldMappings,
  fetchChannelsRuCountryDictionaryList,
  fetchChannelsRuLanguageDictionaryList,
  deleteChannelsRuFieldMapping,
  postChannelsRuFieldMapping,
  patchChannelsRuFieldMapping,
  postChannelsRuFieldMappingsSeed,
  postChannelsRuFieldMappingsSyncRuCountries,
  postChannelsRuFieldMappingsSyncRuLanguages,
} from '../../services/channelsDashboardApi';

type SubView = 'fields' | 'list';
type RuMapping = {
  _id: string;
  domain: string;
  ruFieldPath: string;
  sojoriStoragePath: string;
  mappings: Array<{ sojoriValue: string; ruCode: string | number }>;
  active: boolean;
  sortOrder?: number;
  description?: string;
};

const SUB_VIEWS: Array<{ id: SubView; label: string }> = [
  { id: 'fields', label: 'Champs (CRUD)' },
  { id: 'list', label: 'Dictionnaires RU' },
];

export function MappingTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = ((searchParams.get('mapSub') || 'fields').toLowerCase() === 'list' ? 'list' : 'fields') as SubView;
  const ruListMode = searchParams.get('ruListMode') === 'languages' ? 'languages' : 'locations';

  const [mappings, setMappings] = useState<RuMapping[]>([]);
  const [dictionaries, setDictionaries] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editRow, setEditRow] = useState<RuMapping | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const patchParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'Mapping');
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) next.delete(k);
        else next.set(k, v);
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const loadMappings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await fetchChannelsRuFieldMappings({ populate: true });
      if (data?.success && Array.isArray(data.data)) {
        setMappings(data.data);
      } else {
        setMappings([]);
      }
    } catch (error) {
      console.error('[MappingTab] Error loading mappings:', error);
      setMappings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDictionaries = useCallback(async () => {
    setLoading(true);
    try {
      if (ruListMode === 'languages') {
        const { data } = await fetchChannelsRuLanguageDictionaryList();
        if (data?.success && Array.isArray(data.data)) {
          setDictionaries(data.data);
        } else {
          setDictionaries([]);
        }
      } else {
        const locId = searchParams.get('ruDictType') || '2';
        const { data } = await fetchChannelsRuCountryDictionaryList({ locationTypeId: locId });
        if (data?.success && Array.isArray(data.data)) {
          setDictionaries(data.data);
        } else {
          setDictionaries([]);
        }
      }
    } catch (error) {
      console.error('[MappingTab] Error loading dictionaries:', error);
      setDictionaries([]);
    } finally {
      setLoading(false);
    }
  }, [ruListMode, searchParams]);

  useEffect(() => {
    if (activeView === 'fields') void loadMappings();
    else void loadDictionaries();
  }, [activeView, loadMappings, loadDictionaries]);

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce mapping ?')) return;
    const { data } = await deleteChannelsRuFieldMapping(id);
    if (data?.success) setMappings((prev) => prev.filter((m) => m._id !== id));
  };

  const submitDialog = async (body: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      if (dialogMode === 'edit' && editRow?._id) {
        const { data } = await patchChannelsRuFieldMapping(editRow._id, body);
        if (!data?.success) throw new Error(data?.error || 'Erreur');
      } else {
        const { data } = await postChannelsRuFieldMapping(body);
        if (!data?.success) throw new Error(data?.error || 'Erreur');
      }
      setDialogOpen(false);
      void loadMappings();
    } catch (e: unknown) {
      const err = e as { message?: string };
      alert(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {SUB_VIEWS.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => patchParams({ mapSub: view.id })}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              ...(activeView === view.id ? {
                background: T.primary,
                color: '#FFFFFF',
                boxShadow: `0 2px 4px ${T.primaryTint}`,
              } : {
                background: 'transparent',
                color: T.text2,
              })
            }}
          >
            {view.label}
          </button>
        ))}
      </div>

      {activeView === 'fields' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: "transparent", color: T.text2 }}
              onClick={() => {
                setDialogMode('create');
                setEditRow(null);
                setDialogOpen(true);
              }}
            >
              + Créer
            </button>
            <button
              type="button"
              style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: "transparent", color: T.text2 }}
              onClick={async () => {
                await postChannelsRuFieldMappingsSeed({});
                void loadMappings();
              }}
            >
              Seed
            </button>
            <button type="button" style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: "transparent", color: T.text2 }} onClick={() => void loadMappings()}>
              Actualiser
            </button>
          </div>

          <div style={{ overflow: "auto", border: `1px solid ${T.border}`, borderRadius: 8 }} style={{ maxHeight: '70vh', overflow: 'auto', border: `1px solid ${T.border}`, borderRadius: 8 }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: T.text3 }}>Chargement…</div>
            ) : mappings.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: T.text3 }}>Aucun mapping trouvé</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 100, background: T.primary, color: "white", fontWeight: 700, fontSize: 12 }}>
                  <tr>
                    <th>Domaine</th>
                    <th>RU path</th>
                    <th>Sojori path</th>
                    <th>Valeurs</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m) => (
                    <tr key={m._id}>
                      <td>{m.domain}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{m.ruFieldPath}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{m.sojoriStoragePath}</td>
                      <td>{m.mappings?.length ?? 0}</td>
                      <td>
                        <button
                          type="button"
                          style={{ marginRight: 8, fontSize: 11, color: T.primary, background: 'none', border: 0, cursor: 'pointer' }}
                          onClick={() => {
                            setDialogMode('edit');
                            setEditRow(m);
                            setDialogOpen(true);
                          }}
                        >
                          Éditer
                        </button>
                        <button
                          type="button"
                          style={{ fontSize: 11, color: '#dc2626', background: 'none', border: 0, cursor: 'pointer' }}
                          onClick={() => void handleDelete(m._id)}
                        >
                          Suppr.
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <RuFieldMappingCrudDialog
            open={dialogOpen}
            mode={dialogMode}
            initial={editRow}
            defaultDomain={RU_FIELD_MAP_DOMAIN}
            onClose={() => setDialogOpen(false)}
            onSubmit={submitDialog}
            submitting={submitting}
          />
        </>
      )}

      {activeView === 'list' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", ...(ruListMode === "locations" ? { background: T.primary, color: "#FFFFFF", boxShadow: `0 2px 4px ${T.primaryTint}` } : { background: "transparent", color: T.text2 }) }}
              onClick={() => patchParams({ mapSub: 'list', ruListMode: undefined })}
            >
              Pays / lieux
            </button>
            <button
              type="button"
              onClick={() => patchParams({ mapSub: 'list', ruListMode: 'languages' })}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                ...(ruListMode === 'languages' ? {
                  background: T.primary,
                  color: '#FFFFFF',
                  boxShadow: `0 2px 4px ${T.primaryTint}`,
                } : {
                  background: 'transparent',
                  color: T.text2,
                })
              }}
            >
              Langues
            </button>
            {ruListMode === 'locations' && (
              <button
                type="button"
                style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: "transparent", color: T.text2 }}
                onClick={async () => {
                  await postChannelsRuFieldMappingsSyncRuCountries({});
                  void loadDictionaries();
                }}
              >
                Sync pays RU
              </button>
            )}
            {ruListMode === 'languages' && (
              <button
                type="button"
                style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: "transparent", color: T.text2 }}
                onClick={async () => {
                  await postChannelsRuFieldMappingsSyncRuLanguages({});
                  void loadDictionaries();
                }}
              >
                Sync langues RU
              </button>
            )}
            <button type="button" style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", background: "transparent", color: T.text2 }} onClick={() => void loadDictionaries()}>
              Actualiser
            </button>
          </div>
          <pre
            style={{
              fontSize: 11,
              padding: 12,
              background: T.bg2,
              borderRadius: 8,
              maxHeight: '65vh',
              overflow: 'auto',
              border: `1px solid ${T.border}`,
            }}
          >
            {loading ? 'Chargement…' : JSON.stringify(dictionaries, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
