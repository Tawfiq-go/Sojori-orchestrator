/**
 * WhatsApp Monitoring — layout dense avec tabs enrichis :
 *   Synthèse | Guest (Chatbot) | Staff | Admin | Booking | Erreurs & Alertes | Santé Compte | Notifications
 */

import { useState, useEffect, useCallback, useRef, type ReactElement } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PhoneIcon from '@mui/icons-material/Phone';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import apiClient from '../../services/apiClient';
import { formatCasablancaDate } from '../../utils/dateFormatting.js';
import {
  Badge,
  DataTable,
  MonitorEmpty,
  MonitorError,
  MonitorErrorList,
  MonitorKpiStrip,
  MonitorLoading,
  MonitorPageFrame,
  MonitorSection,
  MonitorSelectFilter,
  MonitorSubTabs,
  MonitorTimeRange,
  MonitorToolbarRow,
  TablePagination,
  btnGhostSx,
  btnPrimarySx,
  monitorTokens as t,
  severityBadgeVariant,
} from '../../features/monitoring/shared/MonitorDesign';
import { MonitorAdminGate } from '../../features/monitoring/shared/MonitorAdminGate';

// ─── Types ────────────────────────────────────────────────────────────────────

type SubTab = 'summary' | 'guest' | 'staff' | 'admin' | 'booking' | 'errors' | 'health' | 'notifications';

interface WaMessage {
  _id?: string;
  timestamp?: string;
  service?: string;
  severity?: string;
  data?: {
    direction?: string;
    template?: string;
    display_name?: string;
    flow_id?: string;
    flow_cta?: string;
    screen?: string;
    error_message?: string;
    error_code?: string;
    raw_error_message?: string;
    whatsapp_status?: string;
    from?: string;
    to?: string;
    message_id?: string;
    message_type?: string;
    phone_number_id?: string;
  };
}

/** Guest/recipient phone: outbound → `to`, inbound → `from`. Never prefer WABA phone_number_id. */
function recipientPhone(msg: WaMessage): string | undefined {
  const d = msg.data;
  if (!d) return undefined;
  if (d.direction === 'inbound') return d.from || d.to;
  return d.to || d.from;
}

/** Show country + last 6 digits so you can recognize your test number. */
function formatGuestPhone(value?: string) {
  if (!value) return '—';
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 6) return digits || value;
  const last6 = digits.slice(-6);
  const cc = digits.length > 9 ? `+${digits.slice(0, digits.length - 9)}` : '+';
  // Prefer readable: +212····8284 style when long enough
  if (digits.length >= 10) {
    return `+${digits.slice(0, digits.length - 6)}····${last6}`;
  }
  return `****${last6}`;
}

function messageDisplayName(msg: WaMessage): string {
  const d = msg.data;
  if (!d) return '—';
  if (d.display_name) return d.display_name;
  if (d.template && d.template !== 'flow') return d.template;
  if (d.flow_id) return `flow:${d.flow_id}`;
  if (d.message_type === 'flow') return 'flow';
  return d.template || d.message_type || '—';
}

function MessageDetailTooltip({ msg, children }: { msg: WaMessage; children: ReactElement }) {
  const d = msg.data || {};
  const { label: codeLabel } = errorCodeInfo(d.error_code);
  const status = d.whatsapp_status || '—';
  const guest = recipientPhone(msg);
  const lines: Array<{ k: string; v: string }> = [
    { k: 'Statut', v: status },
    { k: 'Service', v: serviceLabel(msg.service) },
    { k: 'Type', v: d.message_type || '—' },
    { k: 'Nom', v: messageDisplayName(msg) },
    { k: 'Template', v: d.template || '—' },
    { k: 'Flow ID', v: d.flow_id || '—' },
    { k: 'CTA', v: d.flow_cta || '—' },
    { k: 'Screen', v: d.screen || '—' },
    { k: 'Direction', v: d.direction || '—' },
    { k: 'Invité (récepteur)', v: guest || '—' },
    { k: 'Message ID', v: d.message_id || '—' },
    { k: 'WABA phone_id', v: d.phone_number_id || '—' },
    { k: 'Date', v: msg.timestamp ? formatCasablancaDate(msg.timestamp) : '—' },
  ];
  if (d.error_code) lines.push({ k: 'Code erreur', v: codeLabel });
  if (d.error_message) lines.push({ k: 'Erreur', v: d.error_message });
  if (d.raw_error_message) lines.push({ k: 'Détail brut', v: d.raw_error_message.slice(0, 280) });

  return (
    <Tooltip
      arrow
      enterDelay={200}
      leaveDelay={80}
      placement="left"
      componentsProps={{
        tooltip: {
          sx: {
            bgcolor: '#1c1917',
            color: '#fafaf9',
            maxWidth: 420,
            p: 1.25,
            fontSize: 11,
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          },
        },
      }}
      title={
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.75, color: '#fafaf9' }}>
            Détail du message
          </Typography>
          <Stack spacing={0.35}>
            {lines.map((line) => (
              <Stack key={line.k} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                <Typography sx={{ fontSize: 10, color: '#a8a29e', minWidth: 78, flexShrink: 0 }}>
                  {line.k}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 11,
                    color: line.k.startsWith('Erreur') || line.k === 'Code erreur' ? '#fca5a5' : '#fafaf9',
                    wordBreak: 'break-word',
                    fontFamily: line.k === 'Message ID' || line.k === 'Template' ? 'monospace' : 'inherit',
                  }}
                >
                  {line.v}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      }
    >
      {children}
    </Tooltip>
  );
}

interface SummaryData {
  total?: number;
  accepted?: number;
  sent?: number;
  delivered?: number;
  read?: number;
  failed?: number;
  inbound?: number;
  outbound?: number;
  deliveryRate?: number | null;
  readRate?: number | null;
  failureRate?: number | null;
  isPartial?: boolean;
  coverage?: { coverageStartAt?: string | null; notes?: string[]; isPartial?: boolean };
  byService?: Record<string, number>;
  topTemplates?: Array<{ _id?: string; count?: number }>;
  recentErrors?: WaMessage[];
}

type AlertCategory =
  | 'billing'
  | 'token_expired'
  | 'account_blocked'
  | 'rate_limit'
  | 'quality_drop'
  | 'delivery_failure_spike'
  | 'template_paused'
  | 'critical_error';

interface AlertPhone {
  _id: string;
  phone: string;
  label?: string;
  categories: AlertCategory[];
  active: boolean;
  createdAt: string;
}

const ALL_CATEGORIES: { value: AlertCategory; label: string; description: string }[] = [
  { value: 'billing', label: 'Facturation', description: 'Alerte paiement / crédit Meta' },
  { value: 'token_expired', label: 'Token expiré', description: "Jeton d'accès WhatsApp invalide" },
  { value: 'account_blocked', label: 'Compte bloqué', description: 'Compte WhatsApp Business suspendu' },
  { value: 'rate_limit', label: 'Rate limit', description: 'Taux de requêtes dépassé (130429)' },
  { value: 'quality_drop', label: 'Qualité dégradée', description: 'Note qualité numéro en baisse' },
  { value: 'delivery_failure_spike', label: "Pic d'échecs", description: "Taux d'échec livraison anormal" },
  { value: 'template_paused', label: 'Template suspendu', description: 'Template mis en pause par Meta' },
  { value: 'critical_error', label: 'Erreur critique', description: 'Tout code erreur critique (131xxx)' },
];

// ─── Constants ─────────────────────────────────────────────────────────────────

const TIME_RANGES = [
  { value: '1h', label: '1 h' },
  { value: '6h', label: '6 h' },
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 j' },
  { value: '30d', label: '30 j' },
];

const SUB_TABS: { value: SubTab; label: string }[] = [
  { value: 'summary', label: '📊 Synthèse' },
  { value: 'guest', label: '👤 Guest (Chatbot)' },
  { value: 'staff', label: '👷 Staff' },
  { value: 'admin', label: '🔑 Admin' },
  { value: 'booking', label: '📅 Booking' },
  { value: 'errors', label: '⚠️ Erreurs' },
  { value: 'health', label: '🏥 Santé Compte' },
  { value: 'notifications', label: '🔔 Notifications' },
];

// service → tab
const SERVICE_FOR_TAB: Record<SubTab, string | null> = {
  summary: null,
  guest: 'srv-fullchatbot',
  staff: 'srv-fulltask',
  admin: 'srv-fulltask',
  booking: 'srv-channels',
  errors: null,
  health: null,
  notifications: null,
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

function serviceLabel(s?: string) {
  if (s === 'srv-fullchatbot' || s === 'srv-chatbot') return 'Chatbot (guest)';
  if (s === 'srv-fulltask' || s === 'srv-task') return 'Staff / Admin';
  if (s === 'srv-channels') return 'Booking';
  return s || '—';
}

function serviceBadgeVariant(s?: string): 'info' | 'ai' | 'gold' {
  if (s === 'srv-fullchatbot' || s === 'srv-chatbot') return 'info';
  if (s === 'srv-fulltask' || s === 'srv-task') return 'ai';
  if (s === 'srv-channels') return 'gold';
  return 'info';
}

function messageStatusLabel(msg: WaMessage) {
  const d = msg.data;
  if (d?.error_message) return d.error_message;
  const statusMap: Record<string, string> = {
    accepted: 'Accepté',
    sent: 'Envoyé',
    delivered: 'Délivré',
    read: 'Lu',
    failed: 'Échec',
  };
  if (d?.whatsapp_status && statusMap[d.whatsapp_status]) return statusMap[d.whatsapp_status];
  return 'Sans erreur';
}

function statusBadgeVariant(status?: string, severity?: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  if (status === 'failed') return 'error';
  if (status === 'read' || status === 'delivered') return 'success';
  if (status === 'sent' || status === 'accepted') return 'info';
  return severityBadgeVariant(severity);
}

function formatRate(value?: number | null) {
  if (value == null) return 'n/a';
  return `${Math.round(value * 1000) / 10}%`;
}

function errorCodeInfo(code?: string): { label: string; color: string } {
  if (!code) return { label: '—', color: t.text3 };
  const codeNum = Number(code);
  if (codeNum === 130429) return { label: 'Rate limit (130429)', color: t.warning };
  if (codeNum === 131042) return { label: 'Template invalide (131042)', color: t.error };
  if (codeNum === 131031) return { label: 'Compte bloqué (131031)', color: t.error };
  if (codeNum === 190) return { label: 'Token invalide (190)', color: t.error };
  if (codeNum === 368) return { label: 'Compte suspendu (368)', color: t.error };
  if (codeNum === 131026) return { label: 'Numéro non supporté (131026)', color: t.warning };
  if (codeNum === 131047) return { label: 'Fenêtre fermée (131047)', color: t.warning };
  if (codeNum === 131051) return { label: 'Type message invalide (131051)', color: t.warning };
  if (codeNum === 131000) return { label: 'Erreur interne Meta (131000)', color: t.error };
  return { label: `Code ${code}`, color: t.text2 };
}

// ─── Messages table shared between tabs ─────────────────────────────────────────

function MessagesTable({
  messages,
  loading,
  total,
  page,
  totalPages,
  onPageChange,
  direction,
  setDirection,
  source,
  setSource,
  status,
  setStatus,
  showSourceFilter = true,
  emptyHint,
}: {
  messages: WaMessage[];
  loading: boolean;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  direction: string;
  setDirection: (v: string) => void;
  source: string;
  setSource: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  showSourceFilter?: boolean;
  emptyHint?: string;
}) {
  const rows = messages.map((msg, idx) => ({ id: msg._id || `msg-${idx}`, ...msg }));

  return (
    <>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
        <MonitorSelectFilter
          label="Direction"
          value={direction}
          onChange={setDirection}
          options={[
            { value: 'all', label: 'Toutes' },
            { value: 'inbound', label: 'Entrant' },
            { value: 'outbound', label: 'Sortant' },
          ]}
        />
        {showSourceFilter && (
          <MonitorSelectFilter
            label="Source"
            value={source}
            onChange={setSource}
            options={[
              { value: 'all', label: 'Tous services' },
              { value: 'srv-fullchatbot', label: 'Chatbot (guest)' },
              { value: 'srv-fulltask', label: 'Staff / Admin' },
              { value: 'srv-channels', label: 'Booking' },
            ]}
          />
        )}
        <MonitorSelectFilter
          label="Statut"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'Tous' },
            { value: 'accepted', label: 'Accepté' },
            { value: 'sent', label: 'Envoyé' },
            { value: 'delivered', label: 'Délivré' },
            { value: 'read', label: 'Lu' },
            { value: 'failed', label: 'Échec' },
          ]}
        />
        <Typography sx={{ fontSize: 11, color: t.text3, ml: 0.5 }}>
          Survolez une ligne pour le détail (template, erreur, message id…)
        </Typography>
      </Stack>

      {loading && rows.length === 0 ? (
        <MonitorLoading label="Chargement des messages…" />
      ) : rows.length === 0 ? (
        <MonitorEmpty message={emptyHint || 'Aucun message sur ces filtres.'} />
      ) : (
        <DataTable
          hideRowActions
          columns={[
            {
              key: 'timestamp',
              label: 'Date',
              width: '140px',
              render: (row: WaMessage & { id: string }) => (
                <MessageDetailTooltip msg={row}>
                  <Typography sx={{ fontSize: 12, color: t.text2, cursor: 'help' }}>
                    {formatCasablancaDate(row.timestamp)}
                  </Typography>
                </MessageDetailTooltip>
              ),
            },
            {
              key: 'service',
              label: 'Service',
              render: (row: WaMessage & { id: string }) => (
                <MessageDetailTooltip msg={row}>
                  <span>
                    <Badge variant={serviceBadgeVariant(row.service)}>
                      {serviceLabel(row.service)}
                    </Badge>
                  </span>
                </MessageDetailTooltip>
              ),
            },
            {
              key: 'direction',
              label: 'Dir.',
              render: (row: WaMessage & { id: string }) => (
                <Badge variant={row.data?.direction === 'inbound' ? 'success' : 'gold'}>
                  {row.data?.direction === 'inbound' ? '↓ Entrant' : '↑ Sortant'}
                </Badge>
              ),
            },
            {
              key: 'type',
              label: 'Type',
              render: (row: WaMessage & { id: string }) => (
                <Typography sx={{ fontSize: 11, color: t.text3, fontFamily: 'monospace' }}>
                  {row.data?.message_type || '—'}
                </Typography>
              ),
            },
            {
              key: 'template',
              label: 'Template / Flow',
              render: (row: WaMessage & { id: string }) => (
                <MessageDetailTooltip msg={row}>
                  <Box sx={{ cursor: 'help', maxWidth: 260 }}>
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        color: messageDisplayName(row) !== '—' ? t.text : t.text3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {messageDisplayName(row)}
                    </Typography>
                    {row.data?.flow_id ? (
                      <Typography sx={{ fontSize: 10, color: t.text3, fontFamily: 'monospace' }}>
                        id:{row.data.flow_id}
                        {row.data.flow_cta ? ` · CTA:${row.data.flow_cta}` : ''}
                      </Typography>
                    ) : null}
                  </Box>
                </MessageDetailTooltip>
              ),
            },
            {
              key: 'phone',
              label: 'Invité (récepteur)',
              render: (row: WaMessage & { id: string }) => (
                <MessageDetailTooltip msg={row}>
                  <Typography sx={{ fontSize: 12, color: t.text2, fontFamily: 'monospace', cursor: 'help' }}>
                    {formatGuestPhone(recipientPhone(row))}
                  </Typography>
                </MessageDetailTooltip>
              ),
            },
            {
              key: 'status',
              label: 'Statut',
              render: (row: WaMessage & { id: string }) => {
                const { label: codeLabel, color: codeColor } = errorCodeInfo(row.data?.error_code);
                const isFail = row.data?.whatsapp_status === 'failed' || Boolean(row.data?.error_code);
                return (
                  <MessageDetailTooltip msg={row}>
                    <Stack spacing={0.5} sx={{ cursor: 'help' }}>
                      <Badge variant={statusBadgeVariant(row.data?.whatsapp_status, row.severity)} dot>
                        {messageStatusLabel(row)}
                      </Badge>
                      {row.data?.error_code ? (
                        <Typography sx={{ fontSize: 10, color: codeColor, fontWeight: isFail ? 700 : 500 }}>
                          {codeLabel}
                        </Typography>
                      ) : null}
                      {row.data?.error_message && row.data.error_message !== messageStatusLabel(row) ? (
                        <Typography
                          sx={{
                            fontSize: 10,
                            color: t.error,
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {row.data.error_message}
                        </Typography>
                      ) : null}
                    </Stack>
                  </MessageDetailTooltip>
                );
              },
            },
          ]}
          rows={rows}
          footer={
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Typography sx={{ fontSize: 12, color: t.text3 }}>
                {total} message(s) · page {page}/{Math.max(1, totalPages)} · survolez pour le détail
              </Typography>
              <TablePagination page={page} totalPages={Math.max(1, totalPages)} onChange={onPageChange} />
            </Stack>
          }
        />
      )}
    </>
  );
}

// ─── Health tab ────────────────────────────────────────────────────────────────

function AccountHealthTab() {
  return (
    <Stack spacing={1.5}>
      <MonitorSection dense title="État du compte WhatsApp Business" desc="Vérifications critiques">
        <Stack spacing={1}>
          {[
            {
              label: "Jeton d'accès (Access Token)",
              description: "Vérifie que le token WhatsApp n'est pas expiré via l'onglet Erreurs (code 190).",
              where: 'srv-fullchatbot · srv-fulltask · src/services/whatsappClient.ts',
              risk: 'error' as const,
            },
            {
              label: 'Note de qualité du numéro',
              description: 'Meta dégrade la qualité si trop de messages sont ignorés/bloqués par les destinataires. En-dessous de "Medium" → risque de suspension.',
              where: 'Meta Business Manager → WhatsApp Manager → Phone Numbers',
              risk: 'warning' as const,
            },
            {
              label: 'Statut des templates',
              description: 'Un template "PAUSED" ou "REJECTED" bloque tous les messages hors fenêtre 24h.',
              where: 'srv-fulltask · src/services/whatsappMetaClient.ts (listMessageTemplates)',
              risk: 'warning' as const,
            },
            {
              label: 'Limite de taux (Rate limit)',
              description: 'Tier 1 = 1 000 conv. uniques/24h · Tier 2 = 10 000 · Tier 4 = illimité. Erreur 130429 = rate limit atteint.',
              where: 'Onglet Erreurs → filtrer code 130429',
              risk: 'info' as const,
            },
            {
              label: 'Facturation / Crédit Meta',
              description: "Meta peut bloquer l'envoi si le portefeuille est à zéro (erreur 368 ou 131031). Vérifier dans Business Manager → Billing.",
              where: 'Meta Business Manager → Billing & Payments',
              risk: 'error' as const,
            },
            {
              label: 'Webhook de statut de messages',
              description: "Si aucun statut \"delivered\"/\"read\" n'arrive pendant 30+ min sur des messages envoyés, le webhook est probablement cassé.",
              where: 'srv-fullchatbot · src/routes/webhook.ts · srv-fulltask · src/staffWa/routes/staffWaWebhook.ts',
              risk: 'warning' as const,
            },
            {
              label: 'Comptes WhatsApp Business (WABA)',
              description: 'Chaque WABA a son propre token, phone_number_id et waba_id. Une mauvaise config dans whatsapp-config bloque un owner entier.',
              where: 'srv-admin · /whatsapp-config · MongoDB collection whatsapp_configs',
              risk: 'info' as const,
            },
          ].map((item) => (
            <Box
              key={item.label}
              sx={{
                p: 1.25,
                borderRadius: '8px',
                border: `1px solid ${t.border}`,
                bgcolor: t.bg1,
              }}
            >
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
                <Box sx={{ pt: 0.25, flexShrink: 0 }}>
                  <Badge variant={item.risk} dot>{item.risk === 'error' ? 'Critique' : item.risk === 'warning' ? 'Attention' : 'Info'}</Badge>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text, mb: 0.25 }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: t.text2, mb: 0.5 }}>
                    {item.description}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: t.text3, fontFamily: 'monospace' }}>
                    📍 {item.where}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          ))}
        </Stack>
      </MonitorSection>

      <MonitorSection dense title="Codes d'erreur Meta WhatsApp Cloud API" desc="Référence rapide">
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 0.75 }}>
          {[
            { code: '190', label: 'Token invalide / expiré', severity: 'error' as const },
            { code: '368', label: 'Compte temporairement bloqué', severity: 'error' as const },
            { code: '131031', label: 'Compte suspendu (paiement)', severity: 'error' as const },
            { code: '130429', label: 'Rate limit atteint', severity: 'warning' as const },
            { code: '131042', label: 'Template invalide ou rejeté', severity: 'warning' as const },
            { code: '131026', label: 'Numéro destinataire non supporté', severity: 'warning' as const },
            { code: '131047', label: 'Fenêtre 24h fermée', severity: 'info' as const },
            { code: '131051', label: 'Type de message non supporté', severity: 'info' as const },
            { code: '131000', label: 'Erreur interne Meta', severity: 'error' as const },
            { code: '131008', label: 'Paramètre requis manquant', severity: 'warning' as const },
            { code: '100', label: 'Paramètre invalide (générique)', severity: 'warning' as const },
            { code: '2', label: 'Erreur service Meta (générique)', severity: 'error' as const },
          ].map((e) => (
            <Stack
              key={e.code}
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', p: 0.75, borderRadius: '6px', border: `1px solid ${t.border}`, bgcolor: t.bg1 }}
            >
              <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: t.text, minWidth: 60 }}>
                {e.code}
              </Typography>
              <Badge variant={e.severity}>{e.label}</Badge>
            </Stack>
          ))}
        </Box>
      </MonitorSection>

      <MonitorSection dense title="Où WhatsApp est utilisé dans le code" desc="Cartographie complète">
        <Stack spacing={0.75}>
          {[
            {
              service: 'srv-fullchatbot',
              label: 'Chatbot Guest',
              usages: [
                'src/services/whatsappClient.ts — envoi text/template/interactive/image/flow (retry x2)',
                'src/routes/webhook.ts — réception inbound + mise à jour statuts (sent/delivered/read/failed)',
                'src/utils/whatsappMonitoring.ts — logs MongoDB unified_monitoring',
              ],
              badge: 'info' as const,
            },
            {
              service: 'srv-fulltask',
              label: 'Staff & Admin',
              usages: [
                'src/staffWa/services/staffWhatsAppSend.ts — envoi payload brut (pas de retry)',
                'src/staffWa/routes/staffWaWebhook.ts — réception inbound staff + statuts + menus A/V/L/R/D',
                'src/services/whatsappMetaClient.ts — gestion templates (list/create)',
                'src/utils/whatsappMonitoring.ts — logs MongoDB unified_monitoring',
              ],
              badge: 'ai' as const,
            },
            {
              service: 'srv-channels',
              label: 'Booking',
              usages: [
                'src/services/bookingWhatsAppSend.ts — envoi text/template booking (axios, timeout 15s, pas de retry)',
              ],
              badge: 'gold' as const,
            },
          ].map((item) => (
            <Box key={item.service} sx={{ p: 1.25, borderRadius: '8px', border: `1px solid ${t.border}`, bgcolor: t.bg1 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
                <Badge variant={item.badge}>{item.label}</Badge>
                <Typography sx={{ fontSize: 11, color: t.text3, fontFamily: 'monospace' }}>{item.service}</Typography>
              </Stack>
              <Stack spacing={0.25}>
                {item.usages.map((u) => (
                  <Typography key={u} sx={{ fontSize: 11, color: t.text2, pl: 1, borderLeft: `2px solid ${t.border}` }}>
                    {u}
                  </Typography>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      </MonitorSection>
    </Stack>
  );
}

// ─── Notifications tab ─────────────────────────────────────────────────────────

function NotificationsTab() {
  const [phones, setPhones] = useState<AlertPhone[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AlertPhone | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AlertPhone | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [formPhone, setFormPhone] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formCategories, setFormCategories] = useState<Set<AlertCategory>>(new Set(ALL_CATEGORIES.map((c) => c.value)));
  const [formActive, setFormActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchPhones = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await apiClient.get('/api/monitoring/whatsapp/alert-phones');
      setPhones(res.data.data || []);
    } catch (err: any) {
      setApiError(err?.response?.data?.error || err?.message || 'Impossible de charger les numéros.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchPhones(); }, [fetchPhones]);

  function openAdd() {
    setEditTarget(null);
    setFormPhone('');
    setFormLabel('');
    setFormCategories(new Set(ALL_CATEGORIES.map((c) => c.value)));
    setFormActive(true);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(phone: AlertPhone) {
    setEditTarget(phone);
    setFormPhone(phone.phone);
    setFormLabel(phone.label || '');
    setFormCategories(new Set(phone.categories));
    setFormActive(phone.active);
    setFormError(null);
    setDialogOpen(true);
  }

  function toggleCategory(cat: AlertCategory) {
    setFormCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  async function handleSave() {
    const cats = Array.from(formCategories);
    if (!formPhone.trim()) { setFormError('Numéro requis.'); return; }
    if (!/^\+[1-9]\d{6,14}$/.test(formPhone.trim())) {
      setFormError('Format E.164 requis: +212600000000');
      return;
    }
    if (cats.length === 0) { setFormError('Sélectionnez au moins une catégorie.'); return; }

    setSaving(true);
    setFormError(null);
    try {
      if (editTarget) {
        await apiClient.patch(`/api/monitoring/whatsapp/alert-phones/${editTarget._id}`, {
          label: formLabel || undefined,
          categories: cats,
          active: formActive,
        });
        setSuccessMsg('Numéro mis à jour.');
      } else {
        await apiClient.post('/api/monitoring/whatsapp/alert-phones', {
          phone: formPhone.trim(),
          label: formLabel || undefined,
          categories: cats,
          active: formActive,
        });
        setSuccessMsg("Numéro ajouté à la liste d'alertes.");
      }
      setDialogOpen(false);
      await fetchPhones();
    } catch (err: any) {
      setFormError(err?.response?.data?.error || err?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/monitoring/whatsapp/alert-phones/${deleteTarget._id}`);
      setSuccessMsg('Numéro supprimé.');
      setDeleteTarget(null);
      await fetchPhones();
    } catch (err: any) {
      setApiError(err?.response?.data?.error || err?.message || 'Erreur suppression.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Stack spacing={1.5}>
      {/* Header callout */}
      <Box
        sx={{
          p: 1.5,
          borderRadius: '10px',
          bgcolor: 'rgba(16,185,129,0.07)',
          border: `1px solid rgba(16,185,129,0.2)`,
        }}
      >
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
          <NotificationsActiveIcon sx={{ color: t.success, mt: 0.25, flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text, mb: 0.25 }}>
              Alertes WhatsApp — Numéros de notification
            </Typography>
            <Typography sx={{ fontSize: 12, color: t.text2 }}>
              Ces numéros recevront un message WhatsApp dès qu'un problème critique est détecté
              (token expiré, compte bloqué, rate limit, pic d'échecs…).
              Seuls les SuperAdmin et Admin peuvent gérer cette liste.
              Les propriétaires / owners ne sont <strong>jamais</strong> inclus automatiquement.
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Success banner */}
      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>
      )}

      {/* Error banner */}
      {apiError && (
        <Alert severity="error" onClose={() => setApiError(null)}>{apiError}</Alert>
      )}

      {/* Add button */}
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openAdd}
          sx={btnPrimarySx}
        >
          Ajouter un numéro
        </Button>
      </Stack>

      {/* Phone list */}
      {loading ? (
        <MonitorLoading label="Chargement des numéros…" />
      ) : phones.length === 0 ? (
        <MonitorEmpty message="Aucun numéro configuré. Ajoutez un numéro pour recevoir des alertes WhatsApp." />
      ) : (
        <Stack spacing={0.75}>
          {phones.map((p) => (
            <Box
              key={p._id}
              sx={{
                p: 1.25,
                borderRadius: '10px',
                border: `1px solid ${t.border}`,
                bgcolor: t.bg1,
                opacity: p.active ? 1 : 0.55,
              }}
            >
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
                  <PhoneIcon sx={{ color: p.active ? t.success : t.text3, flexShrink: 0, fontSize: 20 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.25 }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: t.text, fontFamily: 'monospace' }}>
                        {p.phone}
                      </Typography>
                      {p.label && (
                        <Typography sx={{ fontSize: 12, color: t.text3 }}>({p.label})</Typography>
                      )}
                      <Badge variant={p.active ? 'success' : 'neutral'} dot>
                        {p.active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </Stack>
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {p.categories.map((cat) => {
                        const meta = ALL_CATEGORIES.find((c) => c.value === cat);
                        return (
                          <Chip
                            key={cat}
                            label={meta?.label || cat}
                            size="small"
                            sx={{
                              fontSize: 10,
                              height: 20,
                              bgcolor: t.bg2,
                              color: t.text2,
                              border: `1px solid ${t.border}`,
                            }}
                          />
                        );
                      })}
                    </Stack>
                    <Typography sx={{ fontSize: 10, color: t.text3, mt: 0.5 }}>
                      Ajouté le {formatCasablancaDate(p.createdAt)}
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                  <Tooltip title="Modifier">
                    <IconButton size="small" onClick={() => openEdit(p)}>
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Supprimer">
                    <IconButton size="small" onClick={() => setDeleteTarget(p)} sx={{ color: t.error }}>
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}

      {/* Scenario reference */}
      <MonitorSection dense title="Scénarios d'alertes" desc="Quand un message est envoyé">
        <Stack spacing={0.75}>
          {ALL_CATEGORIES.map((cat) => (
            <Stack
              key={cat.value}
              direction="row"
              spacing={1.25}
              sx={{ alignItems: 'flex-start', p: 0.75, borderRadius: '6px', border: `1px solid ${t.border}`, bgcolor: t.bg1 }}
            >
              <Typography sx={{ minWidth: 130, fontSize: 12, fontWeight: 700, color: t.text }}>{cat.label}</Typography>
              <Typography sx={{ fontSize: 12, color: t.text2 }}>{cat.description}</Typography>
            </Stack>
          ))}
        </Stack>
      </MonitorSection>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          {editTarget ? 'Modifier le numéro' : "Ajouter un numéro d'alerte"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Numéro (format E.164)"
              placeholder="+212600000000"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              disabled={!!editTarget || saving}
              size="small"
              fullWidth
              inputProps={{ inputMode: 'tel' }}
            />
            <TextField
              label="Nom / Label (optionnel)"
              placeholder="Ex: Ops Manager, Amir"
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              disabled={saving}
              size="small"
              fullWidth
            />

            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.75 }}>Catégories d'alertes</Typography>
              <FormGroup>
                {ALL_CATEGORIES.map((cat) => (
                  <FormControlLabel
                    key={cat.value}
                    control={
                      <Checkbox
                        size="small"
                        checked={formCategories.has(cat.value)}
                        onChange={() => toggleCategory(cat.value)}
                        disabled={saving}
                      />
                    }
                    label={
                      <Box>
                        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{cat.label}</Typography>
                        <Typography sx={{ fontSize: 11, color: t.text3 }}>{cat.description}</Typography>
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  disabled={saving}
                />
              }
              label={<Typography sx={{ fontSize: 12 }}>Actif (recevoir les alertes)</Typography>}
            />

            {formError && <Alert severity="error" sx={{ fontSize: 12 }}>{formError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={btnGhostSx}>
            Annuler
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving} variant="contained" sx={btnPrimarySx}>
            {saving ? <CircularProgress size={16} /> : editTarget ? 'Sauvegarder' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Supprimer ce numéro ?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13 }}>
            Le numéro <strong>{deleteTarget?.phone}</strong>
            {deleteTarget?.label ? ` (${deleteTarget.label})` : ''} ne recevra plus aucune alerte WhatsApp.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting} sx={btnGhostSx}>Annuler</Button>
          <Button
            onClick={() => void handleDelete()}
            disabled={deleting}
            variant="contained"
            sx={{ ...btnPrimarySx, bgcolor: t.error, '&:hover': { bgcolor: '#b91c1c' } }}
          >
            {deleting ? <CircularProgress size={16} /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function WhatsAppMonitoringPage() {
  return (
    <MonitorAdminGate>
      <WhatsAppMonitoringPageContent />
    </MonitorAdminGate>
  );
}

function WhatsAppMonitoringPageContent() {
  const [activeTab, setActiveTab] = useState<SubTab>('summary');
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(true);

  // Summary data
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [summarySource, setSummarySource] = useState('all');

  // Messages table (shared between guest/staff/admin/booking tabs)
  const [messagesData, setMessagesData] = useState({ messages: [] as WaMessage[], total: 0, page: 1, totalPages: 1 });
  const [direction, setDirection] = useState('all');
  const [msgSource, setMsgSource] = useState('all');
  const [msgStatus, setMsgStatus] = useState('all');
  const [page, setPage] = useState(1);

  // Errors tab
  const [errorsData, setErrorsData] = useState<WaMessage[]>([]);
  const [errorSource, setErrorSource] = useState('all');

  const [apiError, setApiError] = useState<string | null>(null);
  const limit = 50;

  // When switching to a service-specific tab, auto-set the source filter
  const prevTab = useRef<SubTab>('summary');
  useEffect(() => {
    if (prevTab.current === activeTab) return;
    prevTab.current = activeTab;
    const svc = SERVICE_FOR_TAB[activeTab];
    if (svc) setMsgSource(svc);
    else if (activeTab === 'errors') setErrorSource('all');
    setPage(1);
  }, [activeTab]);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(null);
      const response = await apiClient.get('/api/monitoring/whatsapp/stats', {
        params: { timeRange, source: summarySource },
      });
      setSummaryData(response.data.data);
    } catch (error: any) {
      setApiError(error?.response?.data?.error || error?.message || 'Impossible de charger la synthèse WhatsApp.');
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  }, [timeRange, summarySource]);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(null);
      const response = await apiClient.get('/api/monitoring/whatsapp/messages', {
        params: { page, limit, direction, source: msgSource, status: msgStatus, timeRange },
      });
      setMessagesData(response.data.data);
    } catch (error: any) {
      setApiError(error?.response?.data?.error || error?.message || 'Impossible de charger les messages WhatsApp.');
      setMessagesData({ messages: [], total: 0, page: 1, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page, direction, msgSource, msgStatus, timeRange]);

  const fetchErrors = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(null);
      const response = await apiClient.get('/api/monitoring/whatsapp/errors', {
        params: { limit: 100, source: errorSource, timeRange },
      });
      setErrorsData(response.data.data.errors || []);
    } catch (error: any) {
      setApiError(error?.response?.data?.error || error?.message || 'Impossible de charger les erreurs WhatsApp.');
      setErrorsData([]);
    } finally {
      setLoading(false);
    }
  }, [errorSource, timeRange]);

  const refresh = useCallback(() => {
    if (activeTab === 'summary') void fetchSummary();
    else if (['guest', 'staff', 'admin', 'booking'].includes(activeTab)) void fetchMessages();
    else if (activeTab === 'errors') void fetchErrors();
    // health and notifications have their own fetch
  }, [activeTab, fetchSummary, fetchMessages, fetchErrors]);

  useEffect(() => {
    if (['health', 'notifications'].includes(activeTab)) return;
    refresh();
    if (!live) return;
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh, live, activeTab]);

  useEffect(() => {
    setPage(1);
  }, [direction, msgSource, msgStatus, timeRange]);

  const showTimeRange = !['health', 'notifications'].includes(activeTab);
  const showLive = !['health', 'notifications'].includes(activeTab);

  const totalMessages = summaryData?.total ?? 0;
  const failedCount = summaryData?.failed ?? 0;
  const deliveredCount = summaryData?.delivered ?? 0;
  const readCount = summaryData?.read ?? 0;
  const acceptedCount = summaryData?.accepted ?? 0;

  return (
    <MonitorPageFrame>
      <MonitorToolbarRow
        left={
          <>
            <Box sx={{ overflowX: 'auto', maxWidth: { xs: '100%', lg: '70vw' }, pb: 0.25 }}>
              <MonitorSubTabs dense options={SUB_TABS} value={activeTab} onChange={setActiveTab} />
            </Box>
            {showTimeRange && (
              <MonitorTimeRange dense ranges={TIME_RANGES} value={timeRange} onChange={setTimeRange} />
            )}
          </>
        }
        right={
          showLive ? (
            <>
              <Button sx={btnGhostSx} onClick={() => setLive((v) => !v)}>
                <Badge variant={live ? 'success' : 'neutral'} dot>
                  {live ? 'Live' : 'Pause'}
                </Badge>
              </Button>
              <Button sx={btnGhostSx} onClick={refresh} disabled={loading}>
                {loading ? '…' : 'Actualiser'}
              </Button>
            </>
          ) : null
        }
      />

      {apiError && <MonitorError message={apiError} onRetry={refresh} />}

      {/* ─── Summary ─── */}
      {activeTab === 'summary' && (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center' }}>
            <MonitorSelectFilter
              label="Source"
              value={summarySource}
              onChange={setSummarySource}
              options={[
                { value: 'all', label: 'Tous services' },
                { value: 'srv-fullchatbot', label: 'Chatbot (guest)' },
                { value: 'srv-fulltask', label: 'Staff / Admin' },
              ]}
            />
          </Stack>

          {(summaryData || !loading) && (
            <MonitorKpiStrip
              items={[
                { label: 'Messages', value: totalMessages, tone: 'info' },
                { label: 'Acceptés', value: acceptedCount, tone: 'info' },
                { label: 'Délivrés', value: deliveredCount, tone: 'success' },
                { label: 'Lus', value: readCount, tone: 'success' },
                { label: 'Échecs', value: failedCount, tone: failedCount > 0 ? 'error' : 'neutral' },
                { label: 'Livraison', value: formatRate(summaryData?.deliveryRate), tone: 'success' },
                { label: 'Lecture', value: formatRate(summaryData?.readRate), tone: 'info' },
                {
                  label: 'Taux échec',
                  value: formatRate(summaryData?.failureRate),
                  tone: (summaryData?.failureRate ?? 0) > 0.05 ? 'error' : 'success',
                },
              ]}
            />
          )}

          {summaryData?.isPartial || summaryData?.coverage?.isPartial ? (
            <Box sx={{ mb: 1.25 }}>
              <Badge variant="warning">Couverture historique incomplète</Badge>
              <Typography sx={{ mt: 0.5, fontSize: 12, color: t.text3 }}>
                {(summaryData.coverage?.notes || ['Certaines périodes peuvent ne contenir que les échecs.']).join(' ')}
              </Typography>
            </Box>
          ) : null}

          {loading && !summaryData ? (
            <MonitorLoading />
          ) : summaryData ? (
            <>
              {/* By service */}
              {summaryData.byService && (
                <MonitorSection dense title="Messages par service" desc={`sur ${timeRange}`}>
                  <Stack spacing={0.75}>
                    {Object.entries(summaryData.byService)
                      .filter(([, v]) => v > 0)
                      .sort(([, a], [, b]) => b - a)
                      .map(([svc, count]) => (
                        <Stack
                          key={svc}
                          direction="row"
                          sx={{ justifyContent: 'space-between', alignItems: 'center', py: 0.5, borderBottom: `1px solid ${t.border}` }}
                        >
                          <Badge variant={serviceBadgeVariant(svc)}>{serviceLabel(svc)}</Badge>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text }}>{count}</Typography>
                        </Stack>
                      ))}
                  </Stack>
                </MonitorSection>
              )}

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,1fr) minmax(0,1.4fr)' }, gap: 1.25, mb: 1.25, alignItems: 'start' }}>
                {(summaryData.topTemplates?.length ?? 0) > 0 && (
                  <MonitorSection dense title="Top templates en échec" desc="par volume">
                    <Stack spacing={0.75}>
                      {summaryData.topTemplates!.map((tpl, idx) => (
                        <Stack key={idx} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', py: 0.5, borderBottom: `1px solid ${t.border}` }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 600, color: t.text }}>{tpl._id || 'Inconnu'}</Typography>
                          <Badge variant="error">{tpl.count ?? 0}</Badge>
                        </Stack>
                      ))}
                    </Stack>
                  </MonitorSection>
                )}

                {(summaryData.recentErrors?.length ?? 0) > 0 && (
                  <MonitorSection dense title="Erreurs récentes" desc="dernières 5">
                    <MonitorErrorList
                      dense
                      items={summaryData.recentErrors!.slice(0, 5)}
                      renderTitle={(e) => {
                        const d = (e as WaMessage).data;
                        const { label } = errorCodeInfo(d?.error_code);
                        return `${d?.error_message || 'Erreur inconnue'} — ${label}`;
                      }}
                      renderMeta={(e) => `${serviceLabel((e as WaMessage).service)} · ${formatCasablancaDate((e as WaMessage).timestamp)}`}
                    />
                  </MonitorSection>
                )}
              </Box>

              {totalMessages === 0 && failedCount === 0 && (
                <MonitorEmpty message="Aucune donnée WhatsApp sur cette période." />
              )}
            </>
          ) : (
            <MonitorEmpty message="Aucune donnée WhatsApp sur cette période." />
          )}
        </>
      )}

      {/* ─── Guest / Staff / Admin / Booking tabs ─── */}
      {(['guest', 'staff', 'admin', 'booking'] as SubTab[]).includes(activeTab) && (
        <>
          <Box sx={{ mb: 1, p: 1, borderRadius: '8px', bgcolor: t.bg2, border: `1px solid ${t.border}` }}>
            <Typography sx={{ fontSize: 12, color: t.text2 }}>
              {activeTab === 'guest' && '💬 Messages WhatsApp envoyés/reçus par le chatbot guest (srv-fullchatbot). Inclut: texte, templates, interactifs, flows, images. Survolez une ligne pour voir le template exact, message id et erreurs.'}
              {activeTab === 'staff' && '👷 Messages WhatsApp des équipes staff — notifications de tâches, menus interactifs, flows (srv-fulltask / staff). Survolez pour le détail.'}
              {activeTab === 'admin' && '🔑 Messages WhatsApp des admins — menus A/V/L/R/D, alertes internes, rapports (srv-fulltask / admin channel). Survolez pour le détail.'}
              {activeTab === 'booking' && '📅 Messages WhatsApp liés aux réservations / booking (srv-channels).'}
            </Typography>
          </Box>
          {activeTab === 'booking' && (
            <Alert severity="info" sx={{ mb: 1, fontSize: 12 }}>
              Le monitoring Booking lit les logs <code>srv-channels</code> dans <code>unified_monitoring</code>.
              Aujourd&apos;hui <code>bookingWhatsAppSend.ts</code> n&apos;écrit pas encore dans ce journal — l&apos;onglet
              peut donc être vide même si des messages booking partent. Guest / Staff / Admin sont déjà instrumentés.
            </Alert>
          )}
          <MessagesTable
            messages={messagesData.messages}
            loading={loading}
            total={messagesData.total}
            page={messagesData.page}
            totalPages={messagesData.totalPages}
            onPageChange={setPage}
            direction={direction}
            setDirection={setDirection}
            source={msgSource}
            setSource={setMsgSource}
            status={msgStatus}
            setStatus={setMsgStatus}
            showSourceFilter={activeTab === 'guest' || activeTab === 'staff'}
            emptyHint={
              activeTab === 'booking'
                ? 'Aucun log Booking pour l’instant — le logging WhatsApp n’est pas encore branché dans srv-channels.'
                : undefined
            }
          />
        </>
      )}

      {/* ─── Errors tab ─── */}
      {activeTab === 'errors' && (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <MonitorSelectFilter
              label="Source"
              value={errorSource}
              onChange={setErrorSource}
              options={[
                { value: 'all', label: 'Tous services' },
                { value: 'srv-fullchatbot', label: 'Chatbot (guest)' },
                { value: 'srv-fulltask', label: 'Staff / Admin' },
                { value: 'srv-channels', label: 'Booking' },
              ]}
            />
            <Typography sx={{ fontSize: 11, color: t.text3 }}>
              Survolez une erreur pour template, message id, détail brut Meta…
            </Typography>
          </Stack>

          {errorsData.length > 0 && (
            <MonitorSection dense title="Répartition par code d'erreur" desc={`${errorsData.length} erreurs`}>
              {(() => {
                const byCode = errorsData.reduce<Record<string, number>>((acc, e) => {
                  const code = e.data?.error_code || 'unknown';
                  acc[code] = (acc[code] || 0) + 1;
                  return acc;
                }, {});
                return (
                  <Stack spacing={0.5}>
                    {Object.entries(byCode).sort(([, a], [, b]) => b - a).map(([code, count]) => {
                      const { label, color } = errorCodeInfo(code === 'unknown' ? undefined : code);
                      return (
                        <Stack key={code} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', py: 0.5, borderBottom: `1px solid ${t.border}` }}>
                          <Typography sx={{ fontSize: 12, color, fontWeight: 600 }}>{label}</Typography>
                          <Badge variant="error">{count}</Badge>
                        </Stack>
                      );
                    })}
                  </Stack>
                );
              })()}
            </MonitorSection>
          )}

          {loading && errorsData.length === 0 ? (
            <MonitorLoading />
          ) : errorsData.length === 0 ? (
            <MonitorEmpty message="Aucune erreur sur cette période." />
          ) : (
            <MonitorSection dense title="Journal d'erreurs" desc={`${errorsData.length} · survolez pour le détail`}>
              <DataTable
                hideRowActions
                columns={[
                  {
                    key: 'timestamp',
                    label: 'Date',
                    width: '140px',
                    render: (row: WaMessage & { id: string }) => (
                      <MessageDetailTooltip msg={row}>
                        <Typography sx={{ fontSize: 12, color: t.text2, cursor: 'help' }}>
                          {formatCasablancaDate(row.timestamp)}
                        </Typography>
                      </MessageDetailTooltip>
                    ),
                  },
                  {
                    key: 'service',
                    label: 'Service',
                    render: (row: WaMessage & { id: string }) => (
                      <Badge variant={serviceBadgeVariant(row.service)}>{serviceLabel(row.service)}</Badge>
                    ),
                  },
                  {
                    key: 'template',
                    label: 'Template / Flow',
                    render: (row: WaMessage & { id: string }) => (
                      <MessageDetailTooltip msg={row}>
                        <Box sx={{ cursor: 'help', maxWidth: 240 }}>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
                            {messageDisplayName(row)}
                          </Typography>
                          {row.data?.flow_id ? (
                            <Typography sx={{ fontSize: 10, color: t.text3, fontFamily: 'monospace' }}>
                              id:{row.data.flow_id}
                            </Typography>
                          ) : null}
                        </Box>
                      </MessageDetailTooltip>
                    ),
                  },
                  {
                    key: 'code',
                    label: 'Code',
                    render: (row: WaMessage & { id: string }) => {
                      const { label, color } = errorCodeInfo(row.data?.error_code);
                      return (
                        <MessageDetailTooltip msg={row}>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color, cursor: 'help' }}>{label}</Typography>
                        </MessageDetailTooltip>
                      );
                    },
                  },
                  {
                    key: 'error',
                    label: 'Erreur',
                    render: (row: WaMessage & { id: string }) => (
                      <MessageDetailTooltip msg={row}>
                        <Typography
                          sx={{
                            fontSize: 12,
                            color: t.error,
                            cursor: 'help',
                            maxWidth: 320,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {row.data?.error_message || 'Erreur inconnue'}
                        </Typography>
                      </MessageDetailTooltip>
                    ),
                  },
                  {
                    key: 'phone',
                    label: 'Invité',
                    render: (row: WaMessage & { id: string }) => (
                      <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: t.text3 }}>
                        {formatGuestPhone(recipientPhone(row))}
                      </Typography>
                    ),
                  },
                ]}
                rows={errorsData.map((e, i) => ({ id: e._id || `err-${i}`, ...e }))}
              />
            </MonitorSection>
          )}
        </>
      )}

      {/* ─── Health tab ─── */}
      {activeTab === 'health' && <AccountHealthTab />}

      {/* ─── Notifications tab ─── */}
      {activeTab === 'notifications' && <NotificationsTab />}
    </MonitorPageFrame>
  );
}
