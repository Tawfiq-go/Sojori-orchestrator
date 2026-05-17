import React, { useState, useEffect } from 'react'
import { Dialog } from '@mui/material'
import axios from 'axios'
import { getOrchestratorApiBaseUrl } from 'config/backendServer.config'

const ORCHESTRATOR_BASE = getOrchestratorApiBaseUrl()
const SOJORI = '#FF6B35'
const STALE_MS = 6 * 60 * 60 * 1000

function fmtDate(d) {
  if (!d) return '?'
  const dt = d instanceof Date ? d : new Date(d)
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const day = String(dt.getDate()).padStart(2, '0')
  const month = String(dt.getMonth() + 1).padStart(2, '0')
  const h = String(dt.getHours()).padStart(2, '0')
  const m = String(dt.getMinutes()).padStart(2, '0')
  return `${days[dt.getDay()]} ${day}/${month} à ${h}:${m}`
}

/**
 * Retourne le symbole et la couleur d'une scheduledExecution.
 */
function execSymbol(exec) {
  const scheduledAt = new Date(exec.scheduledAt)
  const now = new Date()

  switch (exec.status) {
    case 'EXECUTED':
      return { sym: '✅', label: 'Exécuté', color: '#10B981' }
    case 'FAILED':
      return { sym: '❌', label: 'Échec', color: '#EF4444' }
    case 'SKIPPED':
      return { sym: '⊘', label: 'Ignoré', color: '#9CA3AF' }
    case 'PENDING':
    default: {
      if (scheduledAt > now) {
        return { sym: '⧗', label: 'Estimé', color: '#6B7280' }
      }
      if (now - scheduledAt > STALE_MS) {
        return { sym: '⏳', label: 'En retard', color: '#F97316' }
      }
      return { sym: '→', label: 'Prochain', color: SOJORI }
    }
  }
}

/**
 * Props:
 * - open / onClose
 * - actionId: string
 * - reservationNumber: string
 * - onConfirmExecute: (forceExecute, executionId?) => Promise<void>
 * - actionLabel: string
 * - scheduledExecutions: array
 * - actionType: string ('assignStaff' | 'send_message' | ...)
 */
export default function ConditionCheckDialog({
  open,
  onClose,
  actionId,
  reservationNumber,
  onConfirmExecute,
  actionLabel = 'Exécuter',
  scheduledExecutions = [],
  actionType = 'send_message',
}) {
  const [checking, setChecking] = useState(false)
  const [conditionsData, setConditionsData] = useState(null)
  const [error, setError] = useState(null)
  const [loadingExecId, setLoadingExecId] = useState(null)
  const [executingGlobal, setExecutingGlobal] = useState(false)

  useEffect(() => {
    if (open && actionId && reservationNumber) {
      checkConditions()
    } else {
      setConditionsData(null)
      setError(null)
    }
  }, [open, actionId, reservationNumber])

  const checkConditions = async () => {
    setChecking(true)
    setError(null)
    try {
      const res = await axios.post(
        `${ORCHESTRATOR_BASE}/actions/${actionId}/check-conditions`,
        { reservationNumber },
        { timeout: 10000 },
      )
      if (res.data?.success && res.data?.data) {
        setConditionsData({
          ...res.data.data,
          canBypass: res.data.data.canBypass !== false,
        })
      } else {
        setError(res.data?.error || 'Erreur de vérification')
      }
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Erreur de connexion')
    } finally {
      setChecking(false)
    }
  }

  const handleExecRow = async (exec) => {
    if (!onConfirmExecute) return
    const id = exec.executionId || exec._id || null
    const key = id || `row-${exec.scheduledAt}`
    setLoadingExecId(key)
    try {
      await onConfirmExecute(true, id)
      await checkConditions()
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Erreur d'exécution")
    } finally {
      setLoadingExecId(null)
    }
  }

  const handleGlobalExecute = async () => {
    if (!onConfirmExecute) return
    setExecutingGlobal(true)
    try {
      await onConfirmExecute(true, null)
      onClose()
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Erreur d'exécution")
    } finally {
      setExecutingGlobal(false)
    }
  }

  const authorized = conditionsData?.authorized
  const canBypass = conditionsData?.canBypass
  const category = conditionsData?.category || ''

  const hasExecs = scheduledExecutions && scheduledExecutions.length > 0

  const btnLabel = actionType === 'assignStaff' ? '👤 Assigner Staff' : '📱 Envoyer WhatsApp'
  const globalBtnLabel = actionType === 'assignStaff' ? '⚡ Assigner hors date' : '⚡ Envoyer hors date'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        style: {
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          maxHeight: '90vh',
        },
      }}
    >
      {/* ── HEADER ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1C1C2E 0%, #2D1B4E 100%)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: SOJORI,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: `0 0 12px ${SOJORI}66`,
          }}>
            {actionType === 'assignStaff' ? '👤' : '📋'}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'white', letterSpacing: '0.02em' }}>
              Exécution manuelle
            </div>
            <div style={{ fontSize: 10, color: '#A78BFA', marginTop: 1 }}>
              {category || actionType} · <span style={{ color: '#FB923C' }}>{reservationNumber}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18, lineHeight: 1, padding: 4, borderRadius: 4 }}
        >✕</button>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 130px)', padding: '12px 16px' }}>

        {/* Erreur */}
        {error && (
          <div style={{
            marginBottom: 10, padding: '8px 12px', borderRadius: 8,
            background: '#FEF2F2', border: '1px solid #FECACA',
            fontSize: 12, color: '#7F1D1D',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <span>⚠ {error}</span>
            <button onClick={checkConditions} style={{ fontSize: 10, color: SOJORI, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>
              Réessayer
            </button>
          </div>
        )}

        {/* Statut global de la carte */}
        <div style={{ marginBottom: 12 }}>
          {checking ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280', fontSize: 11 }}>
              <div style={{ width: 16, height: 16, border: `2px solid ${SOJORI}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .8s linear infinite', flexShrink: 0 }} />
              Vérification…
            </div>
          ) : conditionsData ? (
            authorized ? (
              <span style={{ padding: '4px 12px', borderRadius: 99, background: '#ECFDF5', color: '#065F46', fontSize: 11, fontWeight: 700, border: '1px solid #6EE7B7' }}>
                ✓ Conditions remplies
              </span>
            ) : canBypass ? (
              <span style={{ padding: '4px 12px', borderRadius: 99, background: '#FFF7ED', color: '#92400E', fontSize: 11, fontWeight: 700, border: `1px solid ${SOJORI}66` }}>
                ⚡ Forçage disponible
              </span>
            ) : (
              <span style={{ padding: '4px 12px', borderRadius: 99, background: '#FEF2F2', color: '#7F1D1D', fontSize: 11, fontWeight: 700, border: '1px solid #FECACA' }}>
                ✗ Envoi bloqué
              </span>
            )
          ) : null}
        </div>

        {/* ── TABLE EXECUTIONS ── */}
        {hasExecs && (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
              paddingBottom: 6, borderBottom: '2px solid #F3F4F6',
            }}>
              <span style={{ fontSize: 14 }}>📅</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#1F2937' }}>
                Exécutions programmées
              </span>
              <span style={{ fontSize: 10, color: '#9CA3AF' }}>({scheduledExecutions.length})</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {scheduledExecutions.map((exec, idx) => {
                const { sym, label, color } = execSymbol(exec)
                const execId = exec.executionId || exec._id || null
                const key = execId || `row-${exec.scheduledAt}-${idx}`
                const isLoading = loadingExecId === (execId || `row-${exec.scheduledAt}`)
                const isNext = sym === '→'
                const isExecuted = exec.status === 'EXECUTED'

                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: 8,
                      background: isNext ? '#FFF7F4' : '#FAFAFA',
                      border: `1px solid ${isNext ? SOJORI + '55' : '#EFEFEF'}`,
                      gap: 8,
                    }}
                  >
                    {/* Symbole + date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>{sym}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: 12, fontWeight: 700, color: '#111827',
                          textDecoration: exec.status === 'SKIPPED' ? 'line-through' : 'none',
                        }}>
                          {fmtDate(exec.scheduledAt)}
                        </div>
                        <div style={{ fontSize: 10, color, marginTop: 1 }}>{label}</div>
                        {exec.executedAt && (
                          <div style={{ fontSize: 9, color: '#10B981', marginTop: 1 }}>✓ {fmtDate(exec.executedAt)}</div>
                        )}
                        {exec.skippedReason && (
                          <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 1 }}>↷ {exec.skippedReason}</div>
                        )}
                      </div>
                    </div>

                    {/* Bouton toujours présent */}
                    <button
                      onClick={() => handleExecRow(exec)}
                      disabled={isLoading}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '5px 12px', borderRadius: 6, border: 'none',
                        fontSize: 11, fontWeight: 700, cursor: isLoading ? 'wait' : 'pointer',
                        background: isLoading ? '#D1D5DB' : isExecuted ? SOJORI : '#10B981',
                        color: 'white',
                        boxShadow: isLoading ? 'none' : `0 2px 6px ${isExecuted ? SOJORI + '40' : '#10B98140'}`,
                        whiteSpace: 'nowrap', flexShrink: 0,
                        transition: 'all .15s',
                      }}
                    >
                      {isLoading ? '…' : isExecuted ? `⚡ Renvoyer` : btnLabel}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Pas de scheduledExecutions */}
        {!hasExecs && !checking && (
          <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', padding: '8px 0' }}>
            Aucune exécution programmée disponible
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        padding: '10px 16px',
        borderTop: '1px solid #F3F4F6',
        background: '#FAFAFA',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <button
          onClick={onClose}
          style={{
            padding: '7px 16px', borderRadius: 6, border: '1px solid #D1D5DB',
            background: 'white', color: '#374151', fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Fermer
        </button>

        <button
          onClick={handleGlobalExecute}
          disabled={executingGlobal}
          style={{
            padding: '7px 18px', borderRadius: 6, border: 'none',
            background: executingGlobal ? '#D1D5DB' : SOJORI,
            color: 'white', fontSize: 12, fontWeight: 700,
            cursor: executingGlobal ? 'wait' : 'pointer',
            boxShadow: executingGlobal ? 'none' : `0 2px 8px ${SOJORI}40`,
          }}
        >
          {executingGlobal ? '…' : globalBtnLabel}
        </button>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </Dialog>
  )
}
