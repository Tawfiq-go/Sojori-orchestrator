import { useEffect, useState, type ReactNode } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Box, Chip, Stack } from '@mui/material';
import './orchDesign.css';
import { orchDragEndIndices, useOrchSortableSensors } from './useOrchSortableList';
import MessageBodyModal from './MessageBodyModal';
import OrchConfigListCard from './OrchConfigListCard';
import OrchConfirmDialog from './OrchConfirmDialog';
import OrchestrationWhatsAppTab from './OrchestrationWhatsAppTab';
import { WELCOME_MESSAGE_TEMPLATE_FR } from './orchestrationMessageVars';
import type { CatalogMessage } from './types';

export type OrchestrationSubTab = 'messages' | 'config';

const MSG_EMOJI = ['👋', '☺', '⭐', '💌', '📨'];

interface Props {
  catalog: CatalogMessage[];
  saving?: boolean;
  onSave: () => void;
  onUpdateCatalogEntry: (id: string, patch: Partial<CatalogMessage>) => void;
  onAddCatalogEntry: () => string;
  onDeleteCatalogEntry: (id: string) => void;
  onReorderCatalog: (oldIndex: number, newIndex: number) => void;
  initialSubTab?: OrchestrationSubTab;
  onSubTabChange?: (tab: OrchestrationSubTab) => void;
  onSeedDefaults?: () => void;
  onSeedDefaultsVisible?: boolean;
  seedingDefaults?: boolean;
  loadState?: 'ok' | 'empty' | 'error';
  ownerDisplayName?: string;
  ownerKeyDetail?: string;
  ownerScopeExtra?: ReactNode;
}

function OrchPlanSaveRow({
  saving,
  onSave,
  label = 'Enregistrer',
}: {
  saving?: boolean;
  onSave: () => void;
  label?: string;
}) {
  return (
    <div className="orch-plan-save-row">
      <button
        type="button"
        className="btn-prim orch-plan-save-btn"
        disabled={saving}
        onClick={(e) => {
          e.stopPropagation();
          onSave();
        }}
      >
        {saving ? 'Enregistrement…' : label}
      </button>
    </div>
  );
}

export default function OrchestrationPageView({
  catalog,
  saving,
  onSave,
  onUpdateCatalogEntry,
  onAddCatalogEntry,
  onDeleteCatalogEntry,
  onReorderCatalog,
  initialSubTab = 'messages',
  onSubTabChange,
  onSeedDefaults,
  onSeedDefaultsVisible = false,
  seedingDefaults,
  loadState = 'ok',
  ownerDisplayName,
  ownerKeyDetail,
  ownerScopeExtra,
}: Props) {
  const sortableSensors = useOrchSortableSensors();
  const [subTab, setSubTab] = useState<OrchestrationSubTab>(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const selectSubTab = (tab: OrchestrationSubTab) => {
    setSubTab(tab);
    onSubTabChange?.(tab);
  };

  const [expandedCatalogId, setExpandedCatalogId] = useState<string | null>(null);
  const [previewCatalogId, setPreviewCatalogId] = useState<string | null>(null);
  const [previewField, setPreviewField] = useState<'ota' | 'email'>('ota');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const previewCatalog = catalog.find((c) => c.id === previewCatalogId);

  const renderCatalogForm = (entry: CatalogMessage) => (
    <div className="msg-form msg-form--catalog" onClick={(e) => e.stopPropagation()}>
      <div className="row">
        <div className="lbl">
          Nom<span style={{ color: 'var(--er)' }}>*</span>
        </div>
        <input
          className="input"
          value={entry.label}
          onChange={(e) => onUpdateCatalogEntry(entry.id, { label: e.target.value })}
          placeholder="ex: Bienvenu"
        />
      </div>
      <div className="row">
        <div className="lbl">
          Template WhatsApp (ID Meta)<span style={{ color: 'var(--er)' }}>*</span>
        </div>
        <input
          className="input"
          value={entry.whatsappTemplateId}
          onChange={(e) =>
            onUpdateCatalogEntry(entry.id, { whatsappTemplateId: e.target.value })
          }
          placeholder="ex: reminder_arrival_choice_v1"
        />
      </div>
      {entry.id.startsWith('msg_relance') || entry.flowCategory ? (
        <div className="row">
          <div className="lbl">Catégorie Flow (bouton WA)</div>
          <input
            className="input"
            value={entry.flowCategory || ''}
            onChange={(e) => onUpdateCatalogEntry(entry.id, { flowCategory: e.target.value })}
            placeholder="ex: arrival_choose · registration · cleaning_free"
          />
        </div>
      ) : null}
      <div className="row full">
        <div className="lbl">Message OTA (texte FR)</div>
        <textarea
          className="input"
          rows={5}
          value={entry.messageFrOta}
          onChange={(e) => onUpdateCatalogEntry(entry.id, { messageFrOta: e.target.value })}
          placeholder="{firstName}, {listingName}…"
        />
        <button
          type="button"
          className="btn-ghost"
          style={{ fontSize: 11, marginTop: 6 }}
          onClick={() =>
            onUpdateCatalogEntry(entry.id, {
              messageFrOta: entry.messageFrOta.trim() ? entry.messageFrOta : WELCOME_MESSAGE_TEMPLATE_FR,
            })
          }
        >
          Charger modèle Bienvenue (OTA)
        </button>
      </div>
      <div className="row full">
        <div className="lbl">Message Email (texte FR)</div>
        <textarea
          className="input"
          rows={5}
          value={entry.messageFrEmail}
          onChange={(e) => onUpdateCatalogEntry(entry.id, { messageFrEmail: e.target.value })}
        />
      </div>
    </div>
  );

  return (
    <div className="so-orch-root">
      <div className="section-hero">
        <div className="em">⚙️</div>
        <div style={{ flex: 1 }}>
          <h1>
            Orchestration <span className="badge">OPS · messages & WhatsApp</span>
          </h1>
          <div className="sub">
            <b>Messages</b> (textes OTA / email partagés par PM) · <b>Config</b> (templates Meta).
            Les <b>workflows</b> (timing, relances) se configurent par <b>annonce</b> (orchestration listing v3).
          </div>
          {ownerDisplayName ? (
            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: 1.25, alignItems: 'center', flexWrap: 'wrap' }}
            >
              <span className="sub" style={{ margin: 0, fontWeight: 700, color: 'var(--t2)' }}>
                Propriétaire :
              </span>
              <Chip
                label={ownerDisplayName}
                size="small"
                sx={{
                  fontWeight: 700,
                  height: 24,
                  bgcolor: 'var(--pd, #0673b3)',
                  color: '#fff',
                }}
              />
              {ownerKeyDetail ? (
                <span
                  className="sub"
                  style={{
                    margin: 0,
                    fontFamily: 'Geist Mono, ui-monospace, monospace',
                    fontSize: 11,
                  }}
                >
                  {ownerKeyDetail}
                </span>
              ) : null}
            </Stack>
          ) : null}
        </div>
      </div>

      {ownerScopeExtra ? <Box sx={{ mb: 1.5 }}>{ownerScopeExtra}</Box> : null}

      <div className="sub-tabs">
        <button
          type="button"
          className={`sub-tab${subTab === 'messages' ? ' on' : ''}`}
          onClick={() => selectSubTab('messages')}
        >
          <span>💬</span> Messages <span className="ct">{catalog.length}</span>
        </button>
        <button
          type="button"
          className={`sub-tab${subTab === 'config' ? ' on' : ''}`}
          onClick={() => selectSubTab('config')}
        >
          <span>📲</span> Config <span className="ct">WA</span>
        </button>
      </div>

      {subTab === 'config' && <OrchestrationWhatsAppTab />}

      {subTab === 'messages' && (
        <div>
          <div className="orch-plan-toolbar">
            <p className="orch-plan-hint">
              {catalog.length} message(s) · textes OTA / email (onglet Config = templates WhatsApp Meta)
            </p>
            <button
              type="button"
              className="btn-prim"
              style={{ fontSize: 12, padding: '7px 14px' }}
              onClick={() => {
                const id = onAddCatalogEntry();
                setExpandedCatalogId(id);
              }}
            >
              + Ajouter
            </button>
          </div>

          {onSeedDefaultsVisible && onSeedDefaults && loadState === 'empty' ? (
            <div style={{ margin: '12px 0' }}>
              <p style={{ fontSize: 13, color: 'var(--t3)', margin: '0 0 10px' }}>
                Aucun catalogue en base. Chargez le seed une fois pour initialiser les messages.
              </p>
              <button
                type="button"
                className="btn-prim"
                style={{ fontSize: 12, padding: '8px 16px' }}
                disabled={seedingDefaults}
                onClick={onSeedDefaults}
              >
                {seedingDefaults ? 'Chargement…' : 'Charger le seed complet (one-shot)'}
              </button>
            </div>
          ) : null}

          <DndContext
            sensors={sortableSensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => {
              const ix = orchDragEndIndices(catalog, e);
              if (ix) onReorderCatalog(ix.oldIndex, ix.newIndex);
            }}
          >
            <SortableContext
              items={catalog.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <Stack className="orch-config-list" sx={{ gap: 1 }}>
                {catalog.map((entry, idx) => (
                  <OrchConfigListCard
                    key={entry.id}
                    sortableId={entry.id}
                    emoji={MSG_EMOJI[idx % MSG_EMOJI.length]}
                    title={entry.label || entry.id}
                    subtitle={`WA ${entry.whatsappTemplateId || entry.id || '—'}`}
                    expanded={expandedCatalogId === entry.id}
                    onToggleExpand={() =>
                      setExpandedCatalogId((prev) => (prev === entry.id ? null : entry.id))
                    }
                    onDelete={() =>
                      setDeleteTarget({ id: entry.id, label: entry.label })
                    }
                  >
                    {renderCatalogForm(entry)}
                    <OrchPlanSaveRow
                      saving={saving}
                      onSave={onSave}
                      label="Enregistrer ce message"
                    />
                  </OrchConfigListCard>
                ))}
              </Stack>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {subTab !== 'config' ? (
        <div className="orch-foot">
          <p className="orch-foot-hint">Enregistre le catalogue messages (OTA / email / IDs WhatsApp).</p>
          <button type="button" className="btn-prim" disabled={saving} onClick={onSave}>
            {saving ? 'Enregistrement…' : 'Enregistrer tout ⚡'}
          </button>
        </div>
      ) : null}

      {previewCatalog && (
        <MessageBodyModal
          open={Boolean(previewCatalogId)}
          title={`${previewCatalog.label} · ${previewField === 'ota' ? 'OTA' : 'Email'}`}
          messageFr={previewField === 'ota' ? previewCatalog.messageFrOta : previewCatalog.messageFrEmail}
          channelLabel={previewField === 'ota' ? 'OTA' : 'Email'}
          onClose={() => setPreviewCatalogId(null)}
          onChange={(text) =>
            onUpdateCatalogEntry(previewCatalog.id, {
              ...(previewField === 'ota' ? { messageFrOta: text } : { messageFrEmail: text }),
            })
          }
        />
      )}

      <OrchConfirmDialog
        open={Boolean(deleteTarget)}
        title="Supprimer du catalogue"
        message={
          deleteTarget
            ? `Supprimer « ${deleteTarget.label} » ? Pensez à cliquer sur Enregistrer pour valider en base.`
            : ''
        }
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (expandedCatalogId === deleteTarget.id) setExpandedCatalogId(null);
          if (previewCatalogId === deleteTarget.id) setPreviewCatalogId(null);
          onDeleteCatalogEntry(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
