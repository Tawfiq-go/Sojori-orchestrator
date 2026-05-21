import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Trash2,
  RotateCcw,
  Eye,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { getAdminRabbitmqDlqApiBase } from '../../utils/monitoringApi';

// Type definitions
interface DLQItem {
  queueName: string;
  messageCount: number;
  consumerCount: number;
}

interface MessageProperties {
  headers?: Record<string, any>;
  [key: string]: any;
}

interface DLQMessage {
  content: string;
  properties?: MessageProperties;
}

interface DLQManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const dlqApiBase = () => getAdminRabbitmqDlqApiBase();

export default function DLQManagerModal({ isOpen, onClose }: DLQManagerModalProps) {
  const [dlqs, setDlqs] = useState<DLQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDLQ, setSelectedDLQ] = useState<string | null>(null);
  const [messages, setMessages] = useState<DLQMessage[]>([]);
  const [expandedMessage, setExpandedMessage] = useState<number | null>(null);
  const [retrying, setRetrying] = useState(false);

  const fetchDLQs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`${dlqApiBase()}/list`);
      if (response.data.success) {
        setDlqs(response.data.data.dlqs);
      } else {
        setError('Failed to fetch DLQ list');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (queueName: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`${dlqApiBase()}/${encodeURIComponent(queueName)}/messages?limit=50`);
      if (response.data.success) {
        setMessages(response.data.data.messages);
        setSelectedDLQ(queueName);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const retryAll = async (queueName: string) => {
    if (!confirm(`Voulez-vous vraiment retry tous les messages de ${queueName}?`)) {
      return;
    }

    try {
      setRetrying(true);
      const response = await apiClient.post(`${dlqApiBase()}/${encodeURIComponent(queueName)}/retry`, {
        all: true
      });

      if (response.data.success) {
        alert(
          `✅ ${response.data.data.retriedCount} messages ont été renvoyés vers ${response.data.data.originalQueue}`
        );
        fetchDLQs();
        setSelectedDLQ(null);
        setMessages([]);
      }
    } catch (err: any) {
      alert(`❌ Erreur: ${err.response?.data?.message || err.message}`);
    } finally {
      setRetrying(false);
    }
  };

  const purgeQueue = async (queueName: string) => {
    if (
      !confirm(
        `⚠️ ATTENTION: Voulez-vous vraiment SUPPRIMER DÉFINITIVEMENT tous les messages de ${queueName}? Cette action est irréversible!`
      )
    ) {
      return;
    }

    try {
      setRetrying(true);
      const response = await apiClient.delete(`${dlqApiBase()}/${encodeURIComponent(queueName)}/purge`);

      if (response.data.success) {
        alert(`✅ ${response.data.data.purgedCount} messages ont été supprimés`);
        fetchDLQs();
        setSelectedDLQ(null);
        setMessages([]);
      }
    } catch (err: any) {
      alert(`❌ Erreur: ${err.response?.data?.message || err.message}`);
    } finally {
      setRetrying(false);
    }
  };

  const exportMessages = () => {
    const dataStr = JSON.stringify(messages, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedDLQ}-export-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (isOpen) {
      fetchDLQs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Dead Letter Queues (DLQ)</h2>
              <p className="text-xs text-slate-500">Messages ayant échoué après 5 tentatives</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDLQs}
              disabled={loading}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: DLQ List */}
          <div className="w-1/3 border-r border-slate-200 overflow-y-auto">
            <div className="p-4 space-y-2">
              {loading && dlqs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm">Chargement...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
              ) : dlqs.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">Aucun message en DLQ</p>
                  <p className="text-xs text-slate-500 mt-1">Tout fonctionne parfaitement ! 🎉</p>
                </div>
              ) : (
                dlqs.map((dlq) => (
                  <div
                    key={dlq.queueName}
                    className={`w-full p-3 rounded-lg border transition-all ${
                      selectedDLQ === dlq.queueName
                        ? 'bg-red-50 border-red-300 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-red-200 hover:bg-red-50/50'
                    }`}
                  >
                    <button type="button" onClick={() => fetchMessages(dlq.queueName)} className="w-full text-left">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-700 truncate">
                          {dlq.queueName.replace('.dlq', '')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            dlq.messageCount > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {dlq.messageCount}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {dlq.messageCount} message{dlq.messageCount > 1 ? 's' : ''} • {dlq.consumerCount} consumer
                        {dlq.consumerCount > 1 ? 's' : ''}
                      </div>
                    </button>
                    {dlq.messageCount > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          retryAll(dlq.queueName);
                        }}
                        disabled={retrying}
                        className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-green-800 bg-green-100 hover:bg-green-200 rounded-md disabled:opacity-50"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Rejouer tout vers la queue d'origine
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Messages */}
          <div className="flex-1 overflow-y-auto">
            {!selectedDLQ ? (
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Sélectionnez une DLQ pour voir les messages</p>
                </div>
              </div>
            ) : (
              <div className="p-4">
                {/* Actions */}
                <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedDLQ}</h3>
                    <p className="text-xs text-slate-500">
                      {messages.length} message{messages.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {messages.length > 0 && (
                      <button
                        type="button"
                        onClick={exportMessages}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export JSON
                      </button>
                    )}
                    {(() => {
                      const sel = dlqs.find((d) => d.queueName === selectedDLQ);
                      const canRetry = sel && sel.messageCount > 0;
                      if (!canRetry) return null;
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => retryAll(selectedDLQ)}
                            disabled={retrying}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
                            Rejouer tout ({sel.messageCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => purgeQueue(selectedDLQ)}
                            disabled={retrying}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Purge
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Messages List */}
                <div className="space-y-2">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm">Aucun message dans cette DLQ</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const headers = msg.properties?.headers || {};
                      const failedAt = headers['x-failed-at'];
                      const originalQueue = headers['x-original-queue'];
                      const failureReason = headers['x-failure-reason'];
                      const retryCount = headers['x-retry-count'];

                      let content: any = {};
                      try {
                        content = JSON.parse(msg.content);
                      } catch (e) {
                        content = { raw: msg.content };
                      }

                      const isExpanded = expandedMessage === idx;

                      return (
                        <div key={idx} className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                          <button
                            onClick={() => setExpandedMessage(isExpanded ? null : idx)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-slate-700">Message #{idx + 1}</span>
                                {retryCount && (
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">
                                    {retryCount} retries
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 space-y-0.5">
                                {failedAt && <div>❌ Échec: {new Date(failedAt).toLocaleString('fr-FR')}</div>}
                                {originalQueue && <div>📦 Queue: {originalQueue}</div>}
                                {failureReason && <div>⚠️ Raison: {failureReason}</div>}
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                              <div className="mb-2">
                                <span className="text-[10px] font-semibold text-slate-600 uppercase">Payload</span>
                              </div>
                              <pre className="text-[10px] bg-white p-3 rounded border border-slate-200 overflow-x-auto">
                                {JSON.stringify(content, null, 2)}
                              </pre>

                              {Object.keys(headers).length > 0 && (
                                <>
                                  <div className="mt-3 mb-2">
                                    <span className="text-[10px] font-semibold text-slate-600 uppercase">Headers</span>
                                  </div>
                                  <pre className="text-[10px] bg-white p-3 rounded border border-slate-200 overflow-x-auto">
                                    {JSON.stringify(headers, null, 2)}
                                  </pre>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
