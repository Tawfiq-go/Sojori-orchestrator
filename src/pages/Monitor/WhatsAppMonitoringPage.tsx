/**
 * WhatsApp Monitoring — layout dense (même pattern que l’onglet API).
 */

import { useState, useEffect, useCallback } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
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
  monitorTokens as t,
  severityBadgeVariant,
} from '../../features/monitoring/shared/MonitorDesign';

type SubTab = 'summary' | 'messages' | 'errors';

interface WaMessage {
  _id?: string;
  timestamp?: string;
  service?: string;
  severity?: string;
  data?: {
    direction?: string;
    template?: string;
    error_message?: string;
    error_code?: string;
    raw_error_message?: string;
    whatsapp_status?: string;
    from?: string;
    to?: string;
    message_id?: string;
  };
}

interface SummaryData {
  total?: number;
  accepted?: number;
  sent?: number;
  delivered?: number;
  read?: number;
  failed?: number;
  deliveryRate?: number | null;
  readRate?: number | null;
  failureRate?: number | null;
  isPartial?: boolean;
  coverage?: {
    coverageStartAt?: string | null;
    notes?: string[];
    isPartial?: boolean;
  };
  byService?: Record<string, number>;
  topTemplates?: Array<{ _id?: string; count?: number }>;
  recentErrors?: WaMessage[];
}

const TIME_RANGES = [
  { value: '1h', label: '1 h' },
  { value: '6h', label: '6 h' },
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 j' },
];

const SUB_TABS: { value: SubTab; label: string }[] = [
  { value: 'summary', label: 'Synthèse' },
  { value: 'messages', label: 'Messages' },
  { value: 'errors', label: 'Erreurs' },
];

function serviceLabel(s?: string) {
  if (s === 'srv-fullchatbot' || s === 'srv-chatbot') return 'Chatbot (guest)';
  if (s === 'srv-fulltask' || s === 'srv-task') return 'StaffBot';
  return s || '—';
}

function serviceBadgeVariant(s?: string): 'info' | 'ai' {
  if (s === 'srv-fullchatbot' || s === 'srv-chatbot') return 'info';
  if (s === 'srv-fulltask' || s === 'srv-task') return 'ai';
  return 'info';
}

function messageStatusLabel(msg: WaMessage) {
  const d = msg.data;
  if (d?.error_message) return d.error_message;
  if (d?.whatsapp_status === 'accepted') return 'Message accepte';
  if (d?.whatsapp_status === 'sent') return 'Message envoyé';
  if (d?.whatsapp_status === 'delivered') return 'Message délivré';
  if (d?.whatsapp_status === 'read') return 'Message lu';
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

function maskPhone(value?: string) {
  if (!value) return 'masked';
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return `****${digits.slice(-4)}`;
}

export default function WhatsAppMonitoringPage() {
  const [activeTab, setActiveTab] = useState<SubTab>('summary');
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(true);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [messagesData, setMessagesData] = useState({
    messages: [] as WaMessage[],
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [errorsData, setErrorsData] = useState<WaMessage[]>([]);
  const [direction, setDirection] = useState('all');
  const [source, setSource] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [apiError, setApiError] = useState<string | null>(null);
  const limit = 50;

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(null);
      const response = await apiClient.get('/api/monitoring/whatsapp/stats', {
        params: { timeRange, source },
      });
      setSummaryData(response.data.data);
    } catch (error: any) {
      setApiError(error?.response?.data?.error || error?.message || 'Impossible de charger la synthese WhatsApp.');
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  }, [timeRange, source]);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(null);
      const response = await apiClient.get('/api/monitoring/whatsapp/messages', {
        params: { page, limit, direction, source, status, timeRange },
      });
      setMessagesData(response.data.data);
    } catch (error: any) {
      setApiError(error?.response?.data?.error || error?.message || 'Impossible de charger les messages WhatsApp.');
      setMessagesData({ messages: [], total: 0, page: 1, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page, direction, source, status, timeRange]);

  const fetchErrors = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(null);
      const response = await apiClient.get('/api/monitoring/whatsapp/errors', {
        params: { limit: 100, source, timeRange },
      });
      setErrorsData(response.data.data.errors || []);
    } catch (error: any) {
      setApiError(error?.response?.data?.error || error?.message || 'Impossible de charger les erreurs WhatsApp.');
      setErrorsData([]);
    } finally {
      setLoading(false);
    }
  }, [source, timeRange]);

  const refresh = useCallback(() => {
    if (activeTab === 'summary') void fetchSummary();
    else if (activeTab === 'messages') void fetchMessages();
    else void fetchErrors();
  }, [activeTab, fetchSummary, fetchMessages, fetchErrors]);

  useEffect(() => {
    refresh();
    if (!live) return;
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh, live]);

  useEffect(() => {
    setPage(1);
  }, [direction, source, status, timeRange]);

  const messageRows = (messagesData.messages || []).map((msg, idx) => ({
    id: msg._id || `msg-${idx}`,
    ...msg,
  }));

  const totalMessages = summaryData?.total ?? 0;
  const acceptedCount = summaryData?.accepted ?? 0;
  const deliveredCount = summaryData?.delivered ?? 0;
  const readCount = summaryData?.read ?? 0;
  const failedCount = summaryData?.failed ?? 0;
  return (
    <MonitorPageFrame>
      <MonitorToolbarRow
        left={
          <>
            <MonitorSubTabs dense options={SUB_TABS} value={activeTab} onChange={setActiveTab} />
            <MonitorTimeRange dense ranges={TIME_RANGES} value={timeRange} onChange={setTimeRange} />
          </>
        }
        right={
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
        }
      />

      {apiError ? <MonitorError message={apiError} onRetry={refresh} /> : null}

      {summaryData?.isPartial || summaryData?.coverage?.isPartial ? (
        <Box sx={{ mb: 1.25 }}>
          <Badge variant="warning">Couverture historique incomplete</Badge>
          <Typography sx={{ mt: 0.5, fontSize: 12, color: t.text3 }}>
            {(summaryData.coverage?.notes || ['Certaines periodes peuvent ne contenir que les echecs.']).join(' ')}
          </Typography>
        </Box>
      ) : null}

      {(summaryData || !loading) && activeTab === 'summary' ? (
        <MonitorKpiStrip
          items={[
            {
              label: 'Messages',
              value: totalMessages,
              tone: 'info',
            },
            {
              label: 'Acceptes',
              value: acceptedCount,
              tone: 'info',
            },
            {
              label: 'Delivres',
              value: deliveredCount,
              tone: 'success',
            },
            {
              label: 'Lus',
              value: readCount,
              tone: 'success',
            },
            {
              label: 'Échecs',
              value: failedCount,
              tone: 'error',
            },
            {
              label: 'Livraison',
              value: formatRate(summaryData?.deliveryRate),
              tone: 'success',
            },
            {
              label: 'Lecture',
              value: formatRate(summaryData?.readRate),
              tone: 'info',
            },
          ]}
        />
      ) : null}

      {activeTab === 'summary' && (
        <>
          {loading && !summaryData ? (
            <MonitorLoading />
          ) : summaryData ? (
            <>
              {totalMessages === 0 && failedCount === 0 ? (
                <MonitorEmpty message="Aucune donnée WhatsApp sur cette période." />
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1.4fr)' },
                    gap: 1.25,
                    mb: 1.25,
                    alignItems: 'start',
                  }}
                >
                  {(summaryData.topTemplates?.length ?? 0) > 0 && (
                    <MonitorSection dense title="Templates en échec" desc="Top par volume">
                      <Stack spacing={0.75}>
                        {summaryData.topTemplates!.map((tpl, idx) => (
                          <Stack
                            key={idx}
                            direction="row"
                            sx={{
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              py: 0.5,
                              borderBottom: `1px solid ${t.border}`,
                            }}
                          >
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: t.text }}>
                              {tpl._id || 'Inconnu'}
                            </Typography>
                            <Badge variant="error">{tpl.count ?? 0}</Badge>
                          </Stack>
                        ))}
                      </Stack>
                    </MonitorSection>
                  )}

                  {(summaryData.recentErrors?.length ?? 0) > 0 && (
                    <MonitorSection dense title="Erreurs récentes" desc="5">
                      <MonitorErrorList
                        dense
                        items={summaryData.recentErrors!.slice(0, 5)}
                        renderTitle={(e) =>
                          String(e.data?.error_message || 'Erreur inconnue')
                        }
                        renderMeta={(e) =>
                          `${serviceLabel(e.service)} · ${formatCasablancaDate(e.timestamp)}`
                        }
                      />
                    </MonitorSection>
                  )}
                </Box>
              )}
            </>
          ) : (
            <MonitorEmpty message="Aucune donnée WhatsApp sur cette période." />
          )}
        </>
      )}

      {activeTab === 'messages' && (
        <>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mb: 1 }}
          >
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
            <MonitorSelectFilter
              label="Source"
              value={source}
              onChange={setSource}
              options={[
                { value: 'all', label: 'Tous services' },
                { value: 'srv-fullchatbot', label: 'Chatbot (guest)' },
                { value: 'srv-fulltask', label: 'StaffBot' },
                { value: 'srv-chatbot', label: 'Chatbot (legacy)' },
                { value: 'srv-task', label: 'StaffBot (legacy)' },
              ]}
            />
            <MonitorSelectFilter
              label="Statut"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'Tous' },
                { value: 'accepted', label: 'Accepte' },
                { value: 'sent', label: 'Envoye' },
                { value: 'delivered', label: 'Delivre' },
                { value: 'read', label: 'Lu' },
                { value: 'failed', label: 'Echec' },
              ]}
            />
          </Stack>

          {loading && messageRows.length === 0 ? (
            <MonitorLoading label="Chargement des messages…" />
          ) : messageRows.length === 0 ? (
            <MonitorEmpty message="Aucun message sur ces filtres." />
          ) : (
            <DataTable
              hideRowActions
              columns={[
                {
                  key: 'timestamp',
                  label: 'Date',
                  width: '140px',
                  render: (row: WaMessage & { id: string }) => (
                    <Typography sx={{ fontSize: 12, color: t.text2 }}>
                      {formatCasablancaDate(row.timestamp)}
                    </Typography>
                  ),
                },
                {
                  key: 'service',
                  label: 'Service',
                  render: (row: WaMessage & { id: string }) => (
                    <Badge variant={serviceBadgeVariant(row.service)}>
                      {serviceLabel(row.service)}
                    </Badge>
                  ),
                },
                {
                  key: 'direction',
                  label: 'Direction',
                  render: (row: WaMessage & { id: string }) => (
                    <Badge variant={row.data?.direction === 'inbound' ? 'success' : 'gold'}>
                      {row.data?.direction === 'inbound' ? 'Entrant' : 'Sortant'}
                    </Badge>
                  ),
                },
                {
                  key: 'template',
                  label: 'Template',
                  render: (row: WaMessage & { id: string }) => (
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                      {row.data?.template || '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'phone',
                  label: 'Telephone',
                  render: (row: WaMessage & { id: string }) => (
                    <Typography sx={{ fontSize: 12, color: t.text2 }}>
                      {maskPhone(row.data?.from || row.data?.to)}
                    </Typography>
                  ),
                },
                {
                  key: 'status',
                  label: 'Statut',
                  render: (row: WaMessage & { id: string }) => (
                    <Stack spacing={0.5}>
                      <Badge variant={statusBadgeVariant(row.data?.whatsapp_status, row.severity)} dot>
                        {messageStatusLabel(row)}
                      </Badge>
                      {row.data?.error_code ? (
                        <Typography sx={{ fontSize: 10, color: t.text3 }}>
                          Code {row.data.error_code}
                        </Typography>
                      ) : null}
                    </Stack>
                  ),
                },
              ]}
              rows={messageRows}
              footer={
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Typography sx={{ fontSize: 12, color: t.text3 }}>
                    {messagesData.total} message(s) · page {messagesData.page}/{messagesData.totalPages}
                  </Typography>
                  <TablePagination
                    page={messagesData.page}
                    totalPages={Math.max(1, messagesData.totalPages)}
                    onChange={setPage}
                  />
                </Stack>
              }
            />
          )}
        </>
      )}

      {activeTab === 'errors' && (
        <>
          {loading && errorsData.length === 0 ? (
            <MonitorLoading />
          ) : (
            <MonitorSection dense title="Journal d'erreurs" desc={`${errorsData.length}`}>
              <MonitorErrorList
                dense
                items={errorsData}
                renderTitle={(e) => String(e.data?.error_message || 'Erreur inconnue')}
                renderMeta={(e) => (
                  <>
                    {serviceLabel(e.service)}
                    {e.data?.error_code ? ` · code ${e.data.error_code}` : ''}
                    {' · '}
                    {formatCasablancaDate(e.timestamp)}
                  </>
                )}
              />
            </MonitorSection>
          )}
        </>
      )}
    </MonitorPageFrame>
  );
}
