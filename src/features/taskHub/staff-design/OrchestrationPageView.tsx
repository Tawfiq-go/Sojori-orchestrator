import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Box, Chip, Stack } from '@mui/material';
import './orchDesign.css';
import { orchDragEndIndices, useOrchSortableSensors } from './useOrchSortableList';
import MessageBodyModal from './MessageBodyModal';
import OrchConfigListCard from './OrchConfigListCard';
import OrchConfirmDialog from './OrchConfirmDialog';
import OrchestrationWhatsAppTab from './OrchestrationWhatsAppTab';
import {
  WELCOME_MESSAGE_TEMPLATE_FR,
  insertCatalogWhatsAppLink,
  MESSAGE_MERGE_VARIABLES,
  parseEmailSubjectAndBody,
  withEmailSubject,
} from './orchestrationMessageVars';
import type { CatalogMessage } from './types';

export type OrchestrationSubTab = 'messages' | 'config';

const MSG_EMOJI = ['👋', '☺', '⭐', '💌', '📨'];

/** Groupes parcours client — UI PM. */
const JOURNEY_GROUPS: Array<{ id: string; title: string; match: (id: string) => boolean }> = [
  {
    id: 'welcome',
    title: 'Bienvenue & invitation',
    match: (id) => id === 'welcome_sojori_v2' || id.includes('welcome'),
  },
  {
    id: 'stay',
    title: 'Pendant le séjour',
    match: (id) => id === 'checkin_feedback' || id === 'inform_syndic',
  },
  {
    id: 'departure',
    title: 'Départ',
    match: (id) => id.includes('departure') || id.includes('checkout'),
  },
  {
    id: 'relances',
    title: 'Relances',
    match: (id) => id.startsWith('msg_relance'),
  },
];

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
  /** Compte PM unique : ne pas répéter le nom / id propriétaire sous le hero. */
  hideOwnerScope?: boolean;
  /** Admin plateforme : onglet Config WhatsApp Meta (templates srv-fulltask). */
  showWhatsAppConfigTab?: boolean;
  /**
   * Mode PM : textes OTA/email + signature uniquement.
   * Masque IDs Meta, Flow, CRUD, drag.
   */
  pmSafeMode?: boolean;
  guestMessageSignature?: string;
  onGuestMessageSignatureChange?: (value: string) => void;
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

function groupCatalog(catalog: CatalogMessage[]) {
  const used = new Set<string>();
  const groups: Array<{ title: string; items: CatalogMessage[] }> = [];
  for (const g of JOURNEY_GROUPS) {
    const items = catalog.filter((c) => g.match(c.id));
    if (items.length === 0) continue;
    items.forEach((c) => used.add(c.id));
    groups.push({ title: g.title, items });
  }
  const rest = catalog.filter((c) => !used.has(c.id));
  if (rest.length > 0) groups.push({ title: 'Autres messages', items: rest });
  return groups;
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
  hideOwnerScope = false,
  showWhatsAppConfigTab = false,
  pmSafeMode = false,
  guestMessageSignature = '',
  onGuestMessageSignatureChange,
  ownerScopeExtra,
}: Props) {
  const sortableSensors = useOrchSortableSensors();
  const [subTab, setSubTab] = useState<OrchestrationSubTab>(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    if (!showWhatsAppConfigTab && subTab === 'config') {
      setSubTab('messages');
      onSubTabChange?.('messages');
    }
  }, [showWhatsAppConfigTab, subTab, onSubTabChange]);

  const selectSubTab = (tab: OrchestrationSubTab) => {
    setSubTab(tab);
    onSubTabChange?.(tab);
  };

  const [expandedCatalogId, setExpandedCatalogId] = useState<string | null>(null);
  const [previewCatalogId, setPreviewCatalogId] = useState<string | null>(null);
  const [previewField, setPreviewField] = useState<'ota' | 'email'>('ota');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  /** Champ texte actif pour y insérer une variable Sojori. */
  const [activeEditField, setActiveEditField] = useState<'ota' | 'email'>('ota');
  const otaTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const emailTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const previewCatalog = catalog.find((c) => c.id === previewCatalogId);
  const journeyGroups = useMemo(() => groupCatalog(catalog), [catalog]);

  const previewWithSignature = (text: string) => {
    const body = String(text || '').trimEnd();
    const sig = String(guestMessageSignature || '').trim();
    if (!body || !sig) return body;
    const lower = body.toLowerCase();
    const sigLower = sig.toLowerCase();
    if (lower.endsWith(sigLower) || lower.endsWith(`— ${sigLower}`)) return body;
    return `${body}\n\n— ${sig}`;
  };

  const renderCatalogForm = (entry: CatalogMessage) => (
    <div className="msg-form msg-form--catalog" onClick={(e) => e.stopPropagation()}>
      {pmSafeMode ? null : (
        <>
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
        </>
      )}

      {pmSafeMode ? (
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 10,
            color: 'var(--t2)',
          }}
        >
          {entry.label || entry.id}
        </div>
      ) : null}

      {pmSafeMode ? (
        <PmVariablePicker
          targetLabel={activeEditField === 'ota' ? 'Message OTA' : 'Message Email'}
          onPick={(token) => {
            if (activeEditField === 'email') {
              insertVarAtCursor(
                emailTextareaRef.current,
                entry.messageFrEmail,
                token,
                (next) => onUpdateCatalogEntry(entry.id, { messageFrEmail: next }),
              );
            } else {
              insertVarAtCursor(
                otaTextareaRef.current,
                entry.messageFrOta,
                token,
                (next) => onUpdateCatalogEntry(entry.id, { messageFrOta: next }),
              );
            }
          }}
        />
      ) : null}

      <div className="row full">
        <div className="lbl">
          Message OTA (texte FR)
          {pmSafeMode ? (
            <span style={{ fontWeight: 400, color: 'var(--t3)', marginLeft: 6 }}>
              — Airbnb / Booking
              {activeEditField === 'ota' ? ' · actif pour variables' : ''}
            </span>
          ) : null}
        </div>
        <textarea
          ref={pmSafeMode ? otaTextareaRef : undefined}
          className="input"
          rows={pmSafeMode ? 16 : 5}
          value={entry.messageFrOta}
          onFocus={() => setActiveEditField('ota')}
          onClick={() => setActiveEditField('ota')}
          onChange={(e) => onUpdateCatalogEntry(entry.id, { messageFrOta: e.target.value })}
          placeholder="Bonjour {firstName}, …"
          style={
            pmSafeMode
              ? {
                  minHeight: 280,
                  resize: 'vertical',
                  fontSize: 14,
                  lineHeight: 1.45,
                  outline:
                    activeEditField === 'ota' ? '2px solid rgba(6,115,179,0.35)' : undefined,
                }
              : undefined
          }
        />
        {pmSafeMode ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className="btn-prim"
              style={{ fontSize: 12, padding: '7px 12px' }}
              onClick={() =>
                onUpdateCatalogEntry(entry.id, {
                  messageFrOta: insertCatalogWhatsAppLink(entry.messageFrOta),
                })
              }
            >
              + Lien WhatsApp
            </button>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 12, padding: '7px 12px' }}
              onClick={() => {
                setPreviewField('ota');
                setPreviewCatalogId(entry.id);
              }}
            >
              Aperçu + signature
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: 11, marginTop: 6 }}
            onClick={() =>
              onUpdateCatalogEntry(entry.id, {
                messageFrOta: entry.messageFrOta.trim()
                  ? entry.messageFrOta
                  : WELCOME_MESSAGE_TEMPLATE_FR,
              })
            }
          >
            Charger modèle Bienvenue (OTA)
          </button>
        )}
      </div>
      <div className="row full" style={{ marginTop: pmSafeMode ? 16 : undefined }}>
        <div className="lbl">
          Message Email (texte FR)
          {pmSafeMode ? (
            <span style={{ fontWeight: 400, color: 'var(--t3)', marginLeft: 6 }}>
              — email / secours
              {activeEditField === 'email' ? ' · actif pour variables' : ''}
            </span>
          ) : null}
        </div>
        <textarea
          ref={pmSafeMode ? emailTextareaRef : undefined}
          className="input"
          rows={pmSafeMode ? 16 : 5}
          value={entry.messageFrEmail}
          onFocus={() => setActiveEditField('email')}
          onClick={() => setActiveEditField('email')}
          onChange={(e) => onUpdateCatalogEntry(entry.id, { messageFrEmail: e.target.value })}
          style={
            pmSafeMode
              ? {
                  minHeight: 280,
                  resize: 'vertical',
                  fontSize: 14,
                  lineHeight: 1.45,
                  outline:
                    activeEditField === 'email' ? '2px solid rgba(6,115,179,0.35)' : undefined,
                }
              : undefined
          }
        />
        {pmSafeMode ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className="btn-prim"
              style={{ fontSize: 12, padding: '7px 12px' }}
              onClick={() =>
                onUpdateCatalogEntry(entry.id, {
                  messageFrEmail: insertCatalogWhatsAppLink(entry.messageFrEmail),
                })
              }
            >
              + Lien WhatsApp
            </button>
            <button
              type="button"
              className="btn-ghost"
              style={{ fontSize: 12, padding: '7px 12px' }}
              onClick={() => {
                setPreviewField('email');
                setPreviewCatalogId(entry.id);
              }}
            >
              Aperçu + signature
            </button>
          </div>
        ) : null}
      </div>
      {pmSafeMode ? (
        <p style={{ fontSize: 11, color: 'var(--t3)', margin: '10px 0 0' }}>
          La signature (bandeau bleu) s&apos;ajoute toute seule à l&apos;envoi — ne la recopiez pas dans
          le texte.
        </p>
      ) : null}
    </div>
  );

  const renderMessageCards = (items: CatalogMessage[], withDnd: boolean) => {
    const list = (
      <Stack className="orch-config-list" sx={{ gap: 1 }}>
        {items.map((entry, idx) => {
          const globalIdx = catalog.findIndex((c) => c.id === entry.id);
          return (
            <OrchConfigListCard
              key={entry.id}
              sortableId={entry.id}
              sortable={withDnd}
              hideDelete={pmSafeMode}
              emoji={MSG_EMOJI[(globalIdx >= 0 ? globalIdx : idx) % MSG_EMOJI.length]}
              title={entry.label || entry.id}
              subtitle={
                pmSafeMode
                  ? 'Cliquez pour modifier le texte'
                  : `WA ${entry.whatsappTemplateId || entry.id || '—'}`
              }
              expanded={expandedCatalogId === entry.id}
              onToggleExpand={() =>
                setExpandedCatalogId((prev) => (prev === entry.id ? null : entry.id))
              }
              onDelete={
                pmSafeMode
                  ? undefined
                  : () => setDeleteTarget({ id: entry.id, label: entry.label })
              }
            >
              {renderCatalogForm(entry)}
              <OrchPlanSaveRow
                saving={saving}
                onSave={onSave}
                label={pmSafeMode ? 'Enregistrer mes messages' : 'Enregistrer ce message'}
              />
            </OrchConfigListCard>
          );
        })}
      </Stack>
    );

    if (!withDnd) return list;

    return (
      <DndContext
        sensors={sortableSensors}
        collisionDetection={closestCenter}
        onDragEnd={(e) => {
          const ix = orchDragEndIndices(catalog, e);
          if (ix) onReorderCatalog(ix.oldIndex, ix.newIndex);
        }}
      >
        <SortableContext items={catalog.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {list}
        </SortableContext>
      </DndContext>
    );
  };

  return (
    <div className="so-orch-root">
      <div className="section-hero">
        <div className="em">{pmSafeMode ? '💬' : '⚙️'}</div>
        <div style={{ flex: 1 }}>
          <h1>
            {pmSafeMode ? (
              <>
                Messages clients <span className="badge">PM · textes</span>
              </>
            ) : (
              <>
                Orchestration <span className="badge">OPS · messages & WhatsApp</span>
              </>
            )}
          </h1>
          <div className="sub">
            {pmSafeMode ? (
              <>
                Modifiez librement les <b>textes OTA / email</b> et votre <b>signature</b>. Les templates
                WhatsApp Meta restent protégés (admin). Timing / on-off → orchestration par annonce.
              </>
            ) : (
              <>
                <b>Messages</b> (textes OTA / email partagés par PM) · <b>Config</b> (templates Meta).
                Les <b>workflows</b> (timing, relances) se configurent par <b>annonce</b> (orchestration
                listing v3).
              </>
            )}
          </div>
          {ownerDisplayName && !hideOwnerScope ? (
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
          <span>💬</span> {pmSafeMode ? 'Messages clients' : 'Messages'}{' '}
          <span className="ct">{catalog.length}</span>
        </button>
        {showWhatsAppConfigTab ? (
          <button
            type="button"
            className={`sub-tab${subTab === 'config' ? ' on' : ''}`}
            onClick={() => selectSubTab('config')}
          >
            <span>📲</span> Config <span className="ct">WA</span>
          </button>
        ) : null}
      </div>

      {showWhatsAppConfigTab && subTab === 'config' && <OrchestrationWhatsAppTab />}

      {subTab === 'messages' && (
        <div>
          <div
            className="msg-form"
            style={{
              marginBottom: 16,
              padding: '16px 18px',
              border: '2px solid rgba(6,115,179,0.35)',
              borderRadius: 12,
              background: 'rgba(6,115,179,0.06)',
              position: 'sticky',
              top: 8,
              zIndex: 2,
            }}
          >
            <div
              className="lbl"
              style={{ marginBottom: 8, fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}
            >
              Votre signature client
            </div>
            <p style={{ fontSize: 12, color: 'var(--t3)', margin: '0 0 10px', lineHeight: 1.4 }}>
              Affichée en bas de chaque message OTA / email à l&apos;envoi. Exemple :{' '}
              <em>L&apos;équipe Sojori</em>. Modifiable ici uniquement — pas dans les templates
              WhatsApp Meta.
            </p>
            <input
              className="input"
              value={guestMessageSignature}
              onChange={(e) => onGuestMessageSignatureChange?.(e.target.value)}
              placeholder="ex: L'équipe Sojori"
              style={{ fontSize: 15, padding: '12px 14px', fontWeight: 600 }}
            />
          </div>

          <div className="orch-plan-toolbar">
            <p className="orch-plan-hint">
              {pmSafeMode
                ? `${catalog.length} message(s) · cliquez pour modifier le texte · Enregistrer pour publier`
                : `${catalog.length} message(s) · textes OTA / email (onglet Config = templates WhatsApp Meta)`}
            </p>
            {!pmSafeMode ? (
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
            ) : null}
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

          {pmSafeMode
            ? journeyGroups.map((g) => (
                <Box key={g.title} sx={{ mb: 2.5 }}>
                  <TypographySection title={g.title} count={g.items.length} />
                  {renderMessageCards(g.items, false)}
                </Box>
              ))
            : renderMessageCards(catalog, true)}
        </div>
      )}

      {subTab !== 'config' ? (
        <div className="orch-foot">
          <p className="orch-foot-hint">
            {pmSafeMode
              ? 'Enregistre vos textes OTA / email + signature (templates WhatsApp inchangés).'
              : 'Enregistre le catalogue messages (OTA / email / IDs WhatsApp).'}
          </p>
          <button type="button" className="btn-prim" disabled={saving} onClick={onSave}>
            {saving ? 'Enregistrement…' : pmSafeMode ? 'Enregistrer mes messages ⚡' : 'Enregistrer tout ⚡'}
          </button>
        </div>
      ) : null}

      {previewCatalog && (
        <MessageBodyModal
          open={Boolean(previewCatalogId)}
          title={`${previewCatalog.label} · ${previewField === 'ota' ? 'OTA' : 'Email'}`}
          messageFr={previewWithSignature(
            previewField === 'ota' ? previewCatalog.messageFrOta : previewCatalog.messageFrEmail,
          )}
          channelLabel={previewField === 'ota' ? 'OTA' : 'Email'}
          onClose={() => setPreviewCatalogId(null)}
          onChange={
            pmSafeMode
              ? undefined
              : (text) =>
                  onUpdateCatalogEntry(previewCatalog.id, {
                    ...(previewField === 'ota'
                      ? { messageFrOta: text }
                      : { messageFrEmail: text }),
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

function TypographySection({ title, count }: { title: string; count: number }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: 'var(--t3)',
        margin: '0 0 8px',
      }}
    >
      {title} <span style={{ fontWeight: 500 }}>({count})</span>
    </div>
  );
}

/** Variables les plus utilisées en édition PM (premier). */
const PM_PRIMARY_VARS = [
  '{firstName}',
  '{lastName}',
  '{guestName}',
  '{reservationNumber}',
  '{listingName}',
  '{arrivalDate}',
  '{departureDate}',
  '{numberOfGuests}',
  '{doorCode}',
] as const;

function insertVarAtCursor(
  el: HTMLTextAreaElement | null,
  current: string,
  token: string,
  apply: (next: string) => void,
) {
  const value = String(current || '');
  if (!el) {
    apply(`${value}${token}`);
    return;
  }
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const next = value.slice(0, start) + token + value.slice(end);
  apply(next);
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + token.length;
    el.setSelectionRange(pos, pos);
  });
}

function PmVariablePicker({
  onPick,
  targetLabel,
}: {
  onPick: (token: string) => void;
  targetLabel: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const primary = MESSAGE_MERGE_VARIABLES.filter((v) =>
    (PM_PRIMARY_VARS as readonly string[]).includes(v.key),
  );
  const grouped = useMemo(() => {
    const map = new Map<string, typeof MESSAGE_MERGE_VARIABLES>();
    for (const v of MESSAGE_MERGE_VARIABLES) {
      const arr = map.get(v.group) || [];
      arr.push(v);
      map.set(v.group, arr);
    }
    return [...map.entries()];
  }, []);

  return (
    <div
      style={{
        marginBottom: 14,
        padding: '12px 14px',
        borderRadius: 10,
        border: '1px solid rgba(6,115,179,0.22)',
        background: 'rgba(6,115,179,0.04)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6, color: 'var(--t1)' }}>
        Variables Sojori
      </div>
      <p style={{ fontSize: 11, color: 'var(--t3)', margin: '0 0 10px', lineHeight: 1.35 }}>
        Insertion dans <b>{targetLabel}</b> (curseur). Ex. <code>{'{firstName}'}</code> → prénom
        client.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {primary.map((v) => (
          <button
            key={v.key}
            type="button"
            className="btn-ghost"
            title={`${v.label} · ${v.key}`}
            onClick={() => onPick(v.key)}
            style={{
              fontSize: 11,
              padding: '5px 10px',
              borderRadius: 999,
              border: '1px solid rgba(6,115,179,0.28)',
              background: '#fff',
              fontWeight: 600,
            }}
          >
            {v.label}
            <code style={{ marginLeft: 6, fontWeight: 500, opacity: 0.75 }}>{v.key}</code>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn-ghost"
        style={{ fontSize: 11, marginTop: 10, padding: '4px 8px' }}
        onClick={() => setShowAll((v) => !v)}
      >
        {showAll ? '▼ Moins de variables' : '▶ Toutes les variables'}
      </button>
      {showAll ? (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {grouped.map(([group, vars]) => (
            <div key={group}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--t3)',
                  marginBottom: 6,
                }}
              >
                {group}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {vars.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    className="btn-ghost"
                    title={v.key}
                    onClick={() => onPick(v.key)}
                    style={{
                      fontSize: 11,
                      padding: '4px 9px',
                      borderRadius: 8,
                      border: '1px solid var(--bd, #e8e4d9)',
                      background: '#fff',
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
