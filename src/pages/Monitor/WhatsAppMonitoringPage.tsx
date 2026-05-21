/**
 * WhatsApp Monitoring — design Sojori V2 (MonitorDesign)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import apiClient from '../../services/apiClient';
import { formatCasablancaDate } from '../../utils/dateFormatting.js';
import {
  Badge,
  DataTable,
  MonitorEmpty,
  MonitorErrorList,
  MonitorLoading,
  MonitorPageFrame,
  MonitorPageHeader,
  MonitorSection,
  MonitorSelectFilter,
  MonitorSubTabs,
  MonitorTimeRange,
  MonitorToolbar,
  StatCard,
  StatsRow,
  TablePagination,
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
  };
}

interface SummaryData {
  total?: number;
  failed?: number;
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
  if (s === 'srv-chatbot') return 'Chatbot';
  if (s === 'srv-task') return 'StaffBot';
  return s || '—';
}

function messageStatusLabel(msg: WaMessage) {
  const d = msg.data;
  if (d?.error_message) return d.error_message;
  if (d?.whatsapp_status === 'sent') return 'Message envoyé';
  if (d?.whatsapp_status === 'delivered') return 'Message délivré';
  if (d?.whatsapp_status === 'read') return 'Message lu';
  return 'Sans erreur';
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
  const [page, setPage] = useState(1);
  const limit = 50;

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/monitoring/whatsapp/stats', {
        params: { timeRange },
      });
      setSummaryData(response.data.data);
    } catch {
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/monitoring/whatsapp/messages', {
        params: { page, limit, direction, source, status: 'all' },
      });
      setMessagesData(response.data.data);
    } catch {
      setMessagesData({ messages: [], total: 0, page: 1, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [page, direction, source]);

  const fetchErrors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/monitoring/whatsapp/errors', {
        params: { limit: 100 },
      });
      setErrorsData(response.data.data.errors || []);
    } catch {
      setErrorsData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = () => {
    if (activeTab === 'summary') void fetchSummary();
    else if (activeTab === 'messages') void fetchMessages();
    else void fetchErrors();
  };

  useEffect(() => {
    if (activeTab === 'summary') {
      void fetchSummary();
      if (!live) return;
      const interval = setInterval(fetchSummary, 30000);
      return () => clearInterval(interval);
    }
    if (activeTab === 'messages') void fetchMessages();
    else void fetchErrors();
  }, [activeTab, fetchSummary, fetchMessages, fetchErrors, live]);

  useEffect(() => {
    setPage(1);
  }, [direction, source]);

  const messageRows = (messagesData.messages || []).map((msg, idx) => ({
    id: msg._id || `msg-${idx}`,
    ...msg,
  }));

  return (
    <MonitorPageFrame>
      <MonitorPageHeader
        accent="whatsapp"
        title="WhatsApp"
        subtitle="Échecs, templates et erreurs WABA — Chatbot & StaffBot"
        count={timeRange}
        live={live}
        onToggleLive={() => setLive((v) => !v)}
        onRefresh={refresh}
        loading={loading}
      />

      <MonitorSubTabs options={SUB_TABS} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'summary' && (
        <>
          <MonitorTimeRange ranges={TIME_RANGES} value={timeRange} onChange={setTimeRange} />
          {loading && !summaryData ? (
            <MonitorLoading />
          ) : summaryData ? (
            <>
              <StatsRow>
                <StatCard
                  icon="⚠️"
                  iconBg={t.errorTint}
                  iconColor={t.error}
                  value={String(summaryData.total ?? 0)}
                  label="Problèmes"
                  trend={timeRange}
                />
                <StatCard
                  icon="❌"
                  iconBg={t.errorTint}
                  iconColor={t.error}
                  value={String(summaryData.failed ?? 0)}
                  label="Messages en échec"
                />
                <StatCard
                  icon="💬"
                  iconBg={t.infoTint}
                  iconColor={t.info}
                  value={String(summaryData.byService?.['srv-chatbot'] ?? 0)}
                  label="Chatbot (client)"
                />
                <StatCard
                  icon="📱"
                  iconBg={t.aiTint}
                  iconColor={t.ai}
                  value={String(summaryData.byService?.['srv-task'] ?? 0)}
                  label="StaffBot"
                />
              </StatsRow>

              {(summaryData.topTemplates?.length ?? 0) > 0 && (
                <MonitorSection title="Templates en échec" desc="Top par volume">
                  <Stack spacing={1}>
                    {summaryData.topTemplates!.map((tpl, idx) => (
                      <Stack
                        key={idx}
                        direction="row"
                        sx={{
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 1.25,
                          borderRadius: '8px',
                          bgcolor: t.bg2,
                          border: `1px solid ${t.border}`,
                        }}
                      >
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                          {tpl._id || 'Inconnu'}
                        </Typography>
                        <Badge variant="error">{tpl.count ?? 0} échecs</Badge>
                      </Stack>
                    ))}
                  </Stack>
                </MonitorSection>
              )}

              {(summaryData.recentErrors?.length ?? 0) > 0 && (
                <MonitorSection title="Erreurs récentes" desc="5 dernières">
                  <MonitorErrorList
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
            </>
          ) : (
            <MonitorEmpty message="Aucune donnée WhatsApp sur cette période." />
          )}
        </>
      )}

      {activeTab === 'messages' && (
        <>
          <MonitorToolbar>
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
                { value: 'srv-chatbot', label: 'Chatbot' },
                { value: 'srv-task', label: 'StaffBot' },
              ]}
            />
          </MonitorToolbar>

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
                    <Badge variant={row.service === 'srv-chatbot' ? 'info' : 'ai'}>
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
                  key: 'status',
                  label: 'Statut',
                  render: (row: WaMessage & { id: string }) => (
                    <Stack spacing={0.5}>
                      <Badge variant={severityBadgeVariant(row.severity)} dot>
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
            <MonitorSection title="Journal d'erreurs" desc={`${errorsData.length} entrée(s)`}>
              <MonitorErrorList
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
