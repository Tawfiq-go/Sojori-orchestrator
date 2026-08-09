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
  /** Owner courant — requis pour aperçu sur vraie réservation. */
  previewOwnerId?: string;
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
  previewOwnerId,
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
  const [activeEditField, setActiveEditField] = useState<'body' | 'title' | 'ota' | 'email'>('body');
  const otaTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const emailTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  /** Garde la position du curseur (le clic variable retire le focus → selectionStart=0). */
  const bodyCaretRef = useRef<{ start: number; end: number } | null>(null);
  const titleCaretRef = useRef<{ start: number; end: number } | null>(null);

  const rememberCaret = (
    el: HTMLTextAreaElement | HTMLInputElement | null,
    store: { current: { start: number; end: number } | null },
  ) => {
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    store.current = { start, end };
  };

  const previewCatalog = catalog.find((c) => c.id === previewCatalogId);
  const journeyGroups = useMemo(() => groupCatalog(catalog), [catalog]);

  /** Met à jour le corps unique (OTA = email sans objet). */
  const patchSharedBody = (entry: CatalogMessage, nextBody: string) => {
    const { subject } = parseEmailSubjectAndBody(entry.messageFrEmail);
    const fallbackSubject =
      subject ||
      (entry.id === 'welcome_sojori_v2'
        ? 'Bienvenue — {listingName} · {reservationNumber}'
        : '');
    onUpdateCatalogEntry(entry.id, {
      messageFrOta: nextBody,
      messageFrEmail: withEmailSubject(fallbackSubject, nextBody),
    });
  };

  const patchEmailTitle = (entry: CatalogMessage, nextSubject: string) => {
    const body = String(entry.messageFrOta || '').trimEnd();
    onUpdateCatalogEntry(entry.id, {
      messageFrEmail: withEmailSubject(nextSubject, body),
    });
  };

  const renderCatalogForm = (entry: CatalogMessage) => {
    const { subject: emailTitle } = parseEmailSubjectAndBody(entry.messageFrEmail);
    const sharedBody = String(entry.messageFrOta || '');

    return (
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
          targetLabel={
            activeEditField === 'title' ? 'Titre email' : 'Message (OTA + email)'
          }
          onPick={(token) => {
            if (activeEditField === 'title') {
              insertVarAtCursor(
                titleInputRef.current,
                emailTitle,
                token,
                (next) => patchEmailTitle(entry, next),
                titleCaretRef.current,
              );
            } else {
              insertVarAtCursor(
                bodyTextareaRef.current,
                sharedBody,
                token,
                (next) => patchSharedBody(entry, next),
                bodyCaretRef.current,
              );
            }
          }}
        />
      ) : null}

      {pmSafeMode ? (
        <>
          <div className="row full">
            <div className="lbl">
              Titre email
              <span style={{ fontWeight: 400, color: 'var(--t3)', marginLeft: 6 }}>
                — objet uniquement (OTA n&apos;utilise pas ce champ)
              </span>
            </div>
            <input
              ref={titleInputRef}
              className="input"
              value={emailTitle}
              onFocus={() => setActiveEditField('title')}
              onClick={() => {
                setActiveEditField('title');
                rememberCaret(titleInputRef.current, titleCaretRef);
              }}
              onSelect={() => rememberCaret(titleInputRef.current, titleCaretRef)}
              onKeyUp={() => rememberCaret(titleInputRef.current, titleCaretRef)}
              onBlur={() => rememberCaret(titleInputRef.current, titleCaretRef)}
              onChange={(e) => {
                patchEmailTitle(entry, e.target.value);
                rememberCaret(e.target, titleCaretRef);
              }}
              placeholder="ex: Bienvenue — {listingName} · {reservationNumber}"
              style={{
                fontSize: 14,
                fontWeight: 600,
                outline:
                  activeEditField === 'title' ? '2px solid rgba(6,115,179,0.35)' : undefined,
              }}
            />
          </div>
          <div className="row full" style={{ marginTop: 12 }}>
            <div className="lbl">
              Message (texte FR)
              <span style={{ fontWeight: 400, color: 'var(--t3)', marginLeft: 6 }}>
                — Airbnb / Booking / email · un seul texte
                {activeEditField === 'body' ? ' · actif pour variables' : ''}
              </span>
            </div>
            <textarea
              ref={bodyTextareaRef}
              className="input"
              rows={16}
              value={sharedBody}
              onFocus={() => setActiveEditField('body')}
              onClick={() => {
                setActiveEditField('body');
                rememberCaret(bodyTextareaRef.current, bodyCaretRef);
              }}
              onSelect={() => rememberCaret(bodyTextareaRef.current, bodyCaretRef)}
              onKeyUp={() => rememberCaret(bodyTextareaRef.current, bodyCaretRef)}
              onBlur={() => rememberCaret(bodyTextareaRef.current, bodyCaretRef)}
              onChange={(e) => {
                patchSharedBody(entry, e.target.value);
                rememberCaret(e.target, bodyCaretRef);
              }}
              placeholder="Bonjour {firstName}, …"
              style={{
                minHeight: 280,
                resize: 'vertical',
                fontSize: 14,
                lineHeight: 1.45,
                outline:
                  activeEditField === 'body' ? '2px solid rgba(6,115,179,0.35)' : undefined,
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className="btn-prim"
                style={{ fontSize: 12, padding: '7px 12px' }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  patchSharedBody(entry, insertCatalogWhatsAppLink(sharedBody))
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
                Aperçu OTA + signature
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
                Aperçu email + signature
              </button>
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--t3)', margin: '10px 0 0' }}>
            Ne mettez pas « Équipe Sojori » dans le texte — la signature (bandeau bleu) s&apos;ajoute
            à l&apos;envoi. Le bouton WhatsApp insère : « Appuyer pour ouvrir WhatsApp » + le lien avec
            votre numéro de réservation.
          </p>
        </>
      ) : (
        <>
          <div className="row full">
            <div className="lbl">Message OTA (texte FR)</div>
            <textarea
              ref={otaTextareaRef}
              className="input"
              rows={5}
              value={entry.messageFrOta}
              onFocus={() => setActiveEditField('ota')}
              onClick={() => setActiveEditField('ota')}
              onChange={(e) => onUpdateCatalogEntry(entry.id, { messageFrOta: e.target.value })}
              placeholder="Bonjour {firstName}, …"
            />
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
          </div>
          <div className="row full">
            <div className="lbl">Message Email (texte FR)</div>
            <textarea
              ref={emailTextareaRef}
              className="input"
              rows={5}
              value={entry.messageFrEmail}
              onFocus={() => setActiveEditField('email')}
              onClick={() => setActiveEditField('email')}
              onChange={(e) => onUpdateCatalogEntry(entry.id, { messageFrEmail: e.target.value })}
            />
          </div>
        </>
      )}
    </div>
    );
  };

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
                Un seul texte pour <b>OTA + email</b>, un petit <b>titre</b> pour l&apos;email, et
                votre <b>signature</b> en bandeau. Templates WhatsApp Meta protégés (admin).
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
          messageFr={
            previewField === 'ota' ? previewCatalog.messageFrOta : previewCatalog.messageFrEmail
          }
          channelLabel={previewField === 'ota' ? 'OTA' : 'Email'}
          channel={previewField}
          catalogId={previewCatalog.id}
          ownerId={previewOwnerId}
          signature={guestMessageSignature}
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
  el: HTMLTextAreaElement | HTMLInputElement | null,
  current: string,
  token: string,
  apply: (next: string) => void,
  saved?: { start: number; end: number } | null,
) {
  const value = String(current || '');
  const focused = Boolean(el && document.activeElement === el);
  let start: number;
  let end: number;
  if (focused && el) {
    start = el.selectionStart ?? value.length;
    end = el.selectionEnd ?? start;
  } else if (saved) {
    start = Math.max(0, Math.min(saved.start, value.length));
    end = Math.max(start, Math.min(saved.end ?? saved.start, value.length));
  } else {
    // Pas de curseur connu → fin du texte (jamais forcer le début)
    start = value.length;
    end = value.length;
  }
  const next = value.slice(0, start) + token + value.slice(end);
  apply(next);
  const pos = start + token.length;
  if (saved) {
    saved.start = pos;
    saved.end = pos;
  }
  requestAnimationFrame(() => {
    if (!el) return;
    el.focus();
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      /* ignore */
    }
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
        Insertion dans <b>{targetLabel}</b> à la position du curseur. Ex.{' '}
        <code>{'{firstName}'}</code> → prénom client.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {primary.map((v) => (
          <button
            key={v.key}
            type="button"
            className="btn-ghost"
            title={`${v.label} · ${v.key}`}
            onMouseDown={(e) => e.preventDefault()}
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
        onMouseDown={(e) => e.preventDefault()}
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
                    onMouseDown={(e) => e.preventDefault()}
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
