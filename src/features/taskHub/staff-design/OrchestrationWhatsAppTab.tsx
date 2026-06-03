import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import * as fulltaskApi from '../../../services/fulltaskApi';
import { unwrapFulltaskData } from '../../../utils/unwrapFulltaskResponse';

type WaRow = {
  slug: string;
  label: string;
  name: string;
  account?: string;
  metaStatus: string;
  metaTemplateId: string | null;
  bodyText: string;
  lastGraphError?: string | null;
  metaRejectedReason?: string | null;
};

type CatalogEntry = {
  id: string;
  label?: string;
  whatsappTemplateId?: string;
};

type WaAccountFilter = 'all' | 'guest' | 'staff';

const STATUS_CLASS: Record<string, string> = {
  draft: 'wa-st-draft',
  pending: 'wa-st-pending',
  approved: 'wa-st-approved',
  rejected: 'wa-st-rejected',
  paused: 'wa-st-pending',
  disabled: 'wa-st-rejected',
};

function rowAccount(row: WaRow): 'guest' | 'staff' {
  return row.account === 'staff' || row.slug.startsWith('staff_reminder_') ? 'staff' : 'guest';
}

function bodyPreview(text: string, max = 72): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '— (corps vide)';
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function statusLabel(status: string): string {
  const s = (status || 'draft').toLowerCase();
  if (s === 'approved') return 'APPROVED';
  if (s === 'pending') return 'PENDING';
  if (s === 'rejected') return 'REJECTED';
  return s.toUpperCase();
}

export default function OrchestrationWhatsAppTab() {
  const [rows, setRows] = useState<WaRow[]>([]);
  const [catalogBySlug, setCatalogBySlug] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [metaGuestReady, setMetaGuestReady] = useState(false);
  const [metaStaffReady, setMetaStaffReady] = useState(false);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [accountFilter, setAccountFilter] = useState<WaAccountFilter>('all');
  const [mergingStaff, setMergingStaff] = useState(false);
  const [mergingGuest, setMergingGuest] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const staffRowCount = useMemo(
    () => rows.filter((r) => rowAccount(r) === 'staff').length,
    [rows],
  );

  const guestRowCount = useMemo(
    () => rows.filter((r) => rowAccount(r) === 'guest').length,
    [rows],
  );

  const emptyBodyCount = useMemo(
    () => rows.filter((r) => !(r.bodyText || '').trim()).length,
    [rows],
  );

  const mismatchCount = useMemo(
    () =>
      rows.filter((r) => {
        const expected = catalogBySlug[r.slug];
        return expected && expected !== r.name;
      }).length,
    [rows, catalogBySlug],
  );

  const loadCatalog = useCallback(async () => {
    try {
      const raw = await fulltaskApi.getOrchestrationConfig('global');
      const doc = unwrapFulltaskData<{ messageCatalog?: CatalogEntry[] }>(raw);
      const catalog = doc?.messageCatalog ?? (raw as { data?: { messageCatalog?: CatalogEntry[] } })?.data?.messageCatalog ?? [];
      const map: Record<string, string> = {};
      for (const c of catalog) {
        if (c.id && c.whatsappTemplateId) map[c.id] = c.whatsappTemplateId;
      }
      setCatalogBySlug(map);
    } catch {
      setCatalogBySlug({});
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statusRes] = await Promise.all([
        fulltaskApi.listWhatsAppMessages(),
        fulltaskApi.getWhatsAppMessagesConfigStatus(),
        loadCatalog(),
      ]);
      const list =
        unwrapFulltaskData<WaRow[]>(listRes) ||
        ((listRes as { data?: WaRow[] })?.data as WaRow[]) ||
        [];
      const statusPayload = unwrapFulltaskData<{ guest?: boolean; staff?: boolean }>(statusRes);
      setRows(list);
      setMetaGuestReady(Boolean(statusPayload?.guest));
      setMetaStaffReady(Boolean(statusPayload?.staff));
    } catch (e: unknown) {
      const err = e as {
        response?: { status?: number; data?: { error?: string } };
        message?: string;
      };
      toast.error(err.response?.data?.error || err.message || 'Chargement WhatsApp impossible');
      setRows([]);
      setMetaGuestReady(false);
      setMetaStaffReady(false);
    } finally {
      setLoading(false);
    }
  }, [loadCatalog]);

  useEffect(() => {
    void load();
  }, [load]);

  const metaReadyFor = (row: WaRow) => (rowAccount(row) === 'staff' ? metaStaffReady : metaGuestReady);

  const openEditor = async (row: WaRow) => {
    setEditSlug(row.slug);
    setEditBody(row.bodyText || '');
    setEditName(row.name || row.slug);
    setEditLoading(true);
    try {
      const raw = await fulltaskApi.getWhatsAppMessage(row.slug);
      const doc = unwrapFulltaskData<WaRow>(raw);
      if (doc?.bodyText != null) setEditBody(doc.bodyText);
      if (doc?.name) setEditName(doc.name);
    } catch {
      /* garde le corps déjà listé */
    } finally {
      setEditLoading(false);
      requestAnimationFrame(() => {
        editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  };

  const submitMeta = async (slug: string) => {
    setBusySlug(slug);
    try {
      const res = await fulltaskApi.submitWhatsAppMessageToMeta(slug);
      if (res?.success) {
        toast.success(`Soumis à Meta : ${slug}`);
        await load();
      } else {
        toast.error((res as { error?: string })?.error || 'Échec soumission Meta');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setBusySlug(null);
    }
  };

  const syncMeta = async (slug: string) => {
    setBusySlug(slug);
    try {
      const res = await fulltaskApi.syncWhatsAppMessageFromMeta(slug);
      const data = unwrapFulltaskData<{ metaStatus?: string; found?: boolean }>(res);
      if (data?.found === false) {
        toast.info('Template pas encore visible sur Meta (PENDING ou jamais soumis)');
      } else {
        toast.success(`Sync OK — ${data?.metaStatus || 'statut mis à jour'}`);
      }
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setBusySlug(null);
    }
  };

  const syncAll = async () => {
    setBusySlug('__all__');
    try {
      if (metaGuestReady) await fulltaskApi.syncAllWhatsAppMessagesFromMeta('guest');
      if (metaStaffReady) await fulltaskApi.syncAllWhatsAppMessagesFromMeta('staff');
      toast.success('Sync Meta terminé');
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setBusySlug(null);
    }
  };

  const syncFromCatalog = async () => {
    setSyncingCatalog(true);
    try {
      const raw = await fulltaskApi.syncWhatsAppFromCatalog('global');
      const data = unwrapFulltaskData<{ synced?: number; slugs?: string[] }>(raw);
      toast.success(`Catalogue → WA : ${data?.synced ?? '?'} ligne(s)`);
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSyncingCatalog(false);
    }
  };

  const mergeStaffSeeds = async () => {
    setMergingStaff(true);
    try {
      const raw = await fulltaskApi.mergeStaffWhatsAppSeeds();
      const data = unwrapFulltaskData<{ merged?: number }>(raw);
      toast.success(`Templates staff chargés (${data?.merged ?? 9})`);
      await load();
      setAccountFilter('staff');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setMergingStaff(false);
    }
  };

  const mergeGuestSeeds = async () => {
    setMergingGuest(true);
    try {
      const raw = await fulltaskApi.mergeGuestWhatsAppSeeds();
      const data = unwrapFulltaskData<{ merged?: number }>(raw);
      toast.success(`Corps voyageur rechargés (${data?.merged ?? '?'})`);
      await syncFromCatalog();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      const msg = err.response?.data?.error || err.message || '';
      if (msg.includes('404') || msg.includes('Not Found')) {
        toast.error('API merge-guest-seeds absente — redémarrer srv-fulltask à jour.');
      } else {
        toast.error(msg);
      }
    } finally {
      setMergingGuest(false);
    }
  };

  const saveBody = async (slug: string) => {
    setBusySlug(slug);
    try {
      await fulltaskApi.updateWhatsAppMessage(slug, {
        bodyText: editBody,
        name: editName.trim() || slug,
      });
      toast.success('Template enregistré');
      setEditSlug(null);
      await load();
    } finally {
      setBusySlug(null);
    }
  };

  const filteredRows = rows.filter((row) => {
    if (accountFilter === 'all') return true;
    return rowAccount(row) === accountFilter;
  });

  if (loading) {
    return <p className="orch-plan-hint">Chargement templates WhatsApp…</p>;
  }

  return (
    <div className="orch-wa-tab">
      <div className="sub-tabs" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={`sub-tab${accountFilter === 'all' ? ' on' : ''}`}
          onClick={() => setAccountFilter('all')}
        >
          Tous <span className="ct">{rows.length}</span>
        </button>
        <button
          type="button"
          className={`sub-tab${accountFilter === 'guest' ? ' on' : ''}`}
          onClick={() => setAccountFilter('guest')}
        >
          Voyageur <span className="ct">{guestRowCount}</span>
        </button>
        <button
          type="button"
          className={`sub-tab${accountFilter === 'staff' ? ' on' : ''}`}
          onClick={() => setAccountFilter('staff')}
        >
          Staff · rappels <span className="ct">{staffRowCount}</span>
        </button>
      </div>

      {staffRowCount === 0 ? (
        <div className="orch-wa-empty-staff" style={{ marginBottom: 12 }}>
          <p className="orch-plan-hint" style={{ margin: '0 0 8px' }}>
            Aucun template staff en base. Chargez les 9 rappels staff.
          </p>
          <button
            type="button"
            className="btn-prim"
            style={{ fontSize: 12, padding: '7px 14px' }}
            disabled={mergingStaff || busySlug !== null}
            onClick={() => void mergeStaffSeeds()}
          >
            {mergingStaff ? 'Chargement…' : 'Charger les 9 templates staff'}
          </button>
        </div>
      ) : null}

      {emptyBodyCount > 0 ? (
        <div className="orch-wa-empty-bodies" style={{ marginBottom: 12 }}>
          <p className="orch-plan-hint" style={{ margin: '0 0 8px' }}>
            {emptyBodyCount} template(s) sans corps — recharger le seed voyageur.
          </p>
          <button
            type="button"
            className="btn-prim"
            style={{ fontSize: 12, padding: '7px 14px' }}
            disabled={mergingGuest || busySlug !== null}
            onClick={() => void mergeGuestSeeds()}
          >
            {mergingGuest ? 'Chargement…' : 'Recharger corps + noms catalogue'}
          </button>
        </div>
      ) : null}

      {mismatchCount > 0 ? (
        <p className="orch-plan-hint" style={{ marginBottom: 10, color: 'var(--warn, #b45309)' }}>
          {mismatchCount} nom(s) Meta différent(s) du catalogue — utiliser « Sync catalogue → WA » ou
          onglet Messages puis Enregistrer.
        </p>
      ) : null}

      <div className="orch-plan-toolbar">
        <p className="orch-plan-hint">
          Templates Meta · <code>whatsapp_messages</code> · slug = <code>messageCatalog.id</code> · nom
          Meta = <code>whatsappTemplateId</code>
        </p>
        <div className="orch-wa-toolbar-actions">
          <span className={`orch-wa-meta-pill${metaGuestReady ? ' ok' : ' warn'}`}>
            {metaGuestReady ? 'Meta voyageur OK' : 'WABA voyageur manquant'}
          </span>
          <span className={`orch-wa-meta-pill${metaStaffReady ? ' ok' : ' warn'}`}>
            {metaStaffReady ? 'Meta staff OK' : 'WABA staff manquant'}
          </span>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: 12 }}
            disabled={syncingCatalog || busySlug !== null}
            onClick={() => void syncFromCatalog()}
            title="Applique messageCatalog → noms et corps whatsapp_messages"
          >
            {syncingCatalog ? 'Sync…' : 'Sync catalogue → WA'}
          </button>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: 12 }}
            disabled={mergingGuest || busySlug !== null}
            onClick={() => void mergeGuestSeeds()}
          >
            + Corps voyageur
          </button>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: 12 }}
            disabled={mergingStaff || busySlug !== null}
            onClick={() => void mergeStaffSeeds()}
          >
            + Staff seeds
          </button>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: 12 }}
            disabled={(!metaGuestReady && !metaStaffReady) || busySlug !== null}
            onClick={() => void syncAll()}
          >
            Sync tous Meta
          </button>
          <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => void load()}>
            Rafraîchir
          </button>
        </div>
      </div>

      {!metaGuestReady && !metaStaffReady ? (
        <p className="orch-plan-hint orch-wa-env-hint">
          Publier / Sync Meta nécessite <code>WHATSAPP_ACCESS_TOKEN</code> +{' '}
          <code>WHATSAPP_WABA_ID</code> (voyageur) et éventuellement <code>WHATSAPP_STAFF_*</code> sur{' '}
          <strong>srv-fulltask</strong>. En local : <code>apps/srv-fulltask/.env</code> ou secrets
          cluster (<code>scripts/create-srv-fulltask-secrets.sh</code>). L’édition du corps fonctionne
          sans Meta.
        </p>
      ) : null}

      {editSlug ? (
        <div className="orch-wa-editor orch-wa-editor--open" ref={editorRef}>
          <div className="wf-block-h">
            <span className="wf-block-h-txt">Template — {editSlug}</span>
          </div>
          <p className="wf-block-hint">
            Nom Meta (soumission) · corps avec {'{{1}}'}, {'{{2}}'}, …
            {catalogBySlug[editSlug] ? (
              <>
                {' '}
                · catalogue attend : <code>{catalogBySlug[editSlug]}</code>
              </>
            ) : null}
          </p>
          {editLoading ? <p className="orch-plan-hint">Chargement…</p> : null}
          <label className="orch-plan-hint" style={{ display: 'block', marginBottom: 4 }}>
            Nom Meta
          </label>
          <input
            className="input"
            style={{ width: '100%', marginBottom: 10, fontFamily: 'monospace', fontSize: 13 }}
            value={editName}
            disabled={editLoading}
            onChange={(e) => setEditName(e.target.value)}
          />
          <textarea
            className="input orch-wa-textarea"
            rows={10}
            value={editBody}
            disabled={editLoading}
            placeholder="Corps vide — recharger le seed ou saisir le texte."
            onChange={(e) => setEditBody(e.target.value)}
          />
          <div className="orch-wa-editor-actions">
            <button
              type="button"
              className="btn-prim"
              disabled={busySlug === editSlug || editLoading}
              onClick={() => void saveBody(editSlug)}
            >
              Enregistrer
            </button>
            <button type="button" className="btn-ghost" onClick={() => setEditSlug(null)}>
              Annuler
            </button>
          </div>
        </div>
      ) : null}

      <div className="orch-wa-table-wrap">
        <table className="orch-wa-table">
          <thead>
            <tr>
              <th>Message</th>
              <th>Aperçu corps</th>
              <th>Slug (catalogue)</th>
              <th>Nom Meta</th>
              <th>Statut</th>
              <th>ID template Meta</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const acc = rowAccount(row);
              const metaOk = metaReadyFor(row);
              const isEditing = editSlug === row.slug;
              const catalogName = catalogBySlug[row.slug];
              const nameMismatch = Boolean(catalogName && catalogName !== row.name);
              return (
                <tr key={row.slug} className={isEditing ? 'orch-wa-row-editing' : undefined}>
                  <td>
                    {row.label}
                    <span className={`orch-wa-account-pill${acc === 'staff' ? ' staff' : ''}`}>
                      {acc === 'staff' ? 'Staff' : 'Voyageur'}
                    </span>
                  </td>
                  <td className="orch-wa-preview" title={row.bodyText || ''}>
                    {bodyPreview(row.bodyText || '')}
                  </td>
                  <td>
                    <code>{row.slug}</code>
                  </td>
                  <td>
                    <code className={nameMismatch ? 'orch-wa-name-mismatch' : ''}>{row.name}</code>
                    {nameMismatch ? (
                      <div className="orch-wa-err" title="Attendu depuis messageCatalog">
                        catalogue : {catalogName}
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <span
                      className={`orch-wa-status ${STATUS_CLASS[row.metaStatus] || ''}`}
                      title={row.metaRejectedReason || undefined}
                    >
                      {statusLabel(row.metaStatus)}
                    </span>
                  </td>
                  <td>
                    <code className="orch-wa-tid">{row.metaTemplateId || '—'}</code>
                    {row.lastGraphError ? (
                      <div className="orch-wa-err" title={row.lastGraphError}>
                        {row.lastGraphError.slice(0, 80)}
                      </div>
                    ) : null}
                  </td>
                  <td className="orch-wa-actions">
                    <button
                      type="button"
                      className={`btn-ghost${isEditing ? ' on' : ''}`}
                      onClick={() => void openEditor(row)}
                    >
                      {isEditing ? 'Édition…' : 'Éditer'}
                    </button>
                    <button
                      type="button"
                      className="btn-prim"
                      style={{ fontSize: 11, padding: '4px 10px' }}
                      disabled={!metaOk || busySlug === row.slug}
                      title={!metaOk ? 'Token WABA manquant pour ce compte' : undefined}
                      onClick={() => void submitMeta(row.slug)}
                    >
                      Publier Meta
                    </button>
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={!metaOk || busySlug === row.slug}
                      onClick={() => void syncMeta(row.slug)}
                    >
                      Sync
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
